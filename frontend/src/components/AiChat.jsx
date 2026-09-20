import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowUp, Bug, Eraser, FileText, FlaskConical, Paperclip, RotateCcw, Sparkles, X } from 'lucide-react'
import Markdown from './Markdown'
import { askAmeekAi } from '../features/ai'

const MAX_LINES = 5
const LINE_HEIGHT = 20
const TEXTAREA_PADDING = 16
const MAX_TEXTAREA = MAX_LINES * LINE_HEIGHT + TEXTAREA_PADDING
const MAX_ATTACHMENTS = 5
const MAX_ATTACHMENT_BYTES = 64 * 1024

const QUICK_ACTIONS = [
    { icon: Sparkles, label: 'Explain code', prompt: 'Explain what the code in this file does, step by step.' },
    { icon: Bug, label: 'Fix bugs', prompt: 'Review this project for bugs and tell me how to fix them.' },
    { icon: FlaskConical, label: 'Write a test', prompt: 'Write a unit test for the code I am working on.' },
]

const storageKey = (projectId) => `ameekai:chat:${projectId || 'workspace'}`

// The panel unmounts whenever the Activity Bar toggle is used, so history lives in storage
const loadHistory = (projectId) => {
    try {
        const saved = localStorage.getItem(storageKey(projectId))
        return saved ? JSON.parse(saved).filter((message) => !message.pending) : []
    } catch {
        return []
    }
}

const newId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
const formatSize = (bytes) => (bytes < 1024 ? `${bytes} B` : `${Math.round(bytes / 1024)} KB`)

// A floating mascot for the empty state — blinks and drifts, nothing else
function RobotMark() {
    return (
        <motion.div
            className='relative'
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        >
            <div className='absolute inset-0 rounded-full bg-sky-500/20 blur-2xl' />
            <svg width='78' height='78' viewBox='0 0 78 78' fill='none' className='relative'>
                <defs>
                    <linearGradient id='ameek-bot' x1='14' y1='14' x2='64' y2='66' gradientUnits='userSpaceOnUse'>
                        <stop stopColor='#38bdf8' />
                        <stop offset='1' stopColor='#a78bfa' />
                    </linearGradient>
                </defs>

                <motion.g
                    animate={{ opacity: [0.35, 1, 0.35] }}
                    transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                >
                    <line x1='39' y1='9' x2='39' y2='19' stroke='url(#ameek-bot)' strokeWidth='2' strokeLinecap='round' />
                    <circle cx='39' cy='7' r='3.5' fill='url(#ameek-bot)' />
                </motion.g>

                <rect x='16' y='19' width='46' height='38' rx='13' fill='#17171a' stroke='url(#ameek-bot)' strokeWidth='2' />
                <rect x='24' y='28' width='30' height='19' rx='8' fill='#0b0b0d' />

                <motion.g
                    style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
                    animate={{ scaleY: [1, 1, 0.08, 1] }}
                    transition={{ duration: 3.4, times: [0, 0.82, 0.88, 0.94], repeat: Infinity, ease: 'easeInOut' }}
                >
                    <circle cx='33' cy='37.5' r='3.2' fill='url(#ameek-bot)' />
                    <circle cx='45' cy='37.5' r='3.2' fill='url(#ameek-bot)' />
                </motion.g>

                <rect x='10' y='31' width='5' height='13' rx='2.5' fill='url(#ameek-bot)' opacity='0.65' />
                <rect x='63' y='31' width='5' height='13' rx='2.5' fill='url(#ameek-bot)' opacity='0.65' />
                <path d='M25 62h28' stroke='url(#ameek-bot)' strokeWidth='2' strokeLinecap='round' opacity='0.5' />
                <path d='M31 68h16' stroke='url(#ameek-bot)' strokeWidth='2' strokeLinecap='round' opacity='0.25' />
            </svg>
        </motion.div>
    )
}

