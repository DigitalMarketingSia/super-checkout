
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useCheckoutContext } from '@/context/CheckoutContext';
import { useSupabaseGateways } from '@/hooks/useSupabaseGateways';
import { MercadoPagoProvider } from '@/context/MercadoPagoContext';
import { PaymentSystemError } from '@/components/PaymentSystemError';

interface PublicCheckoutWrapperProps {
  children: React.ReactNode;
}

export const PublicCheckoutWrapper = ({ children }: PublicCheckoutWrapperProps) => {
  const { checkoutId } = useParams<{ checkoutId: string }>();
  const { getCheckoutById, getAllPublicCheckouts } = useCheckoutContext();
  const { gateways, loading: gatewaysLoading } = useSupabaseGateways();
  
  const [checkoutGatewayId, setCheckoutGatewayId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  console.log('🔥 PublicCheckoutWrapper: Iniciando', {
    checkoutId,
    gatewaysCount: gateways.length,
    gatewaysLoading
  });

  // Carregar checkouts públicos na inicialização
  useEffect(() => {
    console.log('🔄 Carregando checkouts públicos...');
    getAllPublicCheckouts();
  }, [getAllPublicCheckouts]);
  
  // Determinar gateway ID do checkout com lógica melhorada
  useEffect(() => {
    if (gatewaysLoading) {
      console.log('⏳ Aguardando carregamento dos gateways...');
      return;
    }

    if (gateways.length === 0) {
      console.error('❌ Nenhum gateway encontrado no sistema');
      setError('Sistema de pagamento não configurado. Nenhum gateway encontrado.');
      setIsReady(true);
      return;
    }

    let selectedGatewayId: string | null = null;

    // 1. Tentar usar gateway específico do checkout
    if (checkoutId) {
      const checkout = getCheckoutById(checkoutId);
      
      if (checkout?.gatewayId) {
        const checkoutGateway = gateways.find(g => 
          g.id === checkout.gatewayId && 
          g.type === 'mercado_pago'
        );
        
        if (checkoutGateway) {
          console.log('✅ Usando gateway específico do checkout:', checkoutGateway.name);
          selectedGatewayId = checkoutGateway.id;
        }
      }
    }

    // 2. Fallback para gateway MercadoPago ativo
    if (!selectedGatewayId) {
      const activeGateway = gateways.find(g => 
        g.type === 'mercado_pago' && 
        g.is_active
      );
      
      if (activeGateway) {
        console.log('✅ Usando gateway ativo:', activeGateway.name);
        selectedGatewayId = activeGateway.id;
      }
    }

    // 3. Último recurso: qualquer gateway MercadoPago
    if (!selectedGatewayId) {
      const anyMercadoPagoGateway = gateways.find(g => 
        g.type === 'mercado_pago'
      );
      
      if (anyMercadoPagoGateway) {
        console.warn('⚠️ Usando gateway MercadoPago (pode estar inativo):', anyMercadoPagoGateway.name);
        selectedGatewayId = anyMercadoPagoGateway.id;
      }
    }

    if (!selectedGatewayId) {
      console.error('❌ Nenhum gateway MercadoPago encontrado');
      setError('Sistema de pagamento não configurado. Nenhum gateway MercadoPago encontrado.');
    } else {
      console.log('🎯 Gateway selecionado:', selectedGatewayId);
      setError(null);
    }

    setCheckoutGatewayId(selectedGatewayId);
    setIsReady(true);
  }, [checkoutId, getCheckoutById, gateways, gatewaysLoading]);

  if (!isReady) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando sistema de pagamento...</p>
        </div>
      </div>
    );
  }

  if (!checkoutId) {
    return (
      <PaymentSystemError 
        error="URL de checkout inválida. Acesse através do link do checkout específico."
        showRetryButton={false}
      />
    );
  }

  if (error || !checkoutGatewayId) {
    return (
      <PaymentSystemError 
        error={error || "Sistema de pagamento não configurado"}
        onRetry={() => window.location.reload()}
      />
    );
  }

  return (
    <MercadoPagoProvider gatewayId={checkoutGatewayId}>
      {children}
    </MercadoPagoProvider>
  );
};
