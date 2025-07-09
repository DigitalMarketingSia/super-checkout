import React, { useState } from 'react';
import { 
  validateCPF, 
  validateEmail, 
  validatePhone, 
  validateName,
  formatCPF, 
  formatPhone 
} from '@/utils/formValidation';

interface ValidatedInputProps {
  type: 'text' | 'email' | 'tel' | 'cpf';
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  className?: string;
}

export const ValidatedInput = ({
  type,
  placeholder,
  value,
  onChange,
  required = false,
  className = ""
}: ValidatedInputProps) => {
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newValue = e.target.value;
    
    // Aplicar máscaras conforme o tipo
    switch (type) {
      case 'cpf':
        newValue = formatCPF(newValue);
        break;
      case 'tel':
        newValue = formatPhone(newValue);
        break;
    }
    
    onChange(newValue);
    
    // Limpar erro quando usuário começar a digitar
    if (error) setError(null);
  };

  const handleBlur = () => {
    setTouched(true);
    
    if (!value && required) {
      setError('Este campo é obrigatório');
      return;
    }
    
    if (!value) return;
    
    // Validar conforme o tipo
    switch (type) {
      case 'cpf':
        if (!validateCPF(value)) {
          setError('CPF inválido');
        }
        break;
      case 'email':
        if (!validateEmail(value)) {
          setError('E-mail inválido');
        }
        break;
      case 'tel':
        if (!validatePhone(value)) {
          setError('Telefone inválido');
        }
        break;
      case 'text':
        if (!validateName(value)) {
          setError('Digite seu nome completo');
        }
        break;
    }
  };

  const inputType = type === 'cpf' ? 'text' : type;
  const hasError = touched && error;

  return (
    <div className="w-full">
      <input
        type={inputType}
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        className={`${className} ${hasError ? 'border-red-500 bg-red-50' : ''}`}
        required={required}
        maxLength={type === 'cpf' ? 14 : type === 'tel' ? 15 : undefined}
      />
      {hasError && (
        <div className="text-red-600 text-xs mt-1 px-2">
          {error}
        </div>
      )}
    </div>
  );
};