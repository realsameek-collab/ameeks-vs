import React, { useState } from 'react'
import { motion } from "motion/react"
import { Star } from 'lucide-react'
import { deleteProject, toggleStar } from '../features/project'

function ProjectCard({ project }) {
  const [loadingStar, setLoadingStar] = useState(false)
  const handleToggleStar = async () => {
    setLoadingStar(true)
    await toggleStar(project._id)
    setLoadingStar(false)
  }
  const handledelete = async () => {
    await deleteProject(project._id)
  }
  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 8,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      exit={{
        opacity: 0,
        scale: 0.97,
      }}
      whileHover={{
        y: -3,
      }}
      transition={{
        duration: 0.18,
        ease: "easeOut",
      }}
      className="group relative cursor-pointer rounded-2xl border border-black/[0.06] bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] 
      transition-all duration-200 hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] dark:border-white/[0.07] dark:bg-white/[0.03] dark:shadow-none 
      dark:hover:border-white/[0.14] dark:hover:bg-white/[0.045]">

      <motion.div
        whileTap={{
          scale: 0.9,
        }}
        disabled={loadingStar}
        onClick={handleToggleStar}
        className={`absolute right-4 top-4 rounded-md p-1 transition-opacity hover:text-amber-400
          ${project.starred ? "opacity-100 text-amber-400" : "opacity-0 text-zinc-300 group-hover:opacity-100 dark:text-zinc-600"}
          ${loadingStar ? "cursor-wait opacity-60" : ""}`}
      >
        <Star
          size={15}
          className={
            project.starred
              ? "fill-amber-400 text-amber-400"
              : ""
          }
        />

      </motion.div>
    </motion.div>

  )
}

export default ProjectCard