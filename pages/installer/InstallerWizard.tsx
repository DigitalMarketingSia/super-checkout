import React, { useState, useEffect } from 'react';
import { Check, ChevronRight, Database, Key, Server, AlertCircle, ExternalLink, Github, Globe, Copy, Info } from 'lucide-react';
import { AlertModal } from '../../components/ui/Modal';

// Define the steps for the guided flow
type Step = 'license' | 'supabase' | 'supabase_migrations' | 'supabase_keys' | 'deploy' | 'success';

export default function InstallerWizard() {
    const [currentStep, setCurrentStep] = useState<Step>('license');
    const [licenseKey, setLicenseKey] = useState('');
    const [organizationSlug, setOrganizationSlug] = useState('');
    const [anonKey, setAnonKey] = useState('');
    const [serviceKey, setServiceKey] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);
    const [supabaseUrl, setSupabaseUrl] = useState('');

    // New inputs for Guided Flow
    const [repoUrl, setRepoUrl] = useState('');
    const [vercelDomain, setVercelDomain] = useState('');

    // Alert Modal State
    const [alertModal, setAlertModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        variant: 'info' as 'info' | 'success' | 'error'
    });

    const addLog = (msg: string) => setLogs(prev => [...prev, `> ${msg}`]);

    const showAlert = (title: string, message: string, variant: 'info' | 'success' | 'error' = 'info') => {
        setAlertModal({ isOpen: true, title, message, variant });
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        addLog('Copiado para a área de transferência!');
    };

    // --- LOGIC: License ---
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
            }, 1000);
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
                let errorMsg = `Erro no Servidor(${status})`;
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

    // --- LOGIC: Supabase ---
    const handleSupabaseConnect = () => {
        setIsLoading(true);
        const clientId = import.meta.env.VITE_SUPABASE_CLIENT_ID || process.env.NEXT_PUBLIC_SUPABASE_CLIENT_ID || 'mock_client_id';
        const redirectUri = `${window.location.origin}/installer`;

        const stateObj = {
            step: 'supabase',
            key: licenseKey
        };
        const state = btoa(JSON.stringify(stateObj));

        const params = new URLSearchParams({
            client_id: clientId,
            redirect_uri: redirectUri,
            response_type: 'code',
            scope: 'projects:read projects:write secrets:read secrets:write organizations:read',
            state: state
        });
        window.location.href = `https://api.supabase.com/v1/oauth/authorize?${params.toString()}`;
    };

    const handleSupabaseCallback = async (code: string) => {
        setIsLoading(true);
        setCurrentStep('supabase');
        addLog('Supabase conectado! Criando projeto...');

        try {
            const res = await fetch('/api/installer/supabase', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'create_project',
                    code,
                    licenseKey: licenseKey || localStorage.getItem('installer_license_key'),
                    organizationSlug: organizationSlug || localStorage.getItem('installer_org_slug')
                })
            });

            let data: any;
            const contentType = res.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                data = await res.json();
            } else {
                const textError = await res.text();
                throw new Error(`Erro na API (${res.status}): ${textError.substring(0, 200)}`);
            }
            if (!res.ok) throw new Error(data.error || 'Falha ao criar projeto Supabase');

            const url = `https://${data.projectRef}.supabase.co`;
            setSupabaseUrl(url);
            localStorage.setItem('installer_supabase_url', url);
            localStorage.setItem('installer_supabase_ref', data.projectRef);
            localStorage.setItem('installer_supabase_dbpass', data.dbPass);

            addLog('✅ Projeto Supabase criado com sucesso!');
            setCurrentStep('supabase_migrations'); // Go to migrations
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
            showAlert('Campos Obrigatórios', 'Por favor, preencha ambas as chaves.', 'error');
            return;
        }
        localStorage.setItem('installer_supabase_anon_key', anonKey);
        localStorage.setItem('installer_supabase_service_key', serviceKey);

        addLog('Chaves de API salvas com sucesso!');
        setCurrentStep('deploy'); // Go to Deploy Step
    };

    // --- LOGIC: GitHub Guide ---
    const handleRepoSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!repoUrl) {
            showAlert('Campo Obrigatório', 'Por favor, cole a URL do seu repositório.', 'error');
            return;
        }
        localStorage.setItem('installer_repo_url', repoUrl);
        setCurrentStep('vercel_guide');
    }

    // --- LOGIC: Deploy (New Unified Step) ---
    const handleDeploySubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!vercelDomain) {
            showAlert('Campo Obrigatório', 'Por favor, cole o domínio (URL) do seu projeto na Vercel.', 'error');
            return;
        }
        let cleanDomain = vercelDomain.replace('https://', '').replace('http://', '').split('/')[0];
        localStorage.setItem('installer_vercel_domain', cleanDomain);
        setCurrentStep('success');
    }

    // --- EFFECTS ---
    useEffect(() => {
        if (licenseKey) localStorage.setItem('installer_license_key', licenseKey);
        if (organizationSlug) localStorage.setItem('installer_org_slug', organizationSlug);
        if (currentStep) localStorage.setItem('installer_step', currentStep);
    }, [licenseKey, organizationSlug, currentStep]);

    useEffect(() => {
        const savedKey = localStorage.getItem('installer_license_key');
        if (savedKey) setLicenseKey(savedKey);

        // Restore keys if available
        setAnonKey(localStorage.getItem('installer_supabase_anon_key') || '');
        setServiceKey(localStorage.getItem('installer_supabase_service_key') || '');
        setSupabaseUrl(localStorage.getItem('installer_supabase_url') || '');

        const savedStep = localStorage.getItem('installer_step') as Step;
        if (savedStep && savedStep !== 'success') setCurrentStep(savedStep);

        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        const stateRaw = params.get('state');

        if (code && stateRaw) {
            try {
                const stateObj = JSON.parse(atob(stateRaw));
                if (stateObj.key) setLicenseKey(stateObj.key);
                window.history.replaceState({}, '', '/installer');
                if (stateObj.step === 'supabase') handleSupabaseCallback(code);
            } catch (e) {
                // Ignore errors
            }
        }
    }, []);

    // Helper to get step number
    const getStepStatus = (step: Step, position: number) => {
        // Updated flow: license -> supabase -> deploy -> success
        const stepsOrder = ['license', 'supabase', 'deploy', 'success'];
        const currentIndex = stepsOrder.indexOf(currentStep === 'supabase_migrations' || currentStep === 'supabase_keys' ? 'supabase' : currentStep);
        if (currentIndex > position) return 'completed';
        if (currentIndex === position) return 'active';
        return 'pending';
    };

    const deployUrl = `https://vercel.com/new/clone?repository-url=https://github.com/DigitalMarketingSia/super-checkout&env=NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY,SUPABASE_SERVICE_ROLE_KEY&envDescription=Configuracao%20Super%20Checkout&project-name=super-checkout&repository-name=super-checkout`;

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

                    {/* Progress Steps */}
                    <div className="flex items-center gap-4 text-sm font-medium">
                        {[
                            { label: 'Licença', step: 0 },
                            { label: 'Banco de Dados', step: 1 },
                            { label: 'Deploy', step: 2 },
                            { label: 'Conclusão', step: 3 }
                        ].map((s, idx) => {
                            const status = getStepStatus(currentStep, idx);
                            const isActive = status === 'active';
                            const isCompleted = status === 'completed';

                            return (
                                <div key={idx} className={`flex items-center gap-2 ${isActive ? 'text-primary' : isCompleted ? 'text-green-400' : 'text-gray-600'} hidden sm:flex`}>
                                    <div className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs transition-colors
                                        ${isActive ? 'border-primary bg-primary/10' : isCompleted ? 'border-green-400 bg-green-400/10' : 'border-gray-600'}`}>
                                        {isCompleted ? <Check className="w-3 h-3" /> : idx + 1}
                                    </div>
                                    <span className={!isActive && !isCompleted ? 'hidden' : ''}>{s.label}</span>
                                    {idx < 3 && <ChevronRight className="w-3 h-3 text-gray-700 ml-2" />}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 flex items-center justify-center p-6 relative z-10">
                <div className="max-w-xl w-full space-y-6">

                    {/* --- STEP 1: LICENSE --- */}
                    {currentStep === 'license' && (
                        <div className="glass-panel border border-white/10 bg-white/5 backdrop-blur-xl rounded-2xl p-8 shadow-2xl animate-in fade-in slide-in-from-bottom-4">
                            <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center mb-6 text-primary shadow-lg shadow-primary/10">
                                <Key className="w-6 h-6" />
                            </div>
                            <h1 className="text-2xl font-bold mb-2 text-white">Bem-vindo</h1>
                            <p className="text-gray-400 mb-8">Insira sua chave de licença para iniciar a configuração.</p>

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
                                    className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:shadow-primary/40"
                                >
                                    {isLoading ? 'Validando...' : 'Iniciar Configuração'}
                                    {!isLoading && <ChevronRight className="w-4 h-4" />}
                                </button>
                            </form>
                        </div>
                    )}

                    {/* --- STEP 2: SUPABASE CONNECT --- */}
                    {currentStep === 'supabase' && (
                        <div className="glass-panel border border-white/10 bg-white/5 backdrop-blur-xl rounded-2xl p-8 shadow-2xl animate-in fade-in slide-in-from-bottom-4">
                            <div className="w-12 h-12 bg-[#3ECF8E]/20 rounded-xl flex items-center justify-center mb-6 text-[#3ECF8E] shadow-lg shadow-[#3ECF8E]/10">
                                <Database className="w-6 h-6" />
                            </div>
                            <h1 className="text-2xl font-bold mb-2 text-white">Configurar Banco de Dados</h1>
                            <p className="text-gray-400 mb-8">Vamos criar seu projeto no Supabase onde seus dados serão armazenados.</p>

                            <div className="space-y-4">
                                <button
                                    onClick={handleSupabaseConnect}
                                    disabled={isLoading}
                                    className="w-full bg-[#3ECF8E] hover:bg-[#3ECF8E]/90 text-black font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#3ECF8E]/20 hover:shadow-[#3ECF8E]/40"
                                >
                                    {isLoading ? 'Conectando...' : 'Conectar com Supabase'}
                                </button>
                                <p className="text-xs text-center text-gray-500">
                                    Será criado um projeto "Super Checkout" na sua conta.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* --- STEP 2.5: MIGRATIONS --- */}
                    {currentStep === 'supabase_migrations' && (
                        <div className="glass-panel border border-white/10 bg-white/5 backdrop-blur-xl rounded-2xl p-8 shadow-2xl animate-in fade-in slide-in-from-bottom-4">
                            <div className="w-12 h-12 bg-[#3ECF8E]/20 rounded-xl flex items-center justify-center mb-6 text-[#3ECF8E] shadow-lg shadow-[#3ECF8E]/10">
                                <Database className="w-6 h-6" />
                            </div>
                            <h1 className="text-2xl font-bold mb-2 text-white">Criar Tabelas (Migração)</h1>
                            <p className="text-gray-400 mb-6">Execute o código SQL abaixo no seu Supabase para criar a estrutura do banco.</p>

                            <div className="bg-black/40 rounded-xl p-4 mb-6 border border-white/5 text-sm text-gray-300">
                                <ol className="list-decimal list-inside space-y-2 ml-1">
                                    <li>Copie o conteúdo do arquivo <code className="text-primary">supabase_complete_schema.sql</code></li>
                                    <li>Vá no painel do Supabase {'>'} SQL Editor</li>
                                    <li>Cole e clique em <strong>Run</strong></li>
                                </ol>
                            </div>

                            <button
                                onClick={() => setCurrentStep('supabase_keys')}
                                className="w-full bg-[#3ECF8E] hover:bg-[#3ECF8E]/90 text-black font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#3ECF8E]/20 hover:shadow-[#3ECF8E]/40"
                            >
                                Já executei o SQL
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    )}

                    {/* --- STEP 2.75: KEYS --- */}
                    {currentStep === 'supabase_keys' && (
                        <div className="glass-panel border border-white/10 bg-white/5 backdrop-blur-xl rounded-2xl p-8 shadow-2xl animate-in fade-in slide-in-from-bottom-4">
                            <div className="w-12 h-12 bg-[#3ECF8E]/20 rounded-xl flex items-center justify-center mb-6 text-[#3ECF8E] shadow-lg shadow-[#3ECF8E]/10">
                                <Key className="w-6 h-6" />
                            </div>
                            <h1 className="text-2xl font-bold mb-2 text-white">Salvar Chaves de Acesso</h1>
                            <p className="text-gray-400 mb-6">Copie as chaves do Supabase em Project Settings {'>'} API.</p>

                            <form onSubmit={handleKeysSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Anon Public Key</label>
                                    <input type="text" value={anonKey} onChange={e => setAnonKey(e.target.value)} required
                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-xs font-mono" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Service Role Key (Secret)</label>
                                    <input type="text" value={serviceKey} onChange={e => setServiceKey(e.target.value)} required
                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-xs font-mono" />
                                </div>
                                <button type="submit" className="w-full bg-[#3ECF8E] text-black font-bold py-3 rounded-xl mt-2 hover:bg-[#3ECF8E]/90 flex justify-center items-center gap-2">
                                    Salvar Chaves  (Ir para Deploy) <ChevronRight className="w-4 h-4" />
                                </button>
                            </form>
                        </div>
                    )}


                    {/* --- STEP 3: DEPLOY (REPLACES GITHUB/VERCEL GUIDES) --- */}
                    {currentStep === 'deploy' && (
                        <div className="glass-panel border border-white/10 bg-white/5 backdrop-blur-xl rounded-2xl p-8 shadow-2xl animate-in fade-in slide-in-from-bottom-4">
                            <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center mb-6 text-white shadow-lg">
                                <Globe className="w-6 h-6" />
                            </div>
                            <h1 className="text-2xl font-bold mb-2 text-white">Publicar na Vercel</h1>
                            <p className="text-gray-400 mb-6">
                                Clique no botão abaixo para criar seu site automaticamente.
                            </p>

                            <div className="space-y-8">
                                <div className="bg-black/40 rounded-xl p-6 border border-white/10 text-center">
                                    <p className="text-sm text-gray-300 mb-4">
                                        Isso vai clonar o repositório e configurar as variáveis automaticamente.
                                    </p>

                                    <a
                                        href={deployUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-full bg-white text-black font-bold py-4 rounded-xl flex items-center justify-center gap-3 hover:bg-gray-100 transition-all shadow-xl shadow-white/10 group"
                                    >
                                        <svg className="w-5 h-5" viewBox="0 0 1155 1000" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M577.344 0L1154.69 1000H0L577.344 0Z" fill="black" />
                                        </svg>
                                        Deploy to Vercel
                                        <ExternalLink className="w-4 h-4 opacity-50 group-hover:opacity-100" />
                                    </a>
                                </div>

                                <form onSubmit={handleDeploySubmit} className="pt-6 border-t border-white/10">
                                    <label className="block text-sm font-medium text-gray-300 mb-1.5">
                                        Após o deploy, cole a URL do seu site aqui:
                                    </label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={vercelDomain}
                                            onChange={e => setVercelDomain(e.target.value)}
                                            placeholder="minha-loja.vercel.app"
                                            className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-white/30 outline-none"
                                            required
                                        />
                                        <button type="submit" className="bg-primary hover:bg-primary/90 text-white px-6 rounded-xl font-bold">
                                            <ChevronRight className="w-5 h-5" />
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}


                    {/* --- STEP 5: SUCCESS --- */}
                    {currentStep === 'success' && (
                        <div className="glass-panel border border-green-500/20 bg-green-500/5 backdrop-blur-xl rounded-2xl p-8 shadow-2xl animate-in fade-in slide-in-from-bottom-4 text-center">
                            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mb-6 text-green-500 shadow-lg shadow-green-500/20 mx-auto animate-in zoom-in duration-300">
                                <Check className="w-10 h-10" />
                            </div>
                            <h1 className="text-3xl font-bold mb-4 text-white">Instalação Concluída!</h1>
                            <p className="text-gray-400 mb-8 max-w-md mx-auto">
                                Parabéns! Seu Super Checkout está configurado e pronto para usar.
                            </p>

                            <div className="bg-black/40 rounded-xl p-6 mb-6 border border-white/5 text-center">
                                <p className="text-sm text-gray-400 mb-2">Acesse seu painel administrativo em:</p>
                                <a
                                    href={`https://${localStorage.getItem('installer_vercel_domain') || vercelDomain}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xl font-bold text-primary hover:underline font-mono"
                                >
                                    https://{localStorage.getItem('installer_vercel_domain') || vercelDomain}
                                </a>
                            </div>

                            <a
                                href={`https://${localStorage.getItem('installer_vercel_domain') || vercelDomain}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-1"
                            >
                                Acessar Minha Loja
                                <ChevronRight className="w-5 h-5" />
                            </a>
                        </div>
                    )}

                </div>
            </main>

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
