// A bash-like shell for the integrated terminal. Project files live in the files
// service rather than on disk, so every command works on the project tree through
// the same API the Explorer uses, and `node` runs scripts in a Web Worker.
import { createFile, createFolder, deleteFile, updateFile } from '../features/file'
import { getLanguage } from './language'
import { runNode } from './nodeRunner'

class ShellError extends Error {}

const isFolder = (node) => node?.type === 'folder'
const byName = (a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'folder' ? -1 : 1)

// ---------- parsing ----------

const OPERATORS = ['&&', '||', '>>', '|', '>', ';', '&']

// $VARS are left as markers and filled in just before each command runs, so
// `cd src && echo $PWD` and `cat x; echo $?` see the values of that moment
const VAR_MARK = ''
// Marked text alternates plain, name, plain, name, ...
const expandVars = (text, vars) => text.split(VAR_MARK).map((part, i) => (i % 2 ? vars(part) : part)).join('')

// Splits a line into words and operators, honouring quotes and escapes.
// Words keep a `glob` flag when they hold an unquoted * or ?.
const tokenize = (line) => {
    const tokens = []
    let word = null
    let glob = false
    const push = () => {
        if (word !== null) tokens.push({ type: 'word', value: word, glob })
        word = null
        glob = false
    }
    const expand = (i) => {
        const match = /^(\?|[A-Za-z_][A-Za-z0-9_]*|\{[A-Za-z_][A-Za-z0-9_]*\})/.exec(line.slice(i + 1))
        if (!match) return ['$', 1]
        return [`${VAR_MARK}${match[1].replace(/[{}]/g, '')}${VAR_MARK}`, match[1].length + 1]
    }

    for (let i = 0; i < line.length;) {
        const c = line[i]
        if (/\s/.test(c)) {
            push()
            i++
        } else if (c === '#' && word === null) {
            break
        } else if (c === "'") {
            const end = line.indexOf("'", i + 1)
            if (end === -1) throw new ShellError("unexpected EOF while looking for matching `''")
            word = (word ?? '') + line.slice(i + 1, end)
            i = end + 1
        } else if (c === '"') {
            let value = ''
            i++
            while (i < line.length && line[i] !== '"') {
                if (line[i] === '\\' && /["\\$`]/.test(line[i + 1] ?? '')) {
                    value += line[i + 1]
                    i += 2
                } else if (line[i] === '$') {
                    const [text, length] = expand(i)
                    value += text
                    i += length
                } else {
                    value += line[i++]
                }
            }
            if (i >= line.length) throw new ShellError('unexpected EOF while looking for matching `"\'')
            word = (word ?? '') + value
            i++
        } else if (c === '\\') {
            word = (word ?? '') + (line[i + 1] ?? '')
            i += 2
        } else if (c === '$') {
            const [text, length] = expand(i)
            word = (word ?? '') + text
            i += length
        } else {
            const op = OPERATORS.find(o => line.startsWith(o, i))
            if (op) {
                push()
                tokens.push({ type: 'op', value: op })
                i += op.length
            } else {
                if (c === '*' || c === '?') glob = true
                word = (word ?? '') + c
                i++
            }
        }
    }
    push()
    return tokens
}

// Groups tokens into pipelines joined by ; && ||, each command with an optional > or >> target
const parse = (tokens) => {
    const lists = []
    let pipeline = []
    let command = { words: [], redirect: null }
    const endCommand = (op) => {
        if (!command.words.length) throw new ShellError(`syntax error near unexpected token \`${op}'`)
        pipeline.push(command)
        command = { words: [], redirect: null }
    }

    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i]
        if (token.type === 'word') {
            command.words.push(token)
        } else if (token.value === '>' || token.value === '>>') {
            const target = tokens[i + 1]
            if (target?.type !== 'word') throw new ShellError(`syntax error near unexpected token \`${target?.value ?? 'newline'}'`)
            command.redirect = { path: target.value, append: token.value === '>>' }
            i++
        } else if (token.value === '|') {
            endCommand('|')
        } else if (token.value === '&') {
            throw new ShellError('background jobs (&) are not supported')
        } else {
            endCommand(token.value)
            lists.push({ pipeline, next: token.value })
            pipeline = []
        }
    }
    if (command.words.length || command.redirect) endCommand('newline')
    if (pipeline.length) lists.push({ pipeline, next: null })
    return lists
}

