import { CheckoutConfig, mockCheckouts } from '@/api/mockDatabase';

export const useCheckoutStorage = () => {
  // Obter dados do usuário atual
  const getUserData = (userEmail: string): CheckoutConfig[] => {
    try {
      const allUsersData = JSON.parse(localStorage.getItem('app_data') || '{}');
      const userData = allUsersData[userEmail];
      
      if (userData && userData.checkouts) {
        console.log('🔧 Checkouts do usuário carregados:', userEmail, userData.checkouts.length);
        return userData.checkouts.map((checkout: any) => ({
          ...checkout,
          gatewayId: checkout.gatewayId || null
        }));
      } else {
        console.log('🔧 Novo usuário detectado, inicializando com checkouts padrão');
        return mockCheckouts.map(checkout => ({
          ...checkout,
          gatewayId: null
        }));
      }
    } catch (error) {
      console.error('❌ Erro ao ler dados do usuário:', error);
      return mockCheckouts.map(checkout => ({
        ...checkout,
        gatewayId: null
      }));
    }
  };

  // Obter todos os checkouts de todos os usuários para páginas públicas
  const getAllCheckouts = (): CheckoutConfig[] => {
    try {
      const allUsersData = JSON.parse(localStorage.getItem('app_data') || '{}');
      const allCheckouts: CheckoutConfig[] = [];
      
      // Coleta checkouts de todos os usuários
      Object.values(allUsersData).forEach((userData: any) => {
        if (userData.checkouts) {
          allCheckouts.push(...userData.checkouts.map((checkout: any) => ({
            ...checkout,
            gatewayId: checkout.gatewayId || null
          })));
        }
      });
      
      // Se não há checkouts, usar mock
      if (allCheckouts.length === 0) {
        console.log('📦 Nenhum checkout encontrado, carregando dados mock');
        return mockCheckouts.map(checkout => ({
          ...checkout,
          gatewayId: null
        }));
      }
      
      return allCheckouts;
    } catch (error) {
      console.error('❌ Erro ao carregar checkouts públicos:', error);
      return mockCheckouts.map(checkout => ({
        ...checkout,
        gatewayId: null
      }));
    }
  };

  // Salvar dados do usuário atual
  const saveUserData = (userEmail: string, userCheckouts: CheckoutConfig[]) => {
    try {
      const allUsersData = JSON.parse(localStorage.getItem('app_data') || '{}');
      
      if (!allUsersData[userEmail]) {
        allUsersData[userEmail] = {};
      }
      
      allUsersData[userEmail].checkouts = userCheckouts;
      localStorage.setItem('app_data', JSON.stringify(allUsersData));
      console.log('💾 Checkouts do usuário salvos:', userEmail, userCheckouts.length);
    } catch (error) {
      console.error('❌ Erro ao salvar dados do usuário:', error);
    }
  };

  return {
    getUserData,
    getAllCheckouts,
    saveUserData
  };
};