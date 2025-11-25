
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../../components/Layout';
import { storage } from '../../services/storageService';
import { Checkout, Product, Gateway, Domain, DomainStatus } from '../../types';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import {
  Plus, Copy, Eye, Edit2, Trash2, Settings, ShoppingBag
} from 'lucide-react';

import { ConfirmModal, AlertModal } from '../../components/ui/Modal';

export const Checkouts = () => {
  const navigate = useNavigate();
  const [checkouts, setCheckouts] = useState<Checkout[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [gateways, setGateways] = useState<Gateway[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);

  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
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
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [c, p, g, d] = await Promise.all([
        storage.getCheckouts(),
        storage.getProducts(),
        storage.getGateways(),
        storage.getDomains()
      ]);
      setCheckouts(c);
      setProducts(p);
      setGateways(g);
      setDomains(d);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (id: string) => {
    setDeleteId(id);
  };

  const handleConfirmDelete = async () => {
    if (!deleteId) return;

    try {
      setIsDeleting(true);
      await storage.deleteCheckout(deleteId);
      await loadData();
      setDeleteId(null);
    } catch (error) {
      console.error('Error deleting checkout:', error);
      showAlert('Erro', 'Erro ao excluir checkout.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Helper to get product name
  const getProductName = (productId: string) => {
    const product = products.find(p => p.id === productId);
    return product ? product.name : 'Produto não encontrado';
  };

  // Helper to get domain name
  const getDomainName = (domainId?: string) => {
    if (!domainId) return <span className="text-gray-600 italic">Sem domínio</span>;
    const domain = domains.find(d => d.id === domainId);
    return domain ? (
      <span className="bg-white/5 px-3 py-1 rounded text-gray-300 text-sm border border-white/5">
        {domain.domain}
      </span>
    ) : <span className="text-gray-600 italic">Domínio removido</span>;
  };

  // Helper to get gateway name
  const getGatewayName = (gatewayId: string) => {
    const gateway = gateways.find(g => g.id === gatewayId);
    return gateway ? (
      <span className="bg-white/5 px-3 py-1 rounded text-gray-300 text-xs uppercase border border-white/5 font-medium tracking-wide">
        {gateway.name.replace('_', ' ')}
      </span>
    ) : <span className="text-red-400 text-xs">Gateway removido</span>;
  };

  return (
    <Layout>
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Meus Checkouts</h1>
          <p className="text-gray-400 text-sm">Gerencie seus links de pagamento.</p>
        </div>
        <Button onClick={() => navigate('/admin/checkouts/edit/new')} className="shadow-lg shadow-primary/20">
          <Plus className="w-4 h-4" /> Novo Checkout
        </Button>
      </div>

      <Card noPadding className="overflow-hidden border border-gray-200 dark:border-white/5 bg-white dark:bg-[#0A0A0B]">
        {loading ? (
          <div className="p-12 text-center text-gray-500 animate-pulse">Carregando checkouts...</div>
        ) : checkouts.length === 0 ? (
          <div className="p-16 text-center flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
              <ShoppingBag className="w-8 h-8 text-gray-600" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">Nenhum checkout criado</h3>
            <p className="text-gray-500 text-sm mb-6">Crie seu primeiro checkout para começar a vender.</p>
            <Button onClick={() => navigate('/admin/checkouts/edit/new')}>Criar Checkout</Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#0F0F12] border-b border-white/5 text-gray-400 font-medium">
                <tr>
                  <th className="px-6 py-5 w-[30%]">Checkout / Produto</th>
                  <th className="px-6 py-5">Domínio</th>
                  <th className="px-6 py-5">Gateway</th>
                  <th className="px-6 py-5 text-center">Order Bumps</th>
                  <th className="px-6 py-5">Status</th>
                  <th className="px-6 py-5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {checkouts.map(chk => (
                  <tr key={chk.id} className="hover:bg-white/[0.02] transition-colors group">
                    {/* Checkout / Produto */}
                    <td className="px-6 py-5">
                      <div className="flex flex-col gap-1.5">
                        <span className="text-white font-bold text-[15px]">{chk.name}</span>
                        <div className="flex items-center gap-2 text-gray-500 text-xs">
                          <ShoppingBag className="w-3 h-3" />
                          <span>{getProductName(chk.product_id)}</span>
                        </div>
                      </div>
                    </td>

                    {/* Domínio */}
                    <td className="px-6 py-5">
                      {getDomainName(chk.domain_id)}
                    </td>

                    {/* Gateway */}
                    <td className="px-6 py-5">
                      {getGatewayName(chk.gateway_id)}
                    </td>

                    {/* Order Bumps */}
                    <td className="px-6 py-5 text-center">
                      {chk.order_bump_ids && chk.order_bump_ids.length > 0 ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-orange-500/10 text-orange-500 text-xs font-bold border border-orange-500/20">
                          {chk.order_bump_ids.length}
                        </span>
                      ) : (
                        <span className="text-gray-600">-</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-6 py-5">
                      {chk.active ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 text-green-400 text-xs font-medium border border-green-500/10">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-400" /> Ativo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-500/10 text-gray-400 text-xs font-medium border border-gray-500/10">
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-400" /> Inativo
                        </span>
                      )}
                    </td>

                    {/* Ações */}
                    <td className="px-6 py-5 text-right">
                      <div className="flex justify-end gap-2 opacity-100 sm:opacity-60 sm:group-hover:opacity-100 transition-opacity">
                        {/* Editar */}
                        <button
                          onClick={() => navigate(`/admin/checkouts/edit/${chk.id}`)}
                          className="p-2 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg text-blue-400 border border-blue-500/10 transition-colors"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        {/* Excluir */}
                        <button
                          onClick={() => handleDeleteClick(chk.id)}
                          className="p-2 bg-red-500/10 hover:bg-red-500/20 rounded-lg text-red-400 border border-red-500/10 transition-colors"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>

                        {/* Copiar Link */}
                        <button
                          onClick={() => {
                            const domain = domains.find(d => d.id === chk.domain_id);
                            const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
                            const baseUrl = (domain && !isLocal) ? `https://${domain.domain}` : window.location.origin + '/c';
                            const url = `${baseUrl}/${chk.custom_url_slug}`;
                            navigator.clipboard.writeText(url);
                            showAlert('Sucesso', 'Link copiado: ' + url, 'success');
                          }}
                          className="p-2 bg-gray-500/10 hover:bg-gray-500/20 rounded-lg text-gray-400 border border-gray-500/10 transition-colors"
                          title="Copiar Link"
                        >
                          <Copy className="w-4 h-4" />
                        </button>

                        {/* Visualizar/Duplicar (Olho) */}
                        <button
                          onClick={() => navigate(`/c/${chk.id}`)}
                          className="p-2 bg-purple-500/10 hover:bg-purple-500/20 rounded-lg text-purple-400 border border-purple-500/10 transition-colors"
                          title="Visualizar"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <ConfirmModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleConfirmDelete}
        title="Excluir Checkout"
        message="Tem certeza que deseja excluir este checkout? Esta ação não pode ser desfeita e o link de pagamento deixará de funcionar."
        confirmText="Sim, excluir"
        cancelText="Cancelar"
        variant="danger"
        loading={isDeleting}
      />

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
