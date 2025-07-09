/**
 * AuthContext - Context de Autenticação com Supabase
 * 
 * Gerencia o estado global de autenticação da aplicação usando Supabase Auth,
 * incluindo informações do usuário logado e controle de sessão.
 * 
 * @context AuthContext
 * @description Context responsável por gerenciar a autenticação real da aplicação
 * usando Supabase Auth com tokens JWT, refresh automático e persistência de sessão.
 * 
 * @example
 * ```tsx
 * const { isLoggedIn, user, signIn, signOut, loading } = useAuth();
 * ```
 */

import React, { createContext, useContext, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ data: any; error: any }>;
  signUp: (email: string, password: string) => Promise<{ data: any; error: any }>;
  signOut: () => Promise<{ error: any }>;
  // Legacy compatibility
  isLoggedIn: boolean;
  currentUserEmail: string | null;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Hook para acessar o contexto de autenticação
 * 
 * @returns {AuthContextType} Objeto com estado e métodos de autenticação
 * @throws {Error} Se usado fora do AuthProvider
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * AuthProvider Component
 * 
 * Provider do contexto de autenticação que envolve a aplicação e fornece
 * estado de autenticação para todos os componentes filhos usando Supabase Auth.
 * 
 * @param {AuthProviderProps} props - Props do provider
 * @param {ReactNode} props.children - Componentes filhos
 * 
 * @returns {JSX.Element} Provider com contexto de autenticação
 */
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const auth = useSupabaseAuth();

  // Legacy logout function for backward compatibility
  const logout = async () => {
    console.log('🚪 Fazendo logout...');
    const { error } = await auth.signOut();
    if (!error) {
      window.location.href = '/login';
    }
  };

  const value: AuthContextType = {
    user: auth.user,
    isAuthenticated: auth.isAuthenticated,
    loading: auth.loading,
    signIn: auth.signIn,
    signUp: auth.signUp,
    signOut: auth.signOut,
    // Legacy compatibility
    isLoggedIn: auth.isAuthenticated,
    currentUserEmail: auth.user?.email || null,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};