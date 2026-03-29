import { defineBackend, defineFunction, secret } from '@aws-amplify/backend';
import { data } from './data/resource';

// Define the function directly in backend.ts to avoid resolution issues
export const generateShader = defineFunction({
  name: 'generate-shader',
  entry: './functions/generate-shader/handler.ts',
  environment: {
    OPENROUTER_API_KEY: secret('OPENROUTER_API_KEY')
  },
  timeoutSeconds: 60
});

const backend = defineBackend({
  data,
  generateShader,
});

// Grant the function permission to call Bedrock
const bedrockPolicyStatement = {
  Effect: 'Allow',
  Action: ['bedrock:InvokeModel'],
  Resource: ['*'],
};

backend.generateShader.resources.lambda.addToRolePolicy(bedrockPolicyStatement);
