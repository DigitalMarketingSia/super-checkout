import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { LoadingState } from '@/components/ui/loading-spinner';
import { CheckoutBasicSettings } from '@/components/forms/checkout/CheckoutBasicSettings';
import { ProductSelection } from '@/components/forms/checkout/ProductSelection';
import { GatewaySelection } from '@/components/forms/checkout/GatewaySelection';
import { DomainSelection } from '@/components/forms/checkout/DomainSelection';
import { OrderBumpsSettings } from '@/components/forms/checkout/OrderBumpsSettings';
import { FormFieldsSettings } from '@/components/forms/checkout/FormFieldsSettings';
import { PaymentMethodsSettings } from '@/components/forms/checkout/PaymentMethodsSettings';
import { TimerConfiguration } from '@/components/forms/checkout/TimerConfiguration';
import { HeaderImageUpload } from '@/components/forms/checkout/HeaderImageUpload';
import { useCheckoutContext } from '@/context/CheckoutContext';
import { useDomainContext } from '@/context/DomainContext';
import { useGatewayContext } from '@/context/GatewayContext';
import { useProductContext } from '@/context/ProductContext';
import { CheckoutConfig } from '@/api/mockDatabase';
import { useToast } from '@/hooks/use-toast';
import { 
  CHECKOUT_STATUS, 
  FORM_FIELDS, 
  PAYMENT_METHODS, 
  DEFAULT_TIMER_CONFIG,
  DEFAULT_FORM_FIELDS,
  DEFAULT_PAYMENT_METHODS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  ROUTES,
  CHECKOUT_TYPES
} from '@/constants';

interface CheckoutFormProps {
  initialData?: CheckoutConfig | null;
  isEditing?: boolean;
}

interface CheckoutFormData {
  name: string;
  productId: string;
  type: string;
  hasOrderBumps: boolean;
  domainId: string | null;
  gatewayId: string | null;
  upsellProductId: string | null;
  formFields: {
    name: boolean;
    email: boolean;
    phone: boolean;
    cpf: boolean;
  };
  paymentMethods: {
    pix: boolean;
    creditCard: boolean;
    boleto: boolean;
  };
  isActive: boolean;
  headerImageUrl: string | null;
  timerConfig: {
    enabled: boolean;
    durationInSeconds: number;
    backgroundColor: string;
    text: string;
  };
}

