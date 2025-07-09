import { useDirectMercadoPago } from '@/hooks/useDirectMercadoPago';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, XCircle, TestTube, Rocket } from 'lucide-react';

interface EnvironmentDebugProps {
  gatewayId: string | null;
}

export const EnvironmentDebug = ({ gatewayId }: EnvironmentDebugProps) => {
  const {
    isReady,
    isInitialized,
    error,
    loading,
    publicKey,
    accessToken
  } = useDirectMercadoPago(gatewayId);

  const getEnvironmentInfo = () => {
    if (!publicKey || !accessToken) {
      return { environment: 'unknown', isValid: false, message: 'Credenciais não carregadas' };
    }

    const isProductionCreds = publicKey.startsWith('APP_USR-') && accessToken.startsWith('APP_USR-');
    const isSandboxCreds = publicKey.startsWith('TEST-') && accessToken.startsWith('TEST-');

    if (isProductionCreds) {
      return { environment: 'production', isValid: true, message: 'Credenciais de produção válidas' };
    } else if (isSandboxCreds) {
      return { environment: 'sandbox', isValid: true, message: 'Credenciais de sandbox válidas' };
    } else {
      return { environment: 'invalid', isValid: false, message: 'Credenciais inválidas ou inconsistentes' };
    }
  };

  const envInfo = getEnvironmentInfo();

  const getStatusIcon = (status: boolean) => {
    return status ? 
      <CheckCircle className="h-4 w-4 text-green-500" /> : 
      <XCircle className="h-4 w-4 text-red-500" />;
  };

  const getEnvironmentIcon = () => {
    switch (envInfo.environment) {
      case 'production':
        return <Rocket className="h-4 w-4 text-green-400" />;
      case 'sandbox':
        return <TestTube className="h-4 w-4 text-orange-400" />;
      default:
        return <AlertCircle className="h-4 w-4 text-red-400" />;
    }
  };

  return (
    <Card className="bg-gray-800 border-gray-700 mb-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white text-sm">
          🌍 Debug de Ambiente
          {getEnvironmentIcon()}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center justify-between">
            <span className="text-gray-300 text-sm">Sistema Pronto:</span>
            <div className="flex items-center gap-2">
              {getStatusIcon(isReady)}
              <Badge className={isReady ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}>
                {isReady ? 'SIM' : 'NÃO'}
              </Badge>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-gray-300 text-sm">Ambiente:</span>
            <div className="flex items-center gap-2">
              {getEnvironmentIcon()}
              <Badge variant="outline" className="capitalize">
                {envInfo.environment}
              </Badge>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="text-white text-sm font-medium">Análise de Credenciais:</h4>
          <div className={`p-2 rounded border ${
            envInfo.isValid 
              ? 'bg-green-900/20 border-green-500/30' 
              : 'bg-red-900/20 border-red-500/30'
          }`}>
            <div className="flex items-start gap-2">
              {envInfo.isValid ? 
                <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" /> :
                <XCircle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
              }
              <div>
                <p className={`text-sm font-medium ${
                  envInfo.isValid ? 'text-green-400' : 'text-red-400'
                }`}>
                  {envInfo.message}
                </p>
                {publicKey && accessToken && (
                  <div className="mt-1 space-y-1">
                    <p className="text-xs text-gray-400">
                      Public Key: {publicKey.substring(0, 15)}...
                    </p>
                    <p className="text-xs text-gray-400">
                      Access Token: {accessToken.substring(0, 15)}...
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

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

        {loading && (
          <div className="bg-yellow-900/20 border border-yellow-500/30 p-2 rounded">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-400 animate-spin" />
              <p className="text-yellow-400 text-sm">Carregando configurações...</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};