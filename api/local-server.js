const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { handler } = require("./generate-shader");
const { loadSecrets } = require("./secrets");

const app = express();
const port = 3001;

app.use(cors());
app.use(bodyParser.json());

// Proxy route that mimics the Lambda API Gateway behavior
app.post("/api/generate-shader", async (req, res) => {
  console.log("Local API received request:", req.body.prompt);
  
  // Create a mock Lambda 'event' object
  const event = {
    body: JSON.stringify(req.body)
  };

  try {
    const result = await handler(event);
    res.status(result.statusCode).set(result.headers).send(result.body);
  } catch (error) {
    console.error("Local API Error:", error);
    res.status(500).json({ error: "Local Server Error", message: error.message });
  }
});

(async () => {
  // Load secrets from AWS Secrets Manager before starting
  await loadSecrets();

  app.listen(port, () => {
    console.log(`Local shAIder API server running at http://localhost:${port}`);
  });
})();
