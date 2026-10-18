import { type ClientSchema, a, defineData, defineFunction } from '@aws-amplify/backend';

// Define the function in the same file to avoid persistent module resolution issues in cloud build
export const generateShader = defineFunction({
  name: 'generate-shader',
  entry: '../functions/generate-shader/handler.ts',
  timeoutSeconds: 60,
  runtime: 22, // Node.js 22
});

const schema = a.schema({
  // AppSync requires a Query root type; a schema with only a mutation fails to deploy.
  ping: a
    .query()
    .returns(a.string())
    .handler(a.handler.function(generateShader))
    .authorization((allow) => [allow.publicApiKey()]),
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
      activeEditorTab: a.string(),
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
    apiKeyAuthorizationMode: { expiresInDays: 365 },
  },
});
