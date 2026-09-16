import React, { useState } from 'react'  
import { motion } from 'motion/react'  
import { ChevronRight, FolderClosed, FolderOpen, FilePlus, FolderPlus } from 'lucide-react'  
import { getFolderColor } from '../utils/customizeIcon'  
import { createFolder, createFile } from '../features/file'  
  
function Folder({  
    projectId,  
    tree,  
    reloadTree,  
    node  
}) {  
    const [folderName, setFolderName] = useState("")  
    const [fileName, setFileName] = useState("")  
    const [open, setOpen] = useState(false)  
    const [, setMenu] = useState(null)  
    const FolderColor = getFolderColor(node?.name)  
    const [creatingFolderIn, setCreatingFolderIn] = useState(null)
    const [creatingFileIn, setCreatingFileIn] = useState(null)
  
    const handleCreateFolder = async () => {  
        await createFolder({ projectId, name: folderName, parentId: node?._id })  
        await reloadTree()  
    }  
  
    const handleCreateFile = async () => {  
        await createFile({ projectId, name: fileName, parentId: node?._id })  
        await reloadTree()  
    }  

    const handleNewFolder = (folder)=>{
        setCreatingFolderIn(folder?._id)
        setCreatingFileIn(null)
    }
    

      const handleNewFile = (folder)=>{
        setCreatingFileIn(folder?._id)
        setCreatingFolderIn(null)
    }
    return (  
        <div className='relative'>  
            <motion.div  
                transition={{ duration: 0.15, ease: "easeOut" }}  
                className="group flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-white/[0.04] transition-colors duration-150"  
                onContextMenu={(e) => {  
                    e.preventDefault();  
                    setMenu({ x: e.clientX, y: e.clientY });  
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
                        <ChevronRight size={14} className='text-zinc-500 transition-colors duration-150 group-hover:text-zinc-400' />  
                    </motion.div>  
  
                    {  
                        open ? <FolderOpen size={16} className={`shrink-0 ${FolderColor}`} /> : <FolderClosed size={16} className={`shrink-0 ${FolderColor}`} />  
                    }  
  
                    <span className='truncate text-[13px] text-zinc-300 transition-colors duration-150 group-hover:text-white'>  
                        {node?.name}  
                    </span>  
                </div>  
  
                <div className='flex items-center gap-0.5 invisible group-hover:visible'> 
                    <button 
                        className="rounded-md p-0.5 text-zinc-500 hover:bg-white/10 hover:text-white" 
                        onClick={(e) => { 
                            e.stopPropagation(); 
                            setOpen(true); 
                        }} 
                    > 
                        <FolderPlus size={14} /> 
                    </button> 

                    <button 
                        className="rounded-md p-0.5 text-zinc-500 hover:bg-white/10 hover:text-white" 
                        onClick={(e) => { 
                            e.stopPropagation(); 
                            setOpen(true); 
                        }} 
                    > 
                        <FilePlus size={14} /> 
                    </button> 
                </div> 
            </motion.div>  
        </div>  
    )  
}  
  
export default Folder