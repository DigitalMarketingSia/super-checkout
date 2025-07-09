
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

type Venda = Database['public']['Tables']['vendas']['Row'];
type Cliente = Database['public']['Tables']['clientes']['Row'];
type ItemVenda = Database['public']['Tables']['itens_da_venda']['Row'] & {
  produtos: Database['public']['Tables']['produtos']['Row'];
};

interface VendaCompleta extends Venda {
  cliente: Cliente;
  itens: ItemVenda[];
}

export const useSupabaseVenda = (vendaId?: string) => {
  const [venda, setVenda] = useState<VendaCompleta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!vendaId) {
      setLoading(false);
      return;
    }

    const fetchVenda = async () => {
      try {
        setLoading(true);
        setError(null);

        // Buscar venda com cliente
        const { data: vendaData, error: vendaError } = await supabase
          .from('vendas')
          .select(`
            *,
            clientes:id_cliente(*)
          `)
          .eq('id', vendaId)
          .single();

        if (vendaError) throw vendaError;

        // Buscar itens da venda com produtos
        const { data: itensData, error: itensError } = await supabase
          .from('itens_da_venda')
          .select(`
            *,
            produtos:id_produto(*)
          `)
          .eq('id_venda', vendaId);

        if (itensError) throw itensError;

        const vendaCompleta: VendaCompleta = {
          ...vendaData,
          cliente: vendaData.clientes,
          itens: itensData || []
        };

        setVenda(vendaCompleta);
        console.log('✅ Venda carregada do Supabase:', vendaCompleta);
      } catch (err) {
        console.error('❌ Erro ao carregar venda:', err);
        setError(err instanceof Error ? err.message : 'Erro ao carregar venda');
      } finally {
        setLoading(false);
      }
    };

    fetchVenda();
  }, [vendaId]);

  return {
    venda,
    loading,
    error,
  };
};
