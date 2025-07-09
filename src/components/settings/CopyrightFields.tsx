
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { UseFormReturn } from 'react-hook-form';
import { SettingsFormData } from '@/types/settings';

interface CopyrightFieldsProps {
  form: UseFormReturn<SettingsFormData>;
}

export const CopyrightFields = ({ form }: CopyrightFieldsProps) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-white">Copyright</h3>
      
      <FormField
        control={form.control}
        name="textoCopyright"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-gray-300">Texto de Copyright</FormLabel>
            <FormControl>
              <Input placeholder="© 2024 Minha Empresa - Todos os direitos reservados" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
};
