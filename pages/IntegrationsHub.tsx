import React, { useState, useEffect } from 'react';
import { Plug, Webhook, BarChart, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Card } from '../components/ui/Card';
import { ResendConfigModal } from '../components/modals/ResendConfigModal';
import { storage } from '../services/storageService';

export const IntegrationsHub: React.FC = () => {
    const navigate = useNavigate();
    const [isResendModalOpen, setIsResendModalOpen] = useState(false);
    const [isResendActive, setIsResendActive] = useState(false);

    useEffect(() => {
        loadIntegrationStatus();
    }, []);

    const loadIntegrationStatus = async () => {
        try {
            const resendIntegration = await storage.getIntegration('resend');
            setIsResendActive(resendIntegration?.active || false);
        } catch (error) {
            console.error('Error loading integration status:', error);
        }
    };

    const handleResendModalClose = () => {
        setIsResendModalOpen(false);
        loadIntegrationStatus(); // Reload status after closing modal
    };

    return (
        <Layout>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Integrações</h1>
                        <p className="text-gray-500 dark:text-gray-400">Conecte suas ferramentas favoritas.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Resend Card */}
                    <Card
                        className={`p-6 hover:border-primary/50 transition-all cursor-pointer group relative overflow-hidden ${isResendActive
                            ? 'border-green-500 dark:border-green-400'
                            : ''
                            }`}
                        onClick={() => setIsResendModalOpen(true)}
                    >
                        {/* Glassmorphism overlay for active state */}
                        {isResendActive && (
                            <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 via-transparent to-green-500/5 pointer-events-none" />
                        )}

                        <div className="relative z-10">
                            <div className="flex items-start justify-between mb-4">
                                <div className="w-12 h-12 bg-black dark:bg-white/10 rounded-xl flex items-center justify-center">
                                    <span className="text-white font-bold text-xl">R</span>
                                </div>
                                {isResendActive ? (
                                    <span className="px-2.5 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs rounded-full font-medium flex items-center gap-1">
                                        <Check className="w-3 h-3" />
                                        Ativo
                                    </span>
                                ) : (
                                    <span className="px-2 py-1 bg-gray-100 dark:bg-white/5 text-gray-500 text-xs rounded-full">E-mail</span>
                                )}
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1 group-hover:text-primary transition-colors">Resend</h3>
                            <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">API de e-mail para desenvolvedores.</p>
                            {!isResendActive && (
                                <button className="w-full py-2 px-4 bg-gray-100 dark:bg-white/5 text-gray-900 dark:text-white rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-white/10 transition-colors">
                                    Conectar
                                </button>
                            )}
                        </div>
                    </Card>

                    {/* Webhooks Card */}
                    <Card
                        className="p-6 hover:border-primary/50 transition-colors cursor-pointer group"
                        onClick={() => navigate('/admin/webhooks')}
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-xl flex items-center justify-center">
                                <Webhook className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                            </div>
                            <span className="px-2 py-1 bg-gray-100 dark:bg-white/5 text-gray-500 text-xs rounded-full">Sistema</span>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1 group-hover:text-primary transition-colors">Webhooks</h3>
                        <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">Receba notificações de eventos em tempo real.</p>
                        <button className="w-full py-2 px-4 bg-gray-100 dark:bg-white/5 text-gray-900 dark:text-white rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-white/10 transition-colors">
                            Configurar
                        </button>
                    </Card>

                    {/* Analytics Card */}
                    <Card
                        className="p-6 hover:border-primary/50 transition-colors cursor-pointer group"
                        onClick={() => navigate('/admin/checkouts')}
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl flex items-center justify-center">
                                <BarChart className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                            </div>
                            <span className="px-2 py-1 bg-gray-100 dark:bg-white/5 text-gray-500 text-xs rounded-full">Analytics</span>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1 group-hover:text-primary transition-colors">Pixels e Analytics</h3>
                        <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">Gerencie pixels do Facebook, TikTok e Google por checkout.</p>
                        <button className="w-full py-2 px-4 bg-gray-100 dark:bg-white/5 text-gray-900 dark:text-white rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-white/10 transition-colors">
                            Ir para Checkouts
                        </button>
                    </Card>
                </div>
            </div>

            <ResendConfigModal
                isOpen={isResendModalOpen}
                onClose={handleResendModalClose}
            />
        </Layout>
    );
};
