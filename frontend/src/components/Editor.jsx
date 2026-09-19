import { AnimatePresence, motion, Reorder } from 'motion/react'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useMonaco } from '@monaco-editor/react'
import { AlertCircle, Check, ChevronRight, FileCode2, LoaderCircle, Save, X } from 'lucide-react'
import { getFileIcon } from '../utils/customizeIcon'
import { getLanguage } from '../utils/language'
import { updateFile } from '../features/file'
import CodeEditor from './CodeEditor'

// Each open file gets its own Monaco model, so undo history survives tab switches
const modelPath = (tab) => `file:///${tab._id}/${tab.name}`

// Maps every node id to its full path and parent folder name
const buildPathMap = (nodes, parents = [], map = new Map()) => {
    for (const node of nodes || []) {
        map.set(node._id, { path: [...parents, node.name].join('/'), parentName: parents[parents.length - 1] })
        if (node.children?.length) buildPathMap(node.children, [...parents, node.name], map)
    }
    return map
}

function Editor({
    tree,
    activeTab,
    openTabs,
    setOpenTabs,
    setActiveTab,
    drafts,
    setDrafts,
    onSaved
}) {
    const monaco = useMonaco()
    const scrollRef = useRef(null)
    const groupRef = useRef(null)
    const spacerRef = useRef(null)
    const menuRef = useRef(null)
    const tabRefs = useRef(new Map())
    const [edges, setEdges] = useState({ left: false, right: false })
    const [draggingId, setDraggingId] = useState(null)
    const [menu, setMenu] = useState(null)
    const [saveState, setSaveState] = useState('idle') // idle | saving | saved | error
    const [cursor, setCursor] = useState({ line: 1, column: 1, selected: 0 })
    const saveRef = useRef(null)
    const saveTimer = useRef(null)

    const activeId = activeTab?._id
    // openTabs holds the latest saved content; activeTab can be a stale copy from the tree
    const current = openTabs.find(t => t._id === activeId) || activeTab
    const language = getLanguage(current?.name)

    const isDirty = (tab) => drafts[tab._id] !== undefined && drafts[tab._id] !== (tab.content ?? '')
    const activeDirty = !!current && isDirty(current)

    const pathMap = useMemo(() => buildPathMap(tree), [tree])
    const breadcrumbs = (pathMap.get(activeId)?.path || current?.name || '').split('/')

    // Names opened more than once get their parent folder shown, like VS Code
    const duplicateNames = useMemo(() => {
        const counts = {}
        openTabs.forEach(t => { counts[t.name] = (counts[t.name] || 0) + 1 })
        return new Set(Object.keys(counts).filter(name => counts[name] > 1))
    }, [openTabs])

    // Closes the given tabs; if the active one is closed, activate its right neighbour (or left)
    const closeTabs = (ids) => {
        const unsaved = openTabs.filter(t => ids.includes(t._id) && isDirty(t))
        if (unsaved.length && !window.confirm(`${unsaved.map(t => t.name).join(', ')} ${unsaved.length > 1 ? 'have' : 'has'} unsaved changes. Close anyway?`)) return

        const closing = new Set(ids)
        // Discard the closed files' edits so reopening one shows its saved content
        openTabs.filter(t => closing.has(t._id)).forEach(t => monaco?.editor.getModel(monaco.Uri.parse(modelPath(t)))?.dispose())
        setDrafts(d => Object.fromEntries(Object.entries(d).filter(([id]) => !closing.has(id))))
        setOpenTabs(openTabs.filter(t => !closing.has(t._id)))
        if (!activeId || !closing.has(activeId)) return
        const index = openTabs.findIndex(t => t._id === activeId)
        const next = openTabs.slice(index + 1).find(t => !closing.has(t._id))
            || openTabs.slice(0, index).reverse().find(t => !closing.has(t._id))
        setActiveTab(next || null)
    }

    const updateEdges = useCallback(() => {
        const container = scrollRef.current
        if (!container) return
        setEdges({
            left: container.scrollLeft > 1,
            right: container.scrollLeft + container.clientWidth < container.scrollWidth - 1
        })
    }, [])

    useEffect(() => {
        const frame = requestAnimationFrame(updateEdges)
        const observer = new ResizeObserver(updateEdges)
        if (scrollRef.current) observer.observe(scrollRef.current)
        if (groupRef.current) observer.observe(groupRef.current)
        return () => {
            cancelAnimationFrame(frame)
            observer.disconnect()
        }
    }, [updateEdges, openTabs.length])

    // Keep the active tab visible, leaving room for the Editor/Preview toggle on the right
    useEffect(() => {
        const container = scrollRef.current
        const el = activeId && tabRefs.current.get(activeId)
        if (!container || !el) return
        const reserved = spacerRef.current?.offsetWidth || 0
        const left = el.offsetLeft
        const right = left + el.offsetWidth
        const visibleRight = container.scrollLeft + container.clientWidth - reserved
        if (left < container.scrollLeft) {
            container.scrollTo({ left: left - 8, behavior: 'smooth' })
        } else if (right > visibleRight) {
            container.scrollTo({ left: right - container.clientWidth + reserved + 8, behavior: 'smooth' })
        }
    }, [activeId, openTabs.length])

    useEffect(() => {
        if (!menu) return
        const close = (e) => {
            if (e?.target && menuRef.current?.contains(e.target)) return
            setMenu(null)
        }
        const onKey = (e) => e.key === 'Escape' && setMenu(null)
        window.addEventListener('pointerdown', close)
        window.addEventListener('resize', close)
        window.addEventListener('blur', close)
        window.addEventListener('keydown', onKey)
        return () => {
            window.removeEventListener('pointerdown', close)
            window.removeEventListener('resize', close)
            window.removeEventListener('blur', close)
            window.removeEventListener('keydown', onKey)
        }
    }, [menu])

    // Let a normal mouse wheel scroll the tab strip sideways
    const onWheel = (e) => {
        if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) scrollRef.current.scrollLeft += e.deltaY
    }

    const onTabKeyDown = (e, index) => {
        let target
        if (e.key === 'ArrowRight') target = openTabs[(index + 1) % openTabs.length]
        else if (e.key === 'ArrowLeft') target = openTabs[(index - 1 + openTabs.length) % openTabs.length]
        else if (e.key === 'Home') target = openTabs[0]
        else if (e.key === 'End') target = openTabs[openTabs.length - 1]
        else if (e.key === 'Delete') {
            e.preventDefault()
            closeTabs([openTabs[index]._id])
            return
        }
        if (!target) return
        e.preventDefault()
        setActiveTab(target)
        tabRefs.current.get(target._id)?.focus()
    }

    const openMenu = (e, tab) => {
        e.preventDefault()
        setMenu({
            tab,
            x: Math.min(e.clientX, window.innerWidth - 208),
            y: Math.min(e.clientY, window.innerHeight - 200)
        })
    }

    const menuItems = menu ? (() => {
        const index = openTabs.findIndex(t => t._id === menu.tab._id)
        const path = pathMap.get(menu.tab._id)?.path || menu.tab.name
        return [
            { label: 'Close', hint: 'Del', action: () => closeTabs([menu.tab._id]) },
            { label: 'Close Others', disabled: openTabs.length < 2, action: () => closeTabs(openTabs.filter(t => t._id !== menu.tab._id).map(t => t._id)) },
            { label: 'Close to the Right', disabled: index === openTabs.length - 1, action: () => closeTabs(openTabs.slice(index + 1).map(t => t._id)) },
            { label: 'Close All', action: () => closeTabs(openTabs.map(t => t._id)) },
            { divider: true },
            { label: 'Copy Path', action: () => navigator.clipboard?.writeText(path) },
        ]
    })() : []

    const save = async () => {
        if (!current || saveState === 'saving' || !activeDirty) return
        const tab = current
        const content = drafts[tab._id]
        clearTimeout(saveTimer.current)
        setSaveState('saving')
        // updateFile returns null instead of throwing when the request fails
        const result = await updateFile(tab._id, { name: tab.name, content })
        setSaveState(result ? 'saved' : 'error')
        saveTimer.current = setTimeout(() => setSaveState('idle'), result ? 1500 : 3000)
        if (!result) return
        setOpenTabs((tabs) => tabs.map((t) => t._id === tab._id ? { ...t, content } : t))
        setActiveTab((active) => active?._id === tab._id ? { ...active, content } : active)
        onSaved?.()
    }

    // Ctrl/Cmd+S saves from anywhere on the page, including the tab strip
    useEffect(() => {
        saveRef.current = save
    })
    useEffect(() => {
        const onKey = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
                e.preventDefault()
                saveRef.current?.()
            }
        }
        window.addEventListener('keydown', onKey)
        return () => {
            window.removeEventListener('keydown', onKey)
            clearTimeout(saveTimer.current)
        }
    }, [])

    return (
        <div className='relative flex min-w-0 flex-1 flex-col bg-[#0a0a0c]'>
            <div className='relative h-10 shrink-0 border-b border-white/[0.06] bg-[#111113]/90'>
                <div
                    ref={scrollRef}
                    onScroll={updateEdges}
                    onWheel={onWheel}
                    className='relative flex h-full overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
                >
                    <Reorder.Group
                        ref={groupRef}
                        as='div'
                        axis='x'
                        values={openTabs}
                        onReorder={setOpenTabs}
                        role='tablist'
                        aria-label='Open files'
                        className='flex h-full'
                    >
                        <AnimatePresence initial={false}>
                            {openTabs.map((tab, index) => {
                                const active = activeId === tab._id
                                const { icon: Icon, color } = getFileIcon(tab.name)
                                const info = pathMap.get(tab._id)
                                const showParent = duplicateNames.has(tab.name) && info?.parentName
                                const dirty = isDirty(tab)
                                return (
                                    <Reorder.Item
                                        key={tab._id}
                                        value={tab}
                                        as='div'
                                        ref={(el) => {
                                            if (el) tabRefs.current.set(tab._id, el)
                                            else tabRefs.current.delete(tab._id)
                                        }}
                                        role='tab'
                                        aria-selected={active}
                                        tabIndex={active ? 0 : -1}
                                        title={info?.path || tab.name}
                                        initial={{ opacity: 0, y: 4 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, width: 0, paddingLeft: 0, paddingRight: 0 }}
                                        transition={{ duration: 0.15 }}
                                        onDragStart={() => setDraggingId(tab._id)}
                                        onDragEnd={() => setDraggingId(null)}
                                        onMouseDown={(e) => {
                                            if (e.button === 0) setActiveTab(tab)
                                            // Stop the browser's autoscroll cursor on middle click
                                            if (e.button === 1) e.preventDefault()
                                        }}
                                        onAuxClick={(e) => e.button === 1 && closeTabs([tab._id])}
                                        onContextMenu={(e) => openMenu(e, tab)}
                                        onKeyDown={(e) => onTabKeyDown(e, index)}
                                        className={`group relative flex h-full shrink-0 cursor-pointer select-none items-center gap-2 whitespace-nowrap border-r border-white/[0.05] pl-3.5 pr-2 outline-none transition-colors focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-sky-500/60
                                            ${active ? 'bg-[#0a0a0c] text-white' : 'text-zinc-500 hover:bg-white/[0.03] hover:text-zinc-300'}
                                            ${draggingId === tab._id ? 'cursor-grabbing bg-[#1a1a1e] shadow-lg shadow-black/50' : ''}`}
                                    >
                                        {active && (
                                            <motion.span
                                                layoutId='active-tab-indicator'
                                                transition={{ type: 'spring', duration: 0.35, bounce: 0.15 }}
                                                className='absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-sky-400 to-violet-400'
                                            />
                                        )}
                                        <Icon size={14} className={`shrink-0 ${color} ${active ? '' : 'opacity-70 group-hover:opacity-100'}`} />
                                        <span className='max-w-[180px] truncate text-[13px]'>{tab.name}</span>
                                        {showParent && (
                                            <span className='max-w-[100px] truncate text-[11px] text-zinc-600'>{info.parentName}</span>
                                        )}
                                        <button
                                            type='button'
                                            tabIndex={-1}
                                            aria-label={dirty ? `Close ${tab.name} (unsaved)` : `Close ${tab.name}`}
                                            onPointerDown={(e) => e.stopPropagation()}
                                            onMouseDown={(e) => e.stopPropagation()}
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                closeTabs([tab._id])
                                            }}
                                            className={`group/close ml-0.5 grid size-[18px] place-items-center rounded text-zinc-500 transition hover:bg-white/10 hover:text-white ${active || dirty ? 'visible' : 'invisible group-hover:visible'}`}
                                        >
                                            {/* Unsaved files show a dot that turns into the close icon on hover, like VS Code */}
                                            {dirty && <span className='size-2 rounded-full bg-zinc-300 group-hover/close:hidden' />}
                                            <X size={12} className={dirty ? 'hidden group-hover/close:block' : ''} />
                                        </button>
                                    </Reorder.Item>
                                )
                            })}
                        </AnimatePresence>
                    </Reorder.Group>

                    {/* Space under the floating Editor/Preview toggle so it never covers a tab */}
                    <div ref={spacerRef} className='w-24 shrink-0 sm:w-52' />
                </div>

                <div className={`pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-[#111113] to-transparent transition-opacity ${edges.left ? 'opacity-100' : 'opacity-0'}`} />
                <div className={`pointer-events-none absolute inset-y-0 right-24 w-8 bg-gradient-to-l from-[#111113] to-transparent transition-opacity sm:right-52 ${edges.right ? 'opacity-100' : 'opacity-0'}`} />
            </div>

            {current ? (
                <>
                    <div className='flex h-8 shrink-0 items-center justify-between gap-3 border-b border-white/[0.04] pl-4 pr-2'>
                        <nav aria-label='File path' className='flex min-w-0 items-center gap-1 text-xs text-zinc-500'>
                            {breadcrumbs.map((part, i) => {
                                const last = i === breadcrumbs.length - 1
                                const { icon: Icon, color } = getFileIcon(part)
                                return (
                                    <React.Fragment key={i}>
                                        {i > 0 && <ChevronRight size={12} className='shrink-0 text-zinc-700' />}
                                        <span className={`flex items-center gap-1.5 ${last ? 'min-w-0 text-zinc-300' : 'shrink-0'}`}>
                                            {last && <Icon size={12} className={`shrink-0 ${color}`} />}
                                            <span className='truncate'>{part}</span>
                                        </span>
                                    </React.Fragment>
                                )
                            })}
                        </nav>

                        <button
                            type='button'
                            onClick={save}
                            disabled={!activeDirty || saveState === 'saving'}
                            title='Save (Ctrl+S)'
                            className={`flex h-6 shrink-0 items-center gap-1.5 rounded-md px-2 text-[11px] font-medium transition-colors
                                ${saveState === 'error' ? 'text-red-400'
                                    : activeDirty ? 'bg-sky-500/15 text-sky-300 ring-1 ring-inset ring-sky-500/30 hover:bg-sky-500/25'
                                        : 'text-zinc-500'}`}
                        >
                            {saveState === 'saving' ? <LoaderCircle size={12} className='animate-spin' />
                                : saveState === 'error' ? <AlertCircle size={12} />
                                    : activeDirty ? <Save size={12} /> : <Check size={12} />}
                            {saveState === 'saving' ? 'Saving…' : saveState === 'error' ? 'Save failed' : activeDirty ? 'Save' : 'Saved'}
                            {activeDirty && saveState === 'idle' && (
                                <kbd className='ml-0.5 hidden rounded bg-white/[0.06] px-1 font-sans text-[10px] text-sky-300/70 sm:inline'>Ctrl S</kbd>
                            )}
                        </button>
                    </div>

                    <div className='min-h-0 flex-1'>
                        <CodeEditor
                            path={modelPath(current)}
                            language={language.id}
                            defaultValue={current.content ?? ''}
                            onChange={(value) => setDrafts(d => ({ ...d, [current._id]: value }))}
                            onCursorChange={setCursor}
                        />
                    </div>

                    <div className='flex h-6 shrink-0 items-center justify-between gap-4 border-t border-white/[0.05] bg-[#0d0d10] px-3 text-[11px] text-zinc-500'>
                        <span className='flex items-center gap-1.5'>
                            <span className={`size-1.5 rounded-full ${activeDirty ? 'bg-amber-400' : 'bg-emerald-500'}`} />
                            {activeDirty ? 'Unsaved changes' : 'All changes saved'}
                        </span>
                        <div className='flex items-center gap-4'>
                            <span>
                                Ln {cursor.line}, Col {cursor.column}
                                {cursor.selected > 0 && ` (${cursor.selected} selected)`}
                            </span>
                            <span className='hidden sm:inline'>Spaces: 2</span>
                            <span className='hidden sm:inline'>UTF-8</span>
                            <span className='text-zinc-400'>{language.label}</span>
                        </div>
                    </div>
                </>
            ) : (
                <div className='flex flex-1 flex-col items-center justify-center gap-3 text-center'>
                    <FileCode2 size={36} className='text-zinc-700' />
                    <div>
                        <p className='text-sm font-medium text-zinc-400'>No file open</p>
                        <p className='mt-1 text-xs text-zinc-600'>Pick a file from the Explorer to start editing</p>
                    </div>
                    <div className='mt-3 grid grid-cols-[auto_auto] gap-x-8 gap-y-1.5 text-left text-[11px] text-zinc-600'>
                        <span>Save file</span><kbd className='font-sans text-zinc-500'>Ctrl S</kbd>
                        <span>Find</span><kbd className='font-sans text-zinc-500'>Ctrl F</kbd>
                        <span>Command palette</span><kbd className='font-sans text-zinc-500'>F1</kbd>
                    </div>
                </div>
            )}

            {createPortal(
                <AnimatePresence>
                    {menu && (
                        <motion.div
                            ref={menuRef}
                            initial={{ opacity: 0, scale: 0.96 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.96 }}
                            transition={{ duration: 0.1 }}
                            style={{ left: menu.x, top: menu.y }}
                            className='fixed z-50 w-52 origin-top-left rounded-lg border border-white/10 bg-[#161618]/95 p-1 text-[13px] shadow-xl shadow-black/50 backdrop-blur'
                            onContextMenu={(e) => e.preventDefault()}
                        >
                            {menuItems.map((item, i) => item.divider ? (
                                <div key={i} className='my-1 h-px bg-white/[0.06]' />
                            ) : (
                                <button
                                    key={item.label}
                                    type='button'
                                    disabled={item.disabled}
                                    onClick={() => {
                                        item.action()
                                        setMenu(null)
                                    }}
                                    className='flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-zinc-300 transition-colors hover:bg-white/[0.06] hover:text-white disabled:pointer-events-none disabled:text-zinc-600'
                                >
                                    {item.label}
                                    {item.hint && <span className='text-[11px] text-zinc-600'>{item.hint}</span>}
                                </button>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </div>
    )
}

export default Editor