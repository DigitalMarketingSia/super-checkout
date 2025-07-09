
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ShoppingCart } from 'lucide-react';

export const EmptyCheckoutState = () => {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="rounded-lg border border-white/10 bg-white/5 backdrop-blur-lg bg-gradient-to-b from-purple-500/10 to-transparent max-w-md w-full mx-4 p-8 text-center">
        <div className="mb-6">
          <ShoppingCart className="h-16 w-16 text-violet-400 mx-auto" />
        </div>
        <h1 className="text-2xl font-semibold text-white mb-3">
          Nenhum checkout criado ainda
        </h1>
        <p className="text-gray-400 mb-6 leading-relaxed">
          Clique no botão abaixo para começar a vender com seu primeiro checkout personalizado.
        </p>
        <Link to="/checkouts/new">
          <Button className="bg-violet-600 hover:bg-violet-700 text-white px-6 py-3 text-base font-medium">
            + Criar Primeiro Checkout
          </Button>
        </Link>
      </div>
    </div>
  );
};