const globToRegex = (pattern) =>
    new RegExp(`^${pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.')}$`)

const parseFlags = (args, allowed) => {
    const flags = new Set()
    const rest = []
    let ended = false
    for (const arg of args) {
        if (!ended && arg === '--') ended = true
        else if (!ended && /^-[A-Za-z]+$/.test(arg)) {
            for (const f of arg.slice(1)) {
                if (!allowed.includes(f)) throw new ShellError(`invalid option -- '${f}'`)
                flags.add(f)
            }
        } else rest.push(arg)
    }
    return { flags, rest }
}

const splitLines = (text) => {
    const lines = text.split('\n')
    if (lines[lines.length - 1] === '') lines.pop()
    return lines
}

const sleep = (ms, signal) => new Promise((resolve) => {
    const id = setTimeout(resolve, ms)
    signal?.addEventListener('abort', () => { clearTimeout(id); resolve() }, { once: true })
})

const HELP = [
    ['File system', [
        ['ls [-la] [path]', 'List folder contents'],
        ['cd [path]', 'Change folder (cd, cd .., cd /)'],
        ['pwd', 'Print the current folder'],
        ['tree [path]', 'Show the folder tree'],
        ['mkdir [-p] <dir>', 'Create folders'],
        ['touch <file>', 'Create empty files'],
        ['rm [-rf] <path>', 'Delete files or folders'],
        ['rmdir <dir>', 'Delete empty folders'],
        ['mv <src> <dest>', 'Move or rename'],
        ['cp [-r] <src> <dest>', 'Copy files or folders'],
        ['find [path] [-name p] [-type f|d]', 'Search for files'],
    ]],
    ['Text', [
        ['cat <file>', 'Print file contents'],
        ['echo [-n] <text>', 'Print text (use > or >> to write files)'],
        ['head / tail [-n N]', 'First / last lines'],
        ['grep [-rinvc] <pattern> [path]', 'Search file contents'],
        ['wc [-lwc] <file>', 'Count lines, words, characters'],
    ]],
    ['Run', [
        ['node <file.js> [args]', 'Run a JavaScript file (CommonJS)'],
        ['node -e <code> / -p <expr>', 'Evaluate / print JavaScript'],
        ['code <file>', 'Open a file in the editor'],
    ]],
    ['Shell', [
        ['clear', 'Clear the terminal (Ctrl+L)'],
        ['history [-c]', 'Show or clear command history'],
        ['whoami, date, sleep, exit', ''],
    ]],
]

// ---------- shell ----------

export class Shell {
    constructor({ projectId, tree, user }) {
        this.projectId = projectId
        this.user = user || 'user'
        this.cwd = []
        this.status = 0
        this.history = []
        this.setTree(tree)
    }

    // Takes a private copy so commands can update it before the Explorer reloads
    setTree(tree) {
        const nodes = structuredClone(tree || [])
        this.root = nodes.length === 1 && isFolder(nodes[0])
            ? nodes[0]
            : { _id: null, name: '', type: 'folder', children: nodes }
        if (!isFolder(this.lookup(this.cwd))) this.cwd = []
    }

    get projectName() {
        return this.root.name || 'project'
    }

    pwd(segments = this.cwd) {
        return `/${segments.join('/')}`
    }

    // Prompt path, with the project root shown as ~ like a home folder
    displayPath() {
        return this.cwd.length ? `~/${this.cwd.join('/')}` : '~'
    }

    resolve(path = '') {
        const segments = path.startsWith('/') || path === '~' || path.startsWith('~/') ? [] : [...this.cwd]
        for (const part of path.replace(/^~/, '').split('/')) {
            if (!part || part === '.') continue
            if (part === '..') segments.pop()
            else segments.push(part)
        }
        return segments
    }

    lookup(segments) {
        let node = this.root
        for (const name of segments) {
            node = isFolder(node) ? node.children?.find(c => c.name === name) : null
            if (!node) return null
        }
        return node
    }

    stat(path) {
        return this.lookup(this.resolve(path))
    }

