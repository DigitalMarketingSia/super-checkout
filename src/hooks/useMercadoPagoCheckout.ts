
import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGatewayContext } from '@/context/GatewayContext';
import { useToast } from '@/hooks/use-toast';
import { CustomerFormData, CreditCardData } from '@/types/checkout';
import { supabase } from '@/integrations/supabase/client';

interface CheckoutItem {
  id: string;
  title: string;
  quantity: number;
  unit_price: number;
}

interface UseMercadoPagoCheckoutProps {
  items: CheckoutItem[];
  totalAmount: number;
}

// Declarar interface global para o MercadoPago
declare global {
  interface Window {
    MercadoPago: any;
  }
}

export const useMercadoPagoCheckout = ({ items, totalAmount }: UseMercadoPagoCheckoutProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const { getConnectedGateways } = useGatewayContext();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Initialize MercadoPago SDK
  const initializeMercadoPago = useCallback(async () => {
    console.log('🔄 Inicializando MercadoPago SDK...');
    
    try {
      const connectedGateways = getConnectedGateways();
      console.log('🔍 Gateways conectados:', connectedGateways);
      
      const mpGateway = connectedGateways.find(g => g.type === 'mercado_pago');
      
      if (!mpGateway) {
        console.error('❌ Gateway Mercado Pago não encontrado');
        throw new Error('Gateway Mercado Pago não configurado');
      }

      console.log('🔧 Gateway encontrado:', mpGateway);
      console.log('🔧 Credenciais disponíveis:', Object.keys(mpGateway.credentials));

      // Determinar qual chave pública usar
      let publicKey;
      
      // Tentar formato novo primeiro (accessToken único)
      if (mpGateway.credentials.accessToken) {
        const isProduction = mpGateway.credentials.accessToken.includes('APP_USR');
        publicKey = isProduction 
          ? mpGateway.credentials.publicKeyProd 
          : mpGateway.credentials.publicKeySandbox;
      } 
      // Formato antigo (separado por ambiente)
      else {
        const isProduction = mpGateway.environment === 'production';
        publicKey = isProduction 
          ? mpGateway.credentials.publicKeyProd 
          : mpGateway.credentials.publicKeySandbox;
      }

      // Fallback para formato legacy
      if (!publicKey) {
        publicKey = mpGateway.credentials.publicKey;
      }

      console.log('🔑 Chave pública selecionada:', publicKey ? publicKey.substring(0, 20) + '...' : 'NÃO ENCONTRADA');

      if (!publicKey) {
        console.error('❌ Chave pública não encontrada nas credenciais');
        throw new Error('Chave pública do Mercado Pago não configurada');
      }

      // Carregar SDK se ainda não foi carregado
      if (!window.MercadoPago) {
        console.log('📦 Carregando SDK do MercadoPago...');
        
        return new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://sdk.mercadopago.com/js/v2';
          script.onload = () => {
            console.log('✅ SDK MercadoPago carregado');
            
            try {
              console.log('🔧 Inicializando MercadoPago com chave:', publicKey.substring(0, 20) + '...');
              const mp = new window.MercadoPago(publicKey, {
                locale: 'pt-BR'
              });
              
              console.log('✅ MercadoPago inicializado com sucesso');
              console.log('🔧 Objeto MP criado:', typeof mp);
              console.log('🔧 Métodos disponíveis:', Object.getOwnPropertyNames(mp));
              
              resolve(mp);
            } catch (initError) {
              console.error('❌ Erro ao inicializar MercadoPago após carregamento:', initError);
              reject(initError);
            }
          };
          script.onerror = (error) => {
            console.error('❌ Erro ao carregar SDK:', error);
            reject(new Error('Erro ao carregar SDK do MercadoPago'));
          };
          document.head.appendChild(script);
        });
      } else {
        console.log('♻️ SDK já carregado, criando nova instância...');
        
        try {
          console.log('🔧 Inicializando MercadoPago com chave:', publicKey.substring(0, 20) + '...');
          const mp = new window.MercadoPago(publicKey, {
            locale: 'pt-BR'
          });
          
          console.log('✅ MercadoPago reinicializado');
          console.log('🔧 Objeto MP criado:', typeof mp);
          console.log('🔧 Métodos disponíveis:', Object.getOwnPropertyNames(mp));
          return mp;
        } catch (error) {
          console.error('❌ Erro ao reinicializar MercadoPago:', error);
          throw error;
        }
      }
    } catch (error) {
      console.error('❌ Erro crítico na inicialização:', error);
      throw error;
    }
  }, [getConnectedGateways]);

  const createPixPayment = useCallback(async (customerData: CustomerFormData) => {
    setIsProcessing(true);
    setPaymentError(null);

    try {
      console.log('🟢 Criando pagamento PIX...');
      
      const response = await supabase.functions.invoke('processar-pagamento', {
        body: {
          customerData,
          items,
          totalAmount,
          paymentMethod: 'pix'
        }
      });

      if (response.error) {
        console.error('❌ Erro na Edge Function PIX:', response.error);
        throw new Error(response.error.message || 'Erro ao processar PIX');
      }

      const { data } = response;
      
      if (data.success) {
        console.log('✅ PIX criado com sucesso');
        navigate(data.redirectUrl, {
          state: {
            pixData: data.payment,
            orderData: { items, totalAmount }
          }
        });
      } else {
        throw new Error(data.error || 'Erro ao processar pagamento');
      }

    } catch (error) {
      console.error('❌ Erro PIX:', error);
      setPaymentError(error instanceof Error ? error.message : 'Erro ao processar PIX');
      toast({
        title: "Erro no Pagamento",
        description: error instanceof Error ? error.message : 'Erro ao processar PIX',
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  }, [items, totalAmount, navigate, toast]);

  const createCreditCardPayment = useCallback(async (
    customerData: CustomerFormData,
    creditCardData: CreditCardData,
    installments: number = 1
  ) => {
    setIsProcessing(true);
    setPaymentError(null);

    try {
      console.log('💳 Iniciando pagamento com cartão...');
      console.log('📋 Dados do cartão (mascarados):', {
        numero: creditCardData.numero.substring(0, 4) + '****',
        nome: creditCardData.nome,
        validade: creditCardData.validade
      });

      // Initialize MercadoPago SDK
      console.log('🔄 Inicializando SDK...');
      const mp = await initializeMercadoPago();
      
      if (!mp) {
        throw new Error('Não foi possível inicializar o MercadoPago SDK');
      }

      console.log('✅ SDK inicializado, criando token do cartão...');

      // Verificar se o método createCardToken existe
      if (typeof mp.createCardToken !== 'function') {
        console.error('❌ Método createCardToken não disponível no objeto MP');
        console.log('🔧 Métodos disponíveis no MP:', Object.getOwnPropertyNames(mp));
        throw new Error('SDK do MercadoPago não foi carregado corretamente');
      }

      // Create card token usando a nova API
      const cardTokenData = {
        cardNumber: creditCardData.numero.replace(/\s/g, ''),
        cardholderName: creditCardData.nome,
        cardExpirationMonth: creditCardData.validade.split('/')[0],
        cardExpirationYear: `20${creditCardData.validade.split('/')[1]}`,
        securityCode: creditCardData.cvv,
        identificationType: 'CPF',
        identificationNumber: creditCardData.cpf.replace(/\D/g, '')
      };

      console.log('🔧 Dados para criar token:', {
        ...cardTokenData,
        cardNumber: cardTokenData.cardNumber.substring(0, 4) + '****',
        securityCode: '***',
        identificationNumber: cardTokenData.identificationNumber.substring(0, 3) + '****'
      });

      const cardToken = await mp.createCardToken(cardTokenData);

      console.log('🔧 Resposta do token:', cardToken);

      if (cardToken.error) {
        console.error('❌ Erro ao criar token:', cardToken.error);
        throw new Error('Dados do cartão inválidos: ' + cardToken.error.message);
      }

      if (!cardToken.id) {
        console.error('❌ Token não retornado');
        throw new Error('Não foi possível processar os dados do cartão');
      }

      console.log('✅ Token criado:', cardToken.id);

      // Process payment with token
      console.log('🔄 Enviando para Edge Function...');
      const response = await supabase.functions.invoke('processar-pagamento', {
        body: {
          token: cardToken.id,
          customerData,
          items,
          totalAmount,
          paymentMethod: 'credit_card',
          installments
        }
      });

      console.log('📥 Resposta da Edge Function:', response);

      if (response.error) {
        console.error('❌ Erro na Edge Function:', response.error);
        throw new Error(response.error.message || 'Erro ao processar cartão');
      }

      const { data } = response;
      
      if (data.success) {
        console.log('✅ Pagamento processado com sucesso');
        navigate(data.redirectUrl);
        
        toast({
          title: "✅ Pagamento Aprovado",
          description: "Seu pagamento foi processado com sucesso!"
        });
      } else {
        console.error('❌ Pagamento recusado:', data.error);
        throw new Error(data.error || 'Pagamento recusado');
      }

    } catch (error) {
      console.error('❌ Erro Cartão:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro ao processar cartão';
      setPaymentError(errorMessage);
      toast({
        title: "Erro no Pagamento",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  }, [items, totalAmount, initializeMercadoPago, navigate, toast]);

  const clearPaymentError = useCallback(() => {
    setPaymentError(null);
  }, []);

  return {
    isProcessing,
    paymentError,
    createPixPayment,
    createCreditCardPayment,
    clearPaymentError,
    initializeMercadoPago
  };
};
