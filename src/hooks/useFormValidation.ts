import { useCallback } from 'react';
import { CustomerFormData, CreditCardData } from '@/types/checkout';
import { FORM_FIELDS } from '@/constants';

export const useFormValidation = () => {
  const validateFormData = useCallback((formData: CustomerFormData, requiredFields: string[]) => {
    const missingFields = requiredFields.filter(field => {
      const fieldMap: Record<string, keyof CustomerFormData> = {
        [FORM_FIELDS.NAME]: 'nome',
        [FORM_FIELDS.EMAIL]: 'email', 
        [FORM_FIELDS.PHONE]: 'telefone',
        [FORM_FIELDS.CPF]: 'cpf'
      };
      return !formData[fieldMap[field]];
    });
    
    if (missingFields.length > 0) {
      throw new Error(`Preencha os seguintes campos obrigatórios: ${missingFields.join(', ')}`);
    }
  }, []);

  const validateCreditCardData = useCallback((creditCardData: CreditCardData) => {
    console.log('🔍 Validando dados do cartão...');
    console.log('📋 Dados do cartão recebidos:', {
      numero: creditCardData.numero ? `****${creditCardData.numero.slice(-4)}` : 'VAZIO',
      nome: creditCardData.nome || 'VAZIO',
      cpf: creditCardData.cpf || 'VAZIO',
      validade: creditCardData.validade || 'VAZIO',
      cvv: creditCardData.cvv ? '***' : 'VAZIO'
    });

    // Validar se todos os campos estão preenchidos
    const camposObrigatorios = ['numero', 'nome', 'cpf', 'validade', 'cvv'];
    const camposVazios = camposObrigatorios.filter(campo => !creditCardData[campo as keyof CreditCardData]);
    
    if (camposVazios.length > 0) {
      const erro = `❌ Preencha os seguintes campos do cartão: ${camposVazios.join(', ')}`;
      console.error(erro);
      throw new Error(`Preencha todos os campos do cartão de crédito: ${camposVazios.join(', ')}`);
    }

    // Validar formato básico
    if (creditCardData.numero.replace(/\s/g, '').length < 13) {
      const erro = '❌ Número do cartão deve ter pelo menos 13 dígitos';
      console.error(erro);
      throw new Error('Número do cartão inválido');
    }

    if (!creditCardData.validade.includes('/') || creditCardData.validade.length !== 5) {
      const erro = '❌ Validade deve estar no formato MM/AA';
      console.error(erro);
      throw new Error('Validade do cartão inválida (use MM/AA)');
    }

    console.log('✅ Dados do cartão validados com sucesso');
  }, []);

  return {
    validateFormData,
    validateCreditCardData
  };
};