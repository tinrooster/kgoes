/**
 * Sanitize HTML from note nodes to prevent XSS via event handlers.
 * Allows rich text plus inline SVG wireframes (mountaintop CAD notes).
 */

const ALLOWED_TAGS = new Set([
  "b",
  "i",
  "u",
  "em",
  "strong",
  "font",
  "ul",
  "ol",
  "li",
  "br",
  "div",
  "span",
  "p",
  "sub",
  "sup",
  // CAD wireframes embedded in notes
  "svg",
  "g",
  "defs",
  "pattern",
  "line",
  "rect",
  "circle",
  "ellipse",
  "path",
  "polyline",
  "polygon",
  "text",
  "tspan",
]);

/** Dropped entirely — do not unwrap (unwrap would leak <style> text into the note). */
const FORBIDDEN_TAGS = new Set([
  "script",
  "style",
  "iframe",
  "object",
  "embed",
  "link",
  "foreignobject",
  "use",
  "image",
  "animate",
  "set",
]);

function isSafeAttrValue(value: string): boolean {
  const v = value.replace(/\s/g, "").toLowerCase();
  if (v.startsWith("javascript:")) return false;
  if (v.includes("expression(")) return false;
  return true;
}

function sanitizeNode(node: Node, doc: Document): Node | null {
  if (node.nodeType === Node.TEXT_NODE) {
    return doc.createTextNode(node.textContent ?? "");
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return null;

  const el = node as Element;
  const tag = el.tagName.toLowerCase();

  if (FORBIDDEN_TAGS.has(tag)) {
    return null;
  }

  if (!ALLOWED_TAGS.has(tag)) {
    const frag = doc.createDocumentFragment();
    for (const child of Array.from(el.childNodes)) {
      const clean = sanitizeNode(child, doc);
      if (clean) frag.appendChild(clean);
    }
    return frag;
  }

  const clean = doc.createElement(tag);

  for (const attr of Array.from(el.attributes)) {
    const name = attr.name.toLowerCase();
    if (name.startsWith("on")) continue;
    if (!isSafeAttrValue(attr.value)) continue;
    if (name === "href" || name === "xlink:href") continue;
    clean.setAttribute(attr.name, attr.value);
  }

  for (const child of Array.from(el.childNodes)) {
    const cleanChild = sanitizeNode(child, doc);
    if (cleanChild) clean.appendChild(cleanChild);
  }

  return clean;
}

export function sanitizeNoteHtml(html: string): string {
  if (!html) return html;
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, "text/html");
  const body = doc.body;
  const frag = document.createDocumentFragment();

  for (const child of Array.from(body.childNodes)) {
    const clean = sanitizeNode(child, document);
    if (clean) frag.appendChild(clean);
  }

  const wrapper = document.createElement("div");
  wrapper.appendChild(frag);
  return wrapper.innerHTML;
}
