// CAMADA DE DADOS (O Almoxarifado)
// Esta camada simula um banco de dados com dados de exemplo
// Função: Fornecer dados mockados para produtos e configurações de checkout

export interface Product {
  id: string;
  name: string;
  price: number;
  type: 'main' | 'bump';
  description?: string;
  image?: string;
  category?: string;
  originalPrice?: number;
  code?: string;
  redirectUrl?: string;
  hasUpsell?: boolean;
  hasOrderBump?: boolean;
  isActive?: boolean;
}

export interface CheckoutConfig {
  id: string;
  name: string;
  mainProductId: string;
  status: 'active' | 'inactive' | 'draft' | 'ativo' | 'inativo'; // Support both languages
  allowedOrderBumps: string[];
  requiredFormFields: string[] | ('name' | 'email' | 'phone' | 'cpf' | 'address')[]; // Support both formats
  paymentMethods: string[] | ('pix' | 'credit_card' | 'boleto')[]; // Support both formats
  createdAt?: string; // Make optional for compatibility
  domainId?: string | null; // Novo campo para domínio personalizado
  gatewayId?: string | null; // Novo campo para gateway de pagamento
  headerImageUrl?: string | null;
  upsellProductId?: string | null; // Novo campo para produto de upsell
  timerConfig?: {
    enabled: boolean;
    durationInSeconds?: number;
    backgroundColor?: string;
    text?: string;
    // Support new timer format
    minutes?: number;
    message?: string;
  } | null;
  // Additional fields for Supabase compatibility
  productId?: string;
}

export interface OrderCalculation {
  subtotal: number;
  totalBumps: number;
  totalFinal: number;
  items: {
    id: string;
    name: string;
    price: number;
    type: 'main' | 'bump';
  }[];
}

// Nova interface para Orders (Pedidos)
export interface Order {
  id: string;
  checkoutId: string;
  mainProduct: Product;
  orderBumps: Product[];
  upsellProduct: Product | null;
  totalAmount: number;
  status: 'paid' | 'refunded';
  createdAt: string;
  customerData: {
    nome: string;
    email: string;
    telefone?: string;
    cpf?: string;
  };
}

// Novas interfaces para vendas e configurações
export interface Sale {
  id: string;
  checkoutId: string;
  productId: string;
  customerName: string;
  customerEmail: string;
  amount: number;
  paymentMethod: 'pix' | 'credit_card' | 'boleto';
  status: 'pago' | 'pendente' | 'cancelado';
  date: string;
  utm?: string;
}

export interface GlobalSettings {
  footer: {
    textoIntrodutorio: string;
    emailSuporte: string;
    nomeEmpresa: string;
    nomeVendedor: string;
    textoSeguranca: string;
    linkTermosCompra: string;
    linkPoliticaPrivacidade: string;
    textoCopyright: string;
    exibirInformacoesLegais: boolean;
  };
  lastUpdated?: number;
}

// Mock Database - Produtos com tipos corretos
export const mockProducts: Product[] = [
  {
    id: 'prod_01',
    name: 'Curso Completo de Marketing Digital',
    price: 497.00,
    type: 'main',
    description: 'Aprenda todas as estratégias de marketing digital do zero ao avançado',
    image: '/placeholder.svg'
  },
  {
    id: 'prod_02',
    name: 'E-book: 50 Templates de Posts',
    price: 97.00,
    type: 'bump',
    description: 'Templates prontos para suas redes sociais',
    image: '/placeholder.svg'
  },
  {
    id: 'prod_03',
    name: 'Mentoria Individual 1h',
    price: 297.00,
    type: 'bump',
    description: 'Sessão individual de mentoria especializada',
    image: '/placeholder.svg'
  },
  {
    id: 'prod_04',
    name: 'Programa de Vendas Online',
    price: 897.00,
    type: 'main',
    description: 'Sistema completo para vender online',
    image: '/placeholder.svg'
  }
];

