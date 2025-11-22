import React, { useState, useEffect } from 'react';
import { Layout } from '../../components/Layout';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabase';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { User, Lock, Save, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

export const Settings = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Profile Form
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');

    // Password Form
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    useEffect(() => {
        if (user) {
            setName(user.user_metadata?.name || '');
            setEmail(user.email || '');
        }
    }, [user]);

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        try {
            const { error } = await supabase.auth.updateUser({
                data: { name }
            });

            if (error) throw error;

            setMessage({ type: 'success', text: 'Perfil atualizado com sucesso!' });
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message || 'Erro ao atualizar perfil' });
        } finally {
            setLoading(false);
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setMessage({ type: 'error', text: 'As senhas não coincidem' });
            return;
        }

        setLoading(true);
        setMessage(null);

        try {
            const { error } = await supabase.auth.updateUser({
                password: password
            });

            if (error) throw error;

            setMessage({ type: 'success', text: 'Senha alterada com sucesso!' });
            setPassword('');
            setConfirmPassword('');
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message || 'Erro ao alterar senha' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Layout>
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-white">Configurações da Conta</h1>
                <p className="text-gray-400 text-sm mt-1">Gerencie suas informações pessoais e segurança.</p>
            </div>

            <div className="max-w-4xl space-y-6">

                {/* Feedback Message */}
                {message && (
                    <div className={`p-4 rounded-xl border flex items-center gap-3 animate-in fade-in slide-in-from-top-2 ${message.type === 'success'
                            ? 'bg-green-500/10 border-green-500/20 text-green-400'
                            : 'bg-red-500/10 border-red-500/20 text-red-400'
                        }`}>
                        {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                        {message.text}
                    </div>
                )}

                {/* Profile Settings */}
                <Card>
                    <div className="p-6 border-b border-white/5">
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            <User className="w-5 h-5 text-primary" />
                            Informações do Perfil
                        </h2>
                    </div>
                    <form onSubmit={handleUpdateProfile} className="p-6 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1.5">Nome Completo</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                                    placeholder="Seu nome"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1.5">E-mail</label>
                                <input
                                    type="email"
                                    value={email}
                                    disabled
                                    className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-gray-400 cursor-not-allowed"
                                />
                                <p className="text-xs text-gray-500 mt-1">O e-mail não pode ser alterado.</p>
                            </div>
                        </div>
                        <div className="flex justify-end">
                            <Button type="submit" disabled={loading}>
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                Salvar Alterações
                            </Button>
                        </div>
                    </form>
                </Card>

                {/* Security Settings */}
                <Card>
                    <div className="p-6 border-b border-white/5">
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            <Lock className="w-5 h-5 text-primary" />
                            Segurança
                        </h2>
                    </div>
                    <form onSubmit={handleChangePassword} className="p-6 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1.5">Nova Senha</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                                    placeholder="••••••••"
                                    minLength={6}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1.5">Confirmar Senha</label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                                    placeholder="••••••••"
                                    minLength={6}
                                />
                            </div>
                        </div>
                        <div className="flex justify-end">
                            <Button type="submit" variant="outline" disabled={loading || !password}>
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                Alterar Senha
                            </Button>
                        </div>
                    </form>
                </Card>

            </div>
        </Layout>
    );
};
