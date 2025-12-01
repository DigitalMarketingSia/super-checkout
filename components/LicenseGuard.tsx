import React, { useEffect, useState } from 'react';
import { Lock, AlertTriangle } from 'lucide-react';

interface LicenseGuardProps {
    children: React.ReactNode;
}

export const LicenseGuard: React.FC<LicenseGuardProps> = ({ children }) => {
    const [isValid, setIsValid] = useState<boolean | null>(null);
    const [message, setMessage] = useState<string>('');
    const [loading, setLoading] = useState(true);

    // Configuration
    const LICENSE_KEY = import.meta.env.VITE_LICENSE_KEY;
    const LICENSING_SERVER = import.meta.env.VITE_LICENSING_SERVER_URL || 'https://super-checkout.vercel.app';

    useEffect(() => {
        const validateLicense = async () => {
            // If no license key is present, we might be in SaaS mode OR unconfigured Self-Hosted
            if (!LICENSE_KEY) {
                console.log('No license key found. Assuming SaaS mode.');
                setIsValid(true);
                setLoading(false);
                return;
            }

            try {
                console.log('Validating license...', { server: LICENSING_SERVER, key: LICENSE_KEY });

                const response = await fetch(`${LICENSING_SERVER}/api/licenses/validate`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        key: LICENSE_KEY,
                        domain: window.location.hostname
                    }),
                });

                const data = await response.json();

                if (data.valid) {
                    setIsValid(true);
                } else {
                    setIsValid(false);
                    setMessage(data.message || 'Licença inválida.');
                }
            } catch (error) {
                console.error('License validation error:', error);
                setIsValid(false);
                setMessage('Erro ao conectar ao servidor de licenças.');
            } finally {
                setLoading(false);
            }
        };

        validateLicense();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0F0F13] flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
        );
    }

    if (isValid === false) {
        return (
            <div className="min-h-screen bg-[#0F0F13] flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-black/40 border border-red-500/20 rounded-2xl p-8 text-center backdrop-blur-xl">
                    <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500">
                        <Lock className="w-8 h-8" />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">Acesso Bloqueado</h1>
                    <p className="text-gray-400 mb-6">
                        {message === 'Missing key or domain'
                            ? 'Esta instalação não possui uma licença configurada.'
                            : message}
                    </p>

                    <div className="bg-red-500/5 border border-red-500/10 rounded-lg p-4 text-left mb-6">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                            <div className="text-sm text-gray-300">
                                <p className="font-bold text-red-400 mb-1">Motivo:</p>
                                <p>{message}</p>
                                {LICENSE_KEY && (
                                    <p className="mt-2 text-xs text-gray-500 font-mono">Key: {LICENSE_KEY.substring(0, 8)}...</p>
                                )}
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={() => window.location.reload()}
                        className="w-full py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-colors font-medium"
                    >
                        Tentar Novamente
                    </button>
                </div>
            </div>
        );
    }

    return <>{children}</>;
};
