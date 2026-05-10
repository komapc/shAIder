import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { buildPrompts, callOpenRouter, extractShaderJson } from "../../../api/shader-core.js";

interface ShaderRequest {
  prompt?: string;
  sceneDescription?: string;
  isRefining?: boolean;
  currentVertexShader?: string;
  currentFragmentShader?: string;
  currentUniforms?: unknown[];
  currentSceneObjects?: unknown[];
  lastError?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const handler = async (event: any) => {
  const region = process.env.AWS_REGION || "eu-central-1";
  const client = new BedrockRuntimeClient({ region });

  try {
    const body: ShaderRequest = typeof event.body === "string" ? JSON.parse(event.body) : event.body;
    const {
      prompt = "",
      sceneDescription = "",
      isRefining = false,
      currentVertexShader = "",
      currentFragmentShader = "",
      currentUniforms = [],
      currentSceneObjects = [],
      lastError = "",
    } = body;

    const { systemPrompt, userMessage } = buildPrompts({
      prompt,
      sceneDescription,
      isRefining,
      currentVertexShader,
      currentFragmentShader,
      currentUniforms,
      currentSceneObjects,
      lastError,
    });

    let rawContent = "";
    try {
      const payload = {
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 4000,
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }],
      };

      const command = new InvokeModelCommand({
        contentType: "application/json",
        accept: "application/json",
        modelId: "anthropic.claude-3-haiku-20240307-v1:0",
        body: JSON.stringify(payload),
      });

      const response = await client.send(command);
      const result = JSON.parse(new TextDecoder().decode(response.body));
      rawContent = result.content?.[0]?.text || result.completion;
    } catch (err) {
      rawContent = await callOpenRouter(systemPrompt, userMessage);
    }

    const shaderData = extractShaderJson(rawContent);
    return JSON.stringify(shaderData);
  } catch (error: unknown) {
    throw new Error(error instanceof Error ? error.message : String(error));
  }
};
