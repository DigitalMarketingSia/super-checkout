import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { storage } from '../../services/storageService';
import { Checkout, Product, Gateway, Order, OrderStatus, OrderItem } from '../../types';
import {
   CreditCard,
   QrCode,
   Barcode,
   Check,
   Clock,
   ShieldCheck,
   Lock,
   AlertCircle,
   ShoppingBag
} from 'lucide-react';
import { validateName, validateEmail, validatePhone, validateCPF, maskPhone, maskCPF } from '../../utils/validations';
import { PhoneInput } from '../../components/ui/PhoneInput';

type PaymentMethod = 'credit_card' | 'pix' | 'boleto';

export const PublicCheckout = ({ checkoutId: propId }: { checkoutId?: string }) => {
   const { id: paramId } = useParams<{ id: string }>();
   const id = propId || paramId;
   const navigate = useNavigate();

   // Data State
   const [loading, setLoading] = useState(true);
   const [data, setData] = useState<{
      checkout: Checkout;
      product: Product;
      gateway: Gateway;
      bumps: Product[];
   } | null>(null);
   const [error, setError] = useState<string | null>(null);

   // Interaction State
   const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
   const [selectedBumps, setSelectedBumps] = useState<string[]>([]);
   const [timeLeft, setTimeLeft] = useState({ minutes: 15, seconds: 0 });
   const [cardFlipped, setCardFlipped] = useState(false);
   const [isProcessing, setIsProcessing] = useState(false);
   const [formErrors, setFormErrors] = useState<Record<string, boolean>>({});

   // Form State
   const [customer, setCustomer] = useState({
      name: '',
      email: '',
      cpf: '',
      phone: '',
      cardNumber: '',
      expiry: '',
      installments: '1',
      cvc: ''
   });

   // Validation State
   const [touched, setTouched] = useState<Record<string, boolean>>({});
   const [errors, setErrors] = useState<Record<string, string>>({});

   // Load Data
   useEffect(() => {
      const load = async () => {
         try {
            const checkouts = await storage.getCheckouts();
            // Find by ID or Slug
            const checkout = checkouts.find(c => c.id === id || c.custom_url_slug === id);

            if (!checkout) {
               setError("Checkout não encontrado.");
               setLoading(false);
               return;
            }

            if (!checkout.active) {
               setError("Este checkout está inativo no momento.");
               setLoading(false);
               return;
            }

            const products = await storage.getProducts();
            const mainProduct = products.find(p => p.id === checkout.product_id);

            const gateways = await storage.getGateways();
            const gateway = gateways.find(g => g.id === checkout.gateway_id);

            if (!mainProduct || !gateway) {
               setError("Configuração inválida de produto ou gateway.");
               setLoading(false);
               return;
            }

            // Resolve Bumps
            const resolvedBumps = checkout.order_bump_ids
               ? products.filter(p => checkout.order_bump_ids.includes(p.id))
               : [];

            setData({ checkout, product: mainProduct, gateway, bumps: resolvedBumps });

            // Initialize Timer from Config
            if (checkout.config?.timer?.active) {
               setTimeLeft({ minutes: checkout.config.timer.minutes, seconds: 0 });
            }

            setLoading(false);
         } catch (err: any) {
            setError(err.message);
            setLoading(false);
         }
      };
      load();
   }, [id]);

   // Timer Logic
   useEffect(() => {
      if (!data?.checkout?.config?.timer?.active) return;

      const timer = setInterval(() => {
         setTimeLeft(prev => {
            if (prev.seconds === 0) {
               if (prev.minutes === 0) return prev;
               return { minutes: prev.minutes - 1, seconds: 59 };
            }
            return { ...prev, seconds: prev.seconds - 1 };
         });
      }, 1000);
      return () => clearInterval(timer);
   }, [data]);

   // Validation Helper
   const validateField = (name: string, value: string) => {
      let error = '';
      switch (name) {
         case 'name':
            if (!validateName(value)) error = 'Digite seu nome completo (mínimo 2 palavras)';
            break;
         case 'email':
            if (!validateEmail(value)) error = 'Digite um e-mail válido';
            break;
         case 'phone':
            if (!validatePhone(value)) error = 'Número de WhatsApp inválido';
            break;
         case 'cpf':
            if (!validateCPF(value)) error = 'CPF inválido';
            break;
      }
      return error;
   };

   const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      const { name, value } = e.target;
      setTouched(prev => ({ ...prev, [name]: true }));
      const error = validateField(name, value);
      setErrors(prev => ({ ...prev, [name]: error }));
   };

   const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value } = e.target;
      let newValue = value;

      // Apply Masks
      // Phone mask is now handled by PhoneInput component
      if (name === 'cpf') newValue = maskCPF(value);

      setCustomer(prev => ({ ...prev, [name]: newValue }));

      // Real-time validation if touched
      if (touched[name]) {
         const error = validateField(name, newValue);
         setErrors(prev => ({ ...prev, [name]: error }));
      } else {
         // Clear error if user starts typing again (optional UX choice, or wait for blur)
         // For this request: "Enquanto ele digita (onChange)" -> we should validate immediately if touched
         // If not touched, we can wait, OR validate immediately to show success state?
         // Let's validate immediately to enable "Success" state logic
         const error = validateField(name, newValue);
         setErrors(prev => ({ ...prev, [name]: error }));
      }
   };

   const isFormValid = () => {
      if (!data) return false; // Ensure data is loaded before validating

      const requiredFields = [];
      if (config.fields.name) requiredFields.push('name');
      if (config.fields.email) requiredFields.push('email');
      if (config.fields.phone) requiredFields.push('phone');
      if (config.fields.cpf) requiredFields.push('cpf');

      for (const field of requiredFields) {
         // @ts-ignore
         if (!customer[field] || validateField(field, customer[field])) return false;
      }
      return true;
   };

   const toggleBump = (bumpId: string) => {
      setSelectedBumps(prev =>
         prev.includes(bumpId) ? prev.filter(id => id !== bumpId) : [...prev, bumpId]
      );
   };

   const calculateTotal = () => {
      if (!data) return 0;
      let total = data.product.price_real || 0;
      selectedBumps.forEach(bumpId => {
         const bump = data.bumps.find(b => b.id === bumpId);
         if (bump) total += (bump.price_real || 0);
      });
      return total;
   };

   const handleSubmit = async () => {
      if (!paymentMethod || !data) return;

      // Validate All
      const newErrors: Record<string, string> = {};
      const newTouched: Record<string, boolean> = {};

      if (config.fields.name) {
         newTouched.name = true;
         const err = validateField('name', customer.name);
         if (err) newErrors.name = err;
      }
      if (config.fields.email) {
         newTouched.email = true;
         const err = validateField('email', customer.email);
         if (err) newErrors.email = err;
      }
      if (config.fields.phone) {
         newTouched.phone = true;
         const err = validateField('phone', customer.phone);
         if (err) newErrors.phone = err;
      }
      if (config.fields.cpf) {
         newTouched.cpf = true;
         const err = validateField('cpf', customer.cpf);
         if (err) newErrors.cpf = err;
      }

      setTouched(prev => ({ ...prev, ...newTouched }));
      setErrors(newErrors);

      if (Object.keys(newErrors).length > 0) {
         // Scroll to first error
         const firstErrorField = Object.keys(newErrors)[0];
         const element = document.getElementById(`input-${firstErrorField}`);
         element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
         element?.focus();
         return;
      }

      // Validate Credit Card Fields if selected
      if (paymentMethod === 'credit_card') {
         const cardErrors: Record<string, string> = {};

         const cleanCardNumber = customer.cardNumber.replace(/\D/g, '');
         if (!cleanCardNumber || cleanCardNumber.length < 13) {
            cardErrors.cardNumber = 'Número do cartão inválido';
            alert('Por favor, verifique o número do cartão.');
            return;
         }

         if (!customer.expiry || !customer.expiry.includes('/')) {
            cardErrors.expiry = 'Validade inválida (use MM/AA)';
            alert('Por favor, preencha a validade do cartão (MM/AA).');
            return;
         }

         const [month, year] = customer.expiry.split('/');
         if (!month || !year || parseInt(month) < 1 || parseInt(month) > 12 || year.length !== 2) {
            cardErrors.expiry = 'Data de validade inválida';
            alert('Data de validade inválida.');
            return;
         }

         if (!customer.cvc || customer.cvc.length < 3) {
            cardErrors.cvc = 'CVC inválido';
            alert('Por favor, verifique o código de segurança (CVC).');
            return;
         }
      }

      setIsProcessing(true);

      try {
         const totalAmount = calculateTotal();

         // Build items array
         const items: OrderItem[] = [
            { name: data.product.name, price: data.product.price_real || 0, quantity: 1, type: 'main' }
         ];

         selectedBumps.forEach(bumpId => {
            const bump = data.bumps.find(b => b.id === bumpId);
            if (bump) {
               items.push({ name: bump.name, price: bump.price_real || 0, quantity: 1, type: 'bump' });
            }
         });

         // ✅ CALL PAYMENT SERVICE (TRANSPARENT CHECKOUT)
         const { paymentService } = await import('../../services/paymentService');

         const result = await paymentService.processPayment({
            checkoutId: data.checkout.id,
            offerId: data.checkout.offer_id || 'direct',
            amount: totalAmount,
            customerName: customer.name || 'Cliente',
            customerEmail: customer.email || 'cliente@email.com',
            customerPhone: customer.phone,
            customerCpf: customer.cpf,
            gatewayId: data.gateway.id,
            paymentMethod: paymentMethod,
            items: items,
            // Pass Card Data if Credit Card
            cardData: paymentMethod === 'credit_card' ? {
               number: customer.cardNumber,
               holderName: customer.name, // Assuming name field is holder name
               expiryMonth: customer.expiry.split('/')[0],
               expiryYear: customer.expiry.split('/')[1],
               cvc: customer.cvc
            } : undefined
         });

         if (result.success) {
            // Handle Success Types
            if (paymentMethod === 'pix' && result.pixData) {
               // Navigate to Pix Page with QR Code Data
               navigate(`/pagamento/pix/${result.orderId}`, {
                  state: {
                     pixData: {
                        qr_code: result.pixData.qr_code,
                        transaction_amount: totalAmount
                     },
                     orderData: {
                        items: items,
                        totalAmount: totalAmount,
                        customer: {
                           name: customer.name,
                           email: customer.email
                        }
                     }
                  }
               });
            } else if (paymentMethod === 'boleto' && result.boletoData) {
               // Navigate to Boleto Page (or Thank You with link)
               window.location.href = result.boletoData.url; // Simple redirect for boleto for now
            } else {
               // Credit Card Success -> Thank You Page
               navigate(`/thank-you/${result.orderId}`);
            }
         } else {
            alert('Erro no pagamento: ' + (result.message || 'Transação recusada'));
            setIsProcessing(false);
         }

      } catch (error: any) {
         console.error('Payment error:', error);
         alert('Erro ao processar pagamento. Verifique os dados e tente novamente.');
         setIsProcessing(false);
      }
   };

   // Input Render Helper
   const renderInput = (field: 'name' | 'email' | 'phone' | 'cpf', placeholder: string, type: string = 'text') => {
      const hasError = touched[field] && errors[field];
      const isValid = touched[field] && !errors[field] && customer[field];

      return (
         <div className="space-y-1">
            <div className="relative">
               {field === 'phone' ? (
                  <PhoneInput
                     name={field}
                     value={customer[field as keyof typeof customer]}
                     onChange={handleChange}
                     onBlur={handleBlur}
                     error={!!hasError}
                     isValid={!!isValid}
                     placeholder={placeholder}
                  />
               ) : (
                  <input
                     id={`input-${field}`}
                     type={type}
                     name={field}
                     placeholder={placeholder}
                     value={customer[field as keyof typeof customer]}
                     onChange={handleChange}
                     onBlur={handleBlur}
                     className={`w-full pl-4 pr-10 py-3 rounded-lg border bg-white focus:ring-2 focus:ring-opacity-50 transition-all outline-none ${hasError
                        ? 'border-red-400 focus:border-red-500 focus:ring-red-200'
                        : isValid
                           ? 'border-green-400 focus:border-green-500 focus:ring-green-200'
                           : 'border-gray-200 focus:border-[#10B981] focus:ring-[#10B981]/20'
                        }`}
                  />
               )}

               {/* Icons - Positioned absolutely over the input */}
               {hasError && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500 animate-pulse pointer-events-none">
                     <AlertCircle className="w-5 h-5" />
                  </div>
               )}
               {isValid && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500 animate-in zoom-in pointer-events-none">
                     <Check className="w-5 h-5" />
                  </div>
               )}
            </div>
            {hasError && (
               <p className="text-xs text-red-500 flex items-center gap-1 animate-in slide-in-from-top-1">
                  {errors[field]}
               </p>
            )}
         </div>
      );
   };

   if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#f9fafb]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#10B981]"></div></div>;
   if (error || !data) return <div className="min-h-screen flex items-center justify-center bg-[#f9fafb] text-gray-500">{error}</div>;

   const totalAmount = calculateTotal();
   const config = data.checkout.config || { fields: { name: true, email: true, phone: true, cpf: true }, payment_methods: { pix: true, credit_card: true, boleto: true }, timer: { active: false, minutes: 0, bg_color: '', text_color: '' } };

   return (
      <div className="checkout-padrao-container min-h-screen bg-[#f9fafb] font-sans text-gray-800 pb-12">

         {/* TIMER DE ESCASSEZ */}
         {config.timer?.active && (
            <div
               className="sticky top-0 z-50 py-3 shadow-lg transition-colors"
               style={{ backgroundColor: config.timer.bg_color, color: config.timer.text_color }}
            >
               <div className="max-w-2xl mx-auto px-4 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-medium opacity-90">
                     <Clock className="w-4 h-4" />
                     <span className="hidden sm:inline">A oferta expira em:</span>
                     <span className="sm:hidden">Expira em:</span>
                  </div>
                  <div className="flex gap-2 text-gray-900">
                     <div className="time-box flex flex-col items-center bg-white rounded px-2 py-0.5 min-w-[36px]">
                        <span className="time-number font-bold text-sm">00</span>
                        <span className="time-label text-[8px] uppercase text-gray-500">Hrs</span>
                     </div>
                     <div className="time-box flex flex-col items-center bg-white rounded px-2 py-0.5 min-w-[36px]">
                        <span className="time-number font-bold text-sm">{timeLeft.minutes.toString().padStart(2, '0')}</span>
                        <span className="time-label text-[8px] uppercase text-gray-500">Min</span>
                     </div>
                     <div className="time-box flex flex-col items-center bg-white rounded px-2 py-0.5 min-w-[36px]">
                        <span className="time-number font-bold text-sm">{timeLeft.seconds.toString().padStart(2, '0')}</span>
                        <span className="time-label text-[8px] uppercase text-gray-500">Seg</span>
                     </div>
                  </div>
               </div>
            </div>
         )}

         <div className="max-w-2xl mx-auto px-4 mt-6 space-y-6">

            {/* HEADER IMAGE */}
            {config.header_image && (
               <div className="w-full h-[150px] sm:h-[200px] rounded-2xl overflow-hidden shadow-sm">
                  <img src={config.header_image} alt="Header" className="w-full h-full object-cover" />
               </div>
            )}

            {/* CARD DO PRODUTO */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
               <div className="w-20 h-20 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden">
                  {data.product.imageUrl ? (
                     <img src={data.product.imageUrl} className="w-full h-full object-cover" />
                  ) : (
                     <ShoppingBag className="w-full h-full p-4 text-gray-400" />
                  )}
               </div>
               <div className="flex-1">
                  <h3 className="font-bold text-gray-900 leading-tight">{data.product.name}</h3>
                  {data.product.price_fake && (
                     <p className="text-xs text-gray-500 mt-1">De <span className="line-through">R$ {data.product.price_fake.toFixed(2)}</span> por apenas</p>
                  )}
                  <p className="text-lg font-bold text-[#10B981]">R$ {data.product.price_real?.toFixed(2)}</p>
               </div>
            </div>

            {/* FORMULÁRIO DO CLIENTE - CONDICIONAL AOS CAMPOS */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
               <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-[#10B981] text-white flex items-center justify-center text-xs">1</div>
                  Dados Pessoais
               </h3>

               {config.fields.name && renderInput('name', 'Nome Completo')}
               {config.fields.email && renderInput('email', 'Seu melhor E-mail', 'email')}

               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {config.fields.cpf && renderInput('cpf', 'CPF/CNPJ')}
                  {config.fields.phone && renderInput('phone', 'DDD + Celular', 'tel')}
               </div>
            </div>

            {/* FORMAS DE PAGAMENTO - CONDICIONAL */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
               <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-4">
                  <span className="bg-gray-900 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">2</span>
                  Pagamento
               </h3>

               <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                  {config.payment_methods?.credit_card && (
                     <button
                        onClick={() => setPaymentMethod('credit_card')}
                        className={`relative flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${paymentMethod === 'credit_card'
                           ? 'bg-[#F0FDF4] border-[#10B981] text-[#10B981]'
                           : 'bg-gray-100 border-transparent text-gray-600 hover:bg-gray-200'
                           }`}
                     >
                        {paymentMethod === 'credit_card' && (
                           <div className="absolute -top-0.5 -right-0.5 bg-[#10B981] text-white rounded-bl-lg rounded-tr-lg p-0.5 shadow-sm animate-in zoom-in">
                              <Check size={12} strokeWidth={3} />
                           </div>
                        )}
                        <CreditCard className="w-5 h-5" />
                        <span className="text-sm font-bold">Cartão de Crédito</span>
                     </button>
                  )}

                  {config.payment_methods?.pix && (
                     <button
                        onClick={() => setPaymentMethod('pix')}
                        className={`relative flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${paymentMethod === 'pix'
                           ? 'bg-[#F0FDF4] border-[#10B981] text-[#10B981]'
                           : 'bg-gray-100 border-transparent text-gray-600 hover:bg-gray-200'
                           }`}
                     >
                        {paymentMethod === 'pix' && (
                           <div className="absolute -top-0.5 -right-0.5 bg-[#10B981] text-white rounded-bl-lg rounded-tr-lg p-0.5 shadow-sm animate-in zoom-in">
                              <Check size={12} strokeWidth={3} />
                           </div>
                        )}
                        <QrCode className="w-5 h-5" />
                        <span className="text-sm font-bold">Pix</span>
                     </button>
                  )}

                  {config.payment_methods?.boleto && (
                     <button
                        onClick={() => setPaymentMethod('boleto')}
                        className={`relative flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${paymentMethod === 'boleto'
                           ? 'bg-[#F0FDF4] border-[#10B981] text-[#10B981]'
                           : 'bg-gray-100 border-transparent text-gray-600 hover:bg-gray-200'
                           }`}
                     >
                        {paymentMethod === 'boleto' && (
                           <div className="absolute -top-0.5 -right-0.5 bg-[#10B981] text-white rounded-bl-lg rounded-tr-lg p-0.5 shadow-sm animate-in zoom-in">
                              <Check size={12} strokeWidth={3} />
                           </div>
                        )}
                        <Barcode className="w-5 h-5" />
                        <span className="text-sm font-bold">Boleto</span>
                     </button>
                  )}
               </div>

               {/* SEÇÃO CARTÃO */}
               {paymentMethod === 'credit_card' && (
                  <div className="space-y-4 animate-in fade-in duration-300">
                     {/* Card Container - Centered and Constrained */}
                     <div className="w-full max-w-[280px] mx-auto">
                        <div className="perspective-1000 w-full h-[176px] relative cursor-pointer group" onClick={() => setCardFlipped(!cardFlipped)}>
                           <div className={`w-full h-full relative preserve-3d transition-transform duration-700 ${cardFlipped ? 'rotate-y-180' : ''}`} style={{ transformStyle: 'preserve-3d', transform: cardFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}>
                              {/* Front */}
                              <div className="absolute w-full h-full backface-hidden bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl shadow-xl p-4 text-white flex flex-col justify-between z-10" style={{ backfaceVisibility: 'hidden' }}>
                                 <div className="flex justify-between items-start">
                                    <div className="w-10 h-7 bg-yellow-500/80 rounded-md"></div>
                                    <span className="font-mono text-base italic font-bold">VISA</span>
                                 </div>
                                 <div>
                                    <p className="font-mono text-base tracking-widest shadow-black drop-shadow-md">{customer.cardNumber || '0000 0000 0000 0000'}</p>
                                 </div>
                                 <div className="flex justify-between items-end">
                                    <div>
                                       <p className="text-[7px] uppercase text-gray-400">Titular</p>
                                       <p className="font-medium uppercase text-xs tracking-wide">{customer.name || 'NOME DO TITULAR'}</p>
                                    </div>
                                    <div>
                                       <p className="text-[7px] uppercase text-gray-400">Validade</p>
                                       <p className="font-medium text-xs">{customer.expiry || 'MM/AA'}</p>
                                    </div>
                                 </div>
                              </div>
                              {/* Back */}
                              <div className="absolute w-full h-full backface-hidden bg-gray-800 rounded-xl shadow-xl overflow-hidden" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
                                 <div className="w-full h-8 bg-black mt-4"></div>
                                 <div className="p-4">
                                    <div className="bg-white h-6 w-full flex items-center justify-end px-2">
                                       <span className="font-mono text-sm text-gray-900">{customer.cvc || '123'}</span>
                                    </div>
                                 </div>
                              </div>
                           </div>
                        </div>
                     </div>

                     {/* Form Container - Matching Card Width */}
                     <div className="w-full max-w-[280px] mx-auto space-y-3 pt-2">
                        <div>
                           <input
                              type="text"
                              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 outline-none focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/20 transition-all"
                              placeholder="Número do Cartão"
                              value={customer.cardNumber}
                              onChange={e => setCustomer({ ...customer, cardNumber: e.target.value })}
                              onFocus={() => setCardFlipped(false)}
                           />
                        </div>
                        <div className="grid grid-cols-[1fr_80px] gap-3">
                           <input
                              type="text"
                              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 outline-none focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/20 transition-all"
                              placeholder="MM/AA"
                              maxLength={5}
                              value={customer.expiry}
                              onChange={e => {
                                 let value = e.target.value.replace(/\D/g, ''); // Remove non-digits
                                 if (value.length >= 2) {
                                    value = value.slice(0, 2) + '/' + value.slice(2, 4);
                                 }
                                 setCustomer({ ...customer, expiry: value });
                              }}
                              onFocus={() => setCardFlipped(false)}
                           />
                           <input
                              type="text"
                              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 outline-none focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/20 transition-all"
                              placeholder="CVV"
                              maxLength={4}
                              value={customer.cvc}
                              onChange={e => setCustomer({ ...customer, cvc: e.target.value })}
                              onFocus={() => setCardFlipped(true)}
                           />
                        </div>
                        <div>
                           <select
                              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 outline-none focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/20 transition-all bg-white"
                              value={customer.installments}
                              onChange={e => setCustomer({ ...customer, installments: e.target.value })}
                           >
                              <option value="1">1x sem juros</option>
                              <option value="2">2x sem juros</option>
                              <option value="3">3x sem juros</option>
                              <option value="4">4x sem juros</option>
                              <option value="5">5x sem juros</option>
                              <option value="6">6x sem juros</option>
                              <option value="7">7x sem juros</option>
                              <option value="8">8x sem juros</option>
                              <option value="9">9x sem juros</option>
                              <option value="10">10x sem juros</option>
                              <option value="11">11x sem juros</option>
                              <option value="12">12x sem juros</option>
                           </select>
                        </div>
                     </div>
                  </div>
               )}

               {/* SEÇÃO PIX */}
               {paymentMethod === 'pix' && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4 animate-in fade-in duration-300">
                     <div className="flex items-center gap-2 text-green-800 font-bold mb-3">
                        <QrCode className="w-5 h-5" /> Pague com Pix
                     </div>
                     <p className="text-sm text-green-900">Liberação imediata do acesso após o pagamento.</p>
                  </div>
               )}

               {/* SEÇÃO BOLETO */}
               {paymentMethod === 'boleto' && (
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 animate-in fade-in duration-300">
                     <div className="flex items-center gap-2 text-gray-800 font-bold mb-2">
                        <Barcode className="w-5 h-5" /> Informações do Boleto
                     </div>
                     <p className="text-sm text-gray-600">Vencimento em 2 dias úteis.</p>
                  </div>
               )}

               {!paymentMethod && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-center gap-3 text-yellow-800 text-sm animate-pulse">
                     <AlertCircle className="w-5 h-5" />
                     Escolha uma forma de pagamento.
                  </div>
               )}

            </div>

            {/* ORDER BUMPS */}
            {paymentMethod && data.bumps.length > 0 && (
               <div className="space-y-4 animate-in zoom-in-95 duration-300">

                  {/* Header da Seção */}
                  <div className="bg-gradient-to-r from-yellow-400 to-orange-500 px-4 py-2 rounded-xl shadow-sm">
                     <h3 className="text-xs font-bold text-white uppercase tracking-wide text-center flex items-center justify-center gap-2">
                        ⚡ Oportunidade especial agora
                     </h3>
                  </div>

                  {/* Lista de Bumps */}
                  <div className="space-y-4">
                     {data.bumps.map(bump => {
                        const isCreditCard = paymentMethod === 'credit_card';
                        const installments = parseInt(customer.installments) || 1;
                        const price = bump.price_real || 0;

                        let priceValue = '';
                        let suffix = '';

                        if (isCreditCard) {
                           const interest = installments > 1 ? 1.2 : 1;
                           const val = (price * interest) / installments;
                           priceValue = val.toFixed(2);
                           suffix = ' na parcela';
                        } else {
                           priceValue = price.toFixed(2);
                        }

                        return (
                           <div
                              key={bump.id}
                              className={`p-4 rounded-xl border-2 border-dashed transition-all cursor-pointer relative overflow-hidden ${selectedBumps.includes(bump.id)
                                 ? 'border-[#10B981] bg-green-50/50'
                                 : 'border-gray-300 bg-white hover:border-gray-400'
                                 }`}
                              onClick={() => toggleBump(bump.id)}
                           >
                              <div className="flex items-start gap-4 relative z-10">
                                 {/* Image */}
                                 <div className="w-16 h-16 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden">
                                    {bump.imageUrl && <img src={bump.imageUrl} className="w-full h-full object-cover" />}
                                 </div>

                                 {/* Content */}
                                 <div className="flex-1">
                                    <div className="flex justify-between items-start">
                                       <h4 className="font-bold text-gray-900 text-sm">{bump.name}</h4>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1 leading-snug line-clamp-2">{bump.description}</p>

                                    {/* Dynamic Call to Action with Checkbox */}
                                    <div className="mt-3 flex items-center gap-2">
                                       <div className={`w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors ${selectedBumps.includes(bump.id)
                                          ? 'bg-[#10B981] border-[#10B981]'
                                          : 'border-gray-400 bg-transparent'
                                          }`}>
                                          {selectedBumps.includes(bump.id) && <Check className="w-3.5 h-3.5 text-white" />}
                                       </div>
                                       <p className="text-sm font-bold text-gray-900 leading-tight">
                                          Sim, quero aproveitar por apenas <span className="text-[#10B981]">R$ {priceValue}</span>{suffix}
                                       </p>
                                    </div>
                                 </div>
                              </div>
                           </div>
                        );
                     })}
                  </div>
               </div>
            )}

            {/* RESUMO DO PEDIDO */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
               <h3 className="font-bold text-gray-900 mb-4">Resumo</h3>

               <div className="space-y-3 mb-4 text-sm">
                  <div className="flex justify-between text-gray-600">
                     <span>{data.product.name}</span>
                     {data.product.price_fake ? (
                        <span className="line-through text-gray-400">R$ {data.product.price_fake.toFixed(2)}</span>
                     ) : (
                        <span className="text-[#10B981]">R$ {data.product.price_real?.toFixed(2)}</span>
                     )}
                  </div>

                  {selectedBumps.map(bumpId => {
                     const bump = data.bumps.find(b => b.id === bumpId);
                     return bump ? (
                        <div key={bump.id} className="flex justify-between text-[#10B981]">
                           <span className="flex items-center gap-1"><Check className="w-3 h-3" /> {bump.name}</span>
                           <span>+ R$ {bump.price_real?.toFixed(2)}</span>
                        </div>
                     ) : null;
                  })}

                  <div className="border-t border-gray-100 pt-3 flex justify-between items-center">
                     <span className="font-bold text-gray-900">Total</span>
                     <div className="text-right">
                        <p className="text-2xl font-bold text-[#10B981]">R$ {totalAmount.toFixed(2)}</p>
                        {paymentMethod === 'credit_card' && (
                           <p className="text-xs text-gray-500">ou 12x de R$ {(totalAmount / 12 * 1.2).toFixed(2)}</p>
                        )}
                     </div>
                  </div>
               </div>

               <button
                  onClick={handleSubmit}
                  disabled={isProcessing || !paymentMethod}
                  className="w-full bg-[#10B981] hover:bg-[#059669] disabled:bg-gray-400 text-white font-bold py-4 rounded-xl shadow-lg shadow-green-500/30 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
               >
                  {isProcessing ? 'Processando...' : (
                     <>
                        <Lock className="w-5 h-5" />
                        {paymentMethod === 'pix' ? 'Gerar Pix Copia e Cola' : 'Finalizar Compra Agora'}
                     </>
                  )}
               </button>
            </div>

            <div className="text-center py-4 border-t border-gray-200">
               <p className="text-[10px] text-gray-400 flex items-center justify-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Compra 100% segura
               </p>
            </div>

         </div>
      </div>
   );
};
