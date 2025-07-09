
import React, { useState } from 'react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Shield, Trash2, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

export default function AccountSettings() {
  const { currentUserEmail, logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handlePasswordChange = () => {
    if (!newPassword || !confirmPassword) {
      toast.error('Por favor, preencha todos os campos de senha.');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('A nova senha e a confirmação não coincidem.');
      return;
    }

    if (newPassword.length < 3) {
      toast.error('A senha deve ter pelo menos 3 caracteres.');
      return;
    }

    // Simulação: Como usamos senha fixa "123", apenas mostramos sucesso
    toast.success('Senha alterada com sucesso!');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleDeleteAccount = () => {
    const confirmed = window.confirm(
      'Você tem certeza? Esta ação é irreversível e todos os seus dados serão perdidos permanentemente.'
    );

    if (confirmed) {
      // Deletar todos os dados do usuário
      localStorage.removeItem(`user_${currentUserEmail}`);
      
      // Deletar dados específicos do usuário se existirem
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.includes(currentUserEmail || '')) {
          localStorage.removeItem(key);
        }
      });

      toast.success('Conta excluída com sucesso.');
      
      // Fazer logout após um breve delay
      setTimeout(() => {
        logout();
      }, 1000);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Configurações da Conta
        </h1>

        {/* Card de Alteração de Senha */}
        <Card className="rounded-lg border border-white/10 bg-white/5 backdrop-blur-lg shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-xl text-gray-900 dark:text-white">
              <Shield className="h-5 w-5" />
              <span>Alteração de Senha</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword" className="text-gray-900 dark:text-white">
                Senha Atual
              </Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Digite sua senha atual"
                className="bg-white/10 border-white/20 text-gray-900 dark:text-white placeholder:text-gray-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword" className="text-gray-900 dark:text-white">
                Nova Senha
              </Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Digite sua nova senha"
                className="bg-white/10 border-white/20 text-gray-900 dark:text-white placeholder:text-gray-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-gray-900 dark:text-white">
                Confirmar Nova Senha
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirme sua nova senha"
                className="bg-white/10 border-white/20 text-gray-900 dark:text-white placeholder:text-gray-500"
              />
            </div>

            <Button onClick={handlePasswordChange} className="w-full">
              Salvar Nova Senha
            </Button>
          </CardContent>
        </Card>

        {/* Card de Zona de Perigo */}
        <Card className="rounded-lg border border-red-500/20 bg-red-500/5 backdrop-blur-lg shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-xl text-red-600 dark:text-red-400">
              <AlertTriangle className="h-5 w-5" />
              <span>Zona de Perigo</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Excluir Conta
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Uma vez que você excluir sua conta, não há como voltar atrás. Por favor, tenha certeza.
              </p>
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
                  <div className="text-sm text-red-800 dark:text-red-200">
                    <p className="font-medium">Esta ação irá permanentemente:</p>
                    <ul className="mt-2 list-disc list-inside space-y-1">
                      <li>Excluir sua conta e perfil</li>
                      <li>Remover todos os seus produtos</li>
                      <li>Deletar todos os seus checkouts</li>
                      <li>Apagar todas as configurações</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <Separator className="bg-red-200 dark:bg-red-800" />

            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              className="w-full bg-red-600 hover:bg-red-700 text-white"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir minha conta permanentemente
            </Button>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
