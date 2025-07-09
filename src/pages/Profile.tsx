
import React, { useState, useRef, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera, User } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

export default function Profile() {
  const { currentUserEmail } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [profileImage, setProfileImage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Carregar dados do perfil do localStorage
    const userData = localStorage.getItem(`user_${currentUserEmail}`);
    if (userData) {
      const parsedData = JSON.parse(userData);
      setDisplayName(parsedData.displayName || '');
      setProfileImage(parsedData.profileImage || '');
    }
  }, [currentUserEmail]);

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      setProfileImage(imageUrl);
    }
  };

  const handleSaveChanges = () => {
    // Salvar alterações no localStorage
    const userData = {
      email: currentUserEmail,
      displayName,
      profileImage
    };
    
    localStorage.setItem(`user_${currentUserEmail}`, JSON.stringify(userData));
    toast.success('Perfil atualizado com sucesso!');
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Meu Perfil
        </h1>

        <Card className="rounded-lg border border-white/10 bg-white/5 backdrop-blur-lg shadow-xl">
          <CardHeader>
            <CardTitle className="text-xl text-gray-900 dark:text-white">
              Informações Pessoais
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Foto de Perfil */}
            <div className="flex items-center space-x-6">
              <div className="relative">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={profileImage} alt="Foto de perfil" />
                  <AvatarFallback className="text-2xl">
                    <User className="h-12 w-12" />
                  </AvatarFallback>
                </Avatar>
                <Button
                  size="sm"
                  variant="secondary"
                  className="absolute -bottom-2 -right-2 rounded-full p-2"
                  onClick={triggerFileInput}
                >
                  <Camera className="h-4 w-4" />
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Foto de Perfil
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Clique no ícone da câmera para alterar sua foto
                </p>
              </div>
            </div>

            {/* Nome Completo */}
            <div className="space-y-2">
              <Label htmlFor="displayName" className="text-gray-900 dark:text-white">
                Nome Completo
              </Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Digite seu nome completo"
                className="bg-white/10 border-white/20 text-gray-900 dark:text-white placeholder:text-gray-500"
              />
            </div>

            {/* E-mail (Somente Leitura) */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-900 dark:text-white">
                E-mail
              </Label>
              <Input
                id="email"
                value={currentUserEmail || ''}
                readOnly
                className="bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                O e-mail não pode ser alterado
              </p>
            </div>

            {/* Botão Salvar */}
            <Button onClick={handleSaveChanges} className="w-full">
              Salvar Alterações
            </Button>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
