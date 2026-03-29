import { defineBackend, defineFunction, secret } from '@aws-amplify/backend';
import { data } from './data/resource';

/**
 * 1. DEFINE FUNCTIONS FIRST
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
 * 2. ASSEMBLE BACKEND
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
