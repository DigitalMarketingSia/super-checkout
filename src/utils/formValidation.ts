// Utilitários para validação e formatação de campos do formulário

/**
 * Valida CPF brasileiro
 */
export const validateCPF = (cpf: string): boolean => {
  // Remove caracteres não numéricos
  const cleanCPF = cpf.replace(/\D/g, '');
  
  // Verifica se tem 11 dígitos
  if (cleanCPF.length !== 11) return false;
  
  // Verifica se todos os dígitos são iguais (CPF inválido)
  if (/^(\d)\1{10}$/.test(cleanCPF)) return false;
  
  // Calcula primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCPF[i]) * (10 - i);
  }
  let firstDigit = 11 - (sum % 11);
  if (firstDigit >= 10) firstDigit = 0;
  
  // Calcula segundo dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCPF[i]) * (11 - i);
  }
  let secondDigit = 11 - (sum % 11);
  if (secondDigit >= 10) secondDigit = 0;
  
  // Verifica se os dígitos calculados conferem
  return firstDigit === parseInt(cleanCPF[9]) && secondDigit === parseInt(cleanCPF[10]);
};

/**
 * Formata CPF com máscara
 */
export const formatCPF = (value: string): string => {
  const cleanValue = value.replace(/\D/g, '');
  
  if (cleanValue.length <= 3) return cleanValue;
  if (cleanValue.length <= 6) return `${cleanValue.slice(0, 3)}.${cleanValue.slice(3)}`;
  if (cleanValue.length <= 9) return `${cleanValue.slice(0, 3)}.${cleanValue.slice(3, 6)}.${cleanValue.slice(6)}`;
  return `${cleanValue.slice(0, 3)}.${cleanValue.slice(3, 6)}.${cleanValue.slice(6, 9)}-${cleanValue.slice(9, 11)}`;
};

/**
 * Formata telefone com máscara
 */
export const formatPhone = (value: string): string => {
  const cleanValue = value.replace(/\D/g, '');
  
  if (cleanValue.length <= 2) return cleanValue;
  if (cleanValue.length <= 6) return `(${cleanValue.slice(0, 2)}) ${cleanValue.slice(2)}`;
  if (cleanValue.length <= 10) return `(${cleanValue.slice(0, 2)}) ${cleanValue.slice(2, 6)}-${cleanValue.slice(6)}`;
  return `(${cleanValue.slice(0, 2)}) ${cleanValue.slice(2, 7)}-${cleanValue.slice(7, 11)}`;
};

/**
 * Valida email
 */
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Valida telefone brasileiro
 */
export const validatePhone = (phone: string): boolean => {
  const cleanPhone = phone.replace(/\D/g, '');
  // Aceita 10 ou 11 dígitos (com ou sem 9 no celular)
  return cleanPhone.length >= 10 && cleanPhone.length <= 11;
};

/**
 * Valida nome (mínimo 2 palavras)
 */
export const validateName = (name: string): boolean => {
  const trimmedName = name.trim();
  const words = trimmedName.split(/\s+/);
  return words.length >= 2 && words.every(word => word.length >= 2);
};

/**
 * Remove máscara de campo (deixa apenas números)
 */
export const removePhoneMask = (phone: string): string => {
  return phone.replace(/\D/g, '');
};

/**
 * Remove máscara de CPF (deixa apenas números)
 */
export const removeCPFMask = (cpf: string): string => {
  return cpf.replace(/\D/g, '');
};