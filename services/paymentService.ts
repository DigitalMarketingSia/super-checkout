
import { Gateway, GatewayProvider, Order, OrderStatus, Payment, WebhookLog, OrderItem } from '../types';
import { storage } from './storageService';
import { MercadoPagoAdapter } from './adapters/MercadoPagoAdapter';
import { emailService } from './emailService';
import { getApiUrl, getBaseUrl } from '../utils/apiUtils';

// Helper for UUID generation
const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export interface ProcessPaymentRequest {
  checkoutId: string;
  offerId: string;
  amount: number;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  customerCpf?: string;
  gatewayId: string;
  paymentMethod: 'credit_card' | 'pix' | 'boleto';
  items: OrderItem[];
  customerUserId?: string; // Added for access grants
  // Card Data (Optional - only for credit_card)
  cardData?: {
    number: string;
    holderName: string;
    expiryMonth: string;
    expiryYear: string;
    cvc: string;
  };
}

export interface ProcessPaymentResult {
  success: boolean;
  orderId?: string;
  redirectUrl?: string; // Keep for backward compatibility or fallback
  message?: string;
  // Direct Response Data
  pixData?: {
    qr_code: string;
    qr_code_base64: string;
  };
  boletoData?: {
    barcode: string;
    url: string;
  };
}

/**
 * PAYMENT SERVICE LAYER
 * 
 * Responsabilidades:
 * 1. Receive standardized checkout request
 * 2. Identify selected Gateway
 * 3. Create local Order record (Pending)
 * 4. Delegate to Gateway Adapter (Mercado Pago, Stripe, etc.)
 * 5. Handle response and create Payment record
 * 6. Process Webhooks and update order status
 */
class PaymentService {
  // Adapter is now instantiated per request to support multiple accounts/dynamic keys

  async processPayment(request: ProcessPaymentRequest): Promise<ProcessPaymentResult> {
    try {
      console.log('[PaymentService] processPayment started');
      // 1. Validate Gateway
      const gateway = await storage.getPublicGateway(request.gatewayId);
      console.log('[PaymentService] Gateway fetched:', gateway ? 'Found' : 'Not Found');

      if (!gateway || !gateway.active) {
        return { success: false, message: 'Payment Gateway unavailable' };
      }

      // 2. Create Local Order (Pending)
      console.log('[PaymentService] Creating local order...');


      const newOrder: Order = {
        id: generateUUID(),
        checkout_id: request.checkoutId,
        offer_id: request.offerId === 'direct' ? undefined : request.offerId,
        amount: request.amount,
        customer_email: request.customerEmail,
        customer_name: request.customerName,
        customer_phone: request.customerPhone,
        customer_cpf: request.customerCpf,
        status: OrderStatus.PENDING,
        payment_method: request.paymentMethod,
        items: request.items,
        created_at: new Date().toISOString(),
        customer_user_id: request.customerUserId // Save user ID
      };

      // Persist Order
      // Persist Order - Only save the new order, not the entire list
      await storage.createOrder(newOrder);

      // 3. Route to Gateway Implementation
      let gatewayResponse: ProcessPaymentResult;

      switch (gateway.name) {
        case GatewayProvider.MERCADO_PAGO:
          gatewayResponse = await this.processMercadoPago(gateway, newOrder, request);
          break;
        case GatewayProvider.STRIPE:
          gatewayResponse = { success: false, message: 'Stripe not implemented yet' };
          break;
        default:
          gatewayResponse = { success: false, message: 'Unknown gateway provider' };
      }

      if (gatewayResponse.success) {
        // If payment is already approved (e.g. Credit Card), send approval email immediately
        // This is crucial for local testing where webhooks don't reach localhost

        // Check if we have a status in the response or if it's implicitly successful
        // For Mercado Pago adapter, it returns { success: true } for approved payments
        // We need to check the actual payment record or response details if available

        // Simplified check: If success and not pending (like Pix/Boleto which return specific data), assume approved
        if (!gatewayResponse.pixData && !gatewayResponse.boletoData) {
          emailService.sendPaymentApproved(newOrder).catch(console.error);

          // Grant Access immediately for credit card
          this.grantAccess(newOrder).catch(console.error);
        }

        return {
          success: true,
          orderId: newOrder.id,
          ...gatewayResponse
        };
      } else {
        // Mark order as failed if immediate failure
        // Wrap in try-catch to avoid RLS errors masking the real payment error
        try {
          await this.updateOrderStatus(newOrder.id, OrderStatus.FAILED);
        } catch (updateError) {
          console.warn('[PaymentService] Failed to update order status (likely RLS for anon user):', updateError);
        }
        return { success: false, message: gatewayResponse.message };
      }

    } catch (error: any) {
      console.error('[PaymentService] Error processing payment:', error);
      return { success: false, message: error.message || 'Payment processing failed' };
    }
  }

