
import { useState, useEffect } from 'react';
import { CheckoutConfig } from '@/api/mockDatabase';

interface UseCheckoutDataProps {
  checkoutId: string | undefined;
  getCheckoutById: (id: string) => CheckoutConfig | undefined;
  getProductById: (id: string) => any;
  contextLoading: boolean;
}

export const useCheckoutData = ({
  checkoutId,
  getCheckoutById,
  getProductById,
  contextLoading
}: UseCheckoutDataProps) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkout, setCheckout] = useState<CheckoutConfig | null>(null);
  const [mainProduct, setMainProduct] = useState<any>(null);
  const [orderBumps, setOrderBumps] = useState<any[]>([]);

  // Função para normalizar requiredFormFields
  const normalizeRequiredFields = (fields: any): string[] => {
    console.log('🔧 normalizeRequiredFields: Input recebido:', fields, typeof fields);
    
    if (Array.isArray(fields)) {
      console.log('✅ normalizeRequiredFields: Já é array:', fields);
      return fields;
    }
    
    if (typeof fields === 'object' && fields !== null) {
      const normalized = Object.entries(fields)
        .filter(([_, value]) => value)
        .map(([key]) => key);
      console.log('🔄 normalizeRequiredFields: Objeto convertido para array:', normalized);
      return normalized;
    }
    
    console.log('⚠️ normalizeRequiredFields: Retornando array vazio para:', fields);
    return [];
  };

  useEffect(() => {
    if (contextLoading) {
      console.log('⏳ Aguardando carregamento dos contextos...');
      return;
    }

    if (!checkoutId) {
      setError('ID do checkout não fornecido');
      setLoading(false);
      return;
    }

    console.log('🔍 Carregando dados do checkout:', checkoutId);

    try {
      const checkoutData = getCheckoutById(checkoutId);
      
      if (!checkoutData) {
        console.error('❌ Checkout não encontrado:', checkoutId);
        setError('Checkout não encontrado');
        setLoading(false);
        return;
      }

      console.log('✅ Checkout encontrado:', checkoutData.name);
      
      // Garantir que gatewayId seja sempre string ou null e normalizar requiredFormFields
      const normalizedCheckout = {
        ...checkoutData,
        gatewayId: checkoutData.gatewayId || null,
        requiredFormFields: normalizeRequiredFields(checkoutData.requiredFormFields)
      };
      
      console.log('🔧 Campos obrigatórios normalizados:', normalizedCheckout.requiredFormFields);
      setCheckout(normalizedCheckout);

      // Carregar produto principal
      const product = getProductById(checkoutData.mainProductId);
      if (!product) {
        console.error('❌ Produto principal não encontrado:', checkoutData.mainProductId);
        setError('Produto principal não encontrado');
        setLoading(false);
        return;
      }

      console.log('✅ Produto principal encontrado:', product.name);
      setMainProduct(product);

      // Carregar order bumps se existirem - usando propriedade correta
      const orderBumpIds = (checkoutData as any).orderBumps || (checkoutData as any).order_bumps || [];
      const bumps = orderBumpIds
        .map((bumpId: string) => getProductById(bumpId))
        .filter(Boolean);
      
      console.log('🎁 Order bumps carregados:', bumps.length);
      setOrderBumps(bumps);

      setError(null);
    } catch (err) {
      console.error('❌ Erro ao carregar dados do checkout:', err);
      setError('Erro ao carregar dados do checkout');
    } finally {
      setLoading(false);
    }
  }, [checkoutId, getCheckoutById, getProductById, contextLoading]);

  return {
    loading,
    error,
    checkout,
    mainProduct,
    orderBumps
  };
};
