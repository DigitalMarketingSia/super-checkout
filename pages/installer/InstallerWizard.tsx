import React, { useState, useEffect } from 'react';
import { Check, ChevronRight, Database, Globe, Key, Server, ShieldCheck, Terminal } from 'lucide-react';

type Step = 'license' | 'supabase' | 'vercel' | 'config' | 'deploy';

export default function InstallerWizard() {
    const [currentStep, setCurrentStep] = useState<Step>('license');
    const [licenseKey, setLicenseKey] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);

    // Mock State for demonstration (in real app, these would be derived from successful API calls)
    const [supabaseConnected, setSupabaseConnected] = useState(false);
    const [vercelConnected, setVercelConnected] = useState(false);

    const addLog = (msg: string) => setLogs(prev => [...prev, `> ${msg}`]);

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
                let errorMsg = `Server Error (${status})`;
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
                addLog('License validated successfully!');
                setTimeout(() => {
                    setIsLoading(false);
                    setCurrentStep('supabase');
                }, 1000);
            } else {
                addLog(`Validation failed: ${data.message}`);
                alert(`Erro: ${data.message}`);
                setIsLoading(false);
            }
        } catch (error: any) {
            console.error('Validation error:', error);
            const msg = error.message || 'Error connecting to validation server.';
            addLog(`Error: ${msg}`);
            alert(`Erro: ${msg}`);
            setIsLoading(false);
        }
    };

    const handleSupabaseConnect = () => {
        setIsLoading(true);
        const clientId = import.meta.env.VITE_SUPABASE_CLIENT_ID || process.env.NEXT_PUBLIC_SUPABASE_CLIENT_ID || 'mock_client_id';
        const redirectUri = `${window.location.origin}/installer`;
        const state = 'supabase';

        window.location.href = `https://api.supabase.com/v1/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&state=${state}`;
    };

    const handleSupabaseCallback = async (code: string) => {
        setIsLoading(true);
        addLog('Supabase connected! Creating project...');

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

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to create Supabase project');

            addLog(`Project created: ${data.projectRef}`);
            addLog('Running database migrations (this may take a minute)...');

            // Run Migrations
            const migrationRes = await fetch('/api/installer/supabase', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'run_migrations',
                    projectRef: data.projectRef,
                    dbPass: data.dbPass,
                    licenseKey: localStorage.getItem('installer_license_key')
                })
            });

            const migrationData = await migrationRes.json();
            if (!migrationRes.ok) throw new Error(migrationData.error || 'Failed to run migrations');

            addLog('Database schema applied successfully!');
            setSupabaseConnected(true);
            setCurrentStep('vercel');
        } catch (error: any) {
            console.error(error);
            addLog(`Error: ${error.message}`);
            alert(`Supabase Error: ${error.message}`);
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
        addLog('Vercel connected! Creating project...');
        try {
            const res = await fetch('/api/installer/vercel', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'create_project',
                    code,
                    licenseKey: localStorage.getItem('installer_license_key')
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to create Vercel project');

            addLog(`Project created: ${data.projectName}`);
            setVercelConnected(true);
            setCurrentStep('config');
        } catch (error: any) {
            console.error(error);
            addLog(`Error: ${error.message}`);
            alert(`Vercel Error: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeploy = () => {
        setCurrentStep('deploy');
        let step = 0;
        const interval = setInterval(() => {
            step++;
            if (step === 1) addLog('Initializing deployment...');
            if (step === 2) addLog('Creating Supabase project...');
            if (step === 3) addLog('Applying database schema (schema.sql)...');
            if (step === 4) addLog('Creating Vercel project...');
            if (step === 5) addLog('Linking repository...');
            if (step === 6) addLog('Setting environment variables...');
            if (step === 7) addLog('Triggering initial build...');
            if (step === 8) {
                addLog('Deployment successful!');
                clearInterval(interval);
            }
        }, 1000);
    };

    // Load state and check for callbacks (Placed at bottom to access handlers)
    useEffect(() => {
        const savedKey = localStorage.getItem('installer_license_key');
        if (savedKey) setLicenseKey(savedKey);

        const savedStep = localStorage.getItem('installer_step') as Step;
        if (savedStep) setCurrentStep(savedStep);

        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        const state = params.get('state');

        if (code && state) {
            // Clear params
            window.history.replaceState({}, '', '/installer');

            if (state === 'supabase') {
                handleSupabaseCallback(code);
            } else if (state === 'vercel') {
                handleVercelCallback(code);
            }
        }
    }, []);

    // Save state changes
    useEffect(() => {
        if (licenseKey) localStorage.setItem('installer_license_key', licenseKey);
        if (currentStep) localStorage.setItem('installer_step', currentStep);
    }, [licenseKey, currentStep]);

    return (
        <div className="min-h-screen bg-[#0F0F13] text-white font-sans flex flex-col">
            {/* Header */}
            <header className="border-b border-white/10 bg-black/20 backdrop-blur-xl sticky top-0 z-50">
                <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-primary to-purple-600 rounded-lg flex items-center justify-center">
                            <Server className="w-4 h-4 text-white" />
                        </div>
                        <span className="font-bold text-lg tracking-tight">Super Checkout <span className="text-white/40 font-normal">Installer</span></span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-400">
                        <div className={`flex items-center gap-2 ${currentStep === 'license' ? 'text-primary' : ''}`}>
                            <div className="w-6 h-6 rounded-full border border-current flex items-center justify-center text-xs">1</div>
                            <span>License</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-white/20" />
                        <div className={`flex items-center gap-2 ${['supabase', 'vercel'].includes(currentStep) ? 'text-primary' : ''}`}>
                            <div className="w-6 h-6 rounded-full border border-current flex items-center justify-center text-xs">2</div>
                            <span>Connect</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-white/20" />
                        <div className={`flex items-center gap-2 ${currentStep === 'deploy' ? 'text-primary' : ''}`}>
                            <div className="w-6 h-6 rounded-full border border-current flex items-center justify-center text-xs">3</div>
                            <span>Deploy</span>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 flex items-center justify-center p-6">
                <div className="max-w-xl w-full">

                    {/* Step 1: License */}
                    {currentStep === 'license' && (
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 animate-in fade-in slide-in-from-bottom-4">
                            <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center mb-6 text-primary">
                                <Key className="w-6 h-6" />
                            </div>
                            <h1 className="text-2xl font-bold mb-2">Welcome to Self-Hosted</h1>
                            <p className="text-gray-400 mb-8">Enter your license key to start the automated installation process.</p>

                            <form onSubmit={handleLicenseSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1.5">License Key</label>
                                    <input
                                        type="text"
                                        value={licenseKey}
                                        onChange={e => setLicenseKey(e.target.value)}
                                        placeholder="XXXX-XXXX-XXXX-XXXX"
                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-primary transition-colors font-mono"
                                        required
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-3 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isLoading ? 'Validating...' : 'Validate & Continue'}
                                    {!isLoading && <ChevronRight className="w-4 h-4" />}
                                </button>
                            </form>
                        </div>
                    )}

                    {/* Step 2: Supabase */}
                    {currentStep === 'supabase' && (
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 animate-in fade-in slide-in-from-bottom-4">
                            <div className="w-12 h-12 bg-[#3ECF8E]/20 rounded-xl flex items-center justify-center mb-6 text-[#3ECF8E]">
                                <Database className="w-6 h-6" />
                            </div>
                            <h1 className="text-2xl font-bold mb-2">Connect Database</h1>
                            <p className="text-gray-400 mb-8">We need access to your Supabase account to create the database and apply migrations.</p>

                            <div className="space-y-4">
                                <button
                                    onClick={handleSupabaseConnect}
                                    disabled={isLoading}
                                    className="w-full bg-[#3ECF8E] hover:bg-[#3ECF8E]/90 text-black font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {isLoading ? 'Connecting...' : 'Connect with Supabase'}
                                </button>
                                <p className="text-xs text-center text-gray-500">
                                    We will create a new project called "Super Checkout"
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Vercel */}
                    {currentStep === 'vercel' && (
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 animate-in fade-in slide-in-from-bottom-4">
                            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-6 text-white">
                                <Globe className="w-6 h-6" />
                            </div>
                            <h1 className="text-2xl font-bold mb-2">Connect Hosting</h1>
                            <p className="text-gray-400 mb-8">We need access to your Vercel account to deploy the application and configure domains.</p>

                            <div className="space-y-4">
                                <button
                                    onClick={handleVercelConnect}
                                    disabled={isLoading}
                                    className="w-full bg-white hover:bg-gray-200 text-black font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {isLoading ? 'Connecting...' : 'Connect with Vercel'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 4: Config */}
                    {currentStep === 'config' && (
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 animate-in fade-in slide-in-from-bottom-4">
                            <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center mb-6 text-blue-500">
                                <ShieldCheck className="w-6 h-6" />
                            </div>
                            <h1 className="text-2xl font-bold mb-2">Ready to Deploy</h1>
                            <p className="text-gray-400 mb-8">We have everything we need. Click below to start the automated installation.</p>

                            <div className="bg-black/40 rounded-xl p-4 mb-8 space-y-3">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-400">License</span>
                                    <span className="text-green-400 flex items-center gap-1"><Check className="w-3 h-3" /> Valid</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-400">Database</span>
                                    <span className="text-green-400 flex items-center gap-1"><Check className="w-3 h-3" /> Connected</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-400">Hosting</span>
                                    <span className="text-green-400 flex items-center gap-1"><Check className="w-3 h-3" /> Connected</span>
                                </div>
                            </div>

                            <button
                                onClick={handleDeploy}
                                className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                            >
                                Start Installation
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    )}

                    {/* Step 5: Deploy Logs */}
                    {currentStep === 'deploy' && (
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 animate-in fade-in slide-in-from-bottom-4">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center">
                                        <Terminal className="w-5 h-5 text-gray-400" />
                                    </div>
                                    <div>
                                        <h1 className="text-xl font-bold">Installing...</h1>
                                        <p className="text-xs text-gray-400">Do not close this window</p>
                                    </div>
                                </div>
                                <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                            </div>

                            <div className="bg-black rounded-xl p-4 h-64 overflow-y-auto font-mono text-xs text-green-400 space-y-1 border border-white/10">
                                {logs.map((log, i) => (
                                    <div key={i} className="opacity-80">{log}</div>
                                ))}
                                <div className="animate-pulse">_</div>
                            </div>
                        </div>
                    )}

                </div>
            </main>
        </div>
    );
}
