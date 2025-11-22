
import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import { useNavigate } from 'react-router-dom';
import { CreditCard, Lock, Mail, Loader2, AlertCircle, User, ArrowRight, CheckCircle, ShieldCheck, Coins } from 'lucide-react';

export const Login = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'login' | 'signup' | 'recovery'>('login');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        navigate('/admin');
      } else if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name: name,
            },
          },
        });
        if (error) throw error;
        setSuccess('Conta criada com sucesso! Verifique seu e-mail para confirmar.');
        // Optional: Switch to login or stay to show message
        // setMode('login');
      } else if (mode === 'recovery') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + '/update-password',
        });
        if (error) throw error;
        setSuccess('Link de recuperação enviado! Verifique seu e-mail.');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Ocorreu um erro. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#05050A] text-white font-sans">
      {/* Left Side - Visual & Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-[#0A0A12] items-center justify-center p-12">
        {/* Abstract Background Elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
          <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-primary/20 rounded-full blur-[120px] animate-pulse-slow"></div>
          <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-purple-900/20 rounded-full blur-[100px] animate-pulse-slow delay-1000"></div>
        </div>

        <div className="relative z-10 max-w-lg">
          <div className="w-16 h-16 bg-gradient-to-br from-primary to-purple-900 rounded-2xl flex items-center justify-center mb-8 shadow-2xl shadow-primary/30">
            <CreditCard className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-5xl font-bold mb-6 leading-tight">
            Tenha seu próprio sistema de checkout <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-400">sem taxas.</span>
          </h1>
          <p className="text-xl text-gray-400 leading-relaxed mb-8">
            Liberdade total para escalar seu negócio. Sem comissões por venda, sem bloqueios e com o dinheiro direto na sua conta.
          </p>

          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 p-4 rounded-xl">
              <div className="flex items-center gap-3 mb-2">
                <Coins className="w-6 h-6 text-green-400" />
                <h3 className="text-2xl font-bold text-white">0%</h3>
              </div>
              <p className="text-sm text-gray-400">Taxas por Venda</p>
            </div>
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 p-4 rounded-xl">
              <div className="flex items-center gap-3 mb-2">
                <ShieldCheck className="w-6 h-6 text-primary" />
                <h3 className="text-2xl font-bold text-white">100%</h3>
              </div>
              <p className="text-sm text-gray-400">Controle Total</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12 relative">
        {/* Mobile Background Blob */}
        <div className="absolute top-0 right-0 w-full h-full overflow-hidden z-0 lg:hidden pointer-events-none">
          <div className="absolute top-[-10%] right-[-10%] w-[80%] h-[50%] bg-primary/10 rounded-full blur-[80px]"></div>
        </div>

        <div className="w-full max-w-md relative z-10">
          <div className="text-center lg:text-left mb-8">
            <h2 className="text-3xl font-bold mb-2">
              {mode === 'login' && 'Bem-vindo de volta'}
              {mode === 'signup' && 'Crie sua conta'}
              {mode === 'recovery' && 'Recuperar Senha'}
            </h2>
            <p className="text-gray-400">
              {mode === 'login' && 'Acesse seu painel administrativo.'}
              {mode === 'signup' && 'Comece a vender sem taxas hoje mesmo.'}
              {mode === 'recovery' && 'Digite seu e-mail para receber o link de redefinição.'}
            </p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl mb-6 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {success && (
            <div className="bg-green-500/10 border border-green-500/20 text-green-400 p-4 rounded-xl mb-6 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
              <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span className="text-sm">{success}</span>
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-5">

            {mode === 'signup' && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-300 ml-1">Nome Completo</label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-primary transition-colors" />
                  <input
                    type="text"
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3.5 text-white outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all placeholder:text-gray-600"
                    placeholder="Seu nome"
                    value={name}
                    onChange={e => setName(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-300 ml-1">E-mail</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-primary transition-colors" />
                <input
                  type="email"
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3.5 text-white outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all placeholder:text-gray-600"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>
            </div>

            {mode !== 'recovery' && (
              <div className="space-y-1.5">
                <div className="flex justify-between items-center ml-1">
                  <label className="text-sm font-medium text-gray-300">Senha</label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => { setMode('recovery'); setError(null); setSuccess(null); }}
                      className="text-xs text-primary hover:text-primary-light transition-colors"
                    >
                      Esqueceu a senha?
                    </button>
                  )}
                </div>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-primary transition-colors" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3.5 text-white outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all placeholder:text-gray-600"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-primary to-purple-600 hover:from-primary-hover hover:to-purple-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-primary/25 hover:shadow-primary/40 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed mt-4 group"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {mode === 'login' && 'Entrar na Conta'}
                  {mode === 'signup' && 'Criar Conta Grátis'}
                  {mode === 'recovery' && 'Enviar Link de Recuperação'}
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            {mode === 'recovery' ? (
              <button
                onClick={() => { setMode('login'); setError(null); setSuccess(null); }}
                className="text-gray-400 hover:text-white transition-colors flex items-center justify-center gap-2 mx-auto"
              >
                Voltar para Login
              </button>
            ) : (
              <p className="text-gray-400">
                {mode === 'login' ? 'Ainda não tem uma conta?' : 'Já tem uma conta?'}
                <button
                  onClick={() => {
                    setMode(mode === 'login' ? 'signup' : 'login');
                    setError(null);
                    setSuccess(null);
                  }}
                  className="ml-2 text-white font-medium hover:text-primary transition-colors"
                >
                  {mode === 'login' ? 'Cadastre-se' : 'Fazer Login'}
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
