import { defineBackend } from '@aws-amplify/backend';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { DefaultStackSynthesizer } from 'aws-cdk-lib';
import { data, generateShader } from './data/resource';

const backend = defineBackend({
  data,
  generateShader,
});

// Idiomatic way to apply custom bootstrap qualifier to avoid AccessDenied on default account
const synthesizer = new DefaultStackSynthesizer({
  qualifier: 'shaid',
});

// Get the actual stacks and set the synthesizer before any synthesis-time operations happen
backend.data.resources.cfnResources.cfnGraphqlApi.stack.templateOptions.description = "shAIder Data Stack";
(backend.data.resources.cfnResources.cfnGraphqlApi.stack as any).synthesizer = synthesizer;

backend.generateShader.resources.lambda.stack.templateOptions.description = "shAIder Function Stack";
(backend.generateShader.resources.lambda.stack as any).synthesizer = synthesizer;

// Grant the function permission to call Bedrock
backend.generateShader.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    actions: ['bedrock:InvokeModel'],
    resources: ['*'],
  })
);
