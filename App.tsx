import React, { useState, useEffect } from 'react';
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
import { Marketing } from './pages/Marketing';
import { IntegrationsHub } from './pages/IntegrationsHub';
import { MembersArea } from './pages/MembersArea';
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

const DomainDispatcher = () => {
  const [loading, setLoading] = useState(true);
  const [customCheckoutId, setCustomCheckoutId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkDomain = async () => {
      const hostname = window.location.hostname;

      console.log('Current hostname:', hostname);

      // Ignorar domínios do sistema
      if (
        hostname.includes('localhost') ||
        hostname.includes('127.0.0.1') ||
        hostname.includes('.vercel.app') ||
        hostname.includes('.webcontainer.io') ||
        hostname === 'super-checkout.vercel.app'
      ) {
        console.log('System domain detected, skipping custom domain check.');
        setLoading(false);
        return;
      }

      try {
        console.log('Checking custom domain in DB...');
        const domain = await storage.getDomainByHostname(hostname);
        console.log('Domain found:', domain);

        if (domain) {
          // New Logic: Find checkout that points to this domain
          const checkout = await storage.getCheckoutByDomainId(domain.id);
          console.log('Checkout found for domain:', checkout);

          if (checkout) {
            setCustomCheckoutId(checkout.id);
          } else {
            setError('Este domínio está conectado, mas nenhum checkout foi vinculado ainda.');
          }
        } else {
          // Domain points here but not found in DB
          setError('Domínio não configurado no sistema.');
        }
      } catch (err) {
        console.error('Erro ao verificar domínio:', err);
        setError('Erro ao carregar configuração do domínio.');
      } finally {
        setLoading(false);
      }
    };

    // Safety timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      setLoading((current) => {
        if (current) {
          console.warn('Domain check timed out, forcing load.');
          return false;
        }
        return current;
      });
    }, 5000);

    checkDomain();

    return () => clearTimeout(timeoutId);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F0F13] flex flex-col items-center justify-center text-white">
        <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-4"></div>
        <p className="text-gray-400 animate-pulse">Carregando loja...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0F0F13] flex flex-col items-center justify-center text-white p-4 text-center">
        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4 text-red-500">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
        </div>
        <h1 className="text-xl font-bold mb-2">Acesso Indisponível</h1>
        <p className="text-gray-400 max-w-md">{error}</p>
      </div>
    );
  }

  if (customCheckoutId) {
    return <PublicCheckout checkoutId={customCheckoutId} />;
  }

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/update-password" element={<UpdatePassword />} />
      <Route path="/pagamento/pix/:orderId" element={<PixPayment />} />
      <Route path="/thank-you/:orderId" element={<ThankYou />} />
      <Route path="/c/:id" element={<PublicCheckout />} />

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
      <Route path="/admin/marketing" element={<ProtectedRoute><Marketing /></ProtectedRoute>} />
      <Route path="/admin/integrations" element={<ProtectedRoute><IntegrationsHub /></ProtectedRoute>} />
      <Route path="/admin/members" element={<ProtectedRoute><MembersArea /></ProtectedRoute>} />

      {/* Redirect root to Admin */}
      <Route path="/" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <ThemeProvider>
        <BrowserRouter>
          <DomainDispatcher />
        </BrowserRouter>
      </ThemeProvider>
    </AuthProvider>
  );
};

export default App;
