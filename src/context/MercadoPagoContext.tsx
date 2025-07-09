
import React, { createContext, useContext, ReactNode, useState, useEffect, useCallback } from 'react';
import { usePublicGateway } from '@/hooks/usePublicGateway';
import { useMercadoPagoReact } from '@/hooks/useMercadoPagoReact';

interface MercadoPagoContextType {
  isInitialized: boolean;
  isConfigured: boolean;
  environment: 'sandbox' | 'production';
  publicKey: string | null;
  accessToken: string | null;
  mpInstance: any;
  initializeMercadoPago: () => Promise<void>;
  error: string | null;
  loading: boolean;
  retryInitialization: () => Promise<void>;
  gatewayInfo: {
    id: string | null;
    name: string | null;
    isActive: boolean;
  };
}

const MercadoPagoContext = createContext<MercadoPagoContextType | undefined>(undefined);

export const useMercadoPagoContext = () => {
  const context = useContext(MercadoPagoContext);
  if (!context) {
    throw new Error('useMercadoPagoContext must be used within a MercadoPagoProvider');
  }
  return context;
};

interface MercadoPagoProviderProps {
  children: ReactNode;
  gatewayId?: string | null;
}

export const MercadoPagoProvider: React.FC<MercadoPagoProviderProps> = ({ 
  children, 
  gatewayId 
}) => {
  const { gateway, loading: gatewayLoading, error: gatewayError, retry: retryGateway } = usePublicGateway(gatewayId);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [initializationAttempts, setInitializationAttempts] = useState(0);
  const [lastGatewayId, setLastGatewayId] = useState<string | null | undefined>(gatewayId);
  const maxInitializationAttempts = 3;

  console.log('🏦 MercadoPagoProvider - Inicializando com gatewayId:', gatewayId);
  console.log('🏦 MercadoPagoProvider - Status:', {
    gatewayId: gatewayId || 'null/undefined',
    hasGateway: !!gateway,
    gatewayName: gateway?.name || 'N/A',
    gatewayLoading,
    gatewayError: gatewayError || 'sem erro',
    isInitialized,
    loading,
    attempts: initializationAttempts
  });

  const {
    initializeMercadoPago: initSDK,
    getAccessToken,
    getPublicKey,
    isConfigured,
    isSDKLoaded,
    mpInstance
  } = useMercadoPagoReact({
    credentials: gateway?.credentials || {},
    environment: (gateway?.environment as 'sandbox' | 'production') || 'sandbox'
  });

  // Reset quando gateway ID muda (incluindo mudança de undefined para string)
  useEffect(() => {
    const gatewayIdChanged = gatewayId !== lastGatewayId;
    
    if (gatewayIdChanged) {
      console.log('🔄 Gateway ID mudou, resetando:', {
        from: lastGatewayId || 'undefined',
        to: gatewayId || 'undefined'
      });
      setIsInitialized(false);
      setError(null);
      setInitializationAttempts(0);
      setLastGatewayId(gatewayId);
    }
  }, [gatewayId, lastGatewayId]);

  const validateGateway = useCallback(() => {
    console.log('🔍 Validando gateway...', {
      hasGateway: !!gateway,
      gatewayType: gateway?.type,
      gatewayActive: gateway?.is_active,
      environment: gateway?.environment,
      isConfigured: isConfigured()
    });

    if (!gateway) {
      // Se não há gateway, não podemos validar, mas não é necessariamente um erro
      console.warn('⚠️ Nenhum gateway carregado para validação');
      return false;
    }

    if (gateway.type !== 'mercado_pago') {
      console.error(`❌ Gateway inválido. Esperado: mercado_pago, Recebido: ${gateway.type}`);
      throw new Error(`Gateway inválido. Esperado: mercado_pago, Recebido: ${gateway.type}`);
    }

    if (!gateway.is_active) {
      console.error('❌ Gateway MercadoPago está inativo');
      throw new Error('Gateway MercadoPago está inativo');
    }

    if (!isConfigured()) {
      console.warn('⚠️ Gateway não configurado adequadamente, verificando credenciais diretas...');
      
      // Verificar se pelo menos temos credenciais no gateway
      const credentials = gateway.credentials;
      if (!credentials) {
        console.error('❌ Nenhuma credencial encontrada no gateway');
        return false;
      }
      
      const hasProductionCreds = credentials.accessTokenProd && credentials.publicKeyProd;
      const hasSandboxCreds = credentials.accessTokenSandbox && credentials.publicKeySandbox;
      
      if (!hasProductionCreds && !hasSandboxCreds) {
        console.error('❌ Credenciais incompletas em ambos os ambientes');
        return false;
      }
      
      console.log('✅ Credenciais diretas encontradas, continuando...');
      return true;
    }

    const publicKey = getPublicKey();
    const accessToken = getAccessToken();

    if (!publicKey || !accessToken) {
      console.warn('⚠️ Credenciais via hook incompletas, verificando credenciais diretas:', {
        hasPublicKey: !!publicKey,
        hasAccessToken: !!accessToken,
        environment: gateway.environment,
        availableCredentials: gateway.credentials ? Object.keys(gateway.credentials) : []
      });
      
      // Fallback para credenciais diretas
      const credentials = gateway.credentials;
      if (credentials) {
        const envCredentialsExist = gateway.environment === 'production' 
          ? credentials.accessTokenProd && credentials.publicKeyProd
          : credentials.accessTokenSandbox && credentials.publicKeySandbox;
          
        if (envCredentialsExist) {
          console.log('✅ Credenciais diretas válidas encontradas');
          return true;
        }
      }
      
      console.error('❌ Nenhuma credencial válida encontrada');
      return false;
    }

    console.log('✅ Gateway validado com sucesso via hooks');
    return true;
  }, [gateway, isConfigured, getPublicKey, getAccessToken]);

  const initializeMercadoPago = useCallback(async () => {
    if (loading) {
      console.log('⏳ Inicialização já em andamento...');
      return;
    }

    if (gatewayLoading) {
      console.log('⏳ Aguardando carregamento do gateway...');
      return;
    }

    // Se não há gateway, não podemos inicializar
    if (!gateway) {
      console.log('ℹ️ Nenhum gateway disponível para inicialização');
      setError('Sistema de pagamento não configurado. Verifique se existe um gateway MercadoPago ativo.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      console.log(`🔄 Tentativa ${initializationAttempts + 1}/${maxInitializationAttempts}`);
      
      if (!validateGateway()) {
        throw new Error('Gateway não passou na validação');
      }
      
      console.log('✅ Inicializando SDK...');
      await initSDK();
      
      // Aguardar estabilização
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setIsInitialized(true);
      setInitializationAttempts(0);
      console.log('✅ MercadoPago inicializado!');
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      console.error('❌ Erro na inicialização:', errorMessage);
      
      setInitializationAttempts(prev => prev + 1);
      
      if (initializationAttempts < maxInitializationAttempts - 1) {
        const delay = (initializationAttempts + 1) * 1000;
        console.log(`⏳ Tentando novamente em ${delay}ms...`);
        
        setTimeout(() => {
          initializeMercadoPago();
        }, delay);
        return;
      }
      
      console.error('❌ Todas as tentativas falharam');
      setError(errorMessage);
      setIsInitialized(false);
    } finally {
      setLoading(false);
    }
  }, [
    loading, 
    gatewayLoading, 
    gateway, 
    validateGateway,
    initSDK, 
    initializationAttempts,
    maxInitializationAttempts
  ]);

  const retryInitialization = useCallback(async () => {
    console.log('🔄 Retry manual da inicialização...');
    setIsInitialized(false);
    setError(null);
    setInitializationAttempts(0);
    
    if (gatewayError) {
      console.log('🔄 Tentando recarregar gateway...');
      retryGateway();
      setTimeout(() => {
        initializeMercadoPago();
      }, 1000);
    } else {
      await initializeMercadoPago();
    }
  }, [gatewayError, retryGateway, initializeMercadoPago]);

  // Auto-inicializar quando condições estão prontas
  useEffect(() => {
    const shouldAutoInit = (
      gateway && 
      isConfigured() && 
      !gatewayLoading && 
      !isInitialized && 
      !loading && 
      !error &&
      initializationAttempts < maxInitializationAttempts
    );
    
    if (shouldAutoInit) {
      console.log('🚀 Auto-inicializando MercadoPago...');
      initializeMercadoPago();
    }
  }, [
    gateway?.id, 
    gateway?.credentials, 
    gateway?.is_active,
    isConfigured, 
    gatewayLoading, 
    isInitialized,
    loading,
    error,
    initializationAttempts,
    maxInitializationAttempts,
    initializeMercadoPago
  ]);

  const value: MercadoPagoContextType = {
    isInitialized,
    isConfigured: isConfigured(),
    environment: (gateway?.environment as 'sandbox' | 'production') || 'sandbox',
    publicKey: getPublicKey(),
    accessToken: getAccessToken(),
    mpInstance,
    initializeMercadoPago,
    retryInitialization,
    error: error || gatewayError,
    loading: loading || gatewayLoading,
    gatewayInfo: {
      id: gateway?.id || null,
      name: gateway?.name || null,
      isActive: gateway?.is_active || false
    }
  };

  return (
    <MercadoPagoContext.Provider value={value}>
      {children}
    </MercadoPagoContext.Provider>
  );
};
