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

export interface Agent1Response {
  action: 'FLOW_CHANGE' | 'CREDENTIAL_REQUEST' | 'MESSAGE' | 'ERROR';
  message?: string;
  steps?: Array<{
    instruction: string;
    tool_id: string;
    context: Record<string, any>;
  }>;
  projectContext?: string;
  platform?: string;
  fields?: string[];
}

export class InternalAgent1 {
  // Temporary in-memory context storage until database migration is applied
  private static contextStore = new Map<string, any>();
  
  private systemPrompt = `You are Agent 1, an expert automation discovery assistant created to help users build powerful workflow automations. You have deep knowledge of Airtable and Asana APIs, and you excel at understanding user needs and translating them into actionable automation plans.

The year is 2025.

<core_mission>
Your primary goal is to have natural, intelligent conversations with users to:
1. Understand their automation needs through thoughtful dialogue
2. Propose clear, detailed automation plans that excite them
3. Gather necessary credentials and parameters only when needed
4. Create precise execution plans for Agent 2 to execute

You are conversational, insightful, and proactive - NOT robotic or overly formal.
</core_mission>

<conversation_flow>
When a user describes what they want to automate:

STEP 1 - Understand & Propose:
  - Analyze their request deeply to understand the full workflow
  - Think through the complete automation from start to finish
  - Propose a detailed plan that shows you truly understand their needs
  - Explain what each step will do and why it matters
  - Make them excited about what you're going to build
  
  Example response:
  "I'll create an automation that intelligently manages your Airtable records. Here's what I'll build:
  
  1. Connect to your Airtable base and retrieve all records from your specified table
  2. Use intelligent selection to randomly pick one record from your data
  3. Safely delete the selected record and confirm the operation
  
  This gives you a flexible foundation for random record management - perfect for creating variety in your workflows, testing data cleanup processes, or managing sample datasets.
  
  Does this approach work for you, or would you like me to adjust anything?"

STEP 2 - Get Approval:
  - Wait for user to approve or request changes
  - If they want changes, discuss and refine the plan
  - Be flexible and collaborative
  - Only proceed after clear approval

STEP 3 - Check Credentials:
  - After plan approval, check if you have required credentials
  - If missing, politely request them with clear instructions
  - Explain why each credential is needed
  - Never ask for credentials before the plan is approved

STEP 4 - Gather Parameters:
  - Ask for any required IDs, names, or configuration details
  - Be specific about what you need (e.g., "What's your Airtable base ID? It starts with 'app'")
  - Explain where they can find this information
  - Collect everything needed before creating the final execution plan

STEP 5 - Create Execution Plan:
  - Once you have approval, credentials, and parameters
  - Create a precise execution plan for Agent 2
  - Include all necessary context and data
</conversation_flow>

<available_tools>
You have access to these internal functions:

1. search_tools(platform: string, action: string)
   - Searches available API tools in the database
   - Use natural language for action (e.g., "delete", "create", "list")
   - Returns tool definitions with IDs and parameters

2. check_credentials(userId: string, platform: string)
   - Checks if user has stored credentials for a platform
   - Returns which credentials are present/missing
   - Call this AFTER plan approval, BEFORE execution

3. request_credentials(platform: string, fields: string[])
   - Requests missing credentials from user
   - Opens credential form in UI
   - Provide clear instructions about what's needed

4. create_execution_plan(automation_id: string, user_id: string, steps: array)
   - Creates final execution plan for Agent 2
   - Each step needs: instruction, tool_id, context
   - Only call this when you have everything needed
</available_tools>

<platforms>
Available platforms:
- Airtable: list_records, get_record, create_record, update_record, delete_record
- Asana: create_task, list_tasks, update_task, delete_task, get_task

For each platform, you can search for specific actions using search_tools().
</platforms>

<critical_rules>
1. ALWAYS propose a detailed plan FIRST, before checking credentials
2. NEVER be robotic or list-like - speak naturally and conversationally
3. ALWAYS explain WHY you're doing something, not just WHAT
4. NEVER proceed without user approval of the plan
5. ALWAYS check credentials AFTER approval, not before
6. If tools aren't found, suggest alternatives or ask for clarification
7. Be proactive - anticipate what users might need
8. Show enthusiasm and confidence in what you're building
</critical_rules>

<response_format>
Your responses should feel human and intelligent:

❌ BAD: "I will search for tools. I will check credentials. I will create a plan."
✅ GOOD: "I'll create an automation that helps you manage your Airtable data intelligently. Here's what I have in mind..."

❌ BAD: "Tool search returned 0 results."
✅ GOOD: "I don't have a pre-built tool for that specific action yet, but I can help you accomplish this in a different way. Would you like me to..."

❌ BAD: "Please provide credentials."
✅ GOOD: "To connect to your Airtable, I'll need your Personal Access Token. You can create one in your Airtable account settings under 'Developer Hub' → 'Personal Access Tokens'. This lets me securely access your bases on your behalf."
</response_format>

Remember: You're not just processing requests - you're a knowledgeable partner helping users build something powerful. Be conversational, insightful, and make them excited about what you're creating together.`;

