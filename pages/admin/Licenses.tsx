import React, { useState, useEffect } from 'react';
import { Layout } from '../../components/Layout';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Key, Plus, Copy, CheckCircle, XCircle, Search, RefreshCw } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { supabase } from '../../services/supabase';

interface License {
    key: string;
    client_email: string;
    client_name: string;
    status: 'active' | 'suspended' | 'refunded';
    allowed_domain: string | null;
    plan: string;
    created_at: string;
    activated_at: string | null;
}

export const Licenses = () => {
    const [licenses, setLicenses] = useState<License[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        client_name: '',
        client_email: '',
        plan: 'lifetime'
    });

    useEffect(() => {
        fetchLicenses();
    }, []);

    const fetchLicenses = async () => {
        setLoading(true);
        // In a real app, use the API route /api/licenses/manage to respect server-side auth
        // For this demo, we'll try direct DB access assuming Admin has RLS rights
        const { data, error } = await supabase
            .from('licenses')
            .select('*')
            .order('created_at', { ascending: false });

        if (data) setLicenses(data);
        setLoading(false);
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        const { data, error } = await supabase
            .from('licenses')
            .insert({
                client_name: formData.client_name,
                client_email: formData.client_email,
                plan: formData.plan,
                status: 'active'
            })
            .select()
            .single();

        if (data) {
            setLicenses([data, ...licenses]);
            setIsModalOpen(false);
            setFormData({ client_name: '', client_email: '', plan: 'lifetime' });
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        // Toast here
    };

    return (
        <Layout>
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Key className="w-6 h-6 text-primary" /> Gestão de Licenças
                    </h1>
                    <p className="text-gray-400 text-sm mt-1">Gerencie as chaves de acesso dos seus clientes Self-Hosted.</p>
                </div>
                <Button onClick={() => setIsModalOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" /> Nova Licença
                </Button>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {licenses.map(lic => (
                    <Card key={lic.key} noPadding className="group overflow-hidden">
                        <div className="p-6 flex flex-col lg:flex-row items-center gap-6">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${lic.status === 'active' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                                }`}>
                                <Key className="w-5 h-5" />
                            </div>

                            <div className="flex-1 min-w-0 w-full">
                                <div className="flex items-center gap-3 mb-1">
                                    <h3 className="text-lg font-bold text-white truncate">{lic.client_name || 'Cliente Sem Nome'}</h3>
                                    <span className="text-xs px-2 py-0.5 rounded bg-white/10 text-gray-300 border border-white/5">
                                        {lic.plan}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                                    <span>{lic.client_email}</span>
                                    <span className="w-1 h-1 rounded-full bg-gray-600" />
                                    <span className={lic.allowed_domain ? 'text-primary' : 'text-gray-500 italic'}>
                                        {lic.allowed_domain || 'Aguardando Ativação'}
                                    </span>
                                </div>

                                <div className="bg-black/30 rounded-lg p-2 flex items-center justify-between border border-white/5 group-hover:border-primary/30 transition-colors">
                                    <code className="text-xs font-mono text-gray-300 truncate select-all">
                                        {lic.key}
                                    </code>
                                    <button onClick={() => copyToClipboard(lic.key)} className="text-gray-500 hover:text-white p-1">
                                        <Copy className="w-3 h-3" />
                                    </button>
                                </div>
                            </div>

                            <div className="text-right min-w-[120px] hidden lg:block">
                                <div className={`text-sm font-bold mb-1 ${lic.status === 'active' ? 'text-green-500' : 'text-red-500'
                                    }`}>
                                    {lic.status.toUpperCase()}
                                </div>
                                <div className="text-xs text-gray-500">
                                    Criado em {new Date(lic.created_at).toLocaleDateString()}
                                </div>
                            </div>
                        </div>
                    </Card>
                ))}

                {licenses.length === 0 && !loading && (
                    <div className="text-center py-20 bg-white/5 rounded-2xl border border-dashed border-white/10">
                        <Key className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-white">Nenhuma licença gerada</h3>
                        <p className="text-gray-400 mb-6">Crie a primeira chave para vender seu sistema.</p>
                        <Button onClick={() => setIsModalOpen(true)}>Gerar Licença</Button>
                    </div>
                )}
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="Nova Licença"
            >
                <form onSubmit={handleCreate} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1.5">Nome do Cliente</label>
                        <input
                            required
                            type="text"
                            className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-primary/50 outline-none"
                            placeholder="Ex: Empresa X"
                            value={formData.client_name}
                            onChange={e => setFormData({ ...formData, client_name: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1.5">Email do Cliente</label>
                        <input
                            required
                            type="email"
                            className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-primary/50 outline-none"
                            placeholder="cliente@email.com"
                            value={formData.client_email}
                            onChange={e => setFormData({ ...formData, client_email: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1.5">Plano</label>
                        <select
                            className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-primary/50 outline-none"
                            value={formData.plan}
                            onChange={e => setFormData({ ...formData, plan: e.target.value })}
                        >
                            <option value="lifetime">Vitalício (Lifetime)</option>
                            <option value="monthly">Mensal</option>
                            <option value="yearly">Anual</option>
                        </select>
                    </div>
                    <div className="pt-4 flex justify-end gap-3">
                        <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                        <Button type="submit">Gerar Chave</Button>
                    </div>
                </form>
            </Modal>
        </Layout>
    );
};
