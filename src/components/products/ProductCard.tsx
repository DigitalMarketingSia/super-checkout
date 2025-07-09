import { Link } from 'react-router-dom';
import { Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Product } from '@/api/mockDatabase';

interface ProductFunction {
  isPrincipal: boolean;
  isOrderbump: boolean;
  isUpsell: boolean;
}

interface ProductCardProps {
  product: Product;
  functions: ProductFunction;
  onDelete: (id: string) => void;
}

export const ProductCard = ({ product, functions, onDelete }: ProductCardProps) => {
  return (
    <Card className="rounded-lg border border-white/10 bg-white/5 backdrop-blur-lg bg-gradient-to-b from-purple-500/10 to-transparent">
      <CardHeader className="pb-4">
        {/* Tags de função */}
        {(functions.isPrincipal || functions.isOrderbump || functions.isUpsell) && (
          <div className="flex flex-wrap gap-1 mb-3">
            {functions.isPrincipal && (
              <Badge 
                variant="outline" 
                className="bg-blue-500/10 text-blue-400 border-blue-400/30 text-xs px-2 py-0.5"
              >
                Principal
              </Badge>
            )}
            {functions.isOrderbump && (
              <Badge 
                variant="outline" 
                className="bg-orange-500/10 text-orange-400 border-orange-400/30 text-xs px-2 py-0.5"
              >
                Orderbump
              </Badge>
            )}
            {functions.isUpsell && (
              <Badge 
                variant="outline" 
                className="bg-purple-500/10 text-purple-400 border-purple-400/30 text-xs px-2 py-0.5"
              >
                Upsell
              </Badge>
            )}
          </div>
        )}
        
        <div className="flex justify-between items-start">
          <CardTitle className="text-white text-lg font-semibold">
            {product.name}
          </CardTitle>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            product.isActive !== false 
              ? 'bg-green-500/20 text-green-400' 
              : 'bg-red-500/20 text-red-400'
          }`}>
            {product.isActive !== false ? 'Ativo' : 'Inativo'}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Imagem do produto */}
        {product.image && (
          <div className="w-full h-24 bg-gray-700 rounded-lg overflow-hidden">
            <img
              src={product.image}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        
        <p className="text-gray-400 text-sm line-clamp-2">
          {product.description || 'Sem descrição'}
        </p>
        
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Preço:</span>
            <span className="text-green-400 font-semibold">
              R$ {product.price.toFixed(2)}
            </span>
          </div>
          {product.code && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Código:</span>
              <span className="text-gray-300">{product.code}</span>
            </div>
          )}
          {product.category && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Categoria:</span>
              <span className="text-gray-300">{product.category}</span>
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-2">
          <Link to={`/products/edit/${product.id}`} className="flex-1">
            <Button variant="outline" size="sm" className="w-full">
              <Edit className="w-4 h-4 mr-2" />
              Editar
            </Button>
          </Link>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => onDelete(product.id)}
            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};