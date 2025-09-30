
const axios = require('axios');


// Data flow manager for proper step execution and data passing
class DataFlowManager {
  constructor() {
    this.context = {
      results: new Map(),
      variables: new Map(),
      trace: []
    };
  }

  // Execute step with automatic data flow
  async executeStep(step, stepFunction) {
    const startTime = Date.now();
    
    try {
      // Resolve input data from previous steps
      const input = this.resolveInput(step);
      
      // Log for tracing
      this.context.trace.push({
        stepId: step.id,
        input,
        output: null,
        timestamp: new Date()
      });
      
      // Execute the step function with resolved input
      const result = await stepFunction(this.context.variables);
      
      // Apply transformation if specified
      const transformedResult = step.transform 
        ? this.applyTransform(result, step.transform)
        : result;
      
      // Store result with metadata
      const stepResult = {
        success: true,
        data: transformedResult,
        metadata: {
          stepId: step.id,
          executedAt: new Date(),
          duration: Date.now() - startTime,
          provider: step.provider
        }
      };
      
      // Store in context
      this.context.results.set(step.outputAs, stepResult);
      this.context.variables.set(step.outputAs, transformedResult);
      
      // Update trace
      this.context.trace[this.context.trace.length - 1].output = transformedResult;
      
      return stepResult;
      
    } catch (error) {
      const stepResult = {
        success: false,
        data: null,
        metadata: {
          stepId: step.id,
          executedAt: new Date(),
          duration: Date.now() - startTime,
          provider: step.provider
        },
        error: error
      };
      
      this.context.results.set(step.outputAs, stepResult);
      throw error;
    }
  }
  
  // Resolve input using JSONPath-like references
  resolveInput(step) {
    if (!step.inputFrom) return {};
    
    // Support complex data references
    // Format: "stepName.path.to.data"
    if (step.inputFrom.includes('.')) {
      return this.resolveJsonPath(step.inputFrom);
    }
    
    // Simple reference to entire step output
    return this.context.variables.get(step.inputFrom);
  }
  
  resolveJsonPath(path) {
    const parts = path.split('.');
    const stepName = parts[0];
    const dataPath = parts.slice(1);
    
    let data = this.context.variables.get(stepName);
    
    for (const key of dataPath) {
      if (data && typeof data === 'object') {
        data = data[key];
      } else {
        return undefined;
      }
    }
    
    return data;
  }
  
  // Transform data between steps
  applyTransform(data, transform) {
    switch (transform.type) {
      case 'map':
        return this.mapTransform(data, transform);
      case 'filter':
        return this.filterTransform(data, transform);
      case 'aggregate':
        return this.aggregateTransform(data, transform);
      case 'flatten':
        return this.flattenTransform(data, transform);
      default:
        return data;
    }
  }
  
  mapTransform(data, transform) {
    if (!Array.isArray(data)) return data;
    return data.map(item => {
      const mapped = {};
      for (const [newKey, oldPath] of Object.entries(transform.mapping)) {
        mapped[newKey] = this.getNestedValue(item, oldPath);
      }
      return mapped;
    });
  }
  
  filterTransform(data, transform) {
    if (!Array.isArray(data)) return data;
    return data.filter(item => {
      const value = this.getNestedValue(item, transform.field);
      switch (transform.operator) {
        case 'equals':
          return value === transform.value;
        case 'contains':
          return String(value).includes(transform.value);
        case 'greater':
          return value > transform.value;
        default:
          return true;
      }
    });
  }
  
  aggregateTransform(data, transform) {
    if (!Array.isArray(data)) return data;
    
    if (transform.groupBy) {
      const grouped = {};
      data.forEach(item => {
        const key = this.getNestedValue(item, transform.groupBy);
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(item);
      });
      return grouped;
    }
    
    // Simple aggregations
    switch (transform.operation) {
      case 'count':
        return data.length;
      case 'sum':
        return data.reduce((sum, item) => 
          sum + this.getNestedValue(item, transform.field), 0);
      default:
        return data;
    }
  }
  
  flattenTransform(data, transform) {
    const flattened = [];
    
    const flatten = (obj, prefix = '') => {
      for (const [key, value] of Object.entries(obj)) {
        const newKey = prefix ? `${prefix}_${key}` : key;
        if (typeof value === 'object' && !Array.isArray(value)) {
          flatten(value, newKey);
        } else {
          flattened.push({ key: newKey, value });
        }
      }
    };
    
    if (Array.isArray(data)) {
      data.forEach(item => flatten(item));
    } else {
      flatten(data);
    }
    
    return flattened;
  }
  
  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }
  
  // Generate execution report
  generateReport() {
    const steps = Array.from(this.context.results.entries()).map(([name, result]) => ({
      name,
      success: result.success,
      duration: result.metadata.duration,
      error: result.error?.message
    }));
    
    return {
      totalSteps: steps.length,
      successfulSteps: steps.filter(s => s.success).length,
      failedSteps: steps.filter(s => !s.success).length,
      totalDuration: steps.reduce((sum, s) => sum + s.duration, 0),
      steps,
      trace: this.context.trace
    };
  }

  // Get all step results
  getResults() {
    return this.context.variables;
  }
}


