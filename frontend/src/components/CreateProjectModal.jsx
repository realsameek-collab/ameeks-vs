import React, { useState } from 'react'
import { motion } from "motion/react"
import { X } from 'lucide-react'
import { createProject } from '../features/project'
import { createRootFolder } from '../features/file'
import { useDispatch } from 'react-redux'
import { addNewProject } from '../redux/projectSlice'
function CreateProjectModal({ onClose }) {
    const [name,setName] = useState("")
    const [description,setDescription] = useState("")
    const [loading,setLodaing] = useState(false)
    const [error,setError] = useState("")
    const dispatch = useDispatch()

    const handlecreateProject = async () => {
        if(!name.trim()){
            setError("Project name is required")
            return
        }
        setError("")
        setLodaing(true)
        try {
            const data = await createProject({name,description})
            if(!data){
                setError("Could not create the project. Please try again.")
                return
            }
            // The project exists from here on, so keep it in the store either way;
            // retrying the whole modal would create a duplicate.
            dispatch(addNewProject(data))

            const root = await createRootFolder({projectId:data._id,projectName:data.name})
            if(!root){
                setError("Project created, but its root folder failed. Open the project to retry.")
                return
            }
            onClose()
        } finally {
            setLodaing(false)
        }
    }
    return (
        <div className='fixed inset-0 z-50 flex items-center justify-center p-4'>
            <motion.div
                onClick={onClose}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="fixed inset-0 bg-black/20 backdrop-blur-sm dark:bg-black/60"
            />

            <div className='pointer-events-none absolute -z-10 h-[460px] w-[460px] rounded-full bg-sky-300/20 
         blur-[130px] dark:bg-sky-500/10' />

            <motion.div
                initial={{
                    opacity: 0,
                    y: 10,
                    scale: 0.98,
                }}
                animate={{
                    opacity: 1,
                    y: 0,
                    scale: 1,
                }}
                exit={{
                    opacity: 0,
                    y: 10,
                    scale: 0.98,
                }}
                transition={{
                    duration: 0.28,
                    ease: [0.16, 1, 0.3, 1],
                }}
                className="relative w-full max-w-md overflow-hidden rounded-[28px] border border-black/[0.08] bg-white/70
   shadow-[0_20px_60px_-15px_rgba(0,0,0,0.25)] backdrop-blur-2xl dark:border-white/[0.1] dark:bg-white/[0.05] 
   dark:shadow-[0_20px_70px_-15px_rgba(0,0,0,0.7)]">


                <div className='pointer-events-none absolute inset-x-0 top-0 h-px 
    bg-gradient-to-r from-transparent via-white/80 to-transparent dark:via-white/30'/>
                <div className='flex items-center justify-between border-b border-black/[0.06] px-7 py-6 dark:border-white/[0.08]'>
                    <div>
                        <h2 className='text-[17px] font-semibold tracking-tight text-zinc-900 dark:text-white'>
                            Create Project
                        </h2>
                        <p className='text-xs text-zinc-500 dark:text-zinc-500'>
                            Setup a new workspace in seconds
                        </p>

                    </div>
                    <button
                        onClick={onClose}
                        className='rounded-lg p-2 text-zinc-500 transition-colors hover:bg-black/[0.05] hover:text-zinc-900 
                dark:text-zinc-400 dark:hover:bg-white/[0.07] dark:hover:text-white'>
                        <X size={18} />

                    </button>
                </div>
                <div className='space-y-6 px-7 py-6'>
                    <div>
                        <div className='mb-2 block text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400'>
                            Project Name
                        </div>
                        <input
                            value={name}
                            onChange={(e)=>setName(e.target.value)}
                            placeholder="My Awesome Project"
                            autoFocus
                            className="w-full rounded-xl border border-black/[0.08] bg-black/[0.02] px-4 py-3 text-[15px] text-zinc-900 
                            placeholder-zinc-400 outline-none transition-all focus:border-sky-400/60 focus:bg-white focus:ring-4
                             focus:ring-sky-400/15 dark:border-white/[0.09] dark:bg-white/[0.04] dark:text-white dark:placeholder-zinc-500 
                             dark:focus:bg-white/[0.06] dark:focus:ring-sky-400/10"
                        />

                    </div>
                    <div>
                        <div className='mb-2 block text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400'>
                            Description
                        </div>
                        <textarea
                            value={description}
                            onChange={(e)=>setDescription(e.target.value)}
                            rows={5}
                            placeholder="What is the Project About"
                            className="w-full rounded-xl border border-black/[0.08] bg-black/[0.02] px-4 py-3 text-[15px] text-zinc-900 
                            placeholder-zinc-400 outline-none transition-all focus:border-sky-400/60 focus:bg-white focus:ring-4
                             focus:ring-sky-400/15 dark:border-white/[0.09] dark:bg-white/[0.04] dark:text-white dark:placeholder-zinc-500 
                             dark:focus:bg-white/[0.06] dark:focus:ring-sky-400/10"
                        />

                    </div>

                    {error && (
                        <p className='rounded-xl border border-red-500/20 bg-red-500/[0.06] px-4 py-3 text-[13px] text-red-600 dark:text-red-400'>
                            {error}
                        </p>
                    )}

                </div>
                <div className='flex justify-end gap-3 border-t border-black/[0.06] px-7 py-5 dark:border-white/[0.08]'>
                    <button
                        onClick={onClose}
                        className="rounded-xl border border-black/[0.08] bg-black/[0.02] px-5 py-2.5 text-sm font-medium 
                        text-zinc-700 transition-colors hover:bg-black/[0.05] hover:text-zinc-900 dark:border-white/[0.1] 
                        dark:bg-white/[0.03] dark:text-zinc-300 dark:hover:bg-white/[0.07] dark:hover:text-white"
                    >

                        Cancel
                    </button>
                    <button
                         onClick={handlecreateProject}
                         disabled={loading}
                        className="rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white 
                        shadow-[0_1px_0_rgba(255,255,255,0.15)_inset,0_8px_24px_-8px_rgba(0,0,0,0.4)] transition-all 
                        hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-zinc-900 
                        dark:hover:bg-zinc-100"
                    >
                        {loading?"Creating...":"Create Project"}
                        
                        
                    </button>
                </div>

            </motion.div>

        </div>
    )
}

export default CreateProjectModal