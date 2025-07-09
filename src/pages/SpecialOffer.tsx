import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useOrderContext } from '@/context/OrderContext';
import { useCheckoutContext } from '@/context/CheckoutContext';
import { useProductContext } from '@/context/ProductContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Star } from 'lucide-react';
import { Order, Product } from '@/api/mockDatabase';

const SpecialOffer = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { getOrderById, updateOrder } = useOrderContext();
  const { getCheckoutById } = useCheckoutContext();
  const { getProductById } = useProductContext();
  
  const [order, setOrder] = useState<Order | null>(null);
  const [upsellProduct, setUpsellProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!orderId) return;
    
    const loadOrderData = async () => {
      try {
        // Buscar o pedido
        const foundOrder = getOrderById(orderId);
        if (!foundOrder) {
          navigate('/404');
          return;
        }
        
        // Buscar o checkout para obter o produto de upsell
        const checkout = getCheckoutById(foundOrder.checkoutId);
        if (!checkout || !checkout.upsellProductId) {
          // Se não há upsell configurado, vai direto para página de obrigado
          navigate(`/obrigado/${orderId}`);
          return;
        }
        
        // Buscar o produto de upsell
        const upsell = getProductById(checkout.upsellProductId);
        if (!upsell) {
          navigate(`/obrigado/${orderId}`);
          return;
        }
        
        setOrder(foundOrder);
        setUpsellProduct(upsell);
      } catch (error) {
        console.error('Erro ao carregar dados da oferta:', error);
        navigate('/404');
      } finally {
        setLoading(false);
      }
    };
    
    loadOrderData();
  }, [orderId, getOrderById, getCheckoutById, getProductById, navigate]);

  const handleAcceptUpsell = async () => {
    if (!order || !upsellProduct) return;
    
    setProcessing(true);
    
    try {
      // Simular processamento do pagamento
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Atualizar o pedido com o upsell
      const updatedOrder = updateOrder(order.id, {
        upsellProduct: upsellProduct,
        totalAmount: order.totalAmount + upsellProduct.price
      });
      
      if (updatedOrder) {
        console.log('✅ Upsell adicionado ao pedido:', updatedOrder.id);
        navigate(`/obrigado/${orderId}`);
      }
    } catch (error) {
      console.error('Erro ao processar upsell:', error);
      alert('Erro ao processar pagamento. Tente novamente.');
    } finally {
      setProcessing(false);
    }
  };

  const handleDeclineUpsell = () => {
    navigate(`/obrigado/${orderId}`);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Carregando oferta especial...</div>
      </div>
    );
  }

  if (!order || !upsellProduct) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Oferta não encontrada</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header de Urgência */}
        <div className="text-center">
          <div className="w-16 h-16 bg-yellow-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Star className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">🔥 ESPERE!</h1>
          <p className="text-xl text-yellow-400 font-semibold">
            Sua compra está quase completa...
          </p>
          <p className="text-gray-300 mt-2">
            Aproveite esta oferta EXCLUSIVA disponível apenas agora!
          </p>
        </div>

        {/* Confirmação do Pedido Original */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-green-400 flex items-center">
              <CheckCircle className="w-5 h-5 mr-2" />
              Pagamento Aprovado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-400">Produto:</span>
                <span className="text-white font-medium">{order.mainProduct.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Valor Pago:</span>
                <span className="text-green-400 font-semibold">
                  {formatPrice(order.totalAmount)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Status:</span>
                <span className="text-green-400">✅ Confirmado</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Oferta de Upsell */}
        <Card className="bg-gradient-to-r from-purple-900 to-pink-900 border-purple-500 border-2">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-white">
              🎁 OFERTA ESPECIAL EXCLUSIVA
            </CardTitle>
            <p className="text-purple-200">
              Disponível apenas para você, apenas agora!
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Produto de Upsell */}
            <div className="text-center">
              {upsellProduct.image && (
                <div className="w-32 h-32 mx-auto mb-4 bg-gray-700 rounded-lg overflow-hidden">
                  <img
                    src={upsellProduct.image}
                    alt={upsellProduct.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <h3 className="text-2xl font-bold text-white mb-2">
                {upsellProduct.name}
              </h3>
              <p className="text-purple-200 mb-4">
                {upsellProduct.description}
              </p>
              
              {/* Preço com Destaque */}
              <div className="text-center">
                <div className="text-3xl font-bold text-yellow-400">
                  + {formatPrice(upsellProduct.price)}
                </div>
                <p className="text-sm text-purple-200 mt-1">
                  Adicionado ao seu pedido
                </p>
              </div>
            </div>

            {/* Benefícios */}
            <div className="bg-black/30 rounded-lg p-4">
              <h4 className="text-white font-semibold mb-3">🎯 Por que adicionar agora?</h4>
              <ul className="space-y-2 text-purple-200">
                <li className="flex items-start">
                  <span className="text-green-400 mr-2">✓</span>
                  Oferta exclusiva por tempo limitado
                </li>
                <li className="flex items-start">
                  <span className="text-green-400 mr-2">✓</span>
                  Complementa perfeitamente sua compra
                </li>
                <li className="flex items-start">
                  <span className="text-green-400 mr-2">✓</span>
                  Acesso imediato após confirmação
                </li>
                <li className="flex items-start">
                  <span className="text-green-400 mr-2">✓</span>
                  Mesmo método de pagamento já aprovado
                </li>
              </ul>
            </div>

            {/* Valor Total */}
            <div className="bg-gray-800 rounded-lg p-4 text-center">
              <p className="text-gray-400 text-sm">Valor total do seu pedido será:</p>
              <p className="text-3xl font-bold text-green-400">
                {formatPrice(order.totalAmount + upsellProduct.price)}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Botões de Ação */}
        <div className="space-y-4">
          <Button
            onClick={handleAcceptUpsell}
            disabled={processing}
            className="w-full h-14 text-lg font-bold bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white"
          >
            {processing ? (
              '🔄 Processando...'
            ) : (
              `✅ SIM, QUERO ADICIONAR POR ${formatPrice(upsellProduct.price)}!`
            )}
          </Button>
          
          <button
            onClick={handleDeclineUpsell}
            disabled={processing}
            className="w-full text-gray-400 hover:text-white transition-colors text-sm underline"
          >
            Não, obrigado. Continuar sem esta oferta.
          </button>
        </div>

        {/* Urgência */}
        <div className="text-center text-red-400 text-sm">
          ⚠️ Esta oferta não estará disponível novamente
        </div>
      </div>
    </div>
  );
};

export default SpecialOffer;