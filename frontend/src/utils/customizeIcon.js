import { File } from "lucide-react";
import {
  SiPython,
  SiReact,
  SiJavascript,
  SiTypescript,
  SiHtml5,
  SiCss,
  SiJson,
  SiOpenjdk,
  SiCplusplus,
  SiC,
  SiGo,
  SiRust,
  SiPhp,
  SiRuby,
  SiSwift,
  SiKotlin,
  SiMarkdown,
  SiYaml,
  SiDocker,
} from "react-icons/si";

export const getFolderColor = (name = "") => {
  const key = name.toLowerCase();

  const map = {
    src: "text-sky-400",
    public: "text-emerald-400",
    images: "text-pink-400",
    img: "text-pink-400",
    assets: "text-pink-400",
    css: "text-violet-400",
    styles: "text-violet-400",
    js: "text-yellow-400",
    scripts: "text-yellow-400",
    components: "text-sky-400",
    pages: "text-sky-400",
    utils: "text-amber-400",
    hooks: "text-teal-400",
    node_modules: "text-zinc-600",
    dist: "text-zinc-500",
    build: "text-zinc-500",
  };

  return map[key] || "text-sky-400";
};

const fileIcons = {
  py: [SiPython, "text-[#3776AB]"],
  jsx: [SiReact, "text-[#61DAFB]"],
  tsx: [SiReact, "text-[#61DAFB]"],
  js: [SiJavascript, "text-[#F7DF1E]"],
  mjs: [SiJavascript, "text-[#F7DF1E]"],
  cjs: [SiJavascript, "text-[#F7DF1E]"],
  ts: [SiTypescript, "text-[#3178C6]"],
  html: [SiHtml5, "text-[#E34F26]"],
  htm: [SiHtml5, "text-[#E34F26]"],
  css: [SiCss, "text-[#663399]"],
  scss: [SiCss, "text-[#CC6699]"],
  sass: [SiCss, "text-[#CC6699]"],
  json: [SiJson, "text-[#F5A623]"],
  java: [SiOpenjdk, "text-[#ED8B00]"],
  cpp: [SiCplusplus, "text-[#00599C]"],
  cc: [SiCplusplus, "text-[#00599C]"],
  cxx: [SiCplusplus, "text-[#00599C]"],
  c: [SiC, "text-[#A8B9CC]"],
  h: [SiC, "text-[#A8B9CC]"],
  go: [SiGo, "text-[#00ADD8]"],
  rs: [SiRust, "text-[#DEA584]"],
  php: [SiPhp, "text-[#777BB4]"],
  rb: [SiRuby, "text-[#CC342D]"],
  swift: [SiSwift, "text-[#F05138]"],
  kt: [SiKotlin, "text-[#7F52FF]"],
  kts: [SiKotlin, "text-[#7F52FF]"],
  md: [SiMarkdown, "text-zinc-300"],
  markdown: [SiMarkdown, "text-zinc-300"],
  yml: [SiYaml, "text-[#CB171E]"],
  yaml: [SiYaml, "text-[#CB171E]"],
  dockerfile: [SiDocker, "text-[#2496ED]"],
};

export const getFileIcon = (name = "") => {
  const fileName = name.toLowerCase();

  if (fileName === ".env" || fileName.startsWith(".env.")) {
    return { icon: File, color: "text-[#ECD53F]" };
  }

  const extension = fileName.split(".").pop();
  const [icon, color] = fileIcons[extension] || [File, "text-zinc-400"];
  return { icon, color };
};
