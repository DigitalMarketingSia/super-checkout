
// Core Entities

export enum PaymentType {
  ONE_TIME = 'one_time',
  RECURRING = 'recurring',
  FREE = 'free',
}

export enum RecurrenceType {
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
  NONE = 'none',
}

export enum GatewayProvider {
  MERCADO_PAGO = 'mercado_pago',
  STRIPE = 'stripe', // Future
  PIX = 'pix',       // Native/Manual
}

export enum OrderStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
  CANCELED = 'canceled',
  REFUNDED = 'refunded'
}

export enum DomainStatus {
  ACTIVE = 'active',
  PENDING = 'pending',
  VERIFYING = 'verifying',
  ERROR = 'error'
}

export enum DomainType {
  CNAME = 'cname',
  REDIRECT = 'redirect'
}

export interface Product {
  id: string;
  name: string;
  description: string;
  active: boolean;
  imageUrl?: string;
  // New fields for UI Overhaul
  price_real?: number;    // Preço "Por"
  price_fake?: number;    // Preço "De"
  sku?: string;           // Código
  category?: string;
  redirect_link?: string;
  is_order_bump?: boolean;
  is_upsell?: boolean;
}

export interface Offer {
  id: string;
  product_id: string;
  name: string;
  price: number;
  payment_type: PaymentType;
  recurrence_type: RecurrenceType;
  active: boolean;
}

export interface Domain {
  id: string;
  domain: string; // ex: checkout.meusite.com
  checkout_id?: string; // Checkout padrão vinculado (opcional)
  slug?: string; // Slug padrão
  type: DomainType;
  status: DomainStatus;
  created_at: string;
}

export interface CheckoutConfig {
  fields: {
    name: boolean;
    email: boolean;
    phone: boolean;
    cpf: boolean;
  };
  payment_methods: {
    pix: boolean;
    credit_card: boolean;
    boleto: boolean;
  };
  timer: {
    active: boolean;
    minutes: number;
    bg_color: string;
    text_color: string;
  };
  header_image?: string;
  primary_color?: string;
}

export interface Checkout {
  id: string;
  name: string;
  active: boolean;

  // Relations
  product_id: string; // Main product directly linked
  offer_id?: string; // Optional: legacy or specific offer
  gateway_id: string;
  domain_id?: string | null;

  // Sales Strategy
  order_bump_ids: string[]; // List of product IDs
  upsell_product_id?: string; // One click upsell product ID

  // URL
  custom_url_slug: string;

  // Visual & Behavior Config
  config: CheckoutConfig;
}

export interface Gateway {
  id: string;
  name: GatewayProvider;
  public_key: string;
  private_key: string; // Stored but usually not sent to frontend in real app
  webhook_secret: string;
  active: boolean;
}

export interface OrderItem {
  name: string;
  price: number;
  quantity: number;
  type: 'main' | 'bump' | 'upsell';
}

export interface Order {
  id: string;
  offer_id: string;
  checkout_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string; // Added for CRM
  customer_cpf?: string;   // Added for CRM
  amount: number;
  status: OrderStatus;
  payment_method: 'credit_card' | 'pix' | 'boleto'; // Added for CRM
  items?: OrderItem[]; // Added for details
  created_at: string;
}

export interface Payment {
  id: string;
  order_id: string;
  gateway_id: string;
  status: OrderStatus;
  transaction_id: string;
  raw_response: string;
  created_at: string;
  user_id?: string; // Merchant ID for RLS
}

export interface WebhookHeader {
  key: string;
  value: string;
}

export interface WebhookConfig {
  id: string;
  name: string;
  description?: string;
  url: string;
  method: 'POST' | 'GET' | 'PUT' | 'PATCH';
  headers: WebhookHeader[];
  events: string[]; // e.g., 'checkout.completed', 'payment.failed'
  active: boolean;
  secret?: string;
  created_at: string;
  last_fired_at?: string;
  last_status?: number; // 200, 400, 500
}

export interface WebhookLog {
  id: string;
  webhook_id?: string; // If outgoing
  gateway_id?: string; // If incoming
  direction: 'incoming' | 'outgoing';
  event: string;
  payload: string; // Request body
  response_status?: number;
  response_body?: string;
  duration_ms?: number;
  created_at: string;
  processed?: boolean; // Legacy for incoming
  raw_data?: string; // Legacy for incoming
}

// API / Service Responses
export interface PaymentResponse {
  success: boolean;
  transactionId?: string;
  redirectUrl?: string;
  qrCode?: string;
  error?: string;
}

export interface Integration {
  id: string;
  name: string;
  config: any;
  active: boolean;
  created_at: string;
}