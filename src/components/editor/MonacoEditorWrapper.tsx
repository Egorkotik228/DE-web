'use client';

import React, { useEffect, useRef } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';

interface MonacoEditorWrapperProps {
  value: string;
  onChange: (val: string) => void;
  language?: string;
  onRunCode?: () => void;
  readOnly?: boolean;
}

export const MonacoEditorWrapper: React.FC<MonacoEditorWrapperProps> = ({
  value,
  onChange,
  language = 'sql',
  onRunCode,
  readOnly = false,
}) => {
  const onRunCodeRef = useRef(onRunCode);

  useEffect(() => {
    onRunCodeRef.current = onRunCode;
  }, [onRunCode]);

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    // Custom DE Academy dark theme
    monaco.editor.defineTheme('de-academy-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '7D8590', fontStyle: 'italic' },
        { token: 'keyword', foreground: '10B981', fontStyle: 'bold' },
        { token: 'string', foreground: '7EE787' },
        { token: 'number', foreground: '79C0FF' },
        { token: 'identifier', foreground: 'E6EDF3' },
        { token: 'type', foreground: 'FFA657' },
        { token: 'delimiter', foreground: '8B949E' },
      ],
      colors: {
        'editor.background': '#0D1117',
        'editor.foreground': '#E6EDF3',
        'editorCursor.foreground': '#10B981',
        'editor.lineHighlightBackground': '#151B2380',
        'editorLineNumber.foreground': '#7D859060',
        'editorLineNumber.activeForeground': '#10B981',
        'editor.selectionBackground': '#10B98130',
        'editor.inactiveSelectionBackground': '#10B98115',
      },
    });

    monaco.editor.setTheme('de-academy-dark');

    // Add Ctrl+Enter / Cmd+Enter execution shortcut
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      if (onRunCodeRef.current) {
        onRunCodeRef.current();
      }
    });
  };

  return (
    <div className="w-full h-full min-h-[220px] bg-[#0D1117] relative">
      <Editor
        height="100%"
        language={language === 'python' ? 'python' : 'sql'}
        value={value}
        onChange={(val) => onChange(val || '')}
        onMount={handleEditorDidMount}
        loading={
          <div className="w-full h-full flex flex-col items-center justify-center bg-[#0D1117] text-[#7D8590] text-xs font-mono gap-2">
            <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
            <span>Загрузка редактора Monaco...</span>
          </div>
        }
        options={{
          fontSize: 13.5,
          fontFamily: "'JetBrains Mono', monospace",
          lineNumbers: 'on',
          roundedSelection: true,
          scrollBeyondLastLine: false,
          readOnly,
          minimap: { enabled: false },
          automaticLayout: true,
          tabSize: 4,
          insertSpaces: true,
          wordWrap: 'on',
          padding: { top: 12, bottom: 12 },
          lineDecorationsWidth: 6,
          lineNumbersMinChars: 3,
        }}
      />
    </div>
  );
};
