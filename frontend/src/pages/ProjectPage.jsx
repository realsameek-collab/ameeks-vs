import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import TopBar from '../components/TopBar'
import { getProject } from '../features/project'
import { getTree } from '../features/file'
import { setCurrentProject } from '../redux/projectSlice'
import ActivityBar from '../components/ActivityBar'
import Explorer from '../components/Explorer'
import { AnimatePresence, motion } from 'motion/react'
import { Code2, Eye, Maximize2, Minimize2 } from 'lucide-react'

function ProjectPage() {

  const [showExplorer, setShowExplorer] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [showTerminal, setShowTerminal] = useState(false)
  const [showpreview, setShowPreview] = useState(false)
  const [isPreviewFullScreen, setIsPreviewFullScreen] = useState(false)
  const [tree, setTree] = useState([])
  const { id } = useParams()
  const dispatch = useDispatch()
  const currentProject = useSelector((state) => state.project.currentProject)
  const loadTree = async () => {
    const data = await getTree(id)
    setTree(data)
  }
  useEffect(() => {
    let cancelled = false

    const loadInitialData = async () => {
      const treeData = await getTree(id)
      if (!cancelled) setTree(treeData)

      // Redux is cleared on refresh, so load the project from the URL id when needed
      if (currentProject?._id !== id) {
        const projectData = await getProject(id)
        if (!cancelled && projectData) dispatch(setCurrentProject(projectData))
      }
    }

    loadInitialData()
    return () => {
      cancelled = true
    }
  }, [id, currentProject?._id, dispatch])

  return (
    <div className='relative flex h-screen flex-col overflow-hidden bg-[#0a0a0c]'>
      <div className='pointer-events-none absolute -top-40 left-1/3 h-96 w-96 rounded-full bg-sky-500/10 blur-[140px]' />
      <div className='pointer-events-none absolute -top-20 right-1/4 h-80 w-80 rounded-full bg-violet-500/10 blur-[140px]' />
      <TopBar
        showpreview={showpreview}
        setShowPreview={setShowPreview}
      />
      <div className='flex flex-1 overflow-hidden'>
        <ActivityBar
          showExplorer={showExplorer}
          setShowExplorer={setShowExplorer}
          showChat={showChat}
          setShowChat={setShowChat}
          showTerminal={showTerminal}
          setShowTerminal={setShowTerminal}
        />
        <AnimatePresence initial={false}>
          {showExplorer && (
            <Explorer
              projectId={id}
              tree={tree}
              reloadTree={loadTree}

            />
          )}
        </AnimatePresence>
        <div className='relative flex w-full min-w-0 flex-1 flex-col overflow-hidden border-x border-white/[0.05]'>
          <div className='pointer-events-none absolute right-2 top-2 z-40 flex items-center gap-1.5 sm:right-4 sm:top-3 sm:gap-2'>
            <AnimatePresence>
              {showpreview && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  type="button"
                  onClick={() => setIsPreviewFullScreen((v) => !v)}
                  title={isPreviewFullScreen ? "Exit fullscreen" : "Fullscreen preview"}
                  className="pointer-events-auto flex items-center justify-center rounded-lg border border-white/10 bg-[#111113]/95 p-1.5 text-zinc-400 shadow-lg shadow-black/40 backdrop-blur hover:text-white sm:p-2"
                >
                  {isPreviewFullScreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                </motion.button>
              )}
              <div
                className="pointer-events-auto flex items-center gap-0.5 rounded-lg border border-white/10 bg-[#111113]/95 p-1 
                shadow-lg shadow-black/40 backdrop-blur"
              >
                <button
                  onClick={() => {
                    setShowPreview(false);
                    setIsPreviewFullScreen(false);
                  }}
                  className={`relative flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-semibold transition-colors 
                    sm:px-3 sm:py-1.5 sm:text-xs ${!showpreview ? "text-white" : "text-zinc-500 hover:text-zinc-300"}`}
                >
                  {!showpreview && (
                    <motion.div
                      className="absolute inset-0 rounded-md bg-gradient-to-b from-zinc-700 to-zinc-800"
                      transition={{ type: "spring", duration: 0.4, bounce: 0.15 }}
                    />

                  )
                  }
                  <Code2 size={13} className='relative'/>
                  <span className='relative hidden sm:inline'>Editor</span>




                </button>
                <button onClick={() => setShowPreview(true)}
                  className={`relative flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-semibold transition-colors 
                    sm:px-3 sm:py-1.5 sm:text-xs ${showpreview ? "text-white" : "text-zinc-500 hover:text-zinc-300"}`}
                >
                   {showpreview && (
                    <motion.div
                      className="absolute inset-0 rounded-md bg-gradient-to-b from-zinc-700 to-zinc-800"
                      transition={{ type: "spring", duration: 0.4, bounce: 0.15 }}
                    />

                  )
                  }
                  <Eye size={13} className='relative'/>
                 <span className='relative hidden sm:inline'>Preview</span>
                </button>


              </div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProjectPage