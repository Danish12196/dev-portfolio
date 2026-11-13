import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './shell/theme'
import './styles/tokens.css'
import './styles/app.css'
import './achievements/achievements.css'
import App from './App'
import { initAchievementClock } from './achievements'
import { greet } from './achievements/console'
import { handleSecretPath } from './achievements/routes'
import { startVisitClock } from './shell/visit'
import { initAchievementRun } from './leaderboard/achievementRun'

handleSecretPath()
greet()
startVisitClock()
initAchievementClock()
initAchievementRun()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
