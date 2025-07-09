
import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckoutConfig } from '@/api/mockDatabase';
import { OrderCalculationResult } from '@/core/checkoutEngine';
import { CustomerFormData, CreditCardData } from '@/types/checkout';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { usePaymentProcessing } from './usePaymentProcessing';
import { useCustomerManagement } from './useCustomerManagement';

interface UseCheckoutSubmissionProps {
  checkout: CheckoutConfig | null;
  orderCalculation: OrderCalculationResult | null;
  getGatewayById: (id: string | null) => any;
}

export const useCheckoutSubmission = ({
  checkout,
  orderCalculation,
  getGatewayById
}: UseCheckoutSubmissionProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { createOrFindCustomer } = useCustomerManagement();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentSystemLoading, setPaymentSystemLoading] = useState(false);
  const [isPaymentSystemReady, setIsPaymentSystemReady] = useState(false);
  const [isFormComplete, setIsFormComplete] = useState(false);

  const paymentProcessing = usePaymentProcessing({
    checkout,
    orderCalculation,
    getGatewayById
  });

  // Função para criar registro da venda usando UUID do cliente
  const createSaleRecord = useCallback(async (
    formData: CustomerFormData,
    paymentMethod: string,
    selectedOrderBumps: string[],
    externalReference: string
  ) => {
    if (!checkout || !orderCalculation) {
      throw new Error('Dados do checkout incompletos');
    }

    console.log('📝 Criando registro de venda no banco...');

    try {
      // Primeiro, criar/buscar cliente
      const customer = await createOrFindCustomer(formData);

      // Criar dados da venda com UUID correto do cliente
      const saleData = {
        external_reference: externalReference,
        id_cliente: customer.id, // Agora usando UUID correto
        email_cliente: formData.email,
        metodo_pagamento: paymentMethod,
        valor_total: orderCalculation.totalFinal,
        status: 'pendente'
      };

      console.log('💾 Dados da venda:', saleData);

      const { data: venda, error: vendaError } = await supabase
        .from('vendas')
        .insert(saleData)
        .select()
        .single();

      if (vendaError) {
        console.error('❌ Erro ao criar venda:', vendaError);
        throw new Error('Falha ao registrar venda: ' + vendaError.message);
      }

      console.log('✅ Venda criada com ID:', venda.id);

      // Criar itens da venda
      const items = [];
      
      // Item principal
      items.push({
        venda_id: venda.id,
        produto_id: checkout.mainProductId,
        tipo: 'produto_principal',
        quantidade: 1,
        valor_unitario: orderCalculation.valorProdutoPrincipal,
        valor_total: orderCalculation.valorProdutoPrincipal
      });

      // Order bumps selecionados
      selectedOrderBumps.forEach(bumpId => {
        const bump = orderCalculation.orderBumps.find(b => b.id === bumpId);
        if (bump) {
          items.push({
            venda_id: venda.id,
            produto_id: bumpId,
            tipo: 'order_bump',
            quantidade: 1,
            valor_unitario: bump.price,
            valor_total: bump.price
          });
        }
      });

      if (items.length > 0) {
        const { error: itemsError } = await supabase
          .from('itens_da_venda')
          .insert(items);

        if (itemsError) {
          console.error('❌ Erro ao criar itens da venda:', itemsError);
          // Não falhar a venda por causa dos itens
        } else {
          console.log('✅ Itens da venda criados:', items.length);
        }
      }

      return venda;

    } catch (error) {
      console.error('❌ Erro no processo de venda:', error);
      throw error;
    }
  }, [checkout, orderCalculation, createOrFindCustomer]);

  // Função para validar se o formulário está completo
  const validateFormComplete = useCallback((formData: CustomerFormData) => {
    if (!checkout || !checkout.requiredFormFields || !Array.isArray(checkout.requiredFormFields)) {
      console.log('🔍 validateFormComplete: Checkout ou campos obrigatórios não disponíveis');
      return false;
    }

    const isComplete = checkout.requiredFormFields.every(field => {
      const value = formData[field as keyof CustomerFormData];
      return value && String(value).trim() !== '';
    });

    console.log('🔍 validateFormComplete:', {
      requiredFields: checkout.requiredFormFields,
      formData: Object.keys(formData).reduce((acc, key) => {
        const value = formData[key as keyof CustomerFormData];
        acc[key] = value ? String(value).substring(0, 10) + '...' : 'vazio';
        return acc;
      }, {} as Record<string, string>),
      isComplete
    });

    return isComplete;
  }, [checkout]);

  // useEffect para validar o formulário quando os dados mudarem
  useEffect(() => {
    // Só validar se o checkout estiver carregado e dados estiverem disponíveis
    if (!checkout || !checkout.requiredFormFields || !Array.isArray(checkout.requiredFormFields)) {
      console.log('🔍 useEffect validação: Checkout não carregado ou campos não disponíveis');
      setIsFormComplete(false);
      return;
    }

    // Inicialmente consideramos como incompleto até que seja validado adequadamente
    const isComplete = validateFormComplete({
      nome: '',
      email: '',
      telefone: '',
      cpf: ''
    });
    
    console.log('🔍 useEffect validação: Estado inicial do formulário:', { isComplete });
    setIsFormComplete(isComplete);
  }, [checkout, validateFormComplete]);

  const clearPaymentError = useCallback(() => {
    setPaymentError(null);
  }, []);

  const handleSubmit = useCallback(async (
    formData: CustomerFormData,
    creditCardData: CreditCardData,
    selectedPaymentMethod: string,
    selectedOrderBumps: string[],
    selectedInstallments: number
  ) => {
    if (!checkout || !orderCalculation) {
      console.error('❌ Dados do checkout não carregados');
      setPaymentError('Dados do checkout não carregados');
      return false;
    }

    if (isSubmitting) {
      console.log('⚠️ Já está processando, ignorando submissão duplicada');
      return false;
    }

    // Validação básica melhorada
    if (!formData.nome?.trim() || !formData.email?.trim()) {
      setPaymentError('Nome e email são obrigatórios');
      return false;
    }

    // Validar formato do email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setPaymentError('Por favor, insira um email válido');
      return false;
    }

    if (!selectedPaymentMethod) {
      // Auto-selecionar PIX se não selecionado
      selectedPaymentMethod = 'pix';
      console.log('🔄 Auto-selecionando PIX como método de pagamento');
    }

    setIsSubmitting(true);
    setPaymentError(null);
    setPaymentSystemLoading(true);

    try {
      console.log('🚀 Iniciando processo de pagamento...', {
        paymentMethod: selectedPaymentMethod,
        totalAmount: orderCalculation.totalFinal,
        checkoutId: checkout.id,
        customerEmail: formData.email
      });

      // Criar external_reference único ANTES do pagamento
      const externalReference = `checkout_${checkout.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      console.log('🔗 External reference gerado:', externalReference);

      // Criar registro da venda ANTES do pagamento
      console.log('📝 Criando registro da venda...');
      const saleRecord = await createSaleRecord(
        formData,
        selectedPaymentMethod,
        selectedOrderBumps,
        externalReference
      );

      console.log('✅ Venda registrada, processando pagamento...');

      // Obter gateway
      const gateway = getGatewayById(checkout.gatewayId);
      console.log('🏦 Gateway obtido:', gateway?.name || 'Nenhum');

      let result = false;

      // Processar pagamento baseado no método
      if (selectedPaymentMethod === 'pix') {
        console.log('🟢 [SUBMISSION DEBUG] Processando PIX...', {
          hasFormData: !!formData,
          hasGateway: !!gateway,
          gatewayType: gateway?.type,
          gatewayActive: gateway?.is_active,
          gatewayEnvironment: gateway?.environment,
          gatewayCredentials: gateway?.credentials ? Object.keys(gateway.credentials) : [],
          formDataFields: {
            nome: formData.nome ? 'PRESENTE' : 'AUSENTE',
            email: formData.email ? 'PRESENTE' : 'AUSENTE',
            telefone: formData.telefone ? 'PRESENTE' : 'AUSENTE',
            cpf: formData.cpf ? 'PRESENTE' : 'AUSENTE'
          }
        });
        
        result = await paymentProcessing.processPixPayment(
          formData,
          [],
          gateway
        );
      } else if (selectedPaymentMethod === 'credit_card') {
        console.log('💳 Processando cartão de crédito...');
        
        if (!creditCardData.numero || !creditCardData.nome || !creditCardData.validade || !creditCardData.cvv) {
          throw new Error('Dados do cartão são obrigatórios');
        }

        result = await paymentProcessing.processCreditCardPayment(
          formData,
          creditCardData,
          [],
          gateway,
          selectedInstallments
        );
      } else {
        throw new Error('Método de pagamento não suportado: ' + selectedPaymentMethod);
      }

      if (result) {
        console.log('✅ Pagamento processado com sucesso!');
        
        toast({
          title: "✅ Pedido Processado",
          description: "Seu pagamento foi processado com sucesso!",
          duration: 5000,
        });

        return true;
      } else {
        throw new Error('Falha no processamento do pagamento');
      }

    } catch (error) {
      console.error('❌ Erro no processamento:', error);
      
      let errorMessage = 'Erro desconhecido no pagamento';
      
      if (error instanceof Error) {
        errorMessage = error.message;
        
        // Mensagens de erro mais amigáveis
        if (errorMessage.includes('duplicate key value')) {
          errorMessage = 'Este pedido já foi processado. Tente novamente em alguns minutos.';
        } else if (errorMessage.includes('invalid input syntax for type uuid')) {
          errorMessage = 'Erro interno do sistema. Nossa equipe foi notificada.';
        } else if (errorMessage.includes('violates foreign key constraint')) {
          errorMessage = 'Erro de configuração do sistema. Contate o suporte.';
        }
      }
      
      setPaymentError(errorMessage);
      
      toast({
        title: "❌ Erro no Pagamento",
        description: errorMessage,
        variant: "destructive",
        duration: 8000,
      });

      return false;
    } finally {
      setIsSubmitting(false);
      setPaymentSystemLoading(false);
    }
  }, [
    checkout,
    orderCalculation,
    isSubmitting,
    getGatewayById,
    paymentProcessing,
    createSaleRecord,
    toast
  ]);

  // Função melhorada para verificar se o sistema de pagamento está pronto
  const checkPaymentSystemReady = useCallback(() => {
    if (!checkout) {
      console.log('🔍 checkPaymentSystemReady: Sem checkout');
      setIsPaymentSystemReady(false);
      return false;
    }

    const gateway = getGatewayById(checkout.gatewayId);
    
    if (!gateway) {
      console.log('🔍 checkPaymentSystemReady: Sem gateway');
      setIsPaymentSystemReady(false);
      return false;
    }

    if (!gateway.is_active) {
      console.log('🔍 checkPaymentSystemReady: Gateway inativo');
      setIsPaymentSystemReady(false);
      return false;
    }

    // Verificar credenciais específicas baseadas no ambiente
    const credentials = gateway.credentials || {};
    const environment = gateway.environment || 'sandbox';
    
    let hasValidCredentials = false;
    
    if (environment === 'production') {
      hasValidCredentials = !!(credentials.publicKeyProd && credentials.accessTokenProd);
    } else {
      hasValidCredentials = !!(credentials.publicKeySandbox && credentials.accessTokenSandbox);
    }
    
    // Fallback para credenciais genéricas
    if (!hasValidCredentials) {
      hasValidCredentials = !!(credentials.publicKey && credentials.accessToken);
    }
    
    const isReady = hasValidCredentials;
    
    console.log('🔍 checkPaymentSystemReady: Status detalhado:', {
      hasCheckout: !!checkout,
      hasGateway: !!gateway,
      gatewayActive: gateway.is_active,
      environment,
      hasValidCredentials,
      credentialsKeys: Object.keys(credentials),
      isReady
    });
    
    setIsPaymentSystemReady(isReady);
    return isReady;
  }, [checkout, getGatewayById]);

  // Verificar sistema de pagamento reativo baseado em dependências
  useEffect(() => {
    // Aguardar carregamento completo antes de verificar
    if (paymentSystemLoading || isSubmitting) return;
    
    console.log('🔄 useEffect checkPaymentSystemReady: Verificando sistema...', {
      hasCheckout: !!checkout,
      isFormComplete,
      paymentSystemLoading,
      isSubmitting
    });
    
    checkPaymentSystemReady();
  }, [
    checkout, 
    isFormComplete, 
    paymentSystemLoading, 
    isSubmitting, 
    checkPaymentSystemReady
  ]);

  // Debug info melhorado e alinhado
  const debugInfo = {
    hasPublicKey: (() => {
      const gateway = getGatewayById(checkout?.gatewayId);
      if (!gateway) return false;
      const credentials = gateway.credentials || {};
      const environment = gateway.environment || 'sandbox';
      
      if (environment === 'production') {
        return !!(credentials.publicKeyProd || credentials.publicKey);
      } else {
        return !!(credentials.publicKeySandbox || credentials.publicKey);
      }
    })(),
    hasAccessToken: (() => {
      const gateway = getGatewayById(checkout?.gatewayId);
      if (!gateway) return false;
      const credentials = gateway.credentials || {};
      const environment = gateway.environment || 'sandbox';
      
      if (environment === 'production') {
        return !!(credentials.accessTokenProd || credentials.accessToken);
      } else {
        return !!(credentials.accessTokenSandbox || credentials.accessToken);
      }
    })(),
    hasMpInstance: true, // Simplificado
    publicKeyPreview: (() => {
      const gateway = getGatewayById(checkout?.gatewayId);
      if (!gateway) return 'N/A';
      const credentials = gateway.credentials || {};
      const environment = gateway.environment || 'sandbox';
      
      let key = '';
      if (environment === 'production') {
        key = credentials.publicKeyProd || credentials.publicKey || '';
      } else {
        key = credentials.publicKeySandbox || credentials.publicKey || '';
      }
      
      return key ? key.substring(0, 15) + '...' : 'N/A';
    })(),
    accessTokenPreview: (() => {
      const gateway = getGatewayById(checkout?.gatewayId);
      if (!gateway) return 'N/A';
      const credentials = gateway.credentials || {};
      const environment = gateway.environment || 'sandbox';
      
      let token = '';
      if (environment === 'production') {
        token = credentials.accessTokenProd || credentials.accessToken || '';
      } else {
        token = credentials.accessTokenSandbox || credentials.accessToken || '';
      }
      
      return token ? token.substring(0, 15) + '...' : 'N/A';
    })(),
    systemReady: isPaymentSystemReady,
    gateway: getGatewayById(checkout?.gatewayId)
  };

  // Função externa para validar formulário em tempo real
  const updateFormValidation = useCallback((formData: CustomerFormData) => {
    const isComplete = validateFormComplete(formData);
    setIsFormComplete(isComplete);
    
    console.log('🔄 updateFormValidation: Formulário atualizado', {
      isComplete,
      hasCheckout: !!checkout,
      requiredFields: checkout?.requiredFormFields || []
    });
  }, [validateFormComplete, checkout]);

  return {
    handleSubmit,
    isSubmitting,
    paymentError,
    clearPaymentError,
    paymentSystemLoading,
    isPaymentSystemReady,
    isFormComplete,
    updateFormValidation,
    debugInfo
  };
};
