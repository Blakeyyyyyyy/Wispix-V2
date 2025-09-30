const { SessionManager } = require('./src/session/session-manager');

// Test the session management system
async function testSessionSystem() {
  console.log('🧪 Testing Vibe-style Session Management System\n');
  
  const sessionManager = new SessionManager();
  
  // 1. Create a session
  console.log('1️⃣ Creating session...');
  const sessionId = sessionManager.createSession('I need an AI email manager for my business');
  console.log(`   Session created: ${sessionId}\n`);
  
  // 2. Add conversation messages
  console.log('2️⃣ Adding conversation history...');
  sessionManager.addConversationMessage(sessionId, {
    role: 'user',
    content: 'I need an AI email manager for my business',
    type: 'request'
  });
  
  sessionManager.addConversationMessage(sessionId, {
    role: 'assistant',
    content: 'I\'ll help you create an AI email manager. Let me analyze your needs.',
    type: 'response'
  });
  console.log('   ✅ Conversation history added\n');
  
  // 3. Update phases
  console.log('3️⃣ Updating phases...');
  sessionManager.updatePhase(sessionId, 'analysis', {
    content: 'Analysis: You need an AI email manager with classification, automation, and 24/7 monitoring.',
    model: 'claude-3-5-sonnet',
    cost: 0.0001
  });
  
  sessionManager.updatePhase(sessionId, 'planning', {
    content: 'Plan: Create Gmail-integrated AI with smart filtering, auto-responses, and lead detection.',
    model: 'claude-3-opus',
    cost: 0.0025
  });
  console.log('   ✅ Phases updated\n');
  
  // 4. Add approval questions
  console.log('4️⃣ Adding approval questions...');
  sessionManager.addApprovalQuestion(sessionId, 'What is the estimated monthly cost?', 'Based on the analysis, the estimated monthly API cost is around $0.75 for 1000 emails processed.');
  sessionManager.addApprovalQuestion(sessionId, 'How secure is the Gmail integration?', 'The Gmail integration uses OAuth 2.0 with read-only access and encrypted credential storage.');
  console.log('   ✅ Approval questions added\n');
  
  // 5. Get full context
  console.log('5️⃣ Retrieving full context...');
  const context = sessionManager.getFullContext(sessionId);
  console.log('   📊 Session Status:', context.sessionStatus);
  console.log('   🔄 Current Phase:', context.currentPhase);
  console.log('   💬 Messages:', context.conversationHistory.length);
  console.log('   ❓ Questions:', context.approvalQuestions.length);
  console.log('   📈 Analysis:', context.analysis ? '✅' : '❌');
  console.log('   📋 Plan:', context.plan ? '✅' : '❌');
  
  console.log('\n🎉 Session Management System Test Complete!');
  console.log('\n💡 This demonstrates how Vibe maintains context across:');
  console.log('   • Request → Analysis → Planning → Approval → Deployment');
  console.log('   • Full conversation history');
  console.log('   • Approval questions and answers');
  console.log('   • Phase progression tracking');
  console.log('   • Context persistence for AI responses');
}

testSessionSystem().catch(console.error);
