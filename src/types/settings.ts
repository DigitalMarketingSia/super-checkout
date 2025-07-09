
import * as z from 'zod';

export const settingsSchema = z.object({
  textoIntrodutorio: z.string().min(1, 'Texto introdutório é obrigatório'),
  emailSuporte: z.string().email('E-mail inválido'),
  nomeEmpresa: z.string().min(1, 'Nome da empresa é obrigatório'),
  nomeVendedor: z.string().min(1, 'Nome do vendedor é obrigatório'),
  textoSeguranca: z.string().min(1, 'Texto de segurança é obrigatório'),
  linkTermosCompra: z.string().optional(),
  linkPoliticaPrivacidade: z.string().optional(),
  textoCopyright: z.string().min(1, 'Texto de copyright é obrigatório'),
  exibirInformacoesLegais: z.boolean()
}).refine((data) => {
  // Se as informações legais estão habilitadas, validar os links
  if (data.exibirInformacoesLegais) {
    // Verificar se os links estão preenchidos
    if (!data.linkTermosCompra || data.linkTermosCompra.trim() === '') {
      return false;
    }
    if (!data.linkPoliticaPrivacidade || data.linkPoliticaPrivacidade.trim() === '') {
      return false;
    }
    
    // Verificar se são URLs válidas
    try {
      new URL(data.linkTermosCompra);
      new URL(data.linkPoliticaPrivacidade);
      return true;
    } catch {
      return false;
    }
  }
  return true;
}, {
  message: 'Quando as informações legais estão ativadas, ambos os links são obrigatórios e devem ser URLs válidas',
  path: ['linkTermosCompra']
});

export type SettingsFormData = z.infer<typeof settingsSchema>;
