"use client";

import { useImperativeHandle, useRef, useState, type ReactNode, type Ref } from "react";
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import TextAlign from "@tiptap/extension-text-align";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  Redo2,
  TextQuote,
  Underline,
  Undo2,
} from "lucide-react";

/** Matches BROADCAST_CONTENT_WIDTH in lib/broadcast-html.ts: the email's text column. */
const FULL_WIDTH = 536;

const IMAGE_SIZES = [
  { label: "Small", width: 180 },
  { label: "Medium", width: 320 },
  { label: "Full width", width: FULL_WIDTH },
];

export interface RichTextEditorHandle {
  /** Inserts plain text at the caret, replacing any selection. */
  insertText: (text: string) => void;
  /** True when there is no text and no image. */
  isEmpty: () => boolean;
}

interface Props {
  ref?: Ref<RichTextEditorHandle>;
  /** Read once on mount. Remount with a new `key` to load different content. */
  initialContent: string;
  onChange: (html: string) => void;
  /** Stores the file and resolves to its public URL; rejects with a readable message. */
  uploadImage: (file: File) => Promise<string>;
}

/** The width an image would naturally render at, capped to the email's column. */
function fittedWidth(src: string) {
  return new Promise<number>((resolve) => {
    const probe = new window.Image();
    probe.onload = () => resolve(Math.min(probe.naturalWidth || FULL_WIDTH, FULL_WIDTH));
    probe.onerror = () => resolve(FULL_WIDTH);
    probe.src = src;
  });
}

function ToolbarButton({
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      // Keep the editor's selection: a plain click would move focus to the button first.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`rounded p-1.5 disabled:opacity-40 ${
        active ? "bg-cfg-primary text-white" : "text-gray-700 hover:bg-gray-200"
      }`}
    >
      {children}
    </button>
  );
}

/**
 * Its own component so it mounts only once the editor exists: useEditorState
 * handed a null editor reports nothing until that editor's first transaction,
 * which never comes if the editor is not on screen yet.
 */
function Toolbar({
  editor,
  uploading,
  onPickImage,
}: {
  editor: Editor;
  uploading: boolean;
  onPickImage: () => void;
}) {
  // The toolbar reads only these flags, so typing does not re-render it.
  const state = useEditorState({
    editor,
    selector: ({ editor }) =>
      editor && {
        bold: editor.isActive("bold"),
        italic: editor.isActive("italic"),
        underline: editor.isActive("underline"),
        h2: editor.isActive("heading", { level: 2 }),
        h3: editor.isActive("heading", { level: 3 }),
        bulletList: editor.isActive("bulletList"),
        orderedList: editor.isActive("orderedList"),
        blockquote: editor.isActive("blockquote"),
        left: editor.isActive({ textAlign: "left" }),
        center: editor.isActive({ textAlign: "center" }),
        right: editor.isActive({ textAlign: "right" }),
        link: editor.isActive("link"),
        image: editor.isActive("image"),
        imageWidth: Number(editor.getAttributes("image").width) || 0,
        canUndo: editor.can().undo(),
        canRedo: editor.can().redo(),
      },
  });

  function editLink() {
    if (!editor) return;
    const current = (editor.getAttributes("link").href as string) || "";
    const entered = window.prompt("Link address (leave empty to remove the link)", current || "https://");
    if (entered === null) return;
    const trimmed = entered.trim();
    if (!trimmed || trimmed === "https://") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    const href = /^(https?:|mailto:|tel:)/i.test(trimmed) ? trimmed : `https://${trimmed}`;
    if (editor.state.selection.empty && !current) {
      // Nothing selected to turn into a link, so the address itself becomes the text.
      editor
        .chain()
        .focus()
        .insertContent({ type: "text", text: trimmed, marks: [{ type: "link", attrs: { href } }] })
        .run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
  }

  const chain = () => editor.chain().focus();
  const separator = <span className="mx-1 h-5 w-px bg-gray-300" aria-hidden />;

  return (
    <>
      <div className="flex flex-wrap items-center gap-0.5 border-b bg-gray-50 p-1.5">
        <ToolbarButton label="Bold" active={state.bold} onClick={() => chain().toggleBold().run()}>
          <Bold size={16} />
        </ToolbarButton>
        <ToolbarButton label="Italic" active={state.italic} onClick={() => chain().toggleItalic().run()}>
          <Italic size={16} />
        </ToolbarButton>
        <ToolbarButton label="Underline" active={state.underline} onClick={() => chain().toggleUnderline().run()}>
          <Underline size={16} />
        </ToolbarButton>
        {separator}
        <ToolbarButton label="Heading" active={state.h2} onClick={() => chain().toggleHeading({ level: 2 }).run()}>
          <Heading2 size={16} />
        </ToolbarButton>
        <ToolbarButton label="Subheading" active={state.h3} onClick={() => chain().toggleHeading({ level: 3 }).run()}>
          <Heading3 size={16} />
        </ToolbarButton>
        <ToolbarButton label="Bulleted list" active={state.bulletList} onClick={() => chain().toggleBulletList().run()}>
          <List size={16} />
        </ToolbarButton>
        <ToolbarButton label="Numbered list" active={state.orderedList} onClick={() => chain().toggleOrderedList().run()}>
          <ListOrdered size={16} />
        </ToolbarButton>
        <ToolbarButton label="Quote" active={state.blockquote} onClick={() => chain().toggleBlockquote().run()}>
          <TextQuote size={16} />
        </ToolbarButton>
        <ToolbarButton label="Divider line" onClick={() => chain().setHorizontalRule().run()}>
          <Minus size={16} />
        </ToolbarButton>
        {separator}
        <ToolbarButton label="Align left" active={state.left} onClick={() => chain().setTextAlign("left").run()}>
          <AlignLeft size={16} />
        </ToolbarButton>
        <ToolbarButton label="Align centre" active={state.center} onClick={() => chain().setTextAlign("center").run()}>
          <AlignCenter size={16} />
        </ToolbarButton>
        <ToolbarButton label="Align right" active={state.right} onClick={() => chain().setTextAlign("right").run()}>
          <AlignRight size={16} />
        </ToolbarButton>
        {separator}
        <ToolbarButton label="Link" active={state.link} onClick={editLink}>
          <Link2 size={16} />
        </ToolbarButton>
        <ToolbarButton
          label={uploading ? "Uploading image…" : "Insert image"}
          disabled={uploading}
          onClick={onPickImage}
        >
          <ImagePlus size={16} />
        </ToolbarButton>
        {separator}
        <ToolbarButton label="Undo" disabled={!state.canUndo} onClick={() => chain().undo().run()}>
          <Undo2 size={16} />
        </ToolbarButton>
        <ToolbarButton label="Redo" disabled={!state.canRedo} onClick={() => chain().redo().run()}>
          <Redo2 size={16} />
        </ToolbarButton>
      </div>

      {state.image && (
        <div className="flex flex-wrap items-center gap-2 border-b bg-gray-50 px-3 py-1.5 text-xs text-gray-600">
          <span className="font-semibold">Image size</span>
          {IMAGE_SIZES.map((size) => (
            <button
              key={size.label}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => chain().updateAttributes("image", { width: size.width }).run()}
              className={`rounded border px-2 py-0.5 ${
                state.imageWidth === size.width ? "border-cfg-primary bg-cfg-primary text-white" : "bg-white"
              }`}
            >
              {size.label}
            </button>
          ))}
        </div>
      )}
    </>
  );
}

