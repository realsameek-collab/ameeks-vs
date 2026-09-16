import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import TopBar from '../components/TopBar'
import { getProject } from '../features/project'
import { getTree } from '../features/file'
import { setCurrentProject } from '../redux/projectSlice'
import ActivityBar from '../components/ActivityBar'
import Explorer from '../components/Explorer'
import { AnimatePresence } from 'motion/react'

function ProjectPage() {

  const [showExplorer, setShowExplorer] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [showTerminal, setShowTerminal] = useState(false)
  const [showpreview, setShowPreview] = useState(false)
  const [tree,setTree] = useState([])
  const { id } = useParams()
  const dispatch = useDispatch()
  const currentProject = useSelector((state) => state.project.currentProject)
  const loadTree = async () => {
    const data = await getTree(id)
    setTree(data)
  }
  useEffect(() => {
    loadTree()
    // Redux is cleared on refresh, so load the project from the URL id when needed
    if (currentProject?._id === id) return

    const loadProject = async () => {
      const data = await getProject(id)
      if (data) dispatch(setCurrentProject(data))
    }
    loadProject()
  }, [id, currentProject?._id, dispatch])

  return (
    <div className='relative flex h-screen flex-col overflow-hidden bg-[#0a0a0c]'>
        <div className='pointer-events-none absolute -top-40 left-1/3 h-96 w-96 rounded-full bg-sky-500/10 blur-[140px]'/>
        <div className='pointer-events-none absolute -top-20 right-1/4 h-80 w-80 rounded-full bg-violet-500/10 blur-[140px]'/>
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
        </div>
    </div>
  )
}

export default ProjectPage
