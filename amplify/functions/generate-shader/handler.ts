import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { buildPrompts, callOpenRouter, extractShaderJson, validateRequest, DEFAULT_BEDROCK_MODEL } from "../../../api/shader-core.js";

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
    if ((event.fieldName ?? event.info?.fieldName) === "ping") return "ok";

    // AppSync passes GraphQL arguments in event.arguments; event.body is kept for direct invocation.
    const body: ShaderRequest =
      event.arguments ?? (typeof event.body === "string" ? JSON.parse(event.body) : event.body);
    const { error, value } = validateRequest(body as Record<string, unknown>);
    if (error || !value) throw new Error(error ?? "Invalid request");

    const { systemPrompt, userMessage } = buildPrompts(value);

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
        modelId: process.env.BEDROCK_MODEL_ID || DEFAULT_BEDROCK_MODEL,
        body: JSON.stringify(payload),
      });

      const response = await client.send(command);
      const result = JSON.parse(new TextDecoder().decode(response.body));
      rawContent = result.content?.[0]?.text || result.completion;
    } catch (err) {
      console.warn("[API] Bedrock failed, trying fallback:", err instanceof Error ? err.message : err);
      rawContent = await callOpenRouter(systemPrompt, userMessage);
    }

    const shaderData = extractShaderJson(rawContent);
    return JSON.stringify(shaderData);
  } catch (error: unknown) {
    throw new Error(error instanceof Error ? error.message : String(error));
  }
};
