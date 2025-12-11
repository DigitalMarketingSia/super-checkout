import React, { useState, useEffect } from 'react';
import { MemberArea, Domain, DomainUsage } from '../../types';
import { storage } from '../../services/storageService';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Globe, Check, AlertCircle } from 'lucide-react';

interface MemberDomainsProps {
    area: MemberArea;
    onSave: (area: MemberArea) => Promise<void>;
}

export const MemberDomains: React.FC<MemberDomainsProps> = ({ area, onSave }) => {
    const [domains, setDomains] = useState<Domain[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [selectedDomainId, setSelectedDomainId] = useState<string>(area.domain_id || '');

    useEffect(() => {
        loadDomains();
    }, []);

    const loadDomains = async () => {
        setLoading(true);
        try {
            const data = await storage.getDomains();
            setDomains(data.filter(d => d.status === 'active' && d.usage === DomainUsage.MEMBER_AREA)); // Only allow active Member Area domains
        } catch (error) {
            console.error('Error loading domains:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await onSave({ ...area, domain_id: selectedDomainId || undefined });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Carregando domínios...</div>;

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <Card className="p-6 bg-[#1a1a1a] border-white/10">
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-blue-500/10 rounded-lg">
                        <Globe className="w-6 h-6 text-blue-500" />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-bold text-white mb-2">Domínio Personalizado</h3>
                        <p className="text-gray-400 text-sm mb-6">
                            Conecte um domínio personalizado para sua área de membros.
                            O domínio deve estar verificado e conectado na aba "Domínios".
                        </p>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">
                                    Selecione um domínio
                                </label>
                                <select
                                    value={selectedDomainId}
                                    onChange={(e) => setSelectedDomainId(e.target.value)}
                                    className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                                >
                                    <option value="">Usar domínio do sistema</option>
                                    {domains.map(domain => (
                                        <option key={domain.id} value={domain.id}>
                                            {domain.domain}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {selectedDomainId && (
                                <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 text-sm">
                                    <Check className="w-4 h-4" />
                                    <span>Domínio verificado e pronto para uso.</span>
                                </div>
                            )}

                            {domains.length === 0 && (
                                <div className="flex items-center gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-500 text-sm">
                                    <AlertCircle className="w-4 h-4" />
                                    <span>Nenhum domínio conectado encontrado. Adicione um domínio na aba "Domínios" primeiro.</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="mt-8 flex justify-end">
                    <Button
                        onClick={handleSave}
                        disabled={saving || (selectedDomainId === (area.domain_id || ''))}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-8"
                    >
                        {saving ? 'Salvando...' : 'Salvar Alterações'}
                    </Button>
                </div>
            </Card>
        </div>
    );
};
