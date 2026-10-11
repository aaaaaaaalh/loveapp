import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, HashRouter } from 'react-router-dom'
import { MotionConfig } from 'framer-motion'
import { App } from './App'
import { ToastProvider } from './components/ToastProvider'
import { AuthProvider } from './components/AuthProvider'
import './index.css'

const Router = import.meta.env.VITE_ROUTER_MODE === 'hash' ? HashRouter : BrowserRouter
createRoot(document.getElementById('root')!).render(<StrictMode><Router><MotionConfig reducedMotion="user"><ToastProvider><AuthProvider><App /></AuthProvider></ToastProvider></MotionConfig></Router></StrictMode>)
