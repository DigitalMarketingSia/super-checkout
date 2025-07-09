import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

type Domain = Database['public']['Tables']['domains']['Row'];
type DomainInsert = Database['public']['Tables']['domains']['Insert'];
type DomainUpdate = Database['public']['Tables']['domains']['Update'];

export const useSupabaseDomains = () => {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all domains
  const fetchDomains = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('domains')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setDomains(data || []);
      console.log('🌐 Domínios carregados do Supabase:', data?.length || 0);
    } catch (err) {
      console.error('❌ Erro ao carregar domínios:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar domínios');
    } finally {
      setLoading(false);
    }
  }, []);

  // Create domain
  const createDomain = async (domainData: DomainInsert) => {
    try {
      const { data, error } = await supabase
        .from('domains')
        .insert(domainData)
        .select()
        .single();

      if (error) throw error;

      // Add to local state
      setDomains(prev => [data, ...prev]);
      console.log('✅ Domínio criado:', data);
      
      return { data, error: null };
    } catch (err) {
      console.error('❌ Erro ao criar domínio:', err);
      return { 
        data: null, 
        error: err instanceof Error ? err.message : 'Erro ao criar domínio' 
      };
    }
  };

  // Update domain
  const updateDomain = async (id: string, updates: DomainUpdate) => {
    try {
      const { data, error } = await supabase
        .from('domains')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Update local state
      setDomains(prev => prev.map(d => d.id === id ? data : d));
      console.log('✅ Domínio atualizado:', data);
      
      return { data, error: null };
    } catch (err) {
      console.error('❌ Erro ao atualizar domínio:', err);
      return { 
        data: null, 
        error: err instanceof Error ? err.message : 'Erro ao atualizar domínio' 
      };
    }
  };

  // Delete domain
  const deleteDomain = async (id: string) => {
    try {
      const { error } = await supabase
        .from('domains')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Remove from local state
      setDomains(prev => prev.filter(d => d.id !== id));
      console.log('✅ Domínio excluído:', id);
      
      return { error: null };
    } catch (err) {
      console.error('❌ Erro ao excluir domínio:', err);
      return { 
        error: err instanceof Error ? err.message : 'Erro ao excluir domínio' 
      };
    }
  };

  // Get domain by ID
  const getDomainById = (id: string) => {
    return domains.find(d => d.id === id) || null;
  };

  // Initial load
  useEffect(() => {
    fetchDomains();
  }, [fetchDomains]);

  return {
    domains,
    loading,
    error,
    createDomain,
    updateDomain,
    deleteDomain,
    getDomainById,
    refetch: fetchDomains,
  };
};