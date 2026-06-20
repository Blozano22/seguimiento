'use client';

import { useEffect, useRef } from 'react';

interface Props {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  ringColor?: string;
}

export default function ObservacionesEditor({
  value,
  onChange,
  placeholder = 'Notas adicionales...',
  ringColor = 'focus:ring-indigo-500',
}: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) ref.current.innerHTML = value ?? '';
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const items = Array.from(e.clipboardData.items);
    const imageItem = items.find(item => item.type.startsWith('image/'));

    if (imageItem) {
      e.preventDefault();
      const file = imageItem.getAsFile();
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
        const dataUrl = evt.target?.result as string;
        const img = document.createElement('img');
        img.src = dataUrl;
        img.style.cssText = 'max-width:100%;border-radius:8px;margin:8px 0;display:block;box-shadow:0 1px 4px rgba(0,0,0,.12);';
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
          const range = sel.getRangeAt(0);
          range.deleteContents();
          range.insertNode(img);
          range.setStartAfter(img);
          range.collapse(true);
          sel.removeAllRanges();
          sel.addRange(range);
        } else {
          ref.current?.appendChild(img);
        }
        onChange(ref.current?.innerHTML ?? '');
      };
      reader.readAsDataURL(file);
      return;
    }

    // Text paste: strip external HTML formatting, insert plain text
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    if (text) {
      document.execCommand('insertText', false, text);
      onChange(ref.current?.innerHTML ?? '');
    }
  };

  return (
    <>
      <style>{`
        .obs-editor:empty::before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
        }
        .obs-editor img { cursor: default; }
      `}</style>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={() => onChange(ref.current?.innerHTML ?? '')}
        onPaste={handlePaste}
        data-placeholder={placeholder}
        className={`obs-editor w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 ${ringColor} min-h-[140px] max-h-96 overflow-y-auto leading-relaxed`}
      />
    </>
  );
}
