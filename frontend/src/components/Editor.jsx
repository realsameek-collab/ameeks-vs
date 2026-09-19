import { AnimatePresence, motion } from 'motion/react'
import React from 'react'
import { X } from 'lucide-react'
import { getFileIcon } from '../utils/customizeIcon'

function Editor({
    activeTab,
    openTabs,
    setOpenTabs,
    setActiveTab
}) {
    const closeTab = (e, tab) => {
        e.stopPropagation()
        const remaining = openTabs.filter(t => t._id != tab._id)
        setOpenTabs(remaining)
        if (activeTab?._id == tab._id) setActiveTab(remaining[remaining.length - 1] || null)
    }

    return (
        <div className='flex flex-1 flex-col bg-[#0a0a0c]'>
            <div className='flex h-10 shrink-0 items-center overflow-x-auto border-b border-white/[0.06] bg-[#111113]/90'>
                <AnimatePresence initial={false}>
                    {openTabs.map((tab) => {
                        const active = activeTab?._id == tab?._id
                        const { icon: Icon, color } = getFileIcon(tab.name)
                        return (
                            <motion.div
                                key={tab._id}
                                initial={{ opacity: 0, width: 0 }}
                                animate={{ opacity: 1, width: "auto" }}
                                exit={{ opacity: 0, width: 0 }}
                                transition={{ duration: 0.15 }}
                                onClick={() => setActiveTab(tab)}
                                className={`group relative flex h-full cursor-pointer items-center gap-2 whitespace-nowrap border-r border-white/[0.05] px-3.5 transition-colors ${active ? "bg-[#0a0a0c] text-white" : "text-zinc-500 hover:bg-white/[0.02] hover:text-zinc-300"}`}
                            >

                                <Icon size={14} className={`shrink-0 ${color}`} />
                                <span className='text-[13px]'>{tab?.name}</span>
                                <button
                                    type="button"
                                    onClick={(e) => closeTab(e, tab)}
                                    className={`rounded p-0.5 text-zinc-500 hover:bg-white/10 hover:text-white ${active ? "visible" : "invisible group-hover:visible"}`}
                                >
                                    <X size={12} />
                                </button>


                            </motion.div>
                        )
                    })}
                </AnimatePresence>
            </div>

        </div>
    )
}

export default Editor