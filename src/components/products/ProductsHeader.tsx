import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ProductsHeaderProps {
  hasProducts: boolean;
}

export const ProductsHeader = ({ hasProducts }: ProductsHeaderProps) => {
  return (
    <div className="flex justify-between items-start">
      <div>
        <h1 className="text-3xl font-bold text-white">Produtos</h1>
        <p className="text-gray-400 mt-1">Gerencie seus produtos e configurações</p>
      </div>
      {hasProducts && (
        <Link to="/products/new">
          <Button className="bg-violet-600 hover:bg-violet-700">
            <Plus className="w-4 h-4 mr-2" />
            Novo Produto
          </Button>
        </Link>
      )}
    </div>
  );
};