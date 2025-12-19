import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, Loader2, AlertCircle, User, ArrowRight, CheckCircle, ShieldCheck, Coins, Check } from 'lucide-react';
import { memberService } from '../services/memberService';

export const Login = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'login' | 'signup' | 'recovery'>('login');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Check if initial setup is required
  useEffect(() => {
    const checkSetup = async () => {
      const { data, error } = await supabase.rpc('is_setup_required');
      if (data === true) {
        navigate('/setup');
      }
    };
    checkSetup();
  }, []);

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
        const { data: { user }, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;

        if (user) {
          // Update last seen & log activity (Fire & Forget)
          memberService.updateLastSeen(user.id).catch(console.error);
          memberService.logActivity(user.id, 'login', { method: 'password' }).catch(console.error);

          // Fetch Profile to check role
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

          if (profile?.role === 'admin') {
            navigate('/admin');
          } else {
            // Member login at root? Try to find where to go or show message
            // Ideally we find their first accessible member area
            // For now, redirect to a generic page or just show success and tell them to use their link
            // But wait, if they have a link /app/teste, they should be logging in THERE (MemberLogin.tsx).
            // If they log in here, they might be confused.
            // Let's redirect to a "Hub" or just "app" and let App.tsx handle it?
            // App.tsx has no generic /app route.
            // Let's redirect to /admin so the AdminRoute showing "Access Denied" does its job explaining "Use your link".
            // This is the safest "quick fix" that aligns with the user's request "User could not access admin".
            // The AdminRoute page has the text: "Se você é um aluno/membro, por favor utilize o link de acesso enviado para seu e-mail."
            navigate('/admin');
          }
        }
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
          <h1 className="text-5xl font-bold mb-6 leading-tight">
            Seu sistema de checkout <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-400">sem taxas.</span>
          </h1>
          <p className="text-2xl text-white font-semibold leading-relaxed mb-8">
            Liberdade total para escalar seu negócio.
          </p>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                <Check className="w-5 h-5 text-green-400" />
              </div>
              <p className="text-lg text-gray-300">Sem bloqueios</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                <Check className="w-5 h-5 text-green-400" />
              </div>
              <p className="text-lg text-gray-300">Sem comissões por venda</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                <Check className="w-5 h-5 text-green-400" />
              </div>
              <p className="text-lg text-gray-300">Dinheiro direto na sua conta</p>
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
