'use strict';

const { BedrockRuntimeClient, InvokeModelCommand } = require("@aws-sdk/client-bedrock-runtime");
const { buildPrompts, callOpenRouter, extractShaderJson, validateRequest, DEFAULT_BEDROCK_MODEL } = require("./shader-core");

const CORS_HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

exports.handler = async (event) => {
  const region = process.env.AWS_REGION || "eu-central-1";
  const client = new BedrockRuntimeClient({ region });

  try {
    let body;
    try {
      body = JSON.parse(event.body || "{}");
    } catch {
      return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: "Invalid JSON" }) };
    }

    const { error, value } = validateRequest(body);
    if (error) {
      return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error }) };
    }

    // The model is fixed server-side; clients cannot pick a (more expensive) one.
    const modelId = process.env.BEDROCK_MODEL_ID || DEFAULT_BEDROCK_MODEL;
    const { systemPrompt, userMessage } = buildPrompts(value);

    let rawContent = "";

    try {
      console.log("[API] Attempting Bedrock...");
      const payload = {
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 4000,
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }],
      };

      const command = new InvokeModelCommand({
        contentType: "application/json",
        accept: "application/json",
        modelId,
        body: JSON.stringify(payload),
      });

      const response = await client.send(command);
      const result = JSON.parse(new TextDecoder().decode(response.body));

      if (result.content && Array.isArray(result.content)) {
        rawContent = result.content[0].text;
      } else if (result.completion) {
        rawContent = result.completion;
      }
    } catch (bedrockError) {
      console.warn("[API] Bedrock failed, trying fallback:", bedrockError.message);
      rawContent = await callOpenRouter(systemPrompt, userMessage);
    }

    const shaderData = extractShaderJson(rawContent);

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify(shaderData),
    };
  } catch (error) {
    console.error("[API] CRITICAL ERROR:", error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        error: "Internal Server Error",
        message: error.message,
      }),
    };
  }
};
