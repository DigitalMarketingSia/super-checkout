
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { UseFormReturn } from 'react-hook-form';
import { SettingsFormData } from '@/types/settings';

interface CompanyInformationFieldsProps {
  form: UseFormReturn<SettingsFormData>;
}

export const CompanyInformationFields = ({ form }: CompanyInformationFieldsProps) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-white">Informações da Empresa</h3>
      
      <FormField
        control={form.control}
        name="nomeEmpresa"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-gray-300">Nome da Empresa</FormLabel>
            <FormControl>
              <Input placeholder="Minha Empresa" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="nomeVendedor"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-gray-300">Nome do Vendedor</FormLabel>
            <FormControl>
              <Input placeholder="João Silva" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
};