    // Unquoted * and ? match names inside one folder, as in bash
    expandGlob(word) {
        if (!word.glob) return [word.value]
        const slash = word.value.lastIndexOf('/')
        const dir = slash === -1 ? '' : word.value.slice(0, slash + 1)
        const pattern = word.value.slice(slash + 1)
        const folder = this.lookup(this.resolve(dir || '.'))
        if (!isFolder(folder) || /[*?]/.test(dir)) return [word.value]
        const regex = globToRegex(pattern)
        const matches = (folder.children || [])
            .filter(c => regex.test(c.name) && (pattern.startsWith('.') || !c.name.startsWith('.')))
            .map(c => dir + c.name)
            .sort()
        return matches.length ? matches : [word.value]
    }

    parentOf(path, command) {
        const segments = this.resolve(path)
        if (!segments.length) throw new ShellError(`${command}: '${path}': Invalid path`)
        const name = segments[segments.length - 1]
        const parent = this.lookup(segments.slice(0, -1))
        if (!parent) throw new ShellError(`${command}: cannot create '${path}': No such file or directory`)
        if (!isFolder(parent)) throw new ShellError(`${command}: cannot create '${path}': Not a directory`)
        if (!parent._id) throw new ShellError(`${command}: this project has no root folder`)
        return { parent, name, segments }
    }

    // ---------- tree mutations (API first, then the local copy) ----------

    insert(parent, doc) {
        const node = { ...doc, children: doc.children || [] }
        parent.children = [...(parent.children || []), node].sort(byName)
        this.changed = true
        return node
    }

    async makeFile(parent, name, content = '') {
        const result = await createFile({ projectId: this.projectId, name, parentId: parent._id, content, language: getLanguage(name).id })
        if (!result || result.error) throw new ShellError(result?.error || `cannot create '${name}'`)
        return this.insert(parent, result)
    }

    async makeFolder(parent, name) {
        const result = await createFolder({ projectId: this.projectId, name, parentId: parent._id })
        if (!result || result.error) throw new ShellError(result?.error || `cannot create '${name}'`)
        return this.insert(parent, result)
    }

    async remove(parent, node) {
        // Deleting a folder hides everything inside it from the tree
        if (!(await deleteFile(node._id))) throw new ShellError(`cannot remove '${node.name}'`)
        parent.children = parent.children.filter(c => c._id !== node._id)
        this.changed = true
    }

    async rename(parent, node, name) {
        const result = await updateFile(node._id, { name })
        if (!result) throw new ShellError(`cannot rename '${node.name}'`)
        node.name = name
        parent.children = [...parent.children].sort(byName)
        this.changed = true
    }

    async writeFile(path, content, append, command) {
        const node = this.stat(path)
        if (isFolder(node)) throw new ShellError(`${command}: ${path}: Is a directory`)
        if (node) {
            const next = append ? (node.content ?? '') + content : content
            const result = await updateFile(node._id, { name: node.name, content: next })
            if (!result) throw new ShellError(`${command}: ${path}: write failed`)
            node.content = next
            node.size = next.length
            node.updatedAt = result.updatedAt
            this.changed = true
            return
        }
        const { parent, name } = this.parentOf(path, command)
        await this.makeFile(parent, name, content)
    }

    // Copies a file or a whole folder into `parent` under `name`
    async copyNode(node, parent, name) {
        if (!isFolder(node)) return this.makeFile(parent, name, node.content ?? '')
        const folder = await this.makeFolder(parent, name)
        for (const child of node.children || []) await this.copyNode(child, folder, child.name)
        return folder
    }

    readText(path, command) {
        const node = this.stat(path)
        if (!node) throw new ShellError(`${command}: ${path}: No such file or directory`)
        if (isFolder(node)) throw new ShellError(`${command}: ${path}: Is a directory`)
        return node.content ?? ''
    }

    // Every file in the project by absolute path, for `node`'s require()
    fileMap() {
        const files = {}
        const walk = (node, path) => {
            for (const child of node.children || []) {
                const childPath = `${path}/${child.name}`
                if (isFolder(child)) walk(child, childPath)
                else files[childPath] = child.content ?? ''
            }
        }
        walk(this.root, '')
        return files
    }

    // ---------- execution ----------