// Intelligent prompt aggregation for AI processing
class PromptAggregator {
  constructor(config = {}) {
    this.maxTokens = config.maxTokens || 2000;
    this.priorityFields = config.priorityFields || [];
    this.excludeFields = config.excludeFields || ['id', 'createdTime', 'modifiedTime'];
  }

  aggregate(records, options = {}) {
    const strategy = options.strategy || 'smart';
    
    switch(strategy) {
      case 'smart':
        return this.smartAggregate(records, options);
      case 'statistical':
        return this.statisticalAggregate(records, options);
      case 'sampling':
        return this.samplingAggregate(records, options);
      default:
        return this.basicAggregate(records);
    }
  }

  smartAggregate(records, options) {
    const { 
      groupBy, 
      summarizeFields, 
      maxRecords = 20,
      includeStats = true 
    } = options;

    let processed = records.slice(0, maxRecords);
    let prompt = '';

    // Add statistical overview if many records
    if (records.length > maxRecords && includeStats) {
      prompt += this.generateStats(records, summarizeFields) + '\n\n';
    }

    // Group records if specified
    if (groupBy) {
      const grouped = this.groupRecords(processed, groupBy);
      prompt += 'Data grouped by ' + groupBy + ':\n';
      
      for (const [key, items] of Object.entries(grouped)) {
        prompt += `\n[${key}]: ${items.length} items\n`;
        prompt += this.formatRecords(items.slice(0, 3), summarizeFields);
      }
    } else {
      prompt += this.formatRecords(processed, summarizeFields);
    }

    return this.truncateToTokenLimit(prompt);
  }

  statisticalAggregate(records, options) {
    const stats = {};
    const numericalFields = this.findNumericalFields(records);
    
    // Calculate statistics for numerical fields
    numericalFields.forEach(field => {
      const values = records.map(r => r[field]).filter(v => v != null);
      if (values.length > 0) {
        stats[field] = {
          min: Math.min(...values),
          max: Math.max(...values),
          avg: values.reduce((a, b) => a + b, 0) / values.length,
          count: values.length
        };
      }
    });

    // Count categorical values
    const categoricalFields = this.findCategoricalFields(records);
    categoricalFields.forEach(field => {
      const counts = {};
      records.forEach(r => {
        const val = r[field];
        if (val) counts[val] = (counts[val] || 0) + 1;
      });
      stats[field] = counts;
    });

    return `Statistical Summary of ${records.length} records:\n` +
           JSON.stringify(stats, null, 2) +
           '\n\nSample records:\n' +
           this.formatRecords(records.slice(0, 5));
  }

  samplingAggregate(records, options) {
    const sampleSize = Math.min(options.sampleSize || 10, records.length);
    const sampled = this.stratifiedSample(records, sampleSize, options.stratifyBy);
    
    return `Sample of ${sampleSize} from ${records.length} total records:\n` +
           this.formatRecords(sampled, options.fields);
  }

  basicAggregate(records) {
    return this.formatRecords(records.slice(0, 10));
  }

  formatRecords(records, fields) {
    return records.map((record, i) => {
      const data = this.extractRelevantData(record, fields);
      return `${i + 1}. ${this.compactFormat(data)}`;
    }).join('\n');
  }

  extractRelevantData(record, fields) {
    const data = {};
    const fieldsToUse = fields || this.priorityFields || Object.keys(record);
    
    fieldsToUse.forEach(field => {
      if (!this.excludeFields.includes(field) && record[field] !== undefined) {
        data[field] = record[field];
      }
    });
    
    return data;
  }

  compactFormat(data) {
    return Object.entries(data)
      .filter(([_, v]) => v != null && v !== '')
      .map(([k, v]) => {
        const val = typeof v === 'string' && v.length > 50 
          ? v.substring(0, 47) + '...' 
          : v;
        return `${k}:${val}`;
      })
      .join(', ');
  }

  generateStats(records, fields) {
    const total = records.length;
    const preview = `Total records: ${total}`;
    
    if (fields && fields.length > 0) {
      const fieldStats = fields.map(field => {
        const nonNull = records.filter(r => r[field] != null).length;
        return `${field}: ${nonNull}/${total} have values`;
      }).join(', ');
      
      return `${preview}\nField coverage: ${fieldStats}`;
    }
    
    return preview;
  }

