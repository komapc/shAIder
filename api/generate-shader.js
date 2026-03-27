const { BedrockRuntimeClient, InvokeModelCommand } = require("@aws-sdk/client-bedrock-runtime");

/**
 * AWS Lambda function to generate or refine shader code from a text prompt.
 * 
 * Supports:
 * - isRefining: When true, uses current shaders and parameters as context.
 * - lastError: When provided, tells the AI to fix a specific compilation error.
 */
exports.handler = async (event) => {
  const client = new BedrockRuntimeClient({ region: process.env.AWS_REGION || "us-east-1" });
  
  try {
    const body = JSON.parse(event.body || "{}");
    const { 
      prompt, 
      isRefining = false, 
      currentVertexShader = "", 
      currentFragmentShader = "", 
      currentUniforms = [],
      lastError = "",
      modelId = "anthropic.claude-3-haiku-20240307-v1:0" 
    } = body;
    
    if (!prompt && !lastError) {
      return { statusCode: 400, body: JSON.stringify({ error: "No prompt or error provided" }) };
    }

    // Comprehensive System Prompt to ensure strict JSON output
    let systemPrompt = `
      You are an expert Three.js and GLSL developer.
      Translate the following description into a valid JSON object.
      The output must be a strict JSON object with EXACTLY these four keys:
      1. "vertexShader": A GLSL vertex shader string.
      2. "fragmentShader": A GLSL fragment shader string.
      3. "uniforms": An array of objects: { name, type, value, min, max }.
      4. "sceneConfig": An object: { objectType, position, scale, rotation }.

      Guidelines:
      - The fragment shader must include standard uniforms like "time" (float) and "resolution" (vec2).
      - Ensure the shaders are valid GLSL (WebGL 1.0 or 2.0).
      - Uniform types must be one of: 'float', 'vec3', 'color'.
      - Colors must be hex strings or vec3.
    `;

    // Add Context for Refinement or Bug Fixing
    if (isRefining || lastError) {
      systemPrompt += `
      CONTEXT:
      - Current Vertex Shader: \`${currentVertexShader}\`
      - Current Fragment Shader: \`${currentFragmentShader}\`
      - Current Uniforms: ${JSON.stringify(currentUniforms)}
      ${lastError ? `- LAST ERROR: ${lastError}` : ""}

      INSTRUCTIONS:
      ${lastError ? "- There was a compilation error. Please analyze the code and the error, then fix it." : "- Modify the existing code based on the new user prompt."}
      - Keep the existing functionality where appropriate.
      - Return the FULL updated JSON object.
      `;
    }

    const payload = {
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: 4000,
      system: systemPrompt,
      messages: [{ role: "user", content: prompt || "Fix the compilation error provided in the context." }],
    };

    const command = new InvokeModelCommand({
      contentType: "application/json",
      accept: "application/json",
      modelId: modelId,
      body: JSON.stringify(payload),
    });

    const response = await client.send(command);
    const result = JSON.parse(new TextDecoder().decode(response.body));
    
    const rawContent = result.content[0].text;
    const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
    const shaderData = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(rawContent);

    return {
      statusCode: 200,
      headers: { 
        "Content-Type": "application/json", 
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      },
      body: JSON.stringify(shaderData),
    };

  } catch (error) {
    console.error("Error generating shader:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal Server Error", message: error.message }),
    };
  }
};
