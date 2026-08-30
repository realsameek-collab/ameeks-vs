import { signInWithPopup } from 'firebase/auth'
import React from 'react'
import { auth, googleProvider } from '../firebase'
import { login } from './features/login'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Dashboard from './pages/Dashboard'

function App() {

  



  return (
    <BrowserRouter>
    <Routes>
      <Route path='/' element={<Dashboard/>}/>
    </Routes>
    </BrowserRouter>
  )
}

export default App