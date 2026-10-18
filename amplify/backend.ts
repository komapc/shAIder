import { defineBackend } from '@aws-amplify/backend';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { data, generateShader } from './data/resource';

const backend = defineBackend({
  data,
  generateShader,
});

// Grant the function permission to call only the configured Bedrock model
backend.generateShader.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    actions: ['bedrock:InvokeModel'],
    resources: ['arn:aws:bedrock:*::foundation-model/anthropic.claude-3-haiku-20240307-v1:0'],
  })
);
