/**
 * Entry point of the React application.
 * It mounts the `App` component within `BrowserRouter` so routing works.
 * Depends on `App.jsx` for the main component tree and `index.css` for
 * global styles. Loaded automatically by Vite when the page starts.
 */
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css' // O il tuo file CSS principale
import { BrowserRouter } from 'react-router-dom';

ReactDOM.createRoot(document.getElementById('root')).render(
  // <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  // </React.StrictMode>,
)