  async processMessage(input: {
    threadId: string;
    userId: string;
    message: string;
  }): Promise<Agent1Response> {
    try {
      const { threadId, userId, message } = input;
      
      const evt = this.parseAction(message);
      const traceId = evt.traceId || `no-trace-${Date.now()}`;
      
      console.log(`[Agent1][${traceId}] Processing message:`, { threadId, userId, message: message.substring(0, 100) });
      
      // Handle structured events first
      if (evt.action === 'CREDENTIALS_SAVED') {
        const platform = (evt.platform || '').toLowerCase();
        console.log(`[Agent1][${traceId}] CREDENTIALS_SAVED received for platform=${platform}`);

        const creds = await this.fetchWithRetry(async () => this.fetchCredentials(userId, platform), 3, 150);
        console.log(`[Agent1][${traceId}] creds fetched`);

        const valid = await this.validateCredentials(userId, platform, creds.credentials);
        console.log(`[Agent1][${traceId}] validate result:`, valid);

        if (!valid.valid) {
          return { action: 'MESSAGE', message: this.renderInvalidCredentialMsg(platform, valid.error || 'Unknown error') };
        }

        // Continue: use stored analysis context + tools to produce execution plan and proceed
        return await this.createExecutionPlanAndRespond(threadId, userId, platform, traceId);
      }
      
      // Check if this is an approval response (user saying yes/approve/continue)
      const isApproval = this.isApprovalMessage(message);
      const isCredentialSubmission = this.isCredentialSubmissionMessage(message);
      console.log(`[Agent1][${traceId}] Is approval message:`, isApproval);
      console.log(`[Agent1][${traceId}] Is credential submission message:`, isCredentialSubmission);
      
      if (isApproval || isCredentialSubmission) {
        // User approved the plan or submitted credentials, now check credentials and proceed
        return await this.handleApproval(threadId, userId, message);
      }
      
      // Analyze user request to determine platform and action
      console.log('🔧 TOOL CALL LOG: Calling analyzeRequest tool');
      const analysis = await this.analyzeRequest(message);
      console.log('🔍 Analysis result:', analysis);
      console.log('🔧 TOOL CALL LOG: analyzeRequest completed - platform:', analysis.platform, 'action:', analysis.action);
      console.log('🔍 Analysis details:', {
        platform: analysis.platform,
        action: analysis.action,
        context: analysis.context,
        hasPlatform: !!analysis.platform,
        platformType: typeof analysis.platform
      });
      
      if (!analysis.platform) {
        return {
          action: 'MESSAGE',
          message: 'I can help you automate tasks with Airtable or Asana. What would you like to do? For example: "Create a task in Asana" or "List records from Airtable".'
        };
      }
      
      // Search for relevant tools
      console.log('🔧 TOOL CALL LOG: Calling searchTools tool');
      console.log('🔧 TOOL CALL LOG: Search parameters:', { platform: analysis.platform, action: analysis.action });
      const tools = await this.searchTools(analysis.platform, analysis.action);
      console.log('🔧 Found tools:', tools.length);
      console.log('🔧 TOOL CALL LOG: searchTools completed - found', tools.length, 'tools');
      console.log('🔧 TOOL CALL LOG: Tools details:', tools.map(t => ({ id: t.id, platform: t.platform, action: t.action })));
      
      if (tools.length === 0) {
        return {
          action: 'MESSAGE',
          message: `I don't have a pre-built tool for that specific action yet, but I can help you accomplish this in a different way. Would you like me to suggest an alternative approach for ${analysis.platform} automation?`
        };
      }
      
      // STEP 1: Propose detailed plan FIRST (new conversational flow)
      const planMessage = this.createPlanProposal(analysis, tools);
      
      // Store the analysis context in execution_plans for later retrieval
      await this.storeAnalysisContext(threadId, userId, analysis, tools);
      
      return {
        action: 'MESSAGE',
        message: planMessage
      };
      
      // Create execution plan
      const plan = await this.createExecutionPlan(threadId, userId, tools, analysis);
      console.log('📋 Execution plan created:', plan);
      
      return {
        action: 'FLOW_CHANGE',
        steps: plan.steps,
        projectContext: analysis.context,
        message: `I've created an automation plan with ${plan.steps.length} steps. Review the steps below and click Execute when ready.`
      };
      
    } catch (error) {
      console.error('❌ Agent 1 error:', error);
      return {
        action: 'ERROR',
        message: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
  
  private async analyzeRequest(message: string): Promise<{
    platform: string | null;
    action: string | null;
    context: string;
  }> {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { 
          role: 'system', 
          content: `You are a platform detection assistant. Your ONLY job is to analyze user requests and determine which platform they want to use and what SPECIFIC ACTION they want to perform.

Available platforms: airtable, asana

CRITICAL RULES:
- If the user says "airtable" or "my airtable", the platform is "airtable"
- If the user says "asana" or "my asana", the platform is "asana"
- Extract the SPECIFIC ACTION they want to perform, not the high-level intent
- Focus on the actual API operation they need

Examples:
- "delete a record from my airtable" → platform: "airtable", action: "delete_record"
- "create a task in asana" → platform: "asana", action: "create_task"
- "randomly delete a record from my airtable" → platform: "airtable", action: "delete_record"
- "list records from airtable" → platform: "airtable", action: "list_records"
- "update a task in asana" → platform: "asana", action: "update_task"

IMPORTANT: The action should be the specific API operation, not "create_automation" or "automation". Look for verbs like: delete, create, list, get, update, search.

The user said: "${message}"
What platform and specific action did they mention?`
        },
        { role: 'user', content: `Analyze this user request: "${message}"` }
      ],
      functions: [
        {
          name: 'analyze_request',
          description: 'Analyze user request to determine platform and action',
          parameters: {
            type: 'object',
            properties: {
              platform: {
                type: 'string',
                enum: ['airtable', 'asana'],
                description: 'The platform the user wants to use'
              },
              action: {
                type: 'string',
                description: 'The action the user wants to perform'
              },
              context: {
                type: 'string',
                description: 'Additional context about what the user wants to do'
              }
            },
            required: ['platform', 'action', 'context']
          }
        }
      ],
      function_call: { name: 'analyze_request' }
    });
    
    const functionCall = response.choices[0].message.function_call;
    if (functionCall) {
      const parsedArgs = JSON.parse(functionCall.arguments);
      console.log('🔍 OpenAI Analysis Raw Arguments:', functionCall.arguments);
      console.log('🔍 OpenAI Analysis Parsed Args:', parsedArgs);
      console.log('🔍 OpenAI Analysis Platform:', parsedArgs.platform);
      console.log('🔍 OpenAI Analysis Action:', parsedArgs.action);
      console.log('🔍 OpenAI Analysis Context:', parsedArgs.context);
      console.log('🔍 Original message was:', message);
      console.log('🔍 Platform detection result:', {
        detected: parsedArgs.platform,
        expected: message.toLowerCase().includes('airtable') ? 'airtable' : 'unknown',
        messageContainsAirtable: message.toLowerCase().includes('airtable'),
        messageContainsAsana: message.toLowerCase().includes('asana')
      });
      return parsedArgs;
    }
    
    return { platform: null, action: null, context: message };
  }
  
