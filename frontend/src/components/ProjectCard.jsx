import React, { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  Star,
  Trash2,
  Loader2,
  AlertCircle,
  FolderKanban,
  ArrowUpRight,
} from 'lucide-react'
import { useDispatch } from 'react-redux'
import { deleteProject, toggleStar } from '../features/project'
import { setProjectStar, removeProject } from '../redux/projectSlice'

function ProjectCard({ project }) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState(false)
  const dispatch = useDispatch()

  const handleToggleStar = async (e) => {
    e.stopPropagation()

    const nextStarred = !project.starred

    // Optimistic UI update
    dispatch(setProjectStar({ id: project._id, starred: nextStarred }))

    const result = await toggleStar(project._id)

    // Roll back if the request failed
    if (result === null) {
      dispatch(setProjectStar({ id: project._id, starred: !nextStarred }))
    }
  }

  const handleDelete = async (e) => {
    e.stopPropagation()

    setIsDeleting(true)
    setDeleteError(false)

    const result = await deleteProject(project._id)

    if (result === null) {
      setIsDeleting(false)
      setDeleteError(true)
      return
    }

    dispatch(removeProject(project._id))
  }

  const cancelDelete = (e) => {
    e.stopPropagation()

    if (isDeleting) return

    setConfirmDelete(false)
    setDeleteError(false)
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      whileHover={{ y: -3 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="
        group relative flex min-h-[190px] cursor-pointer flex-col overflow-hidden
        rounded-2xl border border-black/[0.07] bg-white
        shadow-[0_1px_2px_rgba(0,0,0,0.03)]
        transition-all duration-300
        hover:border-black/[0.11]
        hover:shadow-[0_14px_38px_rgba(0,0,0,0.08)]
        dark:border-white/[0.07] dark:bg-white/[0.035]
        dark:shadow-[0_1px_2px_rgba(0,0,0,0.18)]
        dark:hover:border-white/[0.13]
        dark:hover:bg-white/[0.045]
        dark:hover:shadow-[0_18px_45px_rgba(0,0,0,0.28)]
      "
    >
      {/* Subtle premium accent */}
      <div
        className="
          pointer-events-none absolute inset-x-0 top-0 h-px
          bg-gradient-to-r from-transparent via-violet-400/50 to-transparent
          opacity-0 transition-opacity duration-300
          group-hover:opacity-100
        "
      />

      <div className="flex flex-1 flex-col p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div
              className="
                flex h-9 w-9 shrink-0 items-center justify-center rounded-xl
                border border-black/[0.06] bg-zinc-50
                text-zinc-500 transition-all duration-300
                group-hover:border-violet-500/20
                group-hover:bg-violet-500/[0.08]
                group-hover:text-violet-500
                dark:border-white/[0.07] dark:bg-white/[0.04]
                dark:text-zinc-400 dark:group-hover:text-violet-300
              "
            >
              <FolderKanban size={17} strokeWidth={1.8} />
            </div>

            <div className="min-w-0">
              <div className="mb-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-400 dark:text-zinc-500">
                Project
              </div>

              <h3 className="truncate text-[14px] font-semibold tracking-[-0.01em] text-zinc-900 dark:text-white">
                {project.name}
              </h3>
            </div>
          </div>

          <motion.button
            type="button"
            whileTap={{ scale: 0.82 }}
            onClick={handleToggleStar}
            aria-label={project.starred ? 'Unstar project' : 'Star project'}
            aria-pressed={!!project.starred}
            className={`
              flex h-8 w-8 shrink-0 items-center justify-center rounded-lg
              border transition-all duration-200
              ${
                project.starred
                  ? 'border-amber-400/20 bg-amber-400/10 text-amber-400 opacity-100'
                  : 'border-transparent text-zinc-300 opacity-0 group-hover:opacity-100 hover:border-black/[0.06] hover:bg-black/[0.03] hover:text-amber-400 dark:text-zinc-600 dark:hover:border-white/[0.07] dark:hover:bg-white/[0.05]'
              }
            `}
          >
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={project.starred ? 'filled' : 'empty'}
                initial={{ scale: 0.4, rotate: -25, opacity: 0 }}
                animate={{ scale: 1, rotate: 0, opacity: 1 }}
                exit={{ scale: 0.4, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 22 }}
              >
                <Star
                  size={15}
                  strokeWidth={1.8}
                  className={project.starred ? 'fill-amber-400' : ''}
                />
              </motion.span>
            </AnimatePresence>
          </motion.button>
        </div>

        {/* Description */}
        <p
          className="
            mt-5 line-clamp-3 min-h-[3.75rem] text-[12.5px]
            leading-[1.55] text-zinc-500 dark:text-zinc-400
          "
        >
          {project.description || 'No description has been added to this project yet.'}
        </p>

        {/* Footer */}
        <div
          className="
            mt-auto flex min-h-[42px] items-end justify-between
            border-t border-black/[0.055] pt-3.5
            dark:border-white/[0.06]
          "
        >
          <AnimatePresence mode="wait" initial={false}>
            {deleteError ? (
              <motion.span
                key="error"
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-1.5 text-[11px] font-medium text-red-500 dark:text-red-400"
              >
                <AlertCircle size={12} />
                Failed to delete
              </motion.span>
            ) : (
              <motion.span
                key="hint"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="
                  flex items-center gap-1 text-[10.5px] font-medium
                  text-zinc-400 transition-colors
                  group-hover:text-zinc-500 dark:text-zinc-600
                  dark:group-hover:text-zinc-500
                "
              >
                Open project
                <ArrowUpRight size={11} />
              </motion.span>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait" initial={false}>
            {confirmDelete ? (
              <motion.div
                key="confirm"
                initial={{ opacity: 0, scale: 0.96, x: 4 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.14 }}
                className="flex items-center gap-1.5"
              >
                <span className="mr-1 hidden text-[10.5px] font-medium text-zinc-400 sm:inline dark:text-zinc-500">
                  Delete project?
                </span>

                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={cancelDelete}
                  className="
                    rounded-lg px-2.5 py-1.5 text-[10.5px] font-medium
                    text-zinc-400 transition-colors
                    hover:bg-black/[0.04] hover:text-zinc-700
                    disabled:pointer-events-none disabled:opacity-40
                    dark:text-zinc-500 dark:hover:bg-white/[0.05]
                    dark:hover:text-zinc-300
                  "
                >
                  Cancel
                </button>

                <motion.button
                  type="button"
                  whileTap={{ scale: isDeleting ? 1 : 0.94 }}
                  disabled={isDeleting}
                  onClick={handleDelete}
                  className="
                    flex items-center gap-1.5 rounded-lg
                    bg-red-500/10 px-2.5 py-1.5 text-[10.5px]
                    font-semibold text-red-500 transition-colors
                    hover:bg-red-500/15
                    disabled:cursor-wait disabled:opacity-70
                    dark:bg-red-400/10 dark:text-red-400
                    dark:hover:bg-red-400/15
                  "
                >
                  {isDeleting ? (
                    <>
                      <Loader2 size={12} className="animate-spin" />
                      Deleting…
                    </>
                  ) : (
                    <>
                      <Trash2 size={12} />
                      Delete
                    </>
                  )}
                </motion.button>
              </motion.div>
            ) : (
              <motion.button
                key="trigger"
                type="button"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                whileTap={{ scale: 0.9 }}
                onClick={(e) => {
                  e.stopPropagation()
                  setConfirmDelete(true)
                }}
                aria-label="Delete project"
                className="
                  flex h-8 w-8 items-center justify-center rounded-lg
                  border border-transparent text-zinc-300 opacity-0
                  transition-all duration-200
                  hover:border-red-500/10 hover:bg-red-500/10
                  hover:text-red-500 group-hover:opacity-100
                  dark:text-zinc-600 dark:hover:border-red-400/10
                  dark:hover:bg-red-400/10 dark:hover:text-red-400
                "
              >
                <Trash2 size={14} strokeWidth={1.8} />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  )
}

export default ProjectCard
