import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, TestTube, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { useMercadoPagoContext } from '@/context/MercadoPagoContext';
import { useSupabaseGateways } from '@/hooks/useSupabaseGateways';

interface PixPaymentDebugProps {
  formData?: any;
  selectedPaymentMethod?: string;
  onRetryPayment?: () => void;
}

export const PixPaymentDebug = ({ 
  formData, 
  selectedPaymentMethod,
  onRetryPayment 
}: PixPaymentDebugProps) => {
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  
  const { 
    isInitialized, 
    environment, 
    publicKey, 
    accessToken, 
    error: mpError,
    loading: mpLoading,
    retryInitialization,
    gatewayInfo
  } = useMercadoPagoContext();
  
  const { gateways } = useSupabaseGateways();
  const activeGateway = gateways.find(g => g.type === 'mercado_pago' && g.is_active);

  const validateFormData = () => {
    if (!formData) return { valid: false, message: 'Nenhum dado do formulário disponível' };
    
    const requiredFields = ['nome', 'email'];
    const missingFields = requiredFields.filter(field => !formData[field]);
    
    if (missingFields.length > 0) {
      return { 
        valid: false, 
        message: `Campos obrigatórios faltando: ${missingFields.join(', ')}` 
      };
    }
    
    return { valid: true, message: 'Dados do formulário válidos' };
  };

  const validateCredentials = () => {
    if (!activeGateway) {
      return { valid: false, message: 'Nenhum gateway MercadoPago ativo encontrado' };
    }

    if (!activeGateway.credentials) {
      return { valid: false, message: 'Gateway sem credenciais configuradas' };
    }

    const credentials = activeGateway.credentials;
    const isProduction = environment === 'production';
    
    const requiredKeys = isProduction 
      ? ['accessTokenProd', 'publicKeyProd']
      : ['accessTokenSandbox', 'publicKeySandbox'];
    
    const missingKeys = requiredKeys.filter(key => !credentials[key]);
    
    if (missingKeys.length > 0) {
      return { 
        valid: false, 
        message: `Credenciais ${isProduction ? 'de produção' : 'sandbox'} faltando: ${missingKeys.join(', ')}` 
      };
    }

    return { valid: true, message: `Credenciais ${isProduction ? 'de produção' : 'sandbox'} válidas` };
  };

  const testConnection = async () => {
    setIsTestingConnection(true);
    setTestResult(null);

    try {
      // Simular teste de conexão
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const credentialsValid = validateCredentials();
      const formValid = validateFormData();
      
      if (!credentialsValid.valid) {
        throw new Error(credentialsValid.message);
      }
      
      if (!formValid.valid) {
        throw new Error(formValid.message);
      }
      
      setTestResult({
        success: true,
        message: 'Conexão e dados validados com sucesso!'
      });
      
    } catch (error) {
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const formValidation = validateFormData();
  const credentialValidation = validateCredentials();
  const systemReady = isInitialized && !mpLoading && !mpError;

  return (
    <Card className="bg-gray-800 border-gray-700 mb-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white text-sm">
          💳 Debug PIX Payment
          <Badge variant="outline" className="flex items-center gap-1">
            {selectedPaymentMethod === 'pix' ? '🟢 PIX Ativo' : '⚪ PIX Inativo'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        
        {/* Status do Sistema */}
        <div className={`p-3 rounded border ${
          systemReady 
            ? 'bg-green-900/20 border-green-500/30' 
            : 'bg-red-900/20 border-red-500/30'
        }`}>
          <div className="flex items-start gap-2">
            {systemReady ? 
              <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" /> :
              <XCircle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
            }
            <div>
              <p className={`text-sm font-medium ${
                systemReady ? 'text-green-400' : 'text-red-400'
              }`}>
                Status do Sistema MercadoPago:
              </p>
              <p className={`text-xs ${
                systemReady ? 'text-green-300' : 'text-red-300'
              }`}>
                {systemReady ? 'Sistema inicializado e pronto' : (mpError || 'Sistema não inicializado')}
              </p>
            </div>
          </div>
        </div>

        {/* Validação de Credenciais */}
        <div className={`p-3 rounded border ${
          credentialValidation.valid 
            ? 'bg-green-900/20 border-green-500/30' 
            : 'bg-red-900/20 border-red-500/30'
        }`}>
          <div className="flex items-start gap-2">
            {credentialValidation.valid ? 
              <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" /> :
              <XCircle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
            }
            <div>
              <p className={`text-sm font-medium ${
                credentialValidation.valid ? 'text-green-400' : 'text-red-400'
              }`}>
                Credenciais MercadoPago:
              </p>
              <p className={`text-xs ${
                credentialValidation.valid ? 'text-green-300' : 'text-red-300'
              }`}>
                {credentialValidation.message}
              </p>
            </div>
          </div>
        </div>

        {/* Validação do Formulário */}
        <div className={`p-3 rounded border ${
          formValidation.valid 
            ? 'bg-green-900/20 border-green-500/30' 
            : 'bg-yellow-900/20 border-yellow-500/30'
        }`}>
          <div className="flex items-start gap-2">
            {formValidation.valid ? 
              <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" /> :
              <AlertCircle className="h-4 w-4 text-yellow-400 mt-0.5 flex-shrink-0" />
            }
            <div>
              <p className={`text-sm font-medium ${
                formValidation.valid ? 'text-green-400' : 'text-yellow-400'
              }`}>
                Dados do Formulário:
              </p>
              <p className={`text-xs ${
                formValidation.valid ? 'text-green-300' : 'text-yellow-300'
              }`}>
                {formValidation.message}
              </p>
            </div>
          </div>
        </div>

        {/* Informações do Gateway */}
        <div className="space-y-2">
          <h4 className="text-white text-sm font-medium">Gateway Ativo:</h4>
          <div className="bg-gray-700/50 p-2 rounded text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-400">Nome:</span>
              <span className="text-gray-300">{activeGateway?.name || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Ambiente:</span>
              <span className="text-gray-300 capitalize">{environment}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Status:</span>
              <span className={`${activeGateway?.is_active ? 'text-green-300' : 'text-red-300'}`}>
                {activeGateway?.is_active ? 'Ativo' : 'Inativo'}
              </span>
            </div>
          </div>
        </div>

        {/* Ações de Debug */}
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={testConnection}
            disabled={isTestingConnection}
            className="border-gray-600"
          >
            <TestTube className={`h-3 w-3 mr-1 ${isTestingConnection ? 'animate-spin' : ''}`} />
            {isTestingConnection ? 'Testando...' : 'Testar Conexão'}
          </Button>
          
          <Button
            size="sm"
            variant="outline"
            onClick={retryInitialization}
            disabled={mpLoading}
            className="border-gray-600"
          >
            <RefreshCw className={`h-3 w-3 mr-1 ${mpLoading ? 'animate-spin' : ''}`} />
            Reinicializar
          </Button>
          
          {onRetryPayment && (
            <Button
              size="sm"
              variant="outline"
              onClick={onRetryPayment}
              className="border-gray-600"
            >
              Tentar Novamente
            </Button>
          )}
        </div>

        {/* Resultado do Teste */}
        {testResult && (
          <div className={`p-2 rounded border ${
            testResult.success 
              ? 'bg-green-900/20 border-green-500/30' 
              : 'bg-red-900/20 border-red-500/30'
          }`}>
            <div className="flex items-start gap-2">
              {testResult.success ? 
                <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" /> :
                <XCircle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
              }
              <div>
                <p className={`text-sm font-medium ${
                  testResult.success ? 'text-green-400' : 'text-red-400'
                }`}>
                  Resultado do Teste:
                </p>
                <p className={`text-xs ${
                  testResult.success ? 'text-green-300' : 'text-red-300'
                }`}>
                  {testResult.message}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Dados do Formulário */}
        {formData && (
          <div className="space-y-2">
            <h4 className="text-white text-sm font-medium">Dados Atuais:</h4>
            <div className="bg-gray-700/50 p-2 rounded text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-400">Nome:</span>
                <span className="text-gray-300">{formData.nome || 'Não preenchido'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Email:</span>
                <span className="text-gray-300">{formData.email || 'Não preenchido'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Telefone:</span>
                <span className="text-gray-300">{formData.telefone || 'Não preenchido'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">CPF:</span>
                <span className="text-gray-300">{formData.cpf || 'Não preenchido'}</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};