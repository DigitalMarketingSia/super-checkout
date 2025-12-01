
import React, { useState, useEffect } from 'react';
import { Layout } from '../../components/Layout';
import { storage } from '../../services/storageService';
import { WebhookConfig, WebhookLog, WebhookHeader } from '../../types';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import {
   Plus,
   Settings,
   Activity,
   Trash2,
   Edit2,
   Play,
   RotateCw,
   CheckCircle,
   XCircle,
   AlertTriangle,
   Copy,
   Download,
   Terminal,
   Globe,
   Lock,
   ChevronRight,
   ChevronDown,
   Code,
   ExternalLink
} from 'lucide-react';
import { Modal, ConfirmModal, AlertModal } from '../../components/ui/Modal';

const AVAILABLE_EVENTS = [
   { id: 'checkout.iniciado', label: 'Checkout Iniciado' },
   { id: 'checkout.abandonado', label: 'Checkout Abandonado' },
   { id: 'pagamento.aprovado', label: 'Pagamento Aprovado' },
   { id: 'pagamento.recusado', label: 'Pagamento Recusado' },
   { id: 'pagamento.pendente', label: 'Pagamento Pendente' },
   { id: 'boleto.gerado', label: 'Boleto Gerado' },
   { id: 'pix.gerado', label: 'Pix Gerado' },
   { id: 'assinatura.criada', label: 'Assinatura Criada' },
   { id: 'assinatura.cancelada', label: 'Assinatura Cancelada' },
   { id: 'reembolso.solicitado', label: 'Reembolso Solicitado' },
   { id: 'reembolso.aprovado', label: 'Reembolso Aprovado' },
];

const MOCK_PAYLOADS: Record<string, any> = {
   'pagamento.aprovado': {
      "event": "pagamento.aprovado",
      "checkout_id": "chk_123456",
      "order_id": "ord_987654",
      "amount": 197.00,
      "currency": "BRL",
      "payment_method": "credit_card",
      "status": "paid",
      "customer": {
         "name": "João da Silva",
         "email": "joao@exemplo.com",
         "phone": "5511999998888",
         "cpf": "123.456.789-00"
      },
      "items": [
         { "name": "Curso React Pro", "price": 197.00, "qty": 1 }
      ],
      "created_at": "2023-10-27T14:30:00Z"
   },
   'checkout.abandonado': {
      "event": "checkout.abandonado",
      "checkout_id": "chk_123456",
      "cart_token": "crt_abc123",
      "recovered_url": "https://checkout.app/r/abc123",
      "customer": {
         "email": "joao@exemplo.com",
         "name": "João"
      },
      "created_at": "2023-10-27T15:00:00Z"
   }
};

