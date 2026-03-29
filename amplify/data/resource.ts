import { type ClientSchema, a, defineData, defineFunction, secret } from '@aws-amplify/backend';

// Define the function in the same file to avoid persistent module resolution issues in cloud build
export const generateShader = defineFunction({
  name: 'generate-shader',
  entry: '../functions/generate-shader/handler.ts',
  environment: {
    OPENROUTER_API_KEY: secret('OPENROUTER_API_KEY')
  },
  timeoutSeconds: 60,
  runtime: 20, // Node.js 20
});

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

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'apiKey',
    apiKeyConfig: { expiresInDays: 30 },
  },
});
