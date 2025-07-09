import { useState, useEffect } from 'react';

interface InteractiveCreditCardProps {
  number: string;
  name: string;
  expiry: string;
  cvv: string;
  onCvvFocus: () => void;
  onCvvBlur: () => void;
}

export const InteractiveCreditCard = ({
  number,
  name,
  expiry,
  cvv,
  onCvvFocus,
  onCvvBlur
}: InteractiveCreditCardProps) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [cardBrand, setCardBrand] = useState('');

  // Detectar bandeira do cartão com regras específicas brasileiras
  useEffect(() => {
    const detectCardBrand = (cardNumber: string) => {
      const cleanNumber = cardNumber.replace(/\s/g, '');
      
      // Regras na ordem de mais específico para mais geral
      if (cleanNumber.startsWith('606282') || cleanNumber.startsWith('38')) {
        return 'hipercard';
      } else if (
        /^5[1-5]/.test(cleanNumber) || 
        (cleanNumber.length >= 4 && parseInt(cleanNumber.substring(0, 4)) >= 2221 && parseInt(cleanNumber.substring(0, 4)) <= 2720)
      ) {
        return 'mastercard';
      } else if (/^(301|305|36|38)/.test(cleanNumber)) {
        return 'diners';
      } else if (/^(34|37)/.test(cleanNumber)) {
        return 'amex';
      } else if (/^(5067|4576|6362|509|650|65)/.test(cleanNumber)) {
        return 'elo';
      } else if (cleanNumber.startsWith('604')) {
        return 'cabal';
      } else if (cleanNumber.startsWith('4')) {
        return 'visa';
      }
      return '';
    };

    setCardBrand(detectCardBrand(number));
  }, [number]);

  // Formatar número do cartão
  const formatCardNumber = (num: string) => {
    if (!num) return '•••• •••• •••• ••••';
    return num;
  };

  // Formatar nome
  const formatName = (name: string) => {
    return name.toUpperCase() || 'NOME DO TITULAR';
  };

  // Formatar validade
  const formatExpiry = (expiry: string) => {
    return expiry || 'MM/AA';
  };

  const handleCvvFocus = () => {
    setIsFlipped(true);
    onCvvFocus();
  };

  const handleCvvBlur = () => {
    setIsFlipped(false);
    onCvvBlur();
  };

  return (
    <div className="credit-card-container">
      <div className={`credit-card ${isFlipped ? 'is-flipped' : ''}`}>
        {/* Frente do cartão */}
        <div className="credit-card-front">
          <div className="card-brand">
            {cardBrand && (
              <div className={`brand-logo ${cardBrand}`}>
                {cardBrand.toUpperCase()}
              </div>
            )}
          </div>
          
          <div className="card-chip">
            <div className="chip"></div>
          </div>
          
          <div className="card-number">
            {formatCardNumber(number)}
          </div>
          
          <div className="card-details">
            <div className="card-name">
              <div className="label">Nome do Titular</div>
              <div className="value">{formatName(name)}</div>
            </div>
            <div className="card-expiry">
              <div className="label">Validade</div>
              <div className="value">{formatExpiry(expiry)}</div>
            </div>
          </div>
        </div>

        {/* Verso do cartão */}
        <div className="credit-card-back">
          <div className="magnetic-stripe"></div>
          <div className="signature-strip">
            <div className="cvv-area">
              <span className="cvv-label">CVV</span>
              <span className="cvv-value">{cvv || '•••'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};