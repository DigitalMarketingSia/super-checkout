
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface CheckoutBasicSettingsProps {
  name: string;
  onNameChange: (value: string) => void;
}

export const CheckoutBasicSettings = ({
  name,
  onNameChange
}: CheckoutBasicSettingsProps) => {
  return (
    <div className="space-y-2">
      <Label className="text-gray-300">Nome do Checkout</Label>
      <Input 
        placeholder="Ex: Checkout Padrão"
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
        className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
      />
    </div>
  );
};
