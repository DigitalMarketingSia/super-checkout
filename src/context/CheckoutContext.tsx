
/**
 * CheckoutContext - Context de Gerenciamento de Checkouts com Supabase
 * 
 * Gerencia o estado global dos checkouts da aplicação, fornecendo operações CRUD
 * completas integradas com Supabase database.
 * 
 * @context CheckoutContext
 * @description Context responsável por gerenciar checkouts usando Supabase.
 * Implementa operações CRUD completas com estados de loading e error.
 * 
 * @example
 * ```tsx
 * const { checkouts, addCheckout, updateCheckout, deleteCheckout, loading } = useCheckoutContext();
 * ```
 */

import React, { createContext, useContext, ReactNode, useEffect } from 'react';
import { useSupabaseCheckouts } from '@/hooks/useSupabaseCheckouts';
import { useAuth } from '@/context/AuthContext';
import { useProductContext } from '@/context/ProductContext';
import { Database } from '@/integrations/supabase/types';

// Type definitions from Supabase
type SupabaseCheckout = Database['public']['Tables']['checkouts']['Row'];

// Legacy CheckoutConfig interface for compatibility
export interface CheckoutConfig {
  id: string;
  name: string;
  productId?: string;
  mainProductId: string; // Required for backward compatibility
  status: 'active' | 'inactive' | 'draft' | 'ativo' | 'inativo'; // Support both languages
  paymentMethods: ('pix' | 'credit_card' | 'boleto')[];
  requiredFormFields: ('name' | 'email' | 'phone' | 'cpf' | 'address')[];
  headerImageUrl?: string;
  timerConfig?: {
    enabled: boolean;
    minutes?: number;
    message?: string;
    // Support legacy format
    durationInSeconds?: number;
    backgroundColor?: string;
    text?: string;
  };
  gatewayId?: string | null;
  createdAt?: string;
  // Additional legacy fields for compatibility
  allowedOrderBumps: string[];
  upsellProductId?: string;
  domainId?: string;
}

// Helper function to convert Supabase checkout to legacy format
const convertSupabaseCheckout = (supabaseCheckout: SupabaseCheckout): CheckoutConfig => ({
  id: supabaseCheckout.id,
  name: supabaseCheckout.name,
  productId: supabaseCheckout.product_id || undefined,
  mainProductId: supabaseCheckout.product_id || 'default-product', // Always provide a value
  status: supabaseCheckout.status as any,
  paymentMethods: (supabaseCheckout.payment_methods as string[]) as ('pix' | 'credit_card' | 'boleto')[],
  requiredFormFields: (supabaseCheckout.required_form_fields as string[]) as ('name' | 'email' | 'phone' | 'cpf' | 'address')[],
  headerImageUrl: supabaseCheckout.header_image_url || undefined,
  timerConfig: supabaseCheckout.timer_config as any || undefined,
  createdAt: supabaseCheckout.created_at?.split('T')[0],
  // Map order_bumps from Supabase
  allowedOrderBumps: Array.isArray((supabaseCheckout as any).order_bumps) ? (supabaseCheckout as any).order_bumps : [],
  // Add gateway_id mapping
  gatewayId: supabaseCheckout.gateway_id || undefined,
  upsellProductId: undefined,
  domainId: undefined,
});

// Helper function to convert legacy checkout to Supabase format
const convertToSupabaseCheckout = (checkout: Omit<CheckoutConfig, 'id'>, userId: string) => {
  // Convert Portuguese status to English and ensure default is active
  let status = checkout.status;
  if (status === 'ativo') status = 'active';
  if (status === 'inativo') status = 'inactive';
  
  return {
    name: checkout.name,
    product_id: checkout.productId || checkout.mainProductId || null,
    user_id: userId,
    status: 'active', // Sempre criar como ativo por padrão
    payment_methods: checkout.paymentMethods,
    required_form_fields: checkout.requiredFormFields,
    header_image_url: checkout.headerImageUrl || null,
    timer_config: checkout.timerConfig || null,
    order_bumps: checkout.allowedOrderBumps || [], // Map order bumps to Supabase
    gateway_id: checkout.gatewayId || null, // Add gateway_id mapping
  };
};

interface CheckoutContextType {
  checkouts: CheckoutConfig[];
  products: any[]; // Add products for compatibility
  loading: boolean;
  error: string | null;
  addCheckout: (checkoutData: Omit<CheckoutConfig, 'id' | 'createdAt'>) => CheckoutConfig; // Sync for compatibility
  updateCheckout: (id: string, updates: Partial<CheckoutConfig>) => CheckoutConfig | null; // Sync for compatibility
  deleteCheckout: (id: string) => Promise<boolean>; // Async for proper error handling
  getCheckoutById: (id: string) => CheckoutConfig | null;
  getProductById?: (id: string) => any; // Add for compatibility
  refreshCheckouts: () => Promise<void>;
  // Public methods
  getAllPublicCheckouts: () => Promise<void>;
}

