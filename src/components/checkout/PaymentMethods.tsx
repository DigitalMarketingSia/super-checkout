
interface PaymentMethodsProps {
  allowedPaymentMethods: string[];
  selectedPaymentMethod: string;
  onPaymentMethodSelect: (method: string) => void;
}

export const PaymentMethods = ({
  allowedPaymentMethods,
  selectedPaymentMethod,
  onPaymentMethodSelect
}: PaymentMethodsProps) => {
  const paymentMethodIconMap = {
    'pix': '/images/icone-pix-final.png',
    'cartao_credito': '/images/icone-credito-final.png',
    'boleto': '/images/icone-boleto-final.png',
  };

  const getPaymentIconSrc = (methodType: string) => {
    return paymentMethodIconMap[methodType] || '/images/icone-credito-final.png';
  };

  return (
    <div className="checkout-padrao-payment-methods">
      {allowedPaymentMethods.includes('credit_card') && (
        <button
          type="button"
          onClick={() => onPaymentMethodSelect('credit_card')}
          className={`checkout-padrao-payment-button ${
            selectedPaymentMethod === 'credit_card' ? 'selected-cartao' : ''
          }`}
        >
          <img 
            src={getPaymentIconSrc('cartao_credito')} 
            alt="Ícone Cartão de Crédito"
            className="payment-method-icon"
          />
          <span className="checkout-padrao-payment-label">CARTÃO DE CRÉDITO</span>
        </button>
      )}
      
      {allowedPaymentMethods.includes('pix') && (
        <button
          type="button"
          onClick={() => onPaymentMethodSelect('pix')}
          className={`checkout-padrao-payment-button ${
            selectedPaymentMethod === 'pix' ? 'selected-pix' : ''
          }`}
        >
          <img 
            src={getPaymentIconSrc('pix')} 
            alt="Ícone PIX"
            className="payment-method-icon"
          />
          <span className="checkout-padrao-payment-label">PIX</span>
        </button>
      )}
      
      {allowedPaymentMethods.includes('boleto') && (
        <button
          type="button"
          onClick={() => onPaymentMethodSelect('boleto')}
          className={`checkout-padrao-payment-button ${
            selectedPaymentMethod === 'boleto' ? 'selected-boleto' : ''
          }`}
        >
          <img 
            src={getPaymentIconSrc('boleto')} 
            alt="Ícone Boleto Bancário"
            className="payment-method-icon"
          />
          <span className="checkout-padrao-payment-label">BOLETO BANCÁRIO</span>
        </button>
      )}
    </div>
  );
};
