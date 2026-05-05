import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import CharacterCount from '@tiptap/extension-character-count';
import Placeholder from '@tiptap/extension-placeholder';
import StarterKit from '@tiptap/starter-kit';
import {
  Bold,
  Code2,
  Heading1,
  Heading2,
  Italic,
  List,
  ListOrdered,
  Redo2,
  Strikethrough,
  Undo2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MAX_CONTENT_LENGTH } from '@/lib/constants';
import { cn } from '@/lib/utils';

interface PostEditorProps {
  value: string;
  onChange: (value: string, plainText: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function PostEditor({
  value,
  onChange,
  disabled,
  placeholder = 'Write the announcement...',
}: PostEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2] },
      }),
      Placeholder.configure({ placeholder }),
      CharacterCount.configure({ limit: MAX_CONTENT_LENGTH }),
    ],
    content: value,
    editable: !disabled,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          'min-h-48 rounded-b-lg px-4 py-3 text-sm leading-6 outline-none [&_h1]:text-xl [&_h1]:font-semibold [&_h2]:text-lg [&_h2]:font-semibold [&_ul]:list-disc [&_ol]:list-decimal [&_li]:ml-5 [&_pre]:rounded-md [&_pre]:bg-muted [&_pre]:p-3',
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      onChange(currentEditor.getHTML(), currentEditor.getText());
    },
  });

  useEffect(() => {
    if (!editor) {
      return;
    }

    editor.setEditable(!disabled);
  }, [disabled, editor]);

  useEffect(() => {
    if (!editor || editor.getHTML() === value) {
      return;
    }

    editor.commands.setContent(value);
  }, [editor, value]);

  const characters = editor?.storage.characterCount.characters() ?? 0;
  const overLimit = characters > MAX_CONTENT_LENGTH;

  return (
    <div
      className={cn(
        'overflow-hidden rounded-lg border border-input bg-background',
        overLimit && 'border-destructive',
      )}
    >
      <div className="flex flex-wrap items-center gap-1 border-b bg-muted/45 px-2 py-2">
        <ToolbarButton label="Bold" disabled={!editor || disabled} onClick={() => editor?.chain().focus().toggleBold().run()} active={editor?.isActive('bold')}>
          <Bold className="size-4" />
        </ToolbarButton>
        <ToolbarButton label="Italic" disabled={!editor || disabled} onClick={() => editor?.chain().focus().toggleItalic().run()} active={editor?.isActive('italic')}>
          <Italic className="size-4" />
        </ToolbarButton>
        <ToolbarButton label="Strike" disabled={!editor || disabled} onClick={() => editor?.chain().focus().toggleStrike().run()} active={editor?.isActive('strike')}>
          <Strikethrough className="size-4" />
        </ToolbarButton>
        <span className="mx-1 h-5 w-px bg-border" />
        <ToolbarButton label="Heading 1" disabled={!editor || disabled} onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()} active={editor?.isActive('heading', { level: 1 })}>
          <Heading1 className="size-4" />
        </ToolbarButton>
        <ToolbarButton label="Heading 2" disabled={!editor || disabled} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} active={editor?.isActive('heading', { level: 2 })}>
          <Heading2 className="size-4" />
        </ToolbarButton>
        <ToolbarButton label="Bullet list" disabled={!editor || disabled} onClick={() => editor?.chain().focus().toggleBulletList().run()} active={editor?.isActive('bulletList')}>
          <List className="size-4" />
        </ToolbarButton>
        <ToolbarButton label="Ordered list" disabled={!editor || disabled} onClick={() => editor?.chain().focus().toggleOrderedList().run()} active={editor?.isActive('orderedList')}>
          <ListOrdered className="size-4" />
        </ToolbarButton>
        <ToolbarButton label="Code block" disabled={!editor || disabled} onClick={() => editor?.chain().focus().toggleCodeBlock().run()} active={editor?.isActive('codeBlock')}>
          <Code2 className="size-4" />
        </ToolbarButton>
        <span className="mx-1 h-5 w-px bg-border" />
        <ToolbarButton label="Undo" disabled={!editor || disabled} onClick={() => editor?.chain().focus().undo().run()}>
          <Undo2 className="size-4" />
        </ToolbarButton>
        <ToolbarButton label="Redo" disabled={!editor || disabled} onClick={() => editor?.chain().focus().redo().run()}>
          <Redo2 className="size-4" />
        </ToolbarButton>
        <span className={cn('ml-auto px-2 text-xs text-muted-foreground', overLimit && 'text-destructive')}>
          {characters}/{MAX_CONTENT_LENGTH}
        </span>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}

interface ToolbarButtonProps {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}

function ToolbarButton({ label, active, disabled, onClick, children }: ToolbarButtonProps) {
  return (
    <Button
      type="button"
      variant={active ? 'secondary' : 'ghost'}
      size="icon-sm"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}
