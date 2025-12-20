import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Loading } from '../../components/ui/Loading';

export const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, profile, loading } = useAuth();

    if (loading) {
        return <Loading />;
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
    // If profile is missing after loading is done, keeping the "Loading" state feels broken.
    // However, showing a hard error scared the user.
    // Safe RBAC check:
    // If profile is missing (due to error/timeout), we fallback to allowing Owner (if matched) or blocking invalid access safely.
    // user?.id is always available if authenticated.
    const isAdmin = profile?.role === 'admin';
    const isOwnerOrAdmin = isAdmin || isOwner;

    // Strict check: Must be admin or owner.
    // If profile is null, this will be false unless isOwner is true.
    if (!isOwnerOrAdmin) {
        // If we have a user but no profile and they aren't the owner, it's safer to redirect setup/login than crash.
        // However, let's just show a friendly "Access Problem" screen instead of crashing.
        if (!profile && !isOwner) {
            return (
                <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#05050A] text-white">
                    <p className="text-gray-400">Não foi possível carregar suas permissões.</p>
                    <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-purple-600 rounded">Tentar Novamente</button>
                    <p className="text-xs text-gray-600 mt-4 font-mono">UID: {user?.id}</p>
                </div>
            );
        }

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
