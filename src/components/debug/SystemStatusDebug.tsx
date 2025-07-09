
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface SystemStatusDebugProps {
  gatewayId: string | null;
  gatewaysCount: number;
  checkoutLoaded: boolean;
  productLoaded: boolean;
  paymentSystemReady: boolean;
  environment: string;
}

export const SystemStatusDebug = ({
  gatewayId,
  gatewaysCount,
  checkoutLoaded,
  productLoaded,
  paymentSystemReady,
  environment
}: SystemStatusDebugProps) => {
  const getStatusIcon = (status: boolean) => {
    return status ? 
      <CheckCircle className="h-4 w-4 text-green-500" /> : 
      <XCircle className="h-4 w-4 text-red-500" />;
  };

  const getStatusColor = (status: boolean) => {
    return status ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400';
  };

  return (
    <Card className="bg-gray-900 border-gray-700 shadow-2xl">
      <CardHeader>
        <CardTitle className="text-white text-sm">🔧 Status do Sistema</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center justify-between">
            <span className="text-gray-300 text-sm">Gateways:</span>
            <div className="flex items-center gap-2">
              {getStatusIcon(gatewaysCount > 0)}
              <Badge className={getStatusColor(gatewaysCount > 0)}>
                {gatewaysCount}
              </Badge>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-gray-300 text-sm">Gateway Ativo:</span>
            <div className="flex items-center gap-2">
              {getStatusIcon(!!gatewayId)}
              <Badge className={getStatusColor(!!gatewayId)}>
                {gatewayId ? 'SIM' : 'NÃO'}
              </Badge>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-gray-300 text-sm">Checkout:</span>
            <div className="flex items-center gap-2">
              {getStatusIcon(checkoutLoaded)}
              <Badge className={getStatusColor(checkoutLoaded)}>
                {checkoutLoaded ? 'OK' : 'ERRO'}
              </Badge>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-gray-300 text-sm">Produto:</span>
            <div className="flex items-center gap-2">
              {getStatusIcon(productLoaded)}
              <Badge className={getStatusColor(productLoaded)}>
                {productLoaded ? 'OK' : 'ERRO'}
              </Badge>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-gray-300 text-sm">Pagamento:</span>
            <div className="flex items-center gap-2">
              {getStatusIcon(paymentSystemReady)}
              <Badge className={getStatusColor(paymentSystemReady)}>
                {paymentSystemReady ? 'PRONTO' : 'NÃO PRONTO'}
              </Badge>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-gray-300 text-sm">Ambiente:</span>
            <Badge variant="outline" className="capitalize">
              {environment}
            </Badge>
          </div>
        </div>

        {gatewayId && (
          <div className="bg-gray-700/50 p-2 rounded text-xs">
            <div className="flex justify-between">
              <span className="text-gray-400">Gateway ID:</span>
              <span className="text-gray-300 font-mono">
                {gatewayId.substring(0, 8)}...
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
