
/**
 * ProductContext - Context de Gerenciamento de Produtos com Supabase
 * 
 * Gerencia o estado global dos produtos da aplicação, fornecendo operações CRUD
 * completas integradas com Supabase database.
 * 
 * @context ProductContext
 * @description Context responsável por gerenciar produtos usando Supabase.
 * Implementa operações CRUD completas com estados de loading e error.
 * 
 * @example
 * ```tsx
 * const { products, addProduct, updateProduct, deleteProduct, loading } = useProductContext();
 * ```
 */

import React, { createContext, useContext, ReactNode } from 'react';
import { useSupabaseProducts } from '@/hooks/useSupabaseProducts';
import { Database } from '@/integrations/supabase/types';

// Type definitions from Supabase
type SupabaseProduct = Database['public']['Tables']['produtos']['Row'];

// Legacy Product interface for compatibility
export interface Product {
  id: string;
  name: string;
  price: number;
  type: 'main' | 'bump';
  description?: string;
  image?: string;
  category?: string;
  originalPrice?: number;
  code?: string;
  redirectUrl?: string;
  hasUpsell?: boolean;
  hasOrderBump?: boolean;
  isActive?: boolean;
}

// Helper function to convert Supabase product to legacy format
const convertSupabaseProduct = (supabaseProduct: SupabaseProduct): Product => ({
  id: supabaseProduct.id,
  name: supabaseProduct.nome,
  price: supabaseProduct.preco,
  type: supabaseProduct.is_principal ? 'main' : 'bump',
  description: supabaseProduct.descricao || undefined,
  image: supabaseProduct.url_imagem || undefined,
  hasUpsell: supabaseProduct.is_upsell || false,
  hasOrderBump: supabaseProduct.is_orderbump || false,
  isActive: true, // Default value
});

// Helper function to convert legacy product to Supabase format
const convertToSupabaseProduct = (product: Omit<Product, 'id'>) => ({
  nome: product.name,
  preco: product.price,
  descricao: product.description || null,
  url_imagem: product.image || null,
  is_principal: product.type === 'main',
  is_orderbump: product.hasOrderBump || false,
  is_upsell: product.hasUpsell || false,
});

interface ProductContextType {
  products: Product[];
  loading: boolean;
  error: string | null;
  addProduct: (productData: Omit<Product, 'id'>) => Promise<Product>;
  updateProduct: (id: string, updates: Partial<Product>) => Promise<Product | null>;
  deleteProduct: (id: string) => Promise<boolean>;
  getProductById: (id: string) => Product | null;
  refreshProducts: () => Promise<void>;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

/**
 * Hook para acessar o contexto de produtos
 * 
 * @returns {ProductContextType} Objeto com produtos e métodos CRUD
 * @throws {Error} Se usado fora do ProductProvider
 */
export const useProductContext = () => {
  const context = useContext(ProductContext);
  if (!context) {
    throw new Error('useProductContext deve ser usado dentro de um ProductProvider');
  }
  return context;
};

interface ProductProviderProps {
  children: ReactNode;
}

/**
 * ProductProvider Component
 * 
 * Provider do contexto de produtos que gerencia o estado global de produtos
 * usando Supabase database com RLS (Row Level Security).
 * 
 * @param {ProductProviderProps} props - Props do provider
 * @param {ReactNode} props.children - Componentes filhos
 * 
 * @returns {JSX.Element} Provider com contexto de produtos
 */
export const ProductProvider: React.FC<ProductProviderProps> = ({ children }) => {
  const supabaseProducts = useSupabaseProducts();

  /**
   * Adicionar novo produto
   * 
   * @param {Omit<Product, 'id'>} productData - Dados do produto sem ID
   * @returns {Promise<Product>} Produto criado com ID
   */
  const addProduct = async (productData: Omit<Product, 'id'>): Promise<Product> => {
    console.log('📦 Adicionando novo produto:', productData);
    
    const supabaseData = convertToSupabaseProduct(productData);
    const { data, error } = await supabaseProducts.createProduct(supabaseData);
    
    if (error) {
      console.error('❌ Erro ao adicionar produto:', error);
      throw new Error(error);
    }
    
    if (!data) {
      throw new Error('Falha ao criar produto');
    }
    
    const newProduct = convertSupabaseProduct(data);
    console.log('✅ Produto adicionado com sucesso:', newProduct);
    return newProduct;
  };

  /**
   * Atualizar produto existente
   * 
   * @param {string} id - ID do produto a ser atualizado
   * @param {Partial<Product>} updates - Atualizações parciais do produto
   * @returns {Promise<Product | null>} Produto atualizado ou null se não encontrado
   */
  const updateProduct = async (id: string, updates: Partial<Product>): Promise<Product | null> => {
    console.log('🔄 Atualizando produto:', id, updates);
    
    const supabaseUpdates: any = {};
    if (updates.name) supabaseUpdates.nome = updates.name;
    if (updates.price !== undefined) supabaseUpdates.preco = updates.price;
    if (updates.description !== undefined) supabaseUpdates.descricao = updates.description;
    if (updates.image !== undefined) supabaseUpdates.url_imagem = updates.image;
    if (updates.hasUpsell !== undefined) supabaseUpdates.is_upsell = updates.hasUpsell;
    if (updates.hasOrderBump !== undefined) supabaseUpdates.is_orderbump = updates.hasOrderBump;
    if (updates.type) {
      supabaseUpdates.is_principal = updates.type === 'main';
    }
    
    const { data, error } = await supabaseProducts.updateProduct(id, supabaseUpdates);
    
    if (error) {
      console.error('❌ Erro ao atualizar produto:', error);
      throw new Error(error);
    }
    
    if (!data) {
      return null;
    }
    
    const updatedProduct = convertSupabaseProduct(data);
    console.log('✅ Produto atualizado com sucesso:', updatedProduct);
    return updatedProduct;
  };

  /**
   * Deletar produto
   * 
   * @param {string} id - ID do produto a ser deletado
   * @returns {Promise<boolean>} true se deletado com sucesso
   */
  const deleteProduct = async (id: string): Promise<boolean> => {
    console.log('🗑️ Deletando produto:', id);
    
    const { error } = await supabaseProducts.deleteProduct(id);
    
    if (error) {
      console.error('❌ Erro ao deletar produto:', error);
      throw new Error(error);
    }
    
    console.log('✅ Produto deletado com sucesso');
    return true;
  };

  /**
   * Buscar produto por ID
   * 
   * @param {string} id - ID do produto
   * @returns {Product | null} Produto encontrado ou null
   */
  const getProductById = (id: string): Product | null => {
    const supabaseProduct = supabaseProducts.getProductById(id);
    return supabaseProduct ? convertSupabaseProduct(supabaseProduct) : null;
  };

  /**
   * Recarregar produtos
   * 
   * @returns {Promise<void>}
   */
  const refreshProducts = async (): Promise<void> => {
    await supabaseProducts.refetch();
  };

  // Convert Supabase products to legacy format
  const products = supabaseProducts.products.map(convertSupabaseProduct);

  const value: ProductContextType = {
    products,
    loading: supabaseProducts.loading,
    error: supabaseProducts.error,
    addProduct,
    updateProduct,
    deleteProduct,
    getProductById,
    refreshProducts
  };

  return (
    <ProductContext.Provider value={value}>
      {children}
    </ProductContext.Provider>
  );
};
