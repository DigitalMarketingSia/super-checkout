import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Zap } from 'lucide-react';

interface Gateway {
  id: string;
  name: string;
}

interface GatewaySelectionProps {
  gatewayId: string | null;
  connectedGateways: Gateway[];
  onGatewayChange: (value: string | null) => void;
}

export const GatewaySelection = ({
  gatewayId,
  connectedGateways,
  onGatewayChange
}: GatewaySelectionProps) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <Zap className="h-5 w-5 text-violet-400" />
        <h3 className="text-lg font-medium text-white">Processador de Pagamento</h3>
      </div>
      
      <div className="space-y-2">
        <Label className="text-gray-300">Gateway de Pagamento</Label>
        <Select 
          value={gatewayId || 'none'} 
          onValueChange={(value) => onGatewayChange(value === 'none' ? null : value)}
        >
          <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
            <SelectValue placeholder="Selecione um gateway" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">
              🔧 Simulação (Padrão)
            </SelectItem>
            {connectedGateways.map((gateway) => (
              <SelectItem key={gateway.id} value={gateway.id}>
                ✅ {gateway.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {connectedGateways.length === 0 && (
          <p className="text-sm text-gray-400">
            Configure um gateway na página "Gateways" para processar pagamentos reais.
          </p>
        )}
      </div>
    </div>
  );
};