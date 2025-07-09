import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

type Gateway = Database['public']['Tables']['gateways']['Row'];
type GatewayInsert = Database['public']['Tables']['gateways']['Insert'];
type GatewayUpdate = Database['public']['Tables']['gateways']['Update'];

export const useSupabaseGateways = () => {
  const [gateways, setGateways] = useState<Gateway[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all gateways
  const fetchGateways = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('gateways')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setGateways(data || []);
      console.log('💳 Gateways carregados do Supabase:', data?.length || 0);
    } catch (err) {
      console.error('❌ Erro ao carregar gateways:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar gateways');
    } finally {
      setLoading(false);
    }
  }, []);

  // Create gateway
  const createGateway = async (gatewayData: GatewayInsert) => {
    try {
      const { data, error } = await supabase
        .from('gateways')
        .insert(gatewayData)
        .select()
        .single();

      if (error) throw error;

      // Add to local state
      setGateways(prev => [data, ...prev]);
      console.log('✅ Gateway criado:', data);
      
      return { data, error: null };
    } catch (err) {
      console.error('❌ Erro ao criar gateway:', err);
      return { 
        data: null, 
        error: err instanceof Error ? err.message : 'Erro ao criar gateway' 
      };
    }
  };

  // Update gateway
  const updateGateway = async (id: string, updates: GatewayUpdate) => {
    try {
      const { data, error } = await supabase
        .from('gateways')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Update local state
      setGateways(prev => prev.map(g => g.id === id ? data : g));
      console.log('✅ Gateway atualizado:', data);
      
      return { data, error: null };
    } catch (err) {
      console.error('❌ Erro ao atualizar gateway:', err);
      return { 
        data: null, 
        error: err instanceof Error ? err.message : 'Erro ao atualizar gateway' 
      };
    }
  };

  const deleteGateway = async (id: string) => {
    try {
      console.log('🗑️ Iniciando exclusão do gateway:', id);
      
      const { error } = await supabase
        .from('gateways')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('❌ Erro ao deletar gateway no Supabase:', error);
        throw error;
      }

      // Remove from local state
      setGateways(prev => prev.filter(g => g.id !== id));
      console.log('✅ Gateway excluído com sucesso:', id);
      
      return { error: null };
    } catch (err) {
      console.error('❌ Erro ao excluir gateway:', err);
      return { 
        error: err instanceof Error ? err.message : 'Erro ao excluir gateway' 
      };
    }
  };

  // Get gateway by ID
  const getGatewayById = (id: string) => {
    return gateways.find(g => g.id === id) || null;
  };

  // Initial load
  useEffect(() => {
    fetchGateways();
  }, [fetchGateways]);

  return {
    gateways,
    loading,
    error,
    createGateway,
    updateGateway,
    deleteGateway,
    getGatewayById,
    refetch: fetchGateways,
  };
};