
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { UseFormReturn } from 'react-hook-form';
import { SettingsFormData } from '@/types/settings';

interface SecurityInformationFieldsProps {
  form: UseFormReturn<SettingsFormData>;
}

export const SecurityInformationFields = ({ form }: SecurityInformationFieldsProps) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-white">Informações de Segurança</h3>
      
      <FormField
        control={form.control}
        name="textoSeguranca"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-gray-300">Texto de Segurança</FormLabel>
            <FormControl>
              <Input placeholder="🔒 Compra 100% Segura - SSL Criptografado" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
};
