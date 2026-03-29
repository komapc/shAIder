import { defineBackend, defineFunction, secret } from '@aws-amplify/backend';
import { data } from './data/resource';

/**
 * 1. DEFINE FUNCTIONS
 * Defining them in the same file to resolve persistent "module does not provide an export" errors in cloud build.
 */
export const generateShader = defineFunction({
  name: 'generate-shader',
  entry: './functions/generate-shader/handler.ts',
  environment: {
    OPENROUTER_API_KEY: secret('OPENROUTER_API_KEY')
  },
  timeoutSeconds: 60
});

/**
 * 2. DEFINE BACKEND
 */
const backend = defineBackend({
  data,
  generateShader,
});

/**
 * 3. GRANT PERMISSIONS
 */
const bedrockPolicyStatement = {
  Effect: 'Allow',
  Action: ['bedrock:InvokeModel'],
  Resource: ['*'],
};

backend.generateShader.resources.lambda.addToRolePolicy(bedrockPolicyStatement);
