import React, { useRef, useState } from 'react'
import { motion } from "motion/react"
import { useSelector } from 'react-redux'
import { Eraser, SquareTerminal, Trash2, X } from 'lucide-react'
import Terminal from './Terminal'
import { resetSession } from '../utils/shell'

const MIN_HEIGHT = 120

function PanelButton({ icon: Icon, label, onClick }) {
    return (
        <button
            type="button"
            onClick={onClick}
            title={label}
            aria-label={label}
            className="flex items-center justify-center rounded-md p-1 text-zinc-500 transition-colors hover:bg-white/[0.06] hover:text-zinc-200"
        >
            <Icon size={14} />
        </button>
    )
}

function BottomPanel({ projectId, tree, reloadTree, openFile, onClose }) {
    const { userData } = useSelector(state => state.user)
    const user = (userData?.name || userData?.email?.split('@')[0] || 'user').split(/\s+/)[0].toLowerCase()
    const [height, setHeight] = useState(256)
    const [resizing, setResizing] = useState(false)
    const [session, setSession] = useState(0)
    const terminalRef = useRef(null)
    const dragRef = useRef(null)

    // Drag the top edge to resize, like VS Code's panel
    const onResizeStart = (e) => {
        e.preventDefault()
        e.currentTarget.setPointerCapture(e.pointerId)
        dragRef.current = { y: e.clientY, height }
        setResizing(true)
    }
    const onResizeMove = (e) => {
        if (!dragRef.current) return
        const max = Math.max(window.innerHeight * 0.75, MIN_HEIGHT)
        setHeight(Math.min(Math.max(dragRef.current.height + dragRef.current.y - e.clientY, MIN_HEIGHT), max))
    }
    const onResizeEnd = () => {
        dragRef.current = null
        setResizing(false)
    }

    const killTerminal = () => {
        resetSession(projectId)
        setSession(s => s + 1)
    }

    return (
        <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={resizing ? { duration: 0 } : { duration: 0.2, ease: "easeOut" }}
            className="relative flex shrink-0 flex-col overflow-hidden border-t border-white/[0.06] bg-[#111113]"
        >
            <div
                onPointerDown={onResizeStart}
                onPointerMove={onResizeMove}
                onPointerUp={onResizeEnd}
                onPointerCancel={onResizeEnd}
                className={`absolute inset-x-0 top-0 z-10 h-1 cursor-row-resize transition-colors hover:bg-sky-400/40 ${resizing ? 'bg-sky-400/40' : ''}`}
            />
            <div className="flex h-9 shrink-0 items-center justify-between gap-2 border-b border-white/[0.05] px-3">
                <div className="relative flex h-full items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-200">
                    <SquareTerminal size={13} className="text-sky-400" />
                    Terminal
                    <span className="absolute inset-x-0 bottom-0 h-[2px] rounded-full bg-gradient-to-r from-sky-400 to-violet-400" />
                </div>
                <div className="flex items-center gap-0.5">
                    <span className="mr-2 hidden items-center gap-1.5 text-[11px] text-zinc-500 sm:flex">
                        <span className="size-1.5 rounded-full bg-emerald-500" />
                        bash
                    </span>
                    <PanelButton icon={Eraser} label="Clear Terminal (Ctrl+L)" onClick={() => {
                        terminalRef.current?.clear()
                        terminalRef.current?.focus()
                    }} />
                    <PanelButton icon={Trash2} label="Kill Terminal" onClick={killTerminal} />
                    <PanelButton icon={X} label="Close Panel" onClick={onClose} />
                </div>
            </div>
            <Terminal
                key={session}
                ref={terminalRef}
                projectId={projectId}
                tree={tree}
                user={user}
                reloadTree={reloadTree}
                openFile={openFile}
                onExit={onClose}
            />
        </motion.div>
    )
}

export default BottomPanel
