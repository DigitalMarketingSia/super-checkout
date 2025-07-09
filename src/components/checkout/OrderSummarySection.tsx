
import { OrderCalculationResult } from '@/core/checkoutEngine';

interface OrderSummarySectionProps {
  orderCalculation: OrderCalculationResult;
  selectedPaymentMethod: string;
  selectedInstallments: number;
}

export const OrderSummarySection = ({
  orderCalculation,
  selectedPaymentMethod,
  selectedInstallments
}: OrderSummarySectionProps) => {
  const formatPrice = (price: number) => {
    // Garantir que o valor seja formatado corretamente com 2 casas decimais
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(Number(price.toFixed(2)));
  };

  // Verificação adicional para debug
  console.log('🧮 OrderSummarySection - Valores recebidos:', {
    subtotal: orderCalculation.subtotal,
    totalBumps: orderCalculation.totalBumps,
    totalFinal: orderCalculation.totalFinal,
    'Soma manual': orderCalculation.subtotal + orderCalculation.totalBumps,
    discounts: orderCalculation.discounts
  });

  return (
    <div className="checkout-padrao-order-summary">
      <div className="checkout-padrao-summary-content">
        <span className="checkout-padrao-summary-label">Total</span>
        <div className="checkout-padrao-summary-values">
          <div className="checkout-padrao-summary-total">
            Valor total: <span className="checkout-padrao-value-amount">{formatPrice(orderCalculation.totalFinal)}</span>
          </div>
          {selectedPaymentMethod === 'credit_card' && selectedInstallments > 1 && (
            <div className="checkout-padrao-summary-installments">
              <span className="checkout-padrao-installment-amount">
                {selectedInstallments}x de {formatPrice(orderCalculation.totalFinal / selectedInstallments)}
              </span>
            </div>
          )}
          {(selectedPaymentMethod === 'pix' || selectedPaymentMethod === 'boleto') && (
            <div className="checkout-padrao-summary-installments">
              <span className="checkout-padrao-installment-amount">à vista</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
