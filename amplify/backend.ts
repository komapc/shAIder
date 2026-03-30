import { defineBackend } from '@aws-amplify/backend';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { data, generateShader } from './data/resource';

const backend = defineBackend({
  data,
  generateShader,
});

// Grant the function permission to call Bedrock
backend.generateShader.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    actions: ['bedrock:InvokeModel'],
    resources: ['*'],
  })
);
