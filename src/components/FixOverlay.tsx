import React from 'react';
import { useShaderStore } from '../store/useShaderStore';
import { XCircle, Trash2, RefreshCw } from 'lucide-react';

interface FixOverlayProps {
  isLoading: boolean;
  onFix: () => void;
}

const FixOverlay: React.FC<FixOverlayProps> = ({ isLoading, onFix }) => {
  const { lastError, errorDetails, isCompiled, setLastError } = useShaderStore();

  if (!lastError && isCompiled) return null;

  return (
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
          <p className="text-xs text-red-200/70 font-mono leading-relaxed bg-black/40 p-4 rounded-lg border border-red-500/10 mb-6 max-h-48 overflow-y-auto whitespace-pre-wrap">
            {errorDetails || lastError || "Three.js failed to compile the shader. Check the editor for syntax errors."}
          </p>
          <div className="flex gap-3">
            <button 
              onClick={onFix}
              disabled={isLoading}
              className="flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-[11px] font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-600/20"
            >
              <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
              FIX WITH AI (REFINE)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FixOverlay;
