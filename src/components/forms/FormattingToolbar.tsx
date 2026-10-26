"use client";

interface FormattingToolbarProps {
  onFormat: (tag: string) => void;
}

export default function FormattingToolbar({ onFormat }: FormattingToolbarProps) {
  return (
    <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded px-2 py-1 mb-1 text-xs text-gray-600">
      <button type="button" onClick={() => onFormat("**")} className="px-2 py-1 font-bold hover:bg-gray-200 rounded" title="Bold">B</button>
      <button type="button" onClick={() => onFormat("*")} className="px-2 py-1 italic hover:bg-gray-200 rounded" title="Italic">I</button>
      <button type="button" onClick={() => onFormat("__")} className="px-2 py-1 underline hover:bg-gray-200 rounded" title="Underline">U</button>
      <span className="text-gray-300">|</span>
      <button type="button" onClick={() => onFormat("link")} className="px-2 py-1 hover:bg-gray-200 rounded" title="Insert Link">Link</button>
      <button type="button" onClick={() => onFormat("list")} className="px-2 py-1 hover:bg-gray-200 rounded" title="Bullet List">List</button>
    </div>
  );
}