import { defineBackend } from '@aws-amplify/backend';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Stack, RemovalPolicy } from 'aws-cdk-lib';
import { Table, AttributeType, BillingMode } from 'aws-cdk-lib/aws-dynamodb';
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

// Request counters for rate limiting (per-IP hourly, global daily); items expire via TTL
const rateLimitStack = backend.createStack('RateLimit');
const rateLimitTable = new Table(rateLimitStack, 'RateLimitTable', {
  partitionKey: { name: 'pk', type: AttributeType.STRING },
  billingMode: BillingMode.PAY_PER_REQUEST,
  timeToLiveAttribute: 'expiresAt',
  removalPolicy: RemovalPolicy.DESTROY,
});
rateLimitTable.grant(backend.generateShader.resources.lambda, 'dynamodb:UpdateItem');
backend.generateShader.addEnvironment('RATE_LIMIT_TABLE', rateLimitTable.tableName);