// Mock Database - Configurações de Checkout
export const mockCheckouts: CheckoutConfig[] = [
  {
    id: 'chk_01',
    name: 'Checkout - Curso Marketing Digital',
    mainProductId: 'prod_01',
    allowedOrderBumps: ['prod_02', 'prod_03'],
    requiredFormFields: ['name', 'email', 'phone', 'cpf'], // Updated to English
    paymentMethods: ['pix', 'credit_card', 'boleto'], // Updated to English
    status: 'active', // Updated to English
    createdAt: '2024-01-15',
    domainId: null,
    gatewayId: null,
    headerImageUrl: null,
    timerConfig: {
      enabled: true,
      durationInSeconds: 3600,
      backgroundColor: '#FF6B6B',
      text: 'Esta oferta exclusiva termina em:'
    }
  },
  {
    id: 'chk_02',
    name: 'Checkout - Programa de Vendas',
    mainProductId: 'prod_04',
    allowedOrderBumps: ['prod_02'],
    requiredFormFields: ['name', 'email'], // Updated to English
    paymentMethods: ['pix', 'boleto'], // Updated to English
    status: 'active', // Updated to English
    createdAt: '2024-01-10',
    domainId: null,
    gatewayId: null,
    headerImageUrl: null,
    timerConfig: null
  }
];

// Mock Database - Vendas
export const mockSales: Sale[] = [
  {
    id: 'sale_01',
    checkoutId: 'chk_01',
    productId: 'prod_01',
    customerName: 'João Silva',
    customerEmail: 'joao@email.com',
    amount: 497.00,
    paymentMethod: 'pix',
    status: 'pago',
    date: '2024-01-20',
    utm: 'facebook_ads'
  },
  {
    id: 'sale_02',
    checkoutId: 'chk_01',
    productId: 'prod_01',
    customerName: 'Maria Santos',
    customerEmail: 'maria@email.com',
    amount: 794.00,
    paymentMethod: 'credit_card',
    status: 'pago',
    date: '2024-01-18'
  },
  {
    id: 'sale_03',
    checkoutId: 'chk_02',
    productId: 'prod_04',
    customerName: 'Pedro Costa',
    customerEmail: 'pedro@email.com',
    amount: 897.00,
    paymentMethod: 'boleto',
    status: 'pendente',
    date: '2024-01-15'
  }
];

// Mock Database - Configurações Globais
export const mockGlobalSettings: GlobalSettings = {
  footer: {
    textoIntrodutorio: 'Este site é seguro e suas informações estão protegidas. Para dúvidas ou suporte, entre em contato:',
    emailSuporte: 'suporte@supercheckout.com',
    nomeEmpresa: 'Super Checkout',
    nomeVendedor: 'Equipe Super Checkout',
    textoSeguranca: '🔒 Compra 100% Segura - SSL Criptografado',
    linkTermosCompra: '/termos-de-compra',
    linkPoliticaPrivacidade: '/politica-de-privacidade',
    textoCopyright: '© 2024 Super Checkout - Todos os direitos reservados',
    exibirInformacoesLegais: true
  },
  lastUpdated: Date.now()
};

// Funções de API Mock
export const getProducts = (): Promise<Product[]> => {
  return new Promise((resolve) => {
    setTimeout(() => resolve(mockProducts), 300);
  });
};

export const getProductById = (id: string): Promise<Product | null> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const product = mockProducts.find(p => p.id === id);
      resolve(product || null);
    }, 200);
  });
};

export const getCheckouts = (): Promise<CheckoutConfig[]> => {
  return new Promise((resolve) => {
    setTimeout(() => resolve(mockCheckouts), 300);
  });
};

export const getCheckoutById = (id: string): Promise<CheckoutConfig | null> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const checkout = mockCheckouts.find(c => c.id === id);
      resolve(checkout || null);
    }, 200);
  });
};

// Funções para Produtos
export const createProduct = (product: Omit<Product, 'id'>): Product => {
  const newProduct = {
    ...product,
    id: `prod_${Date.now()}`
  };
  mockProducts.push(newProduct);
  return newProduct;
};

export const updateProduct = (id: string, updates: Partial<Product>): Product | null => {
  const index = mockProducts.findIndex(p => p.id === id);
  if (index === -1) return null;
  
  mockProducts[index] = { ...mockProducts[index], ...updates };
  return mockProducts[index];
};

export const deleteProduct = (id: string): boolean => {
  const index = mockProducts.findIndex(p => p.id === id);
  if (index === -1) return false;
  
  mockProducts.splice(index, 1);
  return true;
};

// Funções para Checkouts
export const createCheckout = (checkout: Omit<CheckoutConfig, 'id' | 'createdAt'>): CheckoutConfig => {
  const newCheckout = {
    ...checkout,
    id: `chk_${Date.now()}`,
    createdAt: new Date().toISOString().split('T')[0]
  };
  mockCheckouts.push(newCheckout);
  return newCheckout;
};

