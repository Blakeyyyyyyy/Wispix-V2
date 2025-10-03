#!/usr/bin/env node

/**
 * Cleanup script to ensure only TaskManager and InboxManager are active
 * Run this before deploying to Railway to clean up the database
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function cleanupAgents() {
  try {
    console.log('🧹 Cleaning up automations to keep only TaskManager and InboxManager...');
    
    // Get all automations
    const allAutomations = await prisma.automation.findMany();
    console.log(`Found ${allAutomations.length} total automations`);
    
    // Find TaskManager and InboxManager
    const taskManager = allAutomations.find(a => a.config?.agentKind === 'TaskManager');
    const inboxManager = allAutomations.find(a => a.config?.agentKind === 'InboxManager');
    
    console.log('Active agents to keep:');
    if (taskManager) console.log(`✅ TaskManager: ${taskManager.id}`);
    if (inboxManager) console.log(`✅ InboxManager: ${inboxManager.id}`);
    
    // Deactivate all other automations
    const agentsToDeactivate = allAutomations.filter(a => 
      a.config?.agentKind !== 'TaskManager' && 
      a.config?.agentKind !== 'InboxManager'
    );
    
    if (agentsToDeactivate.length > 0) {
      console.log(`\nDeactivating ${agentsToDeactivate.length} other automations:`);
      
      for (const agent of agentsToDeactivate) {
        console.log(`❌ Deactivating ${agent.config?.agentKind}: ${agent.id}`);
        await prisma.automation.update({
          where: { id: agent.id },
          data: { status: 'inactive' }
        });
      }
    }
    
    // Ensure TaskManager and InboxManager are active
    if (taskManager && taskManager.status !== 'active') {
      console.log('🔧 Activating TaskManager...');
      await prisma.automation.update({
        where: { id: taskManager.id },
        data: { status: 'active' }
      });
    }
    
    if (inboxManager && inboxManager.status !== 'active') {
      console.log('🔧 Activating InboxManager...');
      await prisma.automation.update({
        where: { id: inboxManager.id },
        data: { status: 'active' }
      });
    }
    
    // Final status
    const activeAutomations = await prisma.automation.findMany({
      where: { status: 'active' }
    });
    
    console.log('\n🎯 Final status:');
    console.log(`Active automations: ${activeAutomations.length}`);
    activeAutomations.forEach(a => {
      console.log(`  ✅ ${a.config?.agentKind}: ${a.id} (${a.status})`);
    });
    
    console.log('\n✨ Cleanup complete! Only TaskManager and InboxManager are now active.');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run cleanup
cleanupAgents();

