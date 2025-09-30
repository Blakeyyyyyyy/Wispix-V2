#!/usr/bin/env node
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

async function checkAutomations() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Checking automations in database...');
    
    const automations = await prisma.automation.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5
    });
    
    console.log(`📊 Found ${automations.length} automations:`);
    
    automations.forEach((automation, index) => {
      console.log(`\n${index + 1}. Automation ID: ${automation.id}`);
      console.log(`   Name: ${automation.name}`);
      console.log(`   Description: ${automation.description}`);
      console.log(`   Status: ${automation.status}`);
      console.log(`   Created: ${automation.createdAt}`);
      console.log(`   Workflow JSON: ${automation.workflowJson ? 'Present' : 'None'}`);
      
      if (automation.workflowJson) {
        try {
          const workflow = JSON.parse(automation.workflowJson);
          console.log(`   Steps: ${workflow.steps ? workflow.steps.length : 0} steps`);
          
          if (workflow.steps) {
            console.log('   Step details:');
            workflow.steps.forEach((step, stepIndex) => {
              console.log(`     Step ${stepIndex + 1}: ${step.type} - ${step.name}`);
            });
          }
        } catch (e) {
          console.log('   Workflow JSON parsing failed');
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Error checking automations:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAutomations(); 