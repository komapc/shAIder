import React from 'react';
import { useShaderStore } from '../store/useShaderStore';
import { Settings2 } from 'lucide-react';

const ParametersPanel: React.FC = () => {
  const { uniforms, updateUniform } = useShaderStore();

  if (uniforms.length === 0) {
    return (
      <div className="flex flex-col h-full items-center justify-center text-gray-600 p-4">
        <Settings2 size={24} className="mb-2 opacity-20" />
        <p className="text-[10px] uppercase font-bold tracking-widest text-center">No active parameters</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="bg-[#1a1a1a] px-4 py-2 border-b border-gray-800 flex items-center justify-between">
        <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Parameters</h3>
        <span className="text-[9px] bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded font-mono border border-blue-500/20">
          {uniforms.length}
        </span>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {uniforms.map((u) => (
          <div key={u.name} className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-mono text-gray-400">{u.name}</label>
              <span className="text-[9px] font-mono text-gray-600">
                {u.type === 'color' ? String(u.value) : (typeof u.value === 'number' ? u.value.toFixed(2) : String(u.value))}
              </span>
            </div>

            {u.type === 'float' && (
              <input
                type="range"
                min={u.min ?? 0}
                max={u.max ?? 1}
                step="0.01"
                value={typeof u.value === 'number' ? u.value : 0}
                onChange={(e) => updateUniform(u.name, parseFloat(e.target.value))}
                className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            )}

            {u.type === 'color' && (
              <div className="flex gap-2 items-center">
                <div 
                  className="w-4 h-4 rounded-full border border-white/10 shadow-lg"
                  style={{ backgroundColor: String(u.value) }}
                />
                <input
                  type="text"
                  value={String(u.value)}
                  onChange={(e) => updateUniform(u.name, e.target.value)}
                  className="flex-1 bg-[#1a1a1a] border border-gray-800 rounded px-2 py-1 text-[10px] font-mono focus:outline-none focus:border-blue-500/50"
                />
                <input
                  type="color"
                  value={String(u.value)}
                  onChange={(e) => updateUniform(u.name, e.target.value)}
                  className="w-6 h-6 bg-transparent border-none cursor-pointer"
                />
              </div>
            )}

            {u.type === 'vec3' && Array.isArray(u.value) && (
              <div className="grid grid-cols-3 gap-2">
                {[0, 1, 2].map((i) => (
                  <input
                    key={i}
                    type="number"
                    value={typeof (u.value as number[])[i] === 'number' ? (u.value as number[])[i] : 0}
                    onChange={(e) => {
                      const newValue = [...(u.value as number[])];
                      newValue[i] = parseFloat(e.target.value);
                      updateUniform(u.name, newValue);
                    }}
                    className="bg-[#1a1a1a] border border-gray-800 rounded px-2 py-1 text-[10px] font-mono focus:outline-none focus:border-blue-500/50"
                  />
                ))}
              </div>
            )}
            
            {u.type === 'texture' && (
              <div className="text-[9px] text-gray-600 truncate italic">
                Texture: {String(u.value).split('/').pop()}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ParametersPanel;
