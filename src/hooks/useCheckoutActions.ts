
import { useToast } from './use-toast';
import { useCheckoutContext } from '../context/CheckoutContext';
import { useDomainContext } from '../context/DomainContext';

export const useCheckoutActions = () => {
  const { products, deleteCheckout: deleteCheckoutFromContext } = useCheckoutContext();
  const { customDomain } = useDomainContext();
  const { toast } = useToast();

  // Função para gerar a URL do checkout
  const getCheckoutUrl = (checkoutId: string, domainId?: string | null) => {
    if (domainId && customDomain && customDomain.id === domainId) {
      // Usar domínio personalizado
      const product = products.find(p => p.id === products.find(p => p.id === checkoutId)?.id);
      const productSlug = product?.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || 'produto';
      return `https://${customDomain.hostname}/${productSlug}`;
    }
    // Usar domínio padrão
    return `${window.location.origin}/checkout/${checkoutId}`;
  };

  const handleCopyLink = async (checkoutId: string, domainId?: string | null) => {
    const url = getCheckoutUrl(checkoutId, domainId);
    try {
      await navigator.clipboard.writeText(url);
      toast({
        title: "Link copiado!",
        description: "O link do checkout foi copiado para a área de transferência."
      });
    } catch (error) {
      // Fallback para navegadores mais antigos
      const textArea = document.createElement('textarea');
      textArea.value = url;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      
      toast({
        title: "Link copiado!",
        description: "O link do checkout foi copiado para a área de transferência."
      });
    }
  };

  const handleDeleteCheckout = async (checkoutId: string, checkoutName: string) => {
    const confirmed = window.confirm(
      `Você tem certeza que deseja excluir o checkout "${checkoutName}"?`
    );
    
    if (confirmed) {
      try {
        const success = await deleteCheckoutFromContext(checkoutId);
        if (success) {
          toast({
            title: "Checkout excluído",
            description: "O checkout foi excluído com sucesso."
          });
        } else {
          toast({
            title: "Erro",
            description: "Erro ao excluir checkout.",
            variant: "destructive"
          });
        }
      } catch (error) {
        console.error('❌ Erro ao excluir checkout:', error);
        toast({
          title: "Erro",
          description: "Erro ao excluir checkout.",
          variant: "destructive"
        });
      }
    }
  };

  return {
    handleCopyLink,
    handleDeleteCheckout
  };
};
