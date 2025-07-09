import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

type Product = Database['public']['Tables']['produtos']['Row'];
type ProductInsert = Database['public']['Tables']['produtos']['Insert'];
type ProductUpdate = Database['public']['Tables']['produtos']['Update'];

export const useSupabaseProducts = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all products
  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('produtos')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setProducts(data || []);
      console.log('📦 Produtos carregados do Supabase:', data?.length || 0);
    } catch (err) {
      console.error('❌ Erro ao carregar produtos:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar produtos');
    } finally {
      setLoading(false);
    }
  }, []);

  // Create product
  const createProduct = async (productData: ProductInsert) => {
    try {
      const { data, error } = await supabase
        .from('produtos')
        .insert(productData)
        .select()
        .single();

      if (error) throw error;

      // Add to local state
      setProducts(prev => [data, ...prev]);
      console.log('✅ Produto criado:', data);
      
      return { data, error: null };
    } catch (err) {
      console.error('❌ Erro ao criar produto:', err);
      return { 
        data: null, 
        error: err instanceof Error ? err.message : 'Erro ao criar produto' 
      };
    }
  };

  // Update product
  const updateProduct = async (id: string, updates: ProductUpdate) => {
    try {
      const { data, error } = await supabase
        .from('produtos')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Update local state
      setProducts(prev => prev.map(p => p.id === id ? data : p));
      console.log('✅ Produto atualizado:', data);
      
      return { data, error: null };
    } catch (err) {
      console.error('❌ Erro ao atualizar produto:', err);
      return { 
        data: null, 
        error: err instanceof Error ? err.message : 'Erro ao atualizar produto' 
      };
    }
  };

  // Delete product
  const deleteProduct = async (id: string) => {
    try {
      const { error } = await supabase
        .from('produtos')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Remove from local state
      setProducts(prev => prev.filter(p => p.id !== id));
      console.log('✅ Produto excluído:', id);
      
      return { error: null };
    } catch (err) {
      console.error('❌ Erro ao excluir produto:', err);
      return { 
        error: err instanceof Error ? err.message : 'Erro ao excluir produto' 
      };
    }
  };

  // Get product by ID
  const getProductById = (id: string) => {
    return products.find(p => p.id === id) || null;
  };

  // Initial load
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return {
    products,
    loading,
    error,
    createProduct,
    updateProduct,
    deleteProduct,
    getProductById,
    refetch: fetchProducts,
  };
};