/**
 * GatewayContext - Context de Gerenciamento de Gateways com Supabase
 * 
 * Gerencia o estado global dos gateways da aplicação usando Supabase database.
 */

import React, { createContext, useContext, ReactNode, useState } from 'react';
import { useSupabaseGateways } from '@/hooks/useSupabaseGateways';
import { useAuth } from '@/context/AuthContext';
import { Database } from '@/integrations/supabase/types';

// Type definitions from Supabase
type SupabaseGateway = Database['public']['Tables']['gateways']['Row'];

export interface Gateway {
  id: string;
  name: string;
  type: 'mercado_pago' | 'stripe' | 'pagseguro';
  status: 'conectado' | 'desconectado';
  credentials: {
    // Mercado Pago credentials
    publicKeyProd?: string;
    accessTokenProd?: string;
    publicKeySandbox?: string;
    accessTokenSandbox?: string;
    // Legacy fields for other gateways
    publicKey?: string;
    accessToken?: string;
    [key: string]: any;
  };
  environment: 'sandbox' | 'production';
  createdAt: string;
}

// Helper function to convert Supabase gateway to legacy format
const convertSupabaseGateway = (supabaseGateway: SupabaseGateway): Gateway => ({
  id: supabaseGateway.id,
  name: supabaseGateway.name,
  type: supabaseGateway.type as 'mercado_pago' | 'stripe' | 'pagseguro',
  status: supabaseGateway.is_active ? 'conectado' : 'desconectado',
  credentials: (supabaseGateway.credentials as any) || { publicKey: '', accessToken: '' },
  environment: (supabaseGateway.environment as 'sandbox' | 'production') || 'sandbox',
  createdAt: supabaseGateway.created_at?.split('T')[0] || '',
});

// Helper function to convert legacy gateway to Supabase format
const convertToSupabaseGateway = (gateway: Omit<Gateway, 'id' | 'createdAt'>, userId: string) => ({
  name: gateway.name,
  type: gateway.type,
  user_id: userId,
  credentials: gateway.credentials,
  is_active: gateway.status === 'conectado',
  environment: gateway.environment,
});

interface GatewayContextType {
  gateways: Gateway[];
  addGateway: (gateway: Omit<Gateway, 'id' | 'createdAt'>) => Promise<Gateway>;
  updateGateway: (id: string, updates: Partial<Gateway>) => Promise<Gateway | null>;
  deleteGateway: (id: string) => Promise<boolean>;
  getGatewayById: (id: string) => Gateway | null;
  getConnectedGateways: () => Gateway[];
  loading: boolean;
  error: string | null;
}

const GatewayContext = createContext<GatewayContextType | undefined>(undefined);

export const useGatewayContext = () => {
  const context = useContext(GatewayContext);
  if (!context) {
    throw new Error('useGatewayContext must be used within a GatewayProvider');
  }
  return context;
};

interface GatewayProviderProps {
  children: ReactNode;
}

export const GatewayProvider: React.FC<GatewayProviderProps> = ({ children }) => {
  const supabaseGateways = useSupabaseGateways();
  const { user, isAuthenticated } = useAuth();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const addGateway = async (gatewayData: Omit<Gateway, 'id' | 'createdAt'>): Promise<Gateway> => {
    if (!user || !isAuthenticated) {
      console.error('❌ Usuário não autenticado:', { user: !!user, isAuthenticated });
      throw new Error('Usuário não autenticado');
    }

    console.log('💳 Adicionando gateway:', { 
      gatewayData, 
      userId: user.id, 
      userEmail: user.email 
    });
    
    setLoading(true);
    setError(null);
    
    try {
      const supabaseData = convertToSupabaseGateway(gatewayData, user.id);
      console.log('📤 Enviando dados para Supabase:', supabaseData);
      
      const { data, error } = await supabaseGateways.createGateway(supabaseData);
      
      if (error) {
        console.error('❌ Erro ao adicionar gateway:', error);
        setError(error);
        throw new Error(error);
      }
      
      if (!data) {
        console.error('❌ Nenhum dado retornado do Supabase');
        throw new Error('Nenhum dado retornado do Supabase');
      }
      
      console.log('✅ Gateway adicionado no Supabase:', data);
      
      // Converter de volta para o formato local
      const newGateway = convertSupabaseGateway(data);
      console.log('🔄 Gateway convertido para formato local:', newGateway);
      
      return newGateway;
    } catch (err) {
      console.error('❌ Erro ao adicionar gateway:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido ao adicionar gateway';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateGateway = async (id: string, updates: Partial<Gateway>): Promise<Gateway | null> => {
    console.log('🔄 Atualizando gateway:', { id, updates });
    
    const existingGateway = getGatewayById(id);
    if (!existingGateway) {
      console.error('❌ Gateway não encontrado para atualização:', id);
      return null;
    }
    
    if (!user || !isAuthenticated) {
      console.error('❌ Usuário não autenticado para atualização');
      throw new Error('Usuário não autenticado');
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const supabaseUpdates: any = {};
      if (updates.name) supabaseUpdates.name = updates.name;
      if (updates.type) supabaseUpdates.type = updates.type;
      if (updates.credentials) supabaseUpdates.credentials = updates.credentials;
      if (updates.status) supabaseUpdates.is_active = updates.status === 'conectado';
      if (updates.environment) supabaseUpdates.environment = updates.environment;
      
      console.log('📤 Enviando atualizações para Supabase:', { id, supabaseUpdates });
      
      const { data, error } = await supabaseGateways.updateGateway(id, supabaseUpdates);
      if (error) {
        console.error('❌ Erro ao atualizar gateway:', error);
        setError(error);
        throw new Error(error);
      }
      
      if (!data) {
        console.error('❌ Nenhum dado retornado na atualização');
        throw new Error('Nenhum dado retornado na atualização');
      }
      
      console.log('✅ Gateway atualizado no Supabase:', data);
      
      const updatedGateway = convertSupabaseGateway(data);
      console.log('🔄 Gateway atualizado convertido:', updatedGateway);
      
      return updatedGateway;
    } catch (err) {
      console.error('❌ Erro ao atualizar gateway:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido ao atualizar gateway';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteGateway = async (id: string): Promise<boolean> => {
    console.log('🗑️ GatewayContext: Iniciando exclusão do gateway:', id);
    
    try {
      const { error } = await supabaseGateways.deleteGateway(id);
      if (error) {
        console.error('❌ Erro ao deletar gateway:', error);
        throw new Error(error);
      }
      
      console.log('✅ Gateway deletado no Supabase');
      
      // Force refetch para sincronizar estado
      await supabaseGateways.refetch();
      
      return true;
    } catch (err) {
      console.error('❌ Erro ao deletar gateway:', err);
      return false;
    }
  };

  const getGatewayById = (id: string): Gateway | null => {
    const supabaseGateway = supabaseGateways.getGatewayById(id);
    return supabaseGateway ? convertSupabaseGateway(supabaseGateway) : null;
  };

  const getConnectedGateways = (): Gateway[] => {
    return gateways.filter(g => g.status === 'conectado');
  };

  // Convert Supabase gateways to legacy format
  const gateways = supabaseGateways.gateways.map(convertSupabaseGateway);

  const value: GatewayContextType = {
    gateways,
    addGateway,
    updateGateway,
    deleteGateway,
    getGatewayById,
    getConnectedGateways,
    loading: loading || supabaseGateways.loading,
    error: error || supabaseGateways.error
  };

  return (
    <GatewayContext.Provider value={value}>
      {children}
    </GatewayContext.Provider>
  );
};