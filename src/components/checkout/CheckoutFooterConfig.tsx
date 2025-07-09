
import { FooterConfig } from '@/types/checkout';
import { GlobalSettings } from '@/api/mockDatabase';

interface CheckoutFooterConfigProps {
  globalSettings: GlobalSettings | null;
}

export const useCheckoutFooterConfig = ({ globalSettings }: CheckoutFooterConfigProps): FooterConfig => {
  console.log('🔧 useCheckoutFooterConfig - Configurações recebidas:', globalSettings);
  
  // Configurações do footer usando dados salvos ou valores padrão
  const footerConfig = globalSettings ? {
    textoIntrodutorio: globalSettings.footer.textoIntrodutorio,
    emailSuporte: globalSettings.footer.emailSuporte,
    textoSeguranca: globalSettings.footer.textoSeguranca,
    linkTermosCompra: globalSettings.footer.linkTermosCompra,
    linkPoliticaPrivacidade: globalSettings.footer.linkPoliticaPrivacidade,
    textoCopyright: globalSettings.footer.textoCopyright,
    exibirInformacoesLegais: globalSettings.footer.exibirInformacoesLegais
  } : {
    // Fallback caso as configurações não estejam carregadas
    textoIntrodutorio: 'Este site é seguro e suas informações estão protegidas. Para dúvidas ou suporte, entre em contato:',
    emailSuporte: 'suporte@supercheckout.com',
    textoSeguranca: '🔒 Compra 100% Segura - SSL Criptografado',
    linkTermosCompra: '/termos-de-compra',
    linkPoliticaPrivacidade: '/politica-de-privacidade',
    textoCopyright: '© 2024 Super Checkout - Todos os direitos reservados',
    exibirInformacoesLegais: true
  };

  console.log('🎯 Footer Config final:', footerConfig);
  
  return footerConfig;
};
