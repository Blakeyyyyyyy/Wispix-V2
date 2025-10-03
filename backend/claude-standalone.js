const express = require("express");
require('dotenv').config();

const app = express();
app.use(express.json());

// Health check
app.get("/health", (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: 'development'
    }
  });
});

// Test endpoint
app.get("/api/claude/test", (_, res) => res.send("claude test ok"));

// Enhanced Claude generate endpoint with real AI integration
app.post("/api/claude/generate", async (req, res) => {
  try {
    const { prompt } = req.body;
    
    if (!prompt) {
      return res.status(400).json({
        success: false,
        error: 'Prompt is required'
      });
    }

    // Check if Claude API key is available
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: 'Claude API key not configured'
      });
    }

    // Call Claude API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 4000,
        temperature: 0.7,
        messages: [
          {
            role: 'user',
            content: `You are an automation expert. Convert this natural language request into a structured automation configuration: "${prompt}"

Available Step Types:
- http_request: Make HTTP requests (GET, POST, PUT, DELETE)
- data_transform: Transform data using JavaScript functions
- email: Send emails via SMTP
- delay: Add delays/wait periods

Please respond with ONLY a valid JSON object containing the automation configuration. The JSON should have this structure:

{
  "automation": {
    "id": "unique-id",
    "name": "Descriptive Name",
    "description": "What this automation does",
    "trigger": {
      "type": "manual",
      "config": {}
    },
    "steps": [
      {
        "id": "step-1",
        "name": "Step Description",
        "type": "step_type",
        "config": {
          // step-specific configuration
        },
        "output_mapping": "optional_variable_name"
      }
    ],
    "variables": {
      // any variables the automation needs
    }
  },
  "explanation": "Brief explanation of what this automation does",
  "confidence": 0.95,
  "suggestedImprovements": ["suggestion1", "suggestion2"],
  "warnings": ["warning1", "warning2"]
}`
          }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Claude API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const content = data.content[0].text;
    
    // Parse the JSON response from Claude
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in Claude response');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    
    res.json({
      success: true,
      data: parsed,
      message: 'Automation generated successfully'
    });

  } catch (error) {
    console.error('Claude generation error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate automation',
      message: 'Please try again with a different prompt'
    });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 Claude API Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`🤖 Claude API: http://localhost:${PORT}/api/claude/generate`);
}); 