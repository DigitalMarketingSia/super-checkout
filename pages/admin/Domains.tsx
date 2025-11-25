
import React, { useState, useEffect } from 'react';
import { Layout } from '../../components/Layout';
import { storage } from '../../services/storageService';
import { Domain, DomainStatus, DomainType, Checkout } from '../../types';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import {
  Plus,
  Globe,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Server,
  ArrowRight,
  Copy,
  ExternalLink,
  RotateCw,
  X,
  Trash2
} from 'lucide-react';

export const Domains = () => {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDnsModalOpen, setIsDnsModalOpen] = useState(false);
  const [selectedDomain, setSelectedDomain] = useState<Domain | null>(null);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dnsLoading, setDnsLoading] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    domain: '',
    type: DomainType.CNAME
  });

  // DNS Records State
  const [dnsRecords, setDnsRecords] = useState<any>(null);

  useEffect(() => {
    const loadData = async () => {
      setDomains(await storage.getDomains());
    };
    loadData();
  }, []);

  // Auto-verify PENDING domains on load
  useEffect(() => {
    if (domains.length > 0) {
      domains.forEach(domain => {
        if (domain.status === DomainStatus.PENDING) {
          verifyDomain(domain.id, domain.domain, true);
        }
      });
    }
  }, [domains.length]); // Run when domains are loaded/added

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // 1. Add to Vercel Project
      const res = await fetch('/api/domains/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: formData.domain })
      });

      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('API indisponível. Use "vercel dev" para testar localmente.');
      }

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Falha ao adicionar domínio na Vercel');
      }

      // 2. Save to Supabase
      const newDomainData = {
        status: DomainStatus.PENDING,
        created_at: new Date().toISOString(),
        domain: formData.domain,
        type: formData.type,
        checkout_id: null,
        slug: null
      };

      const savedDomain = await storage.createDomain(newDomainData);

      // Update local state immediately
      const updated = [...domains, savedDomain];
      setDomains(updated);

      // Close modal and reset form
      setIsAddModalOpen(false);
      setFormData({ domain: '', type: DomainType.CNAME });

      // Open DNS modal immediately to show instructions
      openDnsModal(savedDomain);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const verifyDomain = async (id: string, domainName: string, silent = false) => {
    if (!silent) setVerifyingId(id);
    try {
      const res = await fetch(`/api/domains/verify?domain=${domainName}`);
      const data = await res.json();

      console.log('Verification response:', data); // Debugging

      if (data.error) throw new Error(data.error);

      // Update Status: STRICTER LOGIC
      // Check both project config (data.misconfigured) and global config (data.config?.misconfigured)
      const isMisconfigured = data.misconfigured || data.config?.misconfigured;

      let newStatus = DomainStatus.PENDING;

      // It is ONLY active if verified is true AND it is NOT misconfigured.
      if (data.verified && !isMisconfigured) {
        newStatus = DomainStatus.ACTIVE;
      } else if (data.error) {
        newStatus = DomainStatus.ERROR;
      } else {
        // Force PENDING if misconfigured, even if verified is true (which happens sometimes)
        newStatus = DomainStatus.PENDING;
      }

      // Only update state if status actually changed
      const currentDomain = domains.find(d => d.id === id);
      if (currentDomain && currentDomain.status !== newStatus) {
        const updatedDomains = domains.map(d =>
          d.id === id ? { ...d, status: newStatus } : d
        );
        setDomains(updatedDomains);
        await storage.saveDomains(updatedDomains.filter(d => d.id === id));
      }

      // Return records for the modal
      // Prioritize the challenges returned by the API
      const challenges = data.verificationChallenges || data.verification;
      if (challenges && challenges.length > 0) {
        return challenges;
      }

      // FALLBACK: If no verification records, return Standard Vercel Records
      return [
        { type: 'CNAME', domain: domainName, value: 'cname.vercel-dns.com', reason: 'default_cname' },
        { type: 'A', domain: '@', value: '76.76.21.21', reason: 'default_a' }
      ];

    } catch (err) {
      console.error('Verification failed:', err);
      return null;
    } finally {
      if (!silent) setVerifyingId(null);
    }
  };

  const openDnsModal = async (domain: Domain) => {
    setSelectedDomain(domain);
    setDnsRecords(null); // Reset while loading
    setDnsLoading(true);
    setIsDnsModalOpen(true);

    // Fetch fresh records
    const records = await verifyDomain(domain.id, domain.domain, true);
    if (records) {
      setDnsRecords(records);
    }
    setDnsLoading(false);
  };

  const refreshDnsData = async () => {
    if (!selectedDomain) return;
    setDnsLoading(true);
    const records = await verifyDomain(selectedDomain.id, selectedDomain.domain, true);
    if (records) {
      setDnsRecords(records);
    }
    setDnsLoading(false);
  };

  const handleRemove = async (id: string, domainName: string) => {
    if (!confirm('Tem certeza que deseja remover este domínio?')) return;

    setRemovingId(id);
    try {
      await fetch(`/api/domains/remove?domain=${domainName}`, { method: 'DELETE' });
      await storage.deleteDomain(id);
      setDomains(domains.filter(d => d.id !== id));
    } catch (err) {
      console.error('Removal failed:', err);
      alert('Erro ao remover domínio');
    } finally {
      setRemovingId(null);
    }
  };

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const getStatusBadge = (status: DomainStatus) => {
    switch (status) {
      case DomainStatus.ACTIVE:
        return (
          <span className="flex items-center gap-1.5 bg-green-500/10 text-green-400 px-2.5 py-1 rounded-full text-xs font-bold border border-green-500/20 shadow-[0_0_10px_rgba(74,222,128,0.2)]">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
            Conectado
          </span>
        );
      case DomainStatus.PENDING:
        return (
          <span className="flex items-center gap-1.5 bg-yellow-500/10 text-yellow-400 px-2.5 py-1 rounded-full text-xs font-bold border border-yellow-500/20">
            <div className="w-1.5 h-1.5 rounded-full bg-yellow-500"></div>
            Aguardando DNS
          </span>
        );
      case DomainStatus.ERROR:
        return (
          <span className="flex items-center gap-1.5 bg-red-500/10 text-red-400 px-2.5 py-1 rounded-full text-xs font-bold border border-red-500/20">
            <AlertTriangle className="w-3 h-3" />
            Erro
          </span>
        );
      default: return null;
    }
  };

  const systemDomain = 'cname.vercel-dns.com';

  return (
    <Layout>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Domínios</h1>
          <p className="text-gray-400 text-sm mt-1">Conecte seus domínios personalizados.</p>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)} className="shadow-xl shadow-primary/20">
          <Plus className="w-4 h-4" /> Adicionar Domínio
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {domains.length === 0 ? (
          <Card className="text-center py-20 border-dashed border-white/10 bg-white/5">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
              <Globe className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-white">Nenhum domínio conectado</h3>
            <div className="flex justify-center mt-4">
              <Button onClick={() => setIsAddModalOpen(true)}>Adicionar Domínio</Button>
            </div>
          </Card>
        ) : (
          domains.map(domain => (
            <Card key={domain.id} className="group overflow-hidden relative" noPadding>
              <div className="p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${domain.status === DomainStatus.ACTIVE
                    ? 'bg-green-500/10 border-green-500/20 text-green-500'
                    : 'bg-white/5 border-white/10 text-gray-400'
                    }`}>
                    <Globe className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-3">
                      {domain.domain}
                      {getStatusBadge(domain.status)}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-gray-400 mt-1">
                      <span>Adicionado em {new Date(domain.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end lg:self-auto">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => openDnsModal(domain)}
                    className="bg-white/5 hover:bg-white/10 border-white/10"
                  >
                    <Server className="w-4 h-4 mr-2" />
                    {domain.status === DomainStatus.ACTIVE ? 'Detalhes DNS' : 'Configuração DNS'}
                  </Button>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => verifyDomain(domain.id, domain.domain)}
                    disabled={verifyingId === domain.id}
                  >
                    {verifyingId === domain.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCw className="w-4 h-4" />}
                  </Button>

                  <button
                    onClick={() => handleRemove(domain.id, domain.domain)}
                    disabled={removingId === domain.id}
                    className="p-2 hover:bg-red-500/10 rounded-lg text-gray-400 hover:text-red-500 transition-colors"
                  >
                    {removingId === domain.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* MODAL 1: ADD DOMAIN (Simple) */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0F0F13] w-full max-w-md rounded-2xl shadow-2xl border border-white/10 overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-5 border-b border-white/5 flex justify-between items-center bg-white/5">
              <h2 className="text-lg font-bold text-white">Adicionar Domínio</h2>
              <button onClick={() => setIsAddModalOpen(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-6">
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> {error}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Domínio (ex: pay.meusite.com)</label>
                <input
                  required
                  type="text"
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-primary/50 outline-none"
                  placeholder="pay.seusite.com"
                  value={formData.domain}
                  onChange={e => setFormData({ ...formData, domain: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="ghost" onClick={() => setIsAddModalOpen(false)}>Cancelar</Button>
                <Button onClick={handleSave} disabled={isLoading}>
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Adicionar'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: DNS CONFIGURATION (Dynamic) */}
      {isDnsModalOpen && selectedDomain && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0F0F13] w-full max-w-2xl rounded-2xl shadow-2xl border border-white/10 overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-5 border-b border-white/5 flex justify-between items-center bg-white/5">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${selectedDomain.status === DomainStatus.ACTIVE
                  ? 'bg-green-500/20 text-green-500 border-green-500/20'
                  : 'bg-yellow-500/20 text-yellow-500 border-yellow-500/20'
                  }`}>
                  <Server className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">
                    {selectedDomain.status === DomainStatus.ACTIVE ? 'Domínio Conectado' : 'Configuração DNS'}
                  </h2>
                  <p className="text-xs text-gray-400">
                    {selectedDomain.status === DomainStatus.ACTIVE
                      ? 'Seu domínio está ativo e funcionando.'
                      : 'Configure seu provedor para conectar o domínio.'}
                  </p>
                </div>
              </div>
              <button onClick={() => setIsDnsModalOpen(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-6 space-y-6">
              <div className="bg-black/30 border border-white/10 rounded-xl p-4 space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-gray-300">
                    Registros DNS necessários:
                  </p>
                  <Button
                    size="sm"
                    onClick={refreshDnsData}
                    disabled={dnsLoading}
                    className="bg-primary/20 text-primary hover:bg-primary/30 border-primary/20"
                  >
                    {dnsLoading ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <RotateCw className="w-3 h-3 mr-2" />}
                    Verificar Novamente
                  </Button>
                </div>

                {dnsLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : !dnsRecords ? (
                  <div className="text-center py-8 text-gray-400">
                    <p className="mb-2 font-medium text-white">Não foi possível obter os registros.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {dnsRecords.map((record: any, idx: number) => (
                      <div key={idx} className="grid grid-cols-4 gap-2 text-xs">
                        <div className="bg-white/5 p-2 rounded border border-white/5">
                          <span className="text-gray-500 block mb-1">Type</span>
                          <span className="text-white font-mono font-bold">{record.type}</span>
                        </div>
                        <div className="bg-white/5 p-2 rounded border border-white/5">
                          <span className="text-gray-500 block mb-1">Name</span>
                          <span className="text-white font-mono">{record.domain.startsWith('www.') ? 'www' : (record.domain.split('.').length > 2 ? record.domain.split('.')[0] : '@')}</span>
                        </div>
                        <div className="bg-white/5 p-2 rounded border border-white/5 relative group col-span-2">
                          <span className="text-gray-500 block mb-1">Value</span>
                          <span className="text-white font-mono break-all">{record.value}</span>
                          <button onClick={() => handleCopy(record.value, `val-${idx}`)} className="absolute top-2 right-2 text-gray-500 hover:text-white">
                            {copiedField === `val-${idx}` ? <CheckCircle className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                      </div>
                    ))}
                    <div className="grid grid-cols-4 gap-2 text-xs mt-2">
                      <div className="col-span-4 bg-white/5 p-2 rounded border border-white/5 flex items-center justify-between">
                        <span className="text-gray-500">Proxy (Cloudflare)</span>
                        <span className="text-gray-400 font-mono">Desativado (Nuvem Cinza)</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <Button onClick={() => setIsDnsModalOpen(false)}>Fechar</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};
