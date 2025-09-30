require('dotenv').config();
const { ApiDocsSearchDirect } = require('./dist/services/ApiDocsSearchDirect');
const fs = require('fs');
const path = require('path');

async function ingestStripeDocs() {
  try {
    console.log('📚 Starting Stripe API documentation ingestion...');
    
    // Read the JSON file
    const stripeDocsPath = path.join(__dirname, 'api_docs/stripe/stripe-api-docs.json');
    const stripeDocs = JSON.parse(fs.readFileSync(stripeDocsPath, 'utf8'));
    
    console.log('📖 Stripe API documentation loaded successfully');
    console.log(`📋 Provider: ${stripeDocs.provider}`);
    console.log(`📝 Version: ${stripeDocs.version}`);
    console.log(`📄 Content length: ${stripeDocs.content.length} characters`);
    
    // Ingest the documentation
    const result = await ApiDocsSearchDirect.ingestDocs(
      stripeDocs.provider,
      stripeDocs.version,
      stripeDocs.content
    );
    
    console.log('✅ Stripe API documentation ingested successfully!');
    console.log(`🆔 API Doc ID: ${result.id}`);
    console.log(`📊 Chunks created: ${result.chunks.length}`);
    
    // Test the search functionality
    console.log('\n🔍 Testing search functionality...');
    const searchResults = await ApiDocsSearchDirect.getDocs('stripe', 'payment intent create');
    console.log(`📝 Found ${searchResults.length} relevant chunks`);
    
    console.log('\n🎉 Stripe API integration complete!');
    console.log('📚 Available providers: airtable, openai, stripe');
    
  } catch (error) {
    console.error('❌ Error ingesting Stripe API documentation:', error);
    process.exit(1);
  }
}

ingestStripeDocs(); 