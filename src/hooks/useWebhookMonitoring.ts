import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

type Venda = Database['public']['Tables']['vendas']['Row'];

export const useWebhookMonitoring = () => {
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVendas = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('vendas')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        throw error;
      }

      setVendas(data || []);
      console.log('🔍 Vendas encontradas:', data?.length || 0);
      
      // Log das vendas para debug
      data?.forEach((venda, index) => {
        console.log(`📋 Venda ${index + 1}:`, {
          id: venda.id,
          status: venda.status,
          external_reference: venda.external_reference,
          payment_id: venda.payment_id,
          email: venda.email_cliente,
          valor: venda.valor_total,
          metodo: venda.metodo_pagamento,
          created_at: venda.created_at
        });
      });
      
    } catch (err) {
      console.error('❌ Erro ao buscar vendas:', err);
      setError(err instanceof Error ? err.message : 'Erro ao buscar vendas');
    } finally {
      setLoading(false);
    }
  };

  // Monitorar mudanças em tempo real
  useEffect(() => {
    fetchVendas();

    // Set up real-time subscription
    const subscription = supabase
      .channel('vendas-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'vendas'
        },
        (payload) => {
          console.log('🔄 Mudança detectada na tabela vendas:', payload);
          
          if (payload.eventType === 'INSERT') {
            console.log('➕ Nova venda criada:', payload.new);
          } else if (payload.eventType === 'UPDATE') {
            console.log('✏️ Venda atualizada:', {
              old: payload.old,
              new: payload.new
            });
          }
          
          // Refresh data
          fetchVendas();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const getVendaByExternalReference = (externalRef: string) => {
    return vendas.find(venda => venda.external_reference === externalRef);
  };

  const getVendaByPaymentId = (paymentId: string) => {
    return vendas.find(venda => venda.payment_id === paymentId);
  };

  const getVendasPendentes = () => {
    return vendas.filter(venda => venda.status === 'pendente');
  };

  const getVendasConcluidas = () => {
    return vendas.filter(venda => venda.status === 'concluida');
  };

  return {
    vendas,
    loading,
    error,
    refetch: fetchVendas,
    getVendaByExternalReference,
    getVendaByPaymentId,
    getVendasPendentes,
    getVendasConcluidas
  };
};