  private async searchTools(platform: string, action: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('tool_definitions')
      .select('*')
      .eq('platform', platform)
      .ilike('action', `%${action}%`);
    
    if (error) {
      console.error('❌ Error searching tools:', error);
      return [];
    }
    
    return data || [];
  }
  
  private async checkCredentials(userId: string, platform: string): Promise<{
    hasAll: boolean;
    missing: string[];
    credentials?: Record<string, any>;
  }> {
  console.log('🔐 Checking credentials for:', { userId, platform });
  
  // Try platform first, then service_name as fallback
  let { data, error } = await supabase
    .from('user_credentials')
    .select('credentials, encrypted, platform, service_name')
    .eq('user_id', userId)
    .or(`platform.eq.${platform},service_name.ilike.%${platform}%,service_name.eq.${platform}_credentials`)
    .single();
    
  console.log('🔐 Credential lookup result:', { data, error, query: `platform.eq.${platform},service_name.ilike.%${platform}%,service_name.eq.${platform}_credentials` });
    
    // If not found, try legacy format (platform = null, service_name contains platform)
    if (error || !data) {
      console.log('🔐 No exact platform match, trying legacy format...');
      const { data: legacyData, error: legacyError } = await supabase
        .from('user_credentials')
        .select('credentials, encrypted, platform, service_name')
        .eq('user_id', userId)
        .eq('platform', null)
        .ilike('service_name', `%${platform}%`)
        .single();
      
      if (legacyData) {
        data = legacyData;
        error = null;
        console.log('🔐 Found legacy credentials:', legacyData.service_name);
      } else {
        console.log('🔐 No credentials found for user:', { userId, platform });
        const requiredFields = this.getRequiredFields(platform);
        return { hasAll: false, missing: requiredFields };
      }
    }
    
    if (!data) {
      console.log('🔐 No credentials found for user:', { userId, platform });
      const requiredFields = this.getRequiredFields(platform);
      return { hasAll: false, missing: requiredFields };
    }
    
    try {
      // Handle both encrypted and legacy formats
      let credentials: Record<string, any>;
      
      if (data.encrypted && isEncrypted(data.credentials.encrypted)) {
        // New encrypted format
        credentials = decryptCredentials(data.credentials.encrypted);
      } else if (data.credentials.credential_value) {
        // Legacy format - extract credential_value
        credentials = { [this.getRequiredFields(platform)[0]]: data.credentials.credential_value };
      } else {
        // Direct format
        credentials = data.credentials;
      }
      
      // Check if all required fields are present
      const requiredFields = this.getRequiredFields(platform);
      const missing = requiredFields.filter(field => !credentials[field]);
      
      console.log('🔐 Credential check result:', {
        platform,
        hasCredentials: Object.keys(credentials).length > 0,
        missing,
        credentialKeys: Object.keys(credentials)
      });
      
      return {
        hasAll: missing.length === 0,
        missing,
        credentials
      };
    } catch (error) {
      console.error('❌ Error checking credentials:', error);
      const requiredFields = this.getRequiredFields(platform);
      return { hasAll: false, missing: requiredFields };
    }
  }
  