  // --- Gateway Adapters ---

  private async processMercadoPago(
    gateway: Gateway,
    order: Order,
    request: ProcessPaymentRequest
  ): Promise<ProcessPaymentResult> {
    // Initialize Adapter with Dynamic Credentials from DB
    if (!gateway.private_key || !gateway.public_key) {
      return { success: false, message: 'Mercado Pago credentials missing in settings' };
    }

    // Prioritize explicit API_URL, then Vercel System URL, then fallback to window origin
    const publicUrl = getBaseUrl();

    // Force the adapter to use the stable Vercel URL for the proxy to avoid custom domain issues
    // We use ?endpoint= so the adapter appends    // Use relative path to avoid CORS (Same-Origin)
    // In development, this requires a Vite proxy or will fail (but user is testing prod)
    const proxyBaseUrl = '/api/proxy?endpoint=';
    console.log('[PaymentService] Initializing Adapter with Base URL:', proxyBaseUrl);

    const mpAdapter = new MercadoPagoAdapter(gateway.private_key, {
      isProduction: false,
      baseUrl: proxyBaseUrl
    });

    try {
      const apiUrl = getApiUrl(''); // Just base API URL if needed, or use publicUrl

      let paymentMethodId = '';
      let token = undefined;

      // 1. Prepare Payment Data based on Method
      if (request.paymentMethod === 'credit_card') {
        if (!request.cardData) {
          throw new Error('Card data is required for credit card payment');
        }

        // Tokenize Card (Server-side) using the Gateway's Public Key
        token = await mpAdapter.createCardToken({
          card_number: request.cardData.number.replace(/\s/g, ''),
          expiration_month: request.cardData.expiryMonth,
          expiration_year: '20' + request.cardData.expiryYear,
          security_code: request.cardData.cvc,
          cardholder: {
            name: request.cardData.holderName
          }
        }, gateway.public_key); // Pass Public Key explicitly

        paymentMethodId = this.detectCardBrand(request.cardData.number) || 'master';
      } else if (request.paymentMethod === 'pix') {
        paymentMethodId = 'pix';
      } else if (request.paymentMethod === 'boleto') {
        paymentMethodId = 'bolbradesco';
      }

      // 2. Create Payment via Core API
      // Validate amount
      if (!order.amount || order.amount <= 0) {
        throw new Error('Invalid payment amount. Amount must be greater than zero.');
      }

      const paymentResponse = await mpAdapter.createPayment({
        transaction_amount: Number(order.amount),
        token: token,
        description: `Pedido #${order.id}`,
        installments: 1,
        payment_method_id: paymentMethodId,
        external_reference: order.customer_user_id, // Link payment to user ID for robust webhook handling
        payer: {
          email: order.customer_email,
          first_name: order.customer_name.split(' ')[0],
          last_name: order.customer_name.split(' ').slice(1).join(' '),
          identification: {
            type: 'CPF',
            number: order.customer_cpf?.replace(/\D/g, '') || ''
          }
        },
        // Only send notification_url if it's a valid public URL (not localhost)
        notification_url: window.location.hostname.includes('localhost') || window.location.hostname.includes('127.0.0.1')
          ? undefined
          : `${window.location.origin}/api/webhooks/mercadopago`
      });

      // 3. Record Payment
      const newPayment: Payment = {
        id: generateUUID(),
        order_id: order.id,
        gateway_id: gateway.id,
        status: mpAdapter.translateStatus(paymentResponse.status),
        transaction_id: paymentResponse.id.toString(),
        raw_response: JSON.stringify(paymentResponse),
        created_at: new Date().toISOString()
      };

      // Fire and forget - Don't wait for DB
      console.log('[PaymentService] Starting background save...');
      this.savePayment(newPayment)
        .then(() => console.log('[PaymentService] Background save success'))
        .catch(err => console.warn('[PaymentService] Background save failed:', err));

      console.log('[PaymentService] Proceeding to handle response immediately...');

      // 4. Handle Response
      if (paymentResponse.status === 'approved' || paymentResponse.status === 'in_process' || paymentResponse.status === 'pending') {

        if (request.paymentMethod === 'pix' && paymentResponse.point_of_interaction?.transaction_data) {
          return {
            success: true,
            pixData: {
              qr_code: paymentResponse.point_of_interaction.transaction_data.qr_code || '',
              qr_code_base64: paymentResponse.point_of_interaction.transaction_data.qr_code_base64 || ''
            }
          };
        }

        if (request.paymentMethod === 'boleto' && paymentResponse.point_of_interaction?.transaction_data) {
          const boletoData = {
            barcode: paymentResponse.point_of_interaction.transaction_data.qr_code || '',
            url: paymentResponse.point_of_interaction.transaction_data.ticket_url || ''
          };

          emailService.sendBoletoGenerated(order, boletoData.url, boletoData.barcode).catch(console.error);

          return {
            success: true,
            boletoData
          };
        }

        return { success: true };
      } else {
        return {
          success: false,
          message: paymentResponse.status_detail || 'Payment rejected'
        };
      }

    } catch (error: any) {
      console.error('[PaymentService] Mercado Pago error:', error);
      return {
        success: false,
        message: error.message || 'Failed to process with Mercado Pago'
      };
    }
  }

