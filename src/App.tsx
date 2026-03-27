import React from 'react';
import { useShaderStore } from './store/useShaderStore';

const App: React.FC = () => {
  const { isLoading, logs } = useShaderStore();

  return (
    <div className="flex flex-col h-screen w-full bg-[#0a0a0a] text-white overflow-hidden">
      {/* Top Header/Prompt Area */}
      <div className="p-4 border-b border-gray-800 bg-[#111]">
        <div className="flex gap-4">
          <input 
            type="text" 
            placeholder="Describe your shader... (e.g., 'A metallic pulsing sphere')"
            className="flex-1 bg-[#222] border border-gray-700 rounded px-4 py-2 focus:outline-none focus:border-blue-500 transition-colors"
          />
          <button className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded font-medium transition-colors">
            Generate
          </button>
        </div>
      </div>

      {/* Main Grid Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side: Editors & Params */}
        <div className="w-1/3 flex flex-col border-r border-gray-800 bg-[#111]">
          <div className="flex-1 p-4 border-b border-gray-800 overflow-y-auto">
            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-4">Parameters</h3>
            {/* Parameters Panel Content */}
            <div className="space-y-4">
               <div className="text-sm text-gray-400">No parameters to show yet.</div>
            </div>
          </div>
          <div className="flex-1 p-4 overflow-y-auto">
            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-4">Shaders</h3>
            <div className="space-y-4 text-sm font-mono bg-[#050505] p-2 rounded border border-gray-800">
               {/* Shader Editors Placeholders */}
               <div className="text-gray-600 italic">Code editors loading...</div>
            </div>
          </div>
        </div>

        {/* Right Side: 3D Scene */}
        <div className="flex-1 relative bg-black">
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
             {/* Scene Placeholder */}
             <div className="text-gray-800 text-6xl font-bold opacity-20 select-none">3D SCENE</div>
          </div>
          
          {/* Compilation Logs Overlay */}
          {logs.length > 0 && (
            <div className="absolute bottom-4 left-4 right-4 max-h-32 bg-black/80 border border-gray-800 rounded p-2 overflow-y-auto text-xs font-mono text-green-400">
              {logs.map((log, i) => <div key={i}>{log}</div>)}
            </div>
          )}

          {/* Loading Indicator */}
          {isLoading && (
            <div className="absolute top-4 right-4 flex items-center gap-2 bg-blue-600/20 text-blue-400 border border-blue-600/40 px-3 py-1 rounded text-sm animate-pulse">
              <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
              Compiling...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