function EmptyState({ onPick }) {
    return (
        <div className='flex h-full flex-col items-center justify-center px-5 py-8 text-center'>
            <RobotMark />

            <h2 className='mt-5 bg-gradient-to-b from-white to-zinc-500 bg-clip-text text-2xl font-semibold tracking-tight text-transparent'>
                AmeekAi
            </h2>
            <p className='mt-1.5 max-w-[210px] text-[12px] leading-relaxed text-zinc-500'>
                Your coding companion. Ask about this workspace, or start with one of these.
            </p>

            <div className='mt-5 flex w-full flex-col gap-1.5'>
                {QUICK_ACTIONS.map(({ icon: Icon, label, prompt }, index) => (
                    <motion.button
                        key={label}
                        type='button'
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.06 * index + 0.1, duration: 0.25 }}
                        whileHover={{ x: 2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => onPick(prompt)}
                        className='group flex items-center gap-2 rounded-lg border border-white/[0.07] bg-white/[0.02] px-2.5 py-2
                        text-left text-[12px] font-medium text-zinc-400 transition-colors hover:border-sky-400/25 hover:bg-white/[0.05] hover:text-zinc-100'
                    >
                        <Icon size={13} className='shrink-0 text-zinc-600 transition-colors group-hover:text-sky-400' />
                        {label}
                    </motion.button>
                ))}
            </div>
        </div>
    )
}

function TypingDots() {
    return (
        <div className='flex items-center gap-1 py-1'>
            {[0, 1, 2].map((dot) => (
                <motion.span
                    key={dot}
                    className='size-1.5 rounded-full bg-zinc-500'
                    animate={{ opacity: [0.25, 1, 0.25], y: [0, -2, 0] }}
                    transition={{ duration: 1.1, repeat: Infinity, delay: dot * 0.15, ease: 'easeInOut' }}
                />
            ))}
        </div>
    )
}

function AttachmentChip({ file, onRemove }) {
    return (
        <span className='flex max-w-full items-center gap-1 rounded-md border border-white/[0.08] bg-white/[0.04] py-0.5 pl-1.5 pr-1 text-[10.5px] text-zinc-400'>
            <FileText size={10} className='shrink-0 text-zinc-500' />
            <span className='truncate'>{file.name}</span>
            <span className='shrink-0 text-zinc-600'>{formatSize(file.size)}</span>
            {onRemove && (
                <button
                    type='button'
                    onClick={onRemove}
                    title='Remove attachment'
                    className='shrink-0 rounded p-0.5 text-zinc-600 transition-colors hover:bg-white/[0.08] hover:text-zinc-200'
                >
                    <X size={10} />
                </button>
            )}
        </span>
    )
}

function Message({ message, onRetry }) {
    if (message.role === 'user') {
        return (
            <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className='flex flex-col items-end gap-1'
            >
                <div className='max-w-[88%] rounded-2xl rounded-br-md bg-gradient-to-br from-sky-500 to-violet-500 px-3 py-2 text-[13px] leading-relaxed text-white shadow-lg shadow-sky-500/10 [overflow-wrap:anywhere]'>
                    {message.content}
                </div>
                {message.attachments?.length > 0 && (
                    <div className='flex max-w-[88%] flex-wrap justify-end gap-1'>
                        {message.attachments.map((file) => (
                            <AttachmentChip key={file.name} file={file} />
                        ))}
                    </div>
                )}
            </motion.div>
        )
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className='flex gap-2'
        >
            <div className='mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-sky-500/20 to-violet-500/20 ring-1 ring-white/[0.08]'>
                <Sparkles size={12} className='text-sky-400' />
            </div>

            <div className='min-w-0 flex-1 rounded-2xl rounded-tl-md border border-white/[0.06] bg-white/[0.03] px-3 py-2'>
                {message.pending ? (
                    <TypingDots />
                ) : message.error ? (
                    <div className='flex flex-col items-start gap-1.5'>
                        <p className='text-[12.5px] leading-relaxed text-rose-300/90'>{message.content}</p>
                        <button
                            type='button'
                            onClick={onRetry}
                            className='flex items-center gap-1 rounded-md border border-white/[0.08] px-1.5 py-0.5 text-[11px] font-medium text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-zinc-100'
                        >
                            <RotateCcw size={10} />
                            Retry
                        </button>
                    </div>
                ) : (
                    <Markdown content={message.content} />
                )}
            </div>
        </motion.div>
    )
}

