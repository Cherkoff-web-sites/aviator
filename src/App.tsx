import { BrowserRouter, Route, Routes } from 'react-router-dom'
import BookingModal from './components/booking/BookingModal'
import GiftCertificateModal from './components/giftCertificate/GiftCertificateModal'
import ScrollToTop from './components/ScrollToTop'
import { BookingModalProvider } from './contexts/BookingModalContext'
import { GiftCertificateModalProvider } from './contexts/GiftCertificateModalContext'
import ContactsPage from './pages/ContactsPage'
import FaqPage from './pages/FaqPage'
import GalleryPage from './pages/GalleryPage'
import HomePage from './pages/HomePage'
import PricesPage from './pages/PricesPage'
import SimulatorPage from './pages/SimulatorPage'

function App() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <BrowserRouter>
        <BookingModalProvider>
          <GiftCertificateModalProvider>
            <ScrollToTop />
            <div className="flex min-h-0 flex-1 flex-col">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/gallery" element={<GalleryPage />} />
                <Route path="/prices" element={<PricesPage />} />
                <Route path="/contacts" element={<ContactsPage />} />
                <Route path="/faq" element={<FaqPage />} />
                <Route path="/simulator/:slug" element={<SimulatorPage />} />
              </Routes>
            </div>
            <BookingModal />
            <GiftCertificateModal />
          </GiftCertificateModalProvider>
        </BookingModalProvider>
      </BrowserRouter>
    </div>
  )
}

export default App
