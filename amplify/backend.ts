import { defineBackend, defineFunction, secret, a, defineData } from '@aws-amplify/backend';

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
 * 2. DEFINE DATA SCHEMA
 */
const schema = a.schema({
  generateShader: a
    .mutation()
    .arguments({
      prompt: a.string().required(),
      sceneDescription: a.string(),
      isRefining: a.boolean(),
      currentVertexShader: a.string(),
      currentFragmentShader: a.string(),
      currentUniforms: a.json(),
      currentSceneObjects: a.json(),
      lastError: a.string(),
    })
    .returns(a.string())
    .handler(a.handler.function(generateShader))
    .authorization((allow) => [allow.publicApiKey()]),
});

/**
 * 3. DEFINE BACKEND
 */
const backend = defineBackend({
  data: defineData({
    schema,
    authorizationModes: {
      defaultAuthorizationMode: 'apiKey',
      apiKeyConfig: { expiresInDays: 30 },
    },
  }),
  generateShader,
});

/**
 * 4. GRANT PERMISSIONS
 */
const bedrockPolicyStatement = {
  Effect: 'Allow',
  Action: ['bedrock:InvokeModel'],
  Resource: ['*'],
};

backend.generateShader.resources.lambda.addToRolePolicy(bedrockPolicyStatement);
