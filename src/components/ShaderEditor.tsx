import React from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { cpp } from '@codemirror/lang-cpp';
import { vscodeDark } from '@uiw/codemirror-theme-vscode';
import { AlertCircle } from 'lucide-react';

interface ShaderEditorProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  isError?: boolean;
}

const ShaderEditor: React.FC<ShaderEditorProps> = ({ label, value, onChange, isError }) => {
  return (
    <div className={`flex flex-col h-full border-b border-gray-800 last:border-b-0 overflow-hidden transition-colors ${isError ? 'border-red-900/50' : ''}`}>
      <div 
        className={`flex items-center justify-between px-3 py-1 text-[10px] font-bold uppercase tracking-widest border-b transition-colors ${isError ? 'bg-red-950/30 text-red-400 border-red-900/50' : 'bg-[#1a1a1a] text-gray-500 border-gray-800'}`}
        role="heading"
        aria-level={3}
      >
        <span>{label}</span>
        {isError && (
          <div className="flex items-center gap-1 text-red-500 animate-pulse" role="alert">
            <AlertCircle size={10} />
            <span>COMPILATION ERROR</span>
          </div>
        )}
      </div>
      <div className={`flex-1 overflow-auto transition-colors ${isError ? 'bg-red-950/5' : ''}`}>
        <CodeMirror
          value={value}
          height="100%"
          theme={vscodeDark}
          extensions={[cpp()]}
          onChange={(val) => onChange(val)}
          aria-label={`${label} Code Editor`}
          className={`text-xs sm:text-sm ${isError ? 'opacity-80' : ''}`}
        />
      </div>
    </div>
  );
};

export default ShaderEditor;
