import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useMercadoPagoTest = () => {
  const [isTestingCredentials, setIsTestingCredentials] = useState(false);
  const [credentialTestResult, setCredentialTestResult] = useState<{
    success: boolean;
    message: string;
    environment?: string;
  } | null>(null);

  const testCredentials = useCallback(async (publicKey: string, accessToken: string, environment: 'sandbox' | 'production') => {
    setIsTestingCredentials(true);
    setCredentialTestResult(null);

    try {
      console.log('🧪 Testando credenciais:', { environment, publicKeyPrefix: publicKey.substring(0, 15) });

      const { data, error } = await supabase.functions.invoke('test-mp-credentials', {
        body: {
          publicKey,
          accessToken,
          environment
        }
      });

      if (error) {
        console.error('❌ Erro ao testar credenciais:', error);
        setCredentialTestResult({
          success: false,
          message: error.message || 'Erro ao testar credenciais'
        });
        return false;
      }

      console.log('✅ Resultado do teste:', data);
      
      if (data.success) {
        setCredentialTestResult({
          success: true,
          message: data.message,
          environment: data.environment
        });
        return true;
      } else {
        setCredentialTestResult({
          success: false,
          message: data.error || 'Credenciais inválidas'
        });
        return false;
      }
    } catch (error) {
      console.error('❌ Erro na função de teste:', error);
      setCredentialTestResult({
        success: false,
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
      return false;
    } finally {
      setIsTestingCredentials(false);
    }
  }, []);

  const clearTestResult = useCallback(() => {
    setCredentialTestResult(null);
  }, []);

  return {
    testCredentials,
    isTestingCredentials,
    credentialTestResult,
    clearTestResult
  };
};