
import { OrderCalculationResult } from '@/core/checkoutEngine';

interface BoletoSectionProps {
  orderCalculation: OrderCalculationResult | null;
  productPrice: number;
}

export const BoletoSection = ({ orderCalculation, productPrice }: BoletoSectionProps) => {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  const getPaymentIconSrc = () => {
    return '/lovable-uploads/366728dc-7384-4770-9d5e-9ebc2bfdbac3.png';
  };

  return (
    <div className="checkout-padrao-boleto-section">
      <div className="checkout-padrao-boleto-header">
        <img 
          src={getPaymentIconSrc()} 
          alt="Ícone Boleto Bancário"
          className="w-6 h-6"
        />
        <h3>Pagamento via Boleto Bancário</h3>
      </div>
      
      <div className="checkout-padrao-boleto-instructions">
        <h4>Como funciona o pagamento via Boleto:</h4>
        <ul>
          <li>Após confirmar o pedido, você receberá o boleto por e-mail</li>
          <li>O boleto pode ser pago em qualquer banco, casa lotérica ou via internet banking</li>
          <li>Valor total: {orderCalculation ? formatPrice(orderCalculation.totalFinal) : formatPrice(productPrice)}</li>
          <li>Prazo de vencimento: 3 dias úteis</li>
          <li>Após o pagamento, a confirmação ocorre em até 2 dias úteis</li>
        </ul>
      </div>
    </div>
  );
};
