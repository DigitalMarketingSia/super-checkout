import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Globe } from 'lucide-react';
import { DOMAIN_STATUS } from '@/constants';

interface CustomDomain {
  id: string;
  hostname: string;
  status: string;
}

interface DomainSelectionProps {
  domainId: string | null;
  customDomain: CustomDomain | null;
  onDomainChange: (value: string | null) => void;
}

export const DomainSelection = ({
  domainId,
  customDomain,
  onDomainChange
}: DomainSelectionProps) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <Globe className="h-5 w-5 text-blue-400" />
        <h3 className="text-lg font-medium text-white">Domínio do Checkout</h3>
      </div>
      
      <div className="space-y-2">
        <Label className="text-gray-300">Escolha o domínio para este checkout</Label>
        <Select 
          value={domainId || 'default'} 
          onValueChange={(value) => onDomainChange(value === 'default' ? null : value)}
        >
          <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
            <SelectValue placeholder="Selecione um domínio" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default">
              🌐 Domínio Padrão (supercheckout.app)
            </SelectItem>
            {customDomain && customDomain.status === DOMAIN_STATUS.VERIFIED && (
              <SelectItem value={customDomain.id}>
                ✅ {customDomain.hostname}
              </SelectItem>
            )}
            {customDomain && customDomain.status === DOMAIN_STATUS.PENDING && (
              <SelectItem value={customDomain.id} disabled>
                ⏳ {customDomain.hostname} (Verificando...)
              </SelectItem>
            )}
          </SelectContent>
        </Select>
        {!customDomain && (
          <p className="text-sm text-gray-400">
            Configure um domínio personalizado na página "Domínio" para ter mais opções.
          </p>
        )}
      </div>
    </div>
  );
};