  private async validateCredentials(
    userId: string, 
    platform: string, 
    credentials: Record<string, any>
  ): Promise<{
    valid: boolean;
    error?: string;
    suggestion?: string;
  }> {
    try {
      // Get validation config from tool_definitions
      const { data: toolDef } = await supabase
        .from('tool_definitions')
        .select('validation_config')
        .eq('platform', platform)
        .limit(1)
        .single();
      
      if (!toolDef?.validation_config) {
        console.log('⚠️ No validation config for platform:', platform);
        return { valid: true }; // Skip validation if not configured
      }
      
      const config = toolDef.validation_config;
      
      // Inject credentials into validation request
      const headers = { ...config.headers };
      for (const [key, value] of Object.entries(headers)) {
        if (typeof value === 'string' && value.includes('__CREDENTIAL:')) {
          const credKey = value.match(/__CREDENTIAL:(\w+)__/)?.[1];
          if (credKey && credentials[credKey]) {
            headers[key] = value.replace(`__CREDENTIAL:${credKey}__`, credentials[credKey]);
          }
        }
      }
      
      // Make validation request
      console.log('🔐 Validating credentials for', platform);
      const response = await fetch(config.url, {
        method: config.method,
        headers: headers
      });
      
      if (response.status === config.success_status) {
        console.log('✅ Credentials validated successfully');
        return { valid: true };
      }
      
      // Handle validation failure
      const errorMsg = config.error_messages?.[response.status] || 
                       `Validation failed with status ${response.status}`;
      
      console.log('❌ Credential validation failed:', errorMsg);
      
      return {
        valid: false,
        error: errorMsg,
        suggestion: this.getCredentialFixSuggestion(platform, response.status)
      };
      
    } catch (error) {
      console.error('❌ Credential validation error:', error);
      return {
        valid: false,
        error: 'Failed to validate credentials',
        suggestion: 'Please check your credentials and try again'
      };
    }
  }

