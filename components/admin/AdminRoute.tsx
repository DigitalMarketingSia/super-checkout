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

    // Emergency Bypass for Owner
    const ownerEmail = 'contato.jeandamin@gmail.com';
    const isOwner = user.email === ownerEmail;

    // If profile is still loading (or failed to load) but user exists, 
    // we shouldn't show "Access Denied" yet. 
    // This happens sometimes on refresh before RLS resolves.
    // If profile is still loading (or failed to load) but user exists, 
    // we shouldn't show "Access Denied" yet. 
    // This happens sometimes on refresh before RLS resolves.
    // If profile is missing after loading is done, keeping the "Loading" state feels broken.
    // However, showing a hard error scared the user.
    // Solution: Show "Loading" with a "Taking too long?" option.
    if (!profile) {
        return (
            <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#05050A] text-white gap-4">
                <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-gray-400 animate-pulse">Carregando Perfil... (v3.1)</p>
                <p className="text-xs text-gray-600 font-mono">UID: {user?.id}</p>

                <div className="mt-8 flex flex-col items-center gap-2 opacity-0 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-3000" style={{ animationDelay: '3s', opacity: 1 }}>
                    <p className="text-xs text-gray-500 mb-2">Demorando muito?</p>
                    <div className="flex gap-2">
                        <button
                            onClick={() => window.location.reload()}
                            className="text-xs bg-white/10 hover:bg-white/20 px-3 py-2 rounded text-white transition-colors"
                        >
                            Tentar Novamente
                        </button>
                        <button
                            onClick={() => window.location.href = '/login'}
                            className="text-xs bg-red-500/10 hover:bg-red-500/20 px-3 py-2 rounded text-red-400 transition-colors"
                        >
                            Sair / Login
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (profile.role !== 'admin' && !isOwner) {
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
