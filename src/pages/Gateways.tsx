
import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Settings, Trash2, TestTube, Rocket } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { useGatewayContext } from '@/context/GatewayContext';
import { useToast } from '@/hooks/use-toast';
import { MercadoPagoSettings } from '@/components/forms/checkout/MercadoPagoSettings';

const Gateways = () => {
  const { gateways, deleteGateway } = useGatewayContext();
  const { toast } = useToast();
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

  const handleConfigSave = () => {
    setIsConfigModalOpen(false);
    toast({
      title: "✅ Configuração Salva",
      description: "Gateway do Mercado Pago configurado com sucesso!"
    });
  };

  const handleDisconnect = async (gatewayId: string) => {
    const confirmed = window.confirm('Tem certeza que deseja desconectar este gateway?');
    if (confirmed) {
      try {
        console.log('🗑️ Iniciando desconexão do gateway:', gatewayId);
        
        const success = await deleteGateway(gatewayId);
        
        if (success) {
          toast({
            title: "🗑️ Gateway Desconectado",
            description: "O gateway foi desconectado com sucesso."
          });
        } else {
          throw new Error('Falha ao desconectar gateway');
        }
      } catch (error) {
        console.error('❌ Erro ao desconectar gateway:', error);
        toast({
          title: "❌ Erro ao Desconectar",
          description: "Erro ao desconectar o gateway. Tente novamente.",
          variant: "destructive"
        });
      }
    }
  };

  const mercadoPagoGateway = gateways.find(g => g.type === 'mercado_pago');

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Gateways de Pagamento</h1>
          <p className="text-gray-400 mt-2">
            Configure os processadores de pagamento para seus checkouts
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Mercado Pago Card */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                    <CreditCard className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-white">Mercado Pago</CardTitle>
                    <p className="text-gray-400 text-sm">Gateway de pagamento</p>
                  </div>
                </div>
                {mercadoPagoGateway && (
                  <div className="flex items-center gap-2">
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                      ✅ Conectado
                    </Badge>
                    <Badge variant="outline" className="flex items-center gap-1">
                      {mercadoPagoGateway.environment === 'production' ? (
                        <>
                          <Rocket className="h-3 w-3" />
                          Produção
                        </>
                      ) : (
                        <>
                          <TestTube className="h-3 w-3" />
                          Sandbox
                        </>
                      )}
                    </Badge>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-300 text-sm">
                Processe pagamentos via PIX, cartão de crédito e boleto usando a API do Mercado Pago.
              </p>
              
              {mercadoPagoGateway ? (
                <div className="flex space-x-2">
                  <Dialog open={isConfigModalOpen} onOpenChange={setIsConfigModalOpen}>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700"
                      >
                        <Settings className="w-4 h-4 mr-2" />
                        Configurar
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-gray-800 border-gray-700 max-w-2xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle className="text-white">Configurar Mercado Pago</DialogTitle>
                      </DialogHeader>
                      <MercadoPagoSettings onSave={handleConfigSave} />
                    </DialogContent>
                  </Dialog>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleDisconnect(mercadoPagoGateway.id)}
                    className="border-red-600 text-red-400 hover:bg-red-900/20"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <Dialog open={isConfigModalOpen} onOpenChange={setIsConfigModalOpen}>
                  <DialogTrigger asChild>
                    <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                      Conectar Mercado Pago
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-gray-800 border-gray-700 max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="text-white">Configurar Mercado Pago</DialogTitle>
                    </DialogHeader>
                    <MercadoPagoSettings onSave={handleConfigSave} />
                  </DialogContent>
                </Dialog>
              )}
            </CardContent>
          </Card>

          {/* Placeholder para outros gateways */}
          <Card className="bg-gray-800 border-gray-700 opacity-50">
            <CardHeader className="pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gray-600 rounded-lg flex items-center justify-center">
                  <CreditCard className="w-6 h-6 text-gray-400" />
                </div>
                <div>
                  <CardTitle className="text-gray-400">PagSeguro</CardTitle>
                  <p className="text-gray-500 text-sm">Em breve</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button disabled className="w-full">
                Em breve
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700 opacity-50">
            <CardHeader className="pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gray-600 rounded-lg flex items-center justify-center">
                  <CreditCard className="w-6 h-6 text-gray-400" />
                </div>
                <div>
                  <CardTitle className="text-gray-400">Stripe</CardTitle>
                  <p className="text-gray-500 text-sm">Em breve</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button disabled className="w-full">
                Em breve
              </Button>
            </CardContent>
          </Card>
        </div>

        {mercadoPagoGateway && (
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Gateway Conectado</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-300">Gateway</Label>
                  <p className="text-white font-medium">{mercadoPagoGateway.name}</p>
                </div>
                <div>
                  <Label className="text-gray-300">Status</Label>
                  <p className="text-green-400 font-medium">Conectado</p>
                </div>
                <div>
                  <Label className="text-gray-300">Ambiente</Label>
                  <p className="text-gray-400 font-medium flex items-center gap-2">
                    {mercadoPagoGateway.environment === 'production' ? (
                      <>
                        <Rocket className="h-4 w-4 text-green-400" />
                        Produção
                      </>
                    ) : (
                      <>
                        <TestTube className="h-4 w-4 text-orange-400" />
                        Sandbox
                      </>
                    )}
                  </p>
                </div>
                <div>
                  <Label className="text-gray-300">Public Key</Label>
                  <p className="text-gray-400 font-mono text-sm">
                    {(mercadoPagoGateway.credentials.publicKeySandbox || mercadoPagoGateway.credentials.publicKey || '').substring(0, 20)}...
                  </p>
                </div>
                <div>
                  <Label className="text-gray-300">Conectado em</Label>
                  <p className="text-gray-400">{mercadoPagoGateway.createdAt}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default Gateways;
