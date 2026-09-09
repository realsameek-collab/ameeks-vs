import React, { useState } from 'react'
import { motion, AnimatePresence } from "motion/react"
import { Star, Trash2 } from 'lucide-react'
import { useDispatch } from 'react-redux'
import { deleteProject, toggleStar } from '../features/project'
import { setProjectStar } from '../redux/projectSlice'

function ProjectCard({ project }) {
  const [confirmDelete, setconfirmDelete] = useState(false)
  const dispatch = useDispatch()

  const handleToggleStar = async (e) => {
    e.stopPropagation()
    const nextStarred = !project.starred

    dispatch(setProjectStar({ id: project._id, starred: nextStarred }))

    const result = await toggleStar(project._id)
    if (result === null) {
      dispatch(setProjectStar({ id: project._id, starred: !nextStarred }))
    }
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
      dark:hover:border-white/[0.14] dark:hover:bg-white/[0.045]"
    >
      <motion.button
        type="button"
        whileTap={{ scale: 0.82 }}
        onClick={handleToggleStar}
        aria-label={project.starred ? "Unstar project" : "Star project"}
        aria-pressed={!!project.starred}
        className={`absolute right-4 top-4 flex items-center justify-center rounded-md p-1.5 transition-colors duration-150 hover:text-amber-400
          ${project.starred ? "opacity-100 text-amber-400" : "opacity-0 text-zinc-300 group-hover:opacity-100 dark:text-zinc-600"}`}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={project.starred ? "filled" : "empty"}
            initial={{ scale: 0.4, rotate: -30, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            exit={{ scale: 0.4, opacity: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 22 }}
            className="block"
          >
            <Star
              size={15}
              className={project.starred ? "fill-amber-400 text-amber-400" : ""}
            />
          </motion.span>
        </AnimatePresence>
      </motion.button>

      <h3 className='mb-1.5 truncate pr-6 text-[14px] font-semibold
       tracking-tight text-zinc-900 dark:text-white'>{project.name}</h3>
      <p className='line-clamp-2 min-h-[2.5em] text-[12.5px] leading-snug text-zinc-500'>{project.description || "No Description"}</p>

      <div className='mt-4 flex items-center justify-end border-t border-black/[0.05] pt-3 dark:border-white/[0.06]'>
        {confirmDelete ? (
          <motion.div
            initial={{
              opacity: 0,
            }}
            animate={{
              opacity: 1,
            }}
            exit={{
              opacity: 0,
            }}
            className='flex items-center gap-2'

          >
            <button
              onClick={() => setconfirmDelete(false)}
              className='rounded-md px-2 py-1 text-[11px] text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300'
            >Cancel</button>

            <button
              onClick={handleDelete}
              className="rounded-md bg-red-500/10 px-2 py-1 text-[11px] font-medium text-red-500 hover:bg-red-500/20 
              dark:text-red-400 disabled:cursor-wait disabled:opacity-50"
            >
              Yes
            </button>



          </motion.div>
        ) : <motion.div
          initial={{
            opacity: 0,
          }}
          animate={{
            opacity: 1,
          }}
          exit={{
            opacity: 0,
          }}
          whileTap={{
            scale: 0.92,
          }}
          onClick={(e) => {
            setConfirmDelete(true);
          }}

          className='flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] text-zinc-300 opacity-0 transition-opacity
           hover:text-red-500 group-hover:opacity-100 dark:text-zinc-600 dark:hover:text-red-400'
        >
          <Trash2 size={13}/>

        </motion.div>}
      </div>
    </motion.div>
  )
}

export default ProjectCard
