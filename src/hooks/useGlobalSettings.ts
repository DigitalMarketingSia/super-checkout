
import { useState, useEffect, useCallback } from 'react';
import { useSupabaseSettings, GlobalSettings } from '@/hooks/useSupabaseSettings';

export const useGlobalSettings = () => {
  const { settings, loading, error, updateSettings, refetch } = useSupabaseSettings();

  const saveSettings = async (newSettings: GlobalSettings) => {
    const { error } = await updateSettings(newSettings);
    
    if (!error) {
      // Emit custom event for backward compatibility
      const event = new CustomEvent('globalSettingsUpdated', { 
        detail: newSettings 
      });
      window.dispatchEvent(event);
      
      // Trigger localStorage event for other components
      localStorage.setItem('settings_updated', Date.now().toString());
      localStorage.removeItem('settings_updated');
      
      console.log('🔄 Configurações atualizadas e eventos emitidos');
    }
    
    return { error };
  };

  return {
    globalSettings: settings,
    loading,
    error,
    reload: refetch,
    saveSettings,
  };
};
