
// CAMADA DE APRESENTAÇÃO (UI - A Vitrine)
// Este componente APENAS EXIBE os dados que recebe via props
// Ele NÃO CALCULA nada, apenas renderiza os resultados

import { OrderCalculationResult } from '../core/checkoutEngine';

interface OrderSummaryProps {
  calculation: OrderCalculationResult;
  isLoading?: boolean;
}

export const OrderSummary = ({ calculation, isLoading = false }: OrderSummaryProps) => {
  if (isLoading) {
    return (
      <div className="sc-card p-6 animate-pulse">
        <h3 className="text-lg font-semibold text-gray-200 mb-4">Resumo do Pedido</h3>
        <div className="space-y-3">
          <div className="h-4 bg-gray-700 rounded"></div>
          <div className="h-4 bg-gray-700 rounded w-3/4"></div>
          <div className="h-4 bg-gray-700 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  const formatPrice = (price: number) => {
    // Garantir formatação precisa com 2 casas decimais
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(Number(price.toFixed(2)));
  };

  // Log para debug - verificar se os valores estão corretos
  console.log('📊 OrderSummary - Verificação de cálculos:', {
    subtotal: calculation.subtotal,
    totalBumps: calculation.totalBumps,
    totalFinal: calculation.totalFinal,
    'Soma esperada': calculation.subtotal + calculation.totalBumps,
    'Diferença': calculation.totalFinal - (calculation.subtotal + calculation.totalBumps),
    items: calculation.items.map(item => ({ name: item.name, price: item.price }))
  });

  return (
    <div className="sc-card p-6 sticky top-4">
      <h3 className="text-lg font-semibold text-gray-200 mb-4">
        📋 Resumo do Pedido
      </h3>
      
      {/* Lista de Itens */}
      <div className="space-y-3 mb-6">
        {calculation.items.map((item) => (
          <div key={item.id} className="flex justify-between items-center py-2">
            <div>
              <p className="text-gray-200 font-medium">{item.name}</p>
              <p className="text-xs text-gray-400">
                {item.type === 'main' ? '🎯 Produto Principal' : '⚡ Order Bump'}
              </p>
            </div>
            <span className="text-violet-400 font-semibold">
              {formatPrice(item.price)}
            </span>
          </div>
        ))}
      </div>

      {/* Separador */}
      <div className="border-t border-gray-700 pt-4 space-y-2">
        {/* Subtotal */}
        <div className="flex justify-between text-gray-300">
          <span>Subtotal:</span>
          <span>{formatPrice(calculation.subtotal)}</span>
        </div>

        {/* Order Bumps */}
        {calculation.totalBumps > 0 && (
          <div className="flex justify-between text-gray-300">
            <span>Order Bumps:</span>
            <span className="text-green-400">+ {formatPrice(calculation.totalBumps)}</span>
          </div>
        )}

        {/* Descontos - apenas se existirem */}
        {calculation.discounts && calculation.discounts > 0 && (
          <div className="flex justify-between text-green-500">
            <span>💥 Desconto:</span>
            <span>- {formatPrice(calculation.discounts)}</span>
          </div>
        )}

        {/* Total Final */}
        <div className="border-t border-gray-700 pt-2 mt-4">
          <div className="flex justify-between items-center">
            <span className="text-lg font-semibold text-gray-200">Total:</span>
            <span className="text-2xl font-bold text-violet-400">
              {formatPrice(calculation.totalFinal)}
            </span>
          </div>
        </div>
      </div>

      {/* Status Visual */}
      <div className="mt-4 p-3 bg-violet-900/30 rounded-lg border border-violet-700">
        <div className="flex items-center text-violet-300 text-sm">
          <span className="mr-2">🔒</span>
          Compra 100% Segura
        </div>
      </div>
    </div>
  );
};