export const CheckoutForm: React.FC<CheckoutFormProps> = ({ initialData, isEditing = false }) => {
  const navigate = useNavigate();
  const { addCheckout, updateCheckout } = useCheckoutContext();
  const { products } = useProductContext();
  const { customDomain } = useDomainContext();
  const { getConnectedGateways } = useGatewayContext();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [selectedOrderBumps, setSelectedOrderBumps] = useState<string[]>([]);
  const [formData, setFormData] = useState<CheckoutFormData>({
    name: '',
    productId: '',
    type: CHECKOUT_TYPES.STANDARD,
    hasOrderBumps: false,
    domainId: null,
    gatewayId: null,
    upsellProductId: null,
    formFields: DEFAULT_FORM_FIELDS,
    paymentMethods: DEFAULT_PAYMENT_METHODS,
    isActive: true,
    headerImageUrl: null,
    timerConfig: DEFAULT_TIMER_CONFIG
  });

  const connectedGateways = getConnectedGateways();

  // Inicializar formulário com dados existentes (modo edição)
  useEffect(() => {
    if (initialData && isEditing) {
      setFormData({
        name: initialData.name,
        productId: initialData.mainProductId,
        type: CHECKOUT_TYPES.STANDARD,
        hasOrderBumps: initialData.allowedOrderBumps.length > 0,
        domainId: initialData.domainId || null,
        gatewayId: initialData.gatewayId || null,
        upsellProductId: initialData.upsellProductId || null,
        formFields: {
          name: initialData.requiredFormFields.includes(FORM_FIELDS.NAME),
          email: initialData.requiredFormFields.includes(FORM_FIELDS.EMAIL),
          phone: initialData.requiredFormFields.includes(FORM_FIELDS.PHONE),
          cpf: initialData.requiredFormFields.includes(FORM_FIELDS.CPF)
        },
        paymentMethods: {
          pix: initialData.paymentMethods.includes(PAYMENT_METHODS.PIX),
          creditCard: initialData.paymentMethods.includes(PAYMENT_METHODS.CREDIT_CARD),
          boleto: initialData.paymentMethods.includes(PAYMENT_METHODS.BOLETO)
        },
        isActive: initialData.status === CHECKOUT_STATUS.ACTIVE,
        headerImageUrl: initialData.headerImageUrl || null,
        timerConfig: (initialData.timerConfig || DEFAULT_TIMER_CONFIG) as any
      });
      setSelectedOrderBumps(initialData.allowedOrderBumps);
    }
  }, [initialData, isEditing]);

  const handleNameChange = (value: string) => {
    setFormData(prev => ({ ...prev, name: value }));
  };

  const handleProductChange = (value: string) => {
    console.log('🔧 Produto selecionado:', value);
    setFormData(prev => ({ ...prev, productId: value }));
  };

  const handleGatewayChange = (value: string | null) => {
    setFormData(prev => ({ ...prev, gatewayId: value }));
  };

  const handleDomainChange = (value: string | null) => {
    setFormData(prev => ({ ...prev, domainId: value }));
  };

  const handleUpsellProductChange = (value: string | null) => {
    setFormData(prev => ({ ...prev, upsellProductId: value }));
  };

  const handleFormFieldChange = (field: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      formFields: {
        ...prev.formFields,
        [field]: checked
      }
    }));
  };

  const handlePaymentMethodChange = (method: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      paymentMethods: {
        ...prev.paymentMethods,
        [method]: checked
      }
    }));
  };

  const handleTimerConfigChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      timerConfig: {
        ...prev.timerConfig,
        [field]: value
      }
    }));
  };

  const handleImageUpload = (imageUrl: string | null) => {
    setFormData(prev => ({ ...prev, headerImageUrl: imageUrl }));
  };

  const handleOrderBumpToggle = (productId: string, checked: boolean) => {
    if (checked) {
      setSelectedOrderBumps(prev => [...prev, productId]);
    } else {
      setSelectedOrderBumps(prev => prev.filter(id => id !== productId));
    }
  };

  const handleSubmit = async () => {
    console.log('🔧 Dados do formulário antes da validação:', formData);
    
    // Validações usando constantes
    if (!formData.name || !formData.productId) {
      console.log('❌ Validação falhou - Nome:', formData.name, 'Produto:', formData.productId);
      toast({
        title: "Erro",
        description: ERROR_MESSAGES.REQUIRED_FIELDS,
        variant: "destructive"
      });
      return;
    }

    // Montar arrays baseados nos switches ativos usando constantes
    const requiredFormFields = [];
    if (formData.formFields.name) requiredFormFields.push(FORM_FIELDS.NAME);
    if (formData.formFields.email) requiredFormFields.push(FORM_FIELDS.EMAIL);
    if (formData.formFields.phone) requiredFormFields.push(FORM_FIELDS.PHONE);
    if (formData.formFields.cpf) requiredFormFields.push(FORM_FIELDS.CPF);

    const paymentMethods = [];
    if (formData.paymentMethods.pix) paymentMethods.push(PAYMENT_METHODS.PIX);
    if (formData.paymentMethods.creditCard) paymentMethods.push(PAYMENT_METHODS.CREDIT_CARD);
    if (formData.paymentMethods.boleto) paymentMethods.push(PAYMENT_METHODS.BOLETO);

    if (paymentMethods.length === 0) {
      toast({
        title: "Erro",
        description: ERROR_MESSAGES.NO_PAYMENT_METHOD,
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      // Criar objeto do checkout usando constantes
      const checkoutData = {
        name: formData.name,
        mainProductId: formData.productId, // Garantir que o produto está sendo passado
        status: formData.isActive ? CHECKOUT_STATUS.ACTIVE : CHECKOUT_STATUS.INACTIVE,
        allowedOrderBumps: formData.hasOrderBumps ? selectedOrderBumps : [],
        requiredFormFields,
        paymentMethods,
        domainId: formData.domainId,
        gatewayId: formData.gatewayId,
        upsellProductId: formData.upsellProductId,
        headerImageUrl: formData.headerImageUrl,
        timerConfig: formData.timerConfig
      };

      console.log('🔧 Dados do checkout a serem salvos:', checkoutData);
      console.log('🎁 Order bumps selecionados:', selectedOrderBumps);

      if (isEditing && initialData) {
        // Modo edição
        const updated = updateCheckout(initialData.id, checkoutData);
        if (updated) {
          toast({
            title: "Sucesso",
            description: SUCCESS_MESSAGES.CHECKOUT_UPDATED
          });
        } else {
          throw new Error('Falha ao atualizar checkout');
        }
      } else {
        // Modo criação
        console.log('🆕 Criando novo checkout com dados:', checkoutData);
        const newCheckout = addCheckout(checkoutData);
        console.log('✅ Checkout criado com ID:', newCheckout.id);
        console.log('✅ Link público:', `/checkout/${newCheckout.id}`);
        toast({
          title: "Sucesso",
          description: `${SUCCESS_MESSAGES.CHECKOUT_CREATED} ID: ${newCheckout.id}`
        });
      }
      
      navigate(ROUTES.CHECKOUTS);
    } catch (error) {
      console.error('Erro ao salvar checkout:', error);
      toast({
        title: "Erro",
        description: ERROR_MESSAGES.CHECKOUT_SAVE_ERROR,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate(ROUTES.CHECKOUTS);
  };

  if (loading) {
    return <LoadingState message="Salvando checkout..." />;
  }

  return (
    <div className="space-y-6">
      {/* Configurações Básicas */}
      <div className="rounded-lg border border-white/10 bg-white/5 backdrop-blur-lg bg-gradient-to-b from-purple-500/10 to-transparent p-6">
        <div className="mb-4">
          <h3 className="text-lg font-medium text-white">Configurações Básicas</h3>
          <p className="text-gray-400 text-sm">Configure as informações básicas do seu checkout</p>
        </div>
        
        <div className="space-y-4">
          <CheckoutBasicSettings
            name={formData.name}
            onNameChange={handleNameChange}
          />
        </div>
      </div>

      {/* Seleção de Produto Principal */}
      <div className="rounded-lg border border-white/10 bg-white/5 backdrop-blur-lg bg-gradient-to-b from-purple-500/10 to-transparent p-6">
        <div className="mb-4">
          <h3 className="text-lg font-medium text-white">Produto Principal</h3>
          <p className="text-gray-400 text-sm">Selecione o produto que será vendido neste checkout</p>
        </div>
        
        <ProductSelection
          productId={formData.productId}
          products={products}
          onProductChange={handleProductChange}
        />
      </div>

      {/* Seleção de Gateway */}
      <div className="rounded-lg border border-white/10 bg-white/5 backdrop-blur-lg bg-gradient-to-b from-purple-500/10 to-transparent p-6">
        <div className="mb-4">
          <h3 className="text-lg font-medium text-white">Gateway de Pagamento</h3>
          <p className="text-gray-400 text-sm">Configure o gateway para processar os pagamentos</p>
        </div>
        
        <GatewaySelection
          gatewayId={formData.gatewayId}
          connectedGateways={connectedGateways}
          onGatewayChange={handleGatewayChange}
        />
      </div>

      {/* Seleção de Domínio */}
      <div className="rounded-lg border border-white/10 bg-white/5 backdrop-blur-lg bg-gradient-to-b from-purple-500/10 to-transparent p-6">
        <div className="mb-4">
          <h3 className="text-lg font-medium text-white">Domínio</h3>
          <p className="text-gray-400 text-sm">Configure o domínio para seu checkout</p>
        </div>
        
        <DomainSelection
          domainId={formData.domainId}
          customDomain={customDomain}
          onDomainChange={handleDomainChange}
        />
      </div>

      {/* Tipo de Checkout */}
      <div className="rounded-lg border border-white/10 bg-white/5 backdrop-blur-lg bg-gradient-to-b from-purple-500/10 to-transparent p-6">
        <div className="mb-4">
          <h3 className="text-lg font-medium text-white">Tipo de Checkout</h3>
          <p className="text-gray-400 text-sm">Selecione o tipo de checkout que deseja criar</p>
        </div>
        
        <RadioGroup value={formData.type} onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}>
          <div className="flex items-center space-x-2 bg-gray-700 p-4 rounded-lg">
            <RadioGroupItem value={CHECKOUT_TYPES.STANDARD} id="padrao" />
            <Label htmlFor="padrao" className="text-white cursor-pointer flex-1">Padrão</Label>
          </div>
        </RadioGroup>
      </div>

      {/* OrderBumps */}
      <div className="rounded-lg border border-white/10 bg-white/5 backdrop-blur-lg bg-gradient-to-b from-purple-500/10 to-transparent p-6">
        <div className="mb-4">
          <h3 className="text-lg font-medium text-white">Order Bumps</h3>
          <p className="text-gray-400 text-sm">Configure produtos adicionais para oferecer durante o checkout</p>
        </div>
        
        <OrderBumpsSettings
          hasOrderBumps={formData.hasOrderBumps}
          selectedOrderBumps={selectedOrderBumps}
          products={products}
          onToggleOrderBumps={(checked) => setFormData(prev => ({ ...prev, hasOrderBumps: checked }))}
          onOrderBumpToggle={handleOrderBumpToggle}
        />
      </div>

      {/* Produto de Upsell */}
      <div className="rounded-lg border border-white/10 bg-white/5 backdrop-blur-lg bg-gradient-to-b from-purple-500/10 to-transparent p-6">
        <div className="mb-4">
          <h3 className="text-lg font-medium text-white">Oferta de Upsell Pós-Compra</h3>
          <p className="text-gray-400 text-sm">Selecione um produto para oferecer após uma compra bem-sucedida</p>
        </div>
        
        <div className="space-y-4">
          <select
            value={formData.upsellProductId || ''}
            onChange={(e) => handleUpsellProductChange(e.target.value || null)}
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
          >
            <option value="">Nenhum produto de upsell</option>
            {products
              .filter(product => product.id !== formData.productId)
              .map(product => (
              <option key={product.id} value={product.id}>
                {product.name} - {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL'
                }).format(product.price)}
              </option>
            ))}
          </select>
          
          {formData.upsellProductId && (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
              <p className="text-blue-300 text-sm">
                💡 O cliente verá esta oferta após confirmar o pagamento com cartão de crédito.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Campos do Formulário */}
      <div className="rounded-lg border border-white/10 bg-white/5 backdrop-blur-lg bg-gradient-to-b from-purple-500/10 to-transparent p-6">
        <div className="mb-4">
          <h3 className="text-lg font-medium text-white">Campos do Formulário</h3>
          <p className="text-gray-400 text-sm">Defina quais informações serão solicitadas ao cliente</p>
        </div>
        
        <FormFieldsSettings
          formFields={formData.formFields}
          onFormFieldChange={handleFormFieldChange}
        />
      </div>

      {/* Métodos de Pagamento */}
      <div className="rounded-lg border border-white/10 bg-white/5 backdrop-blur-lg bg-gradient-to-b from-purple-500/10 to-transparent p-6">
        <div className="mb-4">
          <h3 className="text-lg font-medium text-white">Métodos de Pagamento</h3>
          <p className="text-gray-400 text-sm">Configure os métodos de pagamento disponíveis</p>
        </div>
        
        <PaymentMethodsSettings
          paymentMethods={formData.paymentMethods}
          onPaymentMethodChange={handlePaymentMethodChange}
        />
      </div>

      {/* Imagem de Cabeçalho */}
      <div className="rounded-lg border border-white/10 bg-white/5 backdrop-blur-lg bg-gradient-to-b from-purple-500/10 to-transparent p-6">
        <HeaderImageUpload
          headerImageUrl={formData.headerImageUrl}
          onImageUpload={handleImageUpload}
        />
      </div>

      {/* Timer de Escassez */}
      <div className="rounded-lg border border-white/10 bg-white/5 backdrop-blur-lg bg-gradient-to-b from-purple-500/10 to-transparent p-6">
        <div className="mb-4">
          <h3 className="text-lg font-medium text-white">Timer de Escassez</h3>
          <p className="text-gray-400 text-sm">Configure um timer para criar urgência na compra</p>
        </div>
        
        <TimerConfiguration
          timerConfig={formData.timerConfig}
          onTimerConfigChange={handleTimerConfigChange}
        />
      </div>

      {/* Status do Checkout */}
      <div className="rounded-lg border border-white/10 bg-white/5 backdrop-blur-lg bg-gradient-to-b from-purple-500/10 to-transparent p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-white">Status do Checkout</h3>
            <p className="text-gray-400 text-sm">Ative ou desative este checkout</p>
          </div>
          <Switch 
            checked={formData.isActive} 
            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
          />
        </div>
      </div>

      {/* Botões de Ação */}
      <div className="rounded-lg border border-white/10 bg-white/5 backdrop-blur-lg bg-gradient-to-b from-purple-500/10 to-transparent p-6">
        <div className="flex gap-4">
          <Button 
            onClick={handleSubmit}
            disabled={loading}
            className="bg-gradient-to-r from-pink-500 to-violet-600 hover:from-pink-600 hover:to-violet-700 text-white px-8"
          >
            {loading ? 'Salvando...' : (isEditing ? 'Salvar Alterações' : 'Criar Checkout')}
          </Button>
          <Button 
            variant="ghost"
            onClick={handleCancel}
            disabled={loading}
            className="text-gray-400 hover:text-white border border-gray-600 hover:border-gray-500"
          >
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  );
};
