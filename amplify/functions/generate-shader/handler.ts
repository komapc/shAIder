import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { buildPrompts, callOpenRouter, extractShaderJson, validateRequest, extractText, DEFAULT_BEDROCK_MODEL } from "../../../api/shader-core.js";

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

    // The model occasionally returns JSON without both shaders; retry once before giving up.
    for (let attempt = 1; ; attempt++) {
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
        rawContent = extractText(result);
        if (!rawContent) console.warn("[API] Empty model text, stop_reason:", result.stop_reason);
      } catch (err) {
        console.warn("[API] Bedrock failed, trying fallback:", err instanceof Error ? err.message : err);
        rawContent = await callOpenRouter(systemPrompt, userMessage);
      }

      const shaderData = extractShaderJson(rawContent);
      if (typeof shaderData.vertexShader === "string" && typeof shaderData.fragmentShader === "string") {
        return JSON.stringify(shaderData);
      }
      console.warn(`[API] Attempt ${attempt}: response without both shaders, keys:`, Object.keys(shaderData).join(","));
      if (attempt >= 2) throw new Error("The AI response did not contain both shaders. Please try again.");
    }
  } catch (error: unknown) {
    throw new Error(error instanceof Error ? error.message : String(error));
  }
};
