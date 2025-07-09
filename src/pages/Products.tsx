
import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Input } from '@/components/ui/input';
import { ProductEmptyState } from '@/components/products/ProductEmptyState';
import { ProductsHeader } from '@/components/products/ProductsHeader';
import { ProductsGrid } from '@/components/products/ProductsGrid';
import { useProductContext } from '@/context/ProductContext';
import { toast } from '@/hooks/use-toast';
import { useCheckoutContext } from '@/context/CheckoutContext';

const Products = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const { products, loading, deleteProduct } = useProductContext();
  const { checkouts } = useCheckoutContext(); // Usar dados do Supabase

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este produto?')) {
      try {
        await deleteProduct(id);
        toast({
          title: "Produto excluído!",
          description: "O produto foi removido com sucesso.",
        });
      } catch (error) {
        toast({
          title: "Erro",
          description: "Não foi possível excluir o produto.",
          variant: "destructive",
        });
      }
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-400">Carregando produtos...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <ProductsHeader hasProducts={products.length > 0} />

        {products.length > 0 && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Buscar produtos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-transparent border-gray-700 text-white"
            />
          </div>
        )}

        {products.length === 0 ? (
          <ProductEmptyState />
        ) : (
          <ProductsGrid 
            products={products}
            checkouts={checkouts}
            searchTerm={searchTerm}
            onDelete={handleDelete}
          />
        )}
      </div>
    </Layout>
  );
};

export default Products;
