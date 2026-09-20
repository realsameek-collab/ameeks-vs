// Token-based syntax highlighter for chat code blocks.
// Monaco is far too heavy to mount once per message, so code blocks are
// scanned with small per-language rules and rendered as coloured spans.

const ALIASES = {
  js: "javascript", jsx: "javascript", mjs: "javascript", cjs: "javascript", node: "javascript",
  ts: "typescript", tsx: "typescript",
  py: "python", python3: "python",
  sh: "shell", bash: "shell", zsh: "shell", console: "shell", terminal: "shell",
  yml: "yaml",
  htm: "html", svg: "html", xml: "html", vue: "html",
  scss: "css", sass: "css", less: "css",
  golang: "go", "c++": "cpp", cxx: "cpp", hpp: "cpp",
  cs: "csharp", rs: "rust", rb: "ruby", kt: "kotlin",
};

const words = (s) => new Set(s.split(" "));

const JS = {
  line: "//",
  block: ["/*", "*/"],
  strings: "'\"`",
  keywords: words(
    "as async await break case catch class const continue debugger default delete do else export extends finally for from function get if implements import in instanceof interface let new of package private protected public readonly return satisfies set static super switch this throw try type typeof var void while with yield"
  ),
  builtins: words(
    "Array Boolean Date Error JSON Map Math Number Object Promise RegExp Set String Symbol console document window process require module exports true false null undefined NaN Infinity"
  ),
  caps: true,
};

const CLIKE = {
  line: "//",
  block: ["/*", "*/"],
  strings: "'\"`",
  keywords: words(
    "abstract as base bool break byte case catch char class const continue default defer delete do double else enum export extends false final finally float fn for foreach func go goto if impl implements import in int interface internal let long match mod mut namespace new nil null override package private protected pub public range readonly ref return self static struct super switch this throw throws trait true try type typeof union unsafe use using var virtual void where while yield"
  ),
  builtins: words("string int32 int64 usize u8 i32 i64 f32 f64 println printf print System Vec Option Result Some None Err Ok echo std"),
  caps: true,
};

const PYTHON = {
  line: "#",
  strings: "'\"",
  triple: true,
  keywords: words(
    "and as assert async await break case class continue def del elif else except finally for from global if import in is lambda match nonlocal not or pass raise return try while with yield"
  ),
  builtins: words(
    "True False None self cls print len range int str float bool list dict set tuple open super isinstance enumerate zip map filter sum min max abs sorted type Exception"
  ),
  caps: true,
};

const RUBY = {
  line: "#",
  strings: "'\"",
  keywords: words(
    "def end class module if elsif else unless while until do then yield return require require_relative attr_accessor begin rescue ensure raise self nil true false and or not"
  ),
  builtins: words("puts print gets new each map select String Integer Array Hash Symbol"),
  caps: true,
};

const SHELL = {
  line: "#",
  strings: "'\"",
  keywords: words("if then else elif fi for while until do done case esac function return in export local source set unset alias"),
  builtins: words(
    "echo cd ls pwd mkdir rm cp mv cat touch grep sed awk find curl wget chmod chown sudo apt brew npm npx yarn pnpm node python python3 pip git docker kubectl make clear exit"
  ),
};

const SQL = {
  line: "--",
  block: ["/*", "*/"],
  strings: "'\"`",
  ci: true,
  keywords: words(
    "select from where insert into values update set delete create table alter drop add column primary key foreign references index view join inner left right outer full on group by order having limit offset union all distinct as and or not null is in between like exists case when then else end asc desc default constraint unique returning"
  ),
  builtins: words("int integer varchar text boolean timestamp date serial uuid jsonb numeric decimal count sum avg min max coalesce now"),
};

const DATA = { line: "#", strings: "'\"", keys: true, builtins: words("true false null yes no on off") };