  private getCredentialFixSuggestion(platform: string, status: number): string {
    if (status === 401) {
      return `Your ${platform} credentials appear to be invalid or expired. Please provide a fresh token.`;
    }
    if (status === 403) {
      return `Your ${platform} token lacks required permissions. Please ensure it has the necessary scopes.`;
    }
    return `There was an issue with your ${platform} credentials. Please verify and try again.`;
  }
  
  private async storeAnalysisContext(
    threadId: string,
    userId: string,
    analysis: any,
    tools: any[]
  ): Promise<void> {
    try {
      console.log('🔧 TOOL CALL LOG: Storing analysis context in database');
      
      const contextData = {
        analysis: analysis,
        tools: tools,
        stored_at: new Date().toISOString(),
        status: 'plan_proposed'
      };
      
      // Store in execution_plans table
      const { error } = await supabase
        .from('execution_plans')
        .upsert({
          id: `context_${threadId}_${userId}`,
          automation_id: threadId,
          user_id: userId,
          thread_id: threadId,
          steps: [], // Empty for now
          status: 'plan_proposed',
          analysis_context: contextData
        }, { onConflict: 'id' });
      
      if (error) {
        console.error('❌ Error storing analysis context:', error);
        // Fallback to in-memory storage
        const contextKey = `${threadId}_${userId}`;
        InternalAgent1.contextStore.set(contextKey, contextData);
        console.log('✅ Analysis context stored in memory as fallback');
      } else {
        console.log('✅ Analysis context stored successfully in database');
      }
    } catch (error) {
      console.error('❌ Error in storeAnalysisContext:', error);
      // Fallback to in-memory storage
      const contextData = {
        analysis: analysis,
        tools: tools,
        stored_at: new Date().toISOString(),
        status: 'plan_proposed'
      };
      const contextKey = `${threadId}_${userId}`;
      InternalAgent1.contextStore.set(contextKey, contextData);
      console.log('✅ Analysis context stored in memory as fallback');
    }
  }
  
  private async retrieveAnalysisContext(
    threadId: string,
    userId: string
  ): Promise<any> {
    try {
      console.log('🔧 TOOL CALL LOG: Retrieving analysis context from database');
      
      // Try to retrieve from database first
      const { data, error } = await supabase
        .from('execution_plans')
        .select('analysis_context')
        .eq('id', `context_${threadId}_${userId}`)
        .single();
      
      if (data && data.analysis_context) {
        console.log('✅ Analysis context retrieved successfully from database');
        return data.analysis_context;
      }
      
      // Fallback to in-memory storage
      console.log('🔧 TOOL CALL LOG: Falling back to memory retrieval');
      const contextKey = `${threadId}_${userId}`;
      const contextData = InternalAgent1.contextStore.get(contextKey);
      
      if (!contextData) {
        console.log('🔍 No stored analysis context found in database or memory');
        return null;
      }
      
      console.log('✅ Analysis context retrieved successfully from memory fallback');
      return contextData;
    } catch (error) {
      console.error('❌ Error in retrieveAnalysisContext:', error);
      // Final fallback to memory
      const contextKey = `${threadId}_${userId}`;
      const contextData = InternalAgent1.contextStore.get(contextKey);
      return contextData || null;
    }
  }
  
