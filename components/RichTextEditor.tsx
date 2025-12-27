import React, { useEffect, useRef, useState } from 'react';
import { Bold, Italic, List, Heading1, Heading2, Link as LinkIcon, Undo, Redo, Code, AlignLeft, AlignCenter } from 'lucide-react';

interface RichTextEditorProps {
  initialContent: string;
  onChange: (html: string) => void;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({ initialContent, onChange }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  // Set initial content only once when it changes from the generator
  useEffect(() => {
    if (editorRef.current && initialContent) {
      // Only update if significantly different to avoid cursor jumping on small edits if we were to sync both ways
      if (editorRef.current.innerHTML !== initialContent) {
        editorRef.current.innerHTML = initialContent;
      }
    }
  }, [initialContent]);

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const execCommand = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
        editorRef.current.focus();
        handleInput();
    }
  };

  const ToolbarButton = ({ icon: Icon, command, value, title }: { icon: any, command: string, value?: string, title: string }) => (
    <button
      onClick={(e) => { e.preventDefault(); execCommand(command, value); }}
      className="p-2 text-slate-600 hover:text-brand-orange hover:bg-brand-light rounded transition-colors"
      title={title}
      type="button"
    >
      <Icon size={18} />
    </button>
  );

  return (
    <div className="flex flex-col h-full border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-2 bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
        <ToolbarButton icon={Heading1} command="formatBlock" value="H2" title="Kop 2" />
        <ToolbarButton icon={Heading2} command="formatBlock" value="H3" title="Kop 3" />
        <div className="w-px h-6 bg-slate-300 mx-1" />
        <ToolbarButton icon={Bold} command="bold" title="Dikgedrukt" />
        <ToolbarButton icon={Italic} command="italic" title="Cursief" />
        <ToolbarButton icon={Code} command="formatBlock" value="PRE" title="Code / Shortcode" />
        <div className="w-px h-6 bg-slate-300 mx-1" />
        <ToolbarButton icon={AlignLeft} command="justifyLeft" title="Links uitlijnen" />
        <ToolbarButton icon={AlignCenter} command="justifyCenter" title="Centreren" />
        <div className="w-px h-6 bg-slate-300 mx-1" />
        <ToolbarButton icon={List} command="insertUnorderedList" title="Lijst" />
        <ToolbarButton icon={LinkIcon} command="createLink" value={prompt('URL:') || undefined} title="Link invoegen" />
        <div className="flex-1" />
        <ToolbarButton icon={Undo} command="undo" title="Ongedaan maken" />
        <ToolbarButton icon={Redo} command="redo" title="Opnieuw" />
      </div>

      {/* Editor Area */}
      <div 
        className="flex-1 overflow-y-auto p-8 md:p-12 bg-white"
        onClick={() => editorRef.current?.focus()}
      >
        <div
            ref={editorRef}
            contentEditable
            onInput={handleInput}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className={`
                prose prose-slate max-w-none outline-none min-h-[500px]
                prose-headings:font-display prose-headings:text-brand-grey prose-headings:font-bold
                prose-p:text-brand-grey prose-p:leading-relaxed
                prose-a:text-brand-orange prose-a:font-bold
                prose-img:rounded-xl prose-img:shadow-md prose-img:mx-auto
                empty:before:content-[attr(data-placeholder)] empty:before:text-slate-300
            `}
            data-placeholder="Je blog verschijnt hier. Je kunt direct typen en bewerken..."
        />
      </div>
      
      {/* Footer / Status */}
      <div className="bg-slate-50 border-t border-slate-200 p-2 px-4 text-xs text-slate-400 flex justify-between">
         <span>WYSIWYG Editor Actief</span>
         <span>{isFocused ? 'Aan het typen...' : 'Gereed'}</span>
      </div>
    </div>
  );
};