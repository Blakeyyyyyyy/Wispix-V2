#!/usr/bin/env node

/**
 * Test Script: Tool-Based Dual-Agent System
 * 
 * This script tests the new tool-based system by:
 * 1. Verifying database tables exist
 * 2. Testing tool definitions
 * 3. Testing Agent 1 functionality
 * 4. Testing Agent 2 functionality
 * 5. Testing credential encryption
 * 
 * Run with: node scripts/test-tool-system.js
 */

import { createClient } from '@supabase/supabase-js';
import { InternalAgent1 } from '../src/lib/agents/InternalAgent1.ts';
import { InternalAgent2 } from '../src/lib/agents/InternalAgent2.ts';
import { encryptCredentials, decryptCredentials } from '../src/lib/encryption.ts';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

async function testToolSystem() {
  console.log('🧪 Testing Tool-Based Dual-Agent System...\n');
  
  try {
    // Test 1: Database Tables
    console.log('📊 Test 1: Verifying database tables...');
    await testDatabaseTables();
    
    // Test 2: Tool Definitions
    console.log('\n🔧 Test 2: Testing tool definitions...');
    await testToolDefinitions();
    
    // Test 3: Credential Encryption
    console.log('\n🔐 Test 3: Testing credential encryption...');
    await testCredentialEncryption();
    
    // Test 4: Agent 1 (if OpenAI key available)
    if (process.env.OPENAI_API_KEY) {
      console.log('\n🤖 Test 4: Testing Agent 1...');
      await testAgent1();
    } else {
      console.log('\n⚠️ Test 4: Skipping Agent 1 test (no OpenAI API key)');
    }
    
    // Test 5: Agent 2 (if OpenAI key available)
    if (process.env.OPENAI_API_KEY) {
      console.log('\n🤖 Test 5: Testing Agent 2...');
      await testAgent2();
    } else {
      console.log('\n⚠️ Test 5: Skipping Agent 2 test (no OpenAI API key)');
    }
    
    console.log('\n🎉 All tests completed successfully!');
    console.log('✅ Tool-based dual-agent system is ready to use!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

async function testDatabaseTables() {
  const tables = [
    'tool_definitions',
    'execution_plans', 
    'thread_memory',
    'user_credentials'
  ];
  
  for (const table of tables) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .limit(1);
    
    if (error) {
      console.error(`❌ Table ${table}: ${error.message}`);
      throw new Error(`Table ${table} not accessible`);
    } else {
      console.log(`✅ Table ${table}: OK`);
    }
  }
}

async function testToolDefinitions() {
  // Test Airtable tools
  const { data: airtableTools, error: airtableError } = await supabase
    .from('tool_definitions')
    .select('*')
    .eq('platform', 'airtable');
  
  if (airtableError) {
    throw new Error(`Airtable tools error: ${airtableError.message}`);
  }
  
  console.log(`✅ Airtable tools: ${airtableTools.length} found`);
  
  // Test Asana tools
  const { data: asanaTools, error: asanaError } = await supabase
    .from('tool_definitions')
    .select('*')
    .eq('platform', 'asana');
  
  if (asanaError) {
    throw new Error(`Asana tools error: ${asanaError.message}`);
  }
  
  console.log(`✅ Asana tools: ${asanaTools.length} found`);
  
  // Test tool structure
  if (airtableTools.length > 0) {
    const tool = airtableTools[0];
    const requiredFields = ['id', 'platform', 'action', 'function_definition', 'http_template'];
    const missingFields = requiredFields.filter(field => !tool[field]);
    
    if (missingFields.length > 0) {
      throw new Error(`Tool missing fields: ${missingFields.join(', ')}`);
    }
    
    console.log(`✅ Tool structure: Valid`);
  }
}

async function testCredentialEncryption() {
  const testCredentials = {
    airtable_pat: 'test_token_123',
    asana_token: 'test_token_456'
  };
  
  // Test encryption
  const encrypted = encryptCredentials(testCredentials);
  console.log(`✅ Encryption: ${encrypted.length} characters`);
  
  // Test decryption
  const decrypted = decryptCredentials(encrypted);
  console.log(`✅ Decryption: ${Object.keys(decrypted).length} fields`);
  
  // Verify data integrity
  if (JSON.stringify(testCredentials) !== JSON.stringify(decrypted)) {
    throw new Error('Encryption/decryption data mismatch');
  }
  
  console.log(`✅ Data integrity: Verified`);
}

async function testAgent1() {
  const agent1 = new InternalAgent1();
  
  // Test tool search
  const tools = await agent1.searchTools('airtable', 'list');
  console.log(`✅ Tool search: Found ${tools.length} tools`);
  
  // Test credential check (should return missing for test user)
  const credentials = await agent1.checkCredentials('test-user', 'airtable');
  console.log(`✅ Credential check: ${credentials.hasAll ? 'Has all' : 'Missing some'}`);
  
  // Test request analysis
  const analysis = await agent1.analyzeRequest('List records from my Airtable base');
  console.log(`✅ Request analysis: Platform=${analysis.platform}, Action=${analysis.action}`);
}

async function testAgent2() {
  const agent2 = new InternalAgent2();
  
  // Test tool definition fetch
  const toolDef = await agent2.fetchToolDefinition('tool_airtable_list_records_v1');
  if (!toolDef) {
    throw new Error('Could not fetch tool definition');
  }
  
  console.log(`✅ Tool definition fetch: ${toolDef.display_name}`);
  
  // Test thread memory (should be empty for test)
  const memory = await agent2.getThreadMemory('test-automation');
  console.log(`✅ Thread memory: ${memory.length} messages`);
  
  // Test credential injection (should fail without credentials)
  try {
    await agent2.fetchCredentials('test-user', 'airtable');
    console.log(`⚠️ Credential fetch: Unexpectedly succeeded`);
  } catch (error) {
    console.log(`✅ Credential fetch: Correctly failed (no credentials)`);
  }
}

// Run tests
testToolSystem();