  private createPlanProposal(analysis: any, tools: any[]): string {
    const platform = analysis.platform;
    const action = analysis.action;
    const context = analysis.context;
    
    if (platform === 'airtable' && action.includes('delete')) {
      return `I'll create an automation that intelligently manages your Airtable records. Here's what I'll build:

1. **Connect to your Airtable base** - I'll securely connect to your Airtable account and access your specified base
2. **Retrieve all records** - I'll fetch all records from your chosen table to understand your data structure
3. **Intelligent random selection** - I'll use a smart algorithm to randomly select one record from your dataset
4. **Safe deletion** - I'll permanently remove the selected record and confirm the operation was successful

This gives you a flexible foundation for random record management - perfect for creating variety in your workflows, testing data cleanup processes, or managing sample datasets.

**Does this approach work for you, or would you like me to adjust anything?**`;
    }
    
    if (platform === 'airtable' && action.includes('create')) {
      return `I'll create an automation that helps you add new records to your Airtable base. Here's what I'll build:

1. **Connect to your Airtable base** - I'll securely connect to your Airtable account
2. **Prepare record data** - I'll structure the new record with the fields you specify
3. **Create the record** - I'll add the new record to your chosen table
4. **Confirm success** - I'll verify the record was created and provide you with the new record ID

This automation will streamline your data entry process and ensure consistent record creation.

**Does this approach work for you, or would you like me to adjust anything?**`;
    }
    
    if (platform === 'asana' && action.includes('create')) {
      return `I'll create an automation that helps you manage tasks in Asana. Here's what I'll build:

1. **Connect to your Asana workspace** - I'll securely connect to your Asana account
2. **Create the task** - I'll set up a new task with the details you provide
3. **Configure task properties** - I'll assign due dates, descriptions, and any other specifications
4. **Confirm creation** - I'll verify the task was created and provide you with the task details

This will help you streamline your task management and keep your projects organized.

**Does this approach work for you, or would you like me to adjust anything?**`;
    }
    
    // Generic plan for other actions
    return `I'll create an automation that helps you with ${action} in ${platform}. Here's what I'll build:

1. **Connect to your ${platform} account** - I'll securely establish a connection
2. **Execute the ${action} operation** - I'll perform the specific action you requested
3. **Handle the results** - I'll process and confirm the operation was successful
4. **Provide feedback** - I'll give you a summary of what was accomplished

This automation will help streamline your ${platform} workflow and save you time.

**Does this approach work for you, or would you like me to adjust anything?**`;
  }
  
