import { signInWithPopup } from 'firebase/auth'
import React from 'react'
import { auth, googleProvider } from '../firebase'
import { login } from './features/login'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Dashboard from './pages/Dashboard'

function App() {

  



  const handleLogin = async()=>{
    const result = await signInWithPopup(auth,googleProvider)
    const token = await result.user.getIdToken()
    const data = await login(token)
  }
  return (
    <BrowserRouter>
    <Routes>
      <Route path='/' element={<Dashboard/>}/>
    </Routes>
    </BrowserRouter>
  )
}

export default App