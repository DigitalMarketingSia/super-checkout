import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useWebhookMonitoring } from '@/hooks/useWebhookMonitoring';
import { Webhook, RefreshCw, Clock, CheckCircle, XCircle } from 'lucide-react';

export const WebhookMonitor = () => {
  const { vendas, loading, error, refetch } = useWebhookMonitoring();
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdate(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'concluida': return 'bg-green-500';
      case 'pendente': return 'bg-yellow-500';
      case 'cancelada': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'concluida': return <CheckCircle className="h-4 w-4" />;
      case 'pendente': return <Clock className="h-4 w-4" />;
      case 'cancelada': return <XCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const getTimeSince = (dateString: string) => {
    const diff = Date.now() - new Date(dateString).getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h atrás`;
    if (minutes > 0) return `${minutes}m atrás`;
    return `${seconds}s atrás`;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Webhook className="h-5 w-5" />
            Monitor de Webhook - Vendas em Tempo Real
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              <Clock className="h-3 w-3 mr-1" />
              Atualizado: {lastUpdate.toLocaleTimeString('pt-BR')}
            </Badge>
            <Button
              size="sm"
              variant="outline"
              onClick={refetch}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="text-red-500 text-sm mb-4 p-3 bg-red-50 rounded-lg">
            Erro ao carregar vendas: {error}
          </div>
        )}

        <div className="space-y-3">
          {vendas.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Webhook className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Nenhuma venda encontrada</p>
              <p className="text-xs">As vendas aparecerão aqui em tempo real</p>
            </div>
          ) : (
            vendas.map((venda, index) => (
              <div
                key={venda.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(venda.status || 'pendente')}
                    <Badge 
                      className={`${getStatusColor(venda.status || 'pendente')} text-white text-xs`}
                    >
                      {venda.status || 'pendente'}
                    </Badge>
                  </div>
                  
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm">
                      {formatCurrency(venda.valor_total)}
                    </div>
                    <div className="text-xs text-gray-500 space-y-1">
                      {venda.email_cliente && (
                        <div>📧 {venda.email_cliente}</div>
                      )}
                      {venda.metodo_pagamento && (
                        <div>💳 {venda.metodo_pagamento}</div>
                      )}
                      {venda.external_reference && (
                        <div>🔗 Ref: {venda.external_reference}</div>
                      )}
                      {venda.payment_id && (
                        <div>💰 ID: {venda.payment_id}</div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right text-xs text-gray-500">
                  <div>{formatDate(venda.created_at || '')}</div>
                  <div className="font-medium">
                    {getTimeSince(venda.created_at || '')}
                  </div>
                  {venda.updated_at && venda.updated_at !== venda.created_at && (
                    <div className="text-green-600">
                      ✓ Atualizado: {getTimeSince(venda.updated_at)}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-4 pt-4 border-t text-xs text-gray-500">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="font-medium text-green-600">
                {vendas.filter(v => v.status === 'concluida').length}
              </div>
              <div>Concluídas</div>
            </div>
            <div>
              <div className="font-medium text-yellow-600">
                {vendas.filter(v => v.status === 'pendente').length}
              </div>
              <div>Pendentes</div>
            </div>
            <div>
              <div className="font-medium text-red-600">
                {vendas.filter(v => v.status === 'cancelada').length}
              </div>
              <div>Canceladas</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};