import React from 'react';
import { Canvas } from '@react-three/fiber';
import { useShaderStore } from './store/useShaderStore';
import Scene from './Scene';
import ShaderEditor from './components/ShaderEditor';
import ParametersPanel from './components/ParametersPanel';
import { Play, RotateCcw } from 'lucide-react';

const App: React.FC = () => {
  const { 
    isLoading, 
    logs, 
    vertexShader, 
    fragmentShader, 
    prompt,
    setPrompt,
    setLoading,
    setShaders,
    addLog
  } = useShaderStore();

  const handleGenerate = async (isRefining = false) => {
    if (!prompt) return;
    
    setLoading(true);
    addLog(isRefining ? "Refining shader..." : "Generating new shader...");

    try {
      // Use the local API endpoint (assumed to be running or proxied)
      const response = await fetch('/api/generate-shader', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, isRefining })
      });

      if (!response.ok) throw new Error('API request failed');

      const data = await response.json();
      setShaders(data.vertexShader, data.fragmentShader, data.uniforms, data.sceneConfig);
      addLog("Compilation successful.");
    } catch (error: any) {
      console.error(error);
      addLog(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen w-full bg-[#0a0a0a] text-white overflow-hidden selection:bg-blue-500/30">
      {/* Top Header/Prompt Area */}
      <div className="p-4 border-b border-gray-800 bg-[#111] shadow-xl z-10">
        <div className="max-w-7xl mx-auto flex gap-4 items-start">
          <div className="flex-1 relative group">
            <textarea 
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe your shader... (e.g., 'A metallic pulsing sphere')"
              rows={2}
              className="w-full bg-[#1a1a1a] border border-gray-700 rounded-lg px-4 py-2.5 pl-5 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all text-sm placeholder:text-gray-600 resize-none overflow-y-auto"
            />
          </div>
          <div className="flex flex-col gap-2">
            <button 
              onClick={() => handleGenerate(false)}
              disabled={isLoading}
              className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg font-semibold text-sm transition-all active:scale-95 shadow-lg shadow-blue-600/20 w-full"
            >
              <Play size={16} fill="currentColor" />
              Generate
            </button>
            <div className="flex gap-2">
               <button 
                 onClick={() => handleGenerate(true)}
                 disabled={isLoading}
                 className="flex-1 flex items-center justify-center gap-1.5 p-2 bg-[#222] hover:bg-[#2a2a2a] disabled:opacity-50 rounded-lg text-xs font-medium text-gray-300 transition-colors"
               >
                  Refine
               </button>
               <button className="flex-1 flex items-center justify-center gap-1.5 p-2 text-gray-500 hover:text-white transition-colors text-xs font-medium">
                  <RotateCcw size={14} />
                  Reset
               </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side: Editors & Params */}
        <div className="w-1/3 flex flex-col border-r border-gray-800 bg-[#111] shadow-2xl z-20">
          <div className="h-1/3">
             <ParametersPanel />
          </div>
          <div className="flex-1 flex flex-col min-h-0 border-t border-gray-800">
            <ShaderEditor 
              label="Vertex Shader" 
              value={vertexShader} 
              onChange={() => {}} // Read-only for now in this dummy
            />
            <ShaderEditor 
              label="Fragment Shader" 
              value={fragmentShader} 
              onChange={() => {}} 
            />
          </div>
        </div>

        {/* Right Side: 3D Scene */}
        <div className="flex-1 relative bg-[#050505]">
          <Canvas shadows dpr={[1, 2]}>
            <Scene />
          </Canvas>
          
          {/* Status Indicators */}
          <div className="absolute top-4 right-4 flex flex-col items-end gap-2">
            {isLoading && (
              <div className="flex items-center gap-2 bg-blue-600/20 text-blue-400 border border-blue-600/40 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider animate-pulse backdrop-blur-md">
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>
                Compiling...
              </div>
            )}
            <div className="bg-black/40 backdrop-blur-md border border-white/5 text-gray-500 px-3 py-1 rounded text-[10px] font-mono">
              60 FPS
            </div>
          </div>

          {/* Compilation Logs Overlay */}
          {logs.length > 0 && (
            <div className="absolute bottom-4 left-4 right-4 max-h-48 bg-black/90 backdrop-blur-xl border border-white/10 rounded-xl p-4 overflow-y-auto shadow-2xl">
              <div className="flex items-center gap-2 mb-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-white/5 pb-2">
                 <span>Output Console</span>
              </div>
              <div className="space-y-1 font-mono text-xs text-green-400/80">
                {logs.map((log, i) => (
                  <div key={i} className="flex gap-3">
                    <span className="text-gray-700 select-none">[{i}]</span>
                    <span>{log}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
