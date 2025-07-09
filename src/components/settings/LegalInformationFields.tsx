
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { UseFormReturn } from 'react-hook-form';
import { SettingsFormData } from '@/types/settings';

interface LegalInformationFieldsProps {
  form: UseFormReturn<SettingsFormData>;
}

export const LegalInformationFields = ({ form }: LegalInformationFieldsProps) => {
  const exibirInformacoesLegais = form.watch('exibirInformacoesLegais');

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-white">Informações Legais</h3>
      
      <FormField
        control={form.control}
        name="exibirInformacoesLegais"
        render={({ field }) => (
          <FormItem className="flex flex-row items-center justify-between rounded-lg border border-white/10 p-4">
            <div className="space-y-0.5">
              <FormLabel className="text-base text-white">
                Exibir Informações Legais no Checkout
              </FormLabel>
              <div className="text-sm text-gray-400">
                Quando ativado, exibe os links dos Termos de Compra e Política de Privacidade no rodapé do checkout
              </div>
            </div>
            <FormControl>
              <Switch
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            </FormControl>
          </FormItem>
        )}
      />

      {exibirInformacoesLegais && (
        <>
          <FormField
            control={form.control}
            name="linkTermosCompra"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-gray-300">
                  Link dos Termos de Compra *
                </FormLabel>
                <FormControl>
                  <Input 
                    placeholder="https://exemplo.com/termos" 
                    {...field} 
                    value={field.value || ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="linkPoliticaPrivacidade"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-gray-300">
                  Link da Política de Privacidade *
                </FormLabel>
                <FormControl>
                  <Input 
                    placeholder="https://exemplo.com/privacidade" 
                    {...field} 
                    value={field.value || ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </>
      )}
    </div>
  );
};
