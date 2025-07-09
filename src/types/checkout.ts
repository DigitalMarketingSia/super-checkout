export interface CustomerFormData {
  nome: string;
  email: string;
  telefone: string;
  cpf: string;
}

export interface CreditCardData {
  numero: string;
  nome: string;
  cpf: string;
  validade: string;
  cvv: string;
}

export interface CheckoutUIState {
  loading: boolean;
  selectedPaymentMethod: string;
  selectedOrderBumps: string[];
  selectedInstallments: number;
}

export interface OrderBumpItem {
  id: string;
  name: string;
  description: string;
  price: number;
}

export interface FooterConfig {
  textoIntrodutorio: string;
  emailSuporte: string;
  textoSeguranca: string;
  linkTermosCompra: string;
  linkPoliticaPrivacidade: string;
  textoCopyright: string;
  exibirInformacoesLegais: boolean;
}

export type PaymentMethodType = 'pix' | 'credit_card' | 'boleto';
export type CheckoutStatusType = 'ativo' | 'inativo';
export type ProductType = 'main' | 'bump';