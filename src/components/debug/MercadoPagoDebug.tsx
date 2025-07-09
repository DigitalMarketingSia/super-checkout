
import { useMercadoPagoContext } from '@/context/MercadoPagoContext';
import { useMercadoPagoTest } from '@/hooks/useMercadoPagoTest';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, XCircle, RefreshCw, TestTube } from 'lucide-react';
import { EnvironmentDebug } from './EnvironmentDebug';
import { PaymentDebug } from './PaymentDebug';

export const MercadoPagoDebug = () => {
  const {
    isInitialized,
    isConfigured,
    environment,
    publicKey,
    accessToken,
    error,
    loading,
    gatewayInfo,
    retryInitialization
  } = useMercadoPagoContext();

  const { 
    testCredentials, 
    isTestingCredentials, 
    credentialTestResult, 
    clearTestResult 
  } = useMercadoPagoTest();

  const handleTestCredentials = async () => {
    if (!publicKey || !accessToken) {
      console.log('❌ Credenciais não disponíveis para teste');
      return;
    }
    
    clearTestResult();
    await testCredentials(publicKey, accessToken, environment);
  };

  const getStatusIcon = (status: boolean, loading?: boolean) => {
    if (loading) return <AlertCircle className="h-4 w-4 text-yellow-500 animate-spin" />;
    return status ? 
      <CheckCircle className="h-4 w-4 text-green-500" /> : 
      <XCircle className="h-4 w-4 text-red-500" />;
  };

  const getStatusColor = (status: boolean) => {
    return status ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400';
  };

  return (
    <div className="space-y-4">
      <EnvironmentDebug gatewayId={gatewayInfo.id} />
      <PaymentDebug environment={environment} publicKey={publicKey} accessToken={accessToken} />
      
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-white text-sm">
            🐛 Debug MercadoPago Context
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleTestCredentials}
                disabled={loading || isTestingCredentials || !publicKey || !accessToken}
                className="border-gray-600"
              >
                <TestTube className={`h-3 w-3 mr-1 ${isTestingCredentials ? 'animate-spin' : ''}`} />
                Testar
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={retryInitialization}
                disabled={loading}
                className="border-gray-600"
              >
                <RefreshCw className={`h-3 w-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
                Tentar Novamente
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
      <CardContent className="space-y-3">
        {/* Status Geral */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center justify-between">
            <span className="text-gray-300 text-sm">SDK Inicializado:</span>
            <div className="flex items-center gap-2">
              {getStatusIcon(isInitialized, loading)}
              <Badge className={getStatusColor(isInitialized)}>
                {isInitialized ? 'SIM' : 'NÃO'}
              </Badge>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-gray-300 text-sm">Configurado:</span>
            <div className="flex items-center gap-2">
              {getStatusIcon(isConfigured)}
              <Badge className={getStatusColor(isConfigured)}>
                {isConfigured ? 'SIM' : 'NÃO'}
              </Badge>
            </div>
          </div>
        </div>

        {/* Gateway Info */}
        <div className="space-y-2">
          <h4 className="text-white text-sm font-medium">Gateway:</h4>
          <div className="bg-gray-700/50 p-2 rounded text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-400">ID:</span>
              <span className="text-gray-300 font-mono">{gatewayInfo.id || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Nome:</span>
              <span className="text-gray-300">{gatewayInfo.name || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Ativo:</span>
              <Badge className={getStatusColor(gatewayInfo.isActive)}>
                {gatewayInfo.isActive ? 'SIM' : 'NÃO'}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Ambiente:</span>
              <Badge variant="outline">{environment}</Badge>
            </div>
          </div>
        </div>

        {/* Credenciais */}
        <div className="space-y-2">
          <h4 className="text-white text-sm font-medium">Credenciais:</h4>
          <div className="bg-gray-700/50 p-2 rounded text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-400">Public Key:</span>
              <span className="text-gray-300 font-mono">
                {publicKey ? publicKey.substring(0, 15) + '...' : 'N/A'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Access Token:</span>
              <span className="text-gray-300 font-mono">
                {accessToken ? accessToken.substring(0, 15) + '...' : 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {/* Teste de Credenciais */}
        {credentialTestResult && (
          <div className={`p-2 rounded border ${
            credentialTestResult.success 
              ? 'bg-green-900/20 border-green-500/30' 
              : 'bg-red-900/20 border-red-500/30'
          }`}>
            <div className="flex items-start gap-2">
              {credentialTestResult.success ? 
                <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" /> :
                <XCircle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
              }
              <div>
                <p className={`text-sm font-medium ${
                  credentialTestResult.success ? 'text-green-400' : 'text-red-400'
                }`}>
                  Teste de Credenciais:
                </p>
                <p className={`text-xs ${
                  credentialTestResult.success ? 'text-green-300' : 'text-red-300'
                }`}>
                  {credentialTestResult.message}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Erro */}
        {error && (
          <div className="bg-red-900/20 border border-red-500/30 p-2 rounded">
            <div className="flex items-start gap-2">
              <XCircle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-red-400 text-sm font-medium">Erro:</p>
                <p className="text-red-300 text-xs">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="bg-yellow-900/20 border border-yellow-500/30 p-2 rounded">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-400 animate-spin" />
              <p className="text-yellow-400 text-sm">Carregando...</p>
            </div>
          </div>
        )}

        {/* Sucesso */}
        {isInitialized && !error && !loading && (
          <div className="bg-green-900/20 border border-green-500/30 p-2 rounded">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-400" />
              <p className="text-green-400 text-sm">MercadoPago pronto para processar pagamentos!</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
    </div>
  );
};
