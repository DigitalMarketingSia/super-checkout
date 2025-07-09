import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface GlobalSettings {
  footer: {
    textoIntrodutorio: string;
    emailSuporte: string;
    nomeEmpresa: string;
    nomeVendedor: string;
    textoSeguranca: string;
    linkTermosCompra: string;
    linkPoliticaPrivacidade: string;
    textoCopyright: string;
    exibirInformacoesLegais: boolean;
  };
  lastUpdated?: number;
}

// Default settings fallback
const defaultSettings: GlobalSettings = {
  footer: {
    textoIntrodutorio: 'Este site é seguro e suas informações estão protegidas. Para dúvidas ou suporte, entre em contato:',
    emailSuporte: 'suporte@supercheckout.com',
    nomeEmpresa: 'Super Checkout',
    nomeVendedor: 'Equipe Super Checkout',
    textoSeguranca: '🔒 Compra 100% Segura - SSL Criptografado',
    linkTermosCompra: '/termos-de-compra',
    linkPoliticaPrivacidade: '/politica-de-privacidade',
    textoCopyright: '© 2024 Super Checkout - Todos os direitos reservados',
    exibirInformacoesLegais: true
  },
  lastUpdated: Date.now()
};

export const useSupabaseSettings = () => {
  const [settings, setSettings] = useState<GlobalSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch settings from Supabase
  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('configuracoes')
        .select('chave, valor')
        .in('chave', [
          'texto_introdutorio',
          'email_suporte', 
          'nome_empresa',
          'nome_vendedor',
          'texto_seguranca',
          'link_termos_compra',
          'link_politica_privacidade',
          'texto_copyright',
          'exibir_informacoes_legais'
        ]);

      if (error) throw error;

      if (data && data.length > 0) {
        // Convert array of settings to object
        const settingsObj: GlobalSettings = {
          footer: {
            textoIntrodutorio: data.find(s => s.chave === 'texto_introdutorio')?.valor || defaultSettings.footer.textoIntrodutorio,
            emailSuporte: data.find(s => s.chave === 'email_suporte')?.valor || defaultSettings.footer.emailSuporte,
            nomeEmpresa: data.find(s => s.chave === 'nome_empresa')?.valor || defaultSettings.footer.nomeEmpresa,
            nomeVendedor: data.find(s => s.chave === 'nome_vendedor')?.valor || defaultSettings.footer.nomeVendedor,
            textoSeguranca: data.find(s => s.chave === 'texto_seguranca')?.valor || defaultSettings.footer.textoSeguranca,
            linkTermosCompra: data.find(s => s.chave === 'link_termos_compra')?.valor || defaultSettings.footer.linkTermosCompra,
            linkPoliticaPrivacidade: data.find(s => s.chave === 'link_politica_privacidade')?.valor || defaultSettings.footer.linkPoliticaPrivacidade,
            textoCopyright: data.find(s => s.chave === 'texto_copyright')?.valor || defaultSettings.footer.textoCopyright,
            exibirInformacoesLegais: data.find(s => s.chave === 'exibir_informacoes_legais')?.valor === 'true'
          },
          lastUpdated: Date.now()
        };

        setSettings(settingsObj);
        console.log('⚙️ Configurações carregadas do Supabase');
      } else {
        // No settings found, use defaults
        setSettings(defaultSettings);
        console.log('⚙️ Usando configurações padrão');
      }
    } catch (err) {
      console.error('❌ Erro ao carregar configurações:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar configurações');
      // Use default settings on error
      setSettings(defaultSettings);
    } finally {
      setLoading(false);
    }
  }, []);

  // Update settings in Supabase
  const updateSettings = async (newSettings: GlobalSettings) => {
    try {
      setError(null);

      // Convert settings object to array of key-value pairs
      const settingsArray = [
        { chave: 'texto_introdutorio', valor: newSettings.footer.textoIntrodutorio },
        { chave: 'email_suporte', valor: newSettings.footer.emailSuporte },
        { chave: 'nome_empresa', valor: newSettings.footer.nomeEmpresa },
        { chave: 'nome_vendedor', valor: newSettings.footer.nomeVendedor },
        { chave: 'texto_seguranca', valor: newSettings.footer.textoSeguranca },
        { chave: 'link_termos_compra', valor: newSettings.footer.linkTermosCompra },
        { chave: 'link_politica_privacidade', valor: newSettings.footer.linkPoliticaPrivacidade },
        { chave: 'texto_copyright', valor: newSettings.footer.textoCopyright },
        { chave: 'exibir_informacoes_legais', valor: newSettings.footer.exibirInformacoesLegais.toString() }
      ];

      // Upsert each setting
      for (const setting of settingsArray) {
        const { error } = await supabase
          .from('configuracoes')
          .upsert(setting, { onConflict: 'chave' });

        if (error) throw error;
      }

      const updatedSettings = {
        ...newSettings,
        lastUpdated: Date.now()
      };

      setSettings(updatedSettings);
      console.log('✅ Configurações salvas no Supabase');

      return { error: null };
    } catch (err) {
      console.error('❌ Erro ao salvar configurações:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erro ao salvar configurações';
      setError(errorMessage);
      return { error: errorMessage };
    }
  };

  // Initial load
  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return {
    settings,
    loading,
    error,
    updateSettings,
    refetch: fetchSettings,
  };
};