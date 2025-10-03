require('dotenv').config();
const { ApiDocsSearchDirect } = require('./dist/services/ApiDocsSearchDirect');

async function testApiDocsIntegration() {
  console.log('🧪 Testing API Docs Integration with Cline Agent...\n');
  
  const testMessage = 'create a new row every 5 minutes in my airtable with "test123"';
  
  console.log('📝 Test Message:');
  console.log(testMessage);
  console.log('\n🔍 Checking if message contains "airtable"...');
  
  if (testMessage.toLowerCase().includes('airtable')) {
    console.log('✅ Message contains "airtable" - will attempt to retrieve API docs');
    
    try {
      console.log('📚 Retrieving Airtable API documentation...');
      const airtableDocs = await ApiDocsSearchDirect.getDocs('airtable', testMessage);
      
      if (airtableDocs.length > 0) {
        console.log('✅ Successfully retrieved API docs!');
        console.log(`📄 Number of chunks: ${airtableDocs.length}`);
        console.log('\n📋 First chunk preview:');
        console.log(airtableDocs[0].substring(0, 200) + '...');
        
        // Simulate what the Cline agent would do
        const apiDocs = `\n\n**Relevant API Documentation:**\n${airtableDocs.join('\n\n')}`;
        console.log('\n🎯 API docs would be included in the planning prompt');
        
      } else {
        console.log('⚠️ No API docs found for the query');
      }
    } catch (error) {
      console.error('❌ Failed to retrieve API docs:', error.message);
    }
  } else {
    console.log('❌ Message does not contain "airtable" - API docs would not be retrieved');
  }
  
  console.log('\n✅ Test completed!');
}

testApiDocsIntegration(); 