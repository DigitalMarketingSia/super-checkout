
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CheckoutProvider } from "@/context/CheckoutContext";
import { ProductProvider } from "@/context/ProductContext";
import { DomainProvider } from "@/context/DomainContext";
import { GatewayProvider } from "@/context/GatewayContext";
import { MercadoPagoProvider } from "@/context/MercadoPagoContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { AuthProvider } from "@/context/AuthContext";
import { OrderProvider } from "@/context/OrderContext";
import { AuthGuard } from "@/components/AuthGuard";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import ProductForm from "./pages/ProductForm";
import Checkouts from "./pages/Checkouts";
import CheckoutForm from "./pages/CheckoutForm";
import CheckoutFormEdit from "./pages/CheckoutFormEdit";
import Domain from "./pages/Domain";
import Gateways from "./pages/Gateways";
import Sales from "./pages/Sales";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import PublicCheckout from "./pages/PublicCheckout";
import PixPayment from "./pages/PixPayment";
import ThankYou from "./pages/ThankYou";
import SpecialOffer from "./pages/SpecialOffer";
import NotFound from "./pages/NotFound";
import DebugCheckout from "./pages/DebugCheckout";
import Profile from "./pages/Profile";
import AccountSettings from "./pages/AccountSettings";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <ProductProvider>
          <CheckoutProvider>
            <OrderProvider>
              <DomainProvider>
                <GatewayProvider>
                  <MercadoPagoProvider>
                    <TooltipProvider>
                      <Toaster />
                      <Sonner />
                      <BrowserRouter>
                        <Routes>
                          {/* Página de login pública */}
                          <Route path="/login" element={<Login />} />
                          
                          {/* Páginas públicas do checkout */}
                          <Route path="/checkout/:checkoutId" element={<PublicCheckout />} />
                          <Route path="/debug" element={<DebugCheckout />} />
                          <Route path="/pix/:orderId" element={<PixPayment />} />
                          <Route path="/oferta-especial/:orderId" element={<SpecialOffer />} />
                          <Route path="/obrigado/:orderId" element={<ThankYou />} />
                          
                          {/* Todas as outras rotas são protegidas */}
                          <Route path="/*" element={
                            <AuthGuard>
                              <Routes>
                                <Route path="/" element={<Dashboard />} />
                                <Route path="/dashboard" element={<Dashboard />} />
                                <Route path="/products" element={<Products />} />
                                <Route path="/products/new" element={<ProductForm />} />
                                <Route path="/products/edit/:id" element={<ProductForm />} />
                                <Route path="/checkouts" element={<Checkouts />} />
                                <Route path="/checkouts/new" element={<CheckoutForm />} />
                                <Route path="/checkouts/edit/:id" element={<CheckoutFormEdit />} />
                                <Route path="/domain" element={<Domain />} />
                                <Route path="/gateways" element={<Gateways />} />
                                <Route path="/vendas" element={<Sales />} />
                                <Route path="/relatorios" element={<Reports />} />
                                <Route path="/settings" element={<Settings />} />
                                <Route path="/perfil" element={<Profile />} />
                                <Route path="/configuracoes/conta" element={<AccountSettings />} />
                                <Route path="*" element={<NotFound />} />
                              </Routes>
                            </AuthGuard>
                          } />
                        </Routes>
                      </BrowserRouter>
                    </TooltipProvider>
                  </MercadoPagoProvider>
                </GatewayProvider>
              </DomainProvider>
            </OrderProvider>
          </CheckoutProvider>
        </ProductProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
