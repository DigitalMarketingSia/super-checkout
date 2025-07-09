// Status Constants
export const CHECKOUT_STATUS = {
  ACTIVE: 'active', // Updated to English
  INACTIVE: 'inactive' // Updated to English
} as const;

export const PRODUCT_TYPES = {
  MAIN: 'main',
  BUMP: 'bump'
} as const;

export const CHECKOUT_TYPES = {
  STANDARD: 'padrao'
} as const;

// Form Field Names
export const FORM_FIELDS = {
  NAME: 'name', // Updated to English
  EMAIL: 'email',
  PHONE: 'phone', // Updated to English
  CPF: 'cpf'
} as const;

// Payment Methods
export const PAYMENT_METHODS = {
  PIX: 'pix',
  CREDIT_CARD: 'credit_card', // Updated to English
  BOLETO: 'boleto'
} as const;

// Domain Status
export const DOMAIN_STATUS = {
  VERIFIED: 'verificado',
  PENDING: 'pendente'
} as const;

// Local Storage Keys
export const STORAGE_KEYS = {
  CHECKOUTS: 'checkouts_data',
  PRODUCTS: 'products_data',
  GATEWAYS: 'gateways_data',
  DOMAINS: 'domains_data'
} as const;

// Default Values
export const DEFAULT_TIMER_CONFIG = {
  enabled: false,
  durationInSeconds: 3600,
  backgroundColor: '#FF6B6B',
  text: 'Esta oferta exclusiva termina em:'
} as const;

export const DEFAULT_FORM_FIELDS = {
  name: true,
  email: true,
  phone: false,
  cpf: false
} as const;

export const DEFAULT_PAYMENT_METHODS = {
  pix: true,
  creditCard: false,
  boleto: false
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  REQUIRED_FIELDS: 'Nome do checkout e produto são obrigatórios!',
  NO_PAYMENT_METHOD: 'Selecione pelo menos um método de pagamento!',
  CHECKOUT_NOT_FOUND: 'Checkout não encontrado',
  CHECKOUT_SAVE_ERROR: 'Erro ao salvar checkout. Tente novamente.',
  CHECKOUT_LOAD_ERROR: 'Erro ao carregar dados do checkout'
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  CHECKOUT_CREATED: 'Checkout criado com sucesso!',
  CHECKOUT_UPDATED: 'Checkout atualizado com sucesso!'
} as const;

// Routes
export const ROUTES = {
  CHECKOUTS: '/checkouts',
  CHECKOUT_NEW: '/checkouts/new',
  CHECKOUT_EDIT: '/checkouts/edit',
  CHECKOUT_PUBLIC: '/checkout',
  PRODUCTS: '/products',
  GATEWAYS: '/gateways',
  DOMAIN: '/domain'
} as const;