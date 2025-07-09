import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { useSupabaseGateways } from '@/hooks/useSupabaseGateways';

interface GatewayDebugProps {
  selectedGatewayId?: string | null;
}

export const GatewayDebug = ({ selectedGatewayId }: GatewayDebugProps) => {
  const { gateways, loading, error, refetch } = useSupabaseGateways();

  const selectedGateway = selectedGatewayId ? 
    gateways.find(g => g.id === selectedGatewayId) : null;

  const getStatusIcon = (status: boolean) => {
    return status ? 
      <CheckCircle className="h-4 w-4 text-green-500" /> : 
      <XCircle className="h-4 w-4 text-red-500" />;
  };

  const getStatusColor = (status: boolean) => {
    return status ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400';
  };

  const validateCredentials = (gateway: any) => {
    if (!gateway?.credentials) return { valid: false, message: 'Sem credenciais' };
    
    const creds = gateway.credentials;
    const env = gateway.environment || 'sandbox';
    
    if (env === 'production') {
      const hasProdCreds = creds.publicKeyProd && creds.accessTokenProd;
      const isValidProd = creds.publicKeyProd?.startsWith('APP_USR-') && 
                         creds.accessTokenProd?.startsWith('APP_USR-');
      
      if (!hasProdCreds) return { valid: false, message: 'Credenciais de produção não configuradas' };
      if (!isValidProd) return { valid: false, message: 'Credenciais de produção inválidas' };
      
      return { valid: true, message: 'Credenciais de produção válidas' };
    } else {
      const hasSandboxCreds = creds.publicKeySandbox && creds.accessTokenSandbox;
      const isValidSandbox = creds.publicKeySandbox?.startsWith('TEST-') && 
                            creds.accessTokenSandbox?.startsWith('TEST-');
      
      if (!hasSandboxCreds) return { valid: false, message: 'Credenciais de sandbox não configuradas' };
      if (!isValidSandbox) return { valid: false, message: 'Credenciais de sandbox inválidas' };
      
      return { valid: true, message: 'Credenciais de sandbox válidas' };
    }
  };

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-white text-sm">
          🏦 Debug de Gateway
          <Button
            size="sm"
            variant="outline"
            onClick={refetch}
            disabled={loading}
            className="border-gray-600"
          >
            <RefreshCw className={`h-3 w-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        
        {/* Status Geral */}
        <div className="space-y-2">
          <h4 className="text-white text-sm font-medium">Status Geral:</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-300 text-sm">Gateways carregados:</span>
              <div className="flex items-center gap-2">
                {getStatusIcon(gateways.length > 0)}
                <Badge className={getStatusColor(gateways.length > 0)}>
                  {gateways.length}
                </Badge>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-gray-300 text-sm">Gateway selecionado:</span>
              <div className="flex items-center gap-2">
                {getStatusIcon(!!selectedGateway)}
                <Badge className={getStatusColor(!!selectedGateway)}>
                  {selectedGateway ? 'SIM' : 'NÃO'}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Lista de Gateways */}
        <div className="space-y-2">
          <h4 className="text-white text-sm font-medium">Gateways Disponíveis:</h4>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {gateways.map((gateway) => {
              const credValidation = validateCredentials(gateway);
              const isSelected = gateway.id === selectedGatewayId;
              
              return (
                <div 
                  key={gateway.id} 
                  className={`p-2 rounded border ${
                    isSelected ? 'border-blue-500 bg-blue-900/20' : 'border-gray-600 bg-gray-700/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-gray-300 text-sm font-medium">{gateway.name}</span>
                    <div className="flex items-center gap-1">
                      {isSelected && <Badge variant="outline" className="text-xs">ATIVO</Badge>}
                      {getStatusIcon(gateway.is_active)}
                    </div>
                  </div>
                  
                  <div className="text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-gray-400">ID:</span>
                      <span className="text-gray-300 font-mono">{gateway.id.substring(0, 8)}...</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Ambiente:</span>
                      <Badge variant="outline" className="text-xs">
                        {gateway.environment || 'sandbox'}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Credenciais:</span>
                      <span className={`text-xs ${credValidation.valid ? 'text-green-400' : 'text-red-400'}`}>
                        {credValidation.message}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Gateway Selecionado */}
        {selectedGateway && (
          <div className="space-y-2">
            <h4 className="text-white text-sm font-medium">Gateway Ativo:</h4>
            <div className="bg-gray-700/50 p-3 rounded border">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-400">Nome:</span>
                  <span className="text-gray-300">{selectedGateway.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Ambiente:</span>
                  <Badge variant="outline">{selectedGateway.environment}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Ativo:</span>
                  <Badge className={getStatusColor(selectedGateway.is_active)}>
                    {selectedGateway.is_active ? 'SIM' : 'NÃO'}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Errors */}
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
              <p className="text-yellow-400 text-sm">Carregando gateways...</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};