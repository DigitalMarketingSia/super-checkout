
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, AlertCircle, RefreshCw, Bug, Zap } from 'lucide-react';
import { useSupabaseGateways } from '@/hooks/useSupabaseGateways';
import { useState, useEffect } from 'react';

interface CheckoutSystemDebugProps {
  checkout: any;
  isPaymentSystemReady: boolean;
  paymentSystemLoading: boolean;
  isSubmitting: boolean;
  debugInfo: any;
  formData: any;
  selectedPaymentMethod: string;
  onTestPayment?: () => void;
}

export const CheckoutSystemDebug = ({
  checkout,
  isPaymentSystemReady,
  paymentSystemLoading,
  isSubmitting,
  debugInfo,
  formData,
  selectedPaymentMethod,
  onTestPayment
}: CheckoutSystemDebugProps) => {
  const { gateways, loading: gatewaysLoading } = useSupabaseGateways();
  const [systemChecks, setSystemChecks] = useState<any[]>([]);

  useEffect(() => {
    const checks = [
      {
        name: 'Checkout Carregado',
        status: !!checkout,
        message: checkout ? `Checkout: ${checkout.name}` : 'Checkout não encontrado'
      },
      {
        name: 'Gateway Configurado',
        status: !!checkout?.gatewayId,
        message: checkout?.gatewayId ? `Gateway ID: ${checkout.gatewayId.substring(0, 8)}...` : 'Sem gateway configurado'
      },
      {
        name: 'Gateways Carregados',
        status: !gatewaysLoading && gateways.length > 0,
        message: `${gateways.length} gateways encontrados`
      },
      {
        name: 'Sistema de Pagamento',
        status: isPaymentSystemReady,
        message: isPaymentSystemReady ? 'Sistema pronto' : 'Sistema não pronto'
      },
      {
        name: 'Credenciais MP',
        status: debugInfo?.hasPublicKey && debugInfo?.hasAccessToken,
        message: debugInfo?.hasPublicKey && debugInfo?.hasAccessToken ? 'Credenciais OK' : 'Credenciais ausentes'
      },
      {
        name: 'Formulário',
        status: !!(formData?.nome && formData?.email),
        message: (formData?.nome && formData?.email) ? 'Dados preenchidos' : 'Dados incompletos'
      },
      {
        name: 'Método de Pagamento',
        status: !!selectedPaymentMethod,
        message: selectedPaymentMethod || 'Não selecionado'
      }
    ];

    setSystemChecks(checks);
  }, [checkout, gatewaysLoading, gateways, isPaymentSystemReady, debugInfo, formData, selectedPaymentMethod]);

  const getStatusIcon = (status: boolean, loading?: boolean) => {
    if (loading) return <AlertCircle className="h-4 w-4 text-yellow-500 animate-spin" />;
    return status ? 
      <CheckCircle className="h-4 w-4 text-green-500" /> : 
      <XCircle className="h-4 w-4 text-red-500" />;
  };

  const getStatusColor = (status: boolean) => {
    return status ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30';
  };

  const allSystemsReady = systemChecks.every(check => check.status);

  return (
    <Card className="bg-gray-900 border-gray-700 shadow-2xl">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-white text-sm">
          <div className="flex items-center gap-2">
            <Bug className="h-4 w-4" />
            🐛 Sistema de Checkout - Debug Completo
          </div>
          <div className="flex items-center gap-2">
            <Badge className={allSystemsReady ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}>
              {allSystemsReady ? 'TODOS SISTEMAS OK' : 'PROBLEMAS DETECTADOS'}
            </Badge>
            {onTestPayment && (
              <Button
                size="sm"
                variant="outline"
                onClick={onTestPayment}
                disabled={isSubmitting || !allSystemsReady}
                className="border-gray-600"
              >
                <Zap className="h-3 w-3 mr-1" />
                Testar
              </Button>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        
        {/* Status dos Sistemas */}
        <div className="space-y-2">
          <h4 className="text-white text-sm font-medium">Status dos Sistemas:</h4>
          <div className="grid grid-cols-1 gap-2">
            {systemChecks.map((check, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-gray-700/30 rounded">
                <div className="flex items-center gap-2">
                  {getStatusIcon(check.status)}
                  <span className="text-gray-300 text-sm">{check.name}:</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 text-xs">{check.message}</span>
                  <Badge className={getStatusColor(check.status)}>
                    {check.status ? 'OK' : 'ERRO'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Informações do Gateway */}
        {checkout?.gatewayId && (
          <div className="space-y-2">
            <h4 className="text-white text-sm font-medium">Gateway Ativo:</h4>
            <div className="bg-gray-700/50 p-3 rounded text-xs space-y-2">
              {gateways.filter(g => g.id === checkout.gatewayId).map(gateway => (
                <div key={gateway.id} className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Nome:</span>
                    <span className="text-gray-300">{gateway.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Ambiente:</span>
                    <Badge variant="outline">{gateway.environment || 'sandbox'}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Ativo:</span>
                    <Badge className={getStatusColor(gateway.is_active)}>
                      {gateway.is_active ? 'SIM' : 'NÃO'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Estado do Formulário */}
        <div className="space-y-2">
          <h4 className="text-white text-sm font-medium">Estado do Formulário:</h4>
          <div className="bg-gray-700/50 p-2 rounded text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-400">Nome:</span>
              <span className="text-gray-300">{formData?.nome || 'Vazio'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Email:</span>
              <span className="text-gray-300">{formData?.email || 'Vazio'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Telefone:</span>
              <span className="text-gray-300">{formData?.telefone || 'Vazio'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">CPF:</span>
              <span className="text-gray-300">{formData?.cpf || 'Vazio'}</span>
            </div>
          </div>
        </div>

        {/* Estado de Submissão */}
        {isSubmitting && (
          <div className="bg-blue-900/20 border border-blue-500/30 p-3 rounded">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-blue-400 animate-spin" />
              <div>
                <p className="text-blue-400 text-sm font-medium">Processando Pagamento...</p>
                <p className="text-blue-300 text-xs">Aguarde, não feche esta página</p>
              </div>
            </div>
          </div>
        )}

        {/* Resumo Final */}
        <div className={`p-3 rounded border ${
          allSystemsReady 
            ? 'bg-green-900/20 border-green-500/30' 
            : 'bg-red-900/20 border-red-500/30'
        }`}>
          <div className="flex items-center gap-2">
            {allSystemsReady ? 
              <CheckCircle className="h-4 w-4 text-green-400" /> :
              <XCircle className="h-4 w-4 text-red-400" />
            }
            <p className={`text-sm font-medium ${
              allSystemsReady ? 'text-green-400' : 'text-red-400'
            }`}>
              {allSystemsReady 
                ? '✅ Sistema pronto para processar pagamentos!' 
                : '❌ Sistema não está pronto - verifique os itens marcados como ERRO'
              }
            </p>
          </div>
        </div>

      </CardContent>
    </Card>
  );
};
