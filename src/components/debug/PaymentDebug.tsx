import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, TestTube, CheckCircle, XCircle } from 'lucide-react';

interface PaymentDebugProps {
  environment: 'sandbox' | 'production';
  publicKey: string | null;
  accessToken: string | null;
}

export const PaymentDebug = ({ environment, publicKey, accessToken }: PaymentDebugProps) => {
  const [isTestingPix, setIsTestingPix] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  const validateCredentials = () => {
    if (!publicKey || !accessToken) {
      return { valid: false, message: 'Credenciais não carregadas' };
    }

    const isProductionCreds = publicKey.startsWith('APP_USR-') && accessToken.startsWith('APP_USR-');
    const isSandboxCreds = publicKey.startsWith('TEST-') && accessToken.startsWith('TEST-');

    if (environment === 'production' && isProductionCreds) {
      return { valid: true, message: 'Credenciais de produção válidas' };
    } else if (environment === 'sandbox' && isSandboxCreds) {
      return { valid: true, message: 'Credenciais de sandbox válidas' };
    } else if (environment === 'production' && !isProductionCreds) {
      return { valid: false, message: 'Ambiente em produção mas credenciais não são de produção' };
    } else if (environment === 'sandbox' && !isSandboxCreds) {
      return { valid: false, message: 'Ambiente em sandbox mas credenciais não são de teste' };
    } else {
      return { valid: false, message: 'Credenciais inválidas ou inconsistentes' };
    }
  };

  const testPixPayment = async () => {
    setIsTestingPix(true);
    setTestResult(null);

    try {
      const testData = {
        customerData: {
          nome: 'Teste PIX Debug',
          email: 'teste@debug.com',
          telefone: '11999999999',
          cpf: '12345678901'
        },
        items: [
          {
            id: 'test-product',
            title: 'Produto de Teste PIX',
            quantity: 1,
            unit_price: 1.00
          }
        ],
        totalAmount: 1.00,
        paymentMethod: 'pix',
        environment,
        directCredentials: {
          publicKey: publicKey || '',
          accessToken: accessToken || ''
        }
      };

      console.log('🧪 Testando PIX com dados:', testData);

      const response = await fetch('/api/test-pix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testData)
      });

      const result = await response.json();
      setTestResult(result);

    } catch (error) {
      console.error('❌ Erro no teste PIX:', error);
      setTestResult({
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    } finally {
      setIsTestingPix(false);
    }
  };

  const credentialValidation = validateCredentials();

  return (
    <Card className="bg-gray-800 border-gray-700 mb-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white text-sm">
          💳 Debug de Pagamento
          <Badge variant="outline" className="flex items-center gap-1">
            {environment === 'production' ? '🚀 Produção' : '🧪 Sandbox'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
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
                Validação de Credenciais:
              </p>
              <p className={`text-xs ${
                credentialValidation.valid ? 'text-green-300' : 'text-red-300'
              }`}>
                {credentialValidation.message}
              </p>
            </div>
          </div>
        </div>

        {/* Informações das Credenciais */}
        <div className="space-y-2">
          <h4 className="text-white text-sm font-medium">Credenciais Ativas:</h4>
          <div className="bg-gray-700/50 p-2 rounded text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-400">Ambiente:</span>
              <span className="text-gray-300 capitalize">{environment}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Public Key:</span>
              <span className="text-gray-300 font-mono">
                {publicKey ? publicKey.substring(0, 15) + '...' : 'N/A'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Prefixo Access Token:</span>
              <span className="text-gray-300 font-mono">
                {accessToken ? accessToken.substring(0, 8) + '...' : 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {/* Teste PIX */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-white text-sm font-medium">Teste de PIX:</h4>
            <Button
              size="sm"
              variant="outline"
              onClick={testPixPayment}
              disabled={isTestingPix || !credentialValidation.valid}
              className="border-gray-600"
            >
              <TestTube className={`h-3 w-3 mr-1 ${isTestingPix ? 'animate-spin' : ''}`} />
              {isTestingPix ? 'Testando...' : 'Testar PIX'}
            </Button>
          </div>

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
                    {testResult.success 
                      ? 'PIX criado com sucesso!' 
                      : testResult.error || 'Falha no teste'
                    }
                  </p>
                  {testResult.success && testResult.payment?.qr_code && (
                    <p className="text-xs text-gray-400 mt-1">
                      QR Code: {testResult.payment.qr_code.substring(0, 20)}...
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Alertas */}
        {environment === 'production' && (
          <div className="bg-yellow-900/20 border border-yellow-500/30 p-2 rounded">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-yellow-400 text-sm font-medium">⚠️ Modo Produção</p>
                <p className="text-yellow-300 text-xs">
                  Você está usando credenciais de produção. Pagamentos reais serão processados.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};