const LANGS = {
  javascript: JS,
  typescript: JS,
  java: CLIKE, c: CLIKE, cpp: CLIKE, csharp: CLIKE, go: CLIKE, rust: CLIKE,
  php: CLIKE, swift: CLIKE, kotlin: CLIKE, dart: CLIKE,
  python: PYTHON,
  ruby: RUBY,
  shell: SHELL,
  sql: SQL,
  json: { ...DATA, line: null },
  yaml: DATA,
  toml: DATA,
  ini: DATA,
  plaintext: { strings: "", keywords: new Set(), builtins: new Set() },
};

const PUNCT = /[{}()[\];,.:]/;
const WORD_START = /[A-Za-z_$@]/;
const WORD = /[\w$]/;

const nextNonSpace = (code, i) => {
  let j = i;
  while (j < code.length && (code[j] === " " || code[j] === "\t")) j++;
  return code[j] || "";
};

const prevNonSpace = (code, i) => {
  let j = i - 1;
  while (j >= 0 && (code[j] === " " || code[j] === "\t")) j--;
  return j >= 0 ? code[j] : "";
};

// Generic scanner: comments, strings, numbers, words, punctuation
function scan(code, cfg) {
  const tokens = [];
  let i = 0;
  let plain = 0;

  const flush = (end) => {
    if (end > plain) tokens.push({ type: "plain", text: code.slice(plain, end) });
  };
  const emit = (type, end) => {
    flush(i);
    tokens.push({ type, text: code.slice(i, end) });
    i = plain = end;
  };

  while (i < code.length) {
    const ch = code[i];

    if (cfg.line && code.startsWith(cfg.line, i)) {
      const nl = code.indexOf("\n", i);
      emit("comment", nl === -1 ? code.length : nl);
      continue;
    }

    if (cfg.block && code.startsWith(cfg.block[0], i)) {
      const close = code.indexOf(cfg.block[1], i + cfg.block[0].length);
      emit("comment", close === -1 ? code.length : close + cfg.block[1].length);
      continue;
    }

    if (cfg.strings && cfg.strings.includes(ch)) {
      const fence = cfg.triple && code.startsWith(ch.repeat(3), i) ? ch.repeat(3) : ch;
      let j = i + fence.length;
      while (j < code.length) {
        if (code[j] === "\\") { j += 2; continue; }
        if (code.startsWith(fence, j)) { j += fence.length; break; }
        if (code[j] === "\n" && fence.length === 1 && ch !== "`") break;
        j++;
      }
      const end = Math.min(j, code.length);
      // A quoted key in JSON/YAML reads better in the property colour
      emit(cfg.keys && nextNonSpace(code, end) === ":" ? "property" : "string", end);
      continue;
    }

    if (ch >= "0" && ch <= "9" && !WORD.test(code[i - 1] || "")) {
      let j = i;
      while (j < code.length && /[\w.]/.test(code[j])) j++;
      emit("number", j);
      continue;
    }

    if (WORD_START.test(ch)) {
      let j = i + 1;
      while (j < code.length && WORD.test(code[j])) j++;
      const word = code.slice(i, j);
      const lookup = cfg.ci ? word.toLowerCase() : word;
      let type = "plain";
      if (cfg.keywords?.has(lookup)) type = "keyword";
      else if (cfg.builtins?.has(lookup)) type = "builtin";
      else if (prevNonSpace(code, i) === ".") type = "property";
      else if (nextNonSpace(code, j) === "(") type = "function";
      else if (cfg.keys && nextNonSpace(code, j) === ":") type = "property";
      else if (cfg.caps && /^[A-Z]/.test(word)) type = "builtin";
      emit(type, j);
      continue;
    }

    if (PUNCT.test(ch)) {
      emit("punct", i + 1);
      continue;
    }

    i++;
  }

  flush(code.length);
  return tokens;
}

