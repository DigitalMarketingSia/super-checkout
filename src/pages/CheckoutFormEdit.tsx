import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { CheckoutForm as CheckoutFormComponent } from '../components/CheckoutForm';
import { useCheckoutContext } from '../context/CheckoutContext';
import { useToast } from '../hooks/use-toast';
import { ChevronLeft } from 'lucide-react';
import { CheckoutConfig } from '../api/mockDatabase';

const CheckoutFormEdit = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { getCheckoutById } = useCheckoutContext();
  
  const [loading, setLoading] = useState(true);
  const [checkoutData, setCheckoutData] = useState<CheckoutConfig | null>(null);

  useEffect(() => {
    const loadData = async () => {
      if (!id) return;
      
      try {
        // Carregar checkout existente usando o contexto
        const checkout = getCheckoutById(id);
        if (!checkout) {
          toast({
            title: "Erro",
            description: "Checkout não encontrado",
            variant: "destructive"
          });
          navigate('/checkouts');
          return;
        }

        setCheckoutData(checkout);
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        toast({
          title: "Erro",
          description: "Erro ao carregar dados do checkout",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id, navigate, toast, getCheckoutById]);


  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-4xl mb-4">⏳</div>
            <p className="text-gray-400">Carregando checkout...</p>
          </div>
        </div>
      </Layout>
    );
  }

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
          <h1 className="text-3xl font-bold text-white">Editar Checkout</h1>
          <p className="text-gray-400 mt-2">
            Edite as configurações do seu checkout
          </p>
        </div>

        {/* Container Principal com Componente Unificado */}
        <CheckoutFormComponent initialData={checkoutData} isEditing={true} />
      </div>
    </Layout>
  );
};

export default CheckoutFormEdit;