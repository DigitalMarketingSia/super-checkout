
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

type Cliente = Database['public']['Tables']['clientes']['Row'];

export const useSupabaseClientes = () => {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all clientes
  const fetchClientes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setClientes(data || []);
      console.log('👥 Clientes carregados do Supabase:', data?.length || 0);
    } catch (err) {
      console.error('❌ Erro ao carregar clientes:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar clientes');
    } finally {
      setLoading(false);
    }
  }, []);

  // Get unique customers count
  const getUniqueCustomersCount = () => {
    return clientes.length;
  };

  // Get customers by date range
  const getCustomersByDateRange = (startDate: string, endDate: string) => {
    return clientes.filter(cliente => {
      const clienteDate = new Date(cliente.created_at || '').toISOString().split('T')[0];
      return clienteDate >= startDate && clienteDate <= endDate;
    });
  };

  // Initial load
  useEffect(() => {
    fetchClientes();
  }, [fetchClientes]);

  return {
    clientes,
    loading,
    error,
    refetch: fetchClientes,
    getUniqueCustomersCount,
    getCustomersByDateRange,
  };
};
