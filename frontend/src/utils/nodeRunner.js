// Runs project JavaScript for the terminal's `node` command inside a Web Worker,
// so a runaway script can always be killed (Ctrl+C) without freezing the editor.

// Serialised into the worker, so it must not reference anything outside itself
function workerMain() {
    let pending = 0
    let mainDone = false
    let finished = false
    const EXIT = Symbol('exit')

    const send = (type, text) => postMessage({ type, text })
    const done = (code) => {
        if (finished) return
        finished = true
        postMessage({ type: 'exit', code })
    }
    const maybeDone = () => {
        // Checked on the next tick so promise callbacks queued by the last task still run
        if (mainDone && pending === 0) realSetTimeout(() => pending === 0 && done(0))
    }
    // Stack frames point into project files only, with lines corrected for the
    // two header lines new Function adds
    const sources = new Set()
    const cleanStack = (error) => {
        const lines = String(error.stack || `${error.name}: ${error.message}`).split('\n')
        return lines
            .filter(line => !/^\s+at /.test(line) || [...sources].some(file => line.includes(`${file}:`)))
            .map(line => line.replace(/([^\s(]+):(\d+):(\d+)/g, (match, file, row, col) => sources.has(file) ? `${file}:${row - 2}:${col}` : match))
            .join('\n')
    }
    const fatal = (error) => {
        if (error === EXIT) return
        send('stderr', `${error instanceof Error ? cleanStack(error) : `Uncaught ${inspect(error)}`}\n`)
        done(1)
    }

    // A small util.inspect: single line, depth limited, handles cycles
    const inspect = (value, depth = 0, seen = new Set(), nested = false) => {
        if (typeof value === 'string') return nested ? `'${value.replace(/'/g, "\\'")}'` : value
        if (typeof value === 'bigint') return `${value}n`
        if (typeof value === 'symbol') return value.toString()
        if (typeof value === 'function') return `[${/^class\s/.test(Function.prototype.toString.call(value)) ? 'class' : 'Function'}: ${value.name || '(anonymous)'}]`
        if (value === null || typeof value !== 'object') return String(value)
        if (value instanceof Error) return value.stack || `${value.name}: ${value.message}`
        if (value instanceof Date) return value.toISOString()
        if (value instanceof RegExp) return value.toString()
        if (seen.has(value)) return '[Circular]'
        if (depth > 2) return Array.isArray(value) ? '[Array]' : '[Object]'
        seen.add(value)
        const next = (v) => inspect(v, depth + 1, seen, true)
        let result
        if (Array.isArray(value)) {
            result = value.length ? `[ ${value.map(next).join(', ')} ]` : '[]'
        } else if (value instanceof Map) {
            result = `Map(${value.size}) { ${[...value].map(([k, v]) => `${next(k)} => ${next(v)}`).join(', ')} }`
        } else if (value instanceof Set) {
            result = `Set(${value.size}) { ${[...value].map(next).join(', ')} }`
        } else if (value instanceof Promise) {
            result = 'Promise { <pending> }'
        } else {
            const keys = Object.keys(value)
            const name = value.constructor && value.constructor !== Object ? `${value.constructor.name} ` : ''
            result = keys.length
                ? `${name}{ ${keys.map(k => `${/^[A-Za-z_$][\w$]*$/.test(k) ? k : `'${k}'`}: ${next(value[k])}`).join(', ')} }`
                : `${name}{}`
        }
        seen.delete(value)
        return result
    }

    const format = (args) => {
        // printf-style placeholders in the first string argument
        if (typeof args[0] === 'string' && /%[sdifoOjc%]/.test(args[0])) {
            let i = 1
            const head = args[0].replace(/%([sdifoOjc%])/g, (match, type) => {
                if (type === '%') return '%'
                if (i >= args.length) return match
                const arg = args[i++]
                if (type === 's') return typeof arg === 'string' ? arg : inspect(arg, 1, new Set(), true)
                if (type === 'd' || type === 'i') return String(type === 'i' ? parseInt(arg) : Number(arg))
                if (type === 'f') return String(parseFloat(arg))
                if (type === 'j') return JSON.stringify(arg)
                if (type === 'c') return ''
                return inspect(arg, 0, new Set(), true)
            })
            const rest = args.slice(i)
            return [head, ...rest.map(a => inspect(a))].join(' ')
        }
        return args.map(a => inspect(a)).join(' ')
    }

    const counts = {}
    const timers = {}
    let indent = ''
    const log = (stream) => (...args) => send(stream, `${format(args).replace(/^/gm, indent)}\n`)
    self.console = {
        log: log('stdout'),
        info: log('stdout'),
        debug: log('stdout'),
        warn: log('stderr'),
        error: log('stderr'),
        trace: log('stderr'),
        dir: (v) => send('stdout', `${indent}${inspect(v, 0, new Set(), true)}\n`),
        table: (v) => send('stdout', `${indent}${inspect(v, 0, new Set(), true)}\n`),
        assert: (ok, ...args) => { if (!ok) send('stderr', `Assertion failed${args.length ? `: ${format(args)}` : ''}\n`) },
        count: (label = 'default') => send('stdout', `${indent}${label}: ${counts[label] = (counts[label] || 0) + 1}\n`),
        countReset: (label = 'default') => { counts[label] = 0 },
        time: (label = 'default') => { timers[label] = performance.now() },
        timeLog: (label = 'default') => send('stdout', `${indent}${label}: ${(performance.now() - timers[label]).toFixed(3)}ms\n`),
        timeEnd: (label = 'default') => {
            send('stdout', `${indent}${label}: ${(performance.now() - timers[label]).toFixed(3)}ms\n`)
            delete timers[label]
        },
        group: (...args) => { if (args.length) log('stdout')(...args); indent += '  ' },
        groupEnd: () => { indent = indent.slice(2) },
        clear: () => {},
    }

    // Track timers and requests so the script "exits" once nothing is left to run, like Node
    const active = new Set()
    const wrap = (fn) => (...args) => {
        try { fn(...args) } catch (error) { fatal(error) }
    }
    const realSetTimeout = self.setTimeout.bind(self)
    const realClearTimeout = self.clearTimeout.bind(self)
    const realSetInterval = self.setInterval.bind(self)
    const realClearInterval = self.clearInterval.bind(self)
    const release = (id) => {
        if (!active.delete(id)) return
        pending--
        maybeDone()
    }
    self.setTimeout = (fn, ms, ...args) => {
        pending++
        const id = realSetTimeout(() => {
            active.delete(id)
            pending--
            wrap(fn)(...args)
            maybeDone()
        }, ms)
        active.add(id)
        return id
    }
    self.clearTimeout = (id) => { realClearTimeout(id); release(id) }
    self.setInterval = (fn, ms, ...args) => {
        pending++
        const id = realSetInterval(() => wrap(fn)(...args), ms)
        active.add(id)
        return id
    }
    self.clearInterval = (id) => { realClearInterval(id); release(id) }
    self.setImmediate = (fn, ...args) => self.setTimeout(fn, 0, ...args)
    self.clearImmediate = self.clearTimeout
    if (self.fetch) {
        const realFetch = self.fetch.bind(self)
        self.fetch = (...args) => {
            pending++
            return realFetch(...args).finally(() => {
                pending--
                realSetTimeout(maybeDone)
            })
        }
    }

    self.addEventListener('unhandledrejection', (event) => {
        event.preventDefault()
        fatal(event.reason)
    })

    self.onmessage = ({ data }) => {
        const { files, entry, code, print, argv, cwd } = data

        const dirname = (path) => path.slice(0, path.lastIndexOf('/')) || '/'
        const normalize = (path) => {
            const parts = []
            for (const part of path.split('/')) {
                if (!part || part === '.') continue
                if (part === '..') parts.pop()
                else parts.push(part)
            }
            return `/${parts.join('/')}`
        }

        self.process = {
            argv: ['node', ...argv],
            env: { NODE_ENV: 'development' },
            platform: 'browser',
            version: 'v20.0.0',
            versions: { node: '20.0.0' },
            cwd: () => cwd,
            exit: (status = 0) => {
                done(status)
                throw EXIT
            },
            nextTick: (fn, ...args) => queueMicrotask(() => wrap(fn)(...args)),
            stdout: { write: (text) => { send('stdout', String(text)); return true } },
            stderr: { write: (text) => { send('stderr', String(text)); return true } },
            on: () => self.process,
            hrtime: Object.assign(
                (prev) => {
                    const now = performance.now()
                    const t = [Math.floor(now / 1000), Math.floor((now % 1000) * 1e6)]
                    return prev ? [t[0] - prev[0], t[1] - prev[1]] : t
                },
                { bigint: () => BigInt(Math.floor(performance.now() * 1e6)) }
            ),
        }
        self.global = self

        const cache = {}
        const load = (filename, source) => {
            if (cache[filename]) return cache[filename].exports
            const module = { exports: {}, filename, loaded: false }
            cache[filename] = module
            if (filename.endsWith('.json')) {
                module.exports = JSON.parse(source)
            } else {
                const localRequire = (spec) => requireFrom(dirname(filename), spec)
                // Strip a shebang line so scripts written for the CLI still run
                const body = source.replace(/^#!.*/, '')
                sources.add(filename)
                const fn =new Function('exports', 'require', 'module', '__filename', '__dirname', `${body}\n//# sourceURL=${filename}`)
                fn.call(module.exports, module.exports, localRequire, module, filename, dirname(filename))
            }
            module.loaded = true
            return module.exports
        }
        const requireFrom = (dir, spec) => {
            if (!/^(\.{1,2})?\//.test(spec)) {
                throw new Error(`Cannot find module '${spec}'\nOnly project files can be required in this terminal (packages are not installed).`)
            }
            const base = normalize(spec.startsWith('/') ? spec : `${dir}/${spec}`)
            const candidates = [base, `${base}.js`, `${base}.cjs`, `${base}.json`, `${base}/index.js`]
            const found = candidates.find(c => Object.prototype.hasOwnProperty.call(files, c))
            if (!found) throw new Error(`Cannot find module '${spec}'`)
            return load(found, files[found])
        }
        self.require = (spec) => requireFrom(cwd, spec)

        try {
            if (entry) {
                load(entry, files[entry])
            } else {
                const filename = `${cwd === '/' ? '' : cwd}/[eval]`
                const source = print ? `module.exports = (${code}\n)` : code
                const result = load(filename, source)
                if (print) send('stdout', `${inspect(result)}\n`)
            }
        } catch (error) {
            fatal(error)
            return
        }
        mainDone = true
        maybeDone()
    }
}

let workerUrl = null

// Resolves with the exit code; aborting the signal kills the worker (exit 130, like Ctrl+C)
export const runNode = ({ files, entry, code, print = false, argv = [], cwd = '/' }, { out, err, signal }) =>
    new Promise((resolve) => {
        workerUrl ||= URL.createObjectURL(new Blob([`(${workerMain.toString()})()`], { type: 'text/javascript' }))
        const worker = new Worker(workerUrl)
        const finish = (status) => {
            worker.terminate()
            signal?.removeEventListener('abort', onAbort)
            resolve(status)
        }
        const onAbort = () => finish(130)
        if (signal?.aborted) return finish(130)
        signal?.addEventListener('abort', onAbort)

        worker.onmessage = ({ data }) => {
            if (data.type === 'stdout') out(data.text)
            else if (data.type === 'stderr') err(data.text)
            else if (data.type === 'exit') finish(data.code)
        }
        worker.onerror = (event) => {
            event.preventDefault()
            err(`${event.message || 'Worker error'}\n`)
            finish(1)
        }
        worker.postMessage({ files, entry, code, print, argv, cwd })
    })
