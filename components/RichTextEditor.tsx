"use client";

import { useRef, useEffect } from "react";

type RichTextEditorProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
};

export default function RichTextEditor({
  value,
  onChange,
  placeholder,
  className = "",
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);

  // keep DOM in sync with external value
  useEffect(() => {
    if (!editorRef.current) return;
    if (editorRef.current.innerHTML !== (value || "")) {
      editorRef.current.innerHTML = value || "";
    }
  }, [value]);

  function updateValue() {
    if (!editorRef.current) return;
    onChange(editorRef.current.innerHTML);
  }

  function exec(command: string, value?: string) {
    if (typeof document === "undefined") return;
    editorRef.current?.focus();
    if (value !== undefined) {
      document.execCommand(command, false, value);
    } else {
      document.execCommand(command, false);
    }
    updateValue();
  }

  function handleInput() {
    updateValue();
  }

  return (
    <div className={`space-y-1 ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center gap-1 text-[11px] text-white/70">
        <button
          type="button"
          onClick={() => exec("bold")}
          className="px-2 py-0.5 rounded border border-white/30 hover:bg-white/10 font-bold"
        >
          B
        </button>
        <button
          type="button"
          onClick={() => exec("italic")}
          className="px-2 py-0.5 rounded border border-white/30 hover:bg-white/10 italic"
        >
          I
        </button>
        <button
          type="button"
          onClick={() => exec("underline")}
          className="px-2 py-0.5 rounded border border-white/30 hover:bg-white/10 underline"
        >
          U
        </button>

        <label className="ml-2 flex items-center gap-1">
          <span className="text-[10px] text-white/60">Text color</span>
          <input
            type="color"
            className="h-4 w-4 cursor-pointer border border-white/40 rounded"
            onChange={(e) => exec("foreColor", e.target.value)}
          />
        </label>
      </div>

      {/* Editable area */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onBlur={handleInput}
        className="min-h-[64px] w-full rounded-md border border-white/20 bg-black/40 px-2 py-1 text-xs leading-relaxed whitespace-pre-wrap break-all focus:outline-none focus:ring-1 focus:ring-lime-400"
        data-placeholder={placeholder}
        onFocus={(e) => {
          const el = e.currentTarget;
          if (el.innerHTML === placeholder) {
            el.innerHTML = "";
          }
        }}
        suppressContentEditableWarning
      />
      {placeholder && !value && (
        <div className="pointer-events-none -mt-[52px] px-3 text-[11px] text-white/40">
          {placeholder}
        </div>
      )}
    </div>
  );
}
