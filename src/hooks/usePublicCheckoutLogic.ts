
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useCheckoutContext } from '@/context/CheckoutContext';
import { useProductContext } from '@/context/ProductContext';
import { useSupabaseGateways } from '@/hooks/useSupabaseGateways';
import { useCheckoutData } from '@/hooks/useCheckoutData';
import { useCheckoutCalculation } from '@/hooks/useCheckoutCalculation';
import { useCheckoutSubmission } from '@/hooks/useCheckoutSubmission';

import { useGlobalSettings } from '@/hooks/useGlobalSettings';
import { useCheckoutFooterConfig } from '@/components/checkout/CheckoutFooterConfig';
import { useEffectiveCheckout } from '@/hooks/useEffectiveCheckout';
import { CHECKOUT_STATUS, PAYMENT_METHODS } from '@/constants';
import { CustomerFormData, CreditCardData } from '@/types/checkout';
import { OrderCalculationResult } from '@/core/checkoutEngine';

export const usePublicCheckoutLogic = () => {
  const { checkoutId } = useParams<{ checkoutId: string }>();
  const { getCheckoutById, loading: checkoutContextLoading, getAllPublicCheckouts } = useCheckoutContext();
  const { getProductById, loading: productContextLoading } = useProductContext();
  const { gateways, loading: gatewaysLoading } = useSupabaseGateways();
  
  // Estado local para debug
  const [showDebug, setShowDebug] = useState(false);
  const [systemInitialized, setSystemInitialized] = useState(false);
  const [initializationError, setInitializationError] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState<CustomerFormData>({
    nome: '',
    email: '',
    telefone: '',
    cpf: ''
  });

  const [creditCardData, setCreditCardData] = useState<CreditCardData>({
    numero: '',
    nome: '',
    cpf: '',
    validade: '',
    cvv: ''
  });

  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
  const [selectedOrderBumps, setSelectedOrderBumps] = useState<string[]>([]);
  const [selectedInstallments, setSelectedInstallments] = useState(1);
  const [orderCalculation, setOrderCalculation] = useState<OrderCalculationResult | null>(null);
  
  console.log('🔥 usePublicCheckoutLogic: Iniciando com checkoutId:', checkoutId);
  console.log('🔥 Estados de loading:', {
    checkoutContextLoading,
    productContextLoading,
    gatewaysLoading
  });
  
  // Função para obter gateway com fallbacks melhorada
  const getGatewayById = (id: string | null) => {
    console.log('🔍 getGatewayById chamado com:', id);
    
    if (id) {
      const specificGateway = gateways.find(g => g.id === id && g.is_active);
      if (specificGateway) {
        console.log('✅ Gateway específico encontrado:', specificGateway.name);
        return {
          id: specificGateway.id,
          type: specificGateway.type,
          name: specificGateway.name,
          is_active: specificGateway.is_active,
          credentials: specificGateway.credentials,
          environment: specificGateway.environment
        };
      }
    }
    
    const fallbackGateway = gateways.find(g => g.type === 'mercado_pago' && g.is_active);
    if (fallbackGateway) {
      console.log('✅ Gateway fallback encontrado:', fallbackGateway.name);
      return {
        id: fallbackGateway.id,
        type: fallbackGateway.type,
        name: fallbackGateway.name,
        is_active: fallbackGateway.is_active,
        credentials: fallbackGateway.credentials,
        environment: fallbackGateway.environment
      };
    }
    
    console.log('⚠️ Nenhum gateway encontrado, retornando null');
    return null;
  };

  // Carregar checkouts públicos na inicialização
  useEffect(() => {
    if (!checkoutContextLoading) {
      console.log('🔄 Executando getAllPublicCheckouts...');
      getAllPublicCheckouts().then(() => {
        console.log('✅ getAllPublicCheckouts concluído');
      }).catch(error => {
        console.error('❌ Erro ao carregar checkouts públicos:', error);
        setInitializationError('Falha ao carregar dados do checkout');
      });
    }
  }, [checkoutContextLoading, getAllPublicCheckouts]);

  // Hook para configurações globais
  const { globalSettings, loading: settingsLoading } = useGlobalSettings();
  const [localSettings, setLocalSettings] = useState(globalSettings);
  
  console.log('🔥 Configurações globais:', {
    globalSettings: !!globalSettings,
    settingsLoading,
    localSettings: !!localSettings
  });
  
  // Atualizar configurações locais quando globalSettings mudam
  useEffect(() => {
    if (globalSettings) {
      setLocalSettings(globalSettings);
      console.log('🔄 PublicCheckout: Configurações atualizadas:', {
        exibirInformacoesLegais: globalSettings.footer.exibirInformacoesLegais,
        linkTermosCompra: globalSettings.footer.linkTermosCompra ? 'DEFINIDO' : 'VAZIO',
        linkPoliticaPrivacidade: globalSettings.footer.linkPoliticaPrivacidade ? 'DEFINIDO' : 'VAZIO',
        lastUpdated: globalSettings.lastUpdated
      });
    }
  }, [globalSettings]);

  // Event listeners para mudanças nas configurações e debug mode
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key && e.key.startsWith('settings_updated')) {
        console.log('🔄 PublicCheckout: Detectada mudança via localStorage');
        setTimeout(() => {
          window.location.reload();
        }, 500);
      }
    };
    
    const handleCustomEvent = (e: CustomEvent) => {
      console.log('🔄 PublicCheckout: Detectada mudança via evento customizado');
      if (e.detail) {
        setLocalSettings(e.detail);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'd') {
        e.preventDefault();
        setShowDebug(prev => !prev);
        console.log('🐛 Debug mode toggled:', !showDebug);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('globalSettingsUpdated', handleCustomEvent as EventListener);
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('globalSettingsUpdated', handleCustomEvent as EventListener);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showDebug]);

  // Loading consolidado
  const contextLoading = checkoutContextLoading || productContextLoading || gatewaysLoading;
  console.log('🔥 Loading consolidado:', {
    contextLoading,
    checkoutContextLoading,
    productContextLoading,
    gatewaysLoading
  });

  // Carregar dados do checkout
  const { loading, error, checkout, mainProduct, orderBumps } = useCheckoutData({
    checkoutId,
    getCheckoutById,
    getProductById,
    contextLoading
  });

  console.log('🔥 Dados do checkout:', {
    loading,
    error,
    checkout: !!checkout,
    mainProduct: !!mainProduct,
    orderBumps: orderBumps.length
  });

  // Calcular checkout efetivo
  const effectiveCheckout = useEffectiveCheckout({
    checkout,
    gateways,
    getGatewayById
  });

  console.log('🔥 Checkout efetivo:', {
    effectiveCheckout: !!effectiveCheckout,
    gatewayId: effectiveCheckout?.gatewayId
  });

  // Hook para cálculo do pedido
  useCheckoutCalculation({
    mainProduct,
    orderBumps,
    selectedOrderBumps,
    onCalculationUpdate: setOrderCalculation
  });

  // Submissão
  const submissionHook = useCheckoutSubmission({
    checkout: effectiveCheckout,
    orderCalculation,
    getGatewayById
  });

  // Trigger form validation when checkout becomes available and form has data
  useEffect(() => {
    if (submissionHook.updateFormValidation && effectiveCheckout && !contextLoading) {
      const hasFormData = formData.nome || formData.email || formData.telefone || formData.cpf;
      if (hasFormData) {
        console.log('🔄 usePublicCheckoutLogic: Checkout carregado, re-validando formulário');
        submissionHook.updateFormValidation(formData);
      }
    }
  }, [effectiveCheckout, contextLoading, submissionHook.updateFormValidation]);

  // Configurações do footer
  const footerConfig = useCheckoutFooterConfig({ globalSettings: localSettings });

  // Verificar inicialização do sistema com melhor sincronização
  useEffect(() => {
    const checkSystemInitialization = () => {
      try {
        const hasCheckout = !!effectiveCheckout;
        const hasMainProduct = !!mainProduct;
        const hasGateways = gateways.length > 0;
        
        // Verificação mais precisa do gateway ativo
        let hasActiveGateway = false;
        if (effectiveCheckout?.gatewayId) {
          const gateway = getGatewayById(effectiveCheckout.gatewayId);
          if (gateway && gateway.is_active) {
            const credentials = gateway.credentials || {};
            const environment = gateway.environment || 'sandbox';
            
            // Verificar credenciais baseadas no ambiente
            if (environment === 'production') {
              hasActiveGateway = !!((credentials as any).publicKeyProd && (credentials as any).accessTokenProd) ||
                                !!((credentials as any).publicKey && (credentials as any).accessToken);
            } else {
              hasActiveGateway = !!((credentials as any).publicKeySandbox && (credentials as any).accessTokenSandbox) ||
                                !!((credentials as any).publicKey && (credentials as any).accessToken);
            }
          }
        }
        
        const isSystemReady = hasCheckout && hasMainProduct && hasGateways && hasActiveGateway;
        
        console.log('🔍 Verificação do sistema (melhorada):', {
          hasCheckout,
          hasMainProduct,
          hasGateways,
          hasActiveGateway,
          isSystemReady,
          gatewayId: effectiveCheckout?.gatewayId,
          environment: getGatewayById(effectiveCheckout?.gatewayId)?.environment
        });
        
        setSystemInitialized(isSystemReady);
        
        if (!isSystemReady && !contextLoading && !loading) {
          if (!hasCheckout) {
            setInitializationError('Checkout não encontrado ou inativo');
          } else if (!hasMainProduct) {
            setInitializationError('Produto principal não encontrado');
          } else if (!hasGateways) {
            setInitializationError('Nenhum gateway de pagamento configurado');
          } else if (!hasActiveGateway) {
            setInitializationError('Gateway de pagamento não configurado adequadamente');
          }
        } else {
          setInitializationError(null);
        }
        
      } catch (err) {
        console.error('❌ Erro na verificação do sistema:', err);
        setInitializationError('Erro na inicialização do sistema');
        setSystemInitialized(false);
      }
    };

    // Aguardar carregamento antes de verificar
    if (!contextLoading && !loading && !settingsLoading) {
      checkSystemInitialization();
    }
  }, [
    effectiveCheckout,
    mainProduct,
    gateways,
    contextLoading,
    loading,
    settingsLoading,
    getGatewayById
  ]);

  // Form handlers
  const handleFormDataChange = (field: string, value: string) => {
    const updatedFormData = {
      ...formData,
      [field]: value
    };
    
    setFormData(updatedFormData);
    
    // Atualizar validação do formulário em tempo real - apenas se checkout estiver carregado
    if (submissionHook.updateFormValidation && effectiveCheckout && !contextLoading) {
      console.log('🔄 handleFormDataChange: Atualizando validação para:', field, value ? value.substring(0, 10) + '...' : 'vazio');
      submissionHook.updateFormValidation(updatedFormData);
    }
  };

  const handleCreditCardDataChange = (field: string, value: string) => {
    setCreditCardData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleOrderBumpToggle = (bumpId: string) => {
    setSelectedOrderBumps(prev => {
      if (prev.includes(bumpId)) {
        return prev.filter(id => id !== bumpId);
      } else {
        return [...prev, bumpId];
      }
    });
  };

  // Handler para submissão do formulário
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (submissionHook.isSubmitting) {
      console.log('⚠️ Já está processando, ignorando nova submissão');
      return;
    }
    
    console.log('🔥 FORMULÁRIO SUBMETIDO!');
    await submissionHook.handleSubmit(
      formData,
      creditCardData,
      selectedPaymentMethod,
      selectedOrderBumps,
      selectedInstallments
    );
  };

  // Estados de validação melhorados
  const isLoading = contextLoading || loading || settingsLoading || submissionHook.paymentSystemLoading;
  const hasError = error || initializationError || !checkout || !mainProduct;
  const isCheckoutInactive = checkout && checkout.status !== CHECKOUT_STATUS.ACTIVE;

  console.log('🔥 Estados finais:', {
    isLoading,
    hasError,
    isCheckoutInactive,
    error: error || initializationError,
    systemInitialized
  });

  // Gateway ID para MercadoPagoProvider
  const checkoutGatewayId = effectiveCheckout?.gatewayId || 
    gateways.find(g => g.type === 'mercado_pago' && g.is_active)?.id || 
    null;

  return {
    // Estado básico
    checkoutId,
    isLoading,
    hasError,
    isCheckoutInactive,
    error: error || initializationError,
    showDebug,
    systemInitialized,
    
    // Dados principais
    checkout: effectiveCheckout,
    mainProduct,
    orderBumps,
    footerConfig,
    checkoutGatewayId,
    
    // Estado do checkout
    formData,
    selectedPaymentMethod,
    selectedOrderBumps,
    selectedInstallments,
    creditCardData,
    orderCalculation,
    setSelectedPaymentMethod,
    setSelectedInstallments,
    handleFormDataChange,
    handleCreditCardDataChange,
    handleOrderBumpToggle,
    
    // Submissão
    ...submissionHook,
    handleFormSubmit,
    
    // Debug
    debugInfo: submissionHook.debugInfo
  };
};
