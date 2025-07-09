import { OrderCalculationResult } from '@/core/checkoutEngine';
import { InteractiveCreditCard } from './InteractiveCreditCard';

interface CreditCardSectionProps {
  creditCardData: {
    numero: string;
    nome: string;
    cpf: string;
    validade: string;
    cvv: string;
  };
  onCreditCardDataChange: (field: string, value: string) => void;
  selectedInstallments: number;
  onInstallmentsChange: (installments: number) => void;
  orderCalculation: OrderCalculationResult | null;
  productPrice: number;
}

export const CreditCardSection = ({
  creditCardData,
  onCreditCardDataChange,
  selectedInstallments,
  onInstallmentsChange,
  orderCalculation,
  productPrice
}: CreditCardSectionProps) => {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  const handleCvvFocus = () => {
    // Ativa a animação de flip do cartão imediatamente ao clicar
    const cardElement = document.querySelector('.credit-card');
    if (cardElement) {
      cardElement.classList.add('is-flipped');
    }
  };

  const handleCvvBlur = () => {
    // Desativa a animação de flip do cartão ao sair do campo
    const cardElement = document.querySelector('.credit-card');
    if (cardElement) {
      cardElement.classList.remove('is-flipped');
    }
  };

  return (
    <div className="checkout-padrao-credit-card-section">
      <div className="flex flex-col md:flex-row gap-6 items-start">
        {/* Formulário */}
        <div className="flex-1 w-full">
          <div className="checkout-padrao-credit-card-fields grid gap-3">
            <input
              type="text"
              placeholder="Número do cartão"
              value={creditCardData.numero}
              onChange={(e) => {
                // Formatação automática do número do cartão
                let value = e.target.value.replace(/\s/g, ''); // Remove espaços
                value = value.replace(/[^0-9]/g, ''); // Remove caracteres não numéricos
                value = value.replace(/(.{4})/g, '$1 ').trim(); // Adiciona espaço a cada 4 dígitos
                if (value.length <= 19) { // Máximo 16 dígitos + 3 espaços
                  onCreditCardDataChange('numero', value);
                }
              }}
              className="checkout-padrao-input"
              maxLength={19}
            />

            <input
              type="text"
              placeholder="Nome do titular"
              value={creditCardData.nome}
              onChange={(e) => onCreditCardDataChange('nome', e.target.value)}
              className="checkout-padrao-input"
            />

            <input
              type="text"
              placeholder="CPF do titular"
              value={creditCardData.cpf}
              onChange={(e) => {
                // Formatação automática do CPF
                let value = e.target.value.replace(/\D/g, ''); // Remove não-dígitos
                value = value.replace(/(\d{3})(\d)/, '$1.$2');
                value = value.replace(/(\d{3})(\d)/, '$1.$2');
                value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
                onCreditCardDataChange('cpf', value);
              }}
              className="checkout-padrao-input"
              maxLength={14}
            />

            <div className="flex gap-3">
              <input
                type="text"
                placeholder="Validade MM/AA"
                value={creditCardData.validade}
                onChange={(e) => {
                  // Formatação automática da validade
                  let value = e.target.value.replace(/\D/g, ''); // Remove não-dígitos
                  if (value.length >= 2) {
                    value = value.replace(/(\d{2})(\d)/, '$1/$2');
                  }
                  if (value.length <= 5) {
                    onCreditCardDataChange('validade', value);
                  }
                }}
                className="checkout-padrao-input w-1/2"
                maxLength={5}
              />
              <input
                type="text"
                placeholder="CVV"
                value={creditCardData.cvv}
                onChange={(e) => {
                  // Permite apenas números
                  const value = e.target.value.replace(/\D/g, '');
                  onCreditCardDataChange('cvv', value);
                }}
                onFocus={handleCvvFocus}
                onBlur={handleCvvBlur}
                className="checkout-padrao-input w-1/2"
                maxLength={4}
              />
            </div>

            {/* Parcelamento */}
            <div className="checkout-padrao-installments mt-2">
              <h4 className="mb-1 text-sm font-medium">Condição de pagamento</h4>
              <select 
                value={selectedInstallments}
                onChange={(e) => onInstallmentsChange(Number(e.target.value))}
                className="checkout-padrao-installment-select w-full"
              >
                {[...Array(12)].map((_, i) => {
                  const installment = i + 1;
                  return (
                    <option key={installment} value={installment}>
                      {installment}x de {orderCalculation
                        ? formatPrice(orderCalculation.totalFinal / installment)
                        : formatPrice(productPrice / installment)}
                      {installment === 1 && ' (à vista)'}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>
        </div>

        {/* Cartão Interativo */}
        <div className="w-full md:w-[400px] flex justify-center">
          <InteractiveCreditCard
            number={creditCardData.numero}
            name={creditCardData.nome}
            expiry={creditCardData.validade}
            cvv={creditCardData.cvv}
            onCvvFocus={handleCvvFocus}
            onCvvBlur={handleCvvBlur}
          />
        </div>
      </div>
    </div>
  );
};