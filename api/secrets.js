const { SecretsManagerClient, GetSecretValueCommand } = require("@aws-sdk/client-secrets-manager");

const REGION = process.env.AWS_REGION || "eu-central-1";
const SECRET_NAME = "shader";

/**
 * Loads a local .env file if it exists at the project root.
 */
function loadDotEnv() {
  const fs = require("fs");
  const path = require("path");
  const envPath = path.resolve(__dirname, "../.env");
  
  if (fs.existsSync(envPath)) {
    console.log(`[Secrets] Loading local .env file from ${envPath}...`);
    const content = fs.readFileSync(envPath, "utf-8");
    content.split(/\r?\n/).forEach((line) => {
      // Ignore comments and empty lines
      if (line.trim().startsWith("#") || !line.trim()) return;
      
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || "";
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1);
        } else if (value.startsWith("'") && value.endsWith("'")) {
          value = value.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = value.trim();
          console.log(`[Secrets] Injected from .env: ${key}`);
        }
      }
    });
  }
}

/**
 * Fetches secrets from AWS Secrets Manager and injects them into process.env.
 * This allows local development without a .env file.
 */
async function loadSecrets() {
  // Load local .env overrides first
  loadDotEnv();

  console.log(`[Secrets] Fetching secret "${SECRET_NAME}" from ${REGION}...`);
  
  const client = new SecretsManagerClient({ region: REGION });

  try {
    const response = await client.send(
      new GetSecretValueCommand({
        SecretId: SECRET_NAME,
      })
    );

    if (response.SecretString) {
      const secrets = JSON.parse(response.SecretString);
      
      Object.entries(secrets).forEach(([key, value]) => {
        if (!process.env[key]) {
          process.env[key] = value;
          console.log(`[Secrets] Injected: ${key}`);
        }
      });
      
      console.log(`[Secrets] Successfully loaded secrets from AWS.`);
    }
  } catch (error) {
    if (error.name === 'ResourceNotFoundException') {
      console.warn(`[Secrets] Secret "${SECRET_NAME}" not found. Proceeding with existing environment.`);
    } else if (error.name === 'AccessDeniedException') {
      console.warn(`[Secrets] Access denied to secret "${SECRET_NAME}". Ensure you have valid AWS credentials.`);
    } else {
      console.error(`[Secrets] Error fetching secrets:`, error.message);
    }
  }

  // Also fetch the valid Gemini API key if available
  try {
    const response = await client.send(
      new GetSecretValueCommand({
        SecretId: "openclaw/gemini-api-key",
      })
    );
    if (response.SecretString) {
      let key = "";
      try {
        const parsed = JSON.parse(response.SecretString);
        key = parsed.api_key || parsed.GEMINI_API_KEY || parsed.key || Object.values(parsed)[0];
      } catch {
        key = response.SecretString;
      }
      if (key && (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.length < 20)) {
        process.env.GEMINI_API_KEY = key.trim();
        console.log(`[Secrets] Loaded valid GEMINI_API_KEY from openclaw/gemini-api-key`);
      }
    }
  } catch (err) {
    console.warn("[Secrets] Could not load openclaw/gemini-api-key:", err.message);
  }
}

module.exports = { loadSecrets };
