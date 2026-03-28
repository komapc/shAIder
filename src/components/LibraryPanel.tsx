import React, { useState } from 'react';
import { useShaderStore } from '../store/useShaderStore';
import { MATERIAL_LIBRARY, OBJECT_LIBRARY, TEXTURE_LIBRARY } from '../data/library';
import { Box, Layers, Image as ImageIcon, Sparkles, ChevronRight } from 'lucide-react';

const LibraryPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'materials' | 'objects' | 'textures'>('materials');
  const { setPrompt, setObjectType, addLog } = useShaderStore();

  const handleApplyMaterial = (prompt: string, name: string) => {
    setPrompt(prompt);
    addLog(`Library: Applied material "${name}". Hit Generate to compile.`);
  };

  const handleApplyObject = (type: string, name: string) => {
    setObjectType(type);
    addLog(`Library: Changed object to ${name}.`);
  };

  return (
    <div className="flex flex-col h-full bg-[#111] border-l border-gray-800 w-64 flex-shrink-0">
      <div className="flex border-b border-gray-800">
        <button 
          onClick={() => setActiveTab('materials')}
          className={`flex-1 p-3 flex justify-center transition-colors ${activeTab === 'materials' ? 'text-blue-400 bg-[#1a1a1a]' : 'text-gray-500 hover:text-gray-300'}`}
          title="Materials"
        >
          <Layers size={18} />
        </button>
        <button 
          onClick={() => setActiveTab('objects')}
          className={`flex-1 p-3 flex justify-center transition-colors ${activeTab === 'objects' ? 'text-blue-400 bg-[#1a1a1a]' : 'text-gray-500 hover:text-gray-300'}`}
          title="Objects"
        >
          <Box size={18} />
        </button>
        <button 
          onClick={() => setActiveTab('textures')}
          className={`flex-1 p-3 flex justify-center transition-colors ${activeTab === 'textures' ? 'text-blue-400 bg-[#1a1a1a]' : 'text-gray-500 hover:text-gray-300'}`}
          title="Textures"
        >
          <ImageIcon size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {activeTab === 'materials' && (
          <div className="space-y-2">
            <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">Materials</h3>
            {MATERIAL_LIBRARY.map((mat) => (
              <button
                key={mat.id}
                onClick={() => handleApplyMaterial(mat.prompt, mat.name)}
                className="w-full text-left p-3 rounded-lg bg-[#1a1a1a] border border-gray-800 hover:border-blue-500/50 hover:bg-[#222] transition-all group"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-gray-200">{mat.name}</span>
                  <Sparkles size={12} className="text-gray-600 group-hover:text-blue-400 transition-colors" />
                </div>
                <p className="text-[10px] text-gray-500 leading-relaxed line-clamp-2">{mat.description}</p>
              </button>
            ))}
          </div>
        )}

        {activeTab === 'objects' && (
          <div className="space-y-2">
            <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">Geometries</h3>
            {OBJECT_LIBRARY.map((obj) => (
              <button
                key={obj.id}
                onClick={() => handleApplyObject(obj.type, obj.name)}
                className="w-full text-left p-3 rounded-lg bg-[#1a1a1a] border border-gray-800 hover:border-blue-500/50 hover:bg-[#222] transition-all group flex items-center gap-3"
              >
                <div className="p-2 bg-[#222] rounded text-gray-400 group-hover:text-blue-400 transition-colors">
                  <Box size={14} />
                </div>
                <div className="flex-1">
                  <div className="text-xs font-bold text-gray-200">{obj.name}</div>
                  <div className="text-[10px] text-gray-500">{obj.description}</div>
                </div>
                <ChevronRight size={12} className="text-gray-700" />
              </button>
            ))}
          </div>
        )}

        {activeTab === 'textures' && (
          <div className="space-y-2">
            <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">Textures</h3>
            {TEXTURE_LIBRARY.map((tex) => (
              <div
                key={tex.id}
                className="w-full p-3 rounded-lg bg-[#1a1a1a] border border-gray-800 opacity-60 cursor-not-allowed"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#222] rounded overflow-hidden">
                    <img src={tex.url} alt={tex.name} className="w-full h-full object-cover grayscale" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-gray-400">{tex.name}</div>
                    <div className="text-[9px] text-gray-600">Coming Soon</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LibraryPanel;
