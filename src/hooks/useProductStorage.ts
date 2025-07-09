import { Product, mockProducts } from '@/api/mockDatabase';

export const useProductStorage = () => {
  // Obter dados do usuário atual do localStorage
  const getUserData = (userEmail: string): Product[] => {
    try {
      const allUsersData = JSON.parse(localStorage.getItem('app_data') || '{}');
      const userData = allUsersData[userEmail];
      
      if (userData && userData.products) {
        console.log('📦 Produtos do usuário carregados:', userEmail, userData.products.length);
        return userData.products;
      } else {
        console.log('📦 Novo usuário detectado, inicializando com produtos padrão');
        return mockProducts;
      }
    } catch (error) {
      console.error('❌ Erro ao ler dados do usuário:', error);
      return mockProducts;
    }
  };

  // Salvar dados do usuário atual no localStorage
  const saveUserData = (userEmail: string, userProducts: Product[]) => {
    try {
      const allUsersData = JSON.parse(localStorage.getItem('app_data') || '{}');
      
      if (!allUsersData[userEmail]) {
        allUsersData[userEmail] = {};
      }
      
      allUsersData[userEmail].products = userProducts;
      localStorage.setItem('app_data', JSON.stringify(allUsersData));
      console.log('💾 Produtos do usuário salvos:', userEmail, userProducts.length);
    } catch (error) {
      console.error('❌ Erro ao salvar dados do usuário:', error);
    }
  };

  return {
    getUserData,
    saveUserData
  };
};