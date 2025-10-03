#!/usr/bin/env node

/**
 * Cleanup Script: Delete Existing Flows
 * 
 * This script removes all existing automation flows from the database
 * to start fresh with the new tool-based system.
 * 
 * Run with: node scripts/cleanup-existing-flows.js
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

async function cleanupExistingFlows() {
  console.log('🧹 Starting cleanup of existing flows...');
  
  try {
    // Delete in order to respect foreign key constraints
    
    // 1. Delete activity logs
    console.log('🗑️ Deleting activity logs...');
    const { error: activityError } = await supabase
      .from('activity_logs')
      .delete()
      .neq('id', '');
    
    if (activityError) {
      console.error('❌ Error deleting activity logs:', activityError);
    } else {
      console.log('✅ Activity logs deleted');
    }
    
    // 2. Delete flow executions
    console.log('🗑️ Deleting flow executions...');
    const { error: executionError } = await supabase
      .from('flow_executions')
      .delete()
      .neq('id', '');
    
    if (executionError) {
      console.error('❌ Error deleting flow executions:', executionError);
    } else {
      console.log('✅ Flow executions deleted');
    }
    
    // 3. Delete chat messages
    console.log('🗑️ Deleting chat messages...');
    const { error: chatError } = await supabase
      .from('chat_messages')
      .delete()
      .neq('id', '');
    
    if (chatError) {
      console.error('❌ Error deleting chat messages:', chatError);
    } else {
      console.log('✅ Chat messages deleted');
    }
    
    // 4. Delete automation threads
    console.log('🗑️ Deleting automation threads...');
    const { error: threadError } = await supabase
      .from('automation_threads')
      .delete()
      .neq('id', '');
    
    if (threadError) {
      console.error('❌ Error deleting automation threads:', threadError);
    } else {
      console.log('✅ Automation threads deleted');
    }
    
    // 5. Delete user credentials (optional - comment out if you want to keep them)
    console.log('🗑️ Deleting user credentials...');
    const { error: credentialError } = await supabase
      .from('user_credentials')
      .delete()
      .neq('id', '');
    
    if (credentialError) {
      console.error('❌ Error deleting user credentials:', credentialError);
    } else {
      console.log('✅ User credentials deleted');
    }
    
    console.log('🎉 Cleanup completed successfully!');
    console.log('📋 Summary:');
    console.log('  - Activity logs: Deleted');
    console.log('  - Flow executions: Deleted');
    console.log('  - Chat messages: Deleted');
    console.log('  - Automation threads: Deleted');
    console.log('  - User credentials: Deleted');
    console.log('');
    console.log('🚀 Ready to start fresh with the new tool-based system!');
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  }
}

// Run cleanup
cleanupExistingFlows();

