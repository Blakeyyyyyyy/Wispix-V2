export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Forward the request to your N8N Agent 2 webhook
    const webhookUrl = 'https://novusautomations.net/webhook/a13a060a-62be-4ae8-a1f3-6503d23032bb';
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body),
    });

    if (!response.ok) {
      throw new Error(`Agent 2 webhook responded with status: ${response.status}`);
    }

    const responseText = await response.text();
    
    res.status(200).send(responseText);
  } catch (error) {
    console.error('Agent 2 webhook error:', error);
    res.status(503).json({ 
      error: 'Agent 2 is currently unavailable. Please try again later.' 
    });
  }
}