  groupRecords(records, groupBy) {
    const grouped = {};
    records.forEach(record => {
      const key = record[groupBy] || 'undefined';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(record);
    });
    return grouped;
  }

  findNumericalFields(records) {
    if (records.length === 0) return [];
    const sample = records[0];
    return Object.keys(sample).filter(key => 
      typeof sample[key] === 'number'
    );
  }

  findCategoricalFields(records) {
    const fields = [];
    const sample = records.slice(0, 10);
    
    Object.keys(sample[0] || {}).forEach(key => {
      const values = new Set(sample.map(r => r[key]));
      if (values.size < sample.length / 2 && typeof sample[0][key] === 'string') {
        fields.push(key);
      }
    });
    
    return fields;
  }

  stratifiedSample(records, sampleSize, stratifyBy) {
    if (!stratifyBy) {
      const shuffled = [...records].sort(() => Math.random() - 0.5);
      return shuffled.slice(0, sampleSize);
    }
    
    const groups = this.groupRecords(records, stratifyBy);
    const sampled = [];
    const perGroup = Math.ceil(sampleSize / Object.keys(groups).length);
    
    for (const items of Object.values(groups)) {
      sampled.push(...items.slice(0, perGroup));
      if (sampled.length >= sampleSize) break;
    }
    
    return sampled.slice(0, sampleSize);
  }

  truncateToTokenLimit(text) {
    const charLimit = this.maxTokens * 4;
    if (text.length <= charLimit) return text;
    
    return text.substring(0, charLimit - 20) + '\n... [truncated]';
  }
}



