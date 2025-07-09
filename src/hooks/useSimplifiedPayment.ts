
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { CustomerFormData, CreditCardData } from '@/types/checkout';
import { useDirectMercadoPago } from './useDirectMercadoPago';
import { CheckoutConfig } from '@/api/mockDatabase';
import { OrderCalculationResult } from '@/core/checkoutEngine';
import { supabase } from '@/integrations/supabase/client';

interface UseSimplifiedPaymentProps {
  checkout: CheckoutConfig | null;
  orderCalculation: OrderCalculationResult | null;
  gatewayId: string | null;
}

export const useSimplifiedPayment = ({
  checkout,
  orderCalculation,
  gatewayId
}: UseSimplifiedPaymentProps) => {
  const navigate = useNavigate();
  const {
    isReady,
    error: mpError,
    loading: mpLoading,
    mpInstance,
    publicKey,
    accessToken,
    retryInitialization
  } = useDirectMercadoPago(gatewayId);

  const processPixPayment = useCallback(async (
    formData: CustomerFormData,
    items: any[]
  ) => {
    if (!checkout || !orderCalculation) {
      throw new Error('Dados do checkout não carregados');
    }

    if (!isReady || !accessToken) {
      throw new Error('Gateway Mercado Pago não está pronto - credenciais não carregadas');
    }

    console.log('🟢 Processando PIX com credenciais diretas...');
    console.log('🔑 Access Token:', accessToken.substring(0, 20) + '...');
    console.log('💰 Valor total:', orderCalculation.totalFinal);

    try {
      console.log('🚀 Enviando dados para processar-pagamento...');
      // Detectar ambiente baseado nas credenciais com validação rigorosa
      const isProductionCreds = accessToken?.startsWith('APP_USR-') && publicKey?.startsWith('APP_USR-');
      const isSandboxCreds = accessToken?.startsWith('TEST-') && publicKey?.startsWith('TEST-');
      
      let detectedEnvironment;
      if (isProductionCreds) {
        detectedEnvironment = 'production';
        console.log('✅ Usando credenciais de PRODUÇÃO para PIX');
      } else if (isSandboxCreds) {
        detectedEnvironment = 'sandbox';
        console.log('⚠️ Usando credenciais de SANDBOX para PIX');
      } else {
        console.error('❌ Credenciais inválidas - não são nem de produção nem de sandbox');
        console.error('❌ PublicKey:', publicKey?.substring(0, 10), 'AccessToken:', accessToken?.substring(0, 10));
        throw new Error('Credenciais do MercadoPago inválidas ou inconsistentes');
      }
      
      console.log('🌍 Ambiente detectado automaticamente:', detectedEnvironment);
      console.log('🔑 Baseado nas credenciais:', {
        accessTokenType: accessToken?.substring(0, 8),
        publicKeyType: publicKey?.substring(0, 8)
      });

      const requestBody = {
        checkoutId: checkout.id,
        gatewayId: checkout.gatewayId || gatewayId || 'direct',
        customerData: formData,
        items,
        totalAmount: orderCalculation.totalFinal,
        paymentMethod: 'pix',
        environment: detectedEnvironment,
        directCredentials: {
          accessToken,
          publicKey
        }
      };
      
      console.log('📤 Request body:', JSON.stringify(requestBody, null, 2));
      
      const response = await supabase.functions.invoke('processar-pagamento', {
        body: requestBody
      });

      console.log('📥 Resposta completa da Edge Function:', response);
      console.log('📥 Response data:', response.data);
      console.log('📥 Response error:', response.error);

      if (response.error) {
        console.error('❌ Erro na invocação da edge function:', response.error);
        throw new Error(response.error.message || 'Erro ao processar PIX');
      }

      if (response.data?.success) {
        console.log('✅ PIX processado com sucesso');
        navigate(response.data.redirectUrl, {
          state: {
            pixData: response.data.pixData,
            orderData: response.data.orderData
          }
        });
        return true;
      } else {
        console.error('❌ Resposta indica falha:', response.data);
        throw new Error(response.data?.error || 'Falha no processamento do PIX');
      }
    } catch (error) {
      console.error('❌ Erro no processamento PIX:', error);
      if (error.message?.includes('FunctionsHttpError')) {
        throw new Error('Erro no servidor de pagamento. Tente novamente.');
      }
      throw error;
    }
  }, [checkout, orderCalculation, isReady, accessToken, publicKey, gatewayId, navigate]);

  const processCreditCardPayment = useCallback(async (
    formData: CustomerFormData,
    creditCardData: CreditCardData,
    items: any[],
    selectedInstallments: number = 1
  ) => {
    if (!checkout || !orderCalculation) {
      throw new Error('Dados do checkout não carregados');
    }

    if (!isReady || !mpInstance || !accessToken) {
      throw new Error('Gateway Mercado Pago não está pronto - SDK não inicializado');
    }

    console.log('💳 Processando cartão com credenciais diretas...');

    try {
      // Criar token do cartão
      const dadosCartao = {
        cardNumber: creditCardData.numero.replace(/\s/g, ''),
        cardholderName: creditCardData.nome,
        cardExpirationMonth: creditCardData.validade.split('/')[0],
        cardExpirationYear: `20${creditCardData.validade.split('/')[1]}`,
        securityCode: creditCardData.cvv,
        identificationType: 'CPF',
        identificationNumber: creditCardData.cpf.replace(/\D/g, '')
      };

      console.log('🔄 Criando token do cartão...');
      const cardToken = await mpInstance.createCardToken(dadosCartao);

      if (cardToken.error) {
        throw new Error('Dados do cartão inválidos');
      }

      console.log('✅ Token criado:', cardToken.id);

      // Processar pagamento
      console.log('🚀 Enviando dados de cartão para processar-pagamento...');
      // Detectar ambiente baseado nas credenciais com validação rigorosa
      const isProductionCreds = accessToken?.startsWith('APP_USR-') && publicKey?.startsWith('APP_USR-');
      const isSandboxCreds = accessToken?.startsWith('TEST-') && publicKey?.startsWith('TEST-');
      
      let detectedEnvironment;
      if (isProductionCreds) {
        detectedEnvironment = 'production';
        console.log('✅ Usando credenciais de PRODUÇÃO para Cartão');
      } else if (isSandboxCreds) {
        detectedEnvironment = 'sandbox';
        console.log('⚠️ Usando credenciais de SANDBOX para Cartão');
      } else {
        console.error('❌ Credenciais inválidas - não são nem de produção nem de sandbox');
        console.error('❌ PublicKey:', publicKey?.substring(0, 10), 'AccessToken:', accessToken?.substring(0, 10));
        throw new Error('Credenciais do MercadoPago inválidas ou inconsistentes');
      }
      
      console.log('🌍 Ambiente detectado automaticamente (cartão):', detectedEnvironment);

      // Criar external_reference único para correlacionar com webhook
      const externalReference = `checkout_${checkout.id}_${Date.now()}`
      
      const requestBody = {
        checkoutId: checkout.id,
        gatewayId: checkout.gatewayId || gatewayId || 'direct',
        token: cardToken.id,
        customerData: formData,
        items,
        totalAmount: orderCalculation.totalFinal,
        paymentMethod: 'credit_card',
        installments: selectedInstallments,
        environment: detectedEnvironment,
        externalReference,
        directCredentials: {
          accessToken,
          publicKey
        }
      };
      
      console.log('📤 Request body cartão:', JSON.stringify({
        ...requestBody,
        token: cardToken.id?.substring(0, 20) + '...'
      }, null, 2));
      
      const response = await supabase.functions.invoke('processar-pagamento', {
        body: requestBody
      });

      console.log('📥 Resposta completa da Edge Function (cartão):', response);
      console.log('📥 Response data:', response.data);
      console.log('📥 Response error:', response.error);

      if (response.error) {
        console.error('❌ Erro na invocação da edge function (cartão):', response.error);
        throw new Error(response.error.message || 'Erro no servidor de pagamento');
      }

      if (response.data?.success) {
        console.log('✅ Pagamento processado com sucesso');
        navigate(response.data.redirectUrl);
        return true;
      } else {
        console.error('❌ Resposta indica falha (cartão):', response.data);
        throw new Error(response.data?.error || 'Pagamento recusado pelo gateway');
      }
    } catch (error) {
      console.error('❌ Erro no processamento cartão:', error);
      if (error.message?.includes('FunctionsHttpError')) {
        throw new Error('Erro no servidor de pagamento. Tente novamente.');
      }
      throw error;
    }
  }, [checkout, orderCalculation, isReady, mpInstance, accessToken, publicKey, gatewayId, navigate]);

  return {
    processPixPayment,
    processCreditCardPayment,
    isReady,
    error: mpError,
    loading: mpLoading,
    retryInitialization,
    debugInfo: {
      hasPublicKey: !!publicKey,
      hasAccessToken: !!accessToken,
      hasMpInstance: !!mpInstance,
      publicKeyPreview: publicKey ? publicKey.substring(0, 15) + '...' : 'N/A',
      accessTokenPreview: accessToken ? accessToken.substring(0, 15) + '...' : 'N/A'
    }
  };
};