  private detectCardBrand(number: string): string {
    const clean = number.replace(/\D/g, '');
    if (/^4/.test(clean)) return 'visa';
    if (/^5[1-5]/.test(clean)) return 'master';
    if (/^3[47]/.test(clean)) return 'amex';
    if (/^6/.test(clean)) return 'elo';
    return 'master';
  }

  // --- Webhook Handlers ---

  async handleMercadoPagoWebhook(
    payload: any,
    xSignature: string | null,
    xRequestId: string | null
  ): Promise<{ received: boolean; processed: boolean; message?: string }> {
    try {
      // 1. Find the Active Mercado Pago Gateway to get the Secret
      const gateways = await storage.getGateways();
      const mpGateway = gateways.find(g => g.name === GatewayProvider.MERCADO_PAGO && g.active);

      if (!mpGateway || !mpGateway.webhook_secret || !mpGateway.private_key) {
        console.warn('[PaymentService] No active Mercado Pago gateway found for webhook or missing credentials');
        return { received: true, processed: false, message: 'Gateway configuration missing' };
      }

      // Initialize Adapter just for validation/translation
      const mpAdapter = new MercadoPagoAdapter(mpGateway.private_key, false);

      // 2. Validate webhook signature using the gateway's secret
      const isValid = await mpAdapter.validateWebhookSignature(
        payload,
        xSignature,
        xRequestId,
        mpGateway.webhook_secret // Pass secret explicitly
      );

      if (!isValid) {
        console.warn('[PaymentService] Invalid webhook signature');
        return { received: true, processed: false, message: 'Invalid signature' };
      }

      // 3. Parse webhook payload
      const paymentId = payload.data?.id || payload.id;
      const action = payload.action || payload.type;

      if (!paymentId) {
        return { received: true, processed: false, message: 'Missing payment ID' };
      }

      // 4. Get full payment info
      const paymentInfo = await mpAdapter.getPaymentInfo(paymentId);

      // 5. Find related payment record
      const relatedPayment = await storage.getPaymentByTransactionId(paymentId.toString());

      if (!relatedPayment) {
        console.warn('[PaymentService] Payment not found for webhook');
        return { received: true, processed: false, message: 'Payment not found' };
      }

      // 6. Translate status
      const newStatus = mpAdapter.translateStatus(paymentInfo.status);

      // 7. Update order and payment
      await this.updateOrderStatus(relatedPayment.order_id, newStatus);
      await this.updatePaymentStatus(relatedPayment.id, newStatus, paymentId);

      if (newStatus === OrderStatus.PAID) {
        const orders = await storage.getOrders();
        const order = orders.find(o => o.id === relatedPayment.order_id);
        if (order) {
          emailService.sendPaymentApproved(order).catch(console.error);
          this.grantAccess(order).catch(console.error);
        }
      }

      // 8. Log webhook
      await this.logWebhook({
        gateway_id: relatedPayment.gateway_id,
        event: action || 'payment.updated',
        payload: JSON.stringify(payload),
        processed: true
      });

      console.log(`[PaymentService] Webhook processed: ${relatedPayment.order_id} -> ${newStatus}`);

      return { received: true, processed: true };

    } catch (error: any) {
      console.error('[PaymentService] Webhook processing error:', error);

      await this.logWebhook({
        event: 'webhook.error',
        payload: JSON.stringify({ error: error.message, originalPayload: payload }),
        processed: false
      });

      return {
        received: true,
        processed: false,
        message: error.message
      };
    }
  }

