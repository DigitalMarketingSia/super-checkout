import { useWebhookMonitoring } from '@/hooks/useWebhookMonitoring';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertCircle, CheckCircle, Clock, X } from 'lucide-react';

export const WebhookDebug = () => {
  const { 
    vendas, 
    loading, 
    error, 
    refetch, 
    getVendasPendentes, 
    getVendasConcluidas 
  } = useWebhookMonitoring();

  const vendasPendentes = getVendasPendentes();
  const vendasConcluidas = getVendasConcluidas();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'concluida':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'pendente':
        return <Clock className="w-4 h-4 text-yellow-400" />;
      case 'cancelada':
        return <X className="w-4 h-4 text-red-400" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'concluida':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Concluída</Badge>;
      case 'pendente':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Pendente</Badge>;
      case 'cancelada':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Cancelada</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Webhook Debug</h2>
        <Button onClick={refetch} disabled={loading} variant="outline" size="sm">
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-400">Total de Vendas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{vendas.length}</div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-yellow-400">Pendentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-400">{vendasPendentes.length}</div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-green-400">Concluídas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-400">{vendasConcluidas.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Vendas */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Vendas Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
              <span className="ml-2 text-gray-400">Carregando vendas...</span>
            </div>
          ) : error ? (
            <div className="text-red-400 p-4 bg-red-500/10 rounded border border-red-500/20">
              ❌ Erro: {error}
            </div>
          ) : vendas.length === 0 ? (
            <div className="text-gray-400 p-8 text-center">
              Nenhuma venda encontrada
            </div>
          ) : (
            <div className="space-y-4">
              {vendas.map((venda) => (
                <div key={venda.id} className="bg-gray-700/50 p-4 rounded border border-gray-600">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(venda.status || 'pendente')}
                      <span className="text-white font-medium">
                        {venda.email_cliente || 'Email não informado'}
                      </span>
                    </div>
                    {getStatusBadge(venda.status || 'pendente')}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-400">Valor:</span>
                      <span className="text-white ml-2">R$ {venda.valor_total}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Método:</span>
                      <span className="text-white ml-2">{venda.metodo_pagamento}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">External Ref:</span>
                      <span className="text-white ml-2 font-mono text-xs">
                        {venda.external_reference || 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">Payment ID:</span>
                      <span className="text-white ml-2 font-mono text-xs">
                        {venda.payment_id || 'N/A'}
                      </span>
                    </div>
                    <div className="md:col-span-2">
                      <span className="text-gray-400">Criado em:</span>
                      <span className="text-white ml-2">
                        {new Date(venda.created_at || '').toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};