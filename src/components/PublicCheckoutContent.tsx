
import { CheckoutPadraoUI } from '@/components/CheckoutPadraoUI';
import { CheckoutLoading, CheckoutNotFound, CheckoutUnavailable } from '@/components/checkout/CheckoutStates';
import { PublicCheckoutDebug } from '@/components/debug/PublicCheckoutDebug';
import { usePublicCheckoutLogic } from '@/hooks/usePublicCheckoutLogic';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CredentialsSetup } from '@/components/setup/CredentialsSetup';

export const PublicCheckoutContent = () => {
  console.log('🔥 PublicCheckoutContent: Renderizando componente');
  
  const {
    // Estado básico
    isLoading,
    hasError,
    isCheckoutInactive,
    error,
    showDebug,
    systemInitialized,
    
    // Dados principais
    checkout,
    mainProduct,
    orderBumps,
    footerConfig,
    
    // Estado do checkout
    formData,
    selectedPaymentMethod,
    selectedOrderBumps,
    selectedInstallments,
    creditCardData,
    orderCalculation,
    setSelectedPaymentMethod,
    setSelectedInstallments,
    handleFormDataChange,
    handleCreditCardDataChange,
    handleOrderBumpToggle,
    
    // Submissão
    isSubmitting,
    paymentError,
    clearPaymentError,
    isPaymentSystemReady,
    paymentSystemLoading,
    handleFormSubmit,
    debugInfo
  } = usePublicCheckoutLogic();

  console.log('🔥 PublicCheckoutContent: Estados recebidos:', {
    isLoading,
    hasError,
    isCheckoutInactive,
    error,
    checkout: !!checkout,
    mainProduct: !!mainProduct,
    orderBumps: orderBumps.length,
    isPaymentSystemReady,
    selectedPaymentMethod,
    systemInitialized
  });

  // Estados de loading e erro
  if (isLoading) {
    console.log('⏳ Mostrando loading');
    return <CheckoutLoading />;
  }

  if (hasError) {
    console.log('❌ Mostrando erro:', { error, checkout: !!checkout, mainProduct: !!mainProduct });
    
    // Verificar se o erro é por falta de credenciais
    if (error?.includes('Gateway de pagamento não configurado adequadamente')) {
      return <CredentialsSetup />;
    }
    
    // Erro específico para sistema não inicializado
    if (!systemInitialized) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full">
            <Alert className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                <div className="space-y-2">
                  <p className="font-medium">Sistema Temporariamente Indisponível</p>
                  <p className="text-sm">{error || "O sistema de checkout está sendo inicializado. Tente novamente em alguns momentos."}</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => window.location.reload()}
                    className="mt-2"
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Tentar Novamente
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          </div>
        </div>
      );
    }
    
    return <CheckoutNotFound message={error || "Checkout não encontrado"} />;
  }

  // Verificar se o checkout está ativo
  if (isCheckoutInactive) {
    console.log('⏸️ Checkout inativo:', checkout?.status);
    return <CheckoutUnavailable />;
  }

  // Verificação adicional de segurança
  if (!checkout || !mainProduct) {
    console.log('❌ Dados críticos ausentes:', { checkout: !!checkout, mainProduct: !!mainProduct });
    return <CheckoutNotFound message="Dados do checkout não encontrados" />;
  }

  // Log final antes de renderizar
  console.log('🎯 PublicCheckout: Renderizando checkout público');
  console.log('📋 Checkout:', checkout.name, 'Gateway ID:', checkout.gatewayId);
  console.log('📦 Produto:', mainProduct.name);
  console.log('🎁 Order bumps:', orderBumps.length);
  console.log('🐛 Debug mode:', showDebug);
  console.log('🔧 Sistema de pagamento pronto:', isPaymentSystemReady);
  console.log('💳 Métodos de pagamento:', checkout.paymentMethods);
  console.log('📝 Dados do formulário:', { nome: formData.nome, email: formData.email });

  return (
    <div>
      {/* Componente de Debug - Visível apenas com Ctrl+D */}
      {showDebug && (
        <PublicCheckoutDebug
          checkout={checkout}
          isPaymentSystemReady={isPaymentSystemReady}
          paymentSystemLoading={paymentSystemLoading}
          isSubmitting={isSubmitting}
          formData={formData}
          selectedPaymentMethod={selectedPaymentMethod}
          onRetryPayment={() => {
            clearPaymentError();
            // Tentar reprocessar o último pagamento
            if (selectedPaymentMethod === 'pix') {
              handleFormSubmit(new Event('submit') as any);
            }
          }}
          debugInfo={debugInfo}
        />
      )}
      
      <CheckoutPadraoUI
        productName={mainProduct.name}
        productPrice={mainProduct.price}
        productImage={mainProduct.image || "/placeholder.svg"}
        
        orderBumps={orderBumps.map(bump => ({
          id: bump.id,
          name: bump.name || (bump as any).nome,
          description: bump.description || (bump as any).descricao || 'Produto adicional para complementar sua compra',
          price: bump.price || (bump as any).preco,
          image: bump.image || (bump as any).url_imagem
        }))}
        selectedOrderBumps={selectedOrderBumps}
        onOrderBumpToggle={handleOrderBumpToggle}
        
        selectedPaymentMethod={selectedPaymentMethod}
        onPaymentMethodSelect={setSelectedPaymentMethod}
        allowedPaymentMethods={checkout.paymentMethods}
        
        requiredFormFields={checkout.requiredFormFields}
        formData={formData}
        onFormDataChange={handleFormDataChange}
        
        creditCardData={creditCardData}
        onCreditCardDataChange={handleCreditCardDataChange}
        
        selectedInstallments={selectedInstallments}
        onInstallmentsChange={setSelectedInstallments}
        
        orderCalculation={orderCalculation}
        
        isSubmitting={isSubmitting}
        paymentError={paymentError}
        onClearPaymentError={clearPaymentError}
        
        bannerUrl={undefined}
        headerImageUrl={checkout.headerImageUrl || undefined}
        timerConfig={checkout.timerConfig as any || undefined}
        footerConfig={footerConfig}
        
        onSubmit={handleFormSubmit}
      />
      
      {/* Feedback visual para quando não está pronto */}
      {!isPaymentSystemReady && !showDebug && (
        <div className="fixed bottom-4 left-4 bg-yellow-900/90 border border-yellow-500/50 p-3 rounded shadow-lg z-40">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-yellow-400 text-sm">Inicializando sistema de pagamento...</span>
          </div>
        </div>
      )}
      
      {/* Hint para debug mode */}
      {!showDebug && (
        <div className="fixed bottom-4 right-4 text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded z-40">
          Pressione Ctrl+D para debug
        </div>
      )}
      
      {/* Alert para sistema não inicializado */}
      {!systemInitialized && !isLoading && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 max-w-md w-full mx-4">
          <Alert className="border-orange-200 bg-orange-50">
            <AlertCircle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              <div className="space-y-1">
                <p className="font-medium text-sm">Sistema Inicializando</p>
                <p className="text-xs">Aguarde enquanto carregamos os dados do checkout...</p>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      )}
    </div>
  );
};
