const { BedrockRuntimeClient, InvokeModelCommand } = require("@aws-sdk/client-bedrock-runtime");

/**
 * AWS Lambda function to generate shader code from a text prompt.
 * 
 * Securely calls AWS Bedrock and returns a JSON object with:
 * - vertexShader, fragmentShader, uniforms, and sceneConfig.
 */
exports.handler = async (event) => {
  const client = new BedrockRuntimeClient({ region: process.env.AWS_REGION || "us-east-1" });
  
  try {
    const { prompt, modelId = "anthropic.claude-3-haiku-20240307-v1:0" } = JSON.parse(event.body || "{}");
    
    if (!prompt) {
      return { statusCode: 400, body: JSON.stringify({ error: "No prompt provided" }) };
    }

    // Comprehensive System Prompt to ensure strict JSON output
    const systemPrompt = `
      You are an expert Three.js and GLSL developer.
      Translate the following description into a valid JSON object.
      The output must be a strict JSON object with EXACTLY these four keys:
      1. "vertexShader": A GLSL vertex shader string.
      2. "fragmentShader": A GLSL fragment shader string.
      3. "uniforms": An array of objects: { name, type, value, min, max }.
      4. "sceneConfig": An object: { objectType, position, scale, rotation }.

      The fragment shader must include standard uniforms like "time" and "resolution".
      Ensure the shaders are valid GLSL (WebGl 1.0 or 2.0).
    `;

    const payload = {
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: 4000,
      system: systemPrompt,
      messages: [{ role: "user", content: prompt }],
    };

    const command = new InvokeModelCommand({
      contentType: "application/json",
      accept: "application/json",
      modelId: modelId,
      body: JSON.stringify(payload),
    });

    const response = await client.send(command);
    const result = JSON.parse(new TextDecoder().decode(response.body));
    
    // Extract the JSON content from Claude's response (handling potential text wrapping)
    const rawContent = result.content[0].text;
    const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
    const shaderData = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(rawContent);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
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
