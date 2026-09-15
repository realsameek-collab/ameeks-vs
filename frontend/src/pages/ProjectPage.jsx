import React, { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import TopBar from '../components/TopBar'
import { getProject } from '../features/project'
import { setCurrentProject } from '../redux/projectSlice'
import ActivityBar from '../components/ActivityBar'

function ProjectPage() {
  const { id } = useParams()
  const dispatch = useDispatch()
  const currentProject = useSelector((state) => state.project.currentProject)

  useEffect(() => {
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
        <TopBar/>
        <div className='flex flex-1 overflow-hidden'>
           <ActivityBar/>
        </div>
    </div>
  )
}

export default ProjectPage
