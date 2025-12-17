import React, { useState, useEffect } from 'react';
import { Check, ChevronRight, Database, Globe, Key, Server, ShieldCheck, Terminal, AlertCircle, ExternalLink, Github } from 'lucide-react';
import { AlertModal } from '../../components/ui/Modal';

type Step = 'license' | 'supabase' | 'supabase_keys' | 'github' | 'vercel' | 'config' | 'deploy' | 'success';

export default function InstallerWizard() {
    const [currentStep, setCurrentStep] = useState<Step>('license');
    const [licenseKey, setLicenseKey] = useState('');
    const [anonKey, setAnonKey] = useState('');
    const [serviceKey, setServiceKey] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);

    // Alert Modal State
    const [alertModal, setAlertModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        variant: 'info' as 'info' | 'success' | 'error'
    });

    // Mock State for demonstration (in real app, these would be derived from successful API calls)
    const [supabaseConnected, setSupabaseConnected] = useState(false);
    const [githubConnected, setGithubConnected] = useState(false);
    const [vercelConnected, setVercelConnected] = useState(false);

    const addLog = (msg: string) => setLogs(prev => [...prev, `> ${msg}`]);

    const showAlert = (title: string, message: string, variant: 'info' | 'success' | 'error' = 'info') => {
        setAlertModal({ isOpen: true, title, message, variant });
    };

    const handleLicenseSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setLogs([]);

        // BYPASS: Localhost Mock
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            addLog('Ambiente Local detectado: Simulando validação com sucesso...');
            setTimeout(() => {
                addLog('Licença validada com sucesso! (Mock)');
                setIsLoading(false);
                setCurrentStep('supabase');
                localStorage.setItem('installer_license_key', licenseKey);
            }, 1500);
            return;
        }

        try {
            const response = await fetch('/api/licenses/validate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key: licenseKey, domain: window.location.hostname })
            });

            if (!response.ok) {
                const status = response.status;
                let errorMsg = `Erro no Servidor (${status})`;
                try {
                    const errorData = await response.json();
                    errorMsg = errorData.message || errorMsg;
                } catch (e) {
                    console.error('Non-JSON response:', e);
                }
                throw new Error(errorMsg);
            }

            const data = await response.json();

            if (data.valid) {
                addLog('Licença validada com sucesso!');
                setTimeout(() => {
                    setIsLoading(false);
                    setCurrentStep('supabase');
                }, 1000);
            } else {
                addLog(`Falha na validação: ${data.message}`);
                showAlert('Erro de Licença', data.message, 'error');
                setIsLoading(false);
            }
        } catch (error: any) {
            console.error('Validation error:', error);
            const msg = error.message || 'Erro ao conectar com servidor de validação.';
            addLog(`Erro: ${msg}`);
            showAlert('Erro de Conexão', msg, 'error');
            setIsLoading(false);
        }
    };

    const handleSupabaseConnect = () => {
        setIsLoading(true);
        const clientId = import.meta.env.VITE_SUPABASE_CLIENT_ID || process.env.NEXT_PUBLIC_SUPABASE_CLIENT_ID || 'mock_client_id';
        const redirectUri = `${window.location.origin}/installer`;
        const state = 'supabase';

        const params = new URLSearchParams({
            client_id: clientId,
            redirect_uri: redirectUri,
            response_type: 'code',
            scope: 'projects:read projects:write secrets:read secrets:write',
            state: state
        });
        window.location.href = `https://api.supabase.com/v1/oauth/authorize?${params.toString()}`;
    };

    const handleSupabaseCallback = async (code: string) => {
        setIsLoading(true);
        addLog('Supabase conectado! Criando projeto...');

        try {
            const res = await fetch('/api/installer/supabase', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'create_project',
                    code,
                    licenseKey: localStorage.getItem('installer_license_key')
                })
            });

            // Safe JSON parsing
            let data: any;
            const contentType = res.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                data = await res.json();
            } else {
                const textError = await res.text();
                throw new Error(`Erro na API (${res.status}): ${textError.substring(0, 200)}`);
            }
            if (!res.ok) throw new Error(data.error || 'Falha ao criar projeto Supabase');

            addLog(`Projeto criado: ${data.projectRef}`);

            // Store URL for next steps
            localStorage.setItem('installer_supabase_url', `https://${data.projectRef}.supabase.co`);
            // Note: Keys will be entered manually in the next step

            addLog('Rodando migrações do banco de dados (isso pode levar um minuto)...');

            // Run Migrations
            const migrationRes = await fetch('/api/installer/supabase', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'run_migrations',
                    projectRef: data.projectRef,
                    dbPass: data.dbPass,
                    accessToken: data.accessToken, // Pass token for Management API
                    licenseKey: localStorage.getItem('installer_license_key')
                })
            });

            // Safe JSON parsing
            let migrationData: any;
            const migrationContentType = migrationRes.headers.get('content-type');
            if (migrationContentType && migrationContentType.includes('application/json')) {
                migrationData = await migrationRes.json();
            } else {
                const textError = await migrationRes.text();
                throw new Error(`Erro na migração (${migrationRes.status}): ${textError.substring(0, 200)}`);
            }
            if (!migrationRes.ok) throw new Error(migrationData.error || 'Falha ao rodar migrações');

            addLog('Schema do banco de dados aplicado com sucesso!');
            setSupabaseConnected(true);

            // Transition to Manual Key Entry Step
            setCurrentStep('supabase_keys');
            addLog('Aguardando entrada manual das chaves de API...');
        } catch (error: any) {
            console.error(error);
            addLog(`Erro: ${error.message}`);
            showAlert('Erro Supabase', error.message, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeysSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!anonKey || !serviceKey) {
            showAlert('Campos Obrigatórios', 'Por favor, preencha ambas as chaves (Anon e Service Role).', 'error');
            return;
        }

        // Basic validation
        if (!anonKey.startsWith('eyJ') || !serviceKey.startsWith('eyJ')) {
            showAlert('Chaves Inválidas', 'As chaves devem começar com "eyJ" (formato JWT).', 'error');
            return;
        }

        localStorage.setItem('installer_supabase_anon_key', anonKey);
        localStorage.setItem('installer_supabase_service_key', serviceKey);

        addLog('Chaves de API salvas com sucesso!');
        setCurrentStep('github');
    };

    const handleGitHubConnect = () => {
        setIsLoading(true);
        const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID || process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID || 'mock_client_id';
        const redirectUri = `${window.location.origin}/installer`;
        const state = 'github';

        // GitHub OAuth URL
        window.location.href = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=repo&state=${state}`;
    };

    const handleGitHubCallback = async (code: string) => {
        setIsLoading(true);
        addLog('GitHub conectado! Trocando token...');

        try {
            // 1. Exchange Token
            const tokenRes = await fetch('/api/installer/github', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'exchange_token',
                    code,
                    licenseKey: localStorage.getItem('installer_license_key')
                })
            });

            const tokenData = await tokenRes.json();
            if (!tokenRes.ok) throw new Error(tokenData.error || 'Falha na autenticação GitHub');

            const accessToken = tokenData.access_token;
            addLog('Token recebido. Criando repositório privado...');

            // 2. Create Repo
            const repoRes = await fetch('/api/installer/github', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'create_repo',
                    accessToken,
                    licenseKey: localStorage.getItem('installer_license_key'),
                    repoName: `super-checkout-${Math.floor(Math.random() * 10000)}` // Unique name
                })
            });

            const repoData = await repoRes.json();
            if (!repoRes.ok) throw new Error(repoData.error || 'Falha ao criar repositório');

            addLog(`Repositório criado: ${repoData.full_name}`);

            // 3. Push Code (Simulated for now)
            addLog('Enviando código fonte para o repositório...');
            const pushRes = await fetch('/api/installer/github', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'push_code',
                    accessToken,
                    licenseKey: localStorage.getItem('installer_license_key'),
                    repoName: repoData.name
                })
            });

            if (!pushRes.ok) throw new Error('Falha ao enviar código');

            addLog('Código enviado com sucesso!');

            // Store repo details for Vercel
            localStorage.setItem('installer_github_repo', repoData.full_name);
            localStorage.setItem('installer_github_repo_id', repoData.id);

            setGithubConnected(true);
            setCurrentStep('vercel');

        } catch (error: any) {
            console.error(error);
            addLog(`Erro: ${error.message}`);
            showAlert('Erro GitHub', error.message, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleVercelConnect = () => {
        setIsLoading(true);
        const clientId = import.meta.env.VITE_VERCEL_CLIENT_ID || process.env.NEXT_PUBLIC_VERCEL_CLIENT_ID || 'mock_client_id';
        const redirectUri = `${window.location.origin}/installer`;
        const state = 'vercel';
        window.location.href = `https://vercel.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&state=${state}`;
    };

    const handleVercelCallback = async (code: string) => {
        setIsLoading(true);
        addLog('Vercel conectado! Criando projeto...');
        try {
            const res = await fetch('/api/installer/vercel', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'create_project',
                    code,
                    licenseKey: localStorage.getItem('installer_license_key'),
                    supabaseUrl: localStorage.getItem('installer_supabase_url'),
                    supabaseAnonKey: localStorage.getItem('installer_supabase_anon_key'),
                    supabaseServiceKey: localStorage.getItem('installer_supabase_service_key'),
                    githubRepo: localStorage.getItem('installer_github_repo')
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Falha ao criar projeto Vercel');

            addLog(`Projeto criado: ${data.projectName}`);
            localStorage.setItem('installer_project_url', data.projectUrl);
            localStorage.setItem('installer_project_id', data.projectId);
            // Save token implicitly returned? 
            // Wait, we need the token for checking status later. 
            // The API create_project didn't return the access token in previous code (only projectId).
            // We need to modify Vercel API to return the token or we can't check status easily without re-auth.
            // But since this is a wizard, we can keep it in memory or localStorage.

            // HOTFIX: Returning accessToken from Vercel API in next step.
            if (data.accessToken) {
                localStorage.setItem('installer_vercel_token', data.accessToken);
            }

            setVercelConnected(true);
            setCurrentStep('config');
        } catch (error: any) {
            console.error(error);
            addLog(`Erro: ${error.message}`);
            showAlert('Erro Vercel', error.message, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    // ... (useEffect remains same)

    const handleDeploy = async () => {
        setCurrentStep('deploy');
        addLog('Inicializando verificação de deploy...');

        const projectId = localStorage.getItem('installer_project_id');
        const accessToken = localStorage.getItem('installer_vercel_token');

        if (!projectId || !accessToken) {
            // Fallback for mocked mode or missing data
            if (window.location.hostname === 'localhost') {
                addLog('Modo Local: Simulando deploy...');
                setTimeout(() => {
                    addLog('Finalizado (Mock).');
                    setCurrentStep('success');
                }, 3000);
                return;
            }
            addLog('Erro: Dados de sessão perdidos. Tente reconectar o Vercel.');
            return;
        }

        let attempts = 0;
        const maxAttempts = 60; // 5 minutes approx (5s interval)

        const interval = setInterval(async () => {
            attempts++;
            try {
                const res = await fetch('/api/installer/vercel', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'check_deploy',
                        projectId,
                        accessToken
                    })
                });

                const data = await res.json();

                if (data.state === 'READY') {
                    clearInterval(interval);
                    addLog('Deploy finalizado com sucesso!');
                    addLog(`URL: ${data.url}`);
                    // Update final URL just in case
                    localStorage.setItem('installer_project_url', data.url);
                    setTimeout(() => setCurrentStep('success'), 1000);
                } else if (data.state === 'ERROR' || data.state === 'CANCELED') {
                    clearInterval(interval);
                    addLog(`Falha no deploy: ${data.state}`);
                    showAlert('Erro no Deploy', 'A Vercel reportou um erro no build. Verifique o painel da Vercel.', 'error');
                } else {
                    addLog(`Status Vercel: ${data.state || 'Aguardando...'} (${attempts}/${maxAttempts})`);
                }

                if (attempts >= maxAttempts) {
                    clearInterval(interval);
                    addLog('Tempo limite excedido. Verifique o painel da Vercel.');
                }
            } catch (e: any) {
                console.error(e);
                // Don't log every poll error to UI to avoid spam, just console
            }
        }, 5000);
    };

    // Save state changes
    useEffect(() => {
        if (licenseKey) localStorage.setItem('installer_license_key', licenseKey);
        if (currentStep) localStorage.setItem('installer_step', currentStep);
    }, [licenseKey, currentStep]);

    return (
        <div className="min-h-screen bg-[#0F0F13] text-white font-sans flex flex-col relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[120px] opacity-30"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/20 rounded-full blur-[120px] opacity-30"></div>
            </div>

            {/* Header */}
            <header className="border-b border-white/10 bg-black/20 backdrop-blur-xl sticky top-0 z-50">
                <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-primary to-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-primary/20">
                            <Server className="w-4 h-4 text-white" />
                        </div>
                        <span className="font-bold text-lg tracking-tight">Super Checkout <span className="text-white/40 font-normal">Installer</span></span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-400 font-medium">
                        <div className={`flex items-center gap-2 transition-colors ${currentStep === 'license' ? 'text-primary' : ''}`}>
                            <div className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs ${currentStep === 'license' ? 'border-primary bg-primary/10' : 'border-gray-600'}`}>1</div>
                            <span className="hidden sm:inline">Licença</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-white/20" />
                        <div className={`flex items-center gap-2 transition-colors ${['supabase', 'github', 'vercel'].includes(currentStep) ? 'text-primary' : ''}`}>
                            <div className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs ${['supabase', 'supabase_keys', 'github', 'vercel'].includes(currentStep) ? 'border-primary bg-primary/10' : 'border-gray-600'}`}>2</div>
                            <span className="hidden sm:inline">Conectar</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-white/20" />
                        <div className={`flex items-center gap-2 transition-colors ${currentStep === 'deploy' ? 'text-primary' : ''}`}>
                            <div className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs ${currentStep === 'deploy' ? 'border-primary bg-primary/10' : 'border-gray-600'}`}>3</div>
                            <span className="hidden sm:inline">Instalar</span>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 flex items-center justify-center p-6 relative z-10">
                <div className="max-w-xl w-full space-y-6">

                    {/* Pre-requisites Warning (Only on Step 1) */}
                    {currentStep === 'license' && (
                        <div className="glass-panel border border-yellow-500/20 bg-yellow-500/5 rounded-2xl p-6 animate-in fade-in slide-in-from-top-4">
                            <div className="flex items-start gap-4">
                                <div className="p-2 bg-yellow-500/10 rounded-lg shrink-0">
                                    <AlertCircle className="w-5 h-5 text-yellow-500" />
                                </div>
                                <div>
                                    <h3 className="text-yellow-500 font-bold mb-1">Antes de começar</h3>
                                    <p className="text-sm text-gray-400 mb-3">
                                        Certifique-se de que você já criou suas contas gratuitas nas plataformas abaixo. Você precisará fazer login nelas durante o processo.
                                    </p>
                                    <div className="flex gap-4">
                                        <a href="https://supabase.com/dashboard/sign-up" target="_blank" rel="noopener noreferrer" className="text-xs flex items-center gap-1 text-white hover:text-primary transition-colors font-medium">
                                            Criar conta Supabase <ExternalLink className="w-3 h-3" />
                                        </a>
                                        <a href="https://vercel.com/signup" target="_blank" rel="noopener noreferrer" className="text-xs flex items-center gap-1 text-white hover:text-primary transition-colors font-medium">
                                            Criar conta Vercel <ExternalLink className="w-3 h-3" />
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 1: License */}
                    {currentStep === 'license' && (
                        <div className="glass-panel border border-white/10 bg-white/5 backdrop-blur-xl rounded-2xl p-8 shadow-2xl animate-in fade-in slide-in-from-bottom-4">
                            <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center mb-6 text-primary shadow-lg shadow-primary/10">
                                <Key className="w-6 h-6" />
                            </div>
                            <h1 className="text-2xl font-bold mb-2 text-white">Bem-vindo ao Self-Hosted</h1>
                            <p className="text-gray-400 mb-8">Insira sua chave de licença para iniciar o processo de instalação automatizada.</p>

                            <form onSubmit={handleLicenseSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Chave de Licença</label>
                                    <input
                                        type="text"
                                        value={licenseKey}
                                        onChange={e => setLicenseKey(e.target.value)}
                                        placeholder="XXXX-XXXX-XXXX-XXXX"
                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all font-mono"
                                        required
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-3 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5"
                                >
                                    {isLoading ? 'Validando...' : 'Validar e Continuar'}
                                    {!isLoading && <ChevronRight className="w-4 h-4" />}
                                </button>
                            </form>
                        </div>
                    )}

                    {/* Step 2: Supabase */}
                    {currentStep === 'supabase' && (
                        <div className="glass-panel border border-white/10 bg-white/5 backdrop-blur-xl rounded-2xl p-8 shadow-2xl animate-in fade-in slide-in-from-bottom-4">
                            <div className="w-12 h-12 bg-[#3ECF8E]/20 rounded-xl flex items-center justify-center mb-6 text-[#3ECF8E] shadow-lg shadow-[#3ECF8E]/10">
                                <Database className="w-6 h-6" />
                            </div>
                            <h1 className="text-2xl font-bold mb-2 text-white">Conectar Banco de Dados</h1>
                            <p className="text-gray-400 mb-8">Precisamos de acesso à sua conta Supabase para criar o banco de dados e aplicar as migrações.</p>

                            <div className="space-y-4">
                                <button
                                    onClick={handleSupabaseConnect}
                                    disabled={isLoading}
                                    className="w-full bg-[#3ECF8E] hover:bg-[#3ECF8E]/90 text-black font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-[#3ECF8E]/20 hover:shadow-[#3ECF8E]/40 hover:-translate-y-0.5"
                                >
                                    {isLoading ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                            Conectando...
                                        </>
                                    ) : (
                                        'Conectar com Supabase'
                                    )}
                                </button>
                                <p className="text-xs text-center text-gray-500">
                                    Criaremos um novo projeto chamado "Super Checkout"
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Step 2.5: Manual Keys */}
                    {currentStep === 'supabase_keys' && (
                        <div className="glass-panel border border-white/10 bg-white/5 backdrop-blur-xl rounded-2xl p-8 shadow-2xl animate-in fade-in slide-in-from-bottom-4">
                            <div className="w-12 h-12 bg-[#3ECF8E]/20 rounded-xl flex items-center justify-center mb-6 text-[#3ECF8E] shadow-lg shadow-[#3ECF8E]/10">
                                <Key className="w-6 h-6" />
                            </div>
                            <h1 className="text-2xl font-bold mb-2 text-white">Configurar Chaves de API</h1>
                            <p className="text-gray-400 mb-6">
                                O projeto foi criado! Por segurança, o Supabase não nos entrega as chaves automaticamente.
                                <br />
                                Por favor, copie-as do painel do Supabase e cole abaixo.
                            </p>

                            <div className="bg-black/40 rounded-xl p-4 mb-6 border border-white/5 text-sm text-gray-300">
                                <p className="mb-2 font-bold text-white">Como encontrar as chaves:</p>
                                <ol className="list-decimal list-inside space-y-1 ml-1">
                                    <li>Acesse seu <a href="https://supabase.com/dashboard/projects" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Dashboard do Supabase</a>.</li>
                                    <li>Entre no projeto <strong>Super Checkout</strong> (recém criado).</li>
                                    <li>Vá em <strong>Project Settings</strong> (ícone de engrenagem) &gt; <strong>API</strong>.</li>
                                    <li>Copie a <code>anon public</code> e a <code>service_role</code>.</li>
                                </ol>
                            </div>

                            <form onSubmit={handleKeysSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Anon Public Key</label>
                                    <input
                                        type="text"
                                        value={anonKey}
                                        onChange={e => setAnonKey(e.target.value)}
                                        placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-[#3ECF8E] focus:ring-1 focus:ring-[#3ECF8E]/50 transition-all font-mono text-xs"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Service Role Key (Secret)</label>
                                    <input
                                        type="text"
                                        value={serviceKey}
                                        onChange={e => setServiceKey(e.target.value)}
                                        placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-[#3ECF8E] focus:ring-1 focus:ring-[#3ECF8E]/50 transition-all font-mono text-xs"
                                        required
                                    />
                                </div>
                                <button
                                    type="submit"
                                    className="w-full bg-[#3ECF8E] hover:bg-[#3ECF8E]/90 text-black font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#3ECF8E]/20 hover:shadow-[#3ECF8E]/40 hover:-translate-y-0.5 mt-2"
                                >
                                    Salvar e Continuar
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </form>
                        </div>
                    )}

                    {/* Step 3: GitHub */}
                    {currentStep === 'github' && (
                        <div className="glass-panel border border-white/10 bg-white/5 backdrop-blur-xl rounded-2xl p-8 shadow-2xl animate-in fade-in slide-in-from-bottom-4">
                            <div className="w-12 h-12 bg-gray-800 rounded-xl flex items-center justify-center mb-6 text-white shadow-lg shadow-black/20 border border-white/10">
                                <Github className="w-6 h-6" />
                            </div>
                            <h1 className="text-2xl font-bold mb-2 text-white">Criar Repositório Privado</h1>
                            <p className="text-gray-400 mb-8">Vamos criar um repositório privado no seu GitHub e copiar o código do sistema para lá.</p>

                            <div className="space-y-4">
                                <button
                                    onClick={handleGitHubConnect}
                                    disabled={isLoading}
                                    className="w-full bg-[#24292F] hover:bg-[#24292F]/90 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-black/20 hover:shadow-black/40 hover:-translate-y-0.5 border border-white/10"
                                >
                                    {isLoading ? 'Conectando...' : 'Conectar com GitHub'}
                                </button>
                                <p className="text-xs text-center text-gray-500">
                                    Será criado um repo privado: <strong>cliente/super-checkout-xxxx</strong>
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Step 4: Vercel */}
                    {currentStep === 'vercel' && (
                        <div className="glass-panel border border-white/10 bg-white/5 backdrop-blur-xl rounded-2xl p-8 shadow-2xl animate-in fade-in slide-in-from-bottom-4">
                            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-6 text-white shadow-lg shadow-white/10">
                                <Globe className="w-6 h-6" />
                            </div>
                            <h1 className="text-2xl font-bold mb-2 text-white">Conectar Hospedagem</h1>
                            <p className="text-gray-400 mb-8">Precisamos de acesso à sua conta Vercel para fazer o deploy da aplicação e configurar os domínios.</p>

                            <div className="space-y-4">
                                <button
                                    onClick={handleVercelConnect}
                                    disabled={isLoading}
                                    className="w-full bg-white hover:bg-gray-200 text-black font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-white/20 hover:shadow-white/40 hover:-translate-y-0.5"
                                >
                                    {isLoading ? 'Conectando...' : 'Conectar com Vercel'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 5: Config */}
                    {currentStep === 'config' && (
                        <div className="glass-panel border border-white/10 bg-white/5 backdrop-blur-xl rounded-2xl p-8 shadow-2xl animate-in fade-in slide-in-from-bottom-4">
                            <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center mb-6 text-blue-500 shadow-lg shadow-blue-500/10">
                                <ShieldCheck className="w-6 h-6" />
                            </div>
                            <h1 className="text-2xl font-bold mb-2 text-white">Pronto para Instalar</h1>
                            <p className="text-gray-400 mb-8">Temos tudo o que precisamos. Clique abaixo para iniciar a instalação automatizada.</p>

                            <div className="bg-black/40 rounded-xl p-4 mb-8 space-y-3 border border-white/5">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-400">Licença</span>
                                    <span className="text-green-400 flex items-center gap-1"><Check className="w-3 h-3" /> Válida</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-400">Banco de Dados</span>
                                    <span className="text-green-400 flex items-center gap-1"><Check className="w-3 h-3" /> Conectado</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-400">Repositório</span>
                                    <span className="text-green-400 flex items-center gap-1"><Check className="w-3 h-3" /> Criado</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-400">Hospedagem</span>
                                    <span className="text-green-400 flex items-center gap-1"><Check className="w-3 h-3" /> Conectado</span>
                                </div>
                            </div>

                            <button
                                onClick={handleDeploy}
                                className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5"
                            >
                                Iniciar Instalação
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    )}

                    {/* Step 6: Deploy Logs */}
                    {currentStep === 'deploy' && (
                        <div className="glass-panel border border-white/10 bg-white/5 backdrop-blur-xl rounded-2xl p-8 shadow-2xl animate-in fade-in slide-in-from-bottom-4">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center border border-white/10">
                                        <Terminal className="w-5 h-5 text-gray-400" />
                                    </div>
                                    <div>
                                        <h1 className="text-xl font-bold text-white">Instalando...</h1>
                                        <p className="text-xs text-gray-400">Não feche esta janela</p>
                                    </div>
                                </div>
                                <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                            </div>

                            <div className="bg-black/60 rounded-xl p-4 h-64 overflow-y-auto font-mono text-xs text-green-400 space-y-1 border border-white/10 custom-scrollbar shadow-inner">
                                {logs.map((log, i) => (
                                    <div key={i} className="opacity-80">{log}</div>
                                ))}
                                <div className="animate-pulse">_</div>
                            </div>
                        </div>
                    )}

                    {/* Step 7: Success */}
                    {currentStep === 'success' && (
                        <div className="glass-panel border border-white/10 bg-white/5 backdrop-blur-xl rounded-2xl p-8 shadow-2xl animate-in fade-in slide-in-from-bottom-4 text-center">
                            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mb-6 text-green-500 shadow-lg shadow-green-500/20 mx-auto animate-in zoom-in duration-300">
                                <Check className="w-10 h-10" />
                            </div>
                            <h1 className="text-3xl font-bold mb-4 text-white">Instalação Concluída! 🚀</h1>
                            <p className="text-gray-400 mb-8 max-w-md mx-auto">
                                Seu sistema Super Checkout foi instalado com sucesso e já está disponível online.
                            </p>

                            <div className="space-y-4 max-w-sm mx-auto">
                                <a
                                    href={localStorage.getItem('installer_project_url') || '#'}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-1"
                                >
                                    Acessar Meu Sistema
                                    <ExternalLink className="w-5 h-5" />
                                </a>
                                <p className="text-xs text-gray-500">
                                    A primeira carga pode demorar alguns segundos.
                                </p>
                            </div>
                        </div>
                    )}

                </div>
            </main>

            {/* Notification Modal */}
            <AlertModal
                isOpen={alertModal.isOpen}
                onClose={() => setAlertModal(prev => ({ ...prev, isOpen: false }))}
                title={alertModal.title}
                message={alertModal.message}
                variant={alertModal.variant}
                buttonText="Entendi"
            />
        </div>
    );
}
