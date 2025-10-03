const express = require('express');
const app = express();

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

app.post('/api/claude/generate', (req, res) => {
  console.log('Claude endpoint hit!');
  res.json({
    success: true,
    message: 'Claude endpoint is working!',
    data: { prompt: req.body.prompt }
  });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
}); 