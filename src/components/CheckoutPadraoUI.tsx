
import { useState, useEffect } from 'react';
import { OrderCalculationResult } from '../core/checkoutEngine';
import { Timer } from './Timer';
import { ShieldCheck } from 'lucide-react';
import { PaymentMethods } from './checkout/PaymentMethods';
import { CreditCardSection } from './checkout/CreditCardSection';
import { PixSection } from './checkout/PixSection';
import { BoletoSection } from './checkout/BoletoSection';
import { OrderBumpsSection } from './checkout/OrderBumpsSection';
import { OrderSummarySection } from './checkout/OrderSummarySection';
import { ValidatedInput } from './form/ValidatedInput';
import { FooterConfig } from '@/types/checkout';
import '../styles/CheckoutPadrao.css';

interface CheckoutPadraoUIProps {
  // Dados do produto
  productName: string;
  productPrice: number;
  productOriginalPrice?: number;
  productImage: string;

  // Order Bumps
  orderBumps: Array<{
    id: string;
    name: string;
    description: string;
    price: number;
    image?: string;
  }>;
  selectedOrderBumps: string[];
  onOrderBumpToggle: (bumpId: string) => void;

  // Métodos de pagamento
  selectedPaymentMethod: string;
  onPaymentMethodSelect: (method: string) => void;
  allowedPaymentMethods: string[];

  // Configurações do formulário
  requiredFormFields: string[];
  formData: {
    nome: string;
    email: string;
    telefone: string;
    cpf: string;
  };
  onFormDataChange: (field: string, value: string) => void;

  // Dados do cartão
  creditCardData: {
    numero: string;
    nome: string;
    cpf: string;
    validade: string;
    cvv: string;
  };
  onCreditCardDataChange: (field: string, value: string) => void;

  // Parcelamento
  selectedInstallments: number;
  onInstallmentsChange: (installments: number) => void;

  // Cálculos (vem do motor)
  orderCalculation: OrderCalculationResult | null;

  // Estados de UI
  isSubmitting?: boolean;
  paymentError?: string | null;
  onClearPaymentError?: () => void;

  // Configurações opcionais
  bannerUrl?: string;
  headerImageUrl?: string;
  timerConfig?: {
    enabled: boolean;
    durationInSeconds: number;
    backgroundColor: string;
    text: string;
  };
  footerConfig?: FooterConfig;

  // Callbacks
  onSubmit: (e: React.FormEvent) => void;
}

