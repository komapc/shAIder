import React from 'react';
import { useShaderStore } from '../store/useShaderStore';

const ParametersPanel: React.FC = () => {
  const { uniforms, updateUniform } = useShaderStore();

  return (
    <div className="flex flex-col h-full bg-[#111] overflow-hidden">
      <div className="bg-[#1a1a1a] px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-gray-500 border-b border-gray-800">
        Parameters
      </div>
      <div className="flex-1 p-4 space-y-6 overflow-y-auto">
        {uniforms.length === 0 ? (
          <div className="text-xs text-gray-600 italic">No parameters detected...</div>
        ) : (
          uniforms.map((u) => (
            <div key={u.name} className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-mono text-blue-400">{u.name}</label>
                <span className="text-[10px] bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded font-mono">
                  {typeof u.value === 'number' ? u.value.toFixed(2) : u.value}
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
                  className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
              )}
              
              {/* Add more types (color, vec3) as needed later */}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ParametersPanel;
