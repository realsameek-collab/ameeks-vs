import { signInWithPopup } from 'firebase/auth'
import React, { useEffect } from 'react'
import { auth, googleProvider } from '../firebase'
import { login } from './features/login'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import { me } from './features/me'
import { useDispatch } from 'react-redux'
import { setUserData } from './redux/userSlice'

function App() {
  const dispatch = useDispatch()
  useEffect(()=>{
       const fetch = async()=>{
        const data = await me()
        dispatch(setUserData(data))
       }
       fetch()
  },[])
  return (
    <BrowserRouter>
    <Routes>
      <Route path='/' element={<Dashboard/>}/>
    </Routes>
    </BrowserRouter>
  )
}

export default App