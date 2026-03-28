const { SecretsManagerClient, GetSecretValueCommand } = require("@aws-sdk/client-secrets-manager");

const REGION = process.env.AWS_REGION || "eu-central-1";
const SECRET_NAME = "shader";

/**
 * Fetches secrets from AWS Secrets Manager and injects them into process.env.
 * This allows local development without a .env file.
 */
async function loadSecrets() {
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
}

module.exports = { loadSecrets };
