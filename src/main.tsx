import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
/* WebGL vignettes on the record cards, the scroll-scrubbed delivery sequence in
   #how, and the film poster. Side-effect import: the module boots itself and
   waits on the DOM, exactly as it did when it was a post-build script tag. */
import './lib/bmEnhance.js'
/* nav hide-on-scroll and the scroll-reveal motion layer */
import './lib/bmChrome.js'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
