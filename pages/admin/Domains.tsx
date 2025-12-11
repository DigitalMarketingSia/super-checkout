
import React, { useState, useEffect } from 'react';
import { Layout } from '../../components/Layout';
import { storage } from '../../services/storageService';
import { Domain, DomainStatus, DomainType, Checkout, DomainUsage } from '../../types';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Modal, ConfirmModal, AlertModal } from '../../components/ui/Modal';
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
  Trash2,
  ShoppingCart,
  Users,
  Layout as LayoutIcon
} from 'lucide-react';

export const Domains = () => {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDnsModalOpen, setIsDnsModalOpen] = useState(false);
  const [selectedDomain, setSelectedDomain] = useState<Domain | null>(null);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteDomainName, setDeleteDomainName] = useState<string>('');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dnsLoading, setDnsLoading] = useState(false);
  const [checkingUsageId, setCheckingUsageId] = useState<string | null>(null);
  const [usageWarning, setUsageWarning] = useState<{ checkouts: any[], memberAreas: any[] } | null>(null);
  const [alertModal, setAlertModal] = useState<{ isOpen: boolean; title: string; message: string; variant: 'success' | 'error' | 'info' }>({ isOpen: false, title: '', message: '', variant: 'info' });
  const [activeTab, setActiveTab] = useState<'all' | 'checkout' | 'member_area' | 'system'>('all');

  // Form State
  const [formData, setFormData] = useState({
    domain: '',
    type: DomainType.CNAME,
    usage: DomainUsage.CHECKOUT
  });

  // DNS Records State
  const [dnsRecords, setDnsRecords] = useState<any>(null);
  const [debugData, setDebugData] = useState<any>(null);

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
        slug: null,
        usage: formData.usage
      };

      const savedDomain = await storage.createDomain(newDomainData);

      // Update local state immediately
      const updated = [...domains, savedDomain];
      setDomains(updated);

      // Close modal and reset form
      setIsAddModalOpen(false);
      setFormData({ domain: '', type: DomainType.CNAME, usage: DomainUsage.CHECKOUT });

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
      setDebugData(data); // Save for debug modal

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
        // await storage.saveDomains(updatedDomains.filter(d => d.id === id));
      }

      // Return records for the modal
      // Prioritize the records returned by the API (which now includes config recommendations)
      if (data.dnsRecords && data.dnsRecords.length > 0) {
        return data.dnsRecords;
      }

      const challenges = data.verificationChallenges || data.verification;
      if (challenges && challenges.length > 0) {
        return challenges;
      }

      // FALLBACK: If no verification records, return Standard Vercel Records
      return [
        { type: 'CNAME', domain: domainName, value: 'cname.vercel-dns.com', reason: 'default_cname' },
        { type: 'A', domain: '@', value: '76.76.21.21', reason: 'default_a' }
      ];

    } catch (err: any) {
      console.error('Verification failed:', err);
      setDebugData({ error: err.message });

      // Force update to ERROR if verification fails
      setDomains(prev => prev.map(d => d.id === id ? { ...d, status: DomainStatus.ERROR } : d));

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

  const handleDeleteClick = async (id: string, domainName: string) => {
    setCheckingUsageId(id);
    try {
      const usage = await storage.getDomainUsage(id);
      if (usage.checkouts.length > 0 || usage.memberAreas.length > 0) {
        setUsageWarning(usage);
      } else {
        setDeleteId(id);
        setDeleteDomainName(domainName);
      }
    } catch (error) {
      console.error('Error checking domain usage:', error);
      setAlertModal({ isOpen: true, title: 'Erro', message: 'Erro ao verificar uso do domínio', variant: 'error' });
    } finally {
      setCheckingUsageId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteId || !deleteDomainName) return;

    setRemovingId(deleteId);
    try {
      await fetch(`/api/domains/remove?domain=${deleteDomainName}`, { method: 'DELETE' });
      await storage.deleteDomain(deleteId);
      setDomains(domains.filter(d => d.id !== deleteId));
      setDeleteId(null);
      setDeleteDomainName('');
    } catch (err) {
      console.error('Removal failed:', err);
      setAlertModal({ isOpen: true, title: 'Erro', message: 'Erro ao remover domínio', variant: 'error' });
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

  const getUsageBadge = (usage: DomainUsage) => {
    switch (usage) {
      case DomainUsage.CHECKOUT:
        return (
          <span className="flex items-center gap-1.5 bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded text-[10px] font-medium border border-blue-500/20 uppercase tracking-wide">
            <ShoppingCart className="w-3 h-3" /> Checkout
          </span>
        );
      case DomainUsage.MEMBER_AREA:
        return (
          <span className="flex items-center gap-1.5 bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded text-[10px] font-medium border border-purple-500/20 uppercase tracking-wide">
            <Users className="w-3 h-3" /> Área de Membros
          </span>
        );
      case DomainUsage.SYSTEM:
      default:
        return (
          <span className="flex items-center gap-1.5 bg-green-500/10 text-green-400 px-2 py-0.5 rounded text-[10px] font-medium border border-green-500/20 uppercase tracking-wide">
            <LayoutIcon className="w-3 h-3" /> Sistema
          </span>
        );
    }
  };

  const systemDomain = 'cname.vercel-dns.com';

  // Filter domains based on active tab
  const filteredDomains = domains.filter(domain => {
    if (activeTab === 'all') return true;
    if (activeTab === 'checkout') return domain.usage === DomainUsage.CHECKOUT;
    if (activeTab === 'member_area') return domain.usage === DomainUsage.MEMBER_AREA;
    if (activeTab === 'system') return domain.usage === DomainUsage.SYSTEM;
    return true;
  });

  return (
    <Layout>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Domínios</h1>
          <p className="text-gray-400 text-sm mt-1">Conecte seus domínios personalizados.</p>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)} className="shadow-xl shadow-primary/20">
          <Plus className="w-4 h-4" /> Adicionar Domínio
        </Button>
      </div>

      {/* Tabbed Navigation */}
      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${activeTab === 'all'
              ? 'bg-primary text-white'
              : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
        >
          Todos
        </button>
        <button
          onClick={() => setActiveTab('checkout')}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'checkout'
              ? 'bg-primary text-white'
              : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
        >
          <ShoppingCart className="w-4 h-4" /> Checkout
        </button>
        <button
          onClick={() => setActiveTab('member_area')}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'member_area'
              ? 'bg-primary text-white'
              : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
        >
          <Users className="w-4 h-4" /> Área de Membros
        </button>
        <button
          onClick={() => setActiveTab('system')}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'system'
              ? 'bg-primary text-white'
              : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
        >
          <LayoutIcon className="w-4 h-4" /> Sistema
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {filteredDomains.length === 0 ? (
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
          filteredDomains.map(domain => (
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
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-bold text-white">
                        {domain.domain}
                      </h3>
                      {getStatusBadge(domain.status)}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      {getUsageBadge(domain.usage || DomainUsage.GENERAL)}
                      <span className="text-sm text-gray-500">Adicionado em {new Date(domain.created_at).toLocaleDateString()}</span>
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
                    onClick={() => handleDeleteClick(domain.id, domain.domain)}
                    disabled={removingId === domain.id || checkingUsageId === domain.id}
                    className="p-2 hover:bg-red-500/10 rounded-lg text-gray-400 hover:text-red-500 transition-colors"
                  >
                    {(removingId === domain.id || checkingUsageId === domain.id) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* MODAL 1: ADD DOMAIN */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Adicionar Domínio">
        <form onSubmit={handleSave} className="space-y-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Finalidade do Domínio</label>
            <div className="grid grid-cols-1 gap-3">
              <div
                className={`p-3 rounded-xl border cursor-pointer transition-all ${formData.usage === DomainUsage.CHECKOUT ? 'bg-blue-500/20 border-blue-500/50' : 'bg-black/30 border-white/10 hover:border-white/20'}`}
                onClick={() => setFormData({ ...formData, usage: DomainUsage.CHECKOUT })}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${formData.usage === DomainUsage.CHECKOUT ? 'bg-blue-500 text-white' : 'bg-white/5 text-gray-400'}`}>
                    <ShoppingCart className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className={`text-sm font-bold ${formData.usage === DomainUsage.CHECKOUT ? 'text-white' : 'text-gray-300'}`}>Para Checkout</h3>
                    <p className="text-xs text-gray-500">Ex: pay.meusite.com</p>
                  </div>
                </div>
              </div>

              <div
                className={`p-3 rounded-xl border cursor-pointer transition-all ${formData.usage === DomainUsage.MEMBER_AREA ? 'bg-purple-500/20 border-purple-500/50' : 'bg-black/30 border-white/10 hover:border-white/20'}`}
                onClick={() => setFormData({ ...formData, usage: DomainUsage.MEMBER_AREA })}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${formData.usage === DomainUsage.MEMBER_AREA ? 'bg-purple-500 text-white' : 'bg-white/5 text-gray-400'}`}>
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className={`text-sm font-bold ${formData.usage === DomainUsage.MEMBER_AREA ? 'text-white' : 'text-gray-300'}`}>Para Área de Membros</h3>
                    <p className="text-xs text-gray-500">Ex: membros.meusite.com</p>
                  </div>
                </div>
              </div>

              <div
                className={`p-3 rounded-xl border cursor-pointer transition-all ${formData.usage === DomainUsage.SYSTEM ? 'bg-green-500/20 border-green-500/50' : 'bg-black/30 border-white/10 hover:border-white/20'}`}
                onClick={() => setFormData({ ...formData, usage: DomainUsage.SYSTEM })}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${formData.usage === DomainUsage.SYSTEM ? 'bg-green-500 text-white' : 'bg-white/5 text-gray-400'}`}>
                    <LayoutIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className={`text-sm font-bold ${formData.usage === DomainUsage.SYSTEM ? 'text-white' : 'text-gray-300'}`}>Para Sistema</h3>
                    <p className="text-xs text-gray-500">Ex: admin.meusite.com</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Domínio (sem http/https)</label>
            <input
              required
              type="text"
              className="w-full bg-black/30 border border-purple-500/20 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 outline-none placeholder:text-gray-600"
              placeholder={formData.usage === DomainUsage.MEMBER_AREA ? "clube.meusite.com" : "pay.meusite.com"}
              value={formData.domain}
              onChange={e => setFormData({ ...formData, domain: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setIsAddModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={isLoading} className="bg-purple-600 hover:bg-purple-700 text-white border-none shadow-lg shadow-purple-500/20">
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Adicionar'}
            </Button>
          </div>
        </form>
      </Modal>


      {/* MODAL 2: DNS CONFIGURATION */}
      {selectedDomain && (
        <Modal
          isOpen={isDnsModalOpen}
          onClose={() => setIsDnsModalOpen(false)}
          title={selectedDomain.status === DomainStatus.ACTIVE ? 'Domínio Conectado' : 'Configuração DNS'}
          className="max-w-2xl"
        >
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${selectedDomain.status === DomainStatus.ACTIVE
                ? 'bg-green-500/20 text-green-500 border-green-500/20'
                : 'bg-yellow-500/20 text-yellow-500 border-yellow-500/20'
                }`}>
                <Server className="w-5 h-5" />
              </div>
              <p className="text-sm text-gray-400">
                {selectedDomain.status === DomainStatus.ACTIVE
                  ? 'Seu domínio está ativo e funcionando.'
                  : 'Configure seu provedor para conectar o domínio.'}
              </p>
            </div>

            <div className="bg-black/30 border border-white/10 rounded-xl p-4 space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-300">
                  Registros DNS necessários:
                </p>
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
                <div className="space-y-6">
                  {/* CNAME Records */}
                  {dnsRecords.filter((r: any) => r.type.toUpperCase() === 'CNAME').length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider">Subdomínio (CNAME)</h3>
                      {dnsRecords.filter((r: any) => r.type.toUpperCase() === 'CNAME').map((record: any, idx: number) => (
                        <div key={`cname-${idx}`} className="grid grid-cols-4 gap-2 text-xs">
                          <div className="bg-white/5 p-2 rounded border border-white/5">
                            <span className="text-gray-500 block mb-1">Type</span>
                            <span className="text-white font-mono font-bold">CNAME</span>
                          </div>
                          <div className="bg-white/5 p-2 rounded border border-white/5">
                            <span className="text-gray-500 block mb-1">Name</span>
                            <span className="text-white font-mono">{record.domain.startsWith('www.') ? 'www' : (record.domain.split('.').length > 2 ? record.domain.split('.')[0] : '@')}</span>
                          </div>
                          <div className="bg-white/5 p-2 rounded border border-white/5 relative group col-span-2">
                            <span className="text-gray-500 block mb-1">Value</span>
                            <span className="text-white font-mono break-all">{record.value}</span>
                            <button onClick={() => handleCopy(record.value, `val-cname-${idx}`)} className="absolute top-2 right-2 text-gray-500 hover:text-white">
                              {copiedField === `val-cname-${idx}` ? <CheckCircle className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* A Records */}
                  {dnsRecords.filter((r: any) => r.type.toUpperCase() === 'A').length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider">Domínio (A Record)</h3>
                      {dnsRecords.filter((r: any) => r.type.toUpperCase() === 'A').map((record: any, idx: number) => (
                        <div key={`a-${idx}`} className="grid grid-cols-4 gap-2 text-xs">
                          <div className="bg-white/5 p-2 rounded border border-white/5">
                            <span className="text-gray-500 block mb-1">Type</span>
                            <span className="text-white font-mono font-bold">A</span>
                          </div>
                          <div className="bg-white/5 p-2 rounded border border-white/5">
                            <span className="text-gray-500 block mb-1">Name</span>
                            <span className="text-white font-mono">@</span>
                          </div>
                          <div className="bg-white/5 p-2 rounded border border-white/5 relative group col-span-2">
                            <span className="text-gray-500 block mb-1">Value</span>
                            <span className="text-white font-mono break-all">{record.value}</span>
                            <button onClick={() => handleCopy(record.value, `val-a-${idx}`)} className="absolute top-2 right-2 text-gray-500 hover:text-white">
                              {copiedField === `val-a-${idx}` ? <CheckCircle className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* TXT Records */}
                  {dnsRecords.filter((r: any) => r.type.toUpperCase() === 'TXT').length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider">Verificação (TXT)</h3>
                      {dnsRecords.filter((r: any) => r.type.toUpperCase() === 'TXT').map((record: any, idx: number) => (
                        <div key={`txt-${idx}`} className="grid grid-cols-4 gap-2 text-xs">
                          <div className="bg-white/5 p-2 rounded border border-white/5">
                            <span className="text-gray-500 block mb-1">Type</span>
                            <span className="text-white font-mono font-bold">TXT</span>
                          </div>
                          <div className="bg-white/5 p-2 rounded border border-white/5">
                            <span className="text-gray-500 block mb-1">Name</span>
                            <span className="text-white font-mono">{record.domain.startsWith('_vercel') ? '_vercel' : '@'}</span>
                          </div>
                          <div className="bg-white/5 p-2 rounded border border-white/5 relative group col-span-2">
                            <span className="text-gray-500 block mb-1">Value</span>
                            <span className="text-white font-mono break-all">{record.value}</span>
                            <button onClick={() => handleCopy(record.value, `val-txt-${idx}`)} className="absolute top-2 right-2 text-gray-500 hover:text-white">
                              {copiedField === `val-txt-${idx}` ? <CheckCircle className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

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
        </Modal>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      <ConfirmModal
        isOpen={!!deleteId}
        onClose={() => {
          setDeleteId(null);
          setDeleteDomainName('');
        }}
        onConfirm={handleConfirmDelete}
        title="Excluir Domínio"
        message="Tem certeza que deseja excluir este domínio? Esta ação não pode ser desfeita."
        confirmText="Sim, excluir"
        cancelText="Cancelar"
        variant="danger"
        loading={removingId === deleteId}
      />

      {/* USAGE WARNING MODAL */}
      <Modal
        isOpen={!!usageWarning}
        onClose={() => setUsageWarning(null)}
        title="Domínio em Uso"
        className="max-w-md"
      >
        <div className="space-y-4">
          <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-yellow-500 font-bold text-sm mb-1">Não é possível excluir</h3>
              <p className="text-yellow-200/80 text-xs">
                Este domínio está vinculado aos seguintes itens. Remova os vínculos antes de excluir.
              </p>
            </div>
          </div>

          <div className="bg-black/30 border border-white/10 rounded-xl overflow-hidden">
            {usageWarning?.checkouts.length > 0 && (
              <div className="p-3 border-b border-white/5 last:border-0">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Checkouts</h4>
                <ul className="space-y-1">
                  {usageWarning.checkouts.map((Checkout: any) => (
                    <li key={Checkout.id} className="text-sm text-white flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                      {Checkout.name}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {usageWarning?.memberAreas.length > 0 && (
              <div className="p-3 border-b border-white/5 last:border-0">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Áreas de Membros</h4>
                <ul className="space-y-1">
                  {usageWarning.memberAreas.map((area: any) => (
                    <li key={area.id} className="text-sm text-white flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div>
                      {area.name}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="flex justify-end pt-2">
            <Button onClick={() => setUsageWarning(null)}>Entendi</Button>
          </div>
        </div>
      </Modal>

      {/* ALERT MODAL */}
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
        title={alertModal.title}
        message={alertModal.message}
        variant={alertModal.variant}
      />
    </Layout>
  );
};
