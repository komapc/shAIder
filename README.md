# shAIder

shAIder is a text-to-shader generator that translates your descriptions into real-time 3D shaders using AWS Bedrock.

## Features
- **Text-to-Shader:** Describe a visual effect and see it come to life in 3D.
- **Real-time Editors:** Manually tweak the auto-generated Vertex and Fragment shaders.
- **Dynamic Parameters:** Automatically inferred sliders for custom uniforms.
- **3D Scene:** Interactive, rotatable viewport with dynamic geometry (Sphere, Box, Plane, Torus).
- **Dark Mode UI:** A polished, developer-friendly aesthetic.

## Tech Stack
- **Frontend:** React 19, Three.js, @react-three/fiber, Zustand, CodeMirror, Tailwind CSS.
- **Backend:** AWS Lambda, AWS Bedrock Runtime SDK.
- **Testing:** Vitest, React Testing Library.

## Getting Started

### Prerequisites
- Node.js 20+
- AWS Account with Bedrock access (for AI generation)

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/komapc/shAIder.git
   cd shAIder
   ```
2. Install dependencies:
   ```bash
   npm install
   ```

### Local Development
To run the project locally, you need to start both the frontend development server and the mock backend API server:

1. **Start the local mock API server**:
   ```bash
   node api/local-server.js
   ```
   *Note: This server runs at `http://localhost:3002` and resolves credentials via AWS Secrets Manager. If AWS credentials are not set up locally, it falls back to OpenRouter.*

2. **Start the frontend development server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:5173](http://localhost:5173) (or the fallback port shown in your terminal) in your browser.

### Testing and Code Quality

- **Run Unit Tests** (Vitest):
  ```bash
  npm run test
  ```

- **Run End-to-End Tests** (Playwright):
  ```bash
  npx playwright test
  ```

- **Run Code Linter** (ESLint):
  ```bash
  npm run lint
  ```

## Roadmap
- [x] Initial UI and 3D Scene
- [x] Multiline Prompt & Shader Editors
- [x] Unit Testing & Pre-commit Hooks
- [ ] AWS Bedrock Integration (In Progress)
- [ ] "Refine" Prompt Logic
- [ ] Local Save/Project Export
- [ ] Shadow Support & PBR Material Refinement
