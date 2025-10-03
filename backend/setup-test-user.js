#!/usr/bin/env node
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function setupTestUser() {
  try {
    console.log('🔧 Setting up test user...');
    
    // Check if test user exists
    let user = await prisma.user.findUnique({
      where: { id: 'test-user-123' }
    });
    
    if (!user) {
      console.log('📝 Creating test user...');
      user = await prisma.user.create({
        data: {
          id: 'test-user-123',
          email: 'test@wispix.com',
          passwordHash: 'test-hash',
          name: 'Test User'
        }
      });
      console.log('✅ Test user created:', user.id);
    } else {
      console.log('✅ Test user already exists:', user.id);
    }
    
    // Check existing automations
    const automations = await prisma.automation.findMany({
      where: { userId: 'test-user-123' }
    });
    
    console.log(`📋 Found ${automations.length} automations for test user`);
    
  } catch (error) {
    console.error('❌ Error setting up test user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

setupTestUser(); 