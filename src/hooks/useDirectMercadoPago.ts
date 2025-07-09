
import { useState, useEffect, useCallback } from 'react';

interface DirectMercadoPagoHook {
  isReady: boolean;
  isInitialized: boolean;
  error: string | null;
  loading: boolean;
  mpInstance: any;
  publicKey: string | null;
  accessToken: string | null;
  retryInitialization: () => void;
}

export const useDirectMercadoPago = (gatewayId: string | null): DirectMercadoPagoHook => {
  const [isReady, setIsReady] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mpInstance, setMpInstance] = useState<any>(null);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const FALLBACK_CREDENTIALS = {
    publicKey: 'TEST-128ed321-c483-4220-b857-275935dd8498',
    accessToken: 'TEST-3388903873791416-070505-d2bd52e12df128675573159519eb7aaf-337331937'
  };

  const detectEnvironment = useCallback((publicKey: string, accessToken: string) => {
    const isProductionPub = publicKey?.startsWith('APP_USR-');
    const isProductionAcc = accessToken?.startsWith('APP_USR-');
    const isSandboxPub = publicKey?.startsWith('TEST-');
    const isSandboxAcc = accessToken?.startsWith('TEST-');
    
    if (isProductionPub && isProductionAcc) return 'production';
    if (isSandboxPub && isSandboxAcc) return 'sandbox';
    
    console.warn('⚠️ Credenciais inconsistentes, usando sandbox como fallback');
    return 'sandbox';
  }, []);

  const loadCredentials = useCallback(async () => {
    console.log('🔄 Carregando credenciais...', { gatewayId });
    
    if (!gatewayId) {
      console.log('ℹ️ Sem gatewayId, usando credenciais fallback');
      setPublicKey(FALLBACK_CREDENTIALS.publicKey);
      setAccessToken(FALLBACK_CREDENTIALS.accessToken);
      return {
        ...FALLBACK_CREDENTIALS,
        environment: 'sandbox'
      };
    }
    
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const { data, error } = await supabase
        .from('gateways')
        .select('*')
        .eq('id', gatewayId)
        .eq('type', 'mercado_pago')
        .eq('is_active', true)
        .single();

      if (error || !data) {
        console.warn('⚠️ Gateway não encontrado, usando fallback:', error?.message);
        setPublicKey(FALLBACK_CREDENTIALS.publicKey);
        setAccessToken(FALLBACK_CREDENTIALS.accessToken);
        return {
          ...FALLBACK_CREDENTIALS,
          environment: 'sandbox'
        };
      }

      const creds = data.credentials as any;
      const gatewayEnvironment = data.environment || 'sandbox';
      
      console.log('📋 Gateway encontrado:', {
        name: data.name,
        environment: gatewayEnvironment,
        hasCredentials: !!creds
      });

      let pubKey, accessTkn;

      if (gatewayEnvironment === 'production') {
        pubKey = creds?.publicKeyProd || creds?.publicKey;
        accessTkn = creds?.accessTokenProd || creds?.accessToken;
        
        if (!pubKey || !accessTkn || 
            !pubKey.startsWith('APP_USR-') || 
            !accessTkn.startsWith('APP_USR-')) {
          console.error('❌ Credenciais de produção inválidas');
          throw new Error('Credenciais de produção não configuradas adequadamente');
        }
      } else {
        pubKey = creds?.publicKeySandbox || creds?.publicKey || FALLBACK_CREDENTIALS.publicKey;
        accessTkn = creds?.accessTokenSandbox || creds?.accessToken || FALLBACK_CREDENTIALS.accessToken;
      }

      const detectedEnvironment = detectEnvironment(pubKey, accessTkn);
      
      console.log('✅ Credenciais carregadas:', {
        environment: detectedEnvironment,
        publicKeyType: pubKey.substring(0, 8),
        accessTokenType: accessTkn.substring(0, 8)
      });
      
      setPublicKey(pubKey);
      setAccessToken(accessTkn);
      
      return { 
        publicKey: pubKey, 
        accessToken: accessTkn,
        environment: detectedEnvironment 
      };
      
    } catch (err) {
      console.error('❌ Erro ao carregar credenciais:', err);
      setPublicKey(FALLBACK_CREDENTIALS.publicKey);
      setAccessToken(FALLBACK_CREDENTIALS.accessToken);
      return {
        ...FALLBACK_CREDENTIALS,
        environment: 'sandbox'
      };
    }
  }, [gatewayId, detectEnvironment]);

  const loadMercadoPagoSDK = useCallback((): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (window.MercadoPago) {
        resolve();
        return;
      }

      const existingScript = document.querySelector('script[src="https://sdk.mercadopago.com/js/v2"]');
      if (existingScript) {
        const checkInterval = setInterval(() => {
          if (window.MercadoPago) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 100);

        setTimeout(() => {
          clearInterval(checkInterval);
          reject(new Error('Timeout ao aguardar SDK'));
        }, 10000);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://sdk.mercadopago.com/js/v2';
      script.async = true;
      
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Falha ao carregar SDK'));
      
      document.head.appendChild(script);
    });
  }, []);

  const initializeMercadoPago = useCallback(async () => {
    if (isInitialized) {
      console.log('✅ Já inicializado');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('🚀 Iniciando inicialização...');
      
      const credentials = await loadCredentials();
      console.log('✅ Credenciais obtidas');

      await loadMercadoPagoSDK();
      console.log('✅ SDK carregado');

      if (!window.MercadoPago) {
        throw new Error('SDK não disponível');
      }

      const mp = new window.MercadoPago(credentials.publicKey, {
        locale: 'pt-BR'
      });

      setMpInstance(mp);
      setIsInitialized(true);
      setIsReady(true);
      
      console.log('✅ MercadoPago inicializado com sucesso!');

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro desconhecido';
      console.error('❌ Erro na inicialização:', errorMsg);
      setError(errorMsg);
      setIsReady(false);
      setIsInitialized(false);
    } finally {
      setLoading(false);
    }
  }, [isInitialized, loadCredentials, loadMercadoPagoSDK]);

  const retryInitialization = useCallback(() => {
    console.log('🔄 Retry manual...');
    setIsInitialized(false);
    setIsReady(false);
    setError(null);
    setMpInstance(null);
    initializeMercadoPago();
  }, [initializeMercadoPago]);

  // Auto-inicializar
  useEffect(() => {
    if (!isInitialized && !loading && !error) {
      console.log('🚀 Auto-inicializando...');
      initializeMercadoPago();
    }
  }, [isInitialized, loading, error, initializeMercadoPago]);

  return {
    isReady,
    isInitialized,
    error,
    loading,
    mpInstance,
    publicKey,
    accessToken,
    retryInitialization
  };
};