function AiChat({ projectId, onClose }) {
    const [messages, setMessages] = useState(() => loadHistory(projectId))
    const [input, setInput] = useState('')
    const [attachments, setAttachments] = useState([])
    const [sending, setSending] = useState(false)

    const scrollRef = useRef(null)
    const textareaRef = useRef(null)
    const fileInputRef = useRef(null)

    useEffect(() => {
        try {
            localStorage.setItem(storageKey(projectId), JSON.stringify(messages.filter((message) => !message.pending)))
        } catch {
            // Storage full or blocked — the session still works, it just will not persist
        }
    }, [messages, projectId])

    useEffect(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
    }, [messages])

    // Grow with the content up to five lines, then scroll inside the textarea
    useLayoutEffect(() => {
        const node = textareaRef.current
        if (!node) return
        node.style.height = '0px'
        node.style.height = `${Math.min(node.scrollHeight, MAX_TEXTAREA)}px`
        node.style.overflowY = node.scrollHeight > MAX_TEXTAREA ? 'auto' : 'hidden'
    }, [input])

    const send = async (text, files) => {
        const content = text.trim()
        if ((!content && !files.length) || sending) return

        const userMessage = { id: newId(), role: 'user', content, attachments: files.map(({ name, size }) => ({ name, size })) }
        const pendingId = newId()
        const history = [...messages.filter((message) => !message.error), userMessage]

        setMessages([...messages, userMessage, { id: pendingId, role: 'ai', content: '', pending: true }])
        setInput('')
        setAttachments([])
        setSending(true)

        const { reply, error } = await askAmeekAi({
            projectId,
            messages: history.map(({ role, content: body }) => ({ role: role === 'ai' ? 'assistant' : 'user', content: body })),
            attachments: files,
        })

        setMessages((prev) =>
            prev.map((message) =>
                message.id === pendingId
                    ? { id: pendingId, role: 'ai', content: error || reply || 'AmeekAi returned an empty response.', error: Boolean(error) }
                    : message
            )
        )
        setSending(false)
        textareaRef.current?.focus()
    }

    const retry = () => {
        const lastUser = [...messages].reverse().find((message) => message.role === 'user')
        if (!lastUser) return
        // Drop the failed exchange, then replay it
        setMessages((prev) => prev.slice(0, prev.findIndex((message) => message.id === lastUser.id)))
        setTimeout(() => send(lastUser.content, []), 0)
    }

    const onKeyDown = (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault()
            send(input, attachments)
        }
    }

    const attach = async (event) => {
        const picked = Array.from(event.target.files || [])
        event.target.value = ''

        const room = MAX_ATTACHMENTS - attachments.length
        const files = await Promise.all(
            picked.slice(0, Math.max(room, 0)).map(async (file) => ({
                name: file.name,
                size: file.size,
                // Oversized files are still listed, but only the head is sent along
                content: await file.slice(0, MAX_ATTACHMENT_BYTES).text().catch(() => ''),
            }))
        )
        setAttachments((prev) => [...prev, ...files.filter((file) => !prev.some((existing) => existing.name === file.name))])
    }

    const usePrompt = (prompt) => {
        setInput(prompt)
        textareaRef.current?.focus()
    }

    const clear = () => {
        setMessages([])
        setInput('')
        setAttachments([])
        textareaRef.current?.focus()
    }

    const canSend = (input.trim().length > 0 || attachments.length > 0) && !sending

    return (
        <motion.div
            initial={{ opacity: 0, x: 16, width: 0 }}
            animate={{ opacity: 1, x: 0, width: 288 }}
            exit={{ opacity: 0, x: 16, width: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className='flex min-h-0 shrink-0 flex-col overflow-hidden border-l border-white/[0.06] bg-[#111113]/90 backdrop-blur-xl'
        >
            <div className='flex h-10 w-72 shrink-0 items-center justify-between gap-2 border-b border-white/[0.06] px-3'>
                <div className='flex min-w-0 items-center gap-2'>
                    <div className='flex size-5 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-sky-500 to-violet-500'>
                        <Sparkles size={11} className='text-white' />
                    </div>
                    <span className='truncate text-[12px] font-semibold text-zinc-200'>AmeekAi</span>
                    <span className='flex shrink-0 items-center gap-1 text-[10px] font-medium text-zinc-500'>
                        <span className='relative flex size-1.5'>
                            <motion.span
                                className='absolute inline-flex size-full rounded-full bg-emerald-400'
                                animate={{ opacity: [0.6, 0, 0.6], scale: [1, 2.2, 1] }}
                                transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
                            />
                            <span className='relative inline-flex size-1.5 rounded-full bg-emerald-500' />
                        </span>
                        Active
                    </span>
                </div>

                <div className='flex shrink-0 items-center gap-0.5'>
                    <button
                        type='button'
                        onClick={clear}
                        disabled={messages.length === 0}
                        title='Clear Chat'
                        aria-label='Clear Chat'
                        className='rounded-md p-1 text-zinc-500 transition-colors hover:bg-white/[0.06] hover:text-zinc-200 disabled:pointer-events-none disabled:opacity-30'
                    >
                        <Eraser size={14} />
                    </button>
                    {onClose && (
                        <button
                            type='button'
                            onClick={onClose}
                            title='Close AI Chat'
                            aria-label='Close AI Chat'
                            className='rounded-md p-1 text-zinc-500 transition-colors hover:bg-white/[0.06] hover:text-zinc-200'
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>
            </div>

            <div
                ref={scrollRef}
                className='w-72 flex-1 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent
                [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/[0.08]
                hover:[&::-webkit-scrollbar-thumb]:bg-white/[0.15] [&::-webkit-scrollbar-thumb]:transition-colors'
                style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}
            >
                {messages.length === 0 ? (
                    <EmptyState onPick={usePrompt} />
                ) : (
                    <div className='flex flex-col gap-3 px-3 py-3'>
                        {messages.map((message) => (
                            <Message key={message.id} message={message} onRetry={retry} />
                        ))}
                    </div>
                )}
            </div>

            <div className='w-72 shrink-0 border-t border-white/[0.06] bg-[#111113]/95 px-2.5 py-2'>
                <AnimatePresence initial={false}>
                    {attachments.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.15 }}
                            className='flex flex-wrap gap-1 overflow-hidden pb-1.5'
                        >
                            {attachments.map((file, index) => (
                                <AttachmentChip
                                    key={file.name}
                                    file={file}
                                    onRemove={() => setAttachments((prev) => prev.filter((_, i) => i !== index))}
                                />
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className='rounded-xl border border-white/[0.07] bg-white/[0.03] transition-colors focus-within:border-sky-400/40 focus-within:bg-white/[0.05]'>
                    <textarea
                        ref={textareaRef}
                        rows={1}
                        value={input}
                        onChange={(event) => setInput(event.target.value)}
                        onKeyDown={onKeyDown}
                        placeholder='Ask AmeekAi anything...'
                        className='block w-full resize-none bg-transparent px-2.5 py-2 text-[13px] leading-5 text-zinc-200 outline-none
                        placeholder:text-zinc-600 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent
                        [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/[0.08]'
                        style={{ maxHeight: MAX_TEXTAREA, scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}
                    />

                    <div className='flex items-center justify-between gap-2 px-1.5 pb-1.5'>
                        <div className='flex items-center gap-1'>
                            <input ref={fileInputRef} type='file' multiple hidden onChange={attach} />
                            <button
                                type='button'
                                onClick={() => fileInputRef.current?.click()}
                                disabled={attachments.length >= MAX_ATTACHMENTS}
                                title={attachments.length >= MAX_ATTACHMENTS ? `Up to ${MAX_ATTACHMENTS} files` : 'Attach files'}
                                aria-label='Attach files'
                                className='rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-white/[0.06] hover:text-zinc-200 disabled:pointer-events-none disabled:opacity-30'
                            >
                                <Paperclip size={14} />
                            </button>
                            <span className='hidden text-[10px] text-zinc-600 sm:inline'>
                                <kbd className='font-sans'>Shift</kbd> + <kbd className='font-sans'>Enter</kbd> for newline
                            </span>
                        </div>

                        <motion.button
                            type='button'
                            onClick={() => send(input, attachments)}
                            disabled={!canSend}
                            whileHover={canSend ? { scale: 1.06 } : undefined}
                            whileTap={canSend ? { scale: 0.94 } : undefined}
                            title='Send message'
                            aria-label='Send message'
                            className={`flex size-7 shrink-0 items-center justify-center rounded-lg transition-colors ${canSend
                                ? 'bg-gradient-to-br from-sky-500 to-violet-500 text-white shadow-lg shadow-sky-500/20'
                                : 'bg-white/[0.05] text-zinc-600'
                                }`}
                        >
                            {sending ? (
                                <motion.span
                                    className='size-3 rounded-full border-[1.5px] border-zinc-600 border-t-zinc-300'
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
                                />
                            ) : (
                                <ArrowUp size={15} strokeWidth={2.5} />
                            )}
                        </motion.button>
                    </div>
                </div>
            </div>
        </motion.div>
    )
}

export default AiChat
