import { defineFunction, secret } from '@aws-amplify/backend';

export const generateShader = defineFunction({
  name: 'generate-shader',
  entry: './handler.ts',
  environment: {
    OPENROUTER_API_KEY: secret('OPENROUTER_API_KEY')
  },
  timeoutSeconds: 60
});
