import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { decryptCredentials, isEncrypted } from '../encryption.js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY!
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export interface Step {
  instruction: string;
  tool_id: string;
  context: Record<string, any>;
  step_number?: number;
}

export interface ExecutionResult {
  success: boolean;
  summary: string;
  data?: any;
  error?: string;
}

export class InternalAgent2 {
  private systemPrompt = `You are Agent 2, an execution agent. You receive step-by-step instructions and execute them using provided tools.

IMPORTANT:
- You have access to thread memory—previous step outputs are available
- When instructions reference "step 1" or "previous step", look in thread memory
- Always use exact parameter names from the tool definition
- If you need data from a previous step, extract it from thread memory

Example:
Step 1 output: "Found 2 records: rec123, rec456"
Step 2 instruction: "Delete each record from step 1"
→ You should call delete_airtable_record twice, once for rec123 and once for rec456

Be concise in responses. Focus on what you did and what data you got.`;

  async executeStep(input: {
    executionId: string;
    automationId: string;
    userId: string;
    step: Step;
  }): Promise<ExecutionResult> {
    try {
      const { step, userId, automationId } = input;
      
      console.log('🤖 Agent 2 executing step:', { 
        executionId: input.executionId,
        stepNumber: step.step_number,
        toolId: step.tool_id 
      });
      
      // 1. Fetch tool definition
      const toolDef = await this.fetchToolDefinition(step.tool_id);
      if (!toolDef) {
        throw new Error(`Tool definition not found: ${step.tool_id}`);
      }
      
      // 2. Load thread memory for this automation
      const memory = await this.getThreadMemory(automationId);
      
      // 3. Call LLM with tool definition (NO credentials)
      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: this.systemPrompt },
          ...memory,
          { role: 'user', content: step.instruction }
        ],
        tools: [toolDef.function_definition],
        tool_choice: 'auto'
      });
      
      // 4. Execute with credential injection
      if (response.choices[0].message.tool_calls) {
        const toolCall = response.choices[0].message.tool_calls[0];
        const args = JSON.parse(toolCall.function.arguments);
        
        console.log('🔧 Executing tool call:', toolCall.function.name, args);
        
        const result = await this.executeHttpRequest(
          toolDef,
          args,
          userId
        );
        
        // 5. Store result in thread memory
        await this.storeThreadMemory(automationId, step.step_number || 1, result);
        
        return result;
      } else {
        return {
          success: false,
          summary: 'No tool call generated',
          error: 'LLM did not generate a tool call'
        };
      }
      
    } catch (error) {
      console.error('❌ Agent 2 execution error:', error);
      return {
        success: false,
        summary: 'Execution failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  private async fetchToolDefinition(toolId: string): Promise<any> {
    const { data, error } = await supabase
      .from('tool_definitions')
      .select('*')
      .eq('id', toolId)
      .single();
    
    if (error) {
      console.error('❌ Error fetching tool definition:', error);
      return null;
    }
    
    return data;
  }
  
  private async getThreadMemory(automationId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('thread_memory')
      .select('*')
      .eq('automation_id', automationId)
      .order('step_number', { ascending: true });
    
    if (error) {
      console.error('❌ Error fetching thread memory:', error);
      return [];
    }
    
    // Convert to OpenAI message format
    return (data || []).map(memory => ({
      role: 'assistant',
      content: `Step ${memory.step_number}: ${memory.content.summary}`
    }));
  }
  
  private async executeHttpRequest(
    toolDef: any,
    params: any,
    userId: string
  ): Promise<ExecutionResult> {
    try {
      // CRITICAL: Inject credentials here, NEVER in LLM context
      const credentials = await this.fetchCredentials(userId, toolDef.platform);
      
      // Build HTTP request with credential injection
      const url = this.interpolate(toolDef.http_template.url, params);
      const headers = this.injectCredentials(toolDef.http_template.headers, credentials);
      
      console.log('🌐 Executing HTTP request:', {
        method: toolDef.http_template.method,
        url: url,
        hasCredentials: Object.keys(credentials).length > 0
      });
      
      // Prepare request body
      let body: string | undefined;
      if (toolDef.http_template.body) {
        body = JSON.stringify(this.interpolateObject(toolDef.http_template.body, params));
      }
      
      // Execute request
      const response = await fetch(url, {
        method: toolDef.http_template.method,
        headers: headers,
        body: body
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      
      // Return sanitized result
      return {
        success: true,
        summary: this.summarizeResult(data, toolDef.action),
        data: this.sanitize(data)
      };
      
    } catch (error) {
      console.error('❌ HTTP request error:', error);
      return {
        success: false,
        summary: 'HTTP request failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  private async fetchCredentials(userId: string, platform: string): Promise<Record<string, any>> {
    const { data, error } = await supabase
      .from('user_credentials')
      .select('credentials, encrypted')
      .eq('user_id', userId)
      .eq('platform', platform)
      .single();
    
    if (error || !data) {
      throw new Error(`Missing credentials for ${platform}`);
    }
    
    try {
      // Handle encrypted credentials
      if (data.encrypted && isEncrypted(data.credentials.encrypted)) {
        return decryptCredentials(data.credentials.encrypted);
      } else {
        return data.credentials;
      }
    } catch (error) {
      console.error('❌ Error decrypting credentials:', error);
      throw new Error('Failed to decrypt credentials');
    }
  }
  
  private injectCredentials(headers: any, credentials: Record<string, any>): Record<string, string> {
    const result = { ...headers };
    
    for (const [key, value] of Object.entries(result)) {
      if (typeof value === 'string' && value.includes('__CREDENTIAL:')) {
        const credKey = value.match(/__CREDENTIAL:(\w+)__/)?.[1];
        if (credKey && credentials[credKey]) {
          result[key] = value.replace(
            `__CREDENTIAL:${credKey}__`,
            credentials[credKey]
          );
        }
      }
    }
    
    return result;
  }
  
  private interpolate(template: string, params: any): string {
    return template.replace(/\{(\w+)\}/g, (match, key) => {
      return params[key] || match;
    });
  }
  
  private interpolateObject(obj: any, params: any): any {
    if (typeof obj === 'string') {
      return this.interpolate(obj, params);
    } else if (Array.isArray(obj)) {
      return obj.map(item => this.interpolateObject(item, params));
    } else if (obj && typeof obj === 'object') {
      const result: any = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = this.interpolateObject(value, params);
      }
      return result;
    }
    return obj;
  }
  
  private summarizeResult(data: any, action: string): string {
    try {
      if (action === 'list_records' && data.records) {
        return `Found ${data.records.length} records`;
      } else if (action === 'get_record' && data.id) {
        return `Retrieved record ${data.id}`;
      } else if (action === 'create_record' && data.id) {
        return `Created record ${data.id}`;
      } else if (action === 'update_record' && data.id) {
        return `Updated record ${data.id}`;
      } else if (action === 'delete_record') {
        return `Deleted record successfully`;
      } else if (action === 'create_task' && data.data?.gid) {
        return `Created task ${data.data.gid}`;
      } else if (action === 'update_task' && data.data?.gid) {
        return `Updated task ${data.data.gid}`;
      } else if (action === 'get_task' && data.data?.gid) {
        return `Retrieved task ${data.data.gid}`;
      } else if (action === 'list_tasks' && data.data) {
        return `Found ${data.data.length} tasks`;
      } else {
        return `Operation completed successfully`;
      }
    } catch (error) {
      return `Operation completed`;
    }
  }
  
  private sanitize(data: any): any {
    // Remove sensitive fields from response
    const sanitized = { ...data };
    
    // Remove common sensitive fields
    delete sanitized.password;
    delete sanitized.token;
    delete sanitized.secret;
    delete sanitized.key;
    
    return sanitized;
  }
  
  private async storeThreadMemory(
    automationId: string,
    stepNumber: number,
    result: ExecutionResult
  ): Promise<void> {
    const { error } = await supabase
      .from('thread_memory')
      .insert({
        id: `memory_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        automation_id: automationId,
        user_id: '', // Will be filled by the calling function
        step_number: stepNumber,
        content: {
          summary: result.summary,
          success: result.success,
          data: result.data,
          error: result.error
        }
      });
    
    if (error) {
      console.error('❌ Error storing thread memory:', error);
    }
  }
}

