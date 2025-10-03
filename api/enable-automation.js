import { supabase } from '../src/lib/supabase-backend.js';

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
    const { threadId, enabled } = req.body;

    if (!threadId) {
      return res.status(400).json({ error: 'threadId is required' });
    }

    // Update automation thread enabled status
    const { error } = await supabase
      .from('automation_threads')
      .update({ enabled: enabled !== false })
      .eq('id', threadId);

    if (error) {
      console.error('Error updating automation thread:', error);
      return res.status(500).json({ error: 'Failed to update automation thread' });
    }

    res.status(200).json({ 
      success: true, 
      message: `Automation ${enabled !== false ? 'enabled' : 'disabled'} successfully` 
    });

  } catch (error) {
    console.error('Error in enable-automation API:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}