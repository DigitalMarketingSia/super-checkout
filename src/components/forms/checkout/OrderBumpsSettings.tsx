
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Gift } from 'lucide-react';
import { Product } from '@/api/mockDatabase';
import { EmptyOrderBumpsState } from '@/components/ui/empty-state';

interface OrderBumpsSettingsProps {
  hasOrderBumps: boolean;
  selectedOrderBumps: string[];
  products: Product[];
  onToggleOrderBumps: (checked: boolean) => void;
  onOrderBumpToggle: (productId: string, checked: boolean) => void;
}

export const OrderBumpsSettings = ({
  hasOrderBumps,
  selectedOrderBumps,
  products,
  onToggleOrderBumps,
  onOrderBumpToggle
}: OrderBumpsSettingsProps) => {
  // Filtrar produtos que podem ser order bumps (todos exceto principais)
  // No Supabase, usar is_orderbump ou mostrar todos os produtos disponíveis
  const orderBumpProducts = products.filter(p => 
    p.type === 'bump' || // Mock data format
    (p as any).is_orderbump === true || // Supabase format
    (!p.type && !(p as any).is_principal) // Fallback: produtos que não são principais
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <Gift className="h-5 w-5 text-gray-400" />
        <h3 className="text-lg font-medium text-white">OrderBumps</h3>
      </div>
      
      <div className="flex items-center justify-between bg-gray-700 p-4 rounded-lg">
        <Label className="text-gray-300">Ativar OrderBumps</Label>
        <Switch 
          checked={hasOrderBumps} 
          onCheckedChange={onToggleOrderBumps}
        />
      </div>

      {hasOrderBumps && (
        <div className="bg-gray-700 p-4 rounded-lg space-y-4">
          <h4 className="text-white font-medium">Selecionar OrderBumps</h4>
          {orderBumpProducts.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-400 mb-2">Nenhum Order Bump disponível</div>
              <div className="text-sm text-gray-500">
                Crie produtos do tipo "Order Bump" na seção de Produtos para que apareçam aqui.
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {orderBumpProducts.map((product) => (
                <div key={product.id} className="flex items-center space-x-3 bg-gray-600 p-3 rounded-lg">
                  <Checkbox
                    id={product.id}
                    checked={selectedOrderBumps.includes(product.id)}
                    onCheckedChange={(checked) => onOrderBumpToggle(product.id, !!checked)}
                  />
                  <Label htmlFor={product.id} className="flex-1 text-white cursor-pointer">
                    {product.name} - R$ {product.price.toFixed(2)}
                  </Label>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
