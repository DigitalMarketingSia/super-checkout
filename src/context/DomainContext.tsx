/**
 * DomainContext - Context de Gerenciamento de Domínios com Supabase
 * 
 * Gerencia o estado global dos domínios da aplicação usando Supabase database.
 */

import { createContext, useContext, ReactNode } from 'react';
import { useSupabaseDomains } from '@/hooks/useSupabaseDomains';
import { useAuth } from '@/context/AuthContext';
import { Database } from '@/integrations/supabase/types';

// Type definitions from Supabase
type SupabaseDomain = Database['public']['Tables']['domains']['Row'];

export interface CustomDomain {
  id: string;
  hostname: string;
  status: 'pendente' | 'verificado' | 'erro';
  createdAt: string;
}

// Helper function to convert Supabase domain to legacy format
const convertSupabaseDomain = (supabaseDomain: SupabaseDomain): CustomDomain => ({
  id: supabaseDomain.id,
  hostname: supabaseDomain.domain,
  status: supabaseDomain.is_active ? 'verificado' : 'pendente',
  createdAt: supabaseDomain.created_at?.split('T')[0] || '',
});

// Helper function to convert legacy domain to Supabase format
const convertToSupabaseDomain = (domain: Omit<CustomDomain, 'id' | 'createdAt'>, userId: string) => ({
  domain: domain.hostname,
  user_id: userId,
  is_active: domain.status === 'verificado',
});

interface DomainContextType {
  customDomain: CustomDomain | null;
  saveDomain: (hostname: string) => Promise<CustomDomain>;
  deleteDomain: () => void;
  simulateVerification: (domainId: string) => void;
}

const DomainContext = createContext<DomainContextType | undefined>(undefined);

export const useDomainContext = () => {
  const context = useContext(DomainContext);
  if (!context) {
    throw new Error('useDomainContext must be used within a DomainProvider');
  }
  return context;
};

interface DomainProviderProps {
  children: ReactNode;
}

export const DomainProvider: React.FC<DomainProviderProps> = ({ children }) => {
  const supabaseDomains = useSupabaseDomains();
  const { user, isAuthenticated } = useAuth();

  // Get the first domain as custom domain (backward compatibility)
  const customDomain = supabaseDomains.domains.length > 0 
    ? convertSupabaseDomain(supabaseDomains.domains[0]) 
    : null;

  const saveDomain = async (hostname: string): Promise<CustomDomain> => {
    if (!user || !isAuthenticated) {
      throw new Error('Usuário não autenticado');
    }

    const newDomain: CustomDomain = {
      id: `dom_${Date.now()}`,
      hostname: hostname.toLowerCase().trim(),
      status: 'pendente',
      createdAt: new Date().toISOString().split('T')[0]
    };

    console.log('🌐 Salvando domínio:', newDomain);
    
    // Save to Supabase
    try {
      const supabaseData = convertToSupabaseDomain(newDomain, user.id);
      const { data, error } = await supabaseDomains.createDomain(supabaseData);
      
      if (error) {
        console.error('❌ Erro ao salvar domínio:', error);
        throw new Error(error);
      }
      
      if (data) {
        const savedDomain = convertSupabaseDomain(data);
        console.log('✅ Domínio salvo no Supabase:', savedDomain);
        
        // Start verification simulation
        setTimeout(() => {
          simulateVerification(savedDomain.id);
        }, 100);
        
        return savedDomain;
      }
    } catch (err) {
      console.error('❌ Erro ao salvar domínio:', err);
    }
    
    return newDomain;
  };

  const simulateVerification = (domainId: string) => {
    console.log('🔍 Simulando verificação para domínio:', domainId);
    
    // Simulate DNS verification after 3 seconds
    setTimeout(async () => {
      console.log('✅ Verificação concluída! Atualizando status...');
      
      try {
        const { error } = await supabaseDomains.updateDomain(domainId, { is_active: true });
        
        if (error) {
          console.error('❌ Erro ao verificar domínio:', error);
        } else {
          console.log('🎉 Domínio verificado com sucesso no Supabase!');
        }
      } catch (err) {
        console.error('❌ Erro na verificação:', err);
      }
    }, 3000);
  };

  const deleteDomain = () => {
    if (customDomain) {
      // Async operation in background
      const performAsyncDelete = async () => {
        try {
          const { error } = await supabaseDomains.deleteDomain(customDomain.id);
          if (error) {
            console.error('❌ Erro ao deletar domínio:', error);
          } else {
            console.log('✅ Domínio deletado no Supabase');
          }
        } catch (err) {
          console.error('❌ Erro async ao deletar domínio:', err);
        }
      };
      
      performAsyncDelete();
    }
    console.log('🗑️ Domínio removido');
  };

  return (
    <DomainContext.Provider
      value={{
        customDomain,
        saveDomain,
        deleteDomain,  
        simulateVerification
      }}
    >
      {children}
    </DomainContext.Provider>
  );
};