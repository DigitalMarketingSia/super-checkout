
import { CheckoutSystemDebug } from './CheckoutSystemDebug';
import { MercadoPagoDebugAdvanced } from './MercadoPagoDebugAdvanced';
import { GatewayDebug } from './GatewayDebug';
import { PixPaymentDebug } from './PixPaymentDebug';
import { useParams } from 'react-router-dom';
import { useSupabaseGateways } from '@/hooks/useSupabaseGateways';

interface PublicCheckoutDebugProps {
  checkout?: any;
  isPaymentSystemReady: boolean;
  paymentSystemLoading: boolean;
  isSubmitting?: boolean;
  formData?: any;
  selectedPaymentMethod?: string;
  onRetryPayment?: () => void;
  debugInfo?: {
    hasPublicKey: boolean;
    hasAccessToken: boolean;
    hasMpInstance: boolean;
    publicKeyPreview?: string;
    accessTokenPreview?: string;
  };
}

export const PublicCheckoutDebug = ({ 
  checkout,
  isPaymentSystemReady, 
  paymentSystemLoading, 
  isSubmitting = false,
  formData,
  selectedPaymentMethod = '',
  onRetryPayment,
  debugInfo 
}: PublicCheckoutDebugProps) => {
  const { checkoutId } = useParams<{ checkoutId: string }>();
  const { gateways } = useSupabaseGateways();
  
  // Determinar gateway ID
  const gateway = gateways.find(g => g.type === 'mercado_pago' && g.is_active);
  const checkoutGatewayId = checkout?.gatewayId || gateway?.id || null;
  
  return (
    <div className="fixed top-4 left-4 right-4 z-50 max-w-6xl mx-auto">
      <div className="space-y-4 max-h-[90vh] overflow-y-auto">
        
        {/* Debug Principal do Sistema */}
        <CheckoutSystemDebug
          checkout={checkout}
          isPaymentSystemReady={isPaymentSystemReady}
          paymentSystemLoading={paymentSystemLoading}
          isSubmitting={isSubmitting}
          debugInfo={debugInfo}
          formData={formData}
          selectedPaymentMethod={selectedPaymentMethod}
        />

        {/* Debug Avançado do MercadoPago */}
        <MercadoPagoDebugAdvanced gatewayId={checkoutGatewayId} />

        {/* Debug de Gateway */}
        <GatewayDebug selectedGatewayId={checkoutGatewayId} />
        
        {/* Debug Específico do PIX */}
        {selectedPaymentMethod === 'pix' && (
          <PixPaymentDebug 
            formData={formData}
            selectedPaymentMethod={selectedPaymentMethod}
            onRetryPayment={onRetryPayment}
          />
        )}
        
      </div>
    </div>
  );
};
