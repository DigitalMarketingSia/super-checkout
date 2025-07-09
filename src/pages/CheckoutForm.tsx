import { Link } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { ChevronLeft } from 'lucide-react';
import { CheckoutForm as CheckoutFormComponent } from '@/components/CheckoutForm';

const CheckoutForm = () => {

  return (
    <Layout>
      <div className="space-y-6">
        {/* Cabeçalho da Página */}
        <div className="flex items-center space-x-4">
          <Link to="/checkouts" className="flex items-center text-gray-400 hover:text-white transition-colors">
            <ChevronLeft className="h-5 w-5 mr-1" />
            Voltar para Checkouts
          </Link>
        </div>

        <div>
          <h1 className="text-3xl font-bold text-white">Novo Checkout</h1>
          <p className="text-gray-400 mt-2">
            Configure os campos e métodos de pagamento para o seu novo checkout
          </p>
        </div>

        {/* Container Principal com Componente Unificado */}
        <CheckoutFormComponent />
      </div>
    </Layout>
  );
};

export default CheckoutForm;