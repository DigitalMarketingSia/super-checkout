import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, User, Mail, Lock, ChevronRight, AlertCircle, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Setup() {
    const navigate = useNavigate();
    const { fetchProfile } = useAuth();

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const checkSetup = async () => {
            try {
                const { data: isRequired, error } = await supabase.rpc('is_setup_required');
                if (error) throw error;
                if (!isRequired) {
                    navigate('/login');
                }
            } catch (err) {
                console.error('Error checking setup status:', err);
            }
        };
        checkSetup();
    }, [navigate]);

    const handleSetup = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            // double check if setup is still required
            const { data: isRequired, error: rpcError } = await supabase.rpc('is_setup_required');
            if (rpcError) throw rpcError;

            if (!isRequired) {
                // Someone beat us to it, or it's already set up
                alert('O sistema já possui um administrador. Redirecionando para login...');
                navigate('/login');
                return;
            }

            const { data, error: signUpError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: name,
                        role: 'admin' // Trigger will enforce this anyway, but good for clarity
                    }
                }
            });

            if (signUpError) throw signUpError;

            if (data.user) {
                // Wait a moment for trigger to run
                await new Promise(resolve => setTimeout(resolve, 1000));
                await fetchProfile(); // Refresh context
                navigate('/admin');
            }

        } catch (err: any) {
            console.error(err);
            if (err.message && err.message.includes('already registered')) {
                // If user exists, but setup is still "required" (no admin profile), 
                // it means we have a dirty state (Auth exists, Profile missing).
                // We show a specific help message.
                setError('Este e-mail já está cadastrado. Verifique se recebeu o link de confirmação ou execute o script de correção de perfis no banco de dados.');
            } else {
                setError(err.message || 'Erro ao criar conta de administrador.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#05050A] text-white selection:bg-primary/30 font-sans relative overflow-hidden flex items-center justify-center">
            {/* Background Effects */}
            <div className="fixed top-0 left-0 w-[500px] h-[500px] bg-[#3ECF8E]/10 rounded-full blur-[128px] pointer-events-none -translate-x-1/2 -translate-y-1/2 mix-blend-screen" />
            <div className="fixed bottom-0 right-0 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[128px] pointer-events-none translate-x-1/2 translate-y-1/2 mix-blend-screen" />

            <div className="w-full max-w-md p-8 relative z-10">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center p-3 mb-6 rounded-2xl bg-white/5 border border-white/10 shadow-2xl backdrop-blur-sm animate-in zoom-in duration-500">
                        <ShieldCheck className="w-8 h-8 text-[#3ECF8E]" />
                    </div>
                    <h1 className="text-3xl font-extrabold tracking-tight mb-2 bg-clip-text text-transparent bg-gradient-to-r from-white via-gray-200 to-gray-400">
                        Bem-vindo(a)
                    </h1>
                    <p className="text-gray-400">
                        Vamos criar sua conta de <strong>Administrador</strong> para acessar o sistema.
                    </p>
                </div>

                <div className="glass-panel border border-white/10 bg-white/5 backdrop-blur-xl rounded-2xl p-8 shadow-2xl animate-in fade-in slide-in-from-bottom-4">
                    <form onSubmit={handleSetup} className="space-y-4">

                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">Nome Completo</label>
                            <div className="relative group">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-white transition-colors" />
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder-gray-600 focus:border-[#3ECF8E]/50 focus:ring-1 focus:ring-[#3ECF8E]/50 outline-none transition-all"
                                    placeholder="Seu Nome"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">E-mail de Acesso</label>
                            <div className="relative group">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-white transition-colors" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder-gray-600 focus:border-[#3ECF8E]/50 focus:ring-1 focus:ring-[#3ECF8E]/50 outline-none transition-all"
                                    placeholder="seu@email.com"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">Senha Segura</label>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-white transition-colors" />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder-gray-600 focus:border-[#3ECF8E]/50 focus:ring-1 focus:ring-[#3ECF8E]/50 outline-none transition-all"
                                    placeholder="••••••••"
                                    required
                                    minLength={6}
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-center gap-2 animate-in slide-in-from-top-2">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-[#3ECF8E] hover:bg-[#3ECF8E]/90 text-black font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#3ECF8E]/20 hover:shadow-[#3ECF8E]/40 hover:-translate-y-1 mt-4"
                        >
                            {loading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                    Criando Conta...
                                </>
                            ) : (
                                <>
                                    Criar Conta e Acessar <ChevronRight className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </form>
                </div>
                <p className="text-center text-gray-600 text-xs mt-8">
                    &copy; Super Checkout System
                </p>
            </div>
        </div>
    );
}
