
import { useCallback, useState } from 'react';

interface UseMercadoPagoReactProps {
  credentials: {
    publicKeyProd?: string;
    accessTokenProd?: string;
    publicKeySandbox?: string;
    accessTokenSandbox?: string;
    // Legacy fields for backward compatibility
    publicKey?: string;
    accessToken?: string;
  };
  environment: 'sandbox' | 'production';
}

export const useMercadoPagoReact = ({ credentials, environment }: UseMercadoPagoReactProps) => {
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);
  const [mpInstance, setMpInstance] = useState<any>(null);
  const [initializationAttempts, setInitializationAttempts] = useState(0);
  const maxRetries = 3;

  const getPublicKey = useCallback(() => {
    console.log('🔍 Buscando public key para ambiente:', environment);
    console.log('📋 Credenciais disponíveis:', Object.keys(credentials));

    let publicKey: string | null = null;

    if (environment === 'production') {
      publicKey = credentials.publicKeyProd || credentials.publicKey || null;
    } else {
      publicKey = credentials.publicKeySandbox || credentials.publicKey || null;
    }

    console.log('🔑 Public key encontrada:', publicKey ? publicKey.substring(0, 20) + '...' : 'Não encontrada');
    return publicKey;
  }, [credentials, environment]);

  const getAccessToken = useCallback(() => {
    console.log('🔍 Buscando access token para ambiente:', environment);
    
    let accessToken: string | null = null;

    if (environment === 'production') {
      accessToken = credentials.accessTokenProd || credentials.accessToken || null;
    } else {
      accessToken = credentials.accessTokenSandbox || credentials.accessToken || null;
    }

    console.log('🎫 Access token encontrado:', accessToken ? accessToken.substring(0, 20) + '...' : 'Não encontrado');
    return accessToken;
  }, [credentials, environment]);

  const isConfigured = useCallback(() => {
    const publicKey = getPublicKey();
    const accessToken = getAccessToken();
    const configured = !!(publicKey && accessToken);
    
    console.log('⚙️ Gateway configurado:', configured, {
      hasPublicKey: !!publicKey,
      hasAccessToken: !!accessToken,
      environment
    });
    
    return configured;
  }, [getPublicKey, getAccessToken, environment]);

  const loadMercadoPagoSDK = useCallback(() => {
    return new Promise<void>((resolve, reject) => {
      // Verificar se SDK já está carregado
      if (window.MercadoPago) {
        console.log('✅ SDK MercadoPago já estava carregado');
        setIsSDKLoaded(true);
        resolve();
        return;
      }

      // Verificar se já existe um script sendo carregado
      const existingScript = document.querySelector('script[src="https://sdk.mercadopago.com/js/v2"]');
      if (existingScript) {
        console.log('🔄 Script MercadoPago já está sendo carregado, aguardando...');
        
        const checkSDK = setInterval(() => {
          if (window.MercadoPago) {
            console.log('✅ SDK MercadoPago carregado via script existente');
            clearInterval(checkSDK);
            setIsSDKLoaded(true);
            resolve();
          }
        }, 100);

        // Timeout após 10 segundos
        setTimeout(() => {
          clearInterval(checkSDK);
          reject(new Error('Timeout ao aguardar SDK do MercadoPago'));
        }, 10000);
        
        return;
      }

      console.log('🔄 Carregando SDK MercadoPago...');
      const script = document.createElement('script');
      script.src = 'https://sdk.mercadopago.com/js/v2';
      script.async = true;
      
      script.onload = () => {
        console.log('✅ SDK MercadoPago carregado com sucesso');
        setIsSDKLoaded(true);
        resolve();
      };
      
      script.onerror = (error) => {
        console.error('❌ Erro ao carregar SDK MercadoPago:', error);
        reject(new Error('Falha ao carregar SDK do MercadoPago'));
      };
      
      document.head.appendChild(script);
    });
  }, []);

  const initializeMercadoPago = useCallback(async () => {
    if (!isConfigured()) {
      const error = 'Credenciais do MercadoPago não configuradas para o ambiente ' + environment;
      console.error('❌', error);
      throw new Error(error);
    }

    const publicKey = getPublicKey();
    if (!publicKey) {
      const error = 'Public Key não encontrada para ambiente ' + environment;
      console.error('❌', error);
      throw new Error(error);
    }

    // Implementar retry logic
    const attemptInitialization = async (attempt: number): Promise<void> => {
      try {
        console.log(`🔄 Tentativa ${attempt}/${maxRetries} - Inicializando MercadoPago...`);
        
        // Carregar SDK se necessário
        await loadMercadoPagoSDK();

        // Aguardar um pouco para garantir que o SDK está disponível
        await new Promise(resolve => setTimeout(resolve, 100));

        if (!window.MercadoPago) {
          throw new Error('SDK MercadoPago não está disponível após carregamento');
        }

        // Inicializar com a public key
        console.log('🔑 Inicializando MP com public key:', publicKey.substring(0, 20) + '...');
        console.log('🌍 Ambiente:', environment);
        
        // Verificar se estamos no client side
        if (typeof window === 'undefined') {
          throw new Error('MercadoPago SDK só pode ser inicializado no client side');
        }
        
        const mp = new window.MercadoPago(publicKey, {
          locale: 'pt-BR'
        });
        
        console.log('✅ MercadoPago inicializado com sucesso');
        console.log('🔧 Instância MP criada:', typeof mp);
        console.log('🔧 Métodos disponíveis:', Object.getOwnPropertyNames(mp));
        
        setMpInstance(mp);
        setIsSDKLoaded(true);
        setInitializationAttempts(0);
        
      } catch (error) {
        console.error(`❌ Tentativa ${attempt} falhou:`, error);
        
        if (attempt < maxRetries) {
          const delay = attempt * 1000; // Delay progressivo
          console.log(`⏳ Aguardando ${delay}ms antes da próxima tentativa...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          return attemptInitialization(attempt + 1);
        } else {
          setInitializationAttempts(attempt);
          setIsSDKLoaded(false);
          throw new Error(`Falha ao inicializar MercadoPago após ${maxRetries} tentativas: ${error}`);
        }
      }
    };

    return attemptInitialization(1);
  }, [isConfigured, getPublicKey, loadMercadoPagoSDK, environment, maxRetries]);

  return {
    initializeMercadoPago,
    getPublicKey,
    getAccessToken,
    isConfigured,
    isSDKLoaded,
    initializationAttempts,
    mpInstance
  };
};
