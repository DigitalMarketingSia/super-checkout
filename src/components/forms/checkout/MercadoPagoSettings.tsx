import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useGatewayContext } from '@/context/GatewayContext';
import { useToast } from '@/hooks/use-toast';
import { CreditCard, Eye, EyeOff, TestTube, Rocket, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface MercadoPagoCredentials {
  publicKeyProd: string;
  accessTokenProd: string;
  publicKeySandbox: string;
  accessTokenSandbox: string;
}

interface MercadoPagoSettingsProps {
  onSave?: () => void;
}

export const MercadoPagoSettings = ({ onSave }: MercadoPagoSettingsProps) => {
  const { addGateway, updateGateway, gateways, loading: gatewayLoading, error: gatewayError } = useGatewayContext();
  const { toast } = useToast();
  
  const [credentials, setCredentials] = useState<MercadoPagoCredentials>({
    publicKeyProd: '',
    accessTokenProd: '',
    publicKeySandbox: '',
    accessTokenSandbox: ''
  });
  
  const [environment, setEnvironment] = useState<'sandbox' | 'production'>('sandbox');
  const [showCredentials, setShowCredentials] = useState(false);
  const [loading, setLoading] = useState(false);
  const [testingCredentials, setTestingCredentials] = useState(false);
  const [credentialStatus, setCredentialStatus] = useState<{
    sandbox: 'untested' | 'testing' | 'valid' | 'invalid';
    production: 'untested' | 'testing' | 'valid' | 'invalid';
  }>({
    sandbox: 'untested',
    production: 'untested'
  });

  // Buscar gateway MercadoPago existente
  const existingGateway = gateways.find(g => g.type === 'mercado_pago');

  useEffect(() => {
    if (existingGateway?.credentials) {
      const creds = existingGateway.credentials;
      console.log('📋 Carregando credenciais existentes:', Object.keys(creds));
      
      setCredentials({
        publicKeyProd: creds.publicKeyProd || creds.publicKey || '',
        accessTokenProd: creds.accessTokenProd || creds.accessToken || '',
        publicKeySandbox: creds.publicKeySandbox || '',
        accessTokenSandbox: creds.accessTokenSandbox || ''
      });
      setEnvironment(existingGateway.environment || 'sandbox');
      
      // Verificar se as credenciais parecem válidas
      if (creds.publicKeySandbox && creds.accessTokenSandbox) {
        setCredentialStatus(prev => ({ ...prev, sandbox: 'valid' }));
      }
      if (creds.publicKeyProd && creds.accessTokenProd) {
        setCredentialStatus(prev => ({ ...prev, production: 'valid' }));
      }
    }
  }, [existingGateway]);

  const validateCredentialFormat = (type: 'sandbox' | 'production', publicKey: string, accessToken: string) => {
    if (type === 'sandbox') {
      return publicKey.startsWith('TEST-') && accessToken.startsWith('TEST-');
    } else {
      return publicKey.startsWith('APP_USR-') && accessToken.startsWith('APP_USR-');
    }
  };

  const testCredentials = async (env: 'sandbox' | 'production') => {
    const publicKey = env === 'sandbox' ? credentials.publicKeySandbox : credentials.publicKeyProd;
    const accessToken = env === 'sandbox' ? credentials.accessTokenSandbox : credentials.accessTokenProd;

    if (!publicKey || !accessToken) {
      toast({
        title: "⚠️ Credenciais Incompletas",
        description: `Preencha as credenciais de ${env === 'sandbox' ? 'Sandbox' : 'Produção'}`,
        variant: "destructive"
      });
      return false;
    }

    setCredentialStatus(prev => ({ ...prev, [env]: 'testing' }));
    setTestingCredentials(true);
    
    try {
      console.log(`🧪 Testando credenciais ${env}...`);
      
      // Usar edge function para evitar problemas de CORS
      const { data, error } = await supabase.functions.invoke('test-mp-credentials', {
        body: {
          publicKey,
          accessToken,
          environment: env
        }
      });

      if (error) {
        console.error(`❌ Erro na edge function:`, error);
        throw new Error(error.message || 'Erro ao testar credenciais via edge function');
      }

      if (data.success) {
        console.log(`✅ Credenciais ${env} válidas`);
        setCredentialStatus(prev => ({ ...prev, [env]: 'valid' }));
        toast({
          title: "✅ Credenciais Válidas",
          description: data.message
        });
        return true;
      } else {
        throw new Error(data.error || 'Credenciais inválidas');
      }
    } catch (error) {
      console.error(`❌ Erro ao testar credenciais ${env}:`, error);
      setCredentialStatus(prev => ({ ...prev, [env]: 'invalid' }));
      
      let errorMessage = 'Erro ao conectar com MercadoPago';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      toast({
        title: "❌ Credenciais Inválidas",
        description: `Erro ao conectar com ${env === 'sandbox' ? 'Sandbox' : 'Produção'}: ${errorMessage}`,
        variant: "destructive"
      });
      return false;
    } finally {
      setTestingCredentials(false);
    }
  };

  const handleSave = async () => {
    console.log('💾 Iniciando salvamento - Ambiente atual:', environment);
    console.log('🔑 Credenciais disponíveis:', {
      hasProductionKeys: !!(credentials.publicKeyProd && credentials.accessTokenProd),
      hasSandboxKeys: !!(credentials.publicKeySandbox && credentials.accessTokenSandbox),
      environment
    });

    // Validar credenciais baseado no ambiente ativo
    if (environment === 'production') {
      console.log('🚀 Validando credenciais de PRODUÇÃO...');
      
      // Em produção, exigir apenas credenciais de produção
      if (!credentials.publicKeyProd || !credentials.accessTokenProd) {
        console.error('❌ Credenciais de produção faltando:', {
          hasPublicKey: !!credentials.publicKeyProd,
          hasAccessToken: !!credentials.accessTokenProd
        });
        toast({
          title: "⚠️ Credenciais de Produção Obrigatórias",
          description: "Para usar em produção, as credenciais de produção são obrigatórias",
          variant: "destructive"
        });
        return;
      }

      // Validar formato das credenciais de produção
      console.log('🔍 Validando formato das credenciais de produção...');
      if (!validateCredentialFormat('production', credentials.publicKeyProd, credentials.accessTokenProd)) {
        console.error('❌ Formato inválido das credenciais de produção');
        toast({
          title: "⚠️ Formato Inválido",
          description: "Credenciais de Produção devem começar com APP_USR-",
          variant: "destructive"
        });
        return;
      }
      
      console.log('✅ Credenciais de produção validadas com sucesso!');
    } else {
      console.log('🧪 Validando credenciais de SANDBOX...');
      
      // Em sandbox, exigir apenas credenciais de sandbox
      if (!credentials.publicKeySandbox || !credentials.accessTokenSandbox) {
        console.error('❌ Credenciais de sandbox faltando');
        toast({
          title: "⚠️ Credenciais de Sandbox Obrigatórias",
          description: "Para usar em sandbox, as credenciais de sandbox são obrigatórias",
          variant: "destructive"
        });
        return;
      }

      // Validar formato das credenciais de sandbox
      if (!validateCredentialFormat('sandbox', credentials.publicKeySandbox, credentials.accessTokenSandbox)) {
        console.error('❌ Formato inválido das credenciais de sandbox');
        toast({
          title: "⚠️ Formato Inválido",
          description: "Credenciais de Sandbox devem começar com TEST-",
          variant: "destructive"
        });
        return;
      }
      
      console.log('✅ Credenciais de sandbox validadas com sucesso!');
    }

    setLoading(true);
    
    try {
      console.log('💾 Salvando configurações MercadoPago...', { environment, hasGateway: !!existingGateway });
      
      const gatewayData = {
        name: 'Mercado Pago',
        type: 'mercado_pago' as const,
        status: 'conectado' as const,
        environment,
        credentials
      };

      if (existingGateway) {
        console.log('🔄 Atualizando gateway existente:', existingGateway.id);
        
        // Aguardar a operação de atualização
        const result = await updateGateway(existingGateway.id, gatewayData);
        
        if (!result) {
          throw new Error('Falha ao atualizar gateway');
        }
        
        console.log('✅ Gateway atualizado com sucesso:', result);
        toast({
          title: "✅ Gateway Atualizado",
          description: "Credenciais do Mercado Pago atualizadas com sucesso!"
        });
      } else {
        console.log('➕ Criando novo gateway MercadoPago');
        
        // Aguardar a operação de criação
        const result = await addGateway(gatewayData);
        
        if (!result) {
          throw new Error('Falha ao criar gateway');
        }
        
        console.log('✅ Gateway criado com sucesso:', result);
        toast({
          title: "✅ Gateway Configurado",
          description: "Mercado Pago configurado com sucesso!"
        });
      }

      // Aguardar um pouco para sincronização
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      onSave?.();
    } catch (error) {
      console.error('❌ Erro ao salvar configurações:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast({
        title: "❌ Erro ao Salvar",
        description: `Erro ao salvar configurações do Mercado Pago: ${errorMessage}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'testing': return <AlertCircle className="h-4 w-4 text-yellow-400 animate-spin" />;
      case 'valid': return <CheckCircle className="h-4 w-4 text-green-400" />;
      case 'invalid': return <XCircle className="h-4 w-4 text-red-400" />;
      default: return null;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <CreditCard className="h-5 w-5 text-blue-400" />
          Configuração Mercado Pago
          {existingGateway && (
            <span className="text-sm text-green-400 font-normal">
              ✅ Configurado
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Environment Selection */}
        <div className="space-y-2">
          <Label className="text-gray-300">Ambiente Ativo</Label>
          <div className="flex items-center space-x-3 p-3 bg-gray-700/50 rounded-lg">
            <TestTube className="h-4 w-4 text-orange-400" />
            <span className="text-gray-300">Sandbox</span>
            <Switch
              checked={environment === 'production'}
              onCheckedChange={(checked) => setEnvironment(checked ? 'production' : 'sandbox')}
            />
            <span className="text-gray-300">Produção</span>
            <Rocket className="h-4 w-4 text-green-400" />
          </div>
          <p className="text-xs text-gray-400">
            {environment === 'sandbox' 
              ? '🧪 Modo teste - Use credenciais de sandbox para testar pagamentos'
              : '🚀 Modo produção - Pagamentos reais serão processados'
            }
          </p>
        </div>

        <Tabs defaultValue="sandbox" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-gray-700">
            <TabsTrigger value="sandbox" className="text-gray-300 data-[state=active]:bg-orange-600 flex items-center gap-2">
              🧪 Sandbox
              {getStatusIcon(credentialStatus.sandbox)}
            </TabsTrigger>
            <TabsTrigger value="production" className="text-gray-300 data-[state=active]:bg-green-600 flex items-center gap-2">
              🚀 Produção
              {getStatusIcon(credentialStatus.production)}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="sandbox" className="space-y-4">
            <div className="space-y-4 p-4 bg-orange-500/10 rounded-lg border border-orange-500/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-orange-400">
                  <TestTube className="h-4 w-4" />
                  <span className="font-medium">Credenciais de Teste</span>
                </div>
                {getStatusIcon(credentialStatus.sandbox)}
              </div>
              
              <div className="space-y-2">
                <Label className="text-gray-300">Public Key (Sandbox) *</Label>
                <Input
                  type={showCredentials ? "text" : "password"}
                  value={credentials.publicKeySandbox}
                  onChange={(e) => {
                    setCredentials(prev => ({ ...prev, publicKeySandbox: e.target.value }));
                    setCredentialStatus(prev => ({ ...prev, sandbox: 'untested' }));
                  }}
                  placeholder="TEST-..."
                  className="bg-gray-700 border-gray-600 text-white font-mono text-sm"
                />
                <p className="text-xs text-gray-400">Deve começar com TEST-</p>
              </div>
              
              <div className="space-y-2">
                <Label className="text-gray-300">Access Token (Sandbox) *</Label>
                <Input
                  type={showCredentials ? "text" : "password"}
                  value={credentials.accessTokenSandbox}
                  onChange={(e) => {
                    setCredentials(prev => ({ ...prev, accessTokenSandbox: e.target.value }));
                    setCredentialStatus(prev => ({ ...prev, sandbox: 'untested' }));
                  }}
                  placeholder="TEST-..."
                  className="bg-gray-700 border-gray-600 text-white font-mono text-sm"
                />
                <p className="text-xs text-gray-400">Deve começar com TEST-</p>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={() => testCredentials('sandbox')}
                disabled={testingCredentials || !credentials.publicKeySandbox || !credentials.accessTokenSandbox}
                className="w-full border-orange-500 text-orange-400 hover:bg-orange-500/20"
              >
                {credentialStatus.sandbox === 'testing' ? '🔄 Testando...' : '🧪 Testar Credenciais Sandbox'}
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="production" className="space-y-4">
            <div className="space-y-4 p-4 bg-green-500/10 rounded-lg border border-green-500/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-green-400">
                  <Rocket className="h-4 w-4" />
                  <span className="font-medium">Credenciais de Produção</span>
                </div>
                {getStatusIcon(credentialStatus.production)}
              </div>
              
              <div className="space-y-2">
                <Label className="text-gray-300">Public Key (Produção)</Label>
                <Input
                  type={showCredentials ? "text" : "password"}
                  value={credentials.publicKeyProd}
                  onChange={(e) => {
                    setCredentials(prev => ({ ...prev, publicKeyProd: e.target.value }));
                    setCredentialStatus(prev => ({ ...prev, production: 'untested' }));
                  }}
                  placeholder="APP_USR-..."
                  className="bg-gray-700 border-gray-600 text-white font-mono text-sm"
                />
                <p className="text-xs text-gray-400">Deve começar com APP_USR-</p>
              </div>
              
              <div className="space-y-2">
                <Label className="text-gray-300">Access Token (Produção)</Label>
                <Input
                  type={showCredentials ? "text" : "password"}
                  value={credentials.accessTokenProd}
                  onChange={(e) => {
                    setCredentials(prev => ({ ...prev, accessTokenProd: e.target.value }));
                    setCredentialStatus(prev => ({ ...prev, production: 'untested' }));
                  }}
                  placeholder="APP_USR-..."
                  className="bg-gray-700 border-gray-600 text-white font-mono text-sm"
                />
                <p className="text-xs text-gray-400">Deve começar com APP_USR-</p>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={() => testCredentials('production')}
                disabled={testingCredentials || !credentials.publicKeyProd || !credentials.accessTokenProd}
                className="w-full border-green-500 text-green-400 hover:bg-green-500/20"
              >
                {credentialStatus.production === 'testing' ? '🔄 Testando...' : '🚀 Testar Credenciais Produção'}
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowCredentials(!showCredentials)}
            className="flex items-center gap-2"
          >
            {showCredentials ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {showCredentials ? 'Ocultar' : 'Mostrar'}
          </Button>
        </div>

        {(gatewayError || gatewayLoading) && (
          <div className="p-3 bg-gray-800/50 rounded-lg">
            {gatewayLoading && (
              <div className="flex items-center gap-2 text-blue-400">
                <div className="animate-spin w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full"></div>
                <span>Salvando configurações...</span>
              </div>
            )}
            {gatewayError && (
              <div className="text-red-400 text-sm">
                <strong>Erro:</strong> {gatewayError}
              </div>
            )}
          </div>
        )}

        <Button 
          onClick={handleSave} 
          disabled={loading || gatewayLoading}
          className="w-full bg-blue-600 hover:bg-blue-700"
        >
          {(loading || gatewayLoading) ? '💾 Salvando...' : existingGateway ? '💾 Atualizar Configurações' : '💾 Salvar Configurações'}
        </Button>

        <div className="text-sm text-gray-400 space-y-1 p-3 bg-gray-800/50 rounded-lg">
          <p className="font-medium">📝 Como obter suas credenciais:</p>
          <p>1. Acesse o <a href="https://www.mercadopago.com.br/developers" target="_blank" className="text-blue-400 hover:underline">Painel do Desenvolvedor</a></p>
          <p>2. Crie ou selecione sua aplicação</p>
          <p>3. Copie suas credenciais de teste e produção</p>
          <p>4. Use credenciais TEST- para sandbox e APP_USR- para produção</p>
          <div className="mt-2 p-2 bg-blue-500/10 border border-blue-500/30 rounded text-blue-300">
            <p className="font-medium">✨ Modo Flexível:</p>
            <p className="text-xs">• <strong>Sandbox:</strong> Apenas credenciais TEST- são obrigatórias</p>
            <p className="text-xs">• <strong>Produção:</strong> Apenas credenciais APP_USR- são obrigatórias</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