    // io: { write(text, style), clear(), exit(), openFile(node), signal, user }
    async run(line, io) {
        if (io.user) this.user = io.user
        if (line.trim()) this.history.push(line)
        this.changed = false
        try {
            const lists = parse(tokenize(line))
            for (let i = 0; i < lists.length; i++) {
                if (io.signal?.aborted) break
                const previous = lists[i - 1]?.next
                if (previous === '&&' && this.status !== 0) continue
                if (previous === '||' && this.status === 0) continue
                this.status = await this.runPipeline(lists[i].pipeline, io)
            }
        } catch (error) {
            if (!(error instanceof ShellError)) throw error
            io.write(`bash: ${error.message}\n`, 'err')
            this.status = 2
        }
        if (io.signal?.aborted) this.status = 130
        return this.changed
    }

    variable(name) {
        const vars = {
            '?': String(this.status),
            HOME: '/',
            PWD: this.pwd(),
            USER: this.user,
            SHELL: '/bin/bash',
            PROJECT: this.projectName,
        }
        return vars[name] ?? ''
    }

    async runPipeline(pipeline, io) {
        let stdin = ''
        let status = 0
        for (let i = 0; i < pipeline.length; i++) {
            if (io.signal?.aborted) return 130
            const { words, redirect } = pipeline[i]
            const last = i === pipeline.length - 1
            const toTerminal = last && !redirect
            let buffer = ''
            const out = toTerminal ? (text, style) => io.write(text, style) : (text) => { buffer += text }
            const err = (text) => io.write(text, 'err')

            const vars = (name) => this.variable(name)
            const argv = words.flatMap(word => this.expandGlob({ ...word, value: expandVars(word.value, vars) }))
            status = await this.exec(argv, { stdin, out, err, tty: toTerminal, io })

            if (redirect) {
                try {
                    await this.writeFile(expandVars(redirect.path, vars), buffer, redirect.append, 'bash')
                } catch (error) {
                    if (!(error instanceof ShellError)) throw error
                    err(`${error.message}\n`)
                    status = 1
                }
                buffer = ''
            }
            stdin = buffer
        }
        return status
    }

    async exec([name, ...args], ctx) {
        const command = commands[name]
        if (!command) {
            ctx.err(`${name}: command not found\n`)
            return 127
        }
        try {
            return (await command.call(this, args, ctx)) ?? 0
        } catch (error) {
            if (!(error instanceof ShellError)) throw error
            ctx.err(`${error.message.startsWith(`${name}:`) ? '' : `${name}: `}${error.message}\n`)
            return 1
        }
    }

