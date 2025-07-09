
import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useOrderContext } from '@/context/OrderContext';
import { useSupabaseVenda } from '@/hooks/useSupabaseVenda';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Download, Mail, Package } from 'lucide-react';
import { Order } from '@/api/mockDatabase';

interface ProductData {
  name: string;
  price: number;
  type: 'main' | 'bump' | 'upsell';
}

const ThankYou = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const { getOrderById } = useOrderContext();
  const { venda, loading: supabaseLoading, error: supabaseError } = useSupabaseVenda(orderId);
  
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<ProductData[]>([]);
  const [customerName, setCustomerName] = useState<string>('');
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [createdAt, setCreatedAt] = useState<string>('');
  const [isSupabaseData, setIsSupabaseData] = useState<boolean>(false);

  useEffect(() => {
    const loadOrderData = () => {
      if (!orderId) {
        setLoading(false);
        return;
      }

      // Primeiro, tentar usar dados do Supabase
      if (venda && !supabaseError) {
        console.log('📦 Usando dados do Supabase para o pedido:', orderId);
        
        // Converter dados do Supabase para formato da interface
        const convertedProducts: ProductData[] = venda.itens.map(item => ({
          name: item.produtos.nome,
          price: Number(item.preco_unitario),
          type: item.produtos.is_principal ? 'main' : 
                item.produtos.is_orderbump ? 'bump' : 'upsell'
        }));

        setProducts(convertedProducts);
        setCustomerName(venda.cliente.nome);
        setTotalAmount(Number(venda.valor_total));
        setPaymentMethod(venda.metodo_pagamento);
        setCreatedAt(venda.created_at || new Date().toISOString());
        setIsSupabaseData(true);
        setLoading(false);
        return;
      }

      // Fallback: usar dados do localStorage
      if (!supabaseLoading) {
        console.log('📦 Tentando usar dados do localStorage para o pedido:', orderId);
        const foundOrder = getOrderById(orderId);
        
        if (foundOrder) {
          console.log('✅ Pedido encontrado no localStorage');
          setOrder(foundOrder);
          setIsSupabaseData(false);
        } else {
          console.log('❌ Pedido não encontrado em nenhuma fonte');
        }
        setLoading(false);
      }
    };

    loadOrderData();
  }, [orderId, venda, supabaseError, supabaseLoading, getOrderById]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  const getPaymentMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      'pix': 'PIX',
      'credit_card': 'Cartão de Crédito',
      'boleto': 'Boleto',
      'cartão': 'Cartão de Crédito'
    };
    return labels[method] || method;
  };

  if (loading || supabaseLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Carregando pedido...</div>
      </div>
    );
  }

  // Se não encontrou dados nem no Supabase nem no localStorage
  if (!venda && !order) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center text-white">
          <h1 className="text-2xl mb-4">Pedido não encontrado</h1>
          <p className="mb-4">Não foi possível encontrar os dados do seu pedido.</p>
          <p className="text-sm text-gray-400">ID do pedido: {orderId}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 py-8 px-4">
      <div className="max-w-lg mx-auto space-y-6">
        {/* Success Header */}
        <div className="text-center">
          <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Pagamento Aprovado!</h1>
          <p className="text-gray-400">
            Seu pedido foi processado com sucesso
          </p>
        </div>

        {/* Order Details */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
              Detalhes do Pedido
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Número do Pedido:</span>
              <span className="text-white font-mono">#{orderId}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Status:</span>
              <span className="text-green-400 font-medium">✅ Aprovado</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Data:</span>
              <span className="text-white">
                {new Date(isSupabaseData ? createdAt : order?.createdAt || '').toLocaleDateString('pt-BR')}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Valor Total:</span>
              <span className="text-green-400 font-bold text-lg">
                {formatPrice(isSupabaseData ? totalAmount : order?.totalAmount || 0)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Cliente:</span>
              <span className="text-white">
                {isSupabaseData ? customerName : order?.customerData.nome}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Método de Pagamento:</span>
              <span className="text-white">
                {getPaymentMethodLabel(isSupabaseData ? paymentMethod : 'credit_card')}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Produtos Comprados */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Package className="w-5 h-5 text-blue-500 mr-2" />
              Produtos Comprados
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isSupabaseData ? (
              // Renderizar produtos do Supabase
              products.map((produto, index) => (
                <div key={index} className="flex justify-between items-center p-3 bg-gray-700 rounded-lg">
                  <div>
                    <h4 className="text-white font-medium">{produto.name}</h4>
                    <p className="text-gray-400 text-sm">
                      {produto.type === 'main' ? 'Produto Principal' :
                       produto.type === 'bump' ? 'Produto Adicional' : 'Oferta Especial'}
                    </p>
                  </div>
                  <span className="text-green-400 font-semibold">
                    {formatPrice(produto.price)}
                  </span>
                </div>
              ))
            ) : (
              // Renderizar produtos do localStorage (formato antigo)
              <>
                {/* Produto Principal */}
                <div className="flex justify-between items-center p-3 bg-gray-700 rounded-lg">
                  <div>
                    <h4 className="text-white font-medium">{order?.mainProduct.name}</h4>
                    <p className="text-gray-400 text-sm">Produto Principal</p>
                  </div>
                  <span className="text-green-400 font-semibold">
                    {formatPrice(order?.mainProduct.price || 0)}
                  </span>
                </div>

                {/* Order Bumps */}
                {order?.orderBumps.map((bump) => (
                  <div key={bump.id} className="flex justify-between items-center p-3 bg-gray-700 rounded-lg">
                    <div>
                      <h4 className="text-white font-medium">{bump.name}</h4>
                      <p className="text-gray-400 text-sm">Produto Adicional</p>
                    </div>
                    <span className="text-green-400 font-semibold">
                      + {formatPrice(bump.price)}
                    </span>
                  </div>
                ))}

                {/* Upsell */}
                {order?.upsellProduct && (
                  <div className="flex justify-between items-center p-3 bg-purple-900/50 border border-purple-500 rounded-lg">
                    <div>
                      <h4 className="text-white font-medium">{order.upsellProduct.name}</h4>
                      <p className="text-purple-300 text-sm">🎁 Oferta Especial</p>
                    </div>
                    <span className="text-green-400 font-semibold">
                      + {formatPrice(order.upsellProduct.price)}
                    </span>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Next Steps */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Próximos Passos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start space-x-3">
              <Mail className="w-5 h-5 text-blue-400 mt-0.5" />
              <div>
                <p className="text-white font-medium">Confirmação por Email</p>
                <p className="text-gray-400 text-sm">
                  Você receberá um email com os detalhes da compra e instruções de acesso.
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <Download className="w-5 h-5 text-green-400 mt-0.5" />
              <div>
                <p className="text-white font-medium">Acesso ao Produto</p>
                <p className="text-gray-400 text-sm">
                  Caso tenha adquirido um produto digital, o acesso será liberado em alguns minutos.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Support */}
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="pt-6">
            <div className="text-center space-y-3">
              <p className="text-gray-300">
                Precisa de ajuda? Nossa equipe está pronta para te atender.
              </p>
              <Button 
                variant="outline" 
                className="border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                Entrar em Contato
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="text-center">
          <p className="text-gray-500 text-sm">
            Obrigado por escolher nossos produtos!
          </p>
          {/* Debug info */}
          <p className="text-gray-600 text-xs mt-2">
            Fonte dos dados: {isSupabaseData ? 'Supabase' : 'LocalStorage'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ThankYou;