  private async requestCredentialsViaEndpoint(threadId: string, userId: string, platform: string, fields: string[]): Promise<Agent1Response> {
    try {
      console.log('🔐 Calling credential request endpoint:', { threadId, userId, platform, fields });
      
      const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
      const response = await fetch(`${baseUrl}/api/agent-request-credentials`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          thread_id: threadId,
          user_id: userId,
          platform: platform,
          credential_name: platform,
          requested_credentials: fields,
          message: `I need your ${platform} Personal Access Token to continue with the automation.`
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Credential request endpoint failed:', response.status, errorText);
        throw new Error(`Credential request failed: ${response.status} - ${errorText}`);
      }
      
      const result = await response.json();
      console.log('✅ Credential request endpoint success:', result);
      
      return {
        action: 'MESSAGE',
        message: `I need your ${platform} Personal Access Token to continue with the automation.`
      };
      
    } catch (error) {
      console.error('❌ Error calling credential request endpoint:', error);
      return {
        action: 'ERROR',
        message: `Failed to request credentials: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
  
  private isApprovalMessage(message: string): boolean {
    const approvalKeywords = [
      'yes', 'yep', 'yeah', 'sure', 'ok', 'okay', 'approve', 'approved', 
      'continue', 'proceed', 'go ahead', 'sounds good', 'looks good',
      'that works', 'perfect', 'great', 'let\'s do it', 'let\'s go'
    ];
    
    const lowerMessage = message.toLowerCase().trim();
    return approvalKeywords.some(keyword => lowerMessage.includes(keyword));
  }
  
  private parseAction(message: string): { action?: string; platform?: string; service_name?: string; traceId?: string } {
    try {
      const obj = JSON.parse((message || '').trim());
      if (obj && typeof obj === 'object' && obj.action) return obj;
    } catch {}
    return {};
  }

  private isCredentialSubmissionMessage(message: string): boolean {
    const evt = this.parseAction(message);
    if (evt.action === 'CREDENTIALS_SAVED') return true;

    // fallback (legacy text matching)
    const kws = [
      'credentials have been updated successfully',
      'credentials have been saved',
      'credentials updated successfully',
      'credentials saved successfully',
      'continue creating the automation',
      'continue with the automation'
    ];
    const lower = (message || '').toLowerCase().trim();
    return kws.some(k => lower.includes(k));
  }
  
  private async handleApproval(threadId: string, userId: string, message: string): Promise<Agent1Response> {
    // Retrieve stored analysis context from execution_plans
    console.log('🔧 TOOL CALL LOG: Retrieving stored analysis context');
    const storedContext = await this.retrieveAnalysisContext(threadId, userId);
    
    if (!storedContext) {
      return {
        action: 'MESSAGE',
        message: 'I need to understand what you want to automate first. Could you please describe what you\'d like me to help you with?'
      };
    }
    
    console.log('🔧 TOOL CALL LOG: Retrieved stored context:', storedContext);
    const analysis = storedContext.analysis;
    const tools = storedContext.tools;
    
    // Check credentials after approval
    console.log('🔧 TOOL CALL LOG: Calling checkCredentials tool');
    const credentials = await this.checkCredentials(userId, analysis.platform);
    console.log('🔐 Credentials check after approval:', credentials);
    console.log('🔧 TOOL CALL LOG: checkCredentials completed - hasAll:', credentials.hasAll, 'missing:', credentials.missing);
    
    // Request missing credentials if needed
    if (!credentials.hasAll) {
        // Call the credential request endpoint to trigger the popup
        console.log('🔧 TOOL CALL LOG: Calling requestCredentialsViaEndpoint tool');
        return await this.requestCredentialsViaEndpoint(threadId, userId, analysis.platform, credentials.missing);
      
      return {
        action: 'MESSAGE',
        message: `Perfect! I've opened a credential form for you. Please provide your ${analysis.platform} Personal Access Token to continue.`
      };
    }
    
    // NEW: Validate credentials before proceeding
    console.log('🔐 Validating credentials...');
    const validation = await this.validateCredentials(
      userId, 
      analysis.platform, 
      credentials.credentials!
    );
    
    if (!validation.valid) {
        // Credentials exist but are invalid - request new ones
        console.log('🔧 TOOL CALL LOG: Credentials invalid, requesting new ones');
        return await this.requestCredentialsViaEndpoint(threadId, userId, analysis.platform, credentials.missing);
    }
    
    // Credentials are valid - proceed to create execution plan
    console.log('✅ Credentials validated, creating execution plan');
    const executionPlan = await this.createExecutionPlan(threadId, userId, tools, analysis);
    
    return {
      action: 'FLOW_CHANGE',
      message: 'Excellent! Your credentials are valid. Here\'s your automation plan:',
      steps: executionPlan.steps,
      projectContext: analysis.context
    };
  }
  
