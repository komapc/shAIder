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
To run the development server:
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### Testing
To run the unit tests:
```bash
npm run test
```

## Roadmap
- [x] Initial UI and 3D Scene
- [x] Multiline Prompt & Shader Editors
- [x] Unit Testing & Pre-commit Hooks
- [ ] AWS Bedrock Integration (In Progress)
- [ ] "Refine" Prompt Logic
- [ ] Local Save/Project Export
- [ ] Shadow Support & PBR Material Refinement
