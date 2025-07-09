
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ContactInformationFields } from '@/components/settings/ContactInformationFields';
import { CompanyInformationFields } from '@/components/settings/CompanyInformationFields';
import { SecurityInformationFields } from '@/components/settings/SecurityInformationFields';
import { LegalInformationFields } from '@/components/settings/LegalInformationFields';
import { CopyrightFields } from '@/components/settings/CopyrightFields';
import { FooterPreview } from '@/components/settings/FooterPreview';
import { useSettingsForm } from '@/hooks/useSettingsForm';

const Settings = () => {
  const { form, loading, previewText, onSubmit } = useSettingsForm();

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Configurações</h1>
          <p className="text-gray-400 mt-1">Configure as informações globais dos seus checkouts</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="rounded-lg border border-white/10 bg-white/5 backdrop-blur-lg bg-gradient-to-b from-purple-500/10 to-transparent">
            <CardHeader>
              <CardTitle className="text-white">Configurações do Rodapé</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <ContactInformationFields form={form} />
                  <CompanyInformationFields form={form} />
                  <SecurityInformationFields form={form} />
                  <LegalInformationFields form={form} />
                  <CopyrightFields form={form} />

                  <Button 
                    type="submit" 
                    disabled={loading}
                    className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-50"
                  >
                    {loading ? '💾 Salvando...' : '💾 Salvar Configurações'}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          <FooterPreview previewText={previewText} />
        </div>
      </div>
    </Layout>
  );
};

export default Settings;
