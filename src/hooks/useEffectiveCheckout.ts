
import { useMemo } from 'react';
import { CheckoutConfig } from '@/api/mockDatabase';

interface UseEffectiveCheckoutProps {
  checkout: CheckoutConfig | null;
  gateways: any[];
  getGatewayById: (id: string | null) => any;
}

export const useEffectiveCheckout = ({
  checkout,
  gateways,
  getGatewayById
}: UseEffectiveCheckoutProps) => {
  
  return useMemo(() => {
    if (!checkout) {
      console.log('ℹ️ Nenhum checkout fornecido');
      return null;
    }

    console.log('🔧 Calculando checkout efetivo:', {
      checkoutId: checkout.id,
      originalGatewayId: checkout.gatewayId,
      gatewaysAvailable: gateways.length
    });

    let effectiveGatewayId = checkout.gatewayId;

    // Se checkout não tem gateway, buscar um ativo
    if (!effectiveGatewayId) {
      const activeGateway = gateways.find(g => 
        g.type === 'mercado_pago' && g.is_active
      );
      
      if (activeGateway) {
        console.log('🔄 Usando gateway ativo como fallback:', activeGateway.name);
        effectiveGatewayId = activeGateway.id;
      }
    }

    // Verificar se o gateway selecionado existe e está ativo
    if (effectiveGatewayId) {
      const gateway = getGatewayById(effectiveGatewayId);
      if (!gateway || !gateway.is_active) {
        console.warn('⚠️ Gateway selecionado não está ativo, buscando alternativo');
        
        const alternativeGateway = gateways.find(g => 
          g.type === 'mercado_pago' && g.is_active
        );
        
        if (alternativeGateway) {
          console.log('🔄 Usando gateway alternativo:', alternativeGateway.name);
          effectiveGatewayId = alternativeGateway.id;
        } else {
          console.error('❌ Nenhum gateway ativo disponível');
          effectiveGatewayId = null;
        }
      }
    }

    const effectiveCheckout = {
      ...checkout,
      gatewayId: effectiveGatewayId
    };

    console.log('✅ Checkout efetivo calculado:', {
      id: effectiveCheckout.id,
      gatewayId: effectiveCheckout.gatewayId
    });

    return effectiveCheckout;
  }, [checkout, gateways, getGatewayById]);
};
