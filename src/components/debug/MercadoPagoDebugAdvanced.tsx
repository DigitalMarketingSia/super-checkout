
import { useState } from 'react';
import { useMercadoPagoContext } from '@/context/MercadoPagoContext';
import { usePublicGateway } from '@/hooks/usePublicGateway';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, EyeOff, RefreshCw, CheckCircle, XCircle, AlertCircle, Settings } from 'lucide-react';

interface MercadoPagoDebugAdvancedProps {
  gatewayId?: string | null;
}

export const MercadoPagoDebugAdvanced = ({ gatewayId }: MercadoPagoDebugAdvancedProps) => {
  const [showCredentials, setShowCredentials] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  
  const mpContext = useMercadoPagoContext();
  const { gateway, loading: gatewayLoading, error: gatewayError, retry } = usePublicGateway(gatewayId);

  const getStatusIcon = (status: boolean | undefined) => {
    if (status === undefined) return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    return status ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />;
  };

  const getStatusColor = (status: boolean | undefined) => {
    if (status === undefined) return 'secondary';
    return status ? 'default' : 'destructive';
  };

  const validateCredentialFormat = (key: string, environment: 'sandbox' | 'production') => {
    if (!key) return false;
    
    if (environment === 'production') {
      return key.startsWith('APP_USR-');
    } else {
      return key.startsWith('TEST-');
    }
  };

  const renderCredentialStatus = () => {
    if (!gateway?.credentials) return null;

    const creds = gateway.credentials;
    const env = gateway.environment || 'sandbox';

    return (
      <div className="space-y-2">
        <h4 className="font-semibold text-sm">Status das Credenciais ({env})</h4>
        
        {env === 'production' ? (
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs">
              {getStatusIcon(validateCredentialFormat(creds.publicKeyProd, 'production'))}
              <span>Public Key Prod: {creds.publicKeyProd ? (showCredentials ? creds.publicKeyProd : creds.publicKeyProd.substring(0, 15) + '...') : 'Não configurada'}</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              {getStatusIcon(validateCredentialFormat(creds.accessTokenProd, 'production'))}
              <span>Access Token Prod: {creds.accessTokenProd ? (showCredentials ? creds.accessTokenProd : creds.accessTokenProd.substring(0, 15) + '...') : 'Não configurado'}</span>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs">
              {getStatusIcon(validateCredentialFormat(creds.publicKeySandbox || creds.publicKey, 'sandbox'))}
              <span>Public Key Sandbox: {(creds.publicKeySandbox || creds.publicKey) ? (showCredentials ? (creds.publicKeySandbox || creds.publicKey) : (creds.publicKeySandbox || creds.publicKey).substring(0, 15) + '...') : 'Não configurada'}</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              {getStatusIcon(validateCredentialFormat(creds.accessTokenSandbox || creds.accessToken, 'sandbox'))}
              <span>Access Token Sandbox: {(creds.accessTokenSandbox || creds.accessToken) ? (showCredentials ? (creds.accessTokenSandbox || creds.accessToken) : (creds.accessTokenSandbox || creds.accessToken).substring(0, 15) + '...') : 'Não configurado'}</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (!isExpanded) {
    return (
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm text-white flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Debug MercadoPago Avançado
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExpanded(true)}
              className="text-xs"
            >
              Expandir
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex gap-2">
            <Badge variant={getStatusColor(mpContext.isInitialized)}>
              {mpContext.isInitialized ? 'Inicializado' : 'Não Inicializado'}
            </Badge>
            <Badge variant={getStatusColor(!!gateway)}>
              {gateway ? 'Gateway OK' : 'Gateway Erro'}
            </Badge>
            <Badge variant={getStatusColor(mpContext.isConfigured)}>
              {mpContext.isConfigured ? 'Configurado' : 'Não Configurado'}
            </Badge>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-900 border-gray-700">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm text-white flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Debug MercadoPago Avançado
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCredentials(!showCredentials)}
              className="text-xs"
            >
              {showCredentials ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExpanded(false)}
              className="text-xs"
            >
              Minimizar
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Status Geral */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <h4 className="font-semibold text-sm text-white">Status do Contexto</h4>
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-2">
                {getStatusIcon(mpContext.isInitialized)}
                <span className="text-gray-300">Inicializado: {mpContext.isInitialized ? 'Sim' : 'Não'}</span>
              </div>
              <div className="flex items-center gap-2">
                {getStatusIcon(mpContext.isConfigured)}
                <span className="text-gray-300">Configurado: {mpContext.isConfigured ? 'Sim' : 'Não'}</span>
              </div>
              <div className="flex items-center gap-2">
                {getStatusIcon(!!mpContext.mpInstance)}
                <span className="text-gray-300">Instância MP: {mpContext.mpInstance ? 'Ativa' : 'Inativa'}</span>
              </div>
              <div className="flex items-center gap-2">
                {getStatusIcon(!mpContext.loading)}
                <span className="text-gray-300">Carregando: {mpContext.loading ? 'Sim' : 'Não'}</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold text-sm text-white">Status do Gateway</h4>
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-2">
                {getStatusIcon(!!gateway)}
                <span className="text-gray-300">Gateway: {gateway ? 'Carregado' : 'Não Carregado'}</span>
              </div>
              <div className="flex items-center gap-2">
                {getStatusIcon(gateway?.is_active)}
                <span className="text-gray-300">Ativo: {gateway?.is_active ? 'Sim' : 'Não'}</span>
              </div>
              <div className="flex items-center gap-2">
                {getStatusIcon(!gatewayLoading)}
                <span className="text-gray-300">Carregando: {gatewayLoading ? 'Sim' : 'Não'}</span>
              </div>
              <div className="flex items-center gap-2">
                {getStatusIcon(!gatewayError)}
                <span className="text-gray-300">Erro: {gatewayError ? 'Sim' : 'Não'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Informações do Gateway */}
        {gateway && (
          <div className="space-y-2">
            <h4 className="font-semibold text-sm text-white">Informações do Gateway</h4>
            <div className="bg-gray-800 p-3 rounded text-xs space-y-1">
              <div><strong>ID:</strong> {gateway.id}</div>
              <div><strong>Nome:</strong> {gateway.name}</div>
              <div><strong>Tipo:</strong> {gateway.type}</div>
              <div><strong>Ambiente:</strong> <Badge variant={gateway.environment === 'production' ? 'default' : 'secondary'}>{gateway.environment}</Badge></div>
            </div>
          </div>
        )}

        {/* Status das Credenciais */}
        {gateway && renderCredentialStatus()}

        {/* Tokens Atuais */}
        <div className="space-y-2">
          <h4 className="font-semibold text-sm text-white">Tokens em Uso</h4>
          <div className="bg-gray-800 p-3 rounded text-xs space-y-1">
            <div><strong>Public Key:</strong> {mpContext.publicKey ? (showCredentials ? mpContext.publicKey : mpContext.publicKey.substring(0, 20) + '...') : 'Não disponível'}</div>
            <div><strong>Access Token:</strong> {mpContext.accessToken ? (showCredentials ? mpContext.accessToken : mpContext.accessToken.substring(0, 20) + '...') : 'Não disponível'}</div>
            <div><strong>Ambiente:</strong> <Badge variant={mpContext.environment === 'production' ? 'default' : 'secondary'}>{mpContext.environment}</Badge></div>
          </div>
        </div>

        {/* Erros */}
        {(mpContext.error || gatewayError) && (
          <div className="space-y-2">
            <h4 className="font-semibold text-sm text-white">Erros</h4>
            <div className="bg-red-900/20 border border-red-500/30 p-3 rounded text-xs">
              {mpContext.error && <div><strong>Contexto:</strong> {mpContext.error}</div>}
              {gatewayError && <div><strong>Gateway:</strong> {gatewayError}</div>}
            </div>
          </div>
        )}

        {/* Ações */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => mpContext.retryInitialization()}
            disabled={mpContext.loading}
            className="text-xs"
          >
            <RefreshCw className={`h-3 w-3 mr-1 ${mpContext.loading ? 'animate-spin' : ''}`} />
            Reinicializar MP
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={retry}
            disabled={gatewayLoading}
            className="text-xs"
          >
            <RefreshCw className={`h-3 w-3 mr-1 ${gatewayLoading ? 'animate-spin' : ''}`} />
            Recarregar Gateway
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
