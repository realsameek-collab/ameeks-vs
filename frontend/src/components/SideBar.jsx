import React from 'react'
import {motion} from "motion/react"
import { Folder, Star } from "lucide-react"

function SideBar({activeSession, setActiveSession}) {
   
  return (
    <div className='flex h-full w-64 shrink-0 flex-col border-r border-slate-200/70 bg-white/60 px-3
     py-5 font-sans backdrop-blur-xl transition-colors duration-300 dark:border-white/[0.06] dark:bg-white/[0.02]'>
        <div className='flex flex-col gap-1'>
            <motion.div
            whileTap={{ scale: 0.97 }}
             onClick={()=>setActiveSession('projects')}
            className={
              `relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13.5px] font-medium cursor-pointer transition-colors duration-150 ${
                activeSession=='projects'
                  ? "text-slate-900 dark:text-white"
                  : "text-slate-500 hover:bg-slate-100/80 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-white/[0.04] dark:hover:text-slate-200"
              }`
            }>
                {activeSession=='projects' && (
                    <div className='absolute inset-0 rounded-lg border border-slate-900/10 bg-slate-900/5 dark:border-white/10 dark:bg-white/10'/>
                )}
               <Folder size={17} 
               strokeWidth={2}
               className ='relative'
               />
               <span className='relative'>
                Projects
               </span>
            </motion.div>

            <motion.div
            whileTap={{ scale: 0.97 }}
            onClick={()=>setActiveSession('starred')}
            className={
              `relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13.5px] font-medium cursor-pointer transition-colors duration-150 ${
                activeSession=='starred'
                  ? "text-slate-900 dark:text-white"
                  : "text-slate-500 hover:bg-slate-100/80 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-white/[0.04] dark:hover:text-slate-200"
              }`
            }>
                {activeSession=='starred' && (
                    <div className='absolute inset-0 rounded-lg border border-slate-900/10 bg-slate-900/5 dark:border-white/10 dark:bg-white/10'/>
                )}
                <Star size={17} 
               strokeWidth={2}
               className ='relative'
               />
               <span className='relative'>
                Starred
               </span>
            </motion.div>
        </div>

    </div>
  )
}

export default SideBar