export const Webhooks = () => {
   const [activeTab, setActiveTab] = useState<'outgoing' | 'incoming' | 'history'>('outgoing');
   const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
   const [logs, setLogs] = useState<WebhookLog[]>([]);
   const [isModalOpen, setIsModalOpen] = useState(false);
   const [editingId, setEditingId] = useState<string | null>(null);

   // Modal States
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

   // Form State
   const [formData, setFormData] = useState<{
      name: string;
      url: string;
      method: 'POST' | 'GET' | 'PUT' | 'PATCH';
      headers: WebhookHeader[];
      events: string[];
      active: boolean;
      secret: string;
   }>({
      name: '',
      url: '',
      method: 'POST',
      headers: [],
      events: [],
      active: true,
      secret: ''
   });

   // Testing State
   const [testStatus, setTestStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
   const [testResult, setTestResult] = useState<any>(null);

   useEffect(() => {
      loadData();
   }, []);

   const loadData = async () => {
      setWebhooks(await storage.getWebhooks());
      // Sort logs by date desc
      const webhookLogs = await storage.getWebhookLogs();
      setLogs(webhookLogs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
   };

   const handleSave = (e: React.FormEvent) => {
      e.preventDefault();
      const newWebhook: WebhookConfig = {
         id: editingId || `wh_${Date.now()}`,
         created_at: editingId ? webhooks.find(w => w.id === editingId)?.created_at || new Date().toISOString() : new Date().toISOString(),
         ...formData
      };

      let updatedWebhooks;
      if (editingId) {
         updatedWebhooks = webhooks.map(w => w.id === editingId ? newWebhook : w);
      } else {
         updatedWebhooks = [...webhooks, newWebhook];
      }

      storage.saveWebhooks(updatedWebhooks);
      setWebhooks(updatedWebhooks);
      setIsModalOpen(false);
      resetForm();
   };

   const handleDeleteClick = (id: string) => {
      setDeleteId(id);
   };

   const handleConfirmDelete = () => {
      if (!deleteId) return;
      const updated = webhooks.filter(w => w.id !== deleteId);
      storage.saveWebhooks(updated);
      setWebhooks(updated);
      setDeleteId(null);
      showAlert('Sucesso', 'Webhook excluído com sucesso.', 'success');
   };

   const handleTest = async (webhook: Partial<WebhookConfig>) => {
      setTestStatus('loading');
      setTestResult(null);

      const payload = MOCK_PAYLOADS[webhook.events?.[0] || 'pagamento.aprovado'] || MOCK_PAYLOADS['pagamento.aprovado'];

      try {
         const startTime = Date.now();

         // Simulate Request (Real fetch would likely be blocked by CORS in a browser demo unless to a permissive API)
         // Trying real fetch to show "Network Error" or success if valid
         let responseStatus = 0;
         let responseBody = '';
         let success = false;

         try {
            const res = await fetch(webhook.url!, {
               method: webhook.method,
               headers: {
                  'Content-Type': 'application/json',
                  ...(webhook.secret ? { 'X-Super-Checkout-Signature': webhook.secret } : {}),
                  ...webhook.headers?.reduce((acc, h) => ({ ...acc, [h.key]: h.value }), {})
               },
               body: JSON.stringify(payload)
            });
            responseStatus = res.status;
            responseBody = await res.text();
            success = res.ok;
         } catch (err: any) {
            responseBody = err.message || 'Network Error / CORS Blocked';
            responseStatus = 0;
         }

         const duration = Date.now() - startTime;

         const log: WebhookLog = {
            id: `log_${Date.now()}`,
            webhook_id: webhook.id,
            direction: 'outgoing',
            event: 'test.event',
            payload: JSON.stringify(payload),
            response_status: responseStatus,
            response_body: responseBody,
            duration_ms: duration,
            created_at: new Date().toISOString()
         };

         // Save Log
         const updatedLogs = [log, ...logs];
         storage.saveWebhookLogs(updatedLogs);
         setLogs(updatedLogs);

         setTestResult({
            status: responseStatus,
            body: responseBody.substring(0, 200) + (responseBody.length > 200 ? '...' : ''),
            duration
         });
         setTestStatus(success ? 'success' : 'error');

      } catch (e) {
         setTestStatus('error');
      }
   };

   const openEdit = (wh: WebhookConfig) => {
      setEditingId(wh.id);
      setFormData({
         name: wh.name,
         url: wh.url,
         method: wh.method,
         headers: wh.headers || [],
         events: wh.events,
         active: wh.active,
         secret: wh.secret || ''
      });
      setIsModalOpen(true);
      setTestStatus('idle');
   };

   const openNew = () => {
      setEditingId(null);
      resetForm();
      setIsModalOpen(true);
      setTestStatus('idle');
   };

   const resetForm = () => {
      setFormData({
         name: '',
         url: '',
         method: 'POST',
         headers: [],
         events: [],
         active: true,
         secret: crypto.randomUUID().replace(/-/g, '')
      });
   };

   const toggleEvent = (eventId: string) => {
      const current = formData.events;
      if (current.includes(eventId)) {
         setFormData({ ...formData, events: current.filter(e => e !== eventId) });
      } else {
         setFormData({ ...formData, events: [...current, eventId] });
      }
   };

   const copyToClipboard = (text: string) => {
      navigator.clipboard.writeText(text);
      // Could add toast here
   };

   const exportJSON = () => {
      const blob = new Blob([JSON.stringify(webhooks, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'webhooks_config.json';
      a.click();
   };

   const exportCSV = () => {
      const headers = "ID,Event,Status,Date,URL\n";
      const rows = logs.map(l => `${l.id},${l.event},${l.response_status},${l.created_at},${l.direction}`).join('\n');
      const blob = new Blob([headers + rows], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'webhook_history.csv';
      a.click();
   };

   return (
      <Layout>
         {/* Header */}
         <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
               <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Activity className="w-6 h-6 text-primary" /> Webhooks
               </h1>
               <p className="text-gray-400 text-sm mt-1">Integre seu checkout com Zapier, n8n, CRMs e outros sistemas.</p>
            </div>
            <div className="flex gap-3">
               <Button variant="outline" onClick={exportJSON} className="border-white/10 hover:bg-white/5">
                  <Download className="w-4 h-4 mr-2" /> Exportar Config
               </Button>
               <Button onClick={openNew} className="shadow-xl shadow-primary/20">
                  <Plus className="w-4 h-4 mr-2" /> Novo Webhook
               </Button>
            </div>
         </div>

         {/* Tabs */}
         <div className="flex gap-6 mb-6 border-b border-white/5 overflow-x-auto">
            <button
               onClick={() => setActiveTab('outgoing')}
               className={`pb-3 text-sm font-medium transition-all relative ${activeTab === 'outgoing' ? 'text-primary' : 'text-gray-400 hover:text-white'}`}
            >
               Webhooks de Saída
               {activeTab === 'outgoing' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />}
            </button>
            <button
               onClick={() => setActiveTab('incoming')}
               className={`pb-3 text-sm font-medium transition-all relative ${activeTab === 'incoming' ? 'text-primary' : 'text-gray-400 hover:text-white'}`}
            >
               Webhooks de Entrada
               {activeTab === 'incoming' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />}
            </button>
            <button
               onClick={() => setActiveTab('history')}
               className={`pb-3 text-sm font-medium transition-all relative ${activeTab === 'history' ? 'text-primary' : 'text-gray-400 hover:text-white'}`}
            >
               Histórico de Disparos
               {activeTab === 'history' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />}
            </button>
         </div>

         {/* CONTENT: OUTGOING */}
         {activeTab === 'outgoing' && (
            <div className="space-y-6 animate-in fade-in duration-300">
               {webhooks.length === 0 ? (
                  <div className="text-center py-20 bg-white/5 rounded-2xl border border-dashed border-white/10">
                     <Globe className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                     <h3 className="text-lg font-medium text-white">Nenhum webhook configurado</h3>
                     <p className="text-gray-400 mb-6 max-w-md mx-auto">Crie sua primeira integração para notificar sistemas externos sobre vendas.</p>
                     <Button onClick={openNew}>Criar Primeiro Webhook</Button>
                  </div>
               ) : (
                  <div className="grid grid-cols-1 gap-4">
                     {webhooks.map(wh => (
                        <Card key={wh.id} noPadding className="group overflow-hidden transition-all hover:border-primary/30">
                           <div className="p-6 flex flex-col lg:flex-row items-start lg:items-center gap-6">
                              {/* Status Indicator */}
                              <div className={`w-3 h-3 rounded-full flex-shrink-0 ${wh.active ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-gray-600'}`} />

                              {/* Info */}
                              <div className="flex-1 min-w-0">
                                 <div className="flex items-center gap-3 mb-1">
                                    <h3 className="text-lg font-bold text-white truncate">{wh.name}</h3>
                                    <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${wh.method === 'POST' ? 'bg-blue-500/20 text-blue-400' :
                                       wh.method === 'GET' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                                       }`}>
                                       {wh.method}
                                    </span>
                                 </div>
                                 <div className="flex items-center gap-2 text-sm text-gray-400 font-mono mb-2 truncate">
                                    <span className="truncate">{wh.url}</span>
                                    <button onClick={() => copyToClipboard(wh.url)} className="hover:text-white"><Copy className="w-3 h-3" /></button>
                                 </div>
                                 <div className="flex flex-wrap gap-2">
                                    {wh.events.slice(0, 3).map(evt => (
                                       <span key={evt} className="text-xs bg-white/5 px-2 py-1 rounded border border-white/5 text-gray-300">
                                          {evt}
                                       </span>
                                    ))}
                                    {wh.events.length > 3 && <span className="text-xs text-gray-500">+{wh.events.length - 3} outros</span>}
                                 </div>
                              </div>

                              {/* Stats */}
                              <div className="hidden lg:block text-right min-w-[140px]">
                                 <p className="text-xs text-gray-500 uppercase mb-1">Último Disparo</p>
                                 {wh.last_fired_at ? (
                                    <>
                                       <p className="text-white font-medium">{new Date(wh.last_fired_at).toLocaleString()}</p>
                                       <div className={`text-xs font-bold mt-1 inline-flex items-center gap-1 ${wh.last_status && wh.last_status >= 200 && wh.last_status < 300 ? 'text-green-500' : 'text-red-500'
                                          }`}>
                                          {wh.last_status === 200 ? <CheckCircle className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                                          HTTP {wh.last_status}
                                       </div>
                                    </>
                                 ) : (
                                    <p className="text-gray-600 italic">Nunca disparado</p>
                                 )}
                              </div>

                              {/* Actions */}
                              <div className="flex items-center gap-2 self-end lg:self-center">
                                 <Button variant="ghost" size="sm" onClick={() => handleTest(wh)}>
                                    <Play className="w-4 h-4 text-primary mr-2" /> Testar
                                 </Button>
                                 <button onClick={() => openEdit(wh)} className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors">
                                    <Settings className="w-4 h-4" />
                                 </button>
                                 <button onClick={() => handleDeleteClick(wh.id)} className="p-2 hover:bg-red-500/10 rounded-lg text-gray-400 hover:text-red-500 transition-colors">
                                    <Trash2 className="w-4 h-4" />
                                 </button>
                              </div>
                           </div>
                        </Card>
                     ))}
                  </div>
               )}
            </div>
         )}

         {/* CONTENT: HISTORY */}
         {activeTab === 'history' && (
            <Card noPadding className="overflow-hidden animate-in fade-in duration-300">
               <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/5">
                  <h3 className="font-bold text-white">Log de Eventos Recentes</h3>
                  <Button variant="ghost" size="sm" onClick={exportCSV} className="text-xs">
                     <Download className="w-3 h-3 mr-2" /> Exportar CSV
                  </Button>
               </div>
               <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                     <thead className="text-gray-500 bg-black/20 font-medium">
                        <tr>
                           <th className="px-4 py-3">Status</th>
                           <th className="px-4 py-3">Evento / Direção</th>
                           <th className="px-4 py-3">Data & Hora</th>
                           <th className="px-4 py-3">Duração</th>
                           <th className="px-4 py-3">Ações</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-white/5">
                        {logs.length === 0 ? (
                           <tr>
                              <td colSpan={5} className="text-center py-8 text-gray-500">Nenhum registro encontrado.</td>
                           </tr>
                        ) : (
                           logs.map(log => (
                              <tr key={log.id} className="hover:bg-white/5 transition-colors">
                                 <td className="px-4 py-3">
                                    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-bold border ${log.response_status && log.response_status >= 200 && log.response_status < 300
                                       ? 'bg-green-500/10 text-green-500 border-green-500/20'
                                       : 'bg-red-500/10 text-red-500 border-red-500/20'
                                       }`}>
                                       {log.response_status || 'ERR'}
                                    </span>
                                 </td>
                                 <td className="px-4 py-3">
                                    <div className="flex flex-col">
                                       <span className="text-white font-mono">{log.event}</span>
                                       <span className="text-xs text-gray-500 capitalize">{log.direction}</span>
                                    </div>
                                 </td>
                                 <td className="px-4 py-3 text-gray-400 text-xs">
                                    {new Date(log.created_at).toLocaleString()}
                                 </td>
                                 <td className="px-4 py-3 text-gray-500 text-xs font-mono">
                                    {log.duration_ms ? `${log.duration_ms}ms` : '-'}
                                 </td>
                                 <td className="px-4 py-3">
                                    <button className="text-primary hover:text-white text-xs flex items-center gap-1" onClick={() => showAlert('Info', 'Visualizador de Payload em breve.', 'info')}>
                                       <Code className="w-3 h-3" /> Payload
                                    </button>
                                 </td>
                              </tr>
                           ))
                        )}
                     </tbody>
                  </table>
               </div>
            </Card>
         )}

         {/* CONTENT: INCOMING */}
         {activeTab === 'incoming' && (
            <div className="animate-in fade-in duration-300 max-w-4xl">
               <div className="bg-gradient-to-r from-primary/20 to-purple-900/20 rounded-2xl p-8 border border-white/10 mb-8">
                  <h2 className="text-2xl font-bold text-white mb-2">Webhooks de Entrada</h2>
                  <p className="text-gray-300 mb-6">Utilize nossa API para atualizar status de pedidos, liberar acessos ou integrar com sistemas legados.</p>

                  <div className="bg-black/40 rounded-xl p-4 border border-white/10 flex items-center justify-between gap-4">
                     <code className="text-primary-light font-mono text-sm break-all">
                        {typeof window !== 'undefined' ? window.location.origin : 'https://api.supercheckout.app'}/api/v1/webhooks/incoming/{'{integration_id}'}
                     </code>
                     <Button size="sm" variant="secondary" onClick={() => copyToClipboard(`${typeof window !== 'undefined' ? window.location.origin : 'https://api.supercheckout.app'}/api/v1/webhooks/incoming/`)}>
                        <Copy className="w-4 h-4 mr-2" /> Copiar
                     </Button>
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                     <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                        <Terminal className="w-4 h-4 text-green-500" /> Exemplo cURL
                     </h3>
                     <pre className="bg-black/30 p-4 rounded-lg text-xs text-gray-400 font-mono overflow-x-auto custom-scrollbar">
                        {`curl -X POST ${typeof window !== 'undefined' ? window.location.origin : 'https://api.supercheckout.app'}/api/v1/webhooks/incoming/123 \\
-H "Content-Type: application/json" \\
-H "Authorization: Bearer YOUR_API_KEY" \\
-d '{
  "event": "pedido.atualizar",
  "order_id": "ord_555",
  "status": "paid"
}'`}
                     </pre>
                  </Card>

                  <Card>
                     <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                        <Code className="w-4 h-4 text-yellow-500" /> Eventos Suportados
                     </h3>
                     <ul className="space-y-2 text-sm text-gray-400">
                        <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-gray-600 rounded-full"></div> pedido.atualizar</li>
                        <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-gray-600 rounded-full"></div> acesso.liberar</li>
                        <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-gray-600 rounded-full"></div> assinatura.cancelar</li>
                        <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-gray-600 rounded-full"></div> cliente.bloquear</li>
                     </ul>
                     <a href="#" className="text-primary text-xs mt-4 block hover:underline flex items-center gap-1">
                        Ver documentação completa da API <ExternalLink className="w-3 h-3" />
                     </a>
                  </Card>
               </div>
            </div>
         )}

         {/* MODAL: CREATE / EDIT */}
         <Modal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            title={editingId ? 'Editar Webhook' : 'Novo Webhook'}
            className="max-w-4xl"
         >
            <form onSubmit={handleSave} className="flex flex-col lg:flex-row gap-6 max-h-[80vh] overflow-y-auto custom-scrollbar p-1">

               {/* Left: Configuration */}
               <div className="flex-1 space-y-6">

                  <div className="space-y-4">
                     <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1.5">Nome da Integração</label>
                        <input
                           required
                           type="text"
                           className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-primary/50 outline-none"
                           placeholder="Ex: Notificar Zapier - Vendas"
                           value={formData.name}
                           onChange={e => setFormData({ ...formData, name: e.target.value })}
                        />
                     </div>

                     <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1.5">Endpoint URL</label>
                        <div className="flex">
                           <select
                              className="bg-white/5 border border-r-0 border-white/10 rounded-l-xl px-3 py-3 text-white text-sm focus:ring-2 focus:ring-primary/50 outline-none w-24 font-bold"
                              value={formData.method}
                              onChange={e => setFormData({ ...formData, method: e.target.value as any })}
                           >
                              <option value="POST">POST</option>
                              <option value="GET">GET</option>
                              <option value="PUT">PUT</option>
                              <option value="PATCH">PATCH</option>
                           </select>
                           <input
                              required
                              type="url"
                              className="flex-1 bg-black/20 border border-white/10 rounded-r-xl px-4 py-3 text-white focus:ring-2 focus:ring-primary/50 outline-none font-mono text-sm"
                              placeholder="https://hooks.zapier.com/..."
                              value={formData.url}
                              onChange={e => setFormData({ ...formData, url: e.target.value })}
                           />
                        </div>
                     </div>
                  </div>

                  <div className="h-px bg-white/5" />

                  <div>
                     <label className="block text-sm font-medium text-gray-300 mb-3">Eventos de Disparo</label>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                        {AVAILABLE_EVENTS.map(evt => (
                           <label
                              key={evt.id}
                              className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all ${formData.events.includes(evt.id)
                                 ? 'bg-primary/10 border-primary/50'
                                 : 'bg-white/5 border-white/5 hover:bg-white/10'
                                 }`}
                           >
                              <input
                                 type="checkbox"
                                 className="hidden"
                                 checked={formData.events.includes(evt.id)}
                                 onChange={() => toggleEvent(evt.id)}
                              />
                              <div className={`w-4 h-4 rounded border mr-3 flex items-center justify-center ${formData.events.includes(evt.id) ? 'bg-primary border-primary' : 'border-gray-500'
                                 }`}>
                                 {formData.events.includes(evt.id) && <CheckCircle className="w-3 h-3 text-white" />}
                              </div>
                              <span className="text-sm text-gray-300">{evt.label}</span>
                           </label>
                        ))}
                     </div>
                  </div>

                  <div className="h-px bg-white/5" />

                  <div className="bg-black/30 p-4 rounded-xl border border-white/5">
                     <div className="flex justify-between items-center mb-2">
                        <h4 className="text-sm font-bold text-white flex items-center gap-2">
                           <Lock className="w-3 h-3 text-primary" /> Segurança
                        </h4>
                        <button
                           type="button"
                           onClick={() => setFormData({ ...formData, secret: crypto.randomUUID().replace(/-/g, '') })}
                           className="text-xs text-primary hover:text-white flex items-center gap-1"
                        >
                           <RotateCw className="w-3 h-3" /> Gerar Nova Chave
                        </button>
                     </div>
                     <p className="text-xs text-gray-400 mb-3">
                        Enviamos esta chave no header <code className="text-primary">X-Super-Checkout-Signature</code> para validar a autenticidade.
                     </p>
                     <div className="relative">
                        <input
                           type="text" readOnly
                           className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-gray-300"
                           value={formData.secret}
                        />
                        <button type="button" onClick={() => copyToClipboard(formData.secret)} className="absolute right-2 top-2 text-gray-500 hover:text-white">
                           <Copy className="w-3 h-3" />
                        </button>
                     </div>
                  </div>

                  {/* Footer Actions */}
                  <div className="flex items-center justify-between pt-4 border-t border-white/5">
                     <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-300">Status</span>
                        <button
                           type="button"
                           onClick={() => setFormData({ ...formData, active: !formData.active })}
                           className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.active ? 'bg-green-500' : 'bg-gray-600'}`}
                        >
                           <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.active ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                     </div>
                     <div className="flex gap-3">
                        <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                        <Button type="submit">Salvar Webhook</Button>
                     </div>
                  </div>

               </div>

               {/* Right: Preview & Test */}
               <div className="w-full lg:w-1/3 bg-black/20 p-6 rounded-xl border border-white/5 flex flex-col">

                  <div className="flex-1">
                     <h4 className="text-sm font-bold text-white mb-3 flex items-center justify-between">
                        <span>Payload Preview</span>
                        <span className="text-[10px] bg-white/10 px-2 py-1 rounded text-gray-400">JSON</span>
                     </h4>
                     <div className="bg-[#1E1E1E] rounded-xl border border-white/10 p-4 h-[300px] overflow-y-auto custom-scrollbar relative group">
                        <pre className="text-xs font-mono text-green-400 whitespace-pre-wrap break-all">
                           {JSON.stringify(MOCK_PAYLOADS[formData.events[0]] || MOCK_PAYLOADS['pagamento.aprovado'], null, 2)}
                        </pre>
                        <button
                           type="button"
                           className="absolute top-2 right-2 bg-white/10 p-1.5 rounded text-gray-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                           onClick={() => copyToClipboard(JSON.stringify(MOCK_PAYLOADS['pagamento.aprovado'], null, 2))}
                        >
                           <Copy className="w-3 h-3" />
                        </button>
                     </div>
                  </div>

                  <div className="mt-6 pt-6 border-t border-white/5">
                     <Button
                        type="button"
                        onClick={() => handleTest(formData)}
                        disabled={!formData.url || testStatus === 'loading'}
                        variant="secondary"
                        className="w-full mb-3"
                     >
                        {testStatus === 'loading' ? <Activity className="w-4 h-4 animate-spin mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                        {testStatus === 'loading' ? 'Disparando...' : 'Testar Webhook'}
                     </Button>

                     {testStatus !== 'idle' && testResult && (
                        <div className={`p-3 rounded-lg border text-xs ${testStatus === 'success' ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'
                           }`}>
                           <div className="flex justify-between mb-1 font-bold">
                              <span className={testStatus === 'success' ? 'text-green-400' : 'text-red-400'}>
                                 Status: {testResult.status}
                              </span>
                              <span className="text-gray-400">{testResult.duration}ms</span>
                           </div>
                           <p className="text-gray-300 line-clamp-3 font-mono opacity-80">{testResult.body}</p>
                        </div>
                     )}
                  </div>

               </div>
            </form>
         </Modal>

         <ConfirmModal
            isOpen={!!deleteId}
            onClose={() => setDeleteId(null)}
            onConfirm={handleConfirmDelete}
            title="Excluir Webhook"
            message="Tem certeza que deseja excluir este webhook?"
            confirmText="Sim, excluir"
            cancelText="Cancelar"
            variant="danger"
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
