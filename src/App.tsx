import { BrowserRouter, Route, Routes } from 'react-router-dom'
import HomePage from './pages/HomePage'
import SimulatorPage from './pages/SimulatorPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/simulator/:slug" element={<SimulatorPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
