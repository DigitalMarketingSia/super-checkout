import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { FORM_FIELDS } from '@/constants';

interface FormFieldsConfig {
  name: boolean;
  email: boolean;
  phone: boolean;
  cpf: boolean;
}

interface FormFieldsSettingsProps {
  formFields: FormFieldsConfig;
  onFormFieldChange: (field: keyof FormFieldsConfig, checked: boolean) => void;
}

export const FormFieldsSettings = ({
  formFields,
  onFormFieldChange
}: FormFieldsSettingsProps) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-white">Campos do Formulário</h3>
      
      <div className="space-y-3">
        <div className="flex items-center justify-between bg-gray-700 p-4 rounded-lg">
          <Label className="text-gray-300">Nome</Label>
          <Switch 
            checked={formFields.name} 
            disabled={true}
            className="opacity-75"
          />
        </div>

        <div className="flex items-center justify-between bg-gray-700 p-4 rounded-lg">
          <Label className="text-gray-300">E-mail</Label>
          <Switch 
            checked={formFields.email} 
            disabled={true}
            className="opacity-75"
          />
        </div>

        <div className="flex items-center justify-between bg-gray-700 p-4 rounded-lg">
          <Label className="text-gray-300">Telefone</Label>
          <Switch 
            checked={formFields.phone} 
            onCheckedChange={(checked) => onFormFieldChange('phone', checked)}
          />
        </div>

        <div className="flex items-center justify-between bg-gray-700 p-4 rounded-lg">
          <Label className="text-gray-300">CPF</Label>
          <Switch 
            checked={formFields.cpf} 
            onCheckedChange={(checked) => onFormFieldChange('cpf', checked)}
          />
        </div>
      </div>
    </div>
  );
};