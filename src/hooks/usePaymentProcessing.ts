
import { useCallback } from 'react';
import { CheckoutConfig } from '@/api/mockDatabase';
import { OrderCalculationResult } from '@/core/checkoutEngine';
import { CustomerFormData, CreditCardData } from '@/types/checkout';
import { usePixPayment } from './usePixPayment';
import { useCreditCardPayment } from './useCreditCardPayment';
import { useSimulatedPayment } from './useSimulatedPayment';

interface UsePaymentProcessingProps {
  checkout: CheckoutConfig | null;
  orderCalculation: OrderCalculationResult | null;
  getGatewayById: (id: string) => any;
}

export const usePaymentProcessing = ({
  checkout,
  orderCalculation,
  getGatewayById
}: UsePaymentProcessingProps) => {
  
  const { processPixPayment } = usePixPayment({ checkout, orderCalculation });
  const { processCreditCardPayment } = useCreditCardPayment({ checkout, orderCalculation });
  const { processSimulatedPayment } = useSimulatedPayment({ checkout, orderCalculation });

  const processPixPaymentMethod = useCallback(async (
    formData: CustomerFormData,
    items: any[],
    mpGateway: any
  ) => {
    console.log('🔄 [PAYMENT PROCESSING] Processando pagamento PIX...', {
      hasFormData: !!formData,
      hasGateway: !!mpGateway,
      gatewayInfo: mpGateway ? {
        id: mpGateway.id,
        name: mpGateway.name,
        type: mpGateway.type,
        is_active: mpGateway.is_active,
        environment: mpGateway.environment,
        hasCredentials: !!mpGateway.credentials
      } : 'Nenhum gateway'
    });
    
    if (mpGateway && mpGateway.type === 'mercado_pago') {
      console.log('💳 [PAYMENT PROCESSING] Usando gateway MercadoPago para PIX');
      return await processPixPayment(formData, items, mpGateway);
    } else {
      console.log('🎭 [PAYMENT PROCESSING] Usando simulação para PIX (sem gateway MP configurado)');
      return await processSimulatedPayment(formData, null, 'pix', []);
    }
  }, [processPixPayment, processSimulatedPayment]);

  const processCreditCardPaymentMethod = useCallback(async (
    formData: CustomerFormData,
    creditCardData: CreditCardData,
    items: any[],
    mpGateway: any,
    selectedInstallments: number
  ) => {
    console.log('🔄 usePaymentProcessing: Processando pagamento cartão...');
    console.log('🏦 Gateway MP disponível:', !!mpGateway);
    
    if (mpGateway && mpGateway.type === 'mercado_pago') {
      console.log('💳 Usando gateway MercadoPago para cartão');
      return await processCreditCardPayment(formData, creditCardData, items, mpGateway, selectedInstallments);
    } else {
      console.log('🎭 Usando simulação para cartão (sem gateway MP configurado)');
      return await processSimulatedPayment(formData, creditCardData, 'credit_card', []);
    }
  }, [processCreditCardPayment, processSimulatedPayment]);

  const processSimulatedPaymentMethod = useCallback(async (
    formData: CustomerFormData,
    creditCardData: CreditCardData | null,
    paymentMethod: string,
    selectedOrderBumps: string[]
  ) => {
    console.log('🔄 usePaymentProcessing: Processamento simulado...');
    return await processSimulatedPayment(formData, creditCardData, paymentMethod, selectedOrderBumps);
  }, [processSimulatedPayment]);

  return {
    processPixPayment: processPixPaymentMethod,
    processCreditCardPayment: processCreditCardPaymentMethod,
    processSimulatedPayment: processSimulatedPaymentMethod
  };
};