export const updateCheckout = (id: string, updates: Partial<CheckoutConfig>): CheckoutConfig | null => {
  const index = mockCheckouts.findIndex(c => c.id === id);
  if (index === -1) return null;
  
  mockCheckouts[index] = { ...mockCheckouts[index], ...updates };
  return mockCheckouts[index];
};

export const deleteCheckout = (id: string): boolean => {
  const index = mockCheckouts.findIndex(c => c.id === id);
  if (index === -1) return false;
  
  mockCheckouts.splice(index, 1);
  return true;
};

// Funções para Vendas
export const getSales = (): Promise<Sale[]> => {
  return new Promise((resolve) => {
    setTimeout(() => resolve(mockSales), 200);
  });
};

export const getSalesByPeriod = (startDate: string, endDate: string): Promise<Sale[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const filtered = mockSales.filter(sale => 
        sale.date >= startDate && sale.date <= endDate
      );
      resolve(filtered);
    }, 200);
  });
};

// Funções para Configurações Globais
export const getGlobalSettings = (): Promise<GlobalSettings> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log('📥 getGlobalSettings: Iniciando carregamento...');
      
      // Tenta carregar do localStorage primeiro
      const currentUserEmail = localStorage.getItem('currentUserEmail');
      console.log('👤 Usuário atual:', currentUserEmail);
      
      if (currentUserEmail) {
        const appData = JSON.parse(localStorage.getItem('app_data') || '{}');
        console.log('📦 Dados do app:', appData);
        
        if (appData[currentUserEmail]?.settings) {
          console.log('✅ Configurações encontradas no localStorage para:', currentUserEmail);
          console.log('📄 Configurações carregadas:', appData[currentUserEmail].settings);
          resolve(appData[currentUserEmail].settings);
          return;
        }
      }
      
      // Fallback para configurações padrão
      console.log('⚠️ Usando configurações padrão (fallback)');
      console.log('📄 Configurações padrão:', mockGlobalSettings);
      resolve(mockGlobalSettings);
    }, 100);
  });
};

export const updateGlobalSettings = (settings: GlobalSettings): Promise<GlobalSettings> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        console.log('💾 updateGlobalSettings: Iniciando salvamento...');
        console.log('📝 Configurações recebidas:', settings);
        
        // Adiciona timestamp de atualização
        const updatedSettings = {
          ...settings,
          lastUpdated: Date.now()
        };
        
        console.log('⏰ Timestamp adicionado:', updatedSettings.lastUpdated);
        
        // Atualiza o mock em memória
        Object.assign(mockGlobalSettings, updatedSettings);
        console.log('✅ Mock em memória atualizado');
        
        // Persiste no localStorage
        const currentUserEmail = localStorage.getItem('currentUserEmail');
        console.log('👤 Persistindo para usuário:', currentUserEmail);
        
        if (currentUserEmail) {
          const appData = JSON.parse(localStorage.getItem('app_data') || '{}');
          
          // Garante que a estrutura do usuário exista
          if (!appData[currentUserEmail]) {
            appData[currentUserEmail] = {};
            console.log('🏗️ Estrutura do usuário criada');
          }
          
          // Atualiza as configurações para o usuário atual
          appData[currentUserEmail].settings = updatedSettings;
          console.log('📝 Configurações atribuídas ao usuário');
          
          // Salva de volta no localStorage
          localStorage.setItem('app_data', JSON.stringify(appData));
          console.log('💾 Dados salvos no localStorage');
          
          // Verifica se foi salvo corretamente
          const verification = JSON.parse(localStorage.getItem('app_data') || '{}');
          if (verification[currentUserEmail]?.settings) {
            console.log('✅ Verificação: Dados salvos corretamente');
            console.log('📄 Dados verificados:', verification[currentUserEmail].settings);
          } else {
            console.error('❌ Verificação: Falha ao salvar dados');
            throw new Error('Falha na verificação do salvamento');
          }
          
        } else {
          console.warn('⚠️ Usuário não logado, configurações salvas apenas em memória');
        }
        
        console.log('🎉 updateGlobalSettings: Salvamento concluído com sucesso!');
        resolve(updatedSettings);
        
      } catch (error) {
        console.error('❌ updateGlobalSettings: Erro durante salvamento:', error);
        reject(error);
      }
    }, 200);
  });
};