const CheckoutContext = createContext<CheckoutContextType | undefined>(undefined);

/**
 * Hook para acessar o contexto de checkouts
 * 
 * @returns {CheckoutContextType} Objeto com checkouts e métodos CRUD
 * @throws {Error} Se usado fora do CheckoutProvider
 */
export const useCheckoutContext = () => {
  const context = useContext(CheckoutContext);
  if (!context) {
    throw new Error('useCheckoutContext deve ser usado dentro de um CheckoutProvider');
  }
  return context;
};

interface CheckoutProviderProps {
  children: ReactNode;
}

/**
 * CheckoutProvider Component
 * 
 * Provider do contexto de checkouts que gerencia o estado global de checkouts
 * usando Supabase database com RLS (Row Level Security).
 * 
 * @param {CheckoutProviderProps} props - Props do provider
 * @param {ReactNode} props.children - Componentes filhos
 * 
 * @returns {JSX.Element} Provider com contexto de checkouts
 */
export const CheckoutProvider: React.FC<CheckoutProviderProps> = ({ children }) => {
  const supabaseCheckouts = useSupabaseCheckouts();
  const { user, isAuthenticated } = useAuth();
  const { products } = useProductContext();

  // Carregar todos os checkouts para o admin, apenas públicos para visitantes
  useEffect(() => {
    if (isAuthenticated) {
      console.log('🔄 CheckoutProvider: Carregando todos os checkouts (admin)');
      supabaseCheckouts.refetch(); // Carrega todos os checkouts para admin
    } else {
      console.log('🔄 CheckoutProvider: Carregando checkouts públicos');
      supabaseCheckouts.fetchPublicCheckouts(); // Apenas públicos para visitantes
    }
  }, [isAuthenticated]);

  /**
   * Adicionar novo checkout - Synchronized wrapper for compatibility
   * 
   * @param {Omit<CheckoutConfig, 'id' | 'createdAt'>} checkoutData - Dados do checkout sem ID
   * @returns {CheckoutConfig} Checkout criado com ID
   */
  const addCheckout = (checkoutData: Omit<CheckoutConfig, 'id' | 'createdAt'>): CheckoutConfig => {
    if (!user || !isAuthenticated) {
      throw new Error('Usuário não autenticado');
    }

    console.log('🔧 Adicionando novo checkout (sync):', checkoutData);
    
    // Create a temporary checkout for immediate return (for compatibility)
    const tempCheckout: CheckoutConfig = {
      ...checkoutData,
      id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString().split('T')[0],
    };
    
    // Async operation in background
    const performAsyncCreate = async () => {
      try {
        const supabaseData = convertToSupabaseCheckout(checkoutData, user.id);
        const { data, error } = await supabaseCheckouts.createCheckout(supabaseData);
        
        if (error) {
          console.error('❌ Erro ao adicionar checkout:', error);
          return;
        }
        
        if (data) {
          console.log('✅ Checkout adicionado com sucesso no Supabase:', data);
          // Recarregar checkouts públicos após criação
          await supabaseCheckouts.fetchPublicCheckouts();
        }
      } catch (err) {
        console.error('❌ Erro async ao adicionar checkout:', err);
      }
    };
    
    performAsyncCreate();
    return tempCheckout;
  };

  /**
   * Atualizar checkout existente - Synchronized wrapper for compatibility
   * 
   * @param {string} id - ID do checkout a ser atualizado
   * @param {Partial<CheckoutConfig>} updates - Atualizações parciais do checkout
   * @returns {CheckoutConfig | null} Checkout atualizado ou null se não encontrado
   */
  const updateCheckout = (id: string, updates: Partial<CheckoutConfig>): CheckoutConfig | null => {
    console.log('🔄 Atualizando checkout (sync):', id, updates);
    
    const existingCheckout = getCheckoutById(id);
    if (!existingCheckout) {
      return null;
    }
    
    const updatedCheckout = { ...existingCheckout, ...updates };
    
    // Async operation in background
    const performAsyncUpdate = async () => {
      try {
        const supabaseUpdates: any = {};
        if (updates.name) supabaseUpdates.name = updates.name;
        if (updates.productId !== undefined || updates.mainProductId !== undefined) {
          supabaseUpdates.product_id = updates.productId || updates.mainProductId;
        }
        if (updates.status) {
          let status = updates.status;
          if (status === 'ativo') status = 'active';
          if (status === 'inativo') status = 'inactive';
          // IMPORTANTE: Apenas alterar status, nunca excluir
          supabaseUpdates.status = status;
          console.log('🔄 Atualizando status do checkout para:', status);
        }
        if (updates.paymentMethods) supabaseUpdates.payment_methods = updates.paymentMethods;
        if (updates.requiredFormFields) supabaseUpdates.required_form_fields = updates.requiredFormFields;
        if (updates.headerImageUrl !== undefined) supabaseUpdates.header_image_url = updates.headerImageUrl;
        if (updates.timerConfig !== undefined) supabaseUpdates.timer_config = updates.timerConfig;
        if (updates.allowedOrderBumps !== undefined) supabaseUpdates.order_bumps = updates.allowedOrderBumps;
        if (updates.gatewayId !== undefined) supabaseUpdates.gateway_id = updates.gatewayId;
        
        const { error } = await supabaseCheckouts.updateCheckout(id, supabaseUpdates);
        
        if (error) {
          console.error('❌ Erro ao atualizar checkout:', error);
        } else {
          console.log('✅ Checkout atualizado com sucesso no Supabase');
          // Recarregar checkouts públicos após atualização
          await supabaseCheckouts.fetchPublicCheckouts();
        }
      } catch (err) {
        console.error('❌ Erro async ao atualizar checkout:', err);
      }
    };
    
    performAsyncUpdate();
    return updatedCheckout;
  };

  /**
   * Deletar checkout - Async operation with proper error handling
   * 
   * @param {string} id - ID do checkout a ser deletado
   * @returns {Promise<boolean>} Promise que resolve para true se deletado com sucesso
   */
  const deleteCheckout = async (id: string): Promise<boolean> => {
    console.log('🗑️ Deletando checkout:', id);
    
    try {
      const { error } = await supabaseCheckouts.deleteCheckout(id);
      
      if (error) {
        console.error('❌ Erro ao deletar checkout:', error);
        return false;
      }
      
      console.log('✅ Checkout deletado com sucesso no Supabase');
      return true;
    } catch (err) {
      console.error('❌ Erro ao deletar checkout:', err);
      return false;
    }
  };

  /**
   * Buscar checkout por ID
   * 
   * @param {string} id - ID do checkout
   * @returns {CheckoutConfig | null} Checkout encontrado ou null
   */
  const getCheckoutById = (id: string): CheckoutConfig | null => {
    console.log('🔍 Buscando checkout por ID:', id);
    console.log('📊 Total de checkouts disponíveis:', supabaseCheckouts.checkouts.length);
    
    const supabaseCheckout = supabaseCheckouts.getCheckoutById(id);
    const checkout = supabaseCheckout ? convertSupabaseCheckout(supabaseCheckout) : null;
    
    if (checkout) {
      console.log('🎯 Checkout encontrado:', `${checkout.id} - ${checkout.name} - Produto: ${checkout.productId || checkout.mainProductId}`);
    } else {
      console.log('❌ Checkout não encontrado para ID:', id);
      console.log('🔍 IDs disponíveis:', supabaseCheckouts.checkouts.map(c => c.id));
    }
    
    return checkout;
  };

  /**
   * Buscar produto por ID (compatibility)
   */
  const getProductById = (id: string) => {
    // Delegate to ProductContext
    const productFromContext = products.find((p: any) => p.id === id);
    if (productFromContext) {
      return productFromContext;
    }
    return null;
  };

  /**
   * Recarregar checkouts
   * 
   * @returns {Promise<void>}
   */
  const refreshCheckouts = async (): Promise<void> => {
    await supabaseCheckouts.refetch();
  };

  /**
   * Buscar todos os checkouts públicos (ativos)
   * 
   * @returns {Promise<void>}
   */
  const getAllPublicCheckouts = async (): Promise<void> => {
    console.log('🌐 Carregando checkouts públicos...');
    await supabaseCheckouts.fetchPublicCheckouts();
  };

  // Convert Supabase checkouts to legacy format
  const checkouts = supabaseCheckouts.checkouts.map(convertSupabaseCheckout);

  const value: CheckoutContextType = {
    checkouts,
    products, // Use products from ProductContext
    loading: supabaseCheckouts.loading,
    error: supabaseCheckouts.error,
    addCheckout,
    updateCheckout,
    deleteCheckout,
    getCheckoutById,
    getProductById,
    refreshCheckouts,
    getAllPublicCheckouts
  };

  return (
    <CheckoutContext.Provider value={value}>
      {children}
    </CheckoutContext.Provider>
  );
};
