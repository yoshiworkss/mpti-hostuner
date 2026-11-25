import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom'
import { PageShell } from './components/layout/PageShell'
import { LoadingSkeleton, ToastStack } from './components/ui/FeedbackStates'
import { HostunerRevisionProvider } from './context/HostunerRevisionProvider'
import { HomePage } from './pages/HomePage'
import { NotFoundPage } from './pages/NotFoundPage'
import './styles/revisionOverrides.css'

// Tahap 2 Store, Search & Domain Flows (lazy code-split chunks)
const SearchResultsPage = lazy(() =>
  import('./pages/SearchResultsPage').then((m) => ({ default: m.SearchResultsPage }))
)
const StoreCategoryPage = lazy(() =>
  import('./pages/StoreCategoryPage').then((m) => ({ default: m.StoreCategoryPage }))
)
const DomainRegisterPage = lazy(() =>
  import('./pages/DomainSearchPage').then((m) => ({ default: m.DomainRegisterPage }))
)
const DomainTransferPage = lazy(() =>
  import('./pages/DomainSearchPage').then((m) => ({ default: m.DomainTransferPage }))
)
const OrderChooseDomainPage = lazy(() =>
  import('./pages/OrderFlowPages').then((m) => ({ default: m.OrderChooseDomainPage }))
)
const OrderConfigurePage = lazy(() =>
  import('./pages/OrderFlowPages').then((m) => ({ default: m.OrderConfigurePage }))
)

// Revisi Tahap 3.1 Cart, Checkout, QRIS Statis Invoice & Auth
const ShoppingCartPage = lazy(() =>
  import('./pages/ShoppingCartPage').then((m) => ({ default: m.ShoppingCartPage }))
)
const ReviewCheckoutPage = lazy(() =>
  import('./pages/ReviewCheckoutPage').then((m) => ({ default: m.ReviewCheckoutPage }))
)
const QrisInvoicePage = lazy(() =>
  import('./pages/QrisInvoicePage').then((m) => ({ default: m.QrisInvoicePage }))
)
const LoginRevisionPage = lazy(() =>
  import('./pages/AuthRevisionPages').then((m) => ({ default: m.LoginRevisionPage }))
)
const RegisterRevisionPage = lazy(() =>
  import('./pages/AuthRevisionPages').then((m) => ({ default: m.RegisterRevisionPage }))
)
const VerifyEmailPage = lazy(() =>
  import('./pages/AuthRevisionPages').then((m) => ({ default: m.VerifyEmailPage }))
)
const PasswordResetRevisionPage = lazy(() =>
  import('./pages/AuthRevisionPages').then((m) => ({ default: m.PasswordResetRevisionPage }))
)

// Tahap 4 Client Area & Support Hub (WBS 2.15)
const ClientAreaPage = lazy(() =>
  import('./pages/ClientAreaPage').then((m) => ({ default: m.ClientAreaPage }))
)
const AnnouncementsPage = lazy(() =>
  import('./pages/AnnouncementsPage').then((m) => ({ default: m.AnnouncementsPage }))
)
const KnowledgebaseIndexPage = lazy(() =>
  import('./pages/KnowledgebasePages').then((m) => ({ default: m.KnowledgebaseIndexPage }))
)
const KnowledgebaseCategoryPage = lazy(() =>
  import('./pages/KnowledgebasePages').then((m) => ({ default: m.KnowledgebaseCategoryPage }))
)
const KnowledgebaseArticlePage = lazy(() =>
  import('./pages/KnowledgebasePages').then((m) => ({ default: m.KnowledgebaseArticlePage }))
)
const DownloadsPage = lazy(() =>
  import('./pages/DownloadsPage').then((m) => ({ default: m.DownloadsPage }))
)
const NetworkStatusPage = lazy(() =>
  import('./pages/SupportPortalPages').then((m) => ({ default: m.NetworkStatusPage }))
)
const AffiliatesPage = lazy(() =>
  import('./pages/SupportPortalPages').then((m) => ({ default: m.AffiliatesPage }))
)
const TicketsPage = lazy(() =>
  import('./pages/SupportPortalPages').then((m) => ({ default: m.TicketsPage }))
)
const OpenTicketPage = lazy(() =>
  import('./pages/SupportPortalPages').then((m) => ({ default: m.OpenTicketPage }))
)
const ContactUsPage = lazy(() =>
  import('./pages/SupportPortalPages').then((m) => ({ default: m.ContactUsPage }))
)

