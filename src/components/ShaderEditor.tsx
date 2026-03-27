import React from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { cpp } from '@codemirror/lang-cpp';
import { vscodeDark } from '@uiw/codemirror-theme-vscode';

interface ShaderEditorProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

const ShaderEditor: React.FC<ShaderEditorProps> = ({ label, value, onChange }) => {
  return (
    <div className="flex flex-col h-1/2 border-b border-gray-800 last:border-b-0 overflow-hidden">
      <div className="bg-[#1a1a1a] px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-gray-500 border-b border-gray-800">
        {label}
      </div>
      <div className="flex-1 overflow-auto">
        <CodeMirror
          value={value}
          height="100%"
          theme={vscodeDark}
          extensions={[cpp()]} // GLSL is close enough to C++ for basic highlighting
          onChange={(val) => onChange(val)}
          className="text-xs sm:text-sm"
        />
      </div>
    </div>
  );
};

export default ShaderEditor;
