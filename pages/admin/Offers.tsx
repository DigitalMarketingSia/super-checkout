
import React, { useState, useEffect } from 'react';
import { Layout } from '../../components/Layout';
import { storage } from '../../services/storageService';
import { Offer, Product, PaymentType, RecurrenceType } from '../../types';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Plus, Trash2, Tag } from 'lucide-react';

export const Offers = () => {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    product_id: '',
    price: 0,
    payment_type: PaymentType.ONE_TIME,
    recurrence_type: RecurrenceType.NONE
  });

  useEffect(() => {
    const loadData = async () => {
      setOffers(await storage.getOffers());
      setProducts(await storage.getProducts());
    };
    loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await storage.createOffer({
        active: true,
        ...formData
      });

      // Reload data
      setOffers(await storage.getOffers());
      setIsModalOpen(false);
      setFormData({ name: '', product_id: '', price: 0, payment_type: PaymentType.ONE_TIME, recurrence_type: RecurrenceType.NONE });
    } catch (error) {
      console.error('Error creating offer:', error);
      alert('Erro ao criar oferta.');
    }
  };

  return (
    <Layout>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Ofertas</h1>
          <p className="text-gray-500 dark:text-dark-text text-sm mt-1">Crie planos de preços para seus produtos.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="w-4 h-4" /> Nova Oferta
        </Button>
      </div>

      <Card noPadding className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 dark:bg-dark-bg border-b border-gray-200 dark:border-dark-border">
              <tr>
                <th className="px-6 py-4 font-medium text-gray-500 dark:text-gray-400">Nome da Oferta</th>
                <th className="px-6 py-4 font-medium text-gray-500 dark:text-gray-400">Produto</th>
                <th className="px-6 py-4 font-medium text-gray-500 dark:text-gray-400">Preço</th>
                <th className="px-6 py-4 font-medium text-gray-500 dark:text-gray-400">Tipo de Cobrança</th>
                <th className="px-6 py-4 font-medium text-gray-500 dark:text-gray-400 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-dark-border">
              {offers.map(offer => {
                const product = products.find(p => p.id === offer.product_id);
                return (
                  <tr key={offer.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-purple-500/10 text-purple-500 flex items-center justify-center">
                          <Tag className="w-4 h-4" />
                        </div>
                        {offer.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{product?.name || 'Produto Desconhecido'}</td>
                    <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">R$ {offer.price.toFixed(2)}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${offer.payment_type === PaymentType.RECURRING
                          ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                          : 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300'
                        }`}>
                        {offer.payment_type === PaymentType.RECURRING
                          ? `Assinatura ${offer.recurrence_type === RecurrenceType.MONTHLY ? 'Mensal' : 'Anual'}`
                          : 'Única'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={async () => {
                        if (window.confirm('Excluir oferta?')) {
                          try {
                            await storage.deleteOffer(offer.id);
                            setOffers(await storage.getOffers());
                          } catch (e) {
                            console.error(e);
                            alert('Erro ao excluir');
                          }
                        }
                      }} className="text-gray-400 hover:text-red-500 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {offers.length === 0 && (
          <div className="p-12 text-center">
            <p className="text-gray-500 dark:text-gray-400">Nenhuma oferta criada ainda.</p>
          </div>
        )}
      </Card>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-dark-card w-full max-w-lg rounded-2xl shadow-2xl border border-gray-200 dark:border-dark-border overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-dark-border flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Criar Oferta</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><div className="w-5 h-5">✕</div></button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Nome da Oferta</label>
                <input
                  required type="text"
                  className="w-full bg-gray-50 dark:bg-dark-bg border border-gray-300 dark:border-dark-border rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-primary/50 outline-none dark:text-white"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Especial Black Friday"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Produto</label>
                <select
                  required
                  className="w-full bg-gray-50 dark:bg-dark-bg border border-gray-300 dark:border-dark-border rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-primary/50 outline-none dark:text-white"
                  value={formData.product_id}
                  onChange={e => setFormData({ ...formData, product_id: e.target.value })}
                >
                  <option value="">-- Selecione o Produto --</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Preço (R$)</label>
                  <input
                    required type="number" step="0.01"
                    className="w-full bg-gray-50 dark:bg-dark-bg border border-gray-300 dark:border-dark-border rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-primary/50 outline-none dark:text-white"
                    value={formData.price}
                    onChange={e => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Tipo</label>
                  <select
                    className="w-full bg-gray-50 dark:bg-dark-bg border border-gray-300 dark:border-dark-border rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-primary/50 outline-none dark:text-white"
                    value={formData.payment_type}
                    onChange={e => setFormData({ ...formData, payment_type: e.target.value as PaymentType })}
                  >
                    <option value={PaymentType.ONE_TIME}>Única</option>
                    <option value={PaymentType.RECURRING}>Assinatura</option>
                  </select>
                </div>
              </div>

              {formData.payment_type === PaymentType.RECURRING && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Frequência</label>
                  <select
                    className="w-full bg-gray-50 dark:bg-dark-bg border border-gray-300 dark:border-dark-border rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-primary/50 outline-none dark:text-white"
                    value={formData.recurrence_type}
                    onChange={e => setFormData({ ...formData, recurrence_type: e.target.value as RecurrenceType })}
                  >
                    <option value={RecurrenceType.MONTHLY}>Mensal</option>
                    <option value={RecurrenceType.YEARLY}>Anual</option>
                  </select>
                </div>
              )}

              <div className="pt-4 flex justify-end gap-3">
                <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                <Button type="submit">Criar Oferta</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
};
