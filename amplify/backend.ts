import { defineBackend } from '@aws-amplify/backend';
import { data } from './data/resource';
import { generateShader } from './functions/generate-shader/resource';

const backend = defineBackend({
  data,
  generateShader,
});

// Grant the function permission to call Bedrock
const bedrockPolicyStatement = {
  Effect: 'Allow',
  Action: ['bedrock:InvokeModel'],
  Resource: ['*'], // Ideally scope this to Haiku ARN
};

backend.generateShader.resources.lambda.addToRolePolicy(bedrockPolicyStatement);
