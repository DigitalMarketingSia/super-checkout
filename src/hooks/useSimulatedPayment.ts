
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckoutConfig } from '@/api/mockDatabase';
import { OrderCalculationResult } from '@/core/checkoutEngine';
import { CustomerFormData, CreditCardData } from '@/types/checkout';
import { PAYMENT_METHODS } from '@/constants';
import { useOrderContext } from '@/context/OrderContext';
import { useProductContext } from '@/context/ProductContext';
import { useFormValidation } from './useFormValidation';

interface UseSimulatedPaymentProps {
  checkout: CheckoutConfig | null;
  orderCalculation: OrderCalculationResult | null;
}

export const useSimulatedPayment = ({ checkout, orderCalculation }: UseSimulatedPaymentProps) => {
  const navigate = useNavigate();
  const { addOrder } = useOrderContext();
  const { getProductById } = useProductContext();
  const { validateFormData, validateCreditCardData } = useFormValidation();

  const processSimulatedPayment = useCallback(async (
    formData: CustomerFormData,
    creditCardData: CreditCardData,
    selectedPaymentMethod: string,
    selectedOrderBumps: string[]
  ) => {
    console.log('⚠️ MODO SIMULAÇÃO: Processando sem gateway do Mercado Pago');
    
    if (!checkout || !orderCalculation) return false;
    
    try {
      validateFormData(formData, checkout.requiredFormFields);
      if (selectedPaymentMethod === PAYMENT_METHODS.CREDIT_CARD) {
        validateCreditCardData(creditCardData);
      }
      
      console.log('✅ Validações concluídas, simulando processamento...');
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Simular possível erro do cartão (10% chance)
      if (selectedPaymentMethod === PAYMENT_METHODS.CREDIT_CARD && Math.random() < 0.1) {
        throw new Error('Cartão recusado. Verifique os dados ou tente outro cartão.');
      }

      // Get product data
      const mainProduct = getProductById(checkout.mainProductId);
      const orderBumps = selectedOrderBumps.map(id => getProductById(id)).filter(Boolean);

      if (!mainProduct) {
        throw new Error('Produto principal não encontrado');
      }

      console.log('💰 Criando pedido no sistema...');
      const newOrder = addOrder({
        checkoutId: checkout.id,
        mainProduct,
        orderBumps,
        upsellProduct: null,
        totalAmount: orderCalculation.totalFinal,
        status: 'paid',
        customerData: formData
      });

      console.log('✅ Pedido criado:', newOrder.id);

      if (selectedPaymentMethod === PAYMENT_METHODS.PIX) {
        navigate(`/pix/${newOrder.id}`);
      } else if (selectedPaymentMethod === PAYMENT_METHODS.CREDIT_CARD) {
        navigate(checkout.upsellProductId ? `/oferta-especial/${newOrder.id}` : `/obrigado/${newOrder.id}`);
      } else {
        navigate(`/obrigado/${newOrder.id}`);
      }
      
      return true;
    } catch (simulationError) {
      console.error('❌ Erro na simulação:', simulationError);
      throw simulationError;
    }
  }, [checkout, orderCalculation, validateFormData, validateCreditCardData, getProductById, addOrder, navigate]);

  return {
    processSimulatedPayment
  };
};
