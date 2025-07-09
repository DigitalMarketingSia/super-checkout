
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useGlobalSettings } from '@/hooks/useGlobalSettings';
import { toast } from '@/hooks/use-toast';
import { settingsSchema, SettingsFormData } from '@/types/settings';

export const useSettingsForm = () => {
  const [previewText, setPreviewText] = useState('');
  const { globalSettings, loading, saveSettings } = useGlobalSettings();

  const form = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      textoIntrodutorio: '',
      emailSuporte: '',
      nomeEmpresa: '',
      nomeVendedor: '',
      textoSeguranca: '',
      linkTermosCompra: '',
      linkPoliticaPrivacidade: '',
      textoCopyright: '',
      exibirInformacoesLegais: true
    }
  });

  // Carregar configurações quando disponíveis
  useEffect(() => {
    if (globalSettings) {
      console.log('🔄 Carregando configurações do Supabase...');
      console.log('✅ Configurações carregadas:', globalSettings);
      
      const footerWithDefaults: SettingsFormData = {
        textoIntrodutorio: globalSettings.footer.textoIntrodutorio ?? '',
        emailSuporte: globalSettings.footer.emailSuporte ?? '',
        nomeEmpresa: globalSettings.footer.nomeEmpresa ?? '',
        nomeVendedor: globalSettings.footer.nomeVendedor ?? '',
        textoSeguranca: globalSettings.footer.textoSeguranca ?? '',
        linkTermosCompra: globalSettings.footer.linkTermosCompra ?? '',
        linkPoliticaPrivacidade: globalSettings.footer.linkPoliticaPrivacidade ?? '',
        textoCopyright: globalSettings.footer.textoCopyright ?? '',
        exibirInformacoesLegais: globalSettings.footer.exibirInformacoesLegais ?? true
      };
      
      form.reset(footerWithDefaults);
      updatePreview(footerWithDefaults);
    }
  }, [globalSettings, form]);

  const updatePreview = (values: Partial<SettingsFormData>) => {
    const preview = `
${values.textoIntrodutorio || ''} ${values.emailSuporte || ''}.

${values.textoSeguranca || ''}

Valores parcelados possuem acréscimo ao mês.

${values.exibirInformacoesLegais ? 'Confira os Termos de Compra e nossa Política de Privacidade.' : ''}

${values.textoCopyright || ''}
    `.trim();
    
    setPreviewText(preview);
  };

  const onSubmit = async (data: SettingsFormData) => {
    console.log('🚀 Iniciando processo de salvamento no Supabase...');
    console.log('📝 Dados do formulário:', data);
    
    try {
      console.log('✅ Salvando configurações no Supabase...');
      
      const { error } = await saveSettings({
        footer: {
          textoIntrodutorio: data.textoIntrodutorio || '',
          emailSuporte: data.emailSuporte || '',
          nomeEmpresa: data.nomeEmpresa || '',
          nomeVendedor: data.nomeVendedor || '',
          textoSeguranca: data.textoSeguranca || '',
          linkTermosCompra: data.linkTermosCompra || '',
          linkPoliticaPrivacidade: data.linkPoliticaPrivacidade || '',
          textoCopyright: data.textoCopyright || '',
          exibirInformacoesLegais: data.exibirInformacoesLegais
        }
      });
      
      if (error) {
        throw new Error(error);
      }
      
      console.log('✅ Configurações salvas com sucesso no Supabase!');
      
      // Toast de sucesso
      toast({
        title: "✅ Configurações salvas!",
        description: "As configurações foram atualizadas com sucesso e já estão ativas nos checkouts.",
        variant: "default",
      });
      
      console.log('🎉 Processo de salvamento concluído com sucesso!');
      
    } catch (error) {
      console.error('❌ Erro durante o salvamento:', error);
      
      let errorMessage = "Erro inesperado ao salvar configurações";
      
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      toast({
        title: "❌ Erro ao salvar",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    const subscription = form.watch((values) => {
      updatePreview(values);
    });
    return () => subscription.unsubscribe();
  }, [form]);

  return {
    form,
    loading,
    previewText,
    onSubmit
  };
};
