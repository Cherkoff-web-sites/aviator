import { BrowserRouter, Route, Routes } from 'react-router-dom'
import BookingModal from './components/booking/BookingModal'
import GiftCertificateModal from './components/giftCertificate/GiftCertificateModal'
import ScrollToTop from './components/ScrollToTop'
import { BookingModalProvider } from './contexts/BookingModalContext'
import { GiftCertificateModalProvider } from './contexts/GiftCertificateModalContext'
import AdminLayout from './pages/admin/AdminLayout'
import AdminCertificatesPage from './pages/admin/AdminCertificatesPage'
import AdminDashboardPage from './pages/admin/AdminDashboardPage'
import AdminSectionPage from './pages/admin/AdminSectionPage'
import AdminSettingsPage from './pages/admin/AdminSettingsPage'
import AdminStaffSchedulePage from './pages/admin/AdminStaffSchedulePage'
import { ADMIN_NAV_MAIN } from './data/adminNav'
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
                <Route path="/admin" element={<AdminLayout />}>
                  <Route index element={<AdminDashboardPage />} />
                  <Route path="settings" element={<AdminSettingsPage />} />
                  <Route path="certificates" element={<AdminCertificatesPage />} />
                  <Route path="staff-schedule" element={<AdminStaffSchedulePage />} />
                  {ADMIN_NAV_MAIN.filter(
                    (item) =>
                      item.to !== '/admin' &&
                      item.to !== '/admin/certificates' &&
                      item.to !== '/admin/staff-schedule',
                  ).map((item) => (
                    <Route
                      key={item.to}
                      path={item.to.slice('/admin/'.length)}
                      element={<AdminSectionPage />}
                    />
                  ))}
                </Route>
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