    // Tab completion: command names for the first word, paths afterwards
    complete(text) {
        const match = /(?:^|[\s|;&><])((?:\\.|[^\s|;&><])*)$/.exec(text)
        const raw = match?.[1] ?? ''
        const before = text.slice(0, text.length - raw.length)
        const word = raw.replace(/\\(.)/g, '$1')
        const isCommand = !before.trim() || /(\|\||&&|[|;])\s*$/.test(before)
        const escape = (s) => s.replace(/([\s\\'"$|;&<>*?#])/g, '\\$1')

        let options
        let prefix
        let dir = ''
        if (isCommand && !word.includes('/')) {
            prefix = word
            options = Object.keys(commands).filter(c => c.startsWith(word)).map(c => ({ name: c, suffix: ' ' }))
        } else {
            const slash = word.lastIndexOf('/')
            dir = word.slice(0, slash + 1)
            prefix = word.slice(slash + 1)
            const folder = this.lookup(this.resolve(dir || '.'))
            options = (isFolder(folder) ? folder.children || [] : [])
                .filter(c => c.name.startsWith(prefix) && (prefix.startsWith('.') || !c.name.startsWith('.')))
                .map(c => ({ name: c.name, suffix: isFolder(c) ? '/' : ' ', folder: isFolder(c) }))
        }
        if (!options.length) return { text, candidates: [] }
        if (options.length === 1) {
            return { text: before + escape(dir + options[0].name) + options[0].suffix, candidates: [] }
        }
        let common = options[0].name
        for (const o of options) while (!o.name.startsWith(common)) common = common.slice(0, -1)
        return {
            text: common.length > prefix.length ? before + escape(dir + common) : text,
            candidates: options,
        }
    }
}

// ---------- commands (called with `this` bound to the shell) ----------

const commands = {
    help(args, { out }) {
        out('Commands run against this project\'s files. Pipes (|), redirects (> >>) and && || ; are supported.\n\n', 'dim')
        for (const [section, rows] of HELP) {
            out(`${section}\n`, 'info')
            for (const [usage, text] of rows) {
                out(`  ${usage.padEnd(36)}`, 'cmd')
                out(`${text}\n`, 'dim')
            }
        }
        out('\nKeys: ↑/↓ history · Tab complete · Ctrl+C cancel · Ctrl+L clear\n', 'dim')
    },

    clear(args, { io }) {
        io.clear()
    },

    pwd(args, { out }) {
        out(`${this.pwd()}\n`)
    },

    cd([path = '/', extra]) {
        if (extra !== undefined) throw new ShellError('too many arguments')
        const segments = this.resolve(path)
        const node = this.lookup(segments)
        if (!node) throw new ShellError(`${path}: No such file or directory`)
        if (!isFolder(node)) throw new ShellError(`${path}: Not a directory`)
        this.cwd = segments
    },

    ls(args, { out, err, tty }) {
        const { flags, rest } = parseFlags(args, ['a', 'l', '1', 'A'])
        const paths = rest.length ? rest : ['.']
        const showHidden = flags.has('a') || flags.has('A')
        let status = 0

        const print = (entries) => {
            if (flags.has('l')) {
                for (const n of entries) {
                    const date = n.updatedAt ? new Date(n.updatedAt) : null
                    const stamp = date
                        ? `${date.toLocaleString('en-US', { month: 'short' })} ${String(date.getDate()).padStart(2)} ${date.toTimeString().slice(0, 5)}`
                        : '            '
                    const size = isFolder(n) ? (n.children?.length ?? 0) : (n.size ?? n.content?.length ?? 0)
                    out(`${isFolder(n) ? 'drwxr-xr-x' : '-rw-r--r--'} ${this.user} ${String(size).padStart(7)} ${stamp} `)
                    out(n.name, isFolder(n) ? 'dir' : 'file')
                    out('\n')
                }
            } else if (tty && !flags.has('1')) {
                entries.forEach((n, i) => {
                    out(n.name, isFolder(n) ? 'dir' : 'file')
                    out(i === entries.length - 1 ? '\n' : '  ')
                })
            } else {
                for (const n of entries) out(`${n.name}\n`)
            }
        }

        const files = []
        const folders = []
        for (const path of paths) {
            const node = this.stat(path)
            if (!node) {
                err(`ls: cannot access '${path}': No such file or directory\n`)
                status = 2
            } else if (isFolder(node)) folders.push([path, node])
            else files.push({ ...node, name: path })
        }
        if (files.length) print(files)
        folders.forEach(([path, node], i) => {
            if (paths.length > 1) out(`${files.length || i ? '\n' : ''}${path}:\n`)
            print([...(node.children || [])].sort(byName).filter(c => showHidden || !c.name.startsWith('.')))
        })
        return status
    },

    tree([path = '.'], { out }) {
        const node = this.stat(path)
        if (!node) throw new ShellError(`${path} [error opening dir]`)
        let dirs = 0
        let fileCount = 0
        const walk = (folder, indent) => {
            const children = [...(folder.children || [])].sort(byName)
            children.forEach((child, i) => {
                const last = i === children.length - 1
                out(`${indent}${last ? '└── ' : '├── '}`, 'dim')
                out(child.name, isFolder(child) ? 'dir' : 'file')
                out('\n')
                if (isFolder(child)) {
                    dirs++
                    walk(child, indent + (last ? '    ' : '│   '))
                } else fileCount++
            })
        }
        out(`${path}\n`, 'dir')
        if (isFolder(node)) walk(node, '')
        out(`\n${dirs} director${dirs === 1 ? 'y' : 'ies'}, ${fileCount} file${fileCount === 1 ? '' : 's'}\n`, 'dim')
    },

    cat(args, { out, err, stdin }) {
        if (!args.length) return out(stdin)
        let status = 0
        for (const path of args) {
            try {
                out(this.readText(path, 'cat'))
            } catch (error) {
                err(`${error.message}\n`)
                status = 1
            }
        }
        return status
    },

    echo(args, { out }) {
        const newline = args[0] !== '-n'
        out(`${(newline ? args : args.slice(1)).join(' ')}${newline ? '\n' : ''}`)
    },

    head(args, ctx) {
        return headTail.call(this, 'head', args, ctx)
    },

    tail(args, ctx) {
        return headTail.call(this, 'tail', args, ctx)
    },

    wc(args, { out, stdin }) {
        const { flags, rest } = parseFlags(args, ['l', 'w', 'c', 'm'])
        const pick = flags.size ? flags : new Set(['l', 'w', 'c'])
        const count = (text, label) => {
            const cols = []
            if (pick.has('l')) cols.push((text.match(/\n/g) || []).length)
            if (pick.has('w')) cols.push(text.split(/\s+/).filter(Boolean).length)
            if (pick.has('c') || pick.has('m')) cols.push(text.length)
            out(`${cols.map(c => String(c).padStart(7)).join(' ')}${label ? ` ${label}` : ''}\n`)
        }
        if (!rest.length) return count(stdin, '')
        for (const path of rest) count(this.readText(path, 'wc'), path)
    },

    grep(args, { out, err, stdin, tty }) {
        const { flags, rest } = parseFlags(args, ['r', 'R', 'i', 'n', 'v', 'c', 'l'])
        const [pattern, ...paths] = rest
        if (pattern === undefined) throw new ShellError('usage: grep [-rinvcl] PATTERN [PATH...]')
        let regex
        try {
            regex = new RegExp(pattern, flags.has('i') ? 'gi' : 'g')
        } catch {
            regex = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags.has('i') ? 'gi' : 'g')
        }
        const recursive = flags.has('r') || flags.has('R')
        const sources = []
        const collect = (node, path) => {
            if (!isFolder(node)) return sources.push([path, node.content ?? ''])
            if (!recursive) return err(`grep: ${path}: Is a directory\n`)
            for (const child of [...(node.children || [])].sort(byName)) collect(child, `${path.replace(/\/$/, '')}/${child.name}`)
        }
        if (!paths.length && recursive) paths.push('.')
        if (!paths.length) sources.push([null, stdin])
        for (const path of paths) {
            const node = this.stat(path)
            if (!node) err(`grep: ${path}: No such file or directory\n`)
            else collect(node, path === '.' && recursive ? '.' : path)
        }
        const showName = sources.length > 1 || recursive
        let matched = 0
        for (const [path, text] of sources) {
            let count = 0
            splitLines(text).forEach((line, index) => {
                regex.lastIndex = 0
                if (regex.test(line) === flags.has('v')) return
                count++
                if (flags.has('c') || flags.has('l')) return
                if (showName && path) out(`${path.replace(/^\.\//, '')}:`, 'dir')
                if (flags.has('n')) out(`${index + 1}:`, 'ok')
                if (!tty || flags.has('v')) return out(`${line}\n`)
                // Highlight each match like GNU grep --color
                let last = 0
                for (const m of line.matchAll(regex)) {
                    if (!m[0]) continue
                    out(line.slice(last, m.index))
                    out(m[0], 'match')
                    last = m.index + m[0].length
                }
                out(`${line.slice(last)}\n`)
            })
            if (flags.has('c')) out(`${showName && path ? `${path}:` : ''}${count}\n`)
            else if (flags.has('l') && count) out(`${path ?? '(standard input)'}\n`)
            matched += count
        }
        return matched ? 0 : 1
    },

    find(args, { out }) {
        const start = args[0] && !args[0].startsWith('-') ? args.shift() : '.'
        let name = null
        let type = null
        for (let i = 0; i < args.length; i++) {
            if (args[i] === '-name' || args[i] === '-iname') {
                name = new RegExp(globToRegex(args[++i] ?? '').source, args[i - 1] === '-iname' ? 'i' : '')
            } else if (args[i] === '-type') type = args[++i]
            else throw new ShellError(`unknown predicate '${args[i]}'`)
        }
        const node = this.stat(start)
        if (!node) throw new ShellError(`'${start}': No such file or directory`)
        const walk = (n, path) => {
            if ((!name || name.test(n.name)) && (!type || (type === 'd') === isFolder(n))) out(`${path}\n`)
            if (isFolder(n)) for (const child of [...(n.children || [])].sort(byName)) walk(child, `${path.replace(/\/$/, '')}/${child.name}`)
        }
        walk(node, start)
    },

    async touch(args) {
        if (!args.length) throw new ShellError('missing file operand')
        for (const path of args) {
            if (this.stat(path)) continue
            const { parent, name } = this.parentOf(path, 'touch')
            await this.makeFile(parent, name)
        }
    },

    async mkdir(args, { err }) {
        const { flags, rest } = parseFlags(args, ['p'])
        if (!rest.length) throw new ShellError('missing operand')
        let status = 0
        for (const path of rest) {
            const segments = this.resolve(path)
            if (flags.has('p')) {
                let node = this.root
                for (const part of segments) {
                    const child = node.children?.find(c => c.name === part)
                    if (child && !isFolder(child)) throw new ShellError(`cannot create directory '${path}': Not a directory`)
                    node = child || await this.makeFolder(node, part)
                }
                continue
            }
            if (this.lookup(segments)) {
                err(`mkdir: cannot create directory '${path}': File exists\n`)
                status = 1
                continue
            }
            const { parent, name } = this.parentOf(path, 'mkdir')
            await this.makeFolder(parent, name)
        }
        return status
    },

    async rm(args, { err }) {
        const { flags, rest } = parseFlags(args, ['r', 'R', 'f', 'd', 'v'])
        if (!rest.length && !flags.has('f')) throw new ShellError('missing operand')
        let status = 0
        for (const path of rest) {
            const segments = this.resolve(path)
            const node = this.lookup(segments)
            if (!segments.length) throw new ShellError(`it is dangerous to operate recursively on '/'\nrm: refusing to remove the project root`)
            if (!node) {
                if (!flags.has('f')) {
                    err(`rm: cannot remove '${path}': No such file or directory\n`)
                    status = 1
                }
                continue
            }
            const recursive = flags.has('r') || flags.has('R')
            if (isFolder(node) && !recursive && !(flags.has('d') && !node.children?.length)) {
                err(`rm: cannot remove '${path}': Is a directory\n`)
                status = 1
                continue
            }
            // Removing the current folder (or one above it) moves the shell up, out of it
            if (segments.every((part, i) => this.cwd[i] === part)) this.cwd = segments.slice(0, -1)
            await this.remove(this.lookup(segments.slice(0, -1)), node)
        }
        return status
    },

    async rmdir(args) {
        if (!args.length) throw new ShellError('missing operand')
        for (const path of args) {
            const segments = this.resolve(path)
            const node = this.lookup(segments)
            if (!node) throw new ShellError(`failed to remove '${path}': No such file or directory`)
            if (!isFolder(node)) throw new ShellError(`failed to remove '${path}': Not a directory`)
            if (node.children?.length) throw new ShellError(`failed to remove '${path}': Directory not empty`)
            if (!segments.length) throw new ShellError(`failed to remove '${path}': Device or resource busy`)
            await this.remove(this.lookup(segments.slice(0, -1)), node)
        }
    },

    async mv(args) {
        return moveOrCopy.call(this, 'mv', args)
    },

    async cp(args) {
        return moveOrCopy.call(this, 'cp', args)
    },

    async node(args, { out, err, io }) {
        if (!args.length) throw new ShellError('the interactive REPL is not available here; try node <file.js> or node -e "code"')
        const [first, ...rest] = args
        if (first === '-v' || first === '--version') return out('v20.0.0 (browser sandbox)\n')
        const options = { files: this.fileMap(), cwd: this.pwd(), argv: [] }
        if (first === '-e' || first === '--eval' || first === '-p' || first === '--print') {
            if (rest[0] === undefined) throw new ShellError(`${first} requires an argument`)
            Object.assign(options, { code: rest[0], print: first.startsWith('-p') || first === '--print', argv: rest.slice(1) })
        } else {
            const segments = this.resolve(first)
            const node = this.lookup(segments)
            if (!node) throw new ShellError(`Cannot find module '${this.pwd(segments)}'`)
            if (isFolder(node)) throw new ShellError(`'${first}' is a directory`)
            if (/^\s*(import|export)\s/m.test(node.content ?? '')) {
                err(`${first}: ES module syntax (import/export) is not supported here, use require() and module.exports\n`)
                return 1
            }
            Object.assign(options, { entry: this.pwd(segments), argv: [this.pwd(segments), ...rest] })
        }
        return runNode(options, { out, err, signal: io.signal })
    },

    code([path], { io }) {
        if (!path) throw new ShellError('missing file operand')
        const node = this.stat(path)
        if (!node) throw new ShellError(`${path}: No such file or directory`)
        if (isFolder(node)) throw new ShellError(`${path}: Is a directory`)
        io.openFile(node)
    },

    history(args, { out }) {
        if (args[0] === '-c') {
            this.history = []
            return
        }
        const width = String(this.history.length).length + 2
        this.history.forEach((line, i) => out(`${String(i + 1).padStart(width)}  ${line}\n`))
    },

    whoami(args, { out }) {
        out(`${this.user}\n`)
    },

    date(args, { out }) {
        out(`${new Date().toString()}\n`)
    },

    async sleep([seconds], { io }) {
        const value = Number(seconds)
        if (!seconds || Number.isNaN(value)) throw new ShellError(`invalid time interval '${seconds ?? ''}'`)
        await sleep(value * 1000, io.signal)
    },

    exit(args, { io }) {
        io.exit()
    },

    true() {
        return 0
    },

    false() {
        return 1
    },
}
commands.cls = commands.clear

function headTail(name, args, { out, stdin }) {
    let count = 10
    const paths = []
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '-n') count = Number(args[++i])
        else if (/^-\d+$/.test(args[i])) count = Number(args[i].slice(1))
        else paths.push(args[i])
    }
    if (Number.isNaN(count)) throw new ShellError('invalid number of lines')
    const print = (text) => {
        const lines = splitLines(text)
        const picked = name === 'head' ? lines.slice(0, count) : lines.slice(Math.max(lines.length - count, 0))
        if (picked.length) out(`${picked.join('\n')}\n`)
    }
    if (!paths.length) return print(stdin)
    paths.forEach((path, i) => {
        if (paths.length > 1) out(`${i ? '\n' : ''}==> ${path} <==\n`)
        print(this.readText(path, name))
    })
}

