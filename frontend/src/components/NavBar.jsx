import React from 'react'
import { FiMoon } from "react-icons/fi";
import { useEffect, useState } from 'react';
import {IoSunnyOutline} from "react-icons/io5"

function NavBar() {
    const [isDark,setIsDark] = useState(true)
    useEffect(()=>{
         if(typeof window === 'undefined')return;
         const theme = window.localStorage.getItem('theme');
         const dark = theme?theme=='dark':true;
         document.documentElement.classList.toggle('dark',dark)
         setIsDark(dark)


    },[])

    const toggleTheme = ()=>{
           const next = !isDark
           setIsDark(next)
           document.documentElement.classList.toggle('dark',next)
           window.localStorage.setItem('theme',next?'dark':'light')
    }
  return (
    <div className='w-full h-16 bg-white/70 dark:bg-white/[0.03] backdrop-blur-xl border-b border-slate-200/70 
    dark:border-white/[0.07] flex items-center px-6 gap-6 font-sans transition-colors duration-300'>
        <div className='flex item-center gap-2.5 shrink-0 '>
           <span className='text-slate-900 dark:text-white font-bold text-[17px] tracking-tight'>
            AmeekAI
           </span>
        </div>
        <div className='flex items-center gap-2 shrink-0'>
            <button onClick={toggleTheme} className='w-9 h-9 flex items-center justify-center rounded-lg
             text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white
              hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors duration-150'>
               {isDark ?<FiMoon size={20}/> : <IoSunnyOutline size={20}/>}
            </button>
        </div>
        </div>
  )
}

export default NavBar