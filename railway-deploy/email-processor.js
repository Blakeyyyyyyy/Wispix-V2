// backend/email-processor.js
// SIMPLIFIED EMAIL PROCESSOR FOR RAILWAY

const { google } = require('googleapis');
const OpenAI = require('openai');
const { PrismaClient } = require('@prisma/client');

const db = new PrismaClient();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Gmail setup
function getGmailClient() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    process.env.GMAIL_REDIRECT_URI
  );
  
  oauth2Client.setCredentials({
    refresh_token: process.env.GMAIL_REFRESH_TOKEN
  });
  
  return google.gmail({ version: 'v1', auth: oauth2Client });
}

// Main email processing function
async function processEmails() {
  const gmail = getGmailClient();
  
  try {
    // Get unread emails
    const response = await gmail.users.messages.list({
      userId: 'me',
      q: 'is:unread',
      maxResults: 20
    });
    
    const messages = response.data.messages || [];
    console.log(`Found ${messages.length} unread emails`);
    
    for (const message of messages) {
      await processEmail(gmail, message.id);
    }
    
    return { processed: messages.length };
  } catch (error) {
    console.error('Error processing emails:', error);
    throw error;
  }
}

// Process individual email
async function processEmail(gmail, messageId) {
  try {
    // Get email details
    const email = await gmail.users.messages.get({
      userId: 'me',
      id: messageId
    });
    
    // Extract email data
    const headers = email.data.payload.headers;
    const from = headers.find(h => h.name === 'From')?.value || '';
    const subject = headers.find(h => h.name === 'Subject')?.value || '';
    const body = extractBody(email.data.payload);
    
    console.log(`Processing email from: ${from}, Subject: ${subject.substring(0, 50)}...`);
    
    // Classify email using AI
    const classification = await classifyEmail(from, subject, body);
    console.log(`Classified as: ${classification.category}`);
    
    // Apply label based on classification
    await applyLabel(gmail, messageId, classification.category);
    
    // If it's a lead, create a draft
    if (classification.category === 'lead') {
      await createDraftReply(gmail, email.data, classification);
    }
    
  } catch (error) {
    console.error(`Error processing email ${messageId}:`, error.message);
  }
}

// Extract body from email payload
function extractBody(payload) {
  let body = '';
  
  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' && part.body.data) {
        body += Buffer.from(part.body.data, 'base64').toString();
      }
    }
  } else if (payload.body?.data) {
    body = Buffer.from(payload.body.data, 'base64').toString();
  }
  
  return body.substring(0, 1000); // Limit for processing
}

// AI Classification
async function classifyEmail(from, subject, body) {
  const prompt = `
Classify this email for Growth AI (AI automation company).

From: ${from}
Subject: ${subject}
Body: ${body.substring(0, 500)}

Categories:
- lead: Business inquiry about Growth AI services
- internal: From team (@growth-ai.io)
- subscription: Newsletter/marketing
- outreach: Cold pitch TO us
- noise: Spam

Respond with JSON: {"category": "...", "urgency": 0-2, "reason": "..."}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' }
    });
    
    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    console.error('Classification error:', error);
    return { category: 'lead', urgency: 1, reason: 'Classification failed - defaulted to lead' };
  }
}

// Apply Gmail label
async function applyLabel(gmail, messageId, category) {
  const labelName = `Auto/${category.charAt(0).toUpperCase() + category.slice(1)}`;
  
  try {
    // Get or create label
    const labels = await gmail.users.labels.list({ userId: 'me' });
    let label = labels.data.labels.find(l => l.name === labelName);
    
    if (!label) {
      label = await gmail.users.labels.create({
        userId: 'me',
        requestBody: { name: labelName }
      });
    }
    
    // Apply label to message
    await gmail.users.messages.modify({
      userId: 'me',
      id: messageId,
      requestBody: {
        addLabelIds: [label.id]
      }
    });
    
    console.log(`✅ Applied label: ${labelName}`);
  } catch (error) {
    console.error('Label error:', error.message);
  }
}

// Create draft reply for leads
async function createDraftReply(gmail, emailData, classification) {
  try {
    const headers = emailData.payload.headers;
    const from = headers.find(h => h.name === 'From')?.value || '';
    const subject = headers.find(h => h.name === 'Subject')?.value || '';
    const messageId = headers.find(h => h.name === 'Message-ID')?.value || '';
    
    const replyText = `Hi there,

Thanks for reaching out about Growth AI's services. I'd be happy to discuss how our AI automation can help your business.

Could we schedule a quick 15-minute call to understand your needs better? Here are a few times that work:
- Tomorrow at 2 PM EST
- Thursday at 10 AM EST
- Friday at 3 PM EST

Or feel free to book directly: https://cal.com/blake-stephens-hdk0ox/15min

Best regards,
Blake Stephens
Growth AI`;

    // Create draft
    const draft = {
      message: {
        raw: createEmailMessage(from, subject, replyText, messageId)
      }
    };
    
    await gmail.users.drafts.create({
      userId: 'me',
      requestBody: draft
    });
    
    console.log('✅ Draft created for lead');
  } catch (error) {
    console.error('Draft creation error:', error.message);
  }
}

// Helper to create email message
function createEmailMessage(to, subject, body, inReplyTo) {
  const message = [
    `To: ${to}`,
    `Subject: Re: ${subject}`,
    inReplyTo ? `In-Reply-To: ${inReplyTo}` : '',
    inReplyTo ? `References: ${inReplyTo}` : '',
    '',
    body
  ].filter(line => line !== '').join('\r\n');
  
  return Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_');
}

module.exports = { processEmails };
