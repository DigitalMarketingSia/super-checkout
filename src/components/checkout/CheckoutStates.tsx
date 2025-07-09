import { CheckoutConfig, Product } from '@/api/mockDatabase';
import { OrderCalculationResult } from '@/core/checkoutEngine';
import { CustomerFormData, CreditCardData, OrderBumpItem, FooterConfig } from '@/types/checkout';

interface CheckoutNotFoundProps {
  message?: string;
}

export const CheckoutNotFound = ({ 
  message = "Checkout não encontrado" 
}: CheckoutNotFoundProps) => {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="text-6xl mb-4">❌</div>
        <h1 className="text-2xl font-bold text-gray-200 mb-2">{message}</h1>
        <p className="text-gray-400">Verifique o link e tente novamente</p>
      </div>
    </div>
  );
};

interface CheckoutUnavailableProps {
  message?: string;
}

export const CheckoutUnavailable = ({ 
  message = "Checkout Indisponível" 
}: CheckoutUnavailableProps) => {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="text-6xl mb-4">⏸️</div>
        <h1 className="text-2xl font-bold text-gray-200 mb-2">{message}</h1>
        <p className="text-gray-400">Este checkout não está disponível no momento.</p>
      </div>
    </div>
  );
};

interface CheckoutLoadingProps {
  message?: string;
}

export const CheckoutLoading = ({ 
  message = "Carregando checkout..." 
}: CheckoutLoadingProps) => {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="text-6xl mb-4">⏳</div>
        <p className="text-gray-400">{message}</p>
      </div>
    </div>
  );
};