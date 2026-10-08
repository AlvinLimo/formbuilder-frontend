import { docToPlain, isSafeHref } from "@/lib/rich-text";
import type { TipTapDoc, TipTapNode } from "@/lib/types";
import type { ReactNode } from "react";

function renderNode(node: TipTapNode, key: string): ReactNode {
  if (node.type === "text") {
    let content: ReactNode = node.text ?? "";
    for (const mark of node.marks ?? []) {
      if (mark.type === "bold") {
        content = <strong key={`${key}-bold`}>{content}</strong>;
      } else if (mark.type === "italic") {
        content = <em key={`${key}-italic`}>{content}</em>;
      } else if (mark.type === "underline") {
        content = <u key={`${key}-underline`}>{content}</u>;
      } else if (mark.type === "link") {
        const href = typeof mark.attrs?.href === "string" ? mark.attrs.href : "";
        if (isSafeHref(href)) {
          content = (
            <a key={`${key}-link`} href={href} target="_blank" rel="noreferrer" className="text-blue-600 underline">
              {content}
            </a>
          );
        }
      }
    }

    return <span key={key}>{content}</span>;
  }

  if (node.type === "hardBreak") {
    return <br key={key} />;
  }

  const children = (node.content ?? []).map((child, index) => renderNode(child, `${key}-${index}`));

  if (node.type === "bulletList") {
    return (
      <ul key={key} className="list-disc space-y-1 pl-5">
        {children}
      </ul>
    );
  }

  if (node.type === "orderedList") {
    return (
      <ol key={key} className="list-decimal space-y-1 pl-5">
        {children}
      </ol>
    );
  }

  if (node.type === "listItem") {
    return <li key={key}>{children}</li>;
  }

  return (
    <p key={key} className="whitespace-pre-wrap">
      {children}
    </p>
  );
}

export function RichTextView({ doc, fallback }: { doc: TipTapDoc | null; fallback?: string | null }) {
  const plain = docToPlain(doc);
  if (!doc || !plain) {
    if (!fallback) {
      return null;
    }

    return <p className="whitespace-pre-wrap">{fallback}</p>;
  }

  return <div className="space-y-1">{(doc.content ?? []).map((node, index) => renderNode(node, `doc-${index}`))}</div>;
}
