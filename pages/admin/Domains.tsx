
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
  const [checkouts, setCheckouts] = useState<Checkout[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    domain: '',
    checkout_id: '',
    slug: '',
    type: DomainType.CNAME
  });

  // DNS Records State for Modal/Card
  const [dnsRecords, setDnsRecords] = useState<any>(null);

  useEffect(() => {
    const loadData = async () => {
      setDomains(await storage.getDomains());
      setCheckouts(await storage.getCheckouts());
    };
    loadData();
  }, []);

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
        status: DomainStatus.PENDING, // Vercel starts as pending usually
        created_at: new Date().toISOString(),
        domain: formData.domain,
        type: formData.type,
        checkout_id: formData.checkout_id || null,
        slug: formData.slug || null
      };

      const savedDomain = await storage.createDomain(newDomainData);

      // Update local state with the real record from DB
      const updated = [...domains, savedDomain];
      setDomains(updated);

      // 3. Trigger initial verification to get DNS records
      await verifyDomain(savedDomain.id, formData.domain);

      setIsModalOpen(false);
      setFormData({ domain: '', checkout_id: '', slug: '', type: DomainType.CNAME });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const verifyDomain = async (id: string, domainName: string) => {
    setVerifyingId(id);
    try {
      const res = await fetch(`/api/domains/verify?domain=${domainName}`);

      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('API indisponível. Use "vercel dev" para testar localmente.');
      }

      const data = await res.json();

      if (data.error) throw new Error(data.error);

      // Update Status based on Vercel response
      let newStatus = DomainStatus.PENDING;
      if (data.verified) newStatus = DomainStatus.ACTIVE;
      else if (data.error) newStatus = DomainStatus.ERROR;

      // Update in State
      const updatedDomains = domains.map(d =>
        d.id === id ? { ...d, status: newStatus } : d
      );
      setDomains(updatedDomains);

      // Update in DB
      // We can use saveDomains here as the ID is now a valid UUID
      await storage.saveDomains(updatedDomains.filter(d => d.id === id));

      // If pending, we might want to store/show the DNS challenges
      if (!data.verified && data.verification) {
        setDnsRecords(data.verification);
      } else {
        setDnsRecords(null);
      }

    } catch (err) {
      console.error('Verification failed:', err);
    } finally {
      setVerifyingId(null);
    }
  };

  const handleRemove = async (id: string, domainName: string) => {
    if (!confirm('Tem certeza que deseja remover este domínio?')) return;

    setRemovingId(id);
    try {
      // 1. Remove from Vercel
      const res = await fetch(`/api/domains/remove?domain=${domainName}`, { method: 'DELETE' });

      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await res.json();
        if (data.error) throw new Error(data.error);
      } else if (!res.ok) {
        // If not JSON but error status (e.g. 404 from Vite)
        throw new Error('API indisponível. Use "vercel dev" para testar localmente.');
      }

      // 2. Remove from Supabase
      await storage.deleteDomain(id);

      const updated = domains.filter(d => d.id !== id);
      setDomains(updated);

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

  const systemDomain = 'cname.vercel-dns.com'; // Standard Vercel CNAME
  const systemUrl = `${window.location.protocol}//${window.location.host}`;

  return (
    <Layout>
      {/* ... (keep existing layout header) ... */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Domínios</h1>
          <p className="text-gray-400 text-sm mt-1">Conecte seus domínios personalizados para checkouts profissionais.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="shadow-xl shadow-primary/20">
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
            <p className="text-gray-400 mt-1 mb-6">Personalize a URL dos seus checkouts agora mesmo.</p>
            <div className="flex justify-center mt-4">
              <Button onClick={() => setIsModalOpen(true)}>Adicionar Domínio</Button>
            </div>
          </Card>
        ) : (
          domains.map(domain => (
            <Card key={domain.id} className="group overflow-hidden relative" noPadding>
              <div className="p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6">

                {/* Info Col */}
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
                      <span className="uppercase text-[10px] font-bold tracking-wider bg-white/10 px-1.5 py-0.5 rounded">
                        {domain.type}
                      </span>
                      {domain.slug && (
                        <span className="flex items-center gap-1">
                          <ArrowRight className="w-3 h-3" />
                          /{domain.slug}
                        </span>
                      )}
                      <span className="w-1 h-1 rounded-full bg-gray-600"></span>
                      <span>Adicionado em {new Date(domain.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                {/* DNS Info Box (If Pending & Records Available) */}
                {domain.status === DomainStatus.PENDING && (
                  <div className="flex-1 bg-yellow-500/5 border border-yellow-500/10 rounded-lg p-3 text-sm lg:mx-8">
                    <div className="flex items-center gap-2 text-yellow-500 font-bold mb-2 text-xs uppercase tracking-wide">
                      <AlertTriangle className="w-3 h-3" /> Configuração DNS Necessária
                    </div>
                    <div className="flex flex-col gap-2 text-xs text-gray-300">
                      <p>Aponte seu domínio para a Vercel:</p>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 w-12">Tipo:</span>
                        <code className="bg-black/20 px-1.5 py-0.5 rounded text-yellow-200 font-mono">CNAME</code>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 w-12">Nome:</span>
                        <code className="bg-black/20 px-1.5 py-0.5 rounded text-yellow-200 font-mono">@</code> (ou subdomínio)
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 w-12">Valor:</span>
                        <code className="bg-black/20 px-1.5 py-0.5 rounded text-yellow-200 font-mono">{systemDomain}</code>
                      </div>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-3 self-end lg:self-auto">
                  {domain.status === DomainStatus.ACTIVE ? (
                    <Button variant="outline" size="sm" className="opacity-50 cursor-not-allowed">
                      <CheckCircle className="w-3 h-3 text-green-500" /> Configurado
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => verifyDomain(domain.id, domain.domain)}
                      disabled={verifyingId === domain.id}
                      className={verifyingId === domain.id ? 'opacity-80' : ''}
                    >
                      {verifyingId === domain.id ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" /> Verificando...
                        </>
                      ) : (
                        <>
                          <RotateCw className="w-3 h-3" /> Verificar Conexão
                        </>
                      )}
                    </Button>
                  )}

                  <button
                    onClick={() => handleRemove(domain.id, domain.domain)}
                    disabled={removingId === domain.id}
                    className="p-2 hover:bg-red-500/10 rounded-lg text-gray-400 hover:text-red-500 transition-colors"
                  >
                    {removingId === domain.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  </button>
                </div>

              </div>
              {/* Background Glow */}
              <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-primary/5 to-transparent pointer-events-none"></div>
            </Card>
          ))
        )}
      </div>

      {/* ADD DOMAIN MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0F0F13] w-full max-w-2xl rounded-2xl shadow-2xl border border-white/10 overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">

            {/* Header */}
            <div className="px-6 py-5 border-b border-white/5 flex justify-between items-center bg-white/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center text-primary border border-primary/20">
                  <Server className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Adicionar Domínio</h2>
                  <p className="text-xs text-gray-400">Conecte um endereço personalizado.</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  {error}
                </div>
              )}

              {/* Basic Info */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">Domínio Personalizado</label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      required
                      type="text"
                      className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder-gray-600 focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                      placeholder="Ex: checkout.meusite.com"
                      value={formData.domain}
                      onChange={e => setFormData({ ...formData, domain: e.target.value })}
                    />
                  </div>
                </div>

                {/* Fields removed as per user request (moved to Checkout Editor) */}
              </div>

              <div className="h-px bg-white/5"></div>

              {/* Instructions / DNS Records */}
              <div className="bg-black/30 border border-white/10 rounded-xl p-4 space-y-4 animate-in fade-in duration-300">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Server className="w-4 h-4 text-primary" /> Configuração DNS
                </h4>
                <p className="text-xs text-gray-400">
                  Adicione o seguinte registro no seu provedor de domínio (Cloudflare, GoDaddy, etc):
                </p>

                {dnsRecords ? (
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
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-2 text-xs">
                    <div className="bg-white/5 p-2 rounded border border-white/5">
                      <span className="text-gray-500 block mb-1">Type</span>
                      <span className="text-white font-mono font-bold">CNAME</span>
                    </div>
                    <div className="bg-white/5 p-2 rounded border border-white/5">
                      <span className="text-gray-500 block mb-1">Name</span>
                      <span className="text-white font-mono">@ (ou sub)</span>
                    </div>
                    <div className="bg-white/5 p-2 rounded border border-white/5 relative group">
                      <span className="text-gray-500 block mb-1">Value</span>
                      <span className="text-white font-mono truncate">{systemDomain}</span>
                      <button onClick={() => handleCopy(systemDomain, 'def-val')} className="absolute top-2 right-2 text-gray-500 hover:text-white">
                        {copiedField === 'def-val' ? <CheckCircle className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                    <div className="bg-white/5 p-2 rounded border border-white/5 flex flex-col justify-center">
                      <span className="text-gray-500 block mb-1">Proxy</span>
                      <span className="text-gray-400">Desativado</span>
                    </div>
                  </div>
                )}
              </div>

            </form>

            {/* Footer */}
            <div className="px-6 py-4 bg-white/5 border-t border-white/5 flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={isLoading}>
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Adicionar Domínio'}
              </Button>
            </div>

          </div>
        </div>
      )}

    </Layout>
  );
};
