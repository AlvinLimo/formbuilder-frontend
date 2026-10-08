"use client";

import { isSafeHref, plainToDoc } from "@/lib/rich-text";
import type { TipTapDoc } from "@/lib/types";
import { cn } from "@/lib/utils";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import { Placeholder } from "@tiptap/extensions";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Bold, Italic, Link2, List, ListOrdered, Underline as UnderlineIcon } from "lucide-react";

type RichTextEditorProps = {
  value: TipTapDoc | null;
  fallbackText?: string;
  onChange: (doc: TipTapDoc, plain: string) => void;
  label: string;
  placeholder?: string;
  compact?: boolean;
  variant?: "default" | "title" | "heading";
};

const BODY_CLASSES: Record<NonNullable<RichTextEditorProps["variant"]>, string> = {
  default: "",
  title: "rich-editor-title",
  heading: "rich-editor-heading",
};

function ToolbarButton({
  label,
  pressed,
  onClick,
  children,
}: {
  label: string;
  pressed: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={cn(
        "rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground",
        pressed && "bg-accent text-accent-foreground"
      )}
    >
      {children}
    </button>
  );
}

export function RichTextEditor({
  value,
  fallbackText = "",
  onChange,
  label,
  placeholder,
  compact = false,
  variant = "default",
}: RichTextEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false,
        code: false,
        codeBlock: false,
        blockquote: false,
        strike: false,
        horizontalRule: false,
        link: false,
        underline: false,
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: true,
        defaultProtocol: "https",
      }),
      Placeholder.configure({ placeholder: placeholder ?? label }),
    ],
    content: value ?? plainToDoc(fallbackText),
    editorProps: {
      attributes: {
        class: cn("rich-editor-body", compact && "rich-editor-body-compact", BODY_CLASSES[variant]),
        "aria-label": label,
      },
    },
    onUpdate: ({ editor: current, transaction }) => {
      if (!transaction.docChanged) {
        return;
      }

      const json = current.getJSON() as TipTapDoc;
      onChange(json, current.getText({ blockSeparator: "\n" }).trim());
    },
  });

  const active = useEditorState({
    editor,
    selector: (snapshot) => {
      if (!snapshot.editor) {
        return { bold: false, italic: false, underline: false, link: false, bullet: false, ordered: false };
      }

      return {
        bold: snapshot.editor.isActive("bold"),
        italic: snapshot.editor.isActive("italic"),
        underline: snapshot.editor.isActive("underline"),
        link: snapshot.editor.isActive("link"),
        bullet: snapshot.editor.isActive("bulletList"),
        ordered: snapshot.editor.isActive("orderedList"),
      };
    },
  });

  const setLink = () => {
    if (!editor) {
      return;
    }

    const previous = editor.getAttributes("link").href as string | undefined;
    const href = window.prompt("Link URL", previous ?? "https://");
    if (href === null) {
      return;
    }

    if (!href.trim()) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    if (!isSafeHref(href.trim())) {
      window.alert("Use an http, https, or mailto link.");
      return;
    }

    editor.chain().focus().extendMarkRange("link").setLink({ href: href.trim() }).run();
  };

  return (
    <div className="group/editor rich-editor rounded-t-md border-b border-input bg-transparent transition-colors hover:bg-muted/40 focus-within:border-b-2 focus-within:border-brand focus-within:bg-muted/50">
      <EditorContent editor={editor} />
      <div
        role="toolbar"
        aria-label={`${label} formatting`}
        className="hidden flex-wrap gap-0.5 px-1 pb-1 group-focus-within/editor:flex"
      >
        <ToolbarButton label="Bold" pressed={Boolean(active?.bold)} onClick={() => editor?.chain().focus().toggleBold().run()}>
          <Bold className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton label="Italic" pressed={Boolean(active?.italic)} onClick={() => editor?.chain().focus().toggleItalic().run()}>
          <Italic className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          label="Underline"
          pressed={Boolean(active?.underline)}
          onClick={() => editor?.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton label="Link" pressed={Boolean(active?.link)} onClick={setLink}>
          <Link2 className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          label="Bulleted list"
          pressed={Boolean(active?.bullet)}
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
        >
          <List className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          label="Numbered list"
          pressed={Boolean(active?.ordered)}
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="size-3.5" />
        </ToolbarButton>
      </div>
    </div>
  );
}
