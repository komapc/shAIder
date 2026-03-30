import { defineBackend } from '@aws-amplify/backend';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { DefaultStackSynthesizer, Stack } from 'aws-cdk-lib';
import { data, generateShader } from './data/resource';

const backend = defineBackend({
  data,
  generateShader,
});

// Force the use of our custom bootstrapped qualifier 'shaid' to bypass broken account defaults
const synthesizer = new DefaultStackSynthesizer({
  qualifier: 'shaid',
});

// Apply synthesizer to the main stacks
const dataStack = Stack.of(backend.data.resources.graphqlApi);
const functionStack = Stack.of(backend.generateShader.resources.lambda);

// Override synthesizer at the stack level
(dataStack as any).synthesizer = synthesizer;
(functionStack as any).synthesizer = synthesizer;

// Grant the function permission to call Bedrock
backend.generateShader.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    actions: ['bedrock:InvokeModel'],
    resources: ['*'],
  })
);