async function moveOrCopy(name, args) {
    const { flags, rest } = parseFlags(args, name === 'cp' ? ['r', 'R', 'f'] : ['f'])
    if (rest.length < 2) throw new ShellError(`missing destination file operand after '${rest[0] ?? ''}'`)
    const target = rest.pop()
    const targetNode = this.stat(target)
    if (rest.length > 1 && !isFolder(targetNode)) throw new ShellError(`target '${target}' is not a directory`)

    for (const source of rest) {
        const segments = this.resolve(source)
        const node = this.lookup(segments)
        if (!node) throw new ShellError(`cannot stat '${source}': No such file or directory`)
        if (!segments.length) throw new ShellError(`cannot ${name === 'mv' ? 'move' : 'copy'} the project root`)
        if (name === 'cp' && isFolder(node) && !flags.has('r') && !flags.has('R')) {
            throw new ShellError(`-r not specified; omitting directory '${source}'`)
        }
        const sourceParent = this.lookup(segments.slice(0, -1))

        // Into an existing folder keeps the name; otherwise the target is the new path
        let parent
        let newName
        if (isFolder(targetNode)) {
            parent = targetNode
            newName = node.name
        } else {
            ({ parent, name: newName } = this.parentOf(target, name))
        }
        const targetSegments = [...this.resolve(target), ...(isFolder(targetNode) ? [newName] : [])]
        if (isFolder(node) && targetSegments.slice(0, segments.length).join('/') === segments.join('/')) {
            throw new ShellError(`cannot ${name === 'mv' ? 'move' : 'copy'} '${source}' to a subdirectory of itself`)
        }

        const existing = parent.children?.find(c => c.name === newName)
        if (existing === node) continue
        if (existing) {
            if (isFolder(existing) || isFolder(node)) throw new ShellError(`cannot overwrite '${target}': File exists`)
            await this.remove(parent, existing)
        }

        if (name === 'mv' && parent === sourceParent) {
            await this.rename(parent, node, newName)
        } else {
            // The files service has no move endpoint, so a move is a copy plus delete
            await this.copyNode(node, parent, newName)
            if (name === 'mv') await this.remove(sourceParent, node)
        }
    }
}

// ---------- sessions ----------

// Terminal sessions outlive the panel, so closing and reopening it keeps the output
const sessions = new Map()

export const getSession = (projectId, create) => {
    if (!sessions.has(projectId)) sessions.set(projectId, create())
    return sessions.get(projectId)
}

export const updateSession = (projectId, patch) => {
    if (sessions.has(projectId)) Object.assign(sessions.get(projectId), patch)
}

export const resetSession = (projectId) => {
    sessions.delete(projectId)
}
