
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

  console.log('🏦 MercadoPagoProvider:', {
    gatewayId,
    hasGateway: !!gateway,
    gatewayName: gateway?.name,
    environment: gateway?.environment,
    isActive: gateway?.is_active
  });

  const {
    initializeMercadoPago: initSDK,
    getAccessToken,
    getPublicKey,
    isConfigured,
    mpInstance
  } = useMercadoPagoReact({
    credentials: gateway?.credentials || {},
    environment: (gateway?.environment as 'sandbox' | 'production') || 'sandbox'
  });

  // Validar credenciais com verificação de formato
  const validateCredentials = useCallback(() => {
    if (!gateway) return false;

    const credentials = gateway.credentials;
    const environment = gateway.environment || 'sandbox';

    console.log('🔍 Validando credenciais:', {
      environment,
      hasCredentials: !!credentials,
      credentialKeys: credentials ? Object.keys(credentials) : []
    });

    if (environment === 'production') {
      const hasValidProd = credentials.publicKeyProd?.startsWith('APP_USR-') && 
                          credentials.accessTokenProd?.startsWith('APP_USR-');
      
      if (!hasValidProd) {
        console.error('❌ Credenciais de produção inválidas ou ausentes');
        return false;
      }
      
      console.log('✅ Credenciais de produção válidas');
      return true;
    } else {
      const hasValidSandbox = credentials.publicKeySandbox?.startsWith('TEST-') && 
                             credentials.accessTokenSandbox?.startsWith('TEST-');
      
      // Fallback para credenciais legacy
      const hasLegacyValid = credentials.publicKey?.startsWith('TEST-') && 
                            credentials.accessToken?.startsWith('TEST-');
      
      if (!hasValidSandbox && !hasLegacyValid) {
        console.error('❌ Credenciais de sandbox inválidas ou ausentes');
        return false;
      }
      
      console.log('✅ Credenciais de sandbox válidas');
      return true;
    }
  }, [gateway]);

  const initializeMercadoPago = useCallback(async () => {
    if (loading || gatewayLoading) {
      console.log('⏳ Inicialização já em andamento...');
      return;
    }

    if (!gateway) {
      console.log('⚠️ Nenhum gateway disponível');
      setError('Gateway não configurado');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      console.log('🔄 Iniciando validação e inicialização...');
      
      if (!validateCredentials()) {
        throw new Error('Credenciais inválidas para o ambiente configurado');
      }

      console.log('✅ Credenciais validadas, inicializando SDK...');
      await initSDK();
      
      // Aguardar estabilização
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setIsInitialized(true);
      console.log('✅ MercadoPago inicializado com sucesso!');
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      console.error('❌ Erro na inicialização:', errorMessage);
      setError(errorMessage);
      setIsInitialized(false);
    } finally {
      setLoading(false);
    }
  }, [loading, gatewayLoading, gateway, validateCredentials, initSDK]);

  const retryInitialization = useCallback(async () => {
    console.log('🔄 Retry manual da inicialização...');
    setIsInitialized(false);
    setError(null);
    
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

  // Auto-inicializar quando gateway estiver pronto
  useEffect(() => {
    if (gateway && !gatewayLoading && !isInitialized && !loading && !error) {
      console.log('🚀 Auto-inicializando MercadoPago...');
      initializeMercadoPago();
    }
  }, [gateway?.id, gatewayLoading, isInitialized, loading, error, initializeMercadoPago]);

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