async function step_1(prevResults) {
  try {
    console.log('🔍 Executing airtable fetch...');
    
    const inputData = {};
    
    // Build request configuration
    const config = {
      method: 'GET',
      url: 'https://api.airtable.com/v0/appUNIsu8KgvOlmi0/tblI5BWUKJNuTeINH?filterByFormula=CREATED_TIME()%3E%3DTODAY()',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    // Add authentication
    config.headers['Authorization'] = `Bearer ${process.env.AIRTABLE_PAT || 'YOUR_PAT'}`;

    // Add body for non-GET requests
    

    console.log('📋 Request URL:', config.url);
    console.log('📋 Request method:', config.method);
    
    const response = await axios(config);
    
    console.log('✅ airtable fetch completed successfully');
    console.log('📋 Response:', JSON.stringify(response.data, null, 2));
    
    return response.data.records;
    
  } catch (error) {
    console.error('❌ Error in airtable fetch:');
    console.error('📋 Status:', error.response?.status);
    console.error('📋 Message:', error.response?.data);
    console.error('📋 Full error:', error.message);
    throw error;
  }
}


async function step_2(prevResults) {
  try {
    console.log('🔍 Executing openai summarize...');
    
    const inputData = prevResults['step_1'];
    
    // Build request configuration
    const config = {
      method: 'POST',
      url: 'https://api.openai.com/v1/chat/completions',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    // Add authentication
    config.headers['Authorization'] = `Bearer ${process.env.OPENAI_API_KEY || 'YOUR_OPENAI_API_KEY'}`;

    // Add body for non-GET requests
    
// Initialize PromptAggregator for intelligent data processing
const aggregator = new PromptAggregator({
  priorityFields: ["name","status","title","amount","date"],
  excludeFields: ["id","createdTime","modifiedTime","internal_id"],
  maxTokens: 1500
});

// Process data intelligently based on size and structure
let formattedData;
if (Array.isArray(inputData)) {
  const records = inputData.map(item => item.fields || item);
  
  // Choose aggregation strategy based on data size
  const strategy = records.length > 50 ? 'statistical' : 
                  records.length > 20 ? 'smart' : 
                  'sampling';
  
  formattedData = aggregator.aggregate(records, {
    strategy: strategy,
    groupBy: 'status',
    summarizeFields: ["name","status","amount","date"],
    maxRecords: 30,
    includeStats: true
  });
} else {
  formattedData = typeof inputData === 'string' ? inputData : JSON.stringify(inputData);
}

const systemPrompt = 'You are a data analyst. Provide a clear, concise summary of the data focusing on key insights, patterns, and important details.';
const userPrompt = `Please summarize the following data:

${formattedData}`;

config.data = {
  model: 'gpt-3.5-turbo',
  messages: [
    {
      role: 'system',
      content: systemPrompt
    },
    {
      role: 'user',
      content: userPrompt
    }
  ],
  temperature: 0.7,
  max_tokens: 500
};

    console.log('📋 Request URL:', config.url);
    console.log('📋 Request method:', config.method);
    
    const response = await axios(config);
    
    console.log('✅ openai summarize completed successfully');
    console.log('📋 Response:', JSON.stringify(response.data, null, 2));
    
    return response.data.choices[0].message.content;
    
  } catch (error) {
    console.error('❌ Error in openai summarize:');
    console.error('📋 Status:', error.response?.status);
    console.error('📋 Message:', error.response?.data);
    console.error('📋 Full error:', error.message);
    throw error;
  }
}


async function step_3(prevResults) {
  try {
    console.log('🔍 Executing notion create...');
    
    const inputData = prevResults['step_2'];
    
    // Build request configuration
    const config = {
      method: 'POST',
      url: 'https://api.notion.com/v1/pages',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    // Add authentication
    
config.headers['Authorization'] = `Bearer ${process.env.NOTION_TOKEN || 'YOUR_NOTION_TOKEN'}`;
config.headers['Notion-Version'] = '2022-06-28';

    // Add body for non-GET requests
    
config.data = {
  parent: { database_id: 'YOUR_DATABASE_ID' },
  properties: {
    'Title': {
      title: [{
        text: {
          content: `Daily Summary - ${new Date().toLocaleDateString()}`
        }
      }]
    },
    'Content': {
      rich_text: [{
        text: {
          content: typeof inputData === 'string' ? inputData : JSON.stringify(inputData)
        }
      }]
    }
  }
};

    console.log('📋 Request URL:', config.url);
    console.log('📋 Request method:', config.method);
    
    const response = await axios(config);
    
    console.log('✅ notion create completed successfully');
    console.log('📋 Response:', JSON.stringify(response.data, null, 2));
    
    return response.data;
    
  } catch (error) {
    console.error('❌ Error in notion create:');
    console.error('📋 Status:', error.response?.status);
    console.error('📋 Message:', error.response?.data);
    console.error('📋 Full error:', error.message);
    throw error;
  }
}

async function run() {
  try {
    console.log('🚀 Starting automation execution with DataFlowManager...');
    
    const manager = new DataFlowManager();
    
    // Define step configurations
    const stepDefinitions = [
  {
    id: 'step_1',
    provider: 'airtable',
    intent: 'fetch',
    inputFrom: null,
    outputAs: 'airtableRecords',
    config: {"params":{"filterByFormula":"IS_SAME(CREATED_TIME(), TODAY())"}}
  },
  {
    id: 'step_2',
    provider: 'openai',
    intent: 'summarize',
    inputFrom: 'step_1',
    outputAs: 'summary',
    config: {"model":"gpt-3.5-turbo","messages":[{"role":"system","content":"Summarize the provided records concisely"},{"role":"user","content":"{{airtableRecords}}"}]}
  },
  {
    id: 'step_3',
    provider: 'notion',
    intent: 'create',
    inputFrom: 'step_2',
    outputAs: 'notionPage',
    config: {"parent":{"type":"database_id","database_id":"YOUR_DATABASE_ID"},"properties":{"title":"Daily Summary - {{date}}","content":"{{summary}}"}}
  }
    ];
    
    // Execute steps with proper data flow
    
    console.log('🔄 Executing step: step_1');
    await manager.executeStep(
      stepDefinitions.find(s => s.id === 'step_1'), 
      async (context) => await step_1(context)
    );
    console.log('🔄 Executing step: step_2');
    await manager.executeStep(
      stepDefinitions.find(s => s.id === 'step_2'), 
      async (context) => await step_2(context)
    );
    console.log('🔄 Executing step: step_3');
    await manager.executeStep(
      stepDefinitions.find(s => s.id === 'step_3'), 
      async (context) => await step_3(context)
    );
    
    // Get final results
    const finalResults = {};
    const allResults = manager.getResults();
    allResults.forEach((value, key) => {
      finalResults[key] = value;
    });
    
    // Generate execution report
    const report = manager.generateReport();
    console.log('📊 Execution Report:', {
      totalSteps: report.totalSteps,
      successfulSteps: report.successfulSteps,
      failedSteps: report.failedSteps,
      totalDuration: report.totalDuration + 'ms'
    });
    
    console.log('✅ Automation completed successfully!');
    return finalResults;
    
  } catch (error) {
    console.error('❌ Automation execution failed:', error);
    throw error;
  }
}


// BullMQ scheduling wrapper
function wrapWithScheduler(automationId, cronExpression) {
  // This function will be called by the scheduling system
  // The actual scheduling is handled in the Wispix backend
  return {
    automationId,
    cronExpression,
    executionFunction: run,
    metadata: {
      createdAt: new Date().toISOString(),
      trigger: { type: 'cron', schedule: cronExpression }
    }
  };
}

// Export scheduling configuration
if (require.main === module) {
  const config = wrapWithScheduler('1754525944996_automation', '0 17 * * *');
  console.log('Automation ready for BullMQ scheduling:', config.automationId);
  console.log('Cron expression:', config.cronExpression);
}

module.exports = { run };
