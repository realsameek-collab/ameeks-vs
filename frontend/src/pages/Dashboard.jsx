import { signInWithPopup } from 'firebase/auth';
import React from 'react'
import { FcGoogle } from "react-icons/fc";
import { auth, googleProvider } from '../../firebase';
import { login } from '../features/login';
import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setUserData } from '../redux/userSlice';
import NavBar from '../components/NavBar';
import SideBar from '../components/SideBar';
import { Plus } from 'lucide-react';
import { getProjects, getStarredProjects } from '../features/project';
import { setProjects, setStarredProjects } from '../redux/projectSlice';
function Dashboard() {
    const [loading, setLoading] = useState(false)
    const [activeSession, setActiveSession] = useState("projects")
    const [loadingProjects, setLoadingProjects] = useState(false)
    const dispatch = useDispatch()
    const { userData } = useSelector(state => state.user)

    const handleLogin = async () => {
        setLoading(true)
        const result = await signInWithPopup(auth, googleProvider)
        const token = await result.user.getIdToken()
        const data = await login(token)
        dispatch(setUserData(data))
        setLoading(false)
    }
    
    const fetchAllProjects = async () => {
          
            const data = await getProjects()
            dispatch(setProjects(data))
    }
     const fetchStarredProjects = async () => {
          
            const data = await getStarredProjects()
            dispatch(setStarredProjects(data))
    }
    useEffect(() => {
        if(activeSession === 'projects'){
            fetchAllProjects()
        }else{
            fetchStarredProjects()
        }
    },[activeSession])

    if (!userData) {
        return (
            <div className='relative flex
         h-screen w-full 
         items-center justify-center
          overflow-hidden bg-slate-50 px-4
           transition-colors duration-300 
           dark:bg-[#07070c]
'>
                <div className='pointer-events-none absolute
         -top-32 left-1/2 hidden h-[600px]
          w-[600px] -translate-x-1/2
           rounded-full bg-white/[0.05]
            blur-[120px] dark:block
'/>
                <div className='relative w-full max-w-sm
         rounded-2xl border border-slate-200/70 
         bg-white/80 p-8 text-center shadow-xl 
         shadow-slate-200/50 backdrop-blur-xl
          dark:border-white/[0.08] dark:bg-white/[0.03]
           dark:shadow-black/40
'>
                    <div className='mx-auto mb-5 flex h-14 w-14
         items-center justify-center rounded-xl
          border border-slate-200 bg-white
           shadow-lg shadow-black/5 dark:border-transparent
'>
                        <span className='text-lg 
                    font-bold
                    text-slate-900
                    '>
                            AI
                        </span>
                    </div>
                    <h2 className='mb-2
                    text-xl
                    font-bold
                    text-slate-900
                    dark:text-white'>
                        Welcome to AmeekAI
                    </h2>
                    <p className='mb-6 text-[13.5px] leading-relaxed text-slate-500 dark:text-slate-400'>
                        Sign in to access your projects and continue building
                    </p>

                    <button
                        onClick={handleLogin}
                        disabled={loading}
                        className='flex w-full items-center justify-center gap-3 rounded-lg border border-slate-200 
                bg-white py-2.5 text-[13.5px] font-medium text-slate-800 shadow-sm transition-colors duration-150 
                hover:bg-slate-50 disabled:opacity-70 dark:border-transparent dark:bg-white dark:hover:bg-slate-100
'>
                        <FcGoogle />
                        {loading ? "Signing in..." : "Continue with Google"}
                    </button>
                    <p className='mt-5 text-[11px] text-slate-400 dark:text-slate-600'>
                        By continuing you agree to our Terms & privacy Policy
                    </p>

                </div>
            </div>
        )
    }

    return (
        <div className='relative flex h-screen w-full flex-col
     overflow-hidden bg-slate-50 transition-colors duration-300 dark:bg-[#07070c]'>
            <div className='pointer-events-none absolute -top-40 left-1/3 
        hidden h-[700px] w-[700px] rounded-full bg-white/[0.04] blur-[140px] dark:block'/>
            <div className='pointer-events-none absolute right-0 top-1/3 
        hidden h-[500px] w-[500px] rounded-full bg-white/[0.03] blur-[130px] dark:block'/>

            <div className='relative flex min-h-0 flex-1 flex-col'>
                <NavBar />
                <div className='flex min-h-0 flex-1'>
                    <SideBar activeSession={activeSession} setActiveSession={setActiveSession} />
                    <div
                        className='min-h-0 flex-1 overflow-y-auto px-8 py-8 [scrollbar-width:thin] [scrollbar-color:rgba(100,116,139,0.35)_transparent] 
                [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full
                 [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:border-2 [&::-webkit-scrollbar-thumb]:border-solid 
                 [&::-webkit-scrollbar-thumb]:border-transparent [&::-webkit-scrollbar-thumb]:bg-clip-padding hover:[&::-webkit-scrollbar-thumb]:bg-slate-400 
                 dark:[&::-webkit-scrollbar-thumb]:bg-white/10 dark:hover:[&::-webkit-scrollbar-thumb]:bg-white/20'>
                        <div className='mb-8 flex items-start justify-between gap-3'>
                            <div>
                                <h1 className='text-[22px] font-semibold text-slate-900 dark:text-white flex items-center gap-2'>
                                    Welcome back, {userData?.name} <span className='animate-wave'>👋</span>
                                </h1>
                                <p className='mt-1 text-[13.5px] text-slate-500 dark:text-slate-400'>
                                    Lets build something amazing together!
                                </p>
                            </div>
                            <button className='flex shrink-0 items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2.5 text-[13.5px] 
                            font-semibold text-white shadow-sm transition-opacity duration-150 hover:opacity-90 dark:bg-white dark:text-slate-900'>
                               <Plus size={16} />
                               New Project
                            </button>
                        </div>
                        <div className='mb-4 flex items-center justify-between'>
                            <h2 className='text-[16px] font-semibold text-slate-900 dark:text-white'>
                                {activeSession === 'projects' ? "Your Projects" : "Starred Projects"}
                            </h2>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )


}

export default Dashboard