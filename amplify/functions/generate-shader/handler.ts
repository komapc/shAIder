import { Schema } from '../../data/resource';
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

/**
 * Fallback to OpenRouter using a stable model
 */
async function callOpenRouter(systemPrompt: string, userMessage: string) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey || apiKey === "YOUR_KEY_HERE") {
    throw new Error("OpenRouter API Key is missing.");
  }

  const models = [
    "anthropic/claude-3-haiku",
    "google/gemma-2-9b-it:free",
    "meta-llama/llama-3-8b-instruct:free"
  ];

  let lastError: any = null;

  for (const model of models) {
    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage }
          ]
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || response.statusText);
      return data.choices[0].message.content;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

export const handler: any = async (event: any) => {
  const region = process.env.AWS_REGION || "eu-central-1";
  const client = new BedrockRuntimeClient({ region });
  
  try {
    const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    const { 
      prompt, 
      sceneDescription = "",
      isRefining = false, 
      currentVertexShader = "", 
      currentFragmentShader = "", 
      currentUniforms = [],
      currentSceneObjects = [],
      lastError = ""
    } = body;

    const libraryContext = `
      LIBRARY MATERIALS: 'Iridescent Metal', 'Molten Lava', 'Frosted Glass', 'Digital Hologram', 'Voronoi Cells'.
      AVAILABLE GEOMETRIES: 'sphere', 'box', 'plane', 'torus', 'knot', 'cylinder', 'pyramid', 'floor', 'table', 'chair'.
    `;

    let systemPrompt = `
      You are an expert Three.js and GLSL developer. Generate GLSL and 3D scene JSON.
      ${libraryContext}
      OUTPUT FORMAT: JSON with { vertexShader, fragmentShader, uniforms, sceneObjects }.
      RULES: No #version, use precision highp float, declare uniforms in BOTH shaders if used.
    `;

    if (isRefining || lastError) {
      systemPrompt += `\nCONTEXT: Shaders, Uniforms, SceneObjects provided. Fix: ${lastError}`;
    }

    const userMessage = `SHADER: ${prompt}\nSCENE: ${sceneDescription}`;

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

    const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("AI did not return valid JSON");
    
    // Aggressive clean
    let jsonString = jsonMatch[0].trim();
    jsonString = jsonString.replace(/:\s*`([\s\S]*?)`/g, (m, c) => `": "${c.replace(/\n/g, '\\n').replace(/"/g, '\\"')}"`);
    const shaderData = JSON.parse(jsonString.replace(/[\u0000-\u001F\u007F-\u009F]/g, ""));

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify(shaderData),
    };
  } catch (error: any) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "Internal Server Error", message: error.message }),
    };
  }
};
