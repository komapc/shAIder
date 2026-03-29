import React, { useState, useCallback, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { useShaderStore } from './store/useShaderStore';
import Scene from './Scene';
import ShaderEditor from './components/ShaderEditor';
import ParametersPanel from './components/ParametersPanel';
import LibraryPanel from './components/LibraryPanel';
import { Play, RotateCcw, Sparkles, PanelLeftClose, PanelLeft, GripHorizontal, Code, FileJson, Trash2, ChevronDown, ChevronUp, XCircle, RefreshCw, Download } from 'lucide-react';

// Amplify Integration
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import { configureAmplify } from './amplify-config';
import { generateStandaloneHtml } from './utils/exportHtml';

const client = generateClient<any>();

// Initialize Amplify
configureAmplify();

const App: React.FC = () => {
  const { 
    isLoading, 
    logs, 
    vertexShader, 
    fragmentShader, 
    uniforms,
    sceneObjects,
    prompt,
    sceneDescription,
    lastError,
    errorDetails,
    isSidebarVisible,
    headerHeight,
    isCompiled,
    activeEditorTab,
    setPrompt,
    setSceneDescription,
    setVertexShader,
    setFragmentShader,
    setLoading,
    setShaders,
    addLog,
    setLastError,
    clearLogs,
    toggleSidebar,
    setHeaderHeight,
    setActiveEditorTab
  } = useShaderStore();

  const [isResizing, setIsResizing] = useState(false);
  const [isParamsCollapsed, setIsParamsCollapsed] = useState(false);

  const startResizing = useCallback((event: React.MouseEvent) => {
    setIsResizing(true);
    event.preventDefault();
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback((event: MouseEvent) => {
    if (isResizing) {
      const newHeight = Math.max(100, Math.min(event.clientY, window.innerHeight * 0.7));
      setHeaderHeight(newHeight);
    }
  }, [isResizing, setHeaderHeight]);

  useEffect(() => {
    window.addEventListener('mousemove', resize);
    window.addEventListener('mouseup', stopResizing);
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [resize, stopResizing]);

  const handleExport = () => {
    const html = generateStandaloneHtml(vertexShader, fragmentShader, uniforms, sceneObjects);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'shaider-export.html';
    a.click();
    URL.revokeObjectURL(url);
    addLog("Exported scene to HTML.");
  };

  const handleGenerate = async (isRefining = false) => {
    if (!prompt && !sceneDescription && !lastError) return;
    
    setLoading(true);
    addLog(isRefining ? "Refining scene..." : lastError ? `Attempting fix...` : "Generating new scene...");

    try {
      let data;
      
      // Use Amplify Backend if configured, otherwise fallback to local server
      if (Amplify.getConfig().API) {
          const response = await client.mutations.generateShader({
            prompt,
            sceneDescription,
            isRefining,
            currentVertexShader: vertexShader,
            currentFragmentShader: fragmentShader,
            currentUniforms: JSON.stringify(uniforms),
            currentSceneObjects: JSON.stringify(sceneObjects),
            lastError: lastError || ""
          }) as any;

          if (response.errors) throw new Error(response.errors[0].message);
          data = JSON.parse(response.data?.generateShader || "{}");
      } else {
          // Fallback to local node server
          const response = await fetch('/api/generate-shader', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              prompt, 
              sceneDescription,
              isRefining,
              currentVertexShader: vertexShader,
              currentFragmentShader: fragmentShader,
              currentUniforms: uniforms,
              currentSceneObjects: sceneObjects,
              lastError: lastError
            })
          });
          data = await response.json();
          if (!response.ok) throw new Error(data.message || 'API request failed');
      }

      setShaders(data.vertexShader, data.fragmentShader, data.uniforms, data.sceneObjects);
      addLog("Compilation successful.");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(err);
      setLastError("AI Generation Failed", message);
      addLog(`Error: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen w-full bg-[#0a0a0a] text-white overflow-hidden selection:bg-blue-500/30">
      
      {/* Enhanced Error Overlay */}
      {(lastError || !isCompiled) && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[100] w-full max-w-2xl px-4 animate-in fade-in zoom-in duration-300">
            <div className="bg-[#1a0a0a]/95 backdrop-blur-xl border border-red-500/30 rounded-2xl shadow-2xl overflow-hidden shadow-red-950/20">
                <div className="bg-red-500/10 px-6 py-4 flex items-center justify-between border-b border-red-500/20">
                    <div className="flex items-center gap-3">
                        <XCircle className="text-red-500" size={20} />
                        <h2 className="text-sm font-bold uppercase tracking-widest text-red-200">
                            {!isCompiled ? "GLSL Compilation Error" : "LLM Request Error"}
                        </h2>
                    </div>
                    <button 
                        onClick={() => setLastError(null)}
                        className="text-red-500/50 hover:text-red-400 transition-colors"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
                <div className="p-6">
                    <p className="text-xs text-red-200/70 font-mono leading-relaxed bg-black/40 p-4 rounded-lg border border-red-500/10 mb-6 max-h-48 overflow-y-auto">
                        {errorDetails || lastError || "Three.js failed to compile the shader. Check the editor for syntax errors."}
                    </p>
                    <div className="flex gap-3">
                        <button 
                            onClick={() => handleGenerate(true)}
                            disabled={isLoading}
                            className="flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-[11px] font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-600/20"
                        >
                            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
                            FIX WITH AI (REFINE)
                        </button>
                        <button 
                            onClick={() => setLastError(null)}
                            className="px-6 bg-white/5 hover:bg-white/10 text-white text-[11px] font-bold rounded-xl transition-colors border border-white/10"
                        >
                            DISMISS
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* Top Header/Prompt Area */}
      <div 
        className="relative border-b border-gray-800 bg-[#111] shadow-xl z-10 overflow-hidden"
        style={{ height: `${headerHeight}px` }}
      >
        <div className="p-6 h-full w-full flex gap-8 items-start overflow-y-auto">
          
          <button 
            onClick={toggleSidebar}
            className="mt-6 p-2 text-gray-400 hover:text-white hover:bg-[#222] rounded-lg transition-colors flex-shrink-0"
            title={isSidebarVisible ? "Hide Sidebar" : "Show Sidebar"}
          >
            {isSidebarVisible ? <PanelLeftClose size={20} /> : <PanelLeft size={20} />}
          </button>

          {/* Shader Prompt */}
          <div className="flex-1 flex flex-col gap-2 h-full">
            <div className="flex items-center justify-between px-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">Shader Description</label>
                <div className="flex gap-3">
                    <button 
                        onClick={() => handleGenerate(false)}
                        className="text-[10px] text-blue-400 hover:text-blue-300 transition-colors font-bold uppercase tracking-tighter flex items-center gap-1"
                    >
                        Generate <Sparkles size={10} />
                    </button>
                    <button 
                        onClick={() => handleGenerate(true)}
                        className="text-[10px] text-gray-500 hover:text-gray-300 transition-colors font-bold uppercase tracking-tighter"
                    >
                        Refine
                    </button>
                </div>
            </div>
            <textarea 
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the visual effect... (e.g., 'A metallic pulsing sphere')"
              className="flex-1 w-full bg-[#1a1a1a] border border-gray-700 rounded-lg px-4 py-3 pl-5 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all text-sm placeholder:text-gray-600 resize-none overflow-y-auto shadow-inner min-h-0"
            />
          </div>

          {/* Scene Prompt */}
          <div className="flex-1 flex flex-col gap-2 h-full">
            <div className="flex items-center justify-between px-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">Scene Description</label>
                <div className="flex gap-3">
                    <button 
                        onClick={() => handleGenerate(false)}
                        className="text-[10px] text-blue-400 hover:text-blue-300 transition-colors font-bold uppercase tracking-tighter flex items-center gap-1"
                    >
                        Generate <Sparkles size={10} />
                    </button>
                    <button 
                        onClick={() => handleGenerate(true)}
                        className="text-[10px] text-gray-500 hover:text-gray-300 transition-colors font-bold uppercase tracking-tighter"
                    >
                        Refine
                    </button>
                </div>
            </div>
            <textarea 
              value={sceneDescription}
              onChange={(e) => setSceneDescription(e.target.value)}
              placeholder="Describe the scene layout... (e.g., 'A table with a cube on it')"
              className="flex-1 w-full bg-[#1a1a1a] border border-gray-700 rounded-lg px-4 py-3 pl-5 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all text-sm placeholder:text-gray-600 resize-none overflow-y-auto shadow-inner min-h-0"
            />
          </div>

          <div className="flex flex-col gap-2 pt-6 flex-shrink-0">
            <button 
              onClick={() => handleGenerate(false)}
              disabled={isLoading}
              className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-10 py-3 rounded-lg font-bold text-sm transition-all active:scale-95 shadow-lg shadow-blue-600/20"
            >
              <Play size={16} fill="currentColor" />
              Run All
            </button>
            <div className="flex gap-2 justify-center">
                <button className="flex items-center justify-center gap-1.5 p-2 text-gray-500 hover:text-white transition-colors text-xs font-medium">
                   <RotateCcw size={14} />
                   Reset
                </button>
                <button 
                  onClick={handleExport}
                  className="flex items-center justify-center gap-1.5 p-2 text-gray-500 hover:text-white transition-colors text-xs font-medium border-l border-gray-800"
                >
                   <Download size={14} />
                   Export
                </button>
            </div>
          </div>
        </div>

        {/* Resizer Handle */}
        <div 
          onMouseDown={startResizing}
          className="absolute bottom-0 left-0 right-0 h-1 cursor-ns-resize hover:bg-blue-500/50 transition-colors flex items-center justify-center group"
        >
          <div className="hidden group-hover:flex items-center justify-center bg-blue-500 rounded-full w-8 h-4 shadow-lg translate-y-[-2px]">
            <GripHorizontal size={12} />
          </div>
        </div>
      </div>

      {/* Main Grid Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side: Editors & Params */}
        {isSidebarVisible && (
          <div className="w-1/3 flex flex-col border-r border-gray-800 bg-[#111] shadow-2xl z-20">
            <div className={`transition-all duration-300 overflow-hidden border-b border-gray-800 flex flex-col ${isParamsCollapsed ? 'h-[32px]' : 'h-1/3 min-h-[150px]'}`}>
               <div 
                 onClick={() => setIsParamsCollapsed(!isParamsCollapsed)}
                 className="bg-[#1a1a1a] px-4 py-2 flex items-center justify-between cursor-pointer hover:bg-[#222] transition-colors flex-shrink-0"
               >
                  <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Parameters</h3>
                  {isParamsCollapsed ? <ChevronDown size={14} className="text-gray-500" /> : <ChevronUp size={14} className="text-gray-500" />}
               </div>
               {!isParamsCollapsed && (
                 <div className="flex-1 min-h-0">
                    <ParametersPanel />
                 </div>
               )}
            </div>
            
            {/* Editor Tab Switcher */}
            <div className="flex border-t border-gray-800 bg-[#1a1a1a]">
                <button 
                    onClick={() => setActiveEditorTab('vertex')}
                    className={`flex-1 py-2 px-1 text-[9px] font-bold uppercase tracking-tighter flex items-center justify-center gap-1 border-r border-gray-800 transition-colors ${activeEditorTab === 'vertex' ? 'text-blue-400 bg-[#111]' : 'text-gray-500 hover:text-gray-300'}`}
                >
                    <Code size={10} /> Vertex
                </button>
                <button 
                    onClick={() => setActiveEditorTab('fragment')}
                    className={`flex-1 py-2 px-1 text-[9px] font-bold uppercase tracking-tighter flex items-center justify-center gap-1 border-r border-gray-800 transition-colors ${activeEditorTab === 'fragment' ? 'text-blue-400 bg-[#111]' : 'text-gray-500 hover:text-gray-300'}`}
                >
                    <Code size={10} /> Fragment
                </button>
                <button 
                    onClick={() => setActiveEditorTab('scene')}
                    className={`flex-1 py-2 px-1 text-[9px] font-bold uppercase tracking-tighter flex items-center justify-center gap-1 transition-colors ${activeEditorTab === 'scene' ? 'text-blue-400 bg-[#111]' : 'text-gray-500 hover:text-gray-300'}`}
                >
                    <FileJson size={10} /> Scene JSON
                </button>
            </div>

            <div className="flex-1 flex flex-col min-h-0 border-t border-gray-800 relative">
              {activeEditorTab === 'vertex' && (
                <ShaderEditor 
                    label="Vertex Shader" 
                    value={vertexShader} 
                    onChange={setVertexShader} 
                    isError={!isCompiled}
                />
              )}
              {activeEditorTab === 'fragment' && (
                <ShaderEditor 
                    label="Fragment Shader" 
                    value={fragmentShader} 
                    onChange={setFragmentShader} 
                    isError={!isCompiled}
                />
              )}
              {activeEditorTab === 'scene' && (
                <ShaderEditor 
                    label="Scene Configuration (JSON)" 
                    value={JSON.stringify(sceneObjects, null, 2)} 
                    onChange={(val) => {
                        try {
                            const parsed = JSON.parse(val);
                            if (Array.isArray(parsed)) {
                                useShaderStore.setState({ sceneObjects: parsed });
                            }
                        } catch { /* silent fail while typing */ }
                    }} 
                />
              )}
            </div>
          </div>
        )}

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
              <div className="flex items-center justify-between mb-2 border-b border-white/5 pb-2">
                <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                    <span>Output Console</span>
                </div>
                <button 
                    onClick={clearLogs}
                    className="p-1 text-gray-500 hover:text-red-400 transition-colors"
                    title="Clear Logs"
                >
                    <Trash2 size={12} />
                </button>
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

        {/* Right Library Panel */}
        <LibraryPanel />
      </div>
    </div>
  );
}

export default App;
