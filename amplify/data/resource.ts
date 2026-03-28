import { type ClientSchema, a, defineData } from '@aws-amplify/backend';
import { generateShader } from '../functions/generate-shader/resource';

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
    .returns(a.string()) // Returns JSON string of shader data
    .handler(a.handler.function(generateShader))
    .authorization((allow) => [a.allow.public()]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'apiKey',
    apiKeyConfig: { expiresInDays: 30 },
  },
});