export const CheckoutPadraoUI = ({
  productName,
  productPrice,
  productOriginalPrice,
  productImage,
  orderBumps,
  selectedOrderBumps,
  onOrderBumpToggle,
  selectedPaymentMethod,
  onPaymentMethodSelect,
  allowedPaymentMethods,
  requiredFormFields,
  formData,
  onFormDataChange,
  creditCardData,
  onCreditCardDataChange,
  selectedInstallments,
  onInstallmentsChange,
  orderCalculation,
  isSubmitting = false,
  paymentError,
  onClearPaymentError,
  bannerUrl,
  headerImageUrl,
  timerConfig,
  footerConfig,
  onSubmit
}: CheckoutPadraoUIProps) => {
  const [timeLeft, setTimeLeft] = useState(11 * 60 + 28); // 11:28 em segundos

  // Timer countdown
  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [timeLeft]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  // Verificar se deve mostrar order bumps (REGRA DE NEGÓCIO)
  const shouldShowOrderBumps = selectedPaymentMethod !== '';

  return (
    <div className="checkout-padrao-container">
      {/* Timer customizável */}
      {timerConfig?.enabled && (
        <Timer 
          durationInSeconds={timerConfig.durationInSeconds}
          backgroundColor={timerConfig.backgroundColor}
          text={timerConfig.text}
        />
      )}

      {/* Imagem de cabeçalho */}
      {headerImageUrl && (
        <div className="w-full mb-6">
          <img 
            src={headerImageUrl} 
            alt="Cabeçalho do checkout"
            className="w-full max-w-2xl mx-auto rounded-lg shadow-lg"
            style={{ maxHeight: '300px', objectFit: 'cover' }}
          />
        </div>
      )}

      {/* Banner opcional */}
      {bannerUrl && (
        <div className="checkout-padrao-hero">
          <img 
            src={bannerUrl} 
            alt="Banner do checkout"
            className="checkout-padrao-hero-image"
          />
        </div>
      )}

      <div className="checkout-padrao-content">
        <div className="checkout-padrao-main-layout">
          {/* Card do produto */}
          <div className="checkout-padrao-product-card">
            <div className="checkout-padrao-product-info">
              <img 
                src={productImage} 
                alt={productName}
                className="checkout-padrao-product-image"
              />
              <div className="checkout-padrao-product-details">
                <h2 className="checkout-padrao-product-title">{productName}</h2>
                <div className="checkout-padrao-product-pricing">
                  <div className="checkout-padrao-discount-display">
                    {productOriginalPrice && productOriginalPrice > productPrice && (
                      <div className="checkout-padrao-original-price">
                        De {formatPrice(productOriginalPrice)} por
                      </div>
                    )}
                    <div className="checkout-padrao-current-price">
                      {formatPrice(productPrice)}
                    </div>
                    <div className="checkout-padrao-payment-info">
                      {selectedInstallments === 1 ? (
                        'à vista'
                      ) : (
                        `em até ${selectedInstallments}x de ${formatPrice(productPrice / selectedInstallments)}`
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Formulário */}
          <form onSubmit={onSubmit} className="checkout-padrao-form">
            {/* Campos do formulário - Renderização condicional baseada em requiredFormFields */}
            <div className="checkout-padrao-form-row">
              {requiredFormFields.includes('name') && (
                <ValidatedInput
                  type="text"
                  placeholder="Seu nome completo"
                  value={formData.nome}
                  onChange={(value) => onFormDataChange('nome', value)}
                  className="checkout-padrao-input"
                  required
                />
              )}
              {requiredFormFields.includes('email') && (
                <ValidatedInput
                  type="email"
                  placeholder="Seu melhor e-mail"
                  value={formData.email}
                  onChange={(value) => onFormDataChange('email', value)}
                  className="checkout-padrao-input"
                  required
                />
              )}
            </div>

            {(requiredFormFields.includes('phone') || requiredFormFields.includes('cpf')) && (
              <div className="checkout-padrao-form-row">
                {requiredFormFields.includes('phone') && (
                  <ValidatedInput
                    type="tel"
                    placeholder="DDD + Celular"
                    value={formData.telefone}
                    onChange={(value) => onFormDataChange('telefone', value)}
                    className="checkout-padrao-input"
                    required
                  />
                )}
                {requiredFormFields.includes('cpf') && (
                  <ValidatedInput
                    type="cpf"
                    placeholder="CPF/CNPJ"
                    value={formData.cpf}
                    onChange={(value) => onFormDataChange('cpf', value)}
                    className="checkout-padrao-input"
                    required
                  />
                )}
              </div>
            )}

            {/* Métodos de Pagamento */}
            <PaymentMethods
              allowedPaymentMethods={allowedPaymentMethods}
              selectedPaymentMethod={selectedPaymentMethod}
              onPaymentMethodSelect={onPaymentMethodSelect}
            />

            {/* Campos do Cartão de Crédito */}
            {selectedPaymentMethod === 'credit_card' && (
              <>
                <CreditCardSection
                  creditCardData={creditCardData}
                  onCreditCardDataChange={onCreditCardDataChange}
                  selectedInstallments={selectedInstallments}
                  onInstallmentsChange={onInstallmentsChange}
                  orderCalculation={orderCalculation}
                  productPrice={productPrice}
                />
                
                {/* Erro de Pagamento */}
                {paymentError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs font-bold">!</span>
                        </div>
                      </div>
                      <div className="ml-3 flex-1">
                        <h3 className="text-sm font-medium text-red-800">
                          Erro no Pagamento
                        </h3>
                        <p className="text-sm text-red-700 mt-1">
                          {paymentError}
                        </p>
                        {onClearPaymentError && (
                          <button
                            type="button"
                            onClick={onClearPaymentError}
                            className="text-red-600 hover:text-red-800 text-sm underline mt-2"
                          >
                            Tentar novamente
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Instruções do PIX */}
            {selectedPaymentMethod === 'pix' && <PixSection />}

            {/* Instruções do Boleto */}
            {selectedPaymentMethod === 'boleto' && (
              <BoletoSection
                orderCalculation={orderCalculation}
                productPrice={productPrice}
              />
            )}

            {/* Order Bumps - EXIBIÇÃO CONDICIONAL */}
            {shouldShowOrderBumps && orderBumps.length > 0 && (
              <OrderBumpsSection
                orderBumps={orderBumps}
                selectedOrderBumps={selectedOrderBumps}
                onOrderBumpToggle={onOrderBumpToggle}
              />
            )}

            {/* Resumo do valor total */}
            {orderCalculation && selectedOrderBumps.length > 0 && (
              <OrderSummarySection
                orderCalculation={orderCalculation}
                selectedPaymentMethod={selectedPaymentMethod}
                selectedInstallments={selectedInstallments}
              />
            )}

            {/* Botão de Finalizar */}
            <button 
              type="submit"
              className="checkout-padrao-submit"
              disabled={!selectedPaymentMethod || isSubmitting}
              onClick={(e) => {
                console.log('🔥 BOTÃO CLICADO!', { 
                  selectedPaymentMethod, 
                  isSubmitting,
                  formValid: formData.nome && formData.email 
                });
                // Não prevenir o default para permitir o submit do form
              }}
            >
              {isSubmitting 
                ? '🔄 PROCESSANDO...'
                : `FINALIZAR PAGAMENTO - ${orderCalculation ? formatPrice(orderCalculation.totalFinal) : formatPrice(productPrice)}`
              }
            </button>
          </form>
        </div>
      </div>

      {/* Footer customizável */}
      {footerConfig && (
        <footer className="bg-gray-50 border-t border-gray-200 py-6 mt-8">
          <div className="max-w-4xl mx-auto px-4">
            <div className="text-center text-xs leading-relaxed space-y-2">
              <p style={{ color: '#7F7F7F' }}>
                {footerConfig.textoIntrodutorio}{' '}
                <a 
                  href={`mailto:${footerConfig.emailSuporte}`}
                  style={{ color: '#424242', fontWeight: 'bold' }}
                  className="hover:underline"
                >
                  {footerConfig.emailSuporte}
                </a>
                .
              </p>
              
              <p className="flex items-center justify-center text-green-500 font-bold">
                <ShieldCheck className="w-4 h-4 mr-2" />
                {footerConfig.textoSeguranca.replace('🔒 ', '')}
              </p>
              
              <div className="py-1"></div>
              
              <p style={{ color: '#7F7F7F' }}>
                Valores parcelados possuem acréscimo ao mês.
              </p>
              
              {footerConfig.exibirInformacoesLegais && footerConfig.linkTermosCompra && footerConfig.linkPoliticaPrivacidade && (
                <p style={{ color: '#7F7F7F' }}>
                  Ao realizar a compra, você concorda com os{' '}
                  <a 
                    href={footerConfig.linkTermosCompra}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#424242', fontWeight: 'bold' }}
                    className="hover:underline"
                  >
                    Termos de Compra
                  </a>
                  {' '}e nossa{' '}
                  <a 
                    href={footerConfig.linkPoliticaPrivacidade}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#424242', fontWeight: 'bold' }}
                    className="hover:underline"
                  >
                    Política de Privacidade
                  </a>
                  .
                </p>
              )}
              
              <p style={{ color: '#424242', fontWeight: 'bold' }}>
                {footerConfig.textoCopyright}
              </p>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
};
