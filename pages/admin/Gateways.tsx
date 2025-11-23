
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

  const IntegrationCard = ({ title, description, icon, status, onClick }: any) => (
    <Card className="relative overflow-hidden group hover:border-primary/50 transition-colors cursor-pointer h-full flex flex-col" >
      <div onClick={onClick} className="flex-1">
        <div className="flex justify-between items-start mb-4">
          <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-white/5 flex items-center justify-center p-2">
            <img src={icon} alt={title} className="w-8 h-8 object-contain" />
          </div>
          {status === 'active' && <div className="bg-green-500/10 text-green-500 px-2 py-1 rounded text-xs font-medium border border-green-500/20">Conectado</div>}
          {status === 'soon' && <div className="bg-gray-100 dark:bg-white/5 text-gray-400 px-2 py-1 rounded text-xs font-medium">Em Breve</div>}
        </div>
        <h3 className="font-bold text-gray-900 dark:text-white text-lg">{title}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{description}</p>
      </div>

      <div className="mt-6 pt-4 border-t border-gray-100 dark:border-dark-border flex justify-between items-center">
        {status !== 'soon' ? (
          <Button variant="outline" size="sm" className="w-full" onClick={onClick}>
            <Settings className="w-3 h-3 mr-2" /> Configurar
          </Button>
        ) : (
          <div className="text-xs text-gray-400 flex items-center"><Lock className="w-3 h-3 mr-1" /> Indisponível</div>
        )}
      </div>
    </Card>
  );

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Gateways de Pagamento</h1>
        <p className="text-gray-500 dark:text-dark-text text-sm mt-1">Conecte provedores para receber pagamentos.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <IntegrationCard
          title="Mercado Pago"
          description="Aceite Cartão de Crédito, Pix e Boleto com o líder na América Latina."
          icon="https://logospng.org/download/mercado-pago/logo-mercado-pago-icone-1024.png"
          status={mpConfig.active ? 'active' : 'inactive'}
          onClick={() => setIsModalOpen(true)}
        />

        <IntegrationCard
          title="Stripe"
          description="Infraestrutura global de pagamentos para a internet."
          icon="https://upload.wikimedia.org/wikipedia/commons/thumb/b/ba/Stripe_Logo%2C_revised_2016.svg/2560px-Stripe_Logo%2C_revised_2016.svg.png"
          status="soon"
        />

        <IntegrationCard
          title="Pix Manual"
          description="Receba Pix diretamente em sua conta sem taxas de gateway."
          icon="https://upload.wikimedia.org/wikipedia/commons/a/a2/Logo%E2%80%94pix_powered_by_Banco_Central_%28Brazil%2C_2020%29.svg"
          status="soon"
        />
      </div>

      {/* MP Config Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-[#009EE3] flex items-center justify-center">
              <img src="https://logospng.org/download/mercado-pago/logo-mercado-pago-icone-1024.png" className="w-5 h-5 brightness-0 invert" alt="MP" />
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
