
import React, { useState, useEffect } from 'react';
import { Layout } from '../../components/Layout';
import { storage } from '../../services/storageService';
import { Gateway, GatewayProvider } from '../../types';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { CheckCircle, AlertTriangle, Lock, Settings } from 'lucide-react';
import { Modal, AlertModal } from '../../components/ui/Modal';

export const Gateways = () => {
  const [gateways, setGateways] = useState<Gateway[]>([]);
  const [mpConfig, setMpConfig] = useState({
    public_key: '',
    private_key: '',
    webhook_secret: '',
    active: false
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [alertState, setAlertState] = useState<{ isOpen: boolean; title: string; message: string; variant: 'success' | 'error' | 'info' }>({
    isOpen: false,
    title: '',
    message: '',
    variant: 'info'
  });

  const showAlert = (title: string, message: string, variant: 'success' | 'error' | 'info' = 'info') => {
    setAlertState({ isOpen: true, title, message, variant });
  };

  const closeAlert = () => {
    setAlertState(prev => ({ ...prev, isOpen: false }));
  };

  useEffect(() => {
    const load = async () => {
      const all = await storage.getGateways();
      setGateways(all);

      const mp = all.find(g => g.name === GatewayProvider.MERCADO_PAGO);
      if (mp) {
        setMpConfig({
          public_key: mp.public_key,
          private_key: mp.private_key,
          webhook_secret: mp.webhook_secret,
          active: mp.active
        });
      }
    };
    load();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const mpIndex = gateways.findIndex(g => g.name === GatewayProvider.MERCADO_PAGO);

      if (mpIndex >= 0) {
        // Update existing gateway
        const gatewayToUpdate: Gateway = {
          id: gateways[mpIndex].id,
          name: GatewayProvider.MERCADO_PAGO,
          ...mpConfig
        };
        await storage.updateGateway(gatewayToUpdate);
      } else {
        // Create new gateway
        await storage.createGateway({
          name: GatewayProvider.MERCADO_PAGO,
          ...mpConfig
        });
      }

      // Reload gateways from database
      const updatedGateways = await storage.getGateways();
      setGateways(updatedGateways);

      // Update form state
      const mp = updatedGateways.find(g => g.name === GatewayProvider.MERCADO_PAGO);
      if (mp) {
        setMpConfig({
          public_key: mp.public_key,
          private_key: mp.private_key,
          webhook_secret: mp.webhook_secret,
          active: mp.active
        });
      }

      setIsModalOpen(false);
      showAlert('Sucesso', 'Gateway salvo com sucesso!', 'success');
    } catch (error) {
      console.error('Error saving gateway:', error);
      showAlert('Erro', 'Erro ao salvar gateway. Verifique o console.', 'error');
    }
  };

  const IntegrationCard = ({ title, logo, status, onClick }: any) => (
    <Card
      className={`relative overflow-hidden group hover:border-primary/50 transition-all cursor-pointer h-40 flex items-center justify-center ${status === 'active' ? 'border-green-500/50 bg-green-500/5' : ''
        }`}
      onClick={status !== 'soon' ? onClick : undefined}
    >
      {status === 'soon' && (
        <div className="absolute top-3 right-3 z-10">
          <div className="px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider bg-gray-100 dark:bg-white/5 text-gray-400 border-transparent">
            Em Breve
          </div>
        </div>
      )}

      <div className="w-40 h-20 flex items-center justify-center opacity-70 group-hover:opacity-100 transition-opacity">
        <img src={logo} alt={title} className="max-w-full max-h-full object-contain brightness-0 invert" />
      </div>
    </Card>
  );

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Gateways de Pagamento</h1>
        <p className="text-gray-500 dark:text-dark-text text-sm mt-1">Conecte provedores para receber pagamentos.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card
          className={`relative overflow-hidden group hover:border-primary/50 transition-all cursor-pointer h-40 flex items-center justify-center ${mpConfig.active
              ? 'border-green-500 dark:border-green-400'
              : ''
            }`}
          onClick={() => setIsModalOpen(true)}
        >
          {/* Glassmorphism overlay for active state */}
          {mpConfig.active && (
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 via-transparent to-green-500/5 pointer-events-none" />
          )}

          <div className="absolute top-3 right-3 z-10">
            {mpConfig.active ? (
              <span className="px-2.5 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs rounded-full font-medium flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                Ativo
              </span>
            ) : (
              <div className="px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider bg-gray-100 dark:bg-white/5 text-gray-400 border-transparent">
                Inativo
              </div>
            )}
          </div>

          <div className="relative z-10 w-40 h-20 flex items-center justify-center opacity-70 group-hover:opacity-100 transition-opacity">
            <img
              src="/mercado-pago-logo.png"
              alt="Mercado Pago"
              className="max-w-full max-h-full object-contain brightness-0 invert"
            />
          </div>
        </Card>

        <IntegrationCard
          title="Lunoxpay"
          logo="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Cpath fill='%23FFD700' d='M20 20h20v60h-20z'/%3E%3Cpath fill='%23FFD700' d='M50 30l20 15-20 15z'/%3E%3C/svg%3E"
          status="soon"
        />

        <IntegrationCard
          title="Sync Pay"
          logo="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='30' cy='50' r='15' fill='%234F46E5'/%3E%3Ccircle cx='70' cy='50' r='15' fill='%234F46E5'/%3E%3Cpath d='M30 35Q50 20 70 35' stroke='%234F46E5' fill='none' stroke-width='4'/%3E%3C/svg%3E"
          status="soon"
        />

        <IntegrationCard
          title="Push-in Pay"
          logo="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Cpath fill='white' d='M30 30h40v40h-40z'/%3E%3Cpath fill='white' d='M50 20l15 10h-30z'/%3E%3C/svg%3E"
          status="soon"
        />
      </div>

      {/* MP Config Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={
          <div className="flex items-center gap-3">
            <div className="h-8 flex items-center justify-center">
              <img src="/mercado-pago-logo.png" className="h-full object-contain" alt="MP" />
            </div>
            <span>Configurações Mercado Pago</span>
          </div>
        }
        className="max-w-xl"
      >
        <form onSubmit={handleSave} className="space-y-5">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-blue-800 dark:text-blue-200">Use suas <strong>Credenciais de Produção</strong>. Chaves de teste funcionarão para simulação.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Chave Pública (Public Key)</label>
            <input
              type="text"
              className="w-full bg-gray-50 dark:bg-dark-bg border border-gray-300 dark:border-dark-border rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-primary/50 outline-none font-mono text-xs dark:text-white"
              placeholder="APP_USR-..."
              value={mpConfig.public_key}
              onChange={e => setMpConfig({ ...mpConfig, public_key: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Token de Acesso (Access Token)</label>
            <input
              type="password"
              className="w-full bg-gray-50 dark:bg-dark-bg border border-gray-300 dark:border-dark-border rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-primary/50 outline-none font-mono text-xs dark:text-white"
              placeholder="APP_USR-..."
              value={mpConfig.private_key}
              onChange={e => setMpConfig({ ...mpConfig, private_key: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Segredo do Webhook</label>
            <input
              type="text"
              className="w-full bg-gray-50 dark:bg-dark-bg border border-gray-300 dark:border-dark-border rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-primary/50 outline-none font-mono text-xs dark:text-white"
              value={mpConfig.webhook_secret}
              onChange={e => setMpConfig({ ...mpConfig, webhook_secret: e.target.value })}
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Habilitar Gateway</span>
            <button
              type="button"
              onClick={() => setMpConfig({ ...mpConfig, active: !mpConfig.active })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-dark-card ${mpConfig.active ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'
                }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${mpConfig.active ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button type="submit">Salvar Credenciais</Button>
          </div>
        </form>
      </Modal>

      <AlertModal
        isOpen={alertState.isOpen}
        onClose={closeAlert}
        title={alertState.title}
        message={alertState.message}
        variant={alertState.variant}
      />
    </Layout>
  );
};
