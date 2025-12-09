import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, profile, loading } = useAuth();

    if (loading) {
        return <div className="h-screen w-screen flex items-center justify-center bg-[#05050A] text-white">Carregando...</div>;
    }

    // Debugging logs to help troubleshoot role issues
    if (!user) {
        console.log('AdminRoute: User not authenticated, redirecting to login.');
        return <Navigate to="/login" replace />;
    }

    if (profile?.role !== 'admin') {
        console.warn('AdminRoute: Unauthorized access attempt by user:', user.email, 'Role:', profile?.role);
        // Ideally redirect to a "Unauthorized" page or their member home if known.
        // For now, let's render a generic forbidden message to avoid infinite loops if we redirected to root (which might redirect back here).
        return (
            <div className="min-h-screen bg-[#05050A] flex flex-col items-center justify-center text-white p-6 text-center">
                <h1 className="text-3xl font-bold text-red-500 mb-4">Acesso Negado</h1>
                <p className="text-gray-400 max-w-md mb-6">
                    Sua conta não possui permissão para acessar o Painel Administrativo.
                    Este acesso é exclusivo para proprietários do sistema.
                </p>
                <p className="text-gray-500 text-sm">
                    Se você é um aluno/membro, por favor utilize o link de acesso enviado para seu e-mail.
                </p>
                <button
                    onClick={() => window.history.back()}
                    className="mt-8 px-6 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
                >
                    Voltar
                </button>
            </div>
        );
    }

    return <>{children}</>;
};
