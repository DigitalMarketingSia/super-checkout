import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

type Checkout = Database['public']['Tables']['checkouts']['Row'];
type CheckoutInsert = Database['public']['Tables']['checkouts']['Insert'];
type CheckoutUpdate = Database['public']['Tables']['checkouts']['Update'];

export const useSupabaseCheckouts = () => {
  const [checkouts, setCheckouts] = useState<Checkout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all checkouts
  const fetchCheckouts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('checkouts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setCheckouts(data || []);
      console.log('🔧 Checkouts carregados do Supabase:', data?.length || 0);
    } catch (err) {
      console.error('❌ Erro ao carregar checkouts:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar checkouts');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch public checkouts (active only)
  const fetchPublicCheckouts = useCallback(async () => {
    try {
      // Only set loading if we don't have checkouts yet
      if (checkouts.length === 0) {
        setLoading(true);
      }
      setError(null);
      
      const { data, error } = await supabase
        .from('checkouts')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setCheckouts(data || []);
      console.log('🌐 Checkouts públicos carregados:', data?.length || 0);
    } catch (err) {
      console.error('❌ Erro ao carregar checkouts públicos:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar checkouts públicos');
    } finally {
      // Only set loading false if we were actually loading
      if (checkouts.length === 0) {
        setLoading(false);
      }
    }
  }, [checkouts.length]);

  // Create checkout
  const createCheckout = async (checkoutData: CheckoutInsert) => {
    try {
      const { data, error } = await supabase
        .from('checkouts')
        .insert(checkoutData)
        .select()
        .single();

      if (error) throw error;

      // Add to local state
      setCheckouts(prev => [data, ...prev]);
      console.log('✅ Checkout criado:', data);
      
      return { data, error: null };
    } catch (err) {
      console.error('❌ Erro ao criar checkout:', err);
      return { 
        data: null, 
        error: err instanceof Error ? err.message : 'Erro ao criar checkout' 
      };
    }
  };

  // Update checkout
  const updateCheckout = async (id: string, updates: CheckoutUpdate) => {
    try {
      const { data, error } = await supabase
        .from('checkouts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Update local state
      setCheckouts(prev => prev.map(c => c.id === id ? data : c));
      console.log('✅ Checkout atualizado:', data);
      
      return { data, error: null };
    } catch (err) {
      console.error('❌ Erro ao atualizar checkout:', err);
      return { 
        data: null, 
        error: err instanceof Error ? err.message : 'Erro ao atualizar checkout' 
      };
    }
  };

  // Delete checkout
  const deleteCheckout = async (id: string) => {
    try {
      const { error } = await supabase
        .from('checkouts')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Remove from local state
      setCheckouts(prev => prev.filter(c => c.id !== id));
      console.log('✅ Checkout excluído:', id);
      
      return { error: null };
    } catch (err) {
      console.error('❌ Erro ao excluir checkout:', err);
      return { 
        error: err instanceof Error ? err.message : 'Erro ao excluir checkout' 
      };
    }
  };

  // Get checkout by ID
  const getCheckoutById = (id: string) => {
    return checkouts.find(c => c.id === id) || null;
  };

  // Initial load
  useEffect(() => {
    fetchCheckouts();
  }, [fetchCheckouts]);

  return {
    checkouts,
    loading,
    error,
    createCheckout,
    updateCheckout,
    deleteCheckout,
    getCheckoutById,
    refetch: fetchCheckouts,
    fetchPublicCheckouts,
  };
};