/**
 * AuthGuard Component
 * 
 * Componente de proteção de rotas que verifica se o usuário está autenticado
 * usando Supabase Auth antes de permitir acesso às páginas protegidas.
 * 
 * @component AuthGuard
 * @description Higher-Order Component que implementa proteção de rotas baseada
 * em autenticação real com Supabase Auth e tokens JWT.
 * 
 * @param {AuthGuardProps} props - Props do componente
 * @param {ReactNode} props.children - Componentes filhos a serem protegidos
 * 
 * @returns {JSX.Element | null} Renderiza os children se autenticado, senão null
 */

import React, { useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

interface AuthGuardProps {
  children: ReactNode;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const navigate = useNavigate();
  const { isAuthenticated, loading, user } = useAuth();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      console.log('🔒 Usuário não autenticado, redirecionando para login');
      navigate('/login', { replace: true });
      return;
    }
    
    if (isAuthenticated && user) {
      console.log('✅ Usuário autenticado:', user.email);
    }
  }, [isAuthenticated, loading, navigate, user]);

  // Mostrar loading enquanto verifica autenticação
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Não renderizar nada se não estiver autenticado
  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
};