import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface VendaData {
  id: string;
  valor_total: number;
  status: string;
  external_reference?: string;
  items: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
  }>;
  pixData?: any;
  cliente?: {
    nome: string;
    email: string;
  };
}

export const useVendaData = (orderId?: string) => {
  const [vendaData, setVendaData] = useState<VendaData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      return;
    }

    const fetchVendaData = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log('🔍 Buscando dados da venda:', orderId);

        // Buscar venda com cliente e itens
        const { data: venda, error: vendaError } = await supabase
          .from('vendas')
          .select(`
            *,
            clientes:id_cliente(*),
            itens_da_venda(
              *,
              produtos:id_produto(*)
            )
          `)
          .or(`id.eq.${orderId},external_reference.eq.${orderId}`)
          .single();

        if (vendaError) {
          console.error('❌ Erro ao buscar venda:', vendaError);
          throw new Error('Venda não encontrada');
        }

        console.log('✅ Venda encontrada:', venda);

        // Formatar dados
        const formattedData: VendaData = {
          id: venda.id,
          valor_total: venda.valor_total,
          status: venda.status,
          external_reference: venda.external_reference,
          items: venda.itens_da_venda?.map(item => ({
            id: item.id,
            name: item.produtos?.nome || 'Produto',
            price: item.preco_unitario,
            quantity: item.quantidade
          })) || [],
          cliente: venda.clientes ? {
            nome: venda.clientes.nome,
            email: venda.clientes.email
          } : undefined,
          pixData: null // PIX data will come from location.state or fallback
        };

        setVendaData(formattedData);
        console.log('📋 Dados formatados da venda:', formattedData);

      } catch (err) {
        console.error('❌ Erro ao carregar dados da venda:', err);
        setError(err instanceof Error ? err.message : 'Erro ao carregar venda');
      } finally {
        setLoading(false);
      }
    };

    fetchVendaData();
  }, [orderId]);

  return {
    vendaData,
    loading,
    error,
  };
};