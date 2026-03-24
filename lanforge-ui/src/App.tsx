import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Intercom from '@intercom/messenger-js-sdk';
import './App.css';
import Header from './components/Header';
import Footer from './components/Footer';
import ScrollProgress from './components/ScrollProgress';
import ScrollToTop from './components/ScrollToTop';
import HomePage from './pages/HomePage';
import ConfiguratorPage from './pages/ConfiguratorPage';
import ProductsPage from './pages/ProductsPage';
import PCsPage from './pages/PCsPage';
import WarrantyPage from './pages/WarrantyPage';
import TermsOfServicePage from './pages/TermsOfServicePage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import CookiePolicyPage from './pages/CookiePolicyPage';
import ContactPage from './pages/ContactPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import OrderStatusPage from './pages/OrderStatusPage';
import PlaceholderPage from './pages/PlaceholderPage';
import AccessoriesPage from './pages/AccessoriesPage';
import ShippingReturnsPage from './pages/ShippingReturnsPage';
import ReviewsPage from './pages/ReviewsPage';
import PressPage from './pages/PressPage';
import FAQPage from './pages/FAQPage';
import TechSupportPage from './pages/TechSupportPage';
import PCServicesPage from './pages/PCServicesPage';
import PartnersPage from './pages/PartnersPage';
import AffiliateApplicationPage from './pages/AffiliateApplicationPage';

// Admin Pages
import AdminLayout from './components/AdminLayout';
import AdminLoginPage from './pages/AdminLoginPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import AdminOrdersPage from './pages/AdminOrdersPage';
import AdminProductsPage from './pages/AdminProductsPage';
import AdminAddProductPage from './pages/AdminAddProductPage';
import AdminInventoryPage from './pages/AdminInventoryPage';
import AdminPartsPage from './pages/AdminPartsPage';
import AdminAddPartPage from './pages/AdminAddPartPage';
import AdminCustomersPage from './pages/AdminCustomersPage';
import AdminAddCustomerPage from './pages/AdminAddCustomerPage';
import AdminAddOrderPage from './pages/AdminAddOrderPage';
import AdminUsersPage from './pages/AdminUsersPage';
import AdminPromotionsPage from './pages/AdminPromotionsPage';
import AdminSettingsPage from './pages/AdminSettingsPage';
import AdminPartnersPage from './pages/AdminPartnersPage';
import AdminCartsPage from './pages/AdminCartsPage';
import AdminCustomBuildsPage from './pages/AdminCustomBuildsPage';
import AdminBuildRequestsPage from './pages/AdminBuildRequestsPage';
import AdminReviewsPage from './pages/AdminReviewsPage';
import ComingSoonPage from './pages/ComingSoonPage';
import { useLocation } from 'react-router-dom';
import api from './utils/api';

const AppContent = ({ children }: { children: React.ReactNode }) => {
  const [settings, setSettings] = React.useState<any>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const location = useLocation();

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await api.get('/business/public');
        setSettings(response.data.businessInfo);
      } catch (error) {
        console.error('Error fetching settings', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, [location.pathname]);

  if (isLoading) {
    return null;
  }

  if (settings?.comingSoonMode && !location.pathname.startsWith('/admin')) {
    return <ComingSoonPage />;
  }

  return <>{children}</>;
};

