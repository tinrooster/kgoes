import { patchPanelCircuits, port, ports, trunkPort } from "./devices/_helpers";
import type { DeviceTemplate } from "./types";

const KGO_ID_RE = /id:\s*["'](kgo-[a-z]{2}-\d{4}[^"']+)["']/;

export function extractKgoTemplateBlocks(source: string): string[] {
  const cleaned = source
    .replace(/^\s*export\s+const\s+\w+[^=]*=\s*/gm, "")
    .replace(/^\s*export\s+const\s+templates[^=]*=\s*\[?/gm, "")
    .trim();

  const blocks: string[] = [];
  let i = 0;
  while (i < cleaned.length) {
    const slice = cleaned.slice(i);
    const idMatch = KGO_ID_RE.exec(slice);
    if (!idMatch) break;
    const idIdx = idMatch.index ?? 0;
    const absIdIdx = i + idIdx;
    let start = cleaned.lastIndexOf("{", absIdIdx);
    if (start === -1) {
      i = absIdIdx + 3;
      continue;
    }
    let depth = 0;
    let end = start;
    for (let j = start; j < cleaned.length; j++) {
      const ch = cleaned[j];
      if (ch === "{") depth += 1;
      else if (ch === "}") {
        depth -= 1;
        if (depth === 0) {
          end = j + 1;
          break;
        }
      }
    }
    const block = cleaned.slice(start, end).trim();
    if (KGO_ID_RE.test(block)) blocks.push(block);
    i = end;
  }
  return blocks;
}

function inlineStringConstRefs(block: string, source: string): string {
  const map = new Map<string, string>();
  const re = /^const\s+([A-Z][A-Z0-9_]*)\s*=\s*(["'])([a-z0-9-]+)\2\s*;/gm;
  for (const m of source.matchAll(re)) {
    map.set(m[1], m[3]);
  }
  let next = block;
  for (const [name, value] of map) {
    next = next.replace(new RegExp(`\\b${name}\\b`, "g"), `"${value}"`);
  }
  return next;
}

export function compileTemplateBlock(block: string, source: string): DeviceTemplate {
  const inlined = inlineStringConstRefs(block, source);
  return new Function(
    "port",
    "ports",
    "patchPanelCircuits",
    "trunkPort",
    `return (${inlined})`,
  )(port, ports, patchPanelCircuits, trunkPort) as DeviceTemplate;
}

export function importKgoTemplateSource(source: string): DeviceTemplate[] {
  const blocks = extractKgoTemplateBlocks(source);
  const templates: DeviceTemplate[] = [];
  const errors: string[] = [];
  for (const block of blocks) {
    try {
      templates.push(compileTemplateBlock(block, source));
    } catch (e) {
      const id = KGO_ID_RE.exec(block)?.[1] ?? "?";
      errors.push(`${id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  if (templates.length === 0 && errors.length > 0) {
    throw new Error(errors.slice(0, 3).join("; "));
  }
  return templates;
}

export function injectKgoDeviceAddTag(source: string): string {
  return source.replace(/searchTerms:\s*\[([\s\S]*?)\]/g, (match, inner) => {
    if (inner.includes("kgo-es-deviceadd")) return match;
    const trimmed = inner.trimEnd();
    const separator = trimmed.endsWith(",") ? " " : ", ";
    return match.replace(inner, `${trimmed}${separator}"kgo-es-deviceadd"`);
  });
}
