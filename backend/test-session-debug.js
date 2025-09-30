const { SessionManager } = require('./src/session/session-manager');

const sessionManager = new SessionManager();

console.log('🧪 Debugging Session Creation and Context Retrieval\n');

// Test 1: Create a session
console.log('1️⃣ Creating session...');
const sessionId = sessionManager.createSession('Test request');
console.log('   Session ID:', sessionId);

// Test 2: Get the session
console.log('\n2️⃣ Getting session...');
const session = sessionManager.getSession(sessionId);
console.log('   Session found:', !!session);
console.log('   Session data:', JSON.stringify(session, null, 2));

// Test 3: Get context for phase
console.log('\n3️⃣ Getting context for phase...');
const contextForPhase = sessionManager.getContextForPhase(sessionId, 'request');
console.log('   Context for phase:', JSON.stringify(contextForPhase, null, 2));

// Test 4: Get full context
console.log('\n4️⃣ Getting full context...');
const fullContext = sessionManager.getFullContext(sessionId);
console.log('   Full context:', JSON.stringify(fullContext, null, 2));

console.log('\n🎯 Debug complete!');
