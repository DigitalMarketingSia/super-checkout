
import { useCallback } from 'react';
import { CustomerFormData, CreditCardData } from '@/types/checkout';
import { useMercadoPagoPayment } from './useMercadoPagoPayment';
import { useFormValidation } from './useFormValidation';
import { CheckoutConfig } from '@/api/mockDatabase';
import { OrderCalculationResult } from '@/core/checkoutEngine';

interface UseCreditCardPaymentProps {
  checkout: CheckoutConfig | null;
  orderCalculation: OrderCalculationResult | null;
}

export const useCreditCardPayment = ({ checkout, orderCalculation }: UseCreditCardPaymentProps) => {
  const { validateCreditCardData } = useFormValidation();
  const {
    processCreditCardPayment: mpProcessCreditCardPayment,
    isReady: mpReady
  } = useMercadoPagoPayment({ checkout, orderCalculation });

  const processCreditCardPayment = useCallback(async (
    formData: CustomerFormData,
    creditCardData: CreditCardData,
    items: any[],
    mpGateway: any,
    selectedInstallments: number
  ) => {
    console.log('💳 Processando cartão via Mercado Pago...');
    
    // Validate credit card data
    validateCreditCardData(creditCardData);

    if (mpReady) {
      return await mpProcessCreditCardPayment(formData, creditCardData, [], selectedInstallments);
    } else {
      throw new Error('Gateway Mercado Pago não está pronto');
    }
  }, [mpReady, mpProcessCreditCardPayment, validateCreditCardData]);

  return {
    processCreditCardPayment
  };
};
