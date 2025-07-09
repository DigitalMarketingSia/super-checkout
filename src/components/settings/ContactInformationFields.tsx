
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { UseFormReturn } from 'react-hook-form';
import { SettingsFormData } from '@/types/settings';

interface ContactInformationFieldsProps {
  form: UseFormReturn<SettingsFormData>;
}

export const ContactInformationFields = ({ form }: ContactInformationFieldsProps) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-white">Informações de Contato</h3>
      
      <FormField
        control={form.control}
        name="textoIntrodutorio"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-gray-300">Texto Introdutório</FormLabel>
            <FormControl>
              <Textarea 
                placeholder="Este site é seguro e suas informações estão protegidas..."
                {...field} 
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="emailSuporte"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-gray-300">Email de Suporte</FormLabel>
            <FormControl>
              <Input placeholder="suporte@exemplo.com" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
};
