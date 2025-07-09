
import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CustomerFormData } from '@/types/checkout';

export const useCustomerManagement = () => {
  
  const createOrFindCustomer = useCallback(async (formData: CustomerFormData) => {
    console.log('👤 Processando dados do cliente...');

    try {
      // Validar dados obrigatórios
      if (!formData.nome?.trim() || !formData.email?.trim()) {
        throw new Error('Nome e email são obrigatórios');
      }

      // Validar formato do email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        throw new Error('Formato de email inválido');
      }

      // Primeiro, tentar buscar cliente existente pelo email
      console.log('🔍 Buscando cliente existente por email:', formData.email);
      
      const { data: existingCustomer, error: findError } = await supabase
        .from('clientes')
        .select('*')
        .eq('email', formData.email.toLowerCase().trim())
        .maybeSingle(); // Use maybeSingle() para evitar erro quando não encontrar

      if (findError) {
        console.error('❌ Erro ao buscar cliente:', findError);
        // Não falhar por causa de erro de busca, continuar com criação
      }

      if (existingCustomer) {
        console.log('✅ Cliente já existe:', existingCustomer.id);
        
        // Verificar se precisa atualizar algum dado (apenas nome e CPF, pois telefone não existe na tabela)
        const needsUpdate = (
          existingCustomer.nome !== formData.nome ||
          existingCustomer.cpf !== (formData.cpf || null)
        );

        if (needsUpdate) {
          console.log('🔄 Atualizando dados do cliente...');
          
          const { data: updatedCustomer, error: updateError } = await supabase
            .from('clientes')
            .update({
              nome: formData.nome,
              cpf: formData.cpf || null
            })
            .eq('id', existingCustomer.id)
            .select()
            .single();

          if (updateError) {
            console.warn('⚠️ Falha ao atualizar cliente, usando dados antigos:', updateError);
            return existingCustomer;
          }

          return updatedCustomer;
        }

        return existingCustomer;
      }

      // Se não existe, criar novo cliente
      console.log('📝 Criando novo cliente...');
      const customerData = {
        nome: formData.nome.trim(),
        email: formData.email.toLowerCase().trim(),
        cpf: formData.cpf?.trim() || null
        // Note: telefone não está incluído pois não existe na tabela
      };

      const { data: newCustomer, error: createError } = await supabase
        .from('clientes')
        .insert(customerData)
        .select()
        .single();

      if (createError) {
        console.error('❌ Erro ao criar cliente:', createError);
        
        // Verificar se é erro de duplicata (por race condition)
        if (createError.code === '23505') {
          console.log('🔄 Cliente criado por outro processo, buscando novamente...');
          
          const { data: raceCustomer } = await supabase
            .from('clientes')
            .select('*')
            .eq('email', formData.email.toLowerCase().trim())
            .single();
            
          if (raceCustomer) {
            return raceCustomer;
          }
        }
        
        throw new Error('Falha ao registrar cliente: ' + createError.message);
      }

      console.log('✅ Cliente criado com ID:', newCustomer.id);
      return newCustomer;

    } catch (error) {
      console.error('❌ Erro no processo de cliente:', error);
      throw error;
    }
  }, []);

  const getCustomerById = useCallback(async (customerId: string) => {
    try {
      const { data: customer, error } = await supabase
        .from('clientes')
        .select('*')
        .eq('id', customerId)
        .single();

      if (error) {
        console.error('❌ Erro ao buscar cliente por ID:', error);
        return null;
      }

      return customer;
    } catch (error) {
      console.error('❌ Erro ao buscar cliente:', error);
      return null;
    }
  }, []);

  return {
    createOrFindCustomer,
    getCustomerById
  };
};
