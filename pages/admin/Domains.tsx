
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
  X
} from 'lucide-react';

export const Domains = () => {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [checkouts, setCheckouts] = useState<Checkout[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    domain: '',
    checkout_id: '',
    slug: '',
    type: DomainType.CNAME
  });

  useEffect(() => {
    const loadData = async () => {
      setDomains(await storage.getDomains());
      setCheckouts(await storage.getCheckouts());
    };
    loadData();
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const newDomain: Domain = {
      id: `dom_${Date.now()}`,
      status: DomainStatus.PENDING,
      created_at: new Date().toISOString(),
      ...formData
    };

    const updated = [...domains, newDomain];
    storage.saveDomains(updated);
    setDomains(updated);
    setIsModalOpen(false);
    setFormData({ domain: '', checkout_id: '', slug: '', type: DomainType.CNAME });
  };

  const handleVerify = (id: string) => {
    setVerifyingId(id);
    // Simulate DNS propagation check
    setTimeout(() => {
      const updated = domains.map(d =>
        d.id === id ? { ...d, status: DomainStatus.ACTIVE } : d
      );
      storage.saveDomains(updated);
      setDomains(updated);
      setVerifyingId(null);
    }, 2000);
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

  const systemDomain = window.location.host;
  const systemUrl = `${window.location.protocol}//${systemDomain}`;

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

                {/* DNS Info Box (If Pending) */}
                {domain.status === DomainStatus.PENDING && domain.type === DomainType.CNAME && (
                  <div className="flex-1 bg-yellow-500/5 border border-yellow-500/10 rounded-lg p-3 text-sm lg:mx-8">
                    <div className="flex items-center gap-2 text-yellow-500 font-bold mb-2 text-xs uppercase tracking-wide">
                      <AlertTriangle className="w-3 h-3" /> Ação Necessária
                    </div>
                    <div className="flex flex-col sm:flex-row gap-4 text-xs text-gray-300">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">Host:</span>
                        <code className="bg-black/20 px-1.5 py-0.5 rounded text-yellow-200 font-mono">checkout</code>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">Value:</span>
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
                      onClick={() => handleVerify(domain.id)}
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

                  <button className="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors">
                    <ExternalLink className="w-4 h-4" />
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Checkout Vinculado</label>
                    <select
                      className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-primary/50 outline-none transition-all appearance-none"
                      value={formData.checkout_id}
                      onChange={e => setFormData({ ...formData, checkout_id: e.target.value })}
                    >
                      <option value="">-- Selecione (Opcional) --</option>
                      {checkouts.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Slug (Opcional)</label>
                    <div className="flex">
                      <span className="bg-white/5 border border-r-0 border-white/10 rounded-l-xl px-3 flex items-center text-gray-500 text-sm">/</span>
                      <input
                        type="text"
                        className="w-full bg-black/20 border border-white/10 rounded-r-xl px-4 py-3 text-white placeholder-gray-600 focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                        placeholder="oferta-especial"
                        value={formData.slug}
                        onChange={e => setFormData({ ...formData, slug: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-xs text-primary-light flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                  Preview: <span className="font-mono">{formData.domain || '...'}</span>{formData.slug ? `/${formData.slug}` : ''}
                </div>
              </div>

              <div className="h-px bg-white/5"></div>

              {/* Connection Method */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">Método de Conexão</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Option CNAME */}
                  <label className={`cursor-pointer relative flex flex-col p-4 rounded-xl border transition-all ${formData.type === DomainType.CNAME
                    ? 'bg-primary/10 border-primary/50 shadow-[0_0_15px_rgba(138,43,226,0.1)]'
                    : 'bg-white/5 border-white/5 hover:bg-white/10'
                    }`}>
                    <input
                      type="radio"
                      name="connType"
                      className="absolute top-4 right-4 text-primary focus:ring-primary"
                      checked={formData.type === DomainType.CNAME}
                      onChange={() => setFormData({ ...formData, type: DomainType.CNAME })}
                    />
                    <div className="mb-2 font-bold text-white flex items-center gap-2">
                      <span className="bg-white/10 px-1.5 py-0.5 rounded text-[10px] uppercase">Recomendado</span>
                      CNAME
                    </div>
                    <p className="text-xs text-gray-400 leading-relaxed">
                      Crie um subdomínio (ex: checkout.site.com) apontando para nossa plataforma. Mais rápido e seguro.
                    </p>
                  </label>

                  {/* Option Redirect */}
                  <label className={`cursor-pointer relative flex flex-col p-4 rounded-xl border transition-all ${formData.type === DomainType.REDIRECT
                    ? 'bg-primary/10 border-primary/50 shadow-[0_0_15px_rgba(138,43,226,0.1)]'
                    : 'bg-white/5 border-white/5 hover:bg-white/10'
                    }`}>
                    <input
                      type="radio"
                      name="connType"
                      className="absolute top-4 right-4 text-primary focus:ring-primary"
                      checked={formData.type === DomainType.REDIRECT}
                      onChange={() => setFormData({ ...formData, type: DomainType.REDIRECT })}
                    />
                    <div className="mb-2 font-bold text-white">Redirecionamento</div>
                    <p className="text-xs text-gray-400 leading-relaxed">
                      Redirecione um domínio existente via seu provedor de DNS (Cloudflare/GoDaddy) para o link gerado.
                    </p>
                  </label>
                </div>
              </div>

              {/* Instructions Dynamic */}
              {formData.type === DomainType.CNAME && (
                <div className="bg-black/30 border border-white/10 rounded-xl p-4 space-y-4 animate-in fade-in duration-300">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Server className="w-4 h-4 text-primary" /> Configuração DNS
                  </h4>
                  <p className="text-xs text-gray-400">
                    Acesse seu provedor de domínio e adicione o seguinte registro:
                  </p>

                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="bg-white/5 p-2 rounded border border-white/5">
                      <span className="text-gray-500 block mb-1">Tipo</span>
                      <span className="text-white font-mono font-bold">CNAME</span>
                    </div>
                    <div className="bg-white/5 p-2 rounded border border-white/5 relative group">
                      <span className="text-gray-500 block mb-1">Host / Nome</span>
                      <span className="text-white font-mono">checkout</span>
                      <button onClick={() => handleCopy('checkout', 'host')} className="absolute top-2 right-2 text-gray-500 hover:text-white">
                        {copiedField === 'host' ? <CheckCircle className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                    <div className="bg-white/5 p-2 rounded border border-white/5 relative group">
                      <span className="text-gray-500 block mb-1">Valor / Destino</span>
                      <span className="text-white font-mono">{systemDomain}</span>
                      <button onClick={() => handleCopy(systemDomain, 'value')} className="absolute top-2 right-2 text-gray-500 hover:text-white">
                        {copiedField === 'value' ? <CheckCircle className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {formData.type === DomainType.REDIRECT && (
                <div className="bg-black/30 border border-white/10 rounded-xl p-4 animate-in fade-in duration-300">
                  <h4 className="text-sm font-bold text-white mb-2">URL de Destino</h4>
                  <p className="text-xs text-gray-400 mb-3">Configure seu redirecionamento 301 para:</p>
                  <div className="flex items-center bg-white/5 rounded-lg px-3 py-2 border border-white/10">
                    <code className="text-xs text-primary-light flex-1 font-mono">{systemUrl}/c/{formData.checkout_id || 'ID_DO_CHECKOUT'}</code>
                    <button onClick={() => handleCopy(`${systemUrl}/c/${formData.checkout_id}`, 'url')} className="text-gray-400 hover:text-white">
                      {copiedField === 'url' ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

            </form>

            {/* Footer */}
            <div className="px-6 py-4 bg-white/5 border-t border-white/5 flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave}>Salvar Configuração</Button>
            </div>

          </div>
        </div>
      )}

    </Layout>
  );
};
