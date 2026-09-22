import React, { useState } from 'react' 
import { motion } from 'motion/react' 
import { 
    ChevronRight, 
    FolderClosed, 
    FolderOpen, 
    FolderPlus, 
    FilePlus2, 
    Pencil, 
    Trash 
} from 'lucide-react' 
import { getFolderColor, getFileIcon } from '../utils/customizeIcon' 
import { createFolder, createFile, updateFile, deleteFile } from '../features/file' 
import { createPortal } from 'react-dom' 
 
function Folder({ 
    projectId, 
    tree, 
    reloadTree, 
    openFile,
    node,
    defaultOpen = false,
    createRequest
}) { 
    const [folderName, setFolderName] = useState("") 
    const [fileName, setFileName] = useState("") 
    const [open, setOpen] = useState(defaultOpen) 
    const [menu, setMenu] = useState(null) 
    const FolderColor = getFolderColor(node?.name) 
    const [creatingFolderIn, setCreatingFolderIn] = useState(null) 
    const [creatingFileIn, setCreatingFileIn] = useState(null) 
    const [creationError, setCreationError] = useState("") 
 
    const handleCreateFolder = async () => { 
        const result = await createFolder({ projectId, name: folderName, parentId: node?._id }) 
        if (result?.error) { 
            setCreationError(result.error.toLowerCase().includes("exist") 
                ? "This folder name already exists. Choose another name." 
                : result.error) 
            return 
        } 
 
        setCreationError("") 
        setFolderName("") 
        setCreatingFolderIn(null) 
        await reloadTree() 
    } 
 
    const handleCreateFile = async () => { 
        const result = await createFile({ projectId, name: fileName, parentId: node?._id }) 
        if (result?.error) { 
            setCreationError(result.error.toLowerCase().includes("exist") 
                ? "This file name already exists. Choose another name." 
                : result.error) 
            return 
        } 
 
        setCreationError("") 
        setFileName("") 
        setCreatingFileIn(null) 
        await reloadTree() 
    } 
 
    const handleNewFolder = (folder) => { 
        setCreationError("") 
        setCreatingFolderIn(folder?._id) 
        setCreatingFileIn(null) 
    } 
 
    const handleNewFile = (folder) => { 
        setCreationError("") 
        setCreatingFileIn(folder?._id) 
        setCreatingFolderIn(null) 
    } 
 
    // The Explorer header's New File / New Folder buttons act on the root folder.
    // Each click is a new request object, handled once while rendering.
    const [handledRequest, setHandledRequest] = useState(null)
    if (createRequest && createRequest !== handledRequest) {
        setHandledRequest(createRequest)
        setCreationError("")
        setCreatingFileIn(createRequest.kind === 'file' ? node?._id : null)
        setCreatingFolderIn(createRequest.kind === 'folder' ? node?._id : null)
        setOpen(true)
    }

    const handleDelete = async (folder) => { 
        if (!folder?._id) return 
        await deleteFile(folder._id) 
        await reloadTree() 
    } 
 
    const handleRename = async (file) => { 
        if (!file?._id) return 
 
        const name = window.prompt("Rename file", file.name) 
        if (!name || name === file.name) return 
 
        await updateFile(file._id, { name }) 
        await reloadTree() 
    } 
 
    if (node.type == 'file') { 
        const { icon: FileIcon, color: FileColor } = getFileIcon(node?.name)
 
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
                        onClick={() => openFile(node)} 
                    > 
                        <FileIcon 
                            size={16} 
                            className={`shrink-0 ${FileColor}`} 
                        /> 
 
                        <span className='truncate text-[13px] text-zinc-300 transition-colors duration-150 group-hover:text-white'> 
                            {node?.name} 
                        </span> 
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
                                    handleRename(node) 
                                }} 
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
                                    openFile={openFile}
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
                                onChange={(e) => { 
                                    setFolderName(e.target.value) 
                                    setCreationError("") 
                                }} 
                                onKeyDown={(e) => { 
                                    if (e.key === "Enter") { 
                                        handleCreateFolder() 
                                    } 
 
                                    if (e.key === "Escape") { 
                                        setFolderName("") 
                                        setCreationError("") 
                                        setCreatingFolderIn(null) 
                                    } 
                                }} 
                            /> 
                            {creationError && ( 
                                <p className="px-1 pt-1 text-[11px] text-red-400">{creationError}</p> 
                            )} 
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
                                onChange={(e) => { 
                                    setFileName(e.target.value) 
                                    setCreationError("") 
                                }} 
                                onKeyDown={(e) => { 
                                    if (e.key === "Enter") { 
                                        handleCreateFile() 
                                    } 
 
                                    if (e.key === "Escape") { 
                                        setFileName("") 
                                        setCreationError("") 
                                        setCreatingFileIn(null) 
                                    } 
                                }} 
                            /> 
                            {creationError && ( 
                                <p className="px-1 pt-1 text-[11px] text-red-400">{creationError}</p> 
                            )} 
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
                                openFile={openFile}
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
                            onChange={(e) => { 
                                setFolderName(e.target.value) 
                                setCreationError("") 
                            }} 
                            onKeyDown={(e) => { 
                                if (e.key === "Enter") { 
                                    handleCreateFolder() 
                                } 
 
                                if (e.key === "Escape") { 
                                    setFolderName("") 
                                    setCreationError("") 
                                    setCreatingFolderIn(null) 
                                } 
                            }} 
                        /> 
                        {creationError && ( 
                            <p className="px-1 pt-1 text-[11px] text-red-400">{creationError}</p> 
                        )} 
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
                            onChange={(e) => { 
                                setFileName(e.target.value) 
                                setCreationError("") 
                            }} 
                            onKeyDown={(e) => { 
                                if (e.key === "Enter") { 
                                    handleCreateFile() 
                                } 
 
                                if (e.key === "Escape") { 
                                    setFileName("") 
                                    setCreationError("") 
                                    setCreatingFileIn(null) 
                                } 
                            }} 
                        /> 
                        {creationError && ( 
                            <p className="px-1 pt-1 text-[11px] text-red-400">{creationError}</p> 
                        )} 
                    </div> 
                ) 
            } 
        </div> 
    ) 
} 
 
export default Folder