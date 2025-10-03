const express = require("express");
const app = express();

app.use(express.json());

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

app.get("/api/claude/test", (_, res) => res.send("claude test ok"));
app.post("/api/claude/generate", (req, res) => res.json({ prompt: req.body.prompt ?? null }));

app.listen(3000, () => console.log("Minimal server running on port 3000")); 