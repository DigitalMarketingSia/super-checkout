
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMercadoPagoContext } from '@/context/MercadoPagoContext';
import { useOrderContext } from '@/context/OrderContext';
import { useProductContext } from '@/context/ProductContext';
import { supabase } from '@/integrations/supabase/client';
import { CustomerFormData, CreditCardData } from '@/types/checkout';
import { CheckoutConfig } from '@/api/mockDatabase';
import { OrderCalculationResult } from '@/core/checkoutEngine';

interface UseMercadoPagoPaymentProps {
  checkout: CheckoutConfig | null;
  orderCalculation: OrderCalculationResult | null;
}

export const useMercadoPagoPayment = ({
  checkout,
  orderCalculation
}: UseMercadoPagoPaymentProps) => {
  const navigate = useNavigate();
  const { addOrder } = useOrderContext();
  const { getProductById } = useProductContext();
  const { 
    isInitialized, 
    accessToken, 
    environment,
    mpInstance,
    error: mpError,
    initializeMercadoPago,
    retryInitialization,
    loading: mpLoading
  } = useMercadoPagoContext();

  const createCardToken = useCallback(async (creditCardData: CreditCardData) => {
    console.log('💳 Criando token do cartão...');
    console.log('🔍 Estado do MP:', { isInitialized, hasAccessToken: !!accessToken, environment });

    // Garantir que o SDK está inicializado
    if (!isInitialized || !mpInstance || mpLoading) {
      console.log('🔄 SDK não inicializado, tentando inicializar...');
      try {
        await initializeMercadoPago();
      } catch (error) {
        console.error('❌ Falha na inicialização:', error);
        throw new Error('Falha ao inicializar sistema de pagamento');
      }
    }

    if (!mpInstance) {
      console.error('❌ Instância do MercadoPago não está disponível');
      throw new Error('Sistema de pagamento não carregado. Tente novamente.');
    }

    console.log('✅ Usando instância MercadoPago:', typeof mpInstance);
    const mp = mpInstance;
    
    const dadosCartao = {
      cardNumber: creditCardData.numero.replace(/\s/g, ''),
      cardholderName: creditCardData.nome,
      cardExpirationMonth: creditCardData.validade.split('/')[0],
      cardExpirationYear: `20${creditCardData.validade.split('/')[1]}`,
      securityCode: creditCardData.cvv,
      identificationType: 'CPF',
      identificationNumber: creditCardData.cpf.replace(/\D/g, '')
    };

    console.log('📤 Dados do cartão preparados:', {
      cardNumber: dadosCartao.cardNumber.replace(/\d/g, '*'),
      cardholderName: dadosCartao.cardholderName,
      expirationMonth: dadosCartao.cardExpirationMonth,
      expirationYear: dadosCartao.cardExpirationYear
    });

    try {
      const cardToken = await mp.createCardToken(dadosCartao);
      
      if (cardToken.error) {
        console.error('❌ Token retornou erro:', cardToken.error);
        throw new Error('Dados do cartão inválidos. Verifique as informações e tente novamente.');
      }

      if (!cardToken.id) {
        console.error('❌ Token criado mas sem ID:', cardToken);
        throw new Error('Falha na validação do cartão. Tente novamente.');
      }

      console.log('✅ Token do cartão criado com sucesso:', cardToken.id);
      return cardToken;
    } catch (error) {
      console.error('❌ Erro ao criar token:', error);
      throw new Error('Erro ao validar dados do cartão. Verifique as informações.');
    }
  }, [isInitialized, initializeMercadoPago, accessToken, environment, mpLoading, mpInstance]);

  const processPixPayment = useCallback(async (
    formData: CustomerFormData,
    selectedOrderBumps: string[]
  ) => {
    if (!checkout || !orderCalculation) {
      throw new Error('Dados do checkout não carregados');
    }

    console.log('🟢 [PIX DEBUG] Iniciando processamento PIX...', {
      checkoutId: checkout.id,
      gatewayId: checkout.gatewayId,
      environment,
      customerData: {
        nome: formData.nome ? 'PRESENTE' : 'AUSENTE',
        email: formData.email ? 'PRESENTE' : 'AUSENTE',
        telefone: formData.telefone ? 'PRESENTE' : 'AUSENTE',
        cpf: formData.cpf ? 'PRESENTE' : 'AUSENTE'
      },
      totalAmount: orderCalculation.totalFinal,
      accessTokenPresent: !!accessToken,
      mpInitialized: isInitialized,
      mpLoading
    });

    // Garantir que o contexto está inicializado - mas ser mais flexível
    if (!isInitialized && !mpLoading) {
      console.log('🔄 Contexto não inicializado, tentando inicializar...');
      try {
        await initializeMercadoPago();
        // Aguardar um pouco após inicialização
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error('❌ Falha na inicialização do contexto:', error);
        // Não falhar aqui se tivermos credenciais diretas
        console.log('⚠️ Continuando sem inicialização devido a credenciais diretas...');
      }
    }

    // Verificar credenciais - ser mais flexível
    if (!accessToken) {
      console.warn('⚠️ Access token não disponível via contexto, verificando credenciais diretas...');
      
      // Buscar gateway manualmente se necessário
      if (!checkout.gatewayId) {
        console.error('❌ Nem access token nem gateway ID disponível');
        throw new Error('Sistema de pagamento não configurado');
      }
      
      console.log('📤 Continuando com credenciais diretas via Edge Function...');
    }

    // Obter dados dos produtos
    const mainProduct = getProductById(checkout.mainProductId);
    const orderBumps = selectedOrderBumps.map(id => getProductById(id)).filter(Boolean);

    if (!mainProduct) {
      throw new Error('Produto principal não encontrado');
    }

    const items = [
      {
        id: checkout.mainProductId,
        title: mainProduct.name || 'Produto',
        quantity: 1,
        unit_price: mainProduct.price || 0
      },
      ...orderBumps.map(bump => ({
        id: bump.id,
        title: bump.name || 'Order Bump',
        quantity: 1,
        unit_price: bump.price || 0
      }))
    ];

    console.log('📦 Itens do pedido:', items);
    console.log('💰 Valor total:', orderCalculation.totalFinal);

    try {
      // Criar external_reference único para correlacionar com webhook
      const externalReference = `checkout_${checkout.id}_${Date.now()}`;
      
      // Dados que serão enviados para a Edge Function
      const payloadData = {
        checkoutId: checkout.id,
        gatewayId: checkout.gatewayId || 'fallback',
        customerData: formData,
        items,
        totalAmount: orderCalculation.totalFinal,
        paymentMethod: 'pix',
        environment,
        externalReference,
        directCredentials: {
          publicKey: accessToken ? '' : '',
          accessToken: accessToken || ''
        }
      };

      console.log('📤 [PIX DEBUG] Dados enviados para Edge Function:', {
        checkoutId: checkout.id,
        gatewayId: checkout.gatewayId || 'fallback', 
        totalAmount: orderCalculation.totalFinal,
        itemsCount: items.length,
        environment,
        hasAccessToken: !!accessToken,
        customerFields: Object.keys(formData).filter(key => formData[key as keyof CustomerFormData])
      });
      
      const response = await supabase.functions.invoke('processar-pagamento', {
        body: payloadData
      });

      console.log('📥 [PIX DEBUG] Resposta completa da Edge Function:', {
        hasError: !!response.error,
        hasData: !!response.data,
        errorDetails: response.error,
        dataKeys: response.data ? Object.keys(response.data) : [],
        status: response.data?.success ? 'SUCCESS' : 'FAILURE'
      });

      // Tratamento detalhado de erros
      if (response.error) {
        console.error('❌ [PIX DEBUG] Erro da Edge Function:', {
          message: response.error.message,
          details: response.error.details,
          hint: response.error.hint,
          code: response.error.code
        });
        
        // Mensagens de erro mais específicas para o usuário
        let userMessage = 'Erro ao processar PIX';
        
        if (response.error.message?.includes('credentials')) {
          userMessage = 'Credenciais do MercadoPago inválidas. Verifique a configuração.';
        } else if (response.error.message?.includes('gateway')) {
          userMessage = 'Gateway de pagamento não configurado. Contate o suporte.';
        } else if (response.error.message?.includes('required')) {
          userMessage = 'Dados obrigatórios faltando. Verifique o formulário.';
        } else if (response.error.message?.includes('amount')) {
          userMessage = 'Valor do pagamento inválido.';
        }
        
        throw new Error(userMessage);
      }

      if (response.data?.success) {
        console.log('✅ [PIX DEBUG] PIX processado com sucesso, redirecionando...', {
          hasRedirectUrl: !!response.data.redirectUrl,
          hasPixData: !!response.data.pixData,
          hasOrderData: !!response.data.orderData
        });
        
        navigate(response.data.redirectUrl, {
          state: {
            pixData: response.data.pixData,
            orderData: response.data.orderData
          }
        });
        return true;
      } else {
        console.error('❌ [PIX DEBUG] Resposta de falha:', {
          responseData: response.data,
          errorMessage: response.data?.error
        });
        
        const errorMessage = response.data?.error || 'Falha no processamento do PIX';
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('❌ [PIX DEBUG] Erro no processamento PIX:', {
        errorType: error instanceof Error ? error.constructor.name : typeof error,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      
      // Re-throw com mensagem mais amigável se necessário
      if (error instanceof Error) {
        throw error;
      } else {
        throw new Error('Erro inesperado no processamento do PIX');
      }
    }
  }, [checkout, orderCalculation, isInitialized, accessToken, environment, getProductById, navigate, initializeMercadoPago, mpLoading, mpInstance]);

  const processCreditCardPayment = useCallback(async (
    formData: CustomerFormData,
    creditCardData: CreditCardData,
    selectedOrderBumps: string[],
    selectedInstallments: number = 1
  ) => {
    if (!checkout || !orderCalculation) {
      throw new Error('Dados do checkout não carregados');
    }

    console.log('💳 Iniciando processamento cartão...', {
      checkoutId: checkout.id,
      gatewayId: checkout.gatewayId,
      environment,
      installments: selectedInstallments
    });

    // Garantir que o contexto está inicializado
    if (!isInitialized || !mpInstance || mpLoading) {
      console.log('🔄 Contexto não inicializado, tentando inicializar...');
      try {
        await initializeMercadoPago();
      } catch (error) {
        console.error('❌ Falha na inicialização do contexto:', error);
        throw new Error('Sistema de pagamento não inicializado');
      }
    }

    if (!accessToken) {
      console.error('❌ Access token não disponível');
      throw new Error('Credenciais do MercadoPago não configuradas');
    }

    // Criar token do cartão
    console.log('🔄 Criando token do cartão...');
    const cardToken = await createCardToken(creditCardData);

    // Obter dados dos produtos
    const mainProduct = getProductById(checkout.mainProductId);
    const orderBumps = selectedOrderBumps.map(id => getProductById(id)).filter(Boolean);

    if (!mainProduct) {
      throw new Error('Produto principal não encontrado');
    }

    const items = [
      {
        id: checkout.mainProductId,
        title: mainProduct.name || 'Produto',
        quantity: 1,
        unit_price: mainProduct.price || 0
      },
      ...orderBumps.map(bump => ({
        id: bump.id,
        title: bump.name || 'Order Bump',
        quantity: 1,
        unit_price: bump.price || 0
      }))
    ];

    console.log('📦 Itens do pedido:', items);
    console.log('💰 Valor total:', orderCalculation.totalFinal);

    try {
      // Criar external_reference único para correlacionar com webhook
      const externalReference = `checkout_${checkout.id}_${Date.now()}`;
      
      const response = await supabase.functions.invoke('processar-pagamento', {
        body: {
          checkoutId: checkout.id,
          gatewayId: checkout.gatewayId || 'fallback',
          token: cardToken.id,
          customerData: formData,
          items,
          totalAmount: orderCalculation.totalFinal,
          paymentMethod: 'credit_card',
          installments: selectedInstallments,
          environment,
          externalReference,
          directCredentials: {
            publicKey: accessToken ? '' : '',
            accessToken: accessToken || ''
          }
        }
      });

      console.log('📤 Dados enviados para Edge Function:', {
        checkoutId: checkout.id,
        gatewayId: checkout.gatewayId || 'fallback',
        totalAmount: orderCalculation.totalFinal,
        hasToken: !!cardToken.id,
        itemsCount: items.length
      });

      console.log('📥 Resposta da Edge Function:', response);

      if (response.error) {
        console.error('❌ Erro da Edge Function:', response.error);
        throw new Error(response.error.message || 'Erro no servidor de pagamento');
      }

      if (!response.data) {
        throw new Error('Resposta inválida do servidor');
      }
      
      if (response.data.success) {
        console.log('✅ Pagamento processado com sucesso!');
        navigate(response.data.redirectUrl);
        return true;
      } else {
        console.error('❌ Pagamento recusado:', response.data);
        throw new Error(response.data.error || 'Pagamento recusado pelo gateway');
      }
    } catch (error) {
      console.error('❌ Erro no processamento cartão:', error);
      throw error;
    }
  }, [checkout, orderCalculation, isInitialized, accessToken, environment, createCardToken, getProductById, navigate, initializeMercadoPago, mpLoading, mpInstance]);

  const isReady = isInitialized && !!accessToken && !!mpInstance && !mpLoading;
  
  console.log('🔍 useMercadoPagoPayment - Status isReady:', {
    isReady,
    isInitialized,
    hasAccessToken: !!accessToken,
    hasMpInstance: !!mpInstance,
    notLoading: !mpLoading,
    accessTokenPreview: accessToken ? accessToken.substring(0, 15) + '...' : 'N/A'
  });

  return {
    processPixPayment,
    processCreditCardPayment,
    isReady,
    error: mpError,
    loading: mpLoading,
    retryInitialization
  };
};
