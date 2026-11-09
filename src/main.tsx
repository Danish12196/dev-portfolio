import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './shell/theme'
import './styles/tokens.css'
import './styles/app.css'
import './achievements/achievements.css'
import App from './App'
import { greet } from './achievements/console'
import { handleSecretPath } from './achievements/routes'
import { startVisitClock } from './shell/visit'

handleSecretPath()
greet()
startVisitClock()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
