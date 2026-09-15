
import React, { useState } from 'react'
import { useSelector } from 'react-redux'
import { motion } from 'motion/react'
import { Eye, Code2 } from 'lucide-react'

function TopBar() {
    const currentProject = useSelector((state) => state.project)
    const [showpreview, setShowPreview] = useState(false)

    return (
        <div className='relative flex h-12 items-center justify-between border-b border-white/[0.06] bg-[#111113]/90 px-4 backdrop-blur-xl'>
            <div className='flex items-center gap-3'>
                <div className='text-white bg-clip-text text-lg font-bold text-transparent'>
                    AmeekAI
                </div>

                <div className='h-4 w-px bg-white/10' />
                <div className='flex item-center gap-2'>
                    <div className='flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[13px]'>
                        📁
                    </div>
                    <div className='max-w-[220px] truncate text-sm font-medium text-zinc-300'>
                        {currentProject?.currentProject?.name || " Project "}
                    </div>
                </div>
            </div>

            <div className='flex items-center gap-1.5'>
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowPreview((v) => !v)}
                    title={showpreview ? "Show Editor" : "Show Preview"}
                    className={`relative flex items-center justify-center rounded-lg p-2 transition-colors ${showpreview ? "text-sky-400" : "text-zinc-400 hover:text-zinc-200"
                        }`}
                >
                    <motion.div
                        className="absolute inset-0 rounded-lg bg-white/[0.06]"
                        transition={{ type: "spring", duration: 0.35, bounce: 0.15 }}
                    />
                    {showpreview ? <Eye size={16} className='relative' /> : <Code2 size={16} className='relative' />}
                </motion.button>
            </div>
        </div>
    )
}

export default TopBar