// Markup needs tag/attribute state the generic scanner does not track
function scanMarkup(code) {
  const tokens = [];
  const push = (type, text) => { if (text) tokens.push({ type, text }); };
  let i = 0;

  while (i < code.length) {
    if (code.startsWith("<!--", i)) {
      const close = code.indexOf("-->", i);
      const end = close === -1 ? code.length : close + 3;
      push("comment", code.slice(i, end));
      i = end;
      continue;
    }

    if (code[i] === "<") {
      const close = code.indexOf(">", i);
      const end = close === -1 ? code.length : close + 1;
      const tag = code.slice(i, end);
      let k = tag[1] === "/" ? 2 : 1;
      push("punct", tag.slice(0, k));
      const name = /^[A-Za-z][\w:.-]*/.exec(tag.slice(k));
      if (name) { push("tag", name[0]); k += name[0].length; }
      while (k < tag.length) {
        const rest = tag.slice(k);
        const str = /^(\s*=\s*)("[^"]*"|'[^']*')/.exec(rest);
        if (str) { push("punct", str[1]); push("string", str[2]); k += str[0].length; continue; }
        const attr = /^(\s+)([\w:@.$-]+)/.exec(rest);
        if (attr) { push("plain", attr[1]); push("property", attr[2]); k += attr[0].length; continue; }
        push("punct", tag[k]);
        k += 1;
      }
      i = end;
      continue;
    }

    const next = code.indexOf("<", i);
    const end = next === -1 ? code.length : next;
    push("plain", code.slice(i, end));
    i = end;
  }

  return tokens;
}

// Stylesheets: selectors outside braces, property/value pairs inside
function scanStyles(code) {
  const tokens = [];
  const push = (type, text) => { if (text) tokens.push({ type, text }); };
  let i = 0;
  let depth = 0;

  while (i < code.length) {
    const ch = code[i];

    if (code.startsWith("/*", i)) {
      const close = code.indexOf("*/", i);
      const end = close === -1 ? code.length : close + 2;
      push("comment", code.slice(i, end));
      i = end;
      continue;
    }

    if (ch === '"' || ch === "'") {
      let j = i + 1;
      while (j < code.length && code[j] !== ch) j += code[j] === "\\" ? 2 : 1;
      push("string", code.slice(i, Math.min(j + 1, code.length)));
      i = j + 1;
      continue;
    }

    if (ch === "{" || ch === "}") {
      depth = Math.max(depth + (ch === "{" ? 1 : -1), 0);
      push("punct", ch);
      i++;
      continue;
    }

    if (/[\w@#.$-]/.test(ch)) {
      let j = i + 1;
      while (j < code.length && /[\w%#.$-]/.test(code[j])) j++;
      const text = code.slice(i, j);
      let type = "string";
      if (ch === "@") type = "keyword";
      else if (depth === 0) type = "builtin";
      else if (nextNonSpace(code, j) === ":") type = "property";
      else if (/^[#\d]/.test(text)) type = "number";
      push(type, text);
      i = j;
      continue;
    }

    push(/[:;>+~,()]/.test(ch) ? "punct" : "plain", ch);
    i++;
  }

  return tokens;
}

export const normalizeLanguage = (lang = "") => {
  const key = String(lang).trim().toLowerCase();
  return ALIASES[key] || key;
};

// Returns [{ type, text }] — text keeps its newlines so a <pre> renders it as-is
export function highlight(code, lang) {
  const id = normalizeLanguage(lang);
  if (id === "html") return scanMarkup(code);
  if (id === "css") return scanStyles(code);
  return scan(code, LANGS[id] || LANGS.plaintext);
}

export const TOKEN_CLASS = {
  plain: "text-zinc-300",
  comment: "text-zinc-500 italic",
  string: "text-[#ce9178]",
  number: "text-[#b5cea8]",
  keyword: "text-[#569cd6]",
  builtin: "text-[#4ec9b0]",
  function: "text-[#dcdcaa]",
  property: "text-[#9cdcfe]",
  tag: "text-[#569cd6]",
  punct: "text-zinc-500",
};
