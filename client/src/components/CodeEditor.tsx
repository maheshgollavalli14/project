import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { Play, Send, Code2, Settings2 } from 'lucide-react';
import { GradientButton } from './ui/GradientButton.js';

interface CodeEditorProps {
  initialCode: string;
  language?: string;
  onLanguageChange?: (language: string) => void;
  onRun?: (code: string, language: string) => void;
  onSubmit?: (code: string, language: string) => void;
  onChange?: (code: string) => void;
  onViolation?: (type: string, message: string) => void;
  isRunning?: boolean;
  isSubmitting?: boolean;
  readOnly?: boolean;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  initialCode,
  language = 'python',
  onLanguageChange,
  onRun,
  onSubmit,
  onChange,
  onViolation,
  isRunning = false,
  isSubmitting = false,
  readOnly = false,
}) => {
  const [selectedLanguage, setSelectedLanguage] = useState(language);
  const [code, setCode] = useState(initialCode);
  const [fontSize, setFontSize] = useState(14);

  // Sync internal code state whenever initialCode prop changes (e.g. on question switch)
  useEffect(() => {
    setCode(initialCode || '');
  }, [initialCode]);

  // Sync internal selectedLanguage when language prop changes
  useEffect(() => {
    if (language && language !== selectedLanguage) {
      setSelectedLanguage(language);
    }
  }, [language]);

  const handleCodeChange = (value: string | undefined) => {
    const val = value || '';
    setCode(val);
    if (onChange) onChange(val);
  };

  const handleEditorDidMount = (editor: any, monaco: any) => {
    // 1. Disable Monaco Undo / Redo keybindings at editor command dispatcher level
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyZ, () => {});
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyY, () => {});
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyZ, () => {});
    editor.addCommand(monaco.KeyMod.WinCtrl | monaco.KeyCode.KeyZ, () => {});
    editor.addCommand(monaco.KeyMod.WinCtrl | monaco.KeyCode.KeyY, () => {});
    editor.addCommand(monaco.KeyMod.WinCtrl | monaco.KeyMod.Shift | monaco.KeyCode.KeyZ, () => {});

    // 2. Intercept keyboard shortcuts directly on the editor DOM/event loop
    editor.onKeyDown((e: any) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdKey = isMac ? e.metaKey : e.ctrlKey;

      // Disable Undo (Ctrl+Z / Cmd+Z)
      if (cmdKey && e.keyCode === monaco.KeyCode.KeyZ && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      // Disable Redo (Ctrl+Y / Cmd+Y)
      if (cmdKey && e.keyCode === monaco.KeyCode.KeyY && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      // Disable Redo (Ctrl+Shift+Z / Cmd+Shift+Z)
      if (cmdKey && e.keyCode === monaco.KeyCode.KeyZ && e.shiftKey && !e.altKey) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      // Intercept DevTools inspection shortcuts
      if (
        e.keyCode === monaco.KeyCode.F12 ||
        (cmdKey && e.shiftKey && (e.keyCode === monaco.KeyCode.KeyI || e.keyCode === monaco.KeyCode.KeyJ || e.keyCode === monaco.KeyCode.KeyC))
      ) {
        e.preventDefault();
        e.stopPropagation();
        if (onViolation) onViolation('SUSPICIOUS_KEYBOARD_SHORTCUT', 'Developer tools inspection is restricted.');
        return;
      }
    });

    // 3. Prevent programmatic / command palette trigger of undo/redo
    const originalTrigger = editor.trigger.bind(editor);
    editor.trigger = (source: string, handlerId: string, payload: any) => {
      if (
        handlerId === 'undo' ||
        handlerId === 'redo' ||
        handlerId === 'default:undo' ||
        handlerId === 'default:redo'
      ) {
        return;
      }
      return originalTrigger(source, handlerId, payload);
    };

    // 4. Override action runners if present
    try {
      const undoAction = editor.getAction('undo');
      if (undoAction) {
        undoAction.run = () => Promise.resolve();
      }
      const redoAction = editor.getAction('redo');
      if (redoAction) {
        redoAction.run = () => Promise.resolve();
      }
    } catch {}

    // 5. Override model-level undo/redo if present
    try {
      const model = editor.getModel();
      if (model) {
        if (typeof (model as any).undo === 'function') (model as any).undo = () => {};
        if (typeof (model as any).redo === 'function') (model as any).redo = () => {};
      }
    } catch {}
  };

  const monacoLanguageMap: Record<string, string> = {
    python: 'python',
    py: 'python',
    java: 'java',
    cpp: 'cpp',
    'c++': 'cpp',
    c: 'c',
  };

  const handleLanguageSelect = (newLang: string) => {
    setSelectedLanguage(newLang);
    if (onLanguageChange) {
      onLanguageChange(newLang);
    }
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
            onChange={(e) => handleLanguageSelect(e.target.value)}
            disabled={readOnly}
            className="bg-[#141738] border border-purple-500/30 text-purple-200 text-xs font-mono rounded-lg px-2.5 py-1 focus:outline-none focus:border-purple-400 cursor-pointer"
          >
            <option value="python">Python 3.13</option>
            <option value="java">Java 26</option>
            <option value="cpp">C++ (GCC)</option>
            <option value="c">C (GCC)</option>
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
          {onRun && (
            <GradientButton
              size="sm"
              variant="secondary"
              onClick={() => onRun(code, selectedLanguage)}
              isLoading={isRunning}
              disabled={readOnly}
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
              disabled={readOnly}
              leftIcon={<Send className="w-3.5 h-3.5" />}
            >
              Submit
            </GradientButton>
          )}
        </div>
      </div>

      {/* Monaco Code Editor Canvas */}
      <div className="flex-1 min-h-[350px] relative">
        <Editor
          height="100%"
          language={monacoLanguageMap[selectedLanguage] || 'python'}
          value={code}
          theme="vs-dark"
          onChange={handleCodeChange}
          onMount={handleEditorDidMount}
          options={{
            fontSize,
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            smoothScrolling: true,
            cursorBlinking: 'smooth',
            lineNumbers: 'on',
            readOnly: readOnly,
            automaticLayout: true,
            padding: { top: 12, bottom: 12 },
            contextmenu: false, // Disables right-click context menu inside Monaco
          }}
        />
      </div>
    </div>
  );
};
