
import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, X, ImageIcon, Loader2 } from 'lucide-react';
import { useSupabaseStorage } from '@/hooks/useSupabaseStorage';
import { toast } from '@/hooks/use-toast';

interface ProductImageUploadProps {
  imageUrl?: string;
  onImageChange: (imageUrl: string | null) => void;
  className?: string;
}

export const ProductImageUpload: React.FC<ProductImageUploadProps> = ({
  imageUrl,
  onImageChange,
  className = ''
}) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(imageUrl || null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadFile, deleteFile, uploading, uploadProgress } = useSupabaseStorage();

  const extractPathFromUrl = (url: string): string | null => {
    try {
      // Extract path from Supabase Storage URL
      const urlParts = url.split('/storage/v1/object/public/imagens-produtos/');
      return urlParts.length > 1 ? urlParts[1] : null;
    } catch {
      return null;
    }
  };

  const handleFileSelect = async (file: File) => {
    if (file && file.type.startsWith('image/')) {
      try {
        console.log('📷 Processando upload da imagem:', file.name);
        
        // Create preview URL for immediate display
        const localPreviewUrl = URL.createObjectURL(file);
        setPreviewUrl(localPreviewUrl);

        // Upload to Supabase Storage
        const publicUrl = await uploadFile(file, 'imagens-produtos');
        
        if (publicUrl) {
          // Clean up local preview URL
          URL.revokeObjectURL(localPreviewUrl);
          
          // Update with Supabase URL
          setPreviewUrl(publicUrl);
          onImageChange(publicUrl);
          
          toast({
            title: "Upload concluído!",
            description: "Imagem enviada com sucesso para o servidor.",
          });
          
          console.log('✅ Upload concluído. URL salva:', publicUrl);
        }
      } catch (error) {
        console.error('❌ Erro no upload:', error);
        setPreviewUrl(null);
        
        toast({
          title: "Erro no upload",
          description: "Não foi possível enviar a imagem. Tente novamente.",
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: "Arquivo inválido",
        description: "Por favor, selecione apenas arquivos de imagem.",
        variant: "destructive",
      });
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
    
    const file = event.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleRemoveImage = async () => {
    if (previewUrl) {
      // Try to delete from Supabase Storage if it's a storage URL
      const filePath = extractPathFromUrl(previewUrl);
      if (filePath) {
        await deleteFile('imagens-produtos', filePath);
      }
    }
    
    setPreviewUrl(null);
    onImageChange(null);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="text-sm font-medium text-gray-300">Imagem do Produto</div>
      
      {previewUrl ? (
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-4">
            <div className="relative">
              <img
                src={previewUrl}
                alt="Preview do produto"
                className="w-full h-48 object-cover rounded-lg"
              />
              {!uploading && (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={handleRemoveImage}
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
              {uploading && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                  <div className="text-center text-white">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                    <p className="text-sm">Enviando... {uploadProgress}%</p>
                  </div>
                </div>
              )}
            </div>
            {!uploading && (
              <div className="mt-3 flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleUploadClick}
                  className="flex-1"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Trocar Imagem
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card 
          className={`bg-gray-800 border-gray-700 transition-colors ${
            isDragOver ? 'border-violet-500 bg-violet-500/10' : ''
          }`}
        >
          <CardContent 
            className="p-8 text-center cursor-pointer"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleUploadClick}
          >
            <div className="flex flex-col items-center space-y-4">
              <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center">
                {uploading ? (
                  <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
                ) : (
                  <ImageIcon className="w-8 h-8 text-gray-400" />
                )}
              </div>
              <div>
                <p className="text-gray-300 font-medium">
                  {uploading ? 'Enviando imagem...' : 'Clique para fazer upload ou arraste uma imagem'}
                </p>
                <p className="text-gray-500 text-sm mt-1">
                  {uploading ? `${uploadProgress}% concluído` : 'PNG, JPG, JPEG até 5MB'}
                </p>
              </div>
              {!uploading && (
                <Button type="button" variant="outline" size="sm">
                  <Upload className="w-4 h-4 mr-2" />
                  Selecionar Imagem
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
        disabled={uploading}
      />
    </div>
  );
};
