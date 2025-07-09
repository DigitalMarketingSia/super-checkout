
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Package } from 'lucide-react';
import { Product } from '@/api/mockDatabase';

interface ProductSelectionProps {
  productId: string;
  products: Product[];
  onProductChange: (value: string) => void;
}

export const ProductSelection = ({
  productId,
  products,
  onProductChange
}: ProductSelectionProps) => {
  // Filtrar apenas produtos do tipo 'main' (principais)
  const mainProducts = products.filter(p => p.type === 'main');

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <Package className="h-5 w-5 text-gray-400" />
        <h3 className="text-lg font-medium text-white">Produto Principal</h3>
      </div>
      
      <div className="bg-gray-700 p-4 rounded-lg space-y-4">
        <Label className="text-gray-300">Selecionar Produto *</Label>
        {mainProducts.length === 0 ? (
          <div className="text-center py-4">
            <div className="text-gray-400 mb-2">Nenhum produto principal disponível</div>
            <div className="text-sm text-gray-500">
              Crie produtos do tipo "Produto Principal" na seção de Produtos.
            </div>
          </div>
        ) : (
          <Select value={productId} onValueChange={onProductChange}>
            <SelectTrigger className="bg-gray-600 border-gray-500 text-white">
              <SelectValue placeholder="Escolha o produto principal" />
            </SelectTrigger>
            <SelectContent className="bg-gray-600 border-gray-500">
              {mainProducts.map((product) => (
                <SelectItem key={product.id} value={product.id} className="text-white hover:bg-gray-500">
                  {product.name} - R$ {product.price.toFixed(2)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
    </div>
  );
};
