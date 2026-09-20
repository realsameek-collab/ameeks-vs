// Minimal CommonMark-ish parser for AmeekAi replies.
// Only the subset a chat answer actually uses: fenced code, headings, lists,
// quotes, tables, rules and inline emphasis/code/links.

const FENCE = /^(\s*)(```+|~~~+)\s*([\w+#-]*)\s*$/;
const HEADING = /^\s{0,3}(#{1,6})\s+(.*)$/;
const RULE = /^\s{0,3}([-*_])(\s*\1){2,}\s*$/;
const QUOTE = /^\s{0,3}>\s?(.*)$/;
const BULLET = /^(\s*)([-*+])\s+(.*)$/;
const NUMBER = /^(\s*)(\d{1,9})[.)]\s+(.*)$/;
const TABLE_ROW = /^\s*\|(.+)\|\s*$/;
const TABLE_DIVIDER = /^\s*\|?[\s:|-]+\|[\s:|-]*$/;

const splitRow = (line) =>
  line
    .replace(/^\s*\|/, "")
    .replace(/\|\s*$/, "")
    .split(/(?<!\\)\|/)
    .map((cell) => cell.trim().replace(/\\\|/g, "|"));

// Inline: `code`, **bold**, *italic*, ~~strike~~, [text](url), bare urls
const INLINE = [
  /(`+)([\s\S]*?)\1/.source,
  /\*\*([\s\S]+?)\*\*/.source,
  /__([\s\S]+?)__/.source,
  /~~([\s\S]+?)~~/.source,
  /\*([^*\n]+?)\*/.source,
  /(?<![\w\\])_([^_\n]+?)_(?![\w])/.source,
  /\[([^\]]*)\]\(([^()\s]+)\)/.source,
  /(https?:\/\/[^\s<>()[\]]+)/.source,
].join("|");

export function parseInline(text = "") {
  const nodes = [];
  let last = 0;
  let match;

  // Built per call: emphasis recurses, and a shared /g regex would share lastIndex
  const pattern = new RegExp(INLINE, "g");
  while ((match = pattern.exec(text)) !== null) {
    const [full, , code, bold, boldAlt, strike, italic, italicAlt, linkText, href, url] = match;
    if (match.index > last) nodes.push({ type: "text", text: text.slice(last, match.index) });

    if (code !== undefined) nodes.push({ type: "code", text: code.trim() });
    else if (bold !== undefined || boldAlt !== undefined) nodes.push({ type: "bold", children: parseInline(bold ?? boldAlt) });
    else if (strike !== undefined) nodes.push({ type: "strike", children: parseInline(strike) });
    else if (italic !== undefined || italicAlt !== undefined) nodes.push({ type: "italic", children: parseInline(italic ?? italicAlt) });
    else if (href !== undefined) nodes.push({ type: "link", href, children: parseInline(linkText || href) });
    else if (url !== undefined) nodes.push({ type: "link", href: url, children: [{ type: "text", text: url }] });

    last = match.index + full.length;
  }

  if (last < text.length) nodes.push({ type: "text", text: text.slice(last) });
  return nodes;
}

export function parseMarkdown(src = "") {
  const lines = String(src).replace(/\r\n?/g, "\n").split("\n");
  const blocks = [];
  let i = 0;

  const paragraph = (buffer) => {
    if (buffer.length) blocks.push({ type: "paragraph", inline: parseInline(buffer.join(" ").trim()) });
    return [];
  };

  let buffer = [];

  while (i < lines.length) {
    const line = lines[i];

    const fence = FENCE.exec(line);
    if (fence) {
      buffer = paragraph(buffer);
      const [, indent, marker, lang] = fence;
      const body = [];
      i++;
      while (i < lines.length && !new RegExp(`^\\s*${marker[0]}{${marker.length},}\\s*$`).test(lines[i])) {
        body.push(lines[i].startsWith(indent) ? lines[i].slice(indent.length) : lines[i]);
        i++;
      }
      i++; // closing fence
      blocks.push({ type: "code", lang, code: body.join("\n").replace(/\n+$/, "") });
      continue;
    }

    if (!line.trim()) {
      buffer = paragraph(buffer);
      i++;
      continue;
    }

    if (RULE.test(line)) {
      buffer = paragraph(buffer);
      blocks.push({ type: "rule" });
      i++;
      continue;
    }

    const heading = HEADING.exec(line);
    if (heading) {
      buffer = paragraph(buffer);
      blocks.push({ type: "heading", level: heading[1].length, inline: parseInline(heading[2].replace(/\s+#+\s*$/, "")) });
      i++;
      continue;
    }

    const quote = QUOTE.exec(line);
    if (quote) {
      buffer = paragraph(buffer);
      const body = [quote[1]];
      i++;
      while (i < lines.length && QUOTE.test(lines[i])) {
        body.push(QUOTE.exec(lines[i])[1]);
        i++;
      }
      blocks.push({ type: "quote", blocks: parseMarkdown(body.join("\n")) });
      continue;
    }

    if (TABLE_ROW.test(line) && i + 1 < lines.length && TABLE_DIVIDER.test(lines[i + 1]) && lines[i + 1].includes("|")) {
      buffer = paragraph(buffer);
      const head = splitRow(line).map(parseInline);
      i += 2;
      const rows = [];
      while (i < lines.length && TABLE_ROW.test(lines[i])) {
        rows.push(splitRow(lines[i]).map(parseInline));
        i++;
      }
      blocks.push({ type: "table", head, rows });
      continue;
    }

    const item = BULLET.exec(line) || NUMBER.exec(line);
    if (item) {
      buffer = paragraph(buffer);
      const ordered = !BULLET.test(line);
      const items = [];
      while (i < lines.length) {
        const next = BULLET.exec(lines[i]) || NUMBER.exec(lines[i]);
        if (next && !BULLET.test(lines[i]) === ordered) {
          items.push({ depth: Math.min(Math.floor(next[1].length / 2), 3), inline: parseInline(next[3]) });
          i++;
          continue;
        }
        // A wrapped continuation line belongs to the item above it
        if (items.length && lines[i].trim() && /^\s{2,}\S/.test(lines[i]) && !FENCE.test(lines[i])) {
          const tail = items[items.length - 1];
          tail.inline = parseInline(`${lines[i].trim()}`).length ? [...tail.inline, { type: "text", text: ` ${lines[i].trim()}` }] : tail.inline;
          i++;
          continue;
        }
        break;
      }
      blocks.push({ type: "list", ordered, start: ordered ? Number(NUMBER.exec(line)[2]) : 1, items });
      continue;
    }

    buffer.push(line.trim());
    i++;
  }

  paragraph(buffer);
  return blocks;
}
