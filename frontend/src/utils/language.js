// Monaco language id and display name for each file extension
const languages = {
  js: ["javascript", "JavaScript"],
  mjs: ["javascript", "JavaScript"],
  cjs: ["javascript", "JavaScript"],
  jsx: ["javascript", "JavaScript JSX"],
  ts: ["typescript", "TypeScript"],
  mts: ["typescript", "TypeScript"],
  cts: ["typescript", "TypeScript"],
  tsx: ["typescript", "TypeScript JSX"],
  html: ["html", "HTML"],
  htm: ["html", "HTML"],
  css: ["css", "CSS"],
  scss: ["scss", "SCSS"],
  sass: ["scss", "Sass"],
  less: ["less", "Less"],
  json: ["json", "JSON"],
  md: ["markdown", "Markdown"],
  markdown: ["markdown", "Markdown"],
  py: ["python", "Python"],
  java: ["java", "Java"],
  c: ["c", "C"],
  h: ["c", "C"],
  cpp: ["cpp", "C++"],
  cc: ["cpp", "C++"],
  cxx: ["cpp", "C++"],
  hpp: ["cpp", "C++"],
  cs: ["csharp", "C#"],
  go: ["go", "Go"],
  rs: ["rust", "Rust"],
  php: ["php", "PHP"],
  rb: ["ruby", "Ruby"],
  swift: ["swift", "Swift"],
  kt: ["kotlin", "Kotlin"],
  kts: ["kotlin", "Kotlin"],
  dart: ["dart", "Dart"],
  lua: ["lua", "Lua"],
  r: ["r", "R"],
  sql: ["sql", "SQL"],
  graphql: ["graphql", "GraphQL"],
  gql: ["graphql", "GraphQL"],
  xml: ["xml", "XML"],
  svg: ["xml", "SVG"],
  yml: ["yaml", "YAML"],
  yaml: ["yaml", "YAML"],
  sh: ["shell", "Shell"],
  bash: ["shell", "Shell"],
  ps1: ["powershell", "PowerShell"],
  bat: ["bat", "Batch"],
  ini: ["ini", "INI"],
  toml: ["ini", "TOML"],
};

const fileNames = {
  dockerfile: ["dockerfile", "Dockerfile"],
  ".env": ["ini", "Environment"],
};

const plaintext = { id: "plaintext", label: "Plain Text" };

export const getLanguage = (name = "") => {
  const fileName = name.toLowerCase();
  const byName = fileNames[fileName] || (fileName.startsWith(".env.") && fileNames[".env"]);
  if (byName) return { id: byName[0], label: byName[1] };

  if (!fileName.includes(".")) return plaintext;
  const match = languages[fileName.split(".").pop()];
  return match ? { id: match[0], label: match[1] } : plaintext;
};
