
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

type ItemVenda = Database['public']['Tables']['itens_da_venda']['Row'];

export const useSupabaseItensVenda = () => {
  const [itensVenda, setItensVenda] = useState<ItemVenda[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all itens de venda
  const fetchItensVenda = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('itens_da_venda')
        .select(`
          *,
          produtos:id_produto(nome, preco),
          vendas:id_venda(created_at, status, metodo_pagamento)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setItensVenda(data || []);
      console.log('📦 Itens de venda carregados do Supabase:', data?.length || 0);
    } catch (err) {
      console.error('❌ Erro ao carregar itens de venda:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar itens de venda');
    } finally {
      setLoading(false);
    }
  }, []);

  // Get items by sale ID
  const getItemsBySaleId = (saleId: string) => {
    return itensVenda.filter(item => item.id_venda === saleId);
  };

  // Get total items sold
  const getTotalItemsSold = () => {
    return itensVenda.reduce((total, item) => total + (item.quantidade || 1), 0);
  };

  // Initial load
  useEffect(() => {
    fetchItensVenda();
  }, [fetchItensVenda]);

  return {
    itensVenda,
    loading,
    error,
    refetch: fetchItensVenda,
    getItemsBySaleId,
    getTotalItemsSold,
  };
};
