import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

type Venda = Database['public']['Tables']['vendas']['Row'];

export const useSupabaseVendas = () => {
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all vendas
  const fetchVendas = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('vendas')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setVendas(data || []);
      console.log('💰 Vendas carregadas do Supabase:', data?.length || 0);
    } catch (err) {
      console.error('❌ Erro ao carregar vendas:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar vendas');
    } finally {
      setLoading(false);
    }
  }, []);

  // Calculate total revenue
  const getTotalRevenue = () => {
    return vendas.reduce((total, venda) => total + Number(venda.valor_total || 0), 0);
  };

  // Get conversion rate
  const getConversionRate = (totalCheckouts: number) => {
    if (totalCheckouts === 0) return 0;
    return (vendas.length / totalCheckouts) * 100;
  };

  // Initial load
  useEffect(() => {
    fetchVendas();
  }, [fetchVendas]);

  return {
    vendas,
    loading,
    error,
    refetch: fetchVendas,
    getTotalRevenue,
    getConversionRate,
  };
};