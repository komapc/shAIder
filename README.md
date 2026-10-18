# shAIder

Text-to-shader generator: describe a material and a scene in plain words, an AI writes the GLSL shaders, and they render live in a 3D viewport.

**Live:** https://shader.lipu.dev/

## Features
- **Text-to-shader and text-to-scene:** separate prompts for the material and the scene layout; *Generate* starts fresh, *Refine* edits the current result.
- **Live editors:** tweak the generated vertex/fragment shaders and the scene JSON by hand.
- **Dynamic parameters:** sliders are inferred from the shader's uniforms.
- **3D viewport:** rotatable scene with Sphere, Box, Plane and Torus objects; texture library.
- **Auto-fix:** compilation errors are sent back to the model and retried (up to 5 times).
- **Export:** download the result as a standalone HTML file.

## Architecture
```
Browser (React + Three.js)
   │  GraphQL mutation `generateShader` (AppSync, public API key)
   ▼
AWS Lambda (amplify/functions/generate-shader)
   │  InvokeModel
   ▼
Amazon Bedrock — Claude Haiku 5.5 (EU inference profile eu.anthropic.claude-haiku-5-5)
```
- **Frontend:** React 19, Three.js, @react-three/fiber, Zustand, CodeMirror, Tailwind CSS (Vite).
- **Backend:** AWS Amplify Gen2 (`amplify/`): AppSync + one Lambda. Shared request validation and prompt building live in `api/shader-core.js`.
- **Hosting:** AWS Amplify Hosting, auto-deployed from `main`; custom domain `shader.lipu.dev` (DNS in Cloudflare, DNS-only).

### Security notes
- The AppSync API uses a **public API key**, which is embedded in the frontend bundle by design (anyone can read it). It only allows calling `generateShader` and `ping`; it grants no access to other AWS resources.
- The key expires after 365 days; every deployment renews the expiry.
- The Lambda enforces input limits (prompt 2000, scene description 4000, shader 20 000 characters), ignores any client-supplied model ID, and may call only the one Bedrock model.
- There is no per-user rate limiting yet; cost is bounded only by AWS budgets.

## Local development
Requirements: Node.js 24 (what CI uses; 20+ works).

```bash
npm install
npm run dev              # frontend at http://localhost:5173
```
Without Amplify outputs the app falls back to a local API server:
```bash
node api/local-server.js # needs AWS credentials with Bedrock access, or OPENROUTER_API_KEY
```

| Command | What it does |
|---|---|
| `npm run build` | type-check and production build |
| `npm test` | unit tests (Vitest) |
| `npm run lint` | ESLint, zero warnings allowed |
| `npx playwright test` | end-to-end tests |

## Deployment
Pushing to `main` triggers an Amplify build (`amplify.yml`): backend via `ampx pipeline-deploy`, then the frontend. The Amplify app uses a service role (`amplify-shaider-service-role`) so the pipeline can read CDK bootstrap parameters.

Optional environment variables for the Lambda: `BEDROCK_MODEL_ID` (override the model), `OPENROUTER_API_KEY` (fallback provider, not configured in production).

## CI
GitHub Actions (`.github/workflows/ci.yml`) runs on every push to `main` and on pull requests: install, lint, unit tests, build, Playwright e2e. It does not deploy; Amplify does.

## Roadmap
- [x] UI and 3D scene
- [x] Bedrock integration, refine and auto-fix
- [x] Standalone HTML export
- [x] Deployment on Amplify with a custom domain
- [ ] Rate limiting for the public API
- [ ] Shadow support and PBR material refinement
