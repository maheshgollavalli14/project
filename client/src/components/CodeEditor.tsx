import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import { Play, Send, RotateCcw, Code2, Settings2 } from 'lucide-react';
import { GradientButton } from './ui/GradientButton.js';

interface CodeEditorProps {
  initialCode: string;
  language?: string;
  onRun?: (code: string, language: string) => void;
  onSubmit?: (code: string, language: string) => void;
  onChange?: (code: string) => void;
  isRunning?: boolean;
  isSubmitting?: boolean;
  readOnly?: boolean;
  lockWarning?: string | null;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  initialCode,
  language = 'python',
  onRun,
  onSubmit,
  onChange,
  isRunning = false,
  isSubmitting = false,
  readOnly = false,
  lockWarning = null,
}) => {
  const [selectedLanguage, setSelectedLanguage] = useState(language);
  const [code, setCode] = useState(initialCode);
  const [fontSize, setFontSize] = useState(14);

  const handleCodeChange = (value: string | undefined) => {
    const val = value || '';
    setCode(val);
    if (onChange) onChange(val);
  };

  const handleReset = () => {
    if (window.confirm('Reset code to initial template?')) {
      setCode(initialCode);
      if (onChange) onChange(initialCode);
    }
  };

  const monacoLanguageMap: Record<string, string> = {
    python: 'python',
    py: 'python',
    java: 'java',
    cpp: 'cpp',
    'c++': 'cpp',
  };

  return (
    <div className="flex flex-col h-full bg-[#0d0f22] border border-purple-500/20 rounded-2xl overflow-hidden shadow-2xl">
      {/* Editor Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#090b1a] border-b border-purple-500/15">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-purple-400 text-xs font-mono font-bold">
            <Code2 className="w-4 h-4" />
            <span>EDITOR</span>
          </div>

          {/* Language Selector */}
          <select
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
            disabled={readOnly}
            className="bg-[#141738] border border-purple-500/30 text-purple-200 text-xs font-mono rounded-lg px-2.5 py-1 focus:outline-none focus:border-purple-400"
          >
            <option value="python">Python 3.13</option>
            <option value="java">Java 26</option>
            <option value="cpp">C++ (GCC 14)</option>
          </select>

          {/* Font Size Selector */}
          <div className="hidden sm:flex items-center gap-1 text-[11px] text-slate-400">
            <Settings2 className="w-3.5 h-3.5" />
            <select
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              className="bg-transparent border-0 text-slate-300 text-[11px] focus:ring-0 cursor-pointer"
            >
              <option value={12}>12px</option>
              <option value={14}>14px</option>
              <option value={16}>16px</option>
              <option value={18}>18px</option>
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            disabled={readOnly}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-purple-900/30 transition-colors"
            title="Reset code"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {onRun && (
            <GradientButton
              size="sm"
              variant="secondary"
              onClick={() => onRun(code, selectedLanguage)}
              isLoading={isRunning}
              disabled={readOnly || Boolean(lockWarning)}
              leftIcon={<Play className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />}
            >
              Run Code
            </GradientButton>
          )}

          {onSubmit && (
            <GradientButton
              size="sm"
              onClick={() => onSubmit(code, selectedLanguage)}
              isLoading={isSubmitting}
              disabled={readOnly || Boolean(lockWarning)}
              leftIcon={<Send className="w-3.5 h-3.5" />}
            >
              Submit
            </GradientButton>
          )}
        </div>
      </div>

      {/* Lock Overlay if locked by teammate */}
      {lockWarning && (
        <div className="bg-indigo-950/80 border-b border-indigo-500/30 px-4 py-2 text-xs text-indigo-200 flex items-center justify-between">
          <span>🔒 {lockWarning}</span>
          <span className="text-[10px] font-mono text-indigo-300 font-semibold uppercase">Read Only</span>
        </div>
      )}

      {/* Monaco Code Editor Canvas */}
      <div className="flex-1 min-h-[350px] relative">
        <Editor
          height="100%"
          language={monacoLanguageMap[selectedLanguage] || 'python'}
          value={code}
          theme="vs-dark"
          onChange={handleCodeChange}
          options={{
            fontSize,
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            smoothScrolling: true,
            cursorBlinking: 'smooth',
            lineNumbers: 'on',
            readOnly: readOnly || Boolean(lockWarning),
            automaticLayout: true,
            padding: { top: 12, bottom: 12 },
          }}
        />
      </div>
    </div>
  );
};
