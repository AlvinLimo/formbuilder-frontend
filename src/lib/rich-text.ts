import type { TipTapDoc, TipTapNode } from "@/lib/types";

const BLOCK_TYPES = new Set([
  "paragraph",
  "heading",
  "listItem",
  "bulletList",
  "orderedList",
  "blockquote",
]);

export function docToPlain(doc: TipTapDoc | TipTapNode | null | undefined): string {
  if (!doc || Array.isArray(doc)) {
    return "";
  }

  const walk = (node: TipTapNode | TipTapDoc): string => {
    if (node.type === "text") {
      return node.text ?? "";
    }

    if (node.type === "hardBreak") {
      return "\n";
    }

    const children = (node.content ?? []).map((child) => walk(child)).join("");
    if (BLOCK_TYPES.has(node.type)) {
      return `${children}\n`;
    }

    return children;
  };

  return walk(doc).replace(/\n{3,}/g, "\n\n").trim();
}

export function plainToDoc(text: string): TipTapDoc {
  const lines = text.length > 0 ? text.split("\n") : [""];
  return {
    type: "doc",
    content: lines.map((line) => ({
      type: "paragraph",
      content: line ? [{ type: "text", text: line }] : [],
    })),
  };
}

export function isSafeHref(href: string) {
  return /^https?:\/\//i.test(href) || /^mailto:/i.test(href);
}
