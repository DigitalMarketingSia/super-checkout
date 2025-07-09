
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
  
  console.log('🔥 PublicCheckoutWrapper: Iniciando', {
    checkoutId,
    gatewaysCount: gateways.length,
    gatewaysLoading,
    checkoutGatewayId,
    gateways: gateways.map(g => ({ id: g.id, name: g.name, type: g.type, active: g.is_active }))
  });

  // Carregar checkouts públicos na inicialização
  useEffect(() => {
    console.log('🔄 Carregando checkouts públicos...');
    getAllPublicCheckouts();
  }, [getAllPublicCheckouts]);
  
  // Determinar gateway ID do checkout
  useEffect(() => {
    if (gatewaysLoading) {
      console.log('⏳ Aguardando carregamento dos gateways...');
      return;
    }

    console.log('🔍 Analisando gateways disponíveis:', {
      totalGateways: gateways.length,
      mercadoPagoGateways: gateways.filter(g => g.type === 'mercado_pago').length,
      activeGateways: gateways.filter(g => g.is_active).length,
      gateways: gateways.map(g => ({
        id: g.id,
        name: g.name,
        type: g.type,
        isActive: g.is_active,
        environment: g.environment
      }))
    });

    if (gateways.length === 0) {
      console.error('❌ Nenhum gateway encontrado no sistema - verifique se a migração foi executada');
      setCheckoutGatewayId(null);
      setIsReady(true);
      return;
    }

    let selectedGatewayId: string | null = null;

    if (checkoutId) {
      console.log('🔍 Tentando encontrar checkout com ID:', checkoutId);
      const checkout = getCheckoutById(checkoutId);
      console.log('🔍 Checkout encontrado:', {
        checkoutExists: !!checkout,
        checkoutGatewayId: checkout?.gatewayId, // Usar camelCase
        checkoutName: checkout?.name,
        checkoutCompleto: checkout
      });
      
      // Verificar se o checkout existe e tem gatewayId
      const gatewayIdFromCheckout = checkout?.gatewayId;
      
      if (gatewayIdFromCheckout) {
        // Verificar se o gateway do checkout existe e está ativo
        const checkoutGateway = gateways.find(g => 
          g.id === gatewayIdFromCheckout && 
          g.is_active && 
          g.type === 'mercado_pago'
        );
        
        if (checkoutGateway) {
          console.log('✅ Usando gateway específico do checkout:', checkoutGateway.name);
          selectedGatewayId = checkoutGateway.id;
        } else {
          console.warn('⚠️ Gateway do checkout não encontrado ou inativo, buscando alternativo');
          console.log('⚠️ Gateway procurado:', gatewayIdFromCheckout);
          console.log('⚠️ Gateways disponíveis:', gateways.map(g => ({ id: g.id, name: g.name, active: g.is_active })));
        }
      } else {
        console.warn('⚠️ Checkout encontrado mas sem gateway_id configurado');
      }
    } else {
      console.warn('⚠️ Nenhum checkoutId fornecido na URL');
    }

    // Se não encontrou gateway específico, buscar o melhor disponível
    if (!selectedGatewayId) {
      // Primeiro: gateway MercadoPago ativo de produção
      const productionGateway = gateways.find(g => 
        g.type === 'mercado_pago' && 
        g.is_active && 
        g.environment === 'production'
      );
      
      if (productionGateway) {
        console.log('✅ Usando gateway de produção:', productionGateway.name);
        selectedGatewayId = productionGateway.id;
      } else {
        // Segundo: qualquer gateway MercadoPago ativo
        const activeGateway = gateways.find(g => 
          g.type === 'mercado_pago' && 
          g.is_active
        );
        
        if (activeGateway) {
          console.log('✅ Usando gateway ativo disponível:', activeGateway.name);
          selectedGatewayId = activeGateway.id;
        } else {
          // Terceiro: qualquer gateway MercadoPago (mesmo inativo)
          const anyMercadoPagoGateway = gateways.find(g => 
            g.type === 'mercado_pago'
          );
          
          if (anyMercadoPagoGateway) {
            console.warn('⚠️ Usando gateway MercadoPago inativo:', anyMercadoPagoGateway.name);
            selectedGatewayId = anyMercadoPagoGateway.id;
          } else {
            console.error('❌ Nenhum gateway MercadoPago encontrado no sistema');
          }
        }
      }
    }

    console.log('🎯 Gateway final selecionado:', {
      gatewayId: selectedGatewayId,
      gatewayName: selectedGatewayId ? gateways.find(g => g.id === selectedGatewayId)?.name : 'N/A',
      gatewayType: selectedGatewayId ? gateways.find(g => g.id === selectedGatewayId)?.type : 'N/A',
      gatewayActive: selectedGatewayId ? gateways.find(g => g.id === selectedGatewayId)?.is_active : false
    });

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

  // Se não há checkoutId, exibir erro específico
  if (!checkoutId) {
    return (
      <PaymentSystemError 
        error="URL de checkout inválida. Acesse através do link do checkout específico."
        showRetryButton={false}
      />
    );
  }

  // Se não há gateway configurado, exibir erro
  if (!checkoutGatewayId) {
    return (
      <PaymentSystemError 
        error="Sistema de pagamento não configurado. Nenhum gateway MercadoPago encontrado."
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
