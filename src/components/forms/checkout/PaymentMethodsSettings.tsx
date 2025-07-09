import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { CreditCard } from 'lucide-react';
import { PAYMENT_METHODS } from '@/constants';

interface PaymentMethodsConfig {
  pix: boolean;
  creditCard: boolean;
  boleto: boolean;
}

interface PaymentMethodsSettingsProps {
  paymentMethods: PaymentMethodsConfig;
  onPaymentMethodChange: (method: keyof PaymentMethodsConfig, checked: boolean) => void;
}

export const PaymentMethodsSettings = ({
  paymentMethods,
  onPaymentMethodChange
}: PaymentMethodsSettingsProps) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-white">Métodos de Pagamento</h3>
      
      <div className="space-y-3">
        <div className="flex items-center justify-between bg-gray-700 p-4 rounded-lg">
          <div className="flex items-center space-x-3">
            <div className="h-4 w-4 bg-blue-500 rounded"></div>
            <Label className="text-gray-300">PIX</Label>
          </div>
          <Switch 
            checked={paymentMethods.pix} 
            onCheckedChange={(checked) => onPaymentMethodChange('pix', checked)}
          />
        </div>

        <div className="flex items-center justify-between bg-gray-700 p-4 rounded-lg">
          <div className="flex items-center space-x-3">
            <CreditCard className="h-4 w-4 text-gray-400" />
            <Label className="text-gray-300">Cartão de Crédito</Label>
          </div>
          <Switch 
            checked={paymentMethods.creditCard} 
            onCheckedChange={(checked) => onPaymentMethodChange('creditCard', checked)}
          />
        </div>

        <div className="flex items-center justify-between bg-gray-700 p-4 rounded-lg">
          <div className="flex items-center space-x-3">
            <div className="h-4 w-4 bg-orange-500 rounded"></div>
            <Label className="text-gray-300">Boleto</Label>
          </div>
          <Switch 
            checked={paymentMethods.boleto} 
            onCheckedChange={(checked) => onPaymentMethodChange('boleto', checked)}
          />
        </div>
      </div>
    </div>
  );
};