import React, { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import {
    ChevronRight,
    FolderClosed,
    FolderOpen,
    File,
    FilePlus,
    FolderPlus,
    FilePlus2,
    Pencil,
    Trash
} from 'lucide-react'
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
    SiDocker
} from 'react-icons/si'
import { getFolderColor } from '../utils/customizeIcon'
import { createFolder, createFile, deleteFile } from '../features/file'
import { createPortal } from 'react-dom'

function Folder({
    projectId,
    tree,
    reloadTree,
    node
}) {
    const [folderName, setFolderName] = useState("")
    const [fileName, setFileName] = useState("")
    const [open, setOpen] = useState(false)
    const [menu, setMenu] = useState(null)
    const FolderColor = getFolderColor(node?.name)
    const [creatingFolderIn, setCreatingFolderIn] = useState(null)
    const [creatingFileIn, setCreatingFileIn] = useState(null)
    const [menuPosition, setMenuPosition] = useState(null)

    const handleCreateFolder = async () => {
        await createFolder({ projectId, name: folderName, parentId: node?._id })
        await reloadTree()
    }

    const handleCreateFile = async () => {
        await createFile({ projectId, name: fileName, parentId: node?._id })
        await reloadTree()
    }

    const handleNewFolder = (folder) => {
        setCreatingFolderIn(folder?._id)
        setCreatingFileIn(null)
    }

    const handleNewFile = (folder) => {
        setCreatingFileIn(folder?._id)
        setCreatingFolderIn(null)
    }

    const handleDelete = async (folder) => {
        if (!folder?._id) return
        await deleteFile(folder._id)
        await reloadTree()
    }

    if (node.type == 'file') {
        const extension = node?.name?.split('.').pop()?.toLowerCase()

        const fileIcons = {
            py: [SiPython, 'text-[#3776AB]'],
            jsx: [SiReact, 'text-[#61DAFB]'],
            tsx: [SiReact, 'text-[#61DAFB]'],
            js: [SiJavascript, 'text-[#F7DF1E]'],
            mjs: [SiJavascript, 'text-[#F7DF1E]'],
            cjs: [SiJavascript, 'text-[#F7DF1E]'],
            ts: [SiTypescript, 'text-[#3178C6]'],
            html: [SiHtml5, 'text-[#E34F26]'],
            htm: [SiHtml5, 'text-[#E34F26]'],
            css: [SiCss, 'text-[#663399]'],
            scss: [SiCss, 'text-[#CC6699]'],
            sass: [SiCss, 'text-[#CC6699]'],
            json: [SiJson, 'text-[#F5A623]'],
            java: [SiOpenjdk, 'text-[#ED8B00]'],
            cpp: [SiCplusplus, 'text-[#00599C]'],
            cc: [SiCplusplus, 'text-[#00599C]'],
            cxx: [SiCplusplus, 'text-[#00599C]'],
            c: [SiC, 'text-[#A8B9CC]'],
            h: [SiC, 'text-[#A8B9CC]'],
            go: [SiGo, 'text-[#00ADD8]'],
            rs: [SiRust, 'text-[#DEA584]'],
            php: [SiPhp, 'text-[#777BB4]'],
            rb: [SiRuby, 'text-[#CC342D]'],
            swift: [SiSwift, 'text-[#F05138]'],
            kt: [SiKotlin, 'text-[#7F52FF]'],
            kts: [SiKotlin, 'text-[#7F52FF]'],
            md: [SiMarkdown, 'text-zinc-300'],
            markdown: [SiMarkdown, 'text-zinc-300'],
            yml: [SiYaml, 'text-[#CB171E]'],
            yaml: [SiYaml, 'text-[#CB171E]'],
            dockerfile: [SiDocker, 'text-[#2496ED]']
        }

        const [FileIcon, FileColor] = fileIcons[extension] || [File, 'text-zinc-400']

        return (
            <div className='relative'>
                <motion.div
                    transition={{ duration: 0.15, ease: "easeOut" }}
                    className="group flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-white/[0.04] transition-colors duration-150"
                    onContextMenu={(e) => {
                        e.preventDefault()
                        setMenu({ x: e.clientX, y: e.clientY })
                    }}
                >
                    <div
                        className="flex min-w-0 flex-1 cursor-pointer items-center gap-1.5"
                        onClick={() => setOpen(!open)}
                    >
                        <FileIcon
                            size={16}
                            className={`shrink-0 ${FileColor}`}
                        />

                        <span className='truncate text-[13px] text-zinc-300 transition-colors duration-150 group-hover:text-white'>
                            {node?.name}
                        </span>
                    </div>

                    <div className='flex items-center gap-0.5 invisible group-hover:visible'>
                        <button
                            className="rounded-md p-0.5 text-zinc-500 hover:bg-white/10 hover:text-white"
                            onClick={(e) => {
                                e.stopPropagation()
                                handleNewFile(node)
                                setOpen(true)
                            }}
                        >
                            <FilePlus2 size={14} />
                        </button>

                        <button
                            className="rounded-md p-0.5 text-zinc-500 hover:bg-white/10 hover:text-white"
                            onClick={(e) => {
                                e.stopPropagation()
                                handleNewFolder(node)
                                setOpen(true)
                            }}
                        >
                            <FolderPlus size={14} />
                        </button>
                    </div>
                </motion.div>

                {menu && createPortal(
                    <>
                        <motion.div
                            className="fixed inset-0 z-40"
                            onClick={() => setMenu(null)}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        />

                        <motion.div
                            initial={{ opacity: 0, scale: 0.96, y: -6 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.96, y: -6 }}
                            transition={{ duration: 0.14, ease: "easeOut" }}
                            className="fixed z-50 w-52 rounded-xl border border-white/[0.08] bg-[#17171a]/95 py-1.5 shadow-2xl shadow-black/50 backdrop-blur-xl"
                            style={{ left: menu.x, top: menu.y }}
                        >
                            <button
                                className="mx-1 flex w-[calc(100%-8px)] items-center gap-2 rounded-md px-3 py-2 text-left text-[13px] text-zinc-300 transition-colors hover:bg-white/[0.06] hover:text-white"
                                onClick={() => {
                                    setMenu(null)
                                    handleNewFile(node)
                                }}
                            >
                                <FilePlus2 size={14} />
                                New File
                            </button>

                            <button
                                className="mx-1 flex w-[calc(100%-8px)] items-center gap-2 rounded-md px-3 py-2 text-left text-[13px] text-zinc-300 transition-colors hover:bg-white/[0.06] hover:text-white"
                                onClick={() => {
                                    setMenu(null)
                                    handleNewFolder(node)
                                }}
                            >
                                <FolderPlus size={14} />
                                New Folder
                            </button>

                            <div className="my-1 h-px bg-white/[0.08]" />

                            <button
                                className="mx-1 flex w-[calc(100%-8px)] items-center gap-2 rounded-md px-3 py-2 text-left text-[13px] text-zinc-300 transition-colors hover:bg-white/[0.06] hover:text-white"
                                onClick={() => setMenu(null)}
                            >
                                <Pencil size={14} />
                                Rename
                            </button>

                            <button
                                className="mx-1 flex w-[calc(100%-8px)] items-center gap-2 rounded-md px-3 py-2 text-left text-[13px] text-zinc-300 transition-colors hover:bg-white/[0.06] hover:text-white"
                                onClick={() => {
                                    setMenu(null)
                                    handleDelete(node)
                                }}
                            >
                                <Trash size={14} />
                                Delete
                            </button>
                        </motion.div>
                    </>,
                    document.body
                )}

                {
                    open && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.16, ease: "easeOut" }}
                            className="ml-5 overflow-hidden border-l border-white/[0.05] pl-1"
                        >
                            {node.children?.map((child) => (
                                <Folder
                                    key={child._id}
                                    projectId={projectId}
                                    tree={tree}
                                    reloadTree={reloadTree}
                                    node={child}
                                />
                            ))}
                        </motion.div>
                    )
                }

                {
                    (creatingFolderIn === node?._id) && (
                        <div className='py-1 pl-1'>
                            <motion.input
                                initial={{ opacity: 0, y: -4 }}
                                animate={{ opacity: 1, y: 0 }}
                                autoFocus
                                value={folderName}
                                placeholder="Folder Name"
                                className="w-full rounded-md border border-white/[0.1] bg-white/[0.04] px-2.5 py-1.5 text-[13px] text-white placeholder-zinc-500 outline-none transition-all focus:border-sky-400 focus:ring-2 focus:ring-sky-400/15"
                                onChange={(e) => setFolderName(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        handleCreateFolder()
                                        setFolderName("")
                                        setCreatingFolderIn(null)
                                    }

                                    if (e.key === "Escape") {
                                        setFolderName("")
                                        setCreatingFolderIn(null)
                                    }
                                }}
                            />
                        </div>
                    )
                }

                {
                    (creatingFileIn === node?._id) && (
                        <div className='py-1 pl-1'>
                            <motion.input
                                initial={{ opacity: 0, y: -4 }}
                                animate={{ opacity: 1, y: 0 }}
                                autoFocus
                                value={fileName}
                                placeholder="File Name"
                                className="w-full rounded-md border border-white/[0.1] bg-white/[0.04] px-2.5 py-1.5 text-[13px] text-white placeholder-zinc-500 outline-none transition-all focus:border-sky-400 focus:ring-2 focus:ring-sky-400/15"
                                onChange={(e) => setFileName(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        handleCreateFile()
                                        setFileName("")
                                        setCreatingFileIn(null)
                                    }

                                    if (e.key === "Escape") {
                                        setFileName("")
                                        setCreatingFileIn(null)
                                    }
                                }}
                            />
                        </div>
                    )
                }
            </div>
        )
    }

    return (
        <div className='relative'>
            <motion.div
                transition={{ duration: 0.15, ease: "easeOut" }}
                className="group flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-white/[0.04] transition-colors duration-150"
                onContextMenu={(e) => {
                    e.preventDefault()
                    setMenu({ x: e.clientX, y: e.clientY })
                }}
            >
                <div
                    className="flex min-w-0 flex-1 cursor-pointer items-center gap-1.5"
                    onClick={() => setOpen(!open)}
                >
                    <motion.div
                        animate={{ rotate: open ? 90 : 0 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className="shrink-0"
                    >
                        <ChevronRight
                            size={14}
                            className='text-zinc-500 transition-colors duration-150 group-hover:text-zinc-400'
                        />
                    </motion.div>

                    {
                        open
                            ? <FolderOpen size={16} className={`shrink-0 ${FolderColor}`} />
                            : <FolderClosed size={16} className={`shrink-0 ${FolderColor}`} />
                    }

                    <span className='truncate text-[13px] text-zinc-300 transition-colors duration-150 group-hover:text-white'>
                        {node?.name}
                    </span>
                </div>

                <div className='flex items-center gap-0.5 invisible group-hover:visible'>
                    <button
                        className="rounded-md p-0.5 text-zinc-500 hover:bg-white/10 hover:text-white"
                        onClick={(e) => {
                            e.stopPropagation()
                            handleNewFile(node)
                            setOpen(true)
                        }}
                    >
                        <FilePlus2 size={14} />
                    </button>

                    <button
                        className="rounded-md p-0.5 text-zinc-500 hover:bg-white/10 hover:text-white"
                        onClick={(e) => {
                            e.stopPropagation()
                            handleNewFolder(node)
                            setOpen(true)
                        }}
                    >
                        <FolderPlus size={14} />
                    </button>
                </div>
            </motion.div>

            {menu && createPortal(
                <>
                    <motion.div
                        className="fixed inset-0 z-40"
                        onClick={() => setMenu(null)}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.96, y: -6 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96, y: -6 }}
                        transition={{ duration: 0.14, ease: "easeOut" }}
                        className="fixed z-50 w-52 rounded-xl border border-white/[0.08] bg-[#17171a]/95 py-1.5 shadow-2xl shadow-black/50 backdrop-blur-xl"
                        style={{ left: menu.x, top: menu.y }}
                    >
                        <button
                            className="mx-1 flex w-[calc(100%-8px)] items-center gap-2 rounded-md px-3 py-2 text-left text-[13px] text-zinc-300 transition-colors hover:bg-white/[0.06] hover:text-white"
                            onClick={() => {
                                setMenu(null)
                                handleNewFile(node)
                            }}
                        >
                            <FilePlus2 size={14} />
                            New File
                        </button>

                        <button
                            className="mx-1 flex w-[calc(100%-8px)] items-center gap-2 rounded-md px-3 py-2 text-left text-[13px] text-zinc-300 transition-colors hover:bg-white/[0.06] hover:text-white"
                            onClick={() => {
                                setMenu(null)
                                handleNewFolder(node)
                            }}
                        >
                            <FolderPlus size={14} />
                            New Folder
                        </button>

                        <div className="my-1 h-px bg-white/[0.08]" />

                        <button
                            className="mx-1 flex w-[calc(100%-8px)] items-center gap-2 rounded-md px-3 py-2 text-left text-[13px] text-zinc-300 transition-colors hover:bg-white/[0.06] hover:text-white"
                            onClick={() => setMenu(null)}
                        >
                            <Pencil size={14} />
                            Rename
                        </button>

                        <button
                            className="mx-1 flex w-[calc(100%-8px)] items-center gap-2 rounded-md px-3 py-2 text-left text-[13px] text-zinc-300 transition-colors hover:bg-white/[0.06] hover:text-white"
                            onClick={() => {
                                setMenu(null)
                                handleDelete(node)
                            }}
                        >
                            <Trash size={14} />
                            Delete
                        </button>
                    </motion.div>
                </>,
                document.body
            )}

            {
                open && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.16, ease: "easeOut" }}
                        className="ml-5 overflow-hidden border-l border-white/[0.05] pl-1"
                    >
                        {node.children?.map((child) => (
                            <Folder
                                key={child._id}
                                projectId={projectId}
                                tree={tree}
                                reloadTree={reloadTree}
                                node={child}
                            />
                        ))}
                    </motion.div>
                )
            }

            {
                (creatingFolderIn === node?._id) && (
                    <div className='py-1 pl-1'>
                        <motion.input
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            autoFocus
                            value={folderName}
                            placeholder="Folder Name"
                            className="w-full rounded-md border border-white/[0.1] bg-white/[0.04] px-2.5 py-1.5 text-[13px] text-white placeholder-zinc-500 outline-none transition-all focus:border-sky-400 focus:ring-2 focus:ring-sky-400/15"
                            onChange={(e) => setFolderName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    handleCreateFolder()
                                    setFolderName("")
                                    setCreatingFolderIn(null)
                                }

                                if (e.key === "Escape") {
                                    setFolderName("")
                                    setCreatingFolderIn(null)
                                }
                            }}
                        />
                    </div>
                )
            }

            {
                (creatingFileIn === node?._id) && (
                    <div className='py-1 pl-1'>
                        <motion.input
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            autoFocus
                            value={fileName}
                            placeholder="File Name"
                            className="w-full rounded-md border border-white/[0.1] bg-white/[0.04] px-2.5 py-1.5 text-[13px] text-white placeholder-zinc-500 outline-none transition-all focus:border-sky-400 focus:ring-2 focus:ring-sky-400/15"
                            onChange={(e) => setFileName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    handleCreateFile()
                                    setFileName("")
                                    setCreatingFileIn(null)
                                }

                                if (e.key === "Escape") {
                                    setFileName("")
                                    setCreatingFileIn(null)
                                }
                            }}
                        />
                    </div>
                )
            }
        </div>
    )
}

export default Folder