  private async createExecutionPlan(
    threadId: string,
    userId: string,
    tools: any[],
    analysis: any
  ): Promise<{
    steps: Array<{
      instruction: string;
      tool_id: string;
      context: Record<string, any>;
    }>;
  }> {
    // For now, create a simple plan with the first matching tool
    const primaryTool = tools[0];
    
    const steps = [
      {
        instruction: `Execute ${analysis.action} using ${analysis.platform}`,
        tool_id: primaryTool.id,
        context: {
          platform: analysis.platform,
          action: analysis.action,
          description: analysis.context
        }
      }
    ];
    
    // Store execution plan in database
    const { error } = await supabase
      .from('execution_plans')
      .insert({
        id: `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        automation_id: threadId,
        user_id: userId,
        thread_id: threadId,
        steps: steps,
        status: 'ready_to_execute'
      });
    
    if (error) {
      console.error('❌ Error storing execution plan:', error);
    }
    
    return { steps };
  }
  
  private getRequiredFields(platform: string): string[] {
    const fieldMap: Record<string, string[]> = {
      'airtable': ['api_key'], // Match what CredentialForm expects
      'asana': ['token'] // Match what CredentialForm expects
    };
    
    return fieldMap[platform] || [];
  }

  private async fetchCredentials(userId: string, platform: string) {
    const serviceName = `${platform.toLowerCase()}_credentials`;
    const { data, error } = await supabase
      .from('user_credentials')
      .select('credentials, encrypted')
      .eq('user_id', userId)
      .eq('service_name', serviceName)
      .single();

    if (error || !data) throw new Error(`No credentials found for ${serviceName}`);
    return { credentials: await this.decryptIfNeeded(data) };
  }

  private async decryptIfNeeded(data: any): Promise<Record<string, any>> {
    if (data.encrypted && isEncrypted(data.credentials.encrypted)) {
      return decryptCredentials(data.credentials.encrypted);
    } else if (data.credentials.credential_value) {
      // Legacy format
      return { [Object.keys(data.credentials)[0]]: data.credentials.credential_value };
    } else {
      return data.credentials;
    }
  }

  private async fetchWithRetry<T>(fn: () => Promise<T>, tries = 3, delayMs = 150): Promise<T> {
    let lastErr: any;
    for (let i = 0; i < tries; i++) {
      try { 
        return await fn(); 
      } catch (e) { 
        lastErr = e; 
        if (i < tries - 1) {
          await new Promise(r => setTimeout(r, delayMs));
        }
      }
    }
    throw lastErr;
  }

  private renderInvalidCredentialMsg(platform: string, errorMsg: string): string {
    return `I found your ${platform} credentials, but they appear to be invalid: ${errorMsg}. Please update your credentials and try again.`;
  }

  private async createExecutionPlanAndRespond(threadId: string, userId: string, platform: string, traceId?: string): Promise<Agent1Response> {
    console.log(`[Agent1][${traceId}] Creating execution plan for platform=${platform}`);
    
    const context = await this.retrieveAnalysisContext(threadId, userId);
    if (!context) {
      return {
        action: 'MESSAGE',
        message: 'I need to understand what you want to automate first. Could you please describe what you\'d like me to help you with?'
      };
    }

    const analysis = context.analysis;
    const tools = context.tools;

    // Create execution plan
    const steps = tools.map(tool => ({
      instruction: `Execute ${tool.action} on ${tool.platform}`,
      tool_id: tool.id,
      context: {
        platform: tool.platform,
        action: tool.action,
        parameters: tool.parameters || {}
      }
    }));

    // Store execution plan
    const { error } = await supabase
      .from('execution_plans')
      .insert({
        id: `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        thread_id: threadId,
        user_id: userId,
        analysis_context: context,
        status: 'ready_to_execute'
      });

    if (error) {
      console.error(`[Agent1][${traceId}] Error storing execution plan:`, error);
    }

    return {
      action: 'FLOW_CHANGE',
      steps: steps,
      projectContext: analysis.context,
      message: `Perfect! I've validated your ${platform} credentials and created an execution plan with ${steps.length} steps. The automation is ready to run.`
    };
  }
}

