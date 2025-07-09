
import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useDomainContext } from '@/context/DomainContext';
import { useToast } from '@/hooks/use-toast';
import { Globe, CheckCircle, Clock, XCircle, Copy, Trash2, AlertTriangle } from 'lucide-react';

const Domain = () => {
  const { customDomain, saveDomain, deleteDomain, simulateVerification } = useDomainContext();
  const { toast } = useToast();
  const [hostname, setHostname] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDnsInstructions, setShowDnsInstructions] = useState(false);

  const handleSaveDomain = async () => {
    if (!hostname.trim()) {
      toast({
        title: "Erro",
        description: "Por favor, digite um domínio válido",
        variant: "destructive"
      });
      return;
    }

    // Validação básica do formato do domínio
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]\.[a-zA-Z.]{2,}$/;
    if (!domainRegex.test(hostname)) {
      toast({
        title: "Erro",
        description: "Por favor, digite um domínio válido (ex: checkout.minhaloja.com)",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const newDomain = await saveDomain(hostname);
      setHostname('');
      setShowDnsInstructions(true);
      
      toast({
        title: "Domínio adicionado!",
        description: "Configure o DNS conforme as instruções para ativá-lo"
      });

      // Iniciar simulação de verificação
      simulateVerification(newDomain.id);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao salvar domínio. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDomain = () => {
    const confirmed = window.confirm(
      "Você tem certeza que deseja remover este domínio? Todos os checkouts que o utilizam voltarão para o domínio padrão."
    );
    
    if (confirmed) {
      deleteDomain();
      toast({
        title: "Domínio removido",
        description: "O domínio foi removido com sucesso"
      });
    }
  };

  const copyDnsRecord = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copiado!",
        description: "Registro DNS copiado para a área de transferência"
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível copiar. Tente selecionar o texto manualmente.",
        variant: "destructive"
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verificado':
        return (
          <Badge className="bg-green-500/10 text-green-400 border-green-500/20">
            <CheckCircle className="w-3 h-3 mr-1" />
            Verificado
          </Badge>
        );
      case 'pendente':
        return (
          <Badge className="bg-yellow-500/10 text-yellow-400 border-yellow-500/20">
            <Clock className="w-3 h-3 mr-1" />
            Verificando...
          </Badge>
        );
      case 'erro':
        return (
          <Badge variant="destructive">
            <XCircle className="w-3 h-3 mr-1" />
            Erro
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 p-6 rounded-lg border border-blue-500/20">
          <div className="flex items-center space-x-3 mb-3">
            <Globe className="h-6 w-6 text-blue-400" />
            <h1 className="text-2xl font-bold text-white">Domínio Personalizado</h1>
          </div>
          <p className="text-gray-300">
            Configure seu próprio domínio para criar links de checkout mais profissionais e memoráveis
          </p>
        </div>

        {/* Card Principal */}
        <Card className="rounded-lg border border-white/10 bg-white/5 backdrop-blur-lg bg-gradient-to-b from-purple-500/10 to-transparent">
          <CardHeader>
            <CardTitle className="text-white flex items-center space-x-2">
              <Globe className="h-5 w-5" />
              <span>Configuração de Domínio</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {!customDomain ? (
              /* Formulário para adicionar domínio */
              <div className="space-y-4">
                <div>
                  <Label htmlFor="hostname" className="text-gray-300">
                    Seu Domínio Personalizado
                  </Label>
                  <p className="text-sm text-gray-400 mb-2">
                    Digite o subdomínio que você quer usar (ex: checkout.minhaloja.com)
                  </p>
                  <Input
                    id="hostname"
                    placeholder="checkout.minhaloja.com"
                    value={hostname}
                    onChange={(e) => setHostname(e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>

                <Alert className="bg-blue-500/10 border-blue-500/20">
                  <AlertTriangle className="h-4 w-4 text-blue-400" />
                  <AlertDescription className="text-blue-300">
                    <strong>Importante:</strong> Você precisará ter acesso às configurações de DNS do seu domínio para completar a configuração.
                  </AlertDescription>
                </Alert>

                <Button
                  onClick={handleSaveDomain}
                  disabled={loading}
                  className="bg-violet-600 hover:bg-violet-700"
                >
                  {loading ? 'Salvando...' : 'Adicionar Domínio'}
                </Button>
              </div>
            ) : (
              /* Domínio configurado */
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Globe className="h-5 w-5 text-blue-400" />
                    <div>
                      <p className="text-white font-medium">{customDomain.hostname}</p>
                      <p className="text-sm text-gray-400">
                        Configurado em {new Date(customDomain.createdAt).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    {getStatusBadge(customDomain.status)}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleDeleteDomain}
                      className="text-gray-400 hover:text-red-400"
                      title="Remover domínio"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {customDomain.status === 'pendente' && (
                  <Alert className="bg-yellow-500/10 border-yellow-500/20">
                    <Clock className="h-4 w-4 text-yellow-400" />
                    <AlertDescription className="text-yellow-300">
                      Aguardando verificação do DNS. Configure o registro CNAME conforme as instruções abaixo.
                    </AlertDescription>
                  </Alert>
                )}

                {customDomain.status === 'verificado' && (
                  <Alert className="bg-green-500/10 border-green-500/20">
                    <CheckCircle className="h-4 w-4 text-green-400" />
                    <AlertDescription className="text-green-300">
                      <strong>Domínio verificado!</strong> Seus checkouts agora podem usar este domínio personalizado.
                    </AlertDescription>
                  </Alert>
                )}

                <Button
                  variant="outline"
                  onClick={() => setShowDnsInstructions(true)}
                  className="border-gray-600 text-gray-300 hover:bg-gray-700"
                >
                  Ver Instruções de DNS
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Modal com instruções de DNS */}
        <Dialog open={showDnsInstructions} onOpenChange={setShowDnsInstructions}>
          <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-2xl">
            <DialogHeader>
              <DialogTitle>Configuração DNS</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-gray-300">
                Para seu domínio funcionar, configure o seguinte registro CNAME no seu provedor de domínio:
              </p>
              
              <div className="bg-gray-900 p-4 rounded-lg border border-gray-600">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <Label className="text-gray-400">Tipo</Label>
                    <div className="flex items-center space-x-2 mt-1">
                      <code className="bg-gray-700 px-2 py-1 rounded text-white">CNAME</code>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => copyDnsRecord('CNAME')}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Label className="text-gray-400">Host/Nome</Label>
                    <div className="flex items-center space-x-2 mt-1">
                      <code className="bg-gray-700 px-2 py-1 rounded text-white">
                        {customDomain?.hostname.split('.')[0] || 'checkout'}
                      </code>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => copyDnsRecord(customDomain?.hostname.split('.')[0] || 'checkout')}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Label className="text-gray-400">Apontar para</Label>
                    <div className="flex items-center space-x-2 mt-1">
                      <code className="bg-gray-700 px-2 py-1 rounded text-white">custom.supercheckout.app</code>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => copyDnsRecord('custom.supercheckout.app')}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <Alert className="bg-blue-500/10 border-blue-500/20">
                <AlertTriangle className="h-4 w-4 text-blue-400" />
                <AlertDescription className="text-blue-300">
                  <strong>Importante:</strong> As alterações de DNS podem levar até 24 horas para se propagarem completamente. 
                  Nossa verificação automática acontece a cada few minutos.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <h4 className="font-medium text-white">Exemplos de provedores populares:</h4>
                <ul className="text-sm text-gray-300 space-y-1">
                  <li>• <strong>Cloudflare:</strong> DNS → Records → Add record</li>
                  <li>• <strong>GoDaddy:</strong> DNS Management → DNS Records</li>
                  <li>• <strong>Namecheap:</strong> Domain List → Manage → Advanced DNS</li>
                  <li>• <strong>Registro.br:</strong> Painel → DNS → Gerenciar</li>
                </ul>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default Domain;
