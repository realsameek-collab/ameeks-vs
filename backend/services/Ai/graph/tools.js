import { tool } from "@langchain/core/tools"
import { z } from "zod"

// The tools AmeekAi can call. They only describe each tool to the model: the user's
// browser runs them, because a project's files may live in a folder on the user's
// device that this server cannot reach. The graph pauses at each tool call, the
// browser executes it through the same file layer the Explorer uses, and the graph
// resumes with the result (see graph.js and controller/ai.controller.js).

const runsInBrowser = () => {
      throw new Error("AmeekAi tools run in the user's browser, not on the server")
}

const path = z.string().describe("Path relative to the project root, e.g. \"src/app.js\". Use \".\" for the root.")

const define = (name, description, schema) => tool(runsInBrowser, { name, description, schema })

export const toolDefinitions = [
      define("list_files", `
List the project's folders and files as paths, with file sizes.
Call it once at the start of a task when you do not know the structure yet.
Folders such as node_modules and .git are listed but not expanded.`,
            z.object({
                  path: path.optional().describe("Only list inside this folder. Defaults to the whole project."),
            })),

      define("read_file", `
Read the full content of one file. Read a file before changing it.`,
            z.object({ path })),

      define("write_file", `
Create a file, or overwrite an existing one, with the COMPLETE content.
Missing parent folders are created automatically.
Never write placeholders like "// rest unchanged": anything left out is deleted.
For a small change to an existing file prefer edit_file.`,
            z.object({
                  path,
                  content: z.string().describe("The complete file content"),
            })),

      define("edit_file", `
Change part of an existing file by replacing an exact piece of text.
"find" must match the file exactly (including indentation) and occur exactly once;
include a few surrounding lines to make it unique. Read the file first.`,
            z.object({
                  path,
                  find: z.string().describe("Exact text currently in the file"),
                  replace: z.string().describe("Text to put in its place"),
            })),

      define("create_folder", `
Create a folder, including any missing parent folders.`,
            z.object({ path })),

      define("rename_path", `
Rename a file or folder in place (same parent folder).`,
            z.object({
                  path,
                  newName: z.string().describe("New name only, not a path, e.g. \"main.js\""),
            })),

      define("delete_path", `
Delete a file or a folder with everything inside it. Irreversible.
Only delete what the user clearly asked to delete.`,
            z.object({ path })),

      define("search_files", `
Search the text of every file. Returns matching lines as path:line: text.`,
            z.object({
                  query: z.string().describe("Text to find, or a regular expression when regex is true"),
                  regex: z.boolean().optional(),
            })),

      define("run_command", `
Run a command in the project's terminal and get its output.
The terminal is a limited bash-like shell locked to the project: ls, cat, grep, find,
tree, wc, head, tail, mkdir, touch, cp, mv, rm, echo with > and >>, pipes, && and ||,
and node <file.js> (CommonJS, project files only; no npm packages).
There is NO npm, git, python or network access. Use it to run and check JavaScript,
not to edit files: use the file tools for that.`,
            z.object({ command: z.string() })),
]

export const toolNames = new Set(toolDefinitions.map((definition) => definition.name))
