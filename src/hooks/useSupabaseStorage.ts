
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useSupabaseStorage = () => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const uploadFile = async (
    file: File,
    bucket: string,
    path?: string
  ): Promise<string | null> => {
    try {
      setUploading(true);
      setUploadProgress(0);

      // Generate unique filename if path not provided
      const fileName = path || `${Date.now()}-${file.name}`;
      
      console.log('📤 Iniciando upload para Supabase Storage:', {
        bucket,
        fileName,
        fileSize: file.size,
        fileType: file.type
      });

      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('❌ Erro no upload:', error);
        throw error;
      }

      console.log('✅ Upload concluído:', data);

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);

      console.log('🔗 URL pública gerada:', publicUrl);
      
      setUploadProgress(100);
      return publicUrl;
    } catch (error) {
      console.error('❌ Erro no upload:', error);
      throw error;
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const deleteFile = async (
    bucket: string,
    path: string
  ): Promise<boolean> => {
    try {
      console.log('🗑️ Deletando arquivo:', { bucket, path });

      const { error } = await supabase.storage
        .from(bucket)
        .remove([path]);

      if (error) {
        console.error('❌ Erro ao deletar arquivo:', error);
        throw error;
      }

      console.log('✅ Arquivo deletado com sucesso');
      return true;
    } catch (error) {
      console.error('❌ Erro ao deletar arquivo:', error);
      return false;
    }
  };

  const getPublicUrl = (bucket: string, path: string): string => {
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);
    
    return publicUrl;
  };

  return {
    uploadFile,
    deleteFile,
    getPublicUrl,
    uploading,
    uploadProgress
  };
};
