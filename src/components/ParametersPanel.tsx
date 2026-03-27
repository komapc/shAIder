import React from 'react';
import { useShaderStore } from '../store/useShaderStore';

/**
 * ParametersPanel Component
 * Dynamically renders UI controls (sliders, color pickers) for shader uniforms.
 */
const ParametersPanel: React.FC = () => {
  const { uniforms, updateUniform } = useShaderStore();

  return (
    <div className="flex flex-col h-full bg-[#111] overflow-hidden">
      <div className="bg-[#1a1a1a] px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-gray-500 border-b border-gray-800">
        Parameters
      </div>
      <div className="flex-1 p-4 space-y-6 overflow-y-auto custom-scrollbar">
        {uniforms.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-700">
             <div className="text-[10px] uppercase tracking-tighter mb-1">No Dynamic Uniforms</div>
             <div className="text-[9px] text-center px-4 leading-relaxed italic">The AI will add uniforms here based on your prompt.</div>
          </div>
        ) : (
          uniforms.map((u) => (
            <div key={u.name} className="space-y-2 group">
              <div className="flex justify-between items-center">
                <label className="text-[11px] font-mono text-blue-400 group-hover:text-blue-300 transition-colors">
                  {u.name}
                </label>
                <span className="text-[9px] bg-gray-800 text-gray-500 px-1.5 py-0.5 rounded font-mono border border-white/5">
                  {u.type === 'color' ? u.value : (typeof u.value === 'number' ? u.value.toFixed(2) : u.value)}
                </span>
              </div>
              
              {u.type === 'float' && (
                <input
                  type="range"
                  min={u.min ?? 0}
                  max={u.max ?? 1}
                  step="0.01"
                  value={u.value}
                  onChange={(e) => updateUniform(u.name, parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400 transition-all shadow-inner"
                />
              )}

              {u.type === 'color' && (
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={u.value}
                    onChange={(e) => updateUniform(u.name, e.target.value)}
                    className="w-10 h-6 bg-transparent border-none rounded cursor-pointer overflow-hidden p-0"
                  />
                  <input 
                    type="text"
                    value={u.value}
                    onChange={(e) => updateUniform(u.name, e.target.value)}
                    className="flex-1 bg-gray-900 border border-gray-800 rounded px-2 py-1 text-[10px] font-mono focus:outline-none focus:border-blue-500/50"
                  />
                </div>
              )}
              
              {/* Fallback for unknown types */}
              {u.type !== 'float' && u.type !== 'color' && (
                <div className="text-[10px] text-gray-600 italic">Uniform type '{u.type}' not yet supported.</div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ParametersPanel;
