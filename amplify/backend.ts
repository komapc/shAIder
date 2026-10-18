import { defineBackend } from '@aws-amplify/backend';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Stack } from 'aws-cdk-lib';
import { data, generateShader } from './data/resource';

const backend = defineBackend({
  data,
  generateShader,
});

// Grant the function permission to call only the configured Bedrock model
backend.generateShader.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    actions: ['bedrock:InvokeModel'],
    resources: [
      // EU inference profile plus the foundation models it routes to
      `arn:aws:bedrock:*:${Stack.of(backend.generateShader.resources.lambda).account}:inference-profile/eu.anthropic.claude-haiku-5-5`,
      'arn:aws:bedrock:*::foundation-model/anthropic.claude-haiku-5-5',
    ],
  })
);
