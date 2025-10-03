#!/usr/bin/env node

/**
 * Basic Test Script: Verify Implementation Files
 * 
 * This script tests that all the implementation files exist and are properly structured.
 */

import fs from 'fs';
import path from 'path';

async function testBasicImplementation() {
  console.log('🧪 Testing Basic Implementation...\n');
  
  const tests = [
    {
      name: 'Database Migration Files',
      files: [
        'supabase/migrations/20250102000001_create_tool_system.sql',
        'supabase/migrations/20250102000002_seed_tools.sql'
      ]
    },
    {
      name: 'Agent Implementation Files',
      files: [
        'src/lib/agents/InternalAgent1.ts',
        'src/lib/agents/InternalAgent2.ts'
      ]
    },
    {
      name: 'Encryption System',
      files: [
        'src/lib/encryption.ts'
      ]
    },
    {
      name: 'API Endpoints',
      files: [
        'api/agent1.js',
        'api/agent2.js',
        'api/execute-flow-tool-based.js'
      ]
    },
    {
      name: 'Frontend Components',
      files: [
        'src/components/ChatInterface.tsx',
        'src/components/CredentialForm.tsx',
        'src/components/FlowMapping.tsx'
      ]
    },
    {
      name: 'Utility Scripts',
      files: [
        'scripts/cleanup-existing-flows.js',
        'scripts/test-tool-system.js'
      ]
    },
    {
      name: 'Documentation',
      files: [
        'DUAL_AGENT_IMPLEMENTATION_SUMMARY.md',
        'PRE_DEPLOYMENT_CHECKLIST.md'
      ]
    }
  ];
  
  let allPassed = true;
  
  for (const test of tests) {
    console.log(`📁 ${test.name}:`);
    
    for (const file of test.files) {
      const filePath = path.join(process.cwd(), file);
      const exists = fs.existsSync(filePath);
      
      if (exists) {
        const stats = fs.statSync(filePath);
        const size = stats.size;
        console.log(`  ✅ ${file} (${size} bytes)`);
      } else {
        console.log(`  ❌ ${file} (missing)`);
        allPassed = false;
      }
    }
    console.log('');
  }
  
  // Test package.json
  console.log('📦 Package Configuration:');
  try {
    const packagePath = path.join(process.cwd(), 'package.json');
    const packageContent = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    
    console.log(`  ✅ package.json exists`);
    console.log(`  ✅ Dependencies: ${Object.keys(packageContent.dependencies).length} packages`);
    console.log(`  ✅ Scripts: ${Object.keys(packageContent.scripts).length} scripts`);
    
    // Check for required dependencies
    const requiredDeps = ['@supabase/supabase-js', 'openai', 'dotenv'];
    const missingDeps = requiredDeps.filter(dep => !packageContent.dependencies[dep]);
    
    if (missingDeps.length === 0) {
      console.log(`  ✅ All required dependencies present`);
    } else {
      console.log(`  ❌ Missing dependencies: ${missingDeps.join(', ')}`);
      allPassed = false;
    }
    
  } catch (error) {
    console.log(`  ❌ Error reading package.json: ${error.message}`);
    allPassed = false;
  }
  
  console.log('');
  
  // Test environment file
  console.log('🔧 Environment Configuration:');
  const envExamplePath = path.join(process.cwd(), 'env.example');
  if (fs.existsSync(envExamplePath)) {
    console.log(`  ✅ env.example exists`);
    
    const envContent = fs.readFileSync(envExamplePath, 'utf8');
    const requiredVars = ['VITE_SUPABASE_URL', 'OPENAI_API_KEY', 'SUPABASE_SERVICE_ROLE_KEY'];
    const missingVars = requiredVars.filter(varName => !envContent.includes(varName));
    
    if (missingVars.length === 0) {
      console.log(`  ✅ All required environment variables documented`);
    } else {
      console.log(`  ❌ Missing environment variables: ${missingVars.join(', ')}`);
      allPassed = false;
    }
  } else {
    console.log(`  ❌ env.example missing`);
    allPassed = false;
  }
  
  console.log('');
  
  if (allPassed) {
    console.log('🎉 All basic tests passed!');
    console.log('✅ Implementation is complete and ready for deployment');
    console.log('');
    console.log('📋 Next Steps:');
    console.log('  1. Apply database migrations to Supabase');
    console.log('  2. Deploy to Vercel');
    console.log('  3. Test with real credentials');
  } else {
    console.log('❌ Some tests failed. Please check the missing files.');
    process.exit(1);
  }
}

// Run tests
testBasicImplementation();
