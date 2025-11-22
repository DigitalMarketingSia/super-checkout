
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Layout } from '../../components/Layout';
import { storage } from '../../services/storageService';
import { Checkout, Product, Gateway, Domain, DomainStatus, CheckoutConfig, GatewayProvider } from '../../types';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import {
   ArrowLeft,
   Save,
   Globe,
   ShoppingBag,
   CreditCard,
   Clock,
   Image as ImageIcon,
   Layers,
   AlertCircle,
   Check,
   Upload,
   Wallet
} from 'lucide-react';

const initialConfig: CheckoutConfig = {
   fields: { name: true, email: true, phone: true, cpf: true },
   payment_methods: { pix: true, credit_card: true, boleto: true },
   timer: { active: false, minutes: 15, bg_color: '#EF4444', text_color: '#FFFFFF' },
   header_image: '',
};

export const CheckoutEditor = () => {
   const { id } = useParams<{ id: string }>();
   const navigate = useNavigate();
   const isNew = id === 'new';
   const fileInputRef = useRef<HTMLInputElement>(null);

   // Generate a temporary ID for new checkouts to allow file uploads before saving
   const [tempId] = useState(() => isNew ? crypto.randomUUID() : '');
   const checkoutId = isNew ? tempId : id!;

   // Data Sources
   const [products, setProducts] = useState<Product[]>([]);
   const [domains, setDomains] = useState<Domain[]>([]);
   const [gateways, setGateways] = useState<Gateway[]>([]);

   // Form State
   const [name, setName] = useState('');
   const [active, setActive] = useState(true);
   const [productId, setProductId] = useState('');
   const [gatewayId, setGatewayId] = useState('');
   const [domainId, setDomainId] = useState('');
   const [slug, setSlug] = useState('');

   const [orderBumpIds, setOrderBumpIds] = useState<string[]>([]);
   const [upsellProductId, setUpsellProductId] = useState('');

   const [config, setConfig] = useState<CheckoutConfig>(initialConfig);
   const [loading, setLoading] = useState(true);

   const [isUploadingBanner, setIsUploadingBanner] = useState(false);

   // Computed lists (Filtered by Active Status)
   const activeProducts = products.filter(p => p.active);
   const availableBumps = activeProducts.filter(p => p.is_order_bump && p.id !== productId);
   const availableUpsells = activeProducts.filter(p => p.is_upsell && p.id !== productId);

   useEffect(() => {
      const load = async () => {
         // Load Dependencies
         setProducts(await storage.getProducts());
         setDomains(await storage.getDomains());
         setGateways(await storage.getGateways());

         if (!isNew && id) {
            const allCheckouts = await storage.getCheckouts();
            const found = allCheckouts.find(c => c.id === id);
            if (found) {
               setName(found.name);
               setActive(found.active);
               setProductId(found.product_id);
               setGatewayId(found.gateway_id);
               setDomainId(found.domain_id || '');
               setSlug(found.custom_url_slug);
               setOrderBumpIds(found.order_bump_ids || []);
               setUpsellProductId(found.upsell_product_id || '');
               setConfig(found.config || initialConfig);
            }
         }
         setLoading(false);
      };
      load();
   }, [id, isNew]);

   const handleSave = async () => {
      console.log('🔍 Debug - Form state:', { name, productId, gatewayId });
      console.log('🔍 Debug - Active products:', activeProducts.length);
      console.log('🔍 Debug - Active gateways:', gateways.filter(g => g.active));

      if (!name || !productId || !gatewayId) {
         alert("Por favor, preencha o nome, selecione um produto e um gateway.");
         return;
      }

      try {
         setLoading(true);
         const checkoutData = {
            name,
            active,
            product_id: productId,
            gateway_id: gatewayId,
            domain_id: domainId || undefined,
            custom_url_slug: slug || (isNew ? `chk-${Date.now()}` : id!),
            order_bump_ids: orderBumpIds,
            upsell_product_id: upsellProductId || undefined,
            config,
            offer_id: undefined // Legacy field, not used in current implementation
         };

         if (isNew) {
            await storage.createCheckout({
               id: checkoutId, // Use the pre-generated ID
               ...checkoutData
            });
         } else {
            await storage.updateCheckout({
               id: id!,
               ...checkoutData
            });
         }
         navigate('/admin/checkouts');
      } catch (error) {
         console.error('Error saving checkout:', error);
         alert('Erro ao salvar checkout.');
      } finally {
         setLoading(false);
      }
   };

   const toggleBump = (pid: string) => {
      if (orderBumpIds.includes(pid)) {
         setOrderBumpIds(orderBumpIds.filter(i => i !== pid));
      } else {
         setOrderBumpIds([...orderBumpIds, pid]);
      }
   };

   // Image upload
   const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
         try {
            setIsUploadingBanner(true);
            // Pass checkoutId to upload function
            const url = await storage.uploadCheckoutBanner(e.target.files[0], checkoutId);
            setConfig({ ...config, header_image: url });
         } catch (error) {
            console.error('Error uploading banner:', error);
            alert('Erro ao fazer upload da imagem. Tente novamente.');
         } finally {
            setIsUploadingBanner(false);
         }
      }
   };

   // Helper to get gateway logo
   const getGatewayLogo = (provider: string) => {
      switch (provider) {
         case GatewayProvider.MERCADO_PAGO:
            return "https://logospng.org/download/mercado-pago/logo-mercado-pago-icone-1024.png";
         case GatewayProvider.STRIPE:
            return "https://upload.wikimedia.org/wikipedia/commons/thumb/b/ba/Stripe_Logo%2C_revised_2016.svg/2560px-Stripe_Logo%2C_revised_2016.svg.png";
         default:
            return "";
      }
   };

   return (
      <Layout>
         {loading ? (
            <div className="flex items-center justify-center min-h-[60vh]">
               <div className="flex flex-col items-center gap-4">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <p className="text-gray-400 text-sm">Carregando editor...</p>
               </div>
            </div>
         ) : (
            <>
               {/* Header */}
               <div className="sticky top-0 z-30 bg-gray-50/80 dark:bg-[#05050A]/80 backdrop-blur-md py-4 border-b border-gray-200 dark:border-white/5 mb-8 -mx-4 px-8 lg:-mx-8">
                  <div className="max-w-[1200px] mx-auto flex items-center justify-between">
                     <div className="flex items-center gap-4">
                        <button onClick={() => navigate('/admin/checkouts')} className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors">
                           <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                           <h1 className="text-xl font-bold text-white">
                              {isNew ? 'Novo Checkout' : 'Editar Checkout'}
                           </h1>
                           <p className="text-xs text-gray-400">
                              {isNew ? 'Configure seu novo link de pagamento.' : `Editando: ${name}`}
                           </p>
                        </div>
                     </div>
                     <div className="flex items-center gap-3">
                        <Button variant="ghost" onClick={() => navigate('/admin/checkouts')}>Cancelar</Button>
                        <Button onClick={handleSave}>
                           <Save className="w-4 h-4" /> {isNew ? 'Criar Checkout' : 'Atualizar'}
                        </Button>
                     </div>
                  </div>
               </div>

               <div className="max-w-[1000px] mx-auto space-y-8 pb-20">

                  {/* 1. Identificação & URL */}
                  <section className="space-y-4">
                     <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <span className="bg-primary/20 w-6 h-6 rounded flex items-center justify-center text-xs text-primary">1</span>
                        Identificação & URL
                     </h2>
                     <Card>
                        <div className="space-y-6">
                           {/* Nome */}
                           <div>
                              <label className="block text-sm font-medium text-gray-300 mb-1.5">Nome do Checkout (Interno)</label>
                              <input
                                 type="text"
                                 className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-primary/50 outline-none"
                                 placeholder="Ex: Oferta Black Friday"
                                 value={name}
                                 onChange={e => setName(e.target.value)}
                              />
                           </div>

                           {/* Dominio e Slug */}
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div>
                                 <label className="block text-sm font-medium text-gray-300 mb-1.5">Domínio</label>
                                 <div className="relative">
                                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                    <select
                                       className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-primary/50 outline-none appearance-none"
                                       value={domainId}
                                       onChange={e => setDomainId(e.target.value)}
                                    >
                                       <option value="">supercheckout.app (Padrão)</option>
                                       {domains.filter(d => d.status === DomainStatus.ACTIVE).map(d => (
                                          <option key={d.id} value={d.id}>{d.domain}</option>
                                       ))}
                                    </select>
                                 </div>
                              </div>
                              <div>
                                 <label className="block text-sm font-medium text-gray-300 mb-1.5">Slug (URL)</label>
                                 <div className="flex">
                                    <span className="bg-white/5 border border-r-0 border-white/10 rounded-l-xl px-3 flex items-center text-gray-500 text-xs truncate max-w-[100px]">
                                       /{domainId ? '' : 'c/'}
                                    </span>
                                    <input
                                       type="text"
                                       className="w-full bg-black/20 border border-white/10 rounded-r-xl px-4 py-3 text-white focus:ring-2 focus:ring-primary/50 outline-none"
                                       placeholder="promocao-especial"
                                       value={slug}
                                       onChange={e => setSlug(e.target.value)}
                                    />
                                 </div>
                              </div>
                           </div>
                        </div>
                     </Card>
                  </section>

                  {/* 2. Produto Principal */}
                  <section className="space-y-4">
                     <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <span className="bg-primary/20 w-6 h-6 rounded flex items-center justify-center text-xs text-primary">2</span>
                        Produto Principal
                     </h2>
                     <Card>
                        <label className="block text-sm font-medium text-gray-300 mb-3">Selecione o produto que será vendido</label>

                        {activeProducts.length === 0 ? (
                           <div className="text-center py-8 border border-dashed border-white/10 rounded-xl bg-white/5">
                              <ShoppingBag className="w-10 h-10 text-gray-500 mx-auto mb-2" />
                              <p className="text-gray-400">Nenhum produto ativo encontrado.</p>
                              <Button variant="ghost" size="sm" className="mt-2" onClick={() => navigate('/admin/products')}>Criar Produto</Button>
                           </div>
                        ) : (
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[280px] overflow-y-auto custom-scrollbar pr-2">
                              {activeProducts.map(prod => (
                                 <label
                                    key={prod.id}
                                    className={`cursor-pointer border rounded-xl p-3 flex items-center gap-3 transition-all duration-200 ${productId === prod.id
                                       ? 'bg-primary/10 border-primary/50 shadow-[0_0_15px_rgba(138,43,226,0.1)]'
                                       : 'bg-white/5 border-white/5 hover:border-white/20 hover:bg-white/10'
                                       }`}
                                 >
                                    <input
                                       type="radio"
                                       name="product"
                                       className="hidden"
                                       checked={productId === prod.id}
                                       onChange={() => setProductId(prod.id)}
                                    />
                                    <div className="w-14 h-14 rounded-lg bg-white/10 flex-shrink-0 overflow-hidden">
                                       {prod.imageUrl ? (
                                          <img src={prod.imageUrl} className="w-full h-full object-cover" />
                                       ) : (
                                          <ShoppingBag className="w-full h-full p-3 text-gray-500" />
                                       )}
                                    </div>
                                    <div className="flex-1">
                                       <p className="font-bold text-white text-sm line-clamp-1">{prod.name}</p>
                                       <div className="flex items-center gap-2 mt-1">
                                          <span className="text-primary-light text-xs font-bold bg-primary/10 px-1.5 py-0.5 rounded">
                                             R$ {prod.price_real?.toFixed(2)}
                                          </span>
                                          {prod.price_fake && (
                                             <span className="text-gray-500 text-[10px] line-through">
                                                R$ {prod.price_fake.toFixed(2)}
                                             </span>
                                          )}
                                       </div>
                                    </div>
                                    {productId === prod.id && (
                                       <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                                          <Check className="w-4 h-4 text-white" />
                                       </div>
                                    )}
                                 </label>
                              ))}
                           </div>
                        )}
                     </Card>
                  </section>

                  {/* 3. Gateway de Pagamento */}
                  <section className="space-y-4">
                     <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <span className="bg-primary/20 w-6 h-6 rounded flex items-center justify-center text-xs text-primary">3</span>
                        Processador de Pagamento
                     </h2>
                     <Card>
                        <label className="block text-sm font-medium text-gray-300 mb-4">Escolha a conta bancária para processar as vendas</label>

                        {gateways.filter(g => g.active).length === 0 ? (
                           <div className="text-center py-8 border border-dashed border-white/10 rounded-xl bg-white/5">
                              <Wallet className="w-10 h-10 text-gray-500 mx-auto mb-2" />
                              <p className="text-gray-400">Nenhum gateway ativo configurado.</p>
                              <Button variant="ghost" size="sm" className="mt-2" onClick={() => navigate('/admin/gateways')}>Configurar Gateway</Button>
                           </div>
                        ) : (
                           <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                              {gateways.filter(g => g.active).map(g => (
                                 <button
                                    key={g.id}
                                    onClick={() => setGatewayId(g.id)}
                                    className={`relative group flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all duration-200 h-32 ${gatewayId === g.id
                                       ? 'border-green-500 bg-green-500/10 shadow-[0_0_15px_rgba(34,197,94,0.2)]'
                                       : 'border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20'
                                       }`}
                                 >
                                    <div className="w-12 h-12 mb-3 flex items-center justify-center">
                                       <img src={getGatewayLogo(g.name)} alt={g.name} className="w-full h-full object-contain brightness-0 invert" />
                                    </div>
                                    <span className={`text-xs font-bold uppercase tracking-wide ${gatewayId === g.id ? 'text-green-400' : 'text-gray-400'}`}>
                                       {g.name.replace('_', ' ')}
                                    </span>

                                    {gatewayId === g.id && (
                                       <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                                          <Check className="w-3 h-3 text-white" />
                                       </div>
                                    )}
                                 </button>
                              ))}
                           </div>
                        )}
                     </Card>
                  </section>

                  {/* 4. Order Bumps */}
                  <section className="space-y-4">
                     <div className="flex items-center justify-between">
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                           <span className="bg-primary/20 w-6 h-6 rounded flex items-center justify-center text-xs text-primary">4</span>
                           Order Bumps
                        </h2>
                     </div>

                     <Card>
                        {availableBumps.length === 0 ? (
                           <div className="text-center py-6 text-gray-500">
                              <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                              <p className="text-sm">Nenhum outro produto ativo marcado como "Order Bump".</p>
                           </div>
                        ) : (
                           <div className="space-y-3">
                              <p className="text-sm text-gray-400 mb-2">Selecione os produtos complementares:</p>
                              {availableBumps.map(prod => (
                                 <label
                                    key={prod.id}
                                    className={`cursor-pointer border rounded-xl p-3 flex items-center gap-3 transition-all ${orderBumpIds.includes(prod.id)
                                       ? 'bg-orange-500/10 border-orange-500/50'
                                       : 'bg-white/5 border-white/5 hover:bg-white/10'
                                       }`}
                                 >
                                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${orderBumpIds.includes(prod.id) ? 'bg-orange-500 border-orange-500' : 'border-gray-500'
                                       }`}>
                                       {orderBumpIds.includes(prod.id) && <Check className="w-3 h-3 text-white" />}
                                    </div>
                                    <input
                                       type="checkbox"
                                       className="hidden"
                                       checked={orderBumpIds.includes(prod.id)}
                                       onChange={() => toggleBump(prod.id)}
                                    />
                                    <div className="w-10 h-10 rounded bg-white/10 flex-shrink-0 overflow-hidden">
                                       {prod.imageUrl && <img src={prod.imageUrl} className="w-full h-full object-cover" />}
                                    </div>
                                    <div>
                                       <p className="font-bold text-white text-sm">{prod.name}</p>
                                       <p className="text-xs text-gray-400">R$ {prod.price_real?.toFixed(2)}</p>
                                    </div>
                                 </label>
                              ))}
                           </div>
                        )}
                     </Card>
                  </section>

                  {/* 5. Upsell Pós-Compra */}
                  <section className="space-y-4">
                     <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <span className="bg-primary/20 w-6 h-6 rounded flex items-center justify-center text-xs text-primary">5</span>
                        Upsell Pós-Compra (One Click)
                     </h2>
                     <Card>
                        <div className="flex items-center gap-4 mb-4">
                           <Layers className="w-5 h-5 text-blue-500" />
                           <p className="text-sm text-gray-300">Oferta apresentada imediatamente após o pagamento aprovado.</p>
                        </div>
                        <select
                           className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-primary/50 outline-none appearance-none"
                           value={upsellProductId}
                           onChange={e => setUpsellProductId(e.target.value)}
                        >
                           <option value="">-- Nenhum Upsell --</option>
                           {availableUpsells.map(prod => (
                              <option key={prod.id} value={prod.id}>{prod.name} (R$ {prod.price_real?.toFixed(2)})</option>
                           ))}
                        </select>
                        {availableUpsells.length === 0 && (
                           <p className="text-[10px] text-orange-400 mt-2">
                              Dica: Marque produtos ativos como "Upsell" na tela de produtos para habilitar aqui.
                           </p>
                        )}
                     </Card>
                  </section>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     {/* 6. Campos do Formulário */}
                     <section className="space-y-4">
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                           <span className="bg-primary/20 w-6 h-6 rounded flex items-center justify-center text-xs text-primary">6</span>
                           Campos do Formulário
                        </h2>
                        <Card>
                           <div className="space-y-4">
                              {[
                                 { id: 'name', label: 'Nome Completo' },
                                 { id: 'email', label: 'E-mail' },
                                 { id: 'phone', label: 'WhatsApp / Telefone' },
                                 { id: 'cpf', label: 'CPF / Documento' }
                              ].map(field => (
                                 <div key={field.id} className="flex items-center justify-between">
                                    <span className="text-sm text-gray-300">{field.label}</span>
                                    <button
                                       onClick={() => setConfig({
                                          ...config,
                                          fields: { ...config.fields, [field.id]: !config.fields[field.id as keyof typeof config.fields] }
                                       })}
                                       className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${config.fields[field.id as keyof typeof config.fields] ? 'bg-green-500' : 'bg-white/10'
                                          }`}
                                    >
                                       <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${config.fields[field.id as keyof typeof config.fields] ? 'translate-x-6' : 'translate-x-1'
                                          }`} />
                                    </button>
                                 </div>
                              ))}
                           </div>
                        </Card>
                     </section>

                     {/* 7. Métodos de Pagamento */}
                     <section className="space-y-4">
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                           <span className="bg-primary/20 w-6 h-6 rounded flex items-center justify-center text-xs text-primary">7</span>
                           Formas de Pagamento Visíveis
                        </h2>
                        <Card>
                           <div className="space-y-4">
                              {[
                                 { id: 'pix', label: 'Pix (QR Code)' },
                                 { id: 'credit_card', label: 'Cartão de Crédito' },
                                 { id: 'boleto', label: 'Boleto Bancário' }
                              ].map(method => (
                                 <div key={method.id} className="flex items-center justify-between">
                                    <span className="text-sm text-gray-300">{method.label}</span>
                                    <button
                                       onClick={() => setConfig({
                                          ...config,
                                          payment_methods: { ...config.payment_methods, [method.id]: !config.payment_methods[method.id as keyof typeof config.payment_methods] }
                                       })}
                                       className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${config.payment_methods[method.id as keyof typeof config.payment_methods] ? 'bg-green-500' : 'bg-white/10'
                                          }`}
                                    >
                                       <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${config.payment_methods[method.id as keyof typeof config.payment_methods] ? 'translate-x-6' : 'translate-x-1'
                                          }`} />
                                    </button>
                                 </div>
                              ))}
                           </div>
                        </Card>
                     </section>
                  </div>

                  {/* 8. Design e Timer */}
                  <section className="space-y-4">
                     <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <span className="bg-primary/20 w-6 h-6 rounded flex items-center justify-center text-xs text-primary">8</span>
                        Design e Escassez
                     </h2>
                     <Card>
                        <div className="space-y-6">
                           {/* Header Image */}
                           <div>
                              <label className="block text-sm font-medium text-gray-300 mb-2">Imagem de Cabeçalho (Banner)</label>
                              <div className="flex gap-3">
                                 <input
                                    type="text"
                                    className="flex-1 bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                                    placeholder="Cole a URL ou faça upload..."
                                    value={config.header_image || ''}
                                    onChange={e => setConfig({ ...config, header_image: e.target.value })}
                                 />
                                 <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                 />
                                 <Button
                                    variant="secondary"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="whitespace-nowrap"
                                    disabled={isUploadingBanner}
                                 >
                                    {isUploadingBanner ? (
                                       <>
                                          <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                                          Enviando...
                                       </>
                                    ) : (
                                       <>
                                          <Upload className="w-4 h-4" /> Upload
                                       </>
                                    )}
                                 </Button>
                              </div>
                              {config.header_image && (
                                 <div className="mt-3 w-full h-32 rounded-lg overflow-hidden border border-white/10 relative group">
                                    <img src={config.header_image} className="w-full h-full object-cover" alt="Banner Preview" />
                                    <button
                                       onClick={() => setConfig({ ...config, header_image: '' })}
                                       className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                       <div className="w-4 h-4 flex items-center justify-center">✕</div>
                                    </button>
                                 </div>
                              )}
                           </div>

                           <div className="h-px bg-white/5"></div>

                           {/* Timer */}
                           <div>
                              <div className="flex items-center justify-between mb-4">
                                 <label className="block text-sm font-medium text-white flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-red-400" /> Timer de Escassez
                                 </label>
                                 <button
                                    onClick={() => setConfig({
                                       ...config,
                                       timer: { ...config.timer, active: !config.timer.active }
                                    })}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${config.timer.active ? 'bg-red-500' : 'bg-white/10'
                                       }`}
                                 >
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${config.timer.active ? 'translate-x-6' : 'translate-x-1'
                                       }`} />
                                 </button>
                              </div>

                              {config.timer.active && (
                                 <div className="grid grid-cols-2 gap-4 bg-white/5 p-4 rounded-xl animate-in fade-in duration-300">
                                    <div>
                                       <label className="text-xs text-gray-400 block mb-1">Tempo (minutos)</label>
                                       <input
                                          type="number"
                                          className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                                          value={config.timer.minutes}
                                          onChange={e => setConfig({ ...config, timer: { ...config.timer, minutes: parseInt(e.target.value) } })}
                                       />
                                    </div>
                                    <div>
                                       <label className="text-xs text-gray-400 block mb-1">Cor de Fundo</label>
                                       <div className="flex items-center gap-2">
                                          <input
                                             type="color"
                                             className="h-9 w-9 rounded cursor-pointer border-none bg-transparent"
                                             value={config.timer.bg_color}
                                             onChange={e => setConfig({ ...config, timer: { ...config.timer, bg_color: e.target.value } })}
                                          />
                                          <span className="text-xs text-gray-500">{config.timer.bg_color}</span>
                                       </div>
                                    </div>
                                 </div>
                              )}
                           </div>
                        </div>
                     </Card>
                  </section>

                  {/* 9. Status */}
                  <section className="space-y-4">
                     <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <span className="bg-primary/20 w-6 h-6 rounded flex items-center justify-center text-xs text-primary">9</span>
                        Status do Checkout
                     </h2>
                     <Card className="flex items-center justify-between">
                        <div>
                           <p className="text-sm font-bold text-white">Checkout Ativo</p>
                           <p className="text-xs text-gray-400">Se desativado, a página pública mostrará erro.</p>
                        </div>
                        <button
                           onClick={() => setActive(!active)}
                           className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${active ? 'bg-green-500' : 'bg-white/10'
                              }`}
                        >
                           <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${active ? 'translate-x-6' : 'translate-x-1'
                              }`} />
                        </button>
                     </Card>
                  </section>

                  {/* Footer Actions */}
                  <div className="flex justify-end gap-4 pt-6 border-t border-white/5">
                     <Button variant="ghost" onClick={() => navigate('/admin/checkouts')}>Cancelar</Button>
                     <Button onClick={handleSave} size="lg">
                        <Save className="w-4 h-4" /> {isNew ? 'Publicar Checkout' : 'Salvar Alterações'}
                     </Button>
                  </div>

               </div>
            </>
         )}
      </Layout>
   );
};
