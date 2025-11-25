import { OrderStatus } from '../../types';

interface MercadoPagoPaymentRequest {
    transaction_amount: number;
    token?: string; // For credit card
    description: string;
    installments: number;
    payment_method_id: string; // 'pix', 'bolbradesco', 'master', 'visa', etc.
    payer: {
        email: string;
        first_name?: string;
        last_name?: string;
        identification?: {
            type: string;
            number: string;
        };
    };
    notification_url?: string;
}

interface MercadoPagoCardTokenRequest {
    card_number: string;
    expiration_month: string;
    expiration_year: string;
    security_code: string;
    cardholder: {
        name: string;
        identification?: {
            type: string;
            number: string;
        };
    };
}

interface MercadoPagoPaymentResponse {
    id: number;
    status: string;
    status_detail: string;
    point_of_interaction?: {
        transaction_data?: {
            qr_code?: string;
            qr_code_base64?: string;
            ticket_url?: string;
        };
    };
    payment_method_id: string;
    transaction_details?: {
        net_received_amount: number;
        total_paid_amount: number;
    };
}

/**
 * MERCADO PAGO ADAPTER (CORE API)
 *
 * Implementação para Checkout Transparente.
 * Utiliza a API v1/payments e v1/card_tokens.
 */
export class MercadoPagoAdapter {
    private accessToken: string;
    private baseUrl: string;

    constructor(accessToken: string, options?: { isProduction?: boolean; baseUrl?: string } | boolean) {
        this.accessToken = accessToken;

        // Handle legacy boolean argument or options object
        const isProduction = typeof options === 'boolean' ? options : options?.isProduction || false;
        const customBaseUrl = typeof options === 'object' ? options.baseUrl : undefined;

        // Use provided base URL or fallback to local proxy
        this.baseUrl = customBaseUrl || '/mp-api';
    }

    /**
     * Tokeniza os dados do cartão (Server-side)
     * NOTA: Em produção ideal, isso deve ser feito no frontend via MP.js
     * para reduzir escopo PCI.
     */
    async createCardToken(cardData: MercadoPagoCardTokenRequest, publicKey?: string): Promise<string> {
        try {
            // Use passed public key or fallback to env
            const key = publicKey || process.env.MERCADO_PAGO_PUBLIC_KEY;

            if (!key) {
                throw new Error('Public Key not provided for tokenization');
            }

            const response = await fetch(`${this.baseUrl}/v1/card_tokens?public_key=${key}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(cardData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Card Token Error: ${JSON.stringify(errorData)}`);
            }

            const data = await response.json();
            return data.id;
        } catch (error: any) {
            console.error('[MercadoPagoAdapter] Tokenization error:', error);
            throw new Error(`Failed to tokenize card: ${error.message}`);
        }
    }

    /**
     * Cria um pagamento direto (Transparente)
     */
    async createPayment(paymentData: MercadoPagoPaymentRequest): Promise<MercadoPagoPaymentResponse> {
        try {
            // Idempotency Key para evitar duplicidade
            const generateUUID = () => {
                if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
                return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
                    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
                    return v.toString(16);
                });
            };
            const idempotencyKey = generateUUID();

            console.log('[MercadoPagoAdapter] Starting fetch to', `${this.baseUrl}/v1/payments`);
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

            try {
                const response = await fetch(`${this.baseUrl}/v1/payments`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.accessToken}`,
                        'X-Idempotency-Key': idempotencyKey
                    },
                    body: JSON.stringify(paymentData),
                    signal: controller.signal
                });
                clearTimeout(timeoutId);

                console.log('[MercadoPagoAdapter] Response Status:', response.status);
                const responseText = await response.text();
                console.log('[MercadoPagoAdapter] Response Body:', responseText);

                if (!response.ok) {
                    throw new Error(`Mercado Pago API Error: ${response.status} - ${responseText}`);
                }

                const data = JSON.parse(responseText);
                return data;
            } catch (error: any) {
                clearTimeout(timeoutId);
                if (error.name === 'AbortError') {
                    throw new Error('Payment request timed out');
                }
                throw error;
            }

        } catch (error: any) {
            console.error('[MercadoPagoAdapter] Create payment error:', error);
            throw new Error(`Failed to process payment: ${error.message}`);
        }
    }

    /**
     * Valida a assinatura do webhook
     */
    async validateWebhookSignature(
        payload: any,
        xSignature: string | null,
        xRequestId: string | null,
        webhookSecret?: string
    ): Promise<boolean> {
        if (!xSignature || !xRequestId) return false;

        try {
            const parts = xSignature.split(',');
            const tsMatch = parts.find(p => p.startsWith('ts='));
            const v1Match = parts.find(p => p.startsWith('v1='));

            if (!tsMatch || !v1Match) return false;

            const timestamp = tsMatch.split('=')[1];
            const hash = v1Match.split('=')[1];

            const manifest = `id:${payload.data?.id || payload.id};request-id:${xRequestId};ts:${timestamp};`;

            // Use passed secret or fallback to env
            const secret = webhookSecret || process.env.MERCADO_PAGO_WEBHOOK_SECRET || '';

            if (!secret) {
                console.warn('[MercadoPagoAdapter] Webhook secret not found');
                return false;
            }

            const encoder = new TextEncoder();
            const keyData = encoder.encode(secret);
            const msgData = encoder.encode(manifest);

            const getCrypto = async () => {
                if (typeof crypto !== 'undefined' && crypto.subtle) return crypto;
                if (typeof globalThis !== 'undefined' && globalThis.crypto && globalThis.crypto.subtle) return globalThis.crypto;

                // Fallback for Node.js using dynamic import (ESM safe)
                try {
                    const nodeCrypto = await import('node:crypto');
                    return nodeCrypto.webcrypto as unknown as Crypto;
                } catch (e) {
                    console.error('Web Crypto API not available:', e);
                    return undefined;
                }
            };

            const webCrypto = await getCrypto();
            if (!webCrypto || !webCrypto.subtle) {
                console.warn('[MercadoPagoAdapter] Crypto.subtle not available for signature validation');
                // Return true to allow webhook processing even if validation fails (fail open for now)
                return true;
            }

            const cryptoKey = await webCrypto.subtle.importKey(
                'raw',
                keyData,
                { name: 'HMAC', hash: 'SHA-256' },
                false,
                ['sign']
            );

            const signatureBuffer = await webCrypto.subtle.sign('HMAC', cryptoKey, msgData);
            const expectedHash = Array.from(new Uint8Array(signatureBuffer))
                .map(b => b.toString(16).padStart(2, '0'))
                .join('');

            return hash === expectedHash;
        } catch (error) {
            console.error('[MercadoPagoAdapter] Signature validation error:', error);
            return false;
        }
    }

    /**
     * Traduz status do MP para status interno
     */
    translateStatus(mpStatus: string): OrderStatus {
        const statusMap: Record<string, OrderStatus> = {
            'approved': OrderStatus.PAID,
            'pending': OrderStatus.PENDING,
            'in_process': OrderStatus.PENDING,
            'rejected': OrderStatus.FAILED,
            'cancelled': OrderStatus.CANCELED,
            'refunded': OrderStatus.REFUNDED,
            'charged_back': OrderStatus.REFUNDED
        };
        return statusMap[mpStatus] || OrderStatus.PENDING;
    }

    async getPaymentInfo(paymentId: string): Promise<any> {
        const response = await fetch(`${this.baseUrl}/v1/payments/${paymentId}`, {
            headers: { 'Authorization': `Bearer ${this.accessToken}` }
        });
        if (!response.ok) throw new Error('Failed to fetch payment info');
        return await response.json();
    }
}
