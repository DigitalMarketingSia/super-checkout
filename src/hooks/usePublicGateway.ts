
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Gateway {
  id: string;
  name: string;
  type: string;
  credentials: {
    publicKeyProd?: string;
    accessTokenProd?: string;
    publicKeySandbox?: string;
    accessTokenSandbox?: string;
    publicKey?: string;
    accessToken?: string;
  };
  environment: string;
  is_active: boolean;
}

export const usePublicGateway = (gatewayId: string | null) => {
  const [gateway, setGateway] = useState<Gateway | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;

  const fetchGateway = useCallback(async (attempt = 1) => {
    setLoading(true);
    setError(null);
    
    try {
      console.log(`🔍 usePublicGateway: Tentativa ${attempt}/${maxRetries} - Buscando gateway:`, gatewayId);
      console.log('🔍 Supabase client disponível:', !!supabase);
      
      let gateway = null;
      
      // Estratégia 1: Buscar gateway específico se ID fornecido
      if (gatewayId) {
        console.log('🎯 Buscando gateway específico:', gatewayId);
        const { data: specificGateway, error: specificError } = await supabase
          .from('gateways')
          .select('*')
          .eq('id', gatewayId)
          .eq('is_active', true)
          .single();

        console.log('🔍 Resultado da consulta específica:', { data: specificGateway, error: specificError });

        if (!specificError && specificGateway) {
          console.log('✅ Gateway específico encontrado:', specificGateway.name);
          gateway = specificGateway;
        } else {
          console.log('⚠️ Gateway específico não encontrado, tentando fallback...');
          console.log('⚠️ Erro da consulta específica:', specificError);
        }
      }

      // Estratégia 2: Fallback para qualquer gateway MercadoPago ativo
      if (!gateway) {
        console.log('🔄 Buscando qualquer gateway MercadoPago ativo...');
        const { data: fallbackGateway, error: fallbackError } = await supabase
          .from('gateways')
          .select('*')
          .eq('type', 'mercado_pago')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        console.log('🔍 Resultado da consulta fallback:', { data: fallbackGateway, error: fallbackError });

        if (!fallbackError && fallbackGateway) {
          console.log('✅ Gateway fallback encontrado:', fallbackGateway.name);
          gateway = fallbackGateway;
        } else {
          console.log('❌ Nenhum gateway MercadoPago ativo encontrado');
          console.log('❌ Erro da consulta fallback:', fallbackError);
        }
      }

      // Estratégia 3: Se ainda não encontrou, buscar qualquer gateway MercadoPago (mesmo inativo)
      if (!gateway) {
        console.log('🔄 Última tentativa: buscando qualquer gateway MercadoPago...');
        const { data: anyGateway, error: anyError } = await supabase
          .from('gateways')
          .select('*')
          .eq('type', 'mercado_pago')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (!anyError && anyGateway) {
          console.log('⚠️ Gateway encontrado mas pode estar inativo:', anyGateway.name, 'Ativo:', anyGateway.is_active);
          gateway = anyGateway;
        }
      }

      if (!gateway) {
        throw new Error('Nenhum gateway MercadoPago configurado no sistema');
      }

      // Validar credenciais do gateway
      const credentials = gateway.credentials as any;
      const hasValidCredentials = (
        (credentials?.publicKeySandbox && credentials?.accessTokenSandbox) ||
        (credentials?.publicKeyProd && credentials?.accessTokenProd) ||
        (credentials?.publicKey && credentials?.accessToken)
      );

      if (!hasValidCredentials) {
        console.error('❌ Gateway encontrado mas sem credenciais válidas:', {
          id: gateway.id,
          name: gateway.name,
          credentialKeys: credentials ? Object.keys(credentials) : []
        });
        throw new Error('Gateway encontrado mas credenciais não configuradas');
      }

      console.log('✅ Gateway validado com sucesso:', {
        id: gateway.id,
        name: gateway.name,
        type: gateway.type,
        environment: gateway.environment,
        isActive: gateway.is_active,
        hasCredentials: hasValidCredentials
      });

      // Credentials para uso público (incluindo accessToken para pagamentos)
      const publicCredentials = {
        publicKey: credentials?.publicKeySandbox || credentials?.publicKeyProd || credentials?.publicKey || '',
        publicKeySandbox: credentials?.publicKeySandbox || '',
        publicKeyProd: credentials?.publicKeyProd || '',
        accessToken: credentials?.accessTokenSandbox || credentials?.accessTokenProd || credentials?.accessToken || '',
        accessTokenSandbox: credentials?.accessTokenSandbox || '',
        accessTokenProd: credentials?.accessTokenProd || '',
        environment: gateway.environment || 'sandbox'
      };

      setGateway({
        id: gateway.id,
        name: gateway.name,
        type: gateway.type,
        credentials: publicCredentials,
        environment: gateway.environment || 'sandbox',
        is_active: gateway.is_active
      });

      setRetryCount(0); // Reset retry count on success

    } catch (err) {
      console.error(`❌ usePublicGateway: Erro na tentativa ${attempt}:`, err);
      
      // Implementar retry logic
      if (attempt < maxRetries) {
        const delay = attempt * 1000; // Delay progressivo
        console.log(`⏳ Aguardando ${delay}ms antes da próxima tentativa...`);
        setRetryCount(attempt);
        
        setTimeout(() => {
          fetchGateway(attempt + 1);
        }, delay);
        return;
      }
      
      setError(err instanceof Error ? err.message : 'Erro ao carregar gateway de pagamento');
      setGateway(null);
    } finally {
      setLoading(false);
    }
  }, [gatewayId, maxRetries]);

  useEffect(() => {
    if (gatewayId !== undefined) { // Allow null but not undefined
      console.log('🔄 usePublicGateway: Iniciando busca por gateway:', gatewayId);
      fetchGateway();
    }
  }, [gatewayId, fetchGateway]);

  // Função para tentar novamente manualmente
  const retry = useCallback(() => {
    console.log('🔄 usePublicGateway: Retry manual solicitado');
    setRetryCount(0);
    fetchGateway();
  }, [fetchGateway]);

  return { 
    gateway, 
    loading, 
    error, 
    retry,
    retryCount
  };
};
