
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Upload, X, Loader2 } from 'lucide-react';
import { useSupabaseStorage } from '@/hooks/useSupabaseStorage';
import { toast } from '@/hooks/use-toast';
import { useRef } from 'react';

interface HeaderImageUploadProps {
  headerImageUrl: string | null;
  onImageUpload: (imageUrl: string | null) => void;
}

export const HeaderImageUpload = ({
  headerImageUrl,
  onImageUpload
}: HeaderImageUploadProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadFile, deleteFile, uploading } = useSupabaseStorage();

  const extractPathFromUrl = (url: string): string | null => {
    try {
      const urlParts = url.split('/storage/v1/object/public/imagens-produtos/');
      return urlParts.length > 1 ? urlParts[1] : null;
    } catch {
      return null;
    }
  };

  const handleFileSelect = async (file: File) => {
    if (file && file.type.startsWith('image/')) {
      try {
        console.log('📷 Fazendo upload da imagem de cabeçalho:', file.name);
        
        const publicUrl = await uploadFile(file, 'imagens-produtos');
        
        if (publicUrl) {
          onImageUpload(publicUrl);
          
          toast({
            title: "Upload concluído!",
            description: "Imagem de cabeçalho enviada com sucesso.",
          });
          
          console.log('✅ Upload da imagem de cabeçalho concluído:', publicUrl);
        }
      } catch (error) {
        console.error('❌ Erro no upload da imagem de cabeçalho:', error);
        
        toast({
          title: "Erro no upload",
          description: "Não foi possível enviar a imagem. Tente novamente.",
          variant: "destructive",
        });
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleRemoveImage = async () => {
    if (headerImageUrl) {
      const filePath = extractPathFromUrl(headerImageUrl);
      if (filePath) {
        await deleteFile('imagens-produtos', filePath);
      }
    }
    
    onImageUpload(null);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-white">Imagem de Cabeçalho</h3>
      <div>
        <Label htmlFor="headerImage" className="text-gray-300">Imagem de Cabeçalho</Label>
        <div className="mt-2 space-y-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleUploadClick}
            disabled={uploading}
            className="w-full"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Selecionar Imagem
              </>
            )}
          </Button>
          
          {headerImageUrl && (
            <Button
              type="button"
              variant="destructive"
              onClick={handleRemoveImage}
              disabled={uploading}
              className="w-full"
            >
              <X className="w-4 h-4 mr-2" />
              Remover Imagem
            </Button>
          )}
        </div>
        
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
          disabled={uploading}
        />
      </div>
      
      {headerImageUrl && (
        <div className="mt-4">
          <p className="text-gray-300 mb-2">Pré-visualização:</p>
          <div className="relative">
            <img 
              src={headerImageUrl} 
              alt="Pré-visualização do cabeçalho"
              className="w-full max-w-md h-48 object-cover rounded-lg border border-gray-600"
            />
            {uploading && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                <Loader2 className="w-8 h-8 text-white animate-spin" />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
