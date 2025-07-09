
import { useCallback } from 'react';
import { CustomerFormData } from '@/types/checkout';
import { useMercadoPagoPayment } from './useMercadoPagoPayment';
import { CheckoutConfig } from '@/api/mockDatabase';
import { OrderCalculationResult } from '@/core/checkoutEngine';

interface UsePixPaymentProps {
  checkout: CheckoutConfig | null;
  orderCalculation: OrderCalculationResult | null;
}

export const usePixPayment = ({ checkout, orderCalculation }: UsePixPaymentProps) => {
  const {
    processPixPayment: mpProcessPixPayment,
    isReady: mpReady
  } = useMercadoPagoPayment({ checkout, orderCalculation });

  const processPixPayment = useCallback(async (
    formData: CustomerFormData,
    items: any[],
    mpGateway: any
  ) => {
    console.log('💰 [PIX HOOK] Iniciando processamento PIX...', {
      hasFormData: !!formData,
      formFields: Object.keys(formData).filter(key => formData[key as keyof CustomerFormData]),
      mpReady,
      hasCheckout: !!checkout,
      hasOrderCalculation: !!orderCalculation,
      totalAmount: orderCalculation?.totalFinal,
      gatewayInfo: mpGateway ? {
        id: mpGateway.id,
        name: mpGateway.name,
        type: mpGateway.type,
        environment: mpGateway.environment
      } : 'Nenhum gateway fornecido'
    });
    
    // Validações básicas mais robustas
    if (!formData.nome || !formData.email) {
      const missingFields = [];
      if (!formData.nome) missingFields.push('Nome');
      if (!formData.email) missingFields.push('Email');
      
      console.error('❌ [PIX HOOK] Dados obrigatórios faltando:', {
        missingFields,
        formData: {
          nome: formData.nome ? 'PRESENTE' : 'AUSENTE',
          email: formData.email ? 'PRESENTE' : 'AUSENTE',
          telefone: formData.telefone ? 'PRESENTE' : 'AUSENTE',
          cpf: formData.cpf ? 'PRESENTE' : 'AUSENTE'
        }
      });
      throw new Error(`Preencha os seguintes campos obrigatórios: ${missingFields.join(', ')}`);
    }
    
    // Verificar se temos gateway válido
    if (!mpGateway) {
      console.error('❌ [PIX HOOK] Gateway MercadoPago não fornecido');
      throw new Error('Gateway de pagamento não configurado. Contate o suporte.');
    }
    
    // Verificar se MP está pronto, mas permitir fallback se tivermos credenciais diretas
    if (!mpReady) {
      console.warn('⚠️ [PIX HOOK] MP não está pronto, tentando com credenciais diretas:', {
        mpReady,
        hasGateway: !!mpGateway,
        gatewayCredentials: mpGateway.credentials ? Object.keys(mpGateway.credentials) : []
      });
      
      // Se não temos nem credenciais, é erro mesmo
      if (!mpGateway.credentials || !mpGateway.credentials.accessTokenProd && !mpGateway.credentials.accessTokenSandbox) {
        console.error('❌ [PIX HOOK] Nem MP nem credenciais disponíveis');
        throw new Error('Sistema de pagamento não está configurado. Verifique as credenciais.');
      }
    }
    
    try {
      console.log('🔄 [PIX HOOK] Chamando processamento via MercadoPago...');
      const result = await mpProcessPixPayment(formData, []);
      console.log('✅ [PIX HOOK] Processamento concluído com sucesso');
      return result;
    } catch (error) {
      console.error('❌ [PIX HOOK] Erro no processamento:', {
        errorType: error instanceof Error ? error.constructor.name : typeof error,
        message: error instanceof Error ? error.message : String(error),
        formData: {
          nome: formData.nome ? 'PRESENTE' : 'AUSENTE',
          email: formData.email ? 'PRESENTE' : 'AUSENTE',
          telefone: formData.telefone ? 'PRESENTE' : 'AUSENTE',
          cpf: formData.cpf ? 'PRESENTE' : 'AUSENTE'
        },
        gatewayId: mpGateway?.id || 'N/A'
      });
      
      // Melhorar mensagens de erro para o usuário
      if (error instanceof Error) {
        if (error.message.includes('credentials') || error.message.includes('gateway')) {
          throw new Error('Sistema de pagamento não configurado. Contate o suporte.');
        } else if (error.message.includes('required') || error.message.includes('obrigatório')) {
          throw error; // Manter erro de validação original
        } else if (error.message.includes('amount') || error.message.includes('valor')) {
          throw new Error('Valor do pagamento inválido. Tente novamente.');
        } else {
          throw new Error('Erro ao processar PIX. Tente novamente em alguns instantes.');
        }
      }
      
      throw new Error('Erro inesperado no processamento. Tente novamente.');
    }
  }, [mpReady, mpProcessPixPayment, checkout, orderCalculation]);

  return {
    processPixPayment
  };
};
