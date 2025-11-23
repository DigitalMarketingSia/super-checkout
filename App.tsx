
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

import { Dashboard } from './pages/admin/Dashboard';
import { Products } from './pages/admin/Products';
import { Offers } from './pages/admin/Offers';
import { Checkouts } from './pages/admin/Checkouts';
import { CheckoutEditor } from './pages/admin/CheckoutEditor';
import { Gateways } from './pages/admin/Gateways';
import { Domains } from './pages/admin/Domains';
import { Settings } from './pages/admin/Settings';
import { Orders } from './pages/admin/Orders';
import { Webhooks } from './pages/admin/Webhooks';
import { PublicCheckout } from './pages/public/PublicCheckout';
import { PixPayment } from './pages/public/PixPayment';
import { ThankYou } from './pages/public/ThankYou';
import { Login } from './pages/Login';
import { UpdatePassword } from './pages/UpdatePassword';
import { ThemeProvider } from './context/ThemeContext';

import { storage } from './services/storageService';

// Protected Route Wrapper
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="h-screen w-screen flex items-center justify-center bg-[#05050A] text-white">Carregando...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const DomainDispatcher: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loading, setLoading] = React.useState(true);
  const [customCheckoutId, setCustomCheckoutId] = React.useState<string | null>(null);

  React.useEffect(() => {
    const checkDomain = async () => {
      const hostname = window.location.hostname;
      console.log('🔍 DomainDispatcher: Checking hostname:', hostname);

      // System Domains (Bypass lookup)
      const isSystemDomain =
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname.endsWith('.vercel.app') ||
        hostname.endsWith('.webcontainer.io'); // Stackblitz

      console.log('🔍 DomainDispatcher: Is system domain?', isSystemDomain);

      if (isSystemDomain) {
        setLoading(false);
        return;
      }

      // Custom Domain Lookup
      try {
        console.log('🔍 DomainDispatcher: Looking up custom domain...');
        const domain = await storage.getDomainByHostname(hostname);
        console.log('🔍 DomainDispatcher: Domain found:', domain);

        if (domain && domain.checkout_id) {
          setCustomCheckoutId(domain.checkout_id);
        }
      } catch (e) {
        console.error('❌ DomainDispatcher: Domain lookup failed', e);
      } finally {
        setLoading(false);
      }
    };

    checkDomain();

    // Safety timeout - force loading to false after 5 seconds
    const timeoutId = setTimeout(() => {
      setLoading(prev => {
        if (prev) {
          console.warn('⚠️ DomainDispatcher: Safety timeout triggered');
          return false;
        }
        return prev;
      });
    }, 5000);

    return () => clearTimeout(timeoutId);
  }, []);

  if (loading) {
    return <div className="h-screen w-screen flex items-center justify-center bg-[#05050A] text-white">
      <div className="flex flex-col items-center gap-3">
        <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
        <span className="text-sm text-gray-400">Carregando loja...</span>
      </div>
    </div>;
  }

  if (customCheckoutId) {
    // Render Checkout directly for custom domain
    return (
      <BrowserRouter>
        <Routes>
          <Route path="*" element={<PublicCheckout checkoutId={customCheckoutId} />} />
        </Routes>
      </BrowserRouter>
    );
  }

  return <>{children}</>;
};

const App = () => {
  return (
    <AuthProvider>
      <ThemeProvider>
        <DomainDispatcher>
          <BrowserRouter>
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/update-password" element={<UpdatePassword />} />
              <Route path="/pagamento/pix/:orderId" element={<PixPayment />} />
              <Route path="/thank-you/:orderId" element={<ThankYou />} />

              {/* Admin Routes (Protected) */}
              <Route path="/admin" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/admin/products" element={<ProtectedRoute><Products /></ProtectedRoute>} />
              <Route path="/admin/offers" element={<ProtectedRoute><Offers /></ProtectedRoute>} />
              <Route path="/admin/checkouts" element={<ProtectedRoute><Checkouts /></ProtectedRoute>} />
              <Route path="/admin/checkouts/edit/:id" element={<ProtectedRoute><CheckoutEditor /></ProtectedRoute>} />
              <Route path="/admin/gateways" element={<ProtectedRoute><Gateways /></ProtectedRoute>} />
              <Route path="/admin/domains" element={<ProtectedRoute><Domains /></ProtectedRoute>} />
              <Route path="/admin/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
              <Route path="/admin/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
              <Route path="/admin/webhooks" element={<ProtectedRoute><Webhooks /></ProtectedRoute>} />

              {/* Redirect root to Admin */}
              <Route path="/" element={<Navigate to="/admin" replace />} />

              {/* Checkout Route - Last as catch-all for checkout IDs */}
              <Route path="/:id" element={<PublicCheckout />} />
            </Routes>
          </BrowserRouter>
        </DomainDispatcher>
      </ThemeProvider>
    </AuthProvider>
  );
};

export default App;