function App() {
  // Initialize Intercom on component mount
  useEffect(() => {
    Intercom({
      app_id: 'ngo9fpbi',
    });
  }, []);

  return (
    <Router>
      <AppContent>
        <div className="App">
        <ScrollToTop />
        <ScrollProgress />
        <Routes>
          <Route path="/" element={
            <>
              <Header />
              <HomePage />
              <Footer />
            </>
          } />
          <Route path="/configurator" element={
            <>
              <Header />
              <ConfiguratorPage />
              <Footer />
            </>
          } />
          <Route path="/products" element={
            <>
              <Header />
              <ProductsPage />
              <Footer />
            </>
          } />
          <Route path="/products/:productId" element={
            <>
              <Header />
              <ProductsPage />
              <Footer />
            </>
          } />
          <Route path="/pcs" element={
            <>
              <Header />
              <PCsPage />
              <Footer />
            </>
          } />
          <Route path="/warranty" element={
            <>
              <Header />
              <WarrantyPage />
              <Footer />
            </>
          } />
          <Route path="/terms" element={
            <>
              <Header />
              <TermsOfServicePage />
              <Footer />
            </>
          } />
          <Route path="/privacy" element={
            <>
              <Header />
              <PrivacyPolicyPage />
              <Footer />
            </>
          } />
          <Route path="/contact" element={
            <>
              <Header />
              <ContactPage />
              <Footer />
            </>
          } />
          <Route path="/cart" element={
            <>
              <Header />
              <CartPage />
              <Footer />
            </>
          } />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/order-status" element={<OrderStatusPage />} />
          <Route path="/accessories" element={
            <>
              <Header />
              <AccessoriesPage />
              <Footer />
            </>
          } />
          <Route path="/faq" element={
            <>
              <Header />
              <FAQPage />
              <Footer />
            </>
          } />
          <Route path="/shipping" element={
            <>
              <Header />
              <ShippingReturnsPage />
              <Footer />
            </>
          } />
          <Route path="/guides" element={
            <>
              <Header />
              <PlaceholderPage title="Build Guides" description="Step-by-step guides for building your PC" />
              <Footer />
            </>
          } />
          <Route path="/about" element={
            <>
              <Header />
              <PlaceholderPage title="About Us" description="Learn more about LANForge" />
              <Footer />
            </>
          } />
          <Route path="/reviews" element={
            <>
              <Header />
              <ReviewsPage />
              <Footer />
            </>
          } />
          <Route path="/careers" element={
            <>
              <Header />
              <PlaceholderPage title="Careers" description="Join the LANForge team" />
              <Footer />
            </>
          } />
          <Route path="/press" element={
            <>
              <Header />
              <PressPage />
              <Footer />
            </>
          } />
          <Route path="/blog" element={
            <>
              <Header />
              <PlaceholderPage title="Blog" description="Latest news and articles" />
              <Footer />
            </>
          } />
          <Route path="/cookies" element={
            <>
              <Header />
              <CookiePolicyPage />
              <Footer />
            </>
          } />
          <Route path="/tech-support" element={
            <>
              <Header />
              <TechSupportPage />
              <Footer />
            </>
          } />
          <Route path="/pc-services" element={
            <>
              <Header />
              <PCServicesPage />
              <Footer />
            </>
          } />
          <Route path="/partners" element={
            <>
              <Header />
              <PartnersPage />
              <Footer />
            </>
          } />
          <Route path="/affiliate-application" element={
            <>
              <Header />
              <AffiliateApplicationPage />
              <Footer />
            </>
          } />
          {/* Admin Routes */}
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route element={<AdminLayout />}>
            <Route path="/admin" element={<AdminDashboardPage />} />
            <Route path="/admin/orders" element={<AdminOrdersPage />} />
            <Route path="/admin/orders/add" element={<AdminAddOrderPage />} />
            <Route path="/admin/products" element={<AdminProductsPage />} />
            <Route path="/admin/products/add" element={<AdminAddProductPage />} />
            <Route path="/admin/products/edit/:id" element={<AdminAddProductPage />} />
            <Route path="/admin/parts" element={<AdminPartsPage />} />
            <Route path="/admin/parts/add" element={<AdminAddPartPage />} />
            <Route path="/admin/parts/edit/:id" element={<AdminAddPartPage />} />
            <Route path="/admin/inventory" element={<AdminInventoryPage />} />
            <Route path="/admin/customers" element={<AdminCustomersPage />} />
            <Route path="/admin/customers/add" element={<AdminAddCustomerPage />} />
            <Route path="/admin/users" element={<AdminUsersPage />} />
            <Route path="/admin/promotions" element={<AdminPromotionsPage />} />
            <Route path="/admin/partners" element={<AdminPartnersPage />} />
            <Route path="/admin/carts" element={<AdminCartsPage />} />
            <Route path="/admin/custom-builds" element={<AdminCustomBuildsPage />} />
            <Route path="/admin/build-requests" element={<AdminBuildRequestsPage />} />
            <Route path="/admin/reviews" element={<AdminReviewsPage />} />
            <Route path="/admin/settings" element={<AdminSettingsPage />} />
          </Route>
        </Routes>
        </div>
      </AppContent>
    </Router>
  );
}

export default App;
