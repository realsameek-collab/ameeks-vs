import React, { useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { getSession, Shell, updateSession } from '../utils/shell'

const HOST = 'ameek'
// Oldest output is dropped past this many characters so long-running scripts stay fast
const MAX_CHARS = 200_000
const FONT = "'JetBrains Mono', 'Cascadia Code', 'Fira Code', Consolas, monospace"
const WELCOME = 'Commands run against this project\'s files. Type "help" to see what is available.\n'

const styles = {
    out: 'text-zinc-300',
    file: 'text-zinc-300',
    cmd: 'text-zinc-100',
    err: 'text-rose-400',
    dir: 'font-semibold text-sky-400',
    dim: 'text-zinc-500',
    ok: 'text-emerald-400',
    info: 'font-semibold text-violet-300',
    match: 'font-semibold text-amber-300',
    user: 'font-semibold text-emerald-400',
    path: 'font-semibold text-sky-400',
}

// Merges same-style neighbours so the output stays a short list of spans
const append = (entries, chunks) => {
    const next = [...entries]
    for (const chunk of chunks) {
        const last = next[next.length - 1]
        if (last?.style === chunk.style) next[next.length - 1] = { ...last, text: last.text + chunk.text }
        else next.push(chunk)
    }
    let total = next.reduce((sum, e) => sum + e.text.length, 0)
    while (total > MAX_CHARS && next.length > 1) total -= next.shift().text.length
    return next
}

function Prompt({ user, cwd }) {
    return (
        <span className='shrink-0 whitespace-pre'>
            <span className={styles.user}>{user}@{HOST}</span>
            <span className={styles.dim}>:</span>
            <span className={styles.path}>{cwd}</span>
            <span className={styles.dim}>$ </span>
        </span>
    )
}

function Terminal({ ref, projectId, tree, user, reloadTree, openFile, onExit }) {
    const [session] = useState(() => getSession(projectId, () => ({
        shell: new Shell({ projectId, tree, user }),
        entries: [{ text: WELCOME, style: 'dim' }],
    })))
    const [entries, setEntries] = useState(session.entries)
    const [input, setInput] = useState('')
    const [running, setRunning] = useState(false)
    const [cwd, setCwd] = useState(() => session.shell.displayPath())

    const inputRef = useRef(null)
    const scrollRef = useRef(null)
    const stickRef = useRef(true)
    const pendingRef = useRef([])
    const frameRef = useRef(0)
    const lastCharRef = useRef('\n')
    const controllerRef = useRef(null)
    const historyRef = useRef({ index: null, draft: '' })

    // Output arrives in bursts (e.g. a console.log loop), so render it once per frame
    const write = useCallback((text, style = 'out') => {
        if (!text) return
        pendingRef.current.push({ text, style })
        lastCharRef.current = text[text.length - 1]
        if (frameRef.current) return
        frameRef.current = requestAnimationFrame(() => {
            frameRef.current = 0
            const chunks = pendingRef.current
            pendingRef.current = []
            setEntries(prev => append(prev, chunks))
        })
    }, [])

    const clear = useCallback(() => {
        pendingRef.current = []
        lastCharRef.current = '\n'
        setEntries([])
    }, [])

    const focus = useCallback(() => inputRef.current?.focus(), [])

    useImperativeHandle(ref, () => ({ clear, focus }), [clear, focus])

    useEffect(() => {
        session.shell.setTree(tree)
    }, [session, tree])

    useEffect(() => {
        updateSession(projectId, { entries })
    }, [projectId, entries])

    useEffect(() => {
        if (stickRef.current && scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }, [entries, running])

    useEffect(() => {
        focus()
        // Closing the panel stops whatever is still running
        return () => {
            controllerRef.current?.abort()
            cancelAnimationFrame(frameRef.current)
        }
    }, [focus])

    const echo = (line, suffix = '') => {
        if (lastCharRef.current !== '\n') write('\n')
        write(`${user}@${HOST}`, 'user')
        write(':', 'dim')
        write(cwd, 'path')
        write('$ ', 'dim')
        write(`${line}${suffix}\n`, 'cmd')
    }

    const runLine = async (line) => {
        echo(line)
        setInput('')
        historyRef.current = { index: null, draft: '' }
        stickRef.current = true
        if (!line.trim()) return

        const controller = new AbortController()
        controllerRef.current = controller
        setRunning(true)
        let changed = false
        try {
            changed = await session.shell.run(line, { write, clear, exit: onExit, openFile, signal: controller.signal, user })
        } catch (error) {
            write(`${error?.message || error}\n`, 'err')
        }
        if (controllerRef.current === controller) controllerRef.current = null
        // Keep the Explorer and preview in step with files the command changed
        if (changed) reloadTree?.()
        setCwd(session.shell.displayPath())
        setRunning(false)
    }

    const setCaret = (position) => requestAnimationFrame(() => inputRef.current?.setSelectionRange(position, position))

    const onKeyDown = (e) => {
        const el = e.currentTarget
        const key = e.key.toLowerCase()
        const ctrl = e.ctrlKey || e.metaKey

        if (ctrl && key === 'c' && !e.shiftKey) {
            // With text selected, Ctrl+C copies as usual
            if (window.getSelection()?.toString() || el.selectionStart !== el.selectionEnd) return
            e.preventDefault()
            if (running) {
                controllerRef.current?.abort()
                write('^C\n', 'dim')
            } else {
                echo(input, '^C')
                setInput('')
                historyRef.current = { index: null, draft: '' }
            }
            return
        }
        if (ctrl && key === 'l') {
            e.preventDefault()
            clear()
            return
        }
        if (e.ctrlKey && key === 'u') {
            e.preventDefault()
            setInput(input.slice(el.selectionStart))
            setCaret(0)
            return
        }
        if (e.key === 'Enter') {
            e.preventDefault()
            if (!running) runLine(input)
            return
        }
        if (running) return

        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault()
            const history = session.shell.history
            const state = historyRef.current
            if (e.key === 'ArrowUp') {
                if (!history.length) return
                const index = state.index === null ? history.length - 1 : Math.max(state.index - 1, 0)
                historyRef.current = { index, draft: state.index === null ? input : state.draft }
                setInput(history[index])
                setCaret(history[index].length)
            } else if (state.index !== null) {
                const index = state.index + 1
                const value = index >= history.length ? state.draft : history[index]
                historyRef.current = { index: index >= history.length ? null : index, draft: state.draft }
                setInput(value)
                setCaret(value.length)
            }
            return
        }
        if (e.key === 'Tab') {
            e.preventDefault()
            const caret = el.selectionStart
            const before = input.slice(0, caret)
            const { text, candidates } = session.shell.complete(before)
            if (text === before && candidates.length > 1) {
                // Nothing more to fill in, so list the options like bash does
                echo(input)
                candidates.forEach((c, i) => {
                    write(c.name, c.folder ? 'dir' : 'file')
                    write(i === candidates.length - 1 ? '\n' : '  ')
                })
            }
            setInput(text + input.slice(caret))
            setCaret(text.length)
        }
    }

    return (
        <div
            ref={scrollRef}
            onScroll={(e) => {
                const el = e.currentTarget
                stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 24
            }}
            // Clicking anywhere focuses the prompt, unless the user is selecting output to copy
            onMouseUp={() => !window.getSelection()?.toString() && focus()}
            className='min-h-0 flex-1 cursor-text overflow-y-auto px-4 py-2 text-[12.5px] leading-[1.6] [scrollbar-color:#ffffff1a_transparent] [scrollbar-width:thin]'
            style={{ fontFamily: FONT }}
        >
            <pre className='m-0 whitespace-pre-wrap break-words' style={{ fontFamily: FONT }}>
                {entries.map((entry, i) => (
                    <span key={i} className={styles[entry.style] || styles.out}>{entry.text}</span>
                ))}
            </pre>
            <div className='flex items-baseline'>
                {!running && <Prompt user={user} cwd={cwd} />}
                <input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => {
                        setInput(e.target.value)
                        historyRef.current = { ...historyRef.current, index: null }
                    }}
                    onKeyDown={onKeyDown}
                    spellCheck={false}
                    autoComplete='off'
                    autoCorrect='off'
                    autoCapitalize='off'
                    aria-label='Terminal input'
                    className='min-w-0 flex-1 border-none bg-transparent p-0 text-zinc-100 caret-sky-400 outline-none'
                    style={{ fontFamily: FONT, fontSize: 'inherit', lineHeight: 'inherit' }}
                />
            </div>
        </div>
    )
}

export default Terminal
