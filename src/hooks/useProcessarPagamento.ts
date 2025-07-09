import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { CustomerFormData, CreditCardData } from '@/types/checkout';
import { CheckoutConfig } from '@/api/mockDatabase';
import { OrderCalculationResult } from '@/core/checkoutEngine';
import { useToast } from '@/hooks/use-toast';

interface UseProcessarPagamentoProps {
  checkout: CheckoutConfig | null;
  orderCalculation: OrderCalculationResult | null;
  accessToken?: string;
  environment?: 'sandbox' | 'production';
}

export const useProcessarPagamento = ({
  checkout,
  orderCalculation,
  accessToken,
  environment = 'sandbox'
}: UseProcessarPagamentoProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const processarPagamento = useCallback(async (
    formData: CustomerFormData,
    paymentMethod: 'pix' | 'credit_card',
    creditCardData?: CreditCardData,
    selectedOrderBumps: string[] = [],
    installments: number = 1
  ) => {
    if (!checkout || !orderCalculation) {
      throw new Error('Checkout ou cálculo de ordem não encontrado');
    }

    console.log('🚀 Iniciando processamento de pagamento:', {
      paymentMethod,
      totalAmount: orderCalculation.totalFinal,
      checkoutId: checkout.id,
      environment
    });

    try {
      // Preparar dados dos itens
      const items = [
        {
          id: checkout.mainProductId,
          title: 'Produto Principal',
          quantity: 1,
          unit_price: orderCalculation.totalFinal
        }
      ];

      // Criar external_reference único
      const externalReference = `checkout_${checkout.id}_${Date.now()}`;

      // Preparar payload para Edge Function
      const payloadBase: any = {
        checkoutId: checkout.id,
        gatewayId: checkout.gatewayId,
        customerData: formData,
        items,
        totalAmount: orderCalculation.totalFinal,
        paymentMethod,
        environment,
        externalReference,
        directCredentials: accessToken ? {
          publicKey: '',
          accessToken
        } : undefined
      };

      // Adicionar dados específicos do método de pagamento
      if (paymentMethod === 'credit_card') {
        if (!creditCardData) {
          throw new Error('Dados do cartão são obrigatórios para pagamento com cartão');
        }

        // Criar token do cartão (simulado - na prática seria feito via SDK)
        const cardToken = `card_token_${Date.now()}`;
        
        payloadBase.token = cardToken;
        payloadBase.installments = installments;
      }

      console.log('📤 Enviando pagamento para processamento:', {
        paymentMethod,
        externalReference,
        totalAmount: orderCalculation.totalFinal,
        hasToken: !!payloadBase.token
      });

      // Chamar Edge Function
      const response = await supabase.functions.invoke('processar-pagamento', {
        body: payloadBase
      });

      console.log('📥 Resposta da Edge Function:', response);

      if (response.error) {
        console.error('❌ Erro da Edge Function:', response.error);
        throw new Error(response.error.message || 'Erro no processamento do pagamento');
      }

      if (!response.data || !response.data.success) {
        console.error('❌ Resposta de falha:', response.data);
        throw new Error(response.data?.error || 'Falha no processamento do pagamento');
      }

      // Sucesso - redirecionar para página apropriada
      console.log('✅ Pagamento processado com sucesso!');
      
      const redirectUrl = response.data.redirectUrl;
      
      if (paymentMethod === 'pix') {
        // Para PIX, redirecionar com dados do PIX
        navigate(redirectUrl, {
          state: {
            pixData: response.data.pixData,
            orderData: response.data.orderData,
            orderId: response.data.orderId
          }
        });
      } else {
        // Para cartão, redirecionar para página de obrigado
        navigate(redirectUrl, {
          state: {
            orderId: response.data.orderId,
            paymentData: response.data.payment
          }
        });
      }

      toast({
        title: "✅ Pagamento Processado",
        description: "Seu pagamento foi processado com sucesso!"
      });

      return true;

    } catch (error) {
      console.error('❌ Erro no processamento:', error);
      
      toast({
        title: "❌ Erro no Pagamento",
        description: error instanceof Error ? error.message : 'Erro interno no processamento',
        variant: "destructive"
      });

      throw error;
    }
  }, [checkout, orderCalculation, accessToken, environment, navigate, toast]);

  return {
    processarPagamento
  };
};