  // --- Helper Methods ---

  private async grantAccess(order: Order) {
    if (!order.customer_user_id) {
      console.warn('[PaymentService] No customer user ID found for order. Cannot grant access automatically.');
      // Future: Implement email-based lookup or "claim" system
      return;
    }

    console.log('[PaymentService] Granting access for order:', order.id);

    // 1. Get all products from order items
    // Assuming order.items contains product names or we can infer.
    // Ideally order items should have product_id. 
    // But OrderItem currently only has name.
    // We need to fetch the checkout to get the main product ID.

    // Strategy:
    // Main Product: Get from Checkout
    // Bumps: We need to find them by name or ID. OrderItem doesn't have ID.
    // CRITICAL FIX: We need to know which products were bought.
    // For now, let's assume we can get the main product from the checkout.

    // Fetch Checkout to get Main Product ID
    const checkout = await storage.getPublicCheckout(order.checkout_id);
    if (!checkout) {
      console.error('[PaymentService] Checkout not found for access grant');
      return;
    }

    const productsToGrant: string[] = [checkout.product_id];

    // Handle Bumps
    // We need to match order items to bump IDs.
    // Since we don't store product_id in OrderItem, we have to rely on matching names or just assume if it's a bump type.
    // Better approach: Update OrderItem to include product_id? Too risky for now.
    // Let's iterate order items and if type is 'bump', try to find the product in checkout.order_bump_ids

    if (order.items && order.items.length > 0) {
      for (const item of order.items) {
        if (item.type === 'bump') {
          // We have to find which bump this is.
          // This is a limitation of current OrderItem structure.
          // For now, let's skip bumps or try to match by name if possible.
          // Or fetch all bumps and match name.
          if (checkout.order_bump_ids) {
            for (const bumpId of checkout.order_bump_ids) {
              const bumpProduct = await storage.getPublicProduct(bumpId);
              if (bumpProduct && bumpProduct.name === item.name) {
                productsToGrant.push(bumpId);
              }
            }
          }
        }
      }
    }

    // 2. Grant Access for each product
    for (const productId of productsToGrant) {
      // Get contents associated with this product
      const contents = await storage.getContentsByProduct(productId);

      for (const content of contents) {
        await storage.createAccessGrant({
          user_id: order.customer_user_id,
          content_id: content.id,
          product_id: productId,
          status: 'active'
        });
      }
    }
  }

  private async savePayment(payment: Payment) {
    // Use createPayment for initial save to avoid RLS issues with upsert
    await storage.createPayment(payment);
  }

  private async updateOrderStatus(orderId: string, status: OrderStatus) {
    const orders = await storage.getOrders();
    const orderToUpdate = orders.find(o => o.id === orderId);

    if (orderToUpdate) {
      await storage.saveOrders([{ ...orderToUpdate, status }]);
    }
  }

  private async updatePaymentStatus(
    paymentId: string,
    status: OrderStatus,
    transactionId?: string
  ) {
    const payments = await storage.getPayments();
    const updatedPayments = payments.map(p => {
      if (p.id === paymentId) {
        return {
          ...p,
          status,
          ...(transactionId && { transaction_id: transactionId })
        };
      }
      return p;
    });
    await storage.savePayments(updatedPayments);
  }

  private async logWebhook(data: {
    gateway_id?: string;
    event: string;
    payload: string;
    processed: boolean;
  }) {
    const newLog: WebhookLog = {
      id: `wh_${Date.now()}`,
      gateway_id: data.gateway_id,
      direction: 'incoming',
      event: data.event,
      payload: data.payload,
      raw_data: data.payload,
      processed: data.processed,
      created_at: new Date().toISOString()
    };

    const logs = await storage.getWebhookLogs();
    await storage.saveWebhookLogs([newLog, ...logs]);
  }
}

export const paymentService = new PaymentService();