/**
 * The broadcast compose box. Produces HTML limited to what the broadcast route's
 * sanitiser keeps, so what is shown here is what arrives in the inbox.
 */
export default function RichTextEditor({ ref, initialContent, onChange, uploadImage }: Props) {
  const fileInput = useRef<HTMLInputElement>(null);
  const editorRef = useRef<Editor | null>(null);
  const [uploading, setUploading] = useState(false);
  const [note, setNote] = useState("");

  async function insertImage(file: File) {
    setNote("");
    setUploading(true);
    try {
      const src = await uploadImage(file);
      const width = await fittedWidth(src);
      editorRef.current?.chain().focus().setImage({ src, alt: "", width }).run();
    } catch (error) {
      setNote(error instanceof Error ? error.message : "Could not upload that image.");
    } finally {
      setUploading(false);
    }
  }

  /** Uploads images arriving by paste or drop. Returns true when it took the event. */
  function takeImages(files: FileList | undefined | null) {
    const images = Array.from(files || []).filter((file) => file.type.startsWith("image/"));
    if (images.length === 0) return false;
    // One after another, so they land in the order they were given.
    void images.reduce((queue, file) => queue.then(() => insertImage(file)), Promise.resolve());
    return true;
  }

  const editor = useEditor({
    // Next renders this on the server first; building the editor there would
    // produce markup the browser cannot hydrate.
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        code: false,
        codeBlock: false,
        link: { openOnClick: false, defaultProtocol: "https" },
      }),
      // Inline, so an image sits in a paragraph and follows its alignment.
      Image.configure({ inline: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    content: initialContent,
    editorProps: {
      attributes: { class: "min-h-48 p-3 text-sm outline-none" },
      handlePaste: (_view, event) => takeImages(event.clipboardData?.files),
      handleDrop: (_view, event) => takeImages(event.dataTransfer?.files),
    },
    onCreate: ({ editor }) => {
      editorRef.current = editor;
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  useImperativeHandle(
    ref,
    () => ({
      insertText: (text) => {
        editor?.chain().focus().insertContent({ type: "text", text }).run();
      },
      isEmpty: () => !editor || (editor.getText().trim() === "" && !editor.getHTML().includes("<img")),
    }),
    [editor]
  );

  if (!editor) {
    return <div className="min-h-48 rounded border bg-white p-3 text-sm text-gray-400">Loading editor…</div>;
  }


  return (
    <div className="rich-text-editor rounded border bg-white focus-within:border-cfg-secondary">
      <Toolbar editor={editor} uploading={uploading} onPickImage={() => fileInput.current?.click()} />
      <input
        ref={fileInput}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          // Cleared so choosing the same file twice still fires a change.
          e.target.value = "";
          if (file) void insertImage(file);
        }}
      />

      <EditorContent editor={editor} />

      {(uploading || note) && (
        <p className={`border-t px-3 py-1.5 text-xs ${note ? "text-cfg-coral" : "text-gray-500"}`}>
          {note || "Uploading image…"}
        </p>
      )}
    </div>
  );
}