// Tahap 5 Admin Portal Modules (WBS 2.16–2.17)
const AdminOverviewPage = lazy(() =>
  import('./pages/AdminOverviewLogsPages').then((m) => ({ default: m.AdminOverviewPage }))
)
const AdminLogsPage = lazy(() =>
  import('./pages/AdminOverviewLogsPages').then((m) => ({ default: m.AdminLogsPage }))
)
const AdminProductsPage = lazy(() =>
  import('./pages/AdminCrudPages').then((m) => ({ default: m.AdminProductsPage }))
)
const AdminUsersPage = lazy(() =>
  import('./pages/AdminCrudPages').then((m) => ({ default: m.AdminUsersPage }))
)
const AdminContentPage = lazy(() =>
  import('./pages/AdminContentPaymentPages').then((m) => ({ default: m.AdminContentPage }))
)
const AdminPaymentsPage = lazy(() =>
  import('./pages/AdminContentPaymentPages').then((m) => ({ default: m.AdminPaymentsPage }))
)

// DEV-only QA Workbench (completely tree-shaken out of production bundle)
const Stage1FoundationPreview = import.meta.env.DEV
  ? lazy(() => import('./pages/Stage1FoundationPreview').then((m) => ({ default: m.Stage1FoundationPreview })))
  : null

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

function RouteLoadingFallback() {
  return (
    <PageShell>
      <div className="py-4">
        <LoadingSkeleton variant="cards" count={2} />
      </div>
    </PageShell>
  )
}

export function App() {
  return (
    <BrowserRouter>
      <HostunerRevisionProvider>
        <ScrollToTop />
        <Suspense fallback={<RouteLoadingFallback />}>
          <Routes>
            {/* Tahap 2 Public Home, Search, Store & Domain Flow (Untouched) */}
            <Route path="/" element={<HomePage />} />
            <Route path="/search" element={<SearchResultsPage />} />
            <Route path="/store/:slug" element={<StoreCategoryPage />} />
            <Route path="/domain/register" element={<DomainRegisterPage />} />
            <Route path="/domain/transfer" element={<DomainTransferPage />} />
            <Route path="/order/domain" element={<OrderChooseDomainPage />} />
            <Route path="/order/configure" element={<OrderConfigurePage />} />

            {/* Revisi Tahap 3.1: Shopping Cart, Review & Checkout, QRIS Statis Invoice & Auth */}
            <Route path="/cart" element={<ShoppingCartPage />} />
            <Route path="/checkout" element={<ReviewCheckoutPage />} />
            <Route path="/checkout/invoice/:invoiceNumber" element={<QrisInvoicePage />} />
            <Route path="/login" element={<LoginRevisionPage />} />
            <Route path="/register" element={<RegisterRevisionPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />
            <Route path="/password-reset" element={<PasswordResetRevisionPage />} />

            {/* Tahap 1 QA Workbench — DEV-only (Q5: stripped from production build) */}
            {Stage1FoundationPreview && <Route path="/tahap-1" element={<Stage1FoundationPreview />} />}

            {/* Tahap 4 Client Area & Support Hub (WBS 2.15) */}
            <Route path="/client" element={<ClientAreaPage />} />
            <Route path="/announcements" element={<AnnouncementsPage />} />
            <Route path="/knowledgebase" element={<KnowledgebaseIndexPage />} />
            <Route path="/knowledgebase/:category" element={<KnowledgebaseCategoryPage />} />
            <Route path="/knowledgebase/article/:slug" element={<KnowledgebaseArticlePage />} />
            <Route path="/downloads" element={<DownloadsPage />} />
            <Route path="/downloads/:category" element={<DownloadsPage />} />
            <Route path="/network-status" element={<NetworkStatusPage />} />
            <Route path="/affiliates" element={<AffiliatesPage />} />
            <Route path="/tickets" element={<TicketsPage />} />
            <Route path="/tickets/open" element={<OpenTicketPage />} />
            <Route path="/contact" element={<ContactUsPage />} />

            {/* Tahap 5 Admin Portal Modules (WBS 2.16–2.17) */}
            <Route path="/admin" element={<AdminOverviewPage />} />
            <Route path="/admin/logs" element={<AdminLogsPage />} />
            <Route path="/admin/products" element={<AdminProductsPage />} />
            <Route path="/admin/users" element={<AdminUsersPage />} />
            <Route path="/admin/content" element={<AdminContentPage />} />
            <Route path="/admin/payments" element={<AdminPaymentsPage />} />

            {/* Clean 404 Fallback */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
        <ToastStack />
      </HostunerRevisionProvider>
    </BrowserRouter>
  )
}

export default App
