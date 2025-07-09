import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useSupabaseGateways } from '@/hooks/useSupabaseGateways';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, CheckCircle, Save } from 'lucide-react';

export const CredentialsSetup = () => {
  const { gateways, updateGateway, loading } = useSupabaseGateways();
  const { toast } = useToast();
  
  const [credentials, setCredentials] = useState({
    publicKeyProd: '',
    accessTokenProd: '',
    publicKeySandbox: 'TEST-128ed321-c483-4220-b857-275935dd8498',
    accessTokenSandbox: 'TEST-3388903873791416-070505-d2bd52e12df128675573159519eb7aaf-337331937'
  });
  
  const [environment, setEnvironment] = useState<'sandbox' | 'production'>('production');
  const [saving, setSaving] = useState(false);

  const gateway = gateways.find(g => g.type === 'mercado_pago');

  const validateCredentials = () => {
    if (environment === 'production') {
      return credentials.publicKeyProd.startsWith('APP_USR-') && 
             credentials.accessTokenProd.startsWith('APP_USR-');
    } else {
      return credentials.publicKeySandbox.startsWith('TEST-') && 
             credentials.accessTokenSandbox.startsWith('TEST-');
    }
  };

  const handleSave = async () => {
    if (!gateway) {
      toast({
        title: "Erro",
        description: "Gateway não encontrado",
        variant: "destructive"
      });
      return;
    }

    if (!validateCredentials()) {
      toast({
        title: "Credenciais inválidas",
        description: `Para ambiente ${environment}, as credenciais devem começar com ${environment === 'production' ? 'APP_USR-' : 'TEST-'}`,
        variant: "destructive"
      });
      return;
    }

    setSaving(true);
    try {
      const updatedCredentials = {
        ...credentials,
        environment
      };

      const result = await updateGateway(gateway.id, {
        credentials: updatedCredentials,
        environment,
        is_active: true
      });

      if (result.error) {
        throw new Error(result.error);
      }

      toast({
        title: "Sucesso",
        description: `Credenciais de ${environment} salvas com sucesso!`
      });

    } catch (error) {
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : 'Erro ao salvar credenciais',
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const isValid = validateCredentials();

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl bg-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            ⚙️ Configuração de Credenciais MercadoPago
            <Badge variant={isValid ? "default" : "destructive"}>
              {isValid ? "Válidas" : "Inválidas"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* Seletor de Ambiente */}
          <div className="space-y-2">
            <Label>Ambiente Ativo</Label>
            <div className="flex gap-2">
              <Button 
                variant={environment === 'sandbox' ? 'default' : 'outline'}
                onClick={() => setEnvironment('sandbox')}
                size="sm"
              >
                🧪 Sandbox (Teste)
              </Button>
              <Button 
                variant={environment === 'production' ? 'default' : 'outline'}
                onClick={() => setEnvironment('production')}
                size="sm"
              >
                🚀 Produção
              </Button>
            </div>
          </div>

          {/* Credenciais de Produção */}
          {environment === 'production' && (
            <div className="space-y-4 p-4 border rounded bg-red-50">
              <div className="flex items-center gap-2 text-red-800">
                <AlertCircle className="h-4 w-4" />
                <span className="font-medium">Credenciais de Produção</span>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Public Key (Produção)</Label>
                  <Input 
                    type="password"
                    placeholder="APP_USR-..."
                    value={credentials.publicKeyProd}
                    onChange={(e) => setCredentials(prev => ({ ...prev, publicKeyProd: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Access Token (Produção)</Label>
                  <Input 
                    type="password"
                    placeholder="APP_USR-..."
                    value={credentials.accessTokenProd}
                    onChange={(e) => setCredentials(prev => ({ ...prev, accessTokenProd: e.target.value }))}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Credenciais de Sandbox */}
          {environment === 'sandbox' && (
            <div className="space-y-4 p-4 border rounded bg-yellow-50">
              <div className="flex items-center gap-2 text-yellow-800">
                <AlertCircle className="h-4 w-4" />
                <span className="font-medium">Credenciais de Sandbox (Teste)</span>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Public Key (Sandbox)</Label>
                  <Input 
                    placeholder="TEST-..."
                    value={credentials.publicKeySandbox}
                    onChange={(e) => setCredentials(prev => ({ ...prev, publicKeySandbox: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Access Token (Sandbox)</Label>
                  <Input 
                    type="password"
                    placeholder="TEST-..."
                    value={credentials.accessTokenSandbox}
                    onChange={(e) => setCredentials(prev => ({ ...prev, accessTokenSandbox: e.target.value }))}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Status */}
          <div className={`p-3 rounded border ${isValid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <div className="flex items-center gap-2">
              {isValid ? 
                <CheckCircle className="h-4 w-4 text-green-600" /> :
                <AlertCircle className="h-4 w-4 text-red-600" />
              }
              <span className={`text-sm ${isValid ? 'text-green-800' : 'text-red-800'}`}>
                {isValid ? 
                  `Credenciais válidas para ambiente ${environment}` :
                  `Credenciais inválidas para ambiente ${environment}`
                }
              </span>
            </div>
          </div>

          {/* Botões */}
          <div className="flex gap-2 justify-end">
            <Button 
              onClick={() => window.location.reload()} 
              variant="outline"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleSave}
              disabled={!isValid || saving}
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Salvando...' : 'Salvar Credenciais'}
            </Button>
          </div>

          {/* Instruções */}
          <div className="text-xs text-gray-600 space-y-1">
            <p><strong>Onde encontrar as credenciais:</strong></p>
            <p>1. Acesse: https://www.mercadopago.com.br/developers/panel/app</p>
            <p>2. Selecione sua aplicação</p>
            <p>3. Vá em "Credenciais de produção" ou "Credenciais de teste"</p>
            <p>4. Copie a Public Key e Access Token</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};