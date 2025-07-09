import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Order } from '@/api/mockDatabase';

interface OrderContextType {
  orders: Order[];
  addOrder: (order: Omit<Order, 'id' | 'createdAt'>) => Order;
  updateOrder: (id: string, updates: Partial<Order>) => Order | null;
  getOrderById: (id: string) => Order | null;
  loading: boolean;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

export const useOrderContext = () => {
  const context = useContext(OrderContext);
  if (!context) {
    throw new Error('useOrderContext must be used within an OrderProvider');
  }
  return context;
};

interface OrderProviderProps {
  children: ReactNode;
}

export const OrderProvider: React.FC<OrderProviderProps> = ({ children }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Obter dados do usuário atual
  const getUserOrders = (userEmail: string): Order[] => {
    try {
      const allUsersData = JSON.parse(localStorage.getItem('app_data') || '{}');
      const userData = allUsersData[userEmail];
      
      if (userData && userData.orders) {
        console.log('📦 Pedidos do usuário carregados:', userEmail, userData.orders.length);
        return userData.orders;
      } else {
        console.log('📦 Novo usuário - nenhum pedido encontrado');
        return [];
      }
    } catch (error) {
      console.error('❌ Erro ao ler pedidos do usuário:', error);
      return [];
    }
  };

  // Salvar dados do usuário atual
  const saveUserOrders = (userEmail: string, userOrders: Order[]) => {
    try {
      const allUsersData = JSON.parse(localStorage.getItem('app_data') || '{}');
      
      if (!allUsersData[userEmail]) {
        allUsersData[userEmail] = {};
      }
      
      allUsersData[userEmail].orders = userOrders;
      localStorage.setItem('app_data', JSON.stringify(allUsersData));
      console.log('💾 Pedidos do usuário salvos:', userEmail, userOrders.length);
    } catch (error) {
      console.error('❌ Erro ao salvar pedidos do usuário:', error);
    }
  };

  // Obter todos os pedidos de todos os usuários
  const getAllOrders = (): Order[] => {
    try {
      const allUsersData = JSON.parse(localStorage.getItem('app_data') || '{}');
      const allOrders: Order[] = [];
      
      Object.values(allUsersData).forEach((userData: any) => {
        if (userData.orders) {
          allOrders.push(...userData.orders);
        }
      });
      
      return allOrders;
    } catch (error) {
      console.error('❌ Erro ao carregar todos os pedidos:', error);
      return [];
    }
  };

  // Inicializar pedidos na montagem do componente
  useEffect(() => {
    const initializeOrders = () => {
      const userEmail = localStorage.getItem('currentUserEmail');
      console.log('🔄 Inicializando pedidos, usuário:', userEmail);
      
      if (userEmail) {
        // Usuário logado - carregar seus pedidos
        setCurrentUserEmail(userEmail);
        const userOrders = getUserOrders(userEmail);
        setOrders(userOrders);
      } else {
        // Página pública - carregar todos os pedidos
        setCurrentUserEmail('guest');
        const allOrders = getAllOrders();
        setOrders(allOrders);
      }
      
      setLoading(false);
    };

    initializeOrders();
  }, []);

  // Recarregar quando o usuário mudar
  useEffect(() => {
    const userEmail = localStorage.getItem('currentUserEmail');
    
    if (userEmail && userEmail !== currentUserEmail && currentUserEmail !== null) {
      console.log('🔄 Usuário mudou, recarregando pedidos:', userEmail);
      setCurrentUserEmail(userEmail);
      const userOrders = getUserOrders(userEmail);
      setOrders(userOrders);
    }
  }, [currentUserEmail]);

  // Salvar pedidos no localStorage sempre que houver mudanças
  useEffect(() => {
    if (currentUserEmail && currentUserEmail !== 'guest' && !loading) {
      saveUserOrders(currentUserEmail, orders);
    }
  }, [orders, currentUserEmail, loading]);

  const addOrder = (orderData: Omit<Order, 'id' | 'createdAt'>): Order => {
    console.log('🔧 Criando novo pedido:', orderData);
    
    const newOrder: Order = {
      ...orderData,
      id: `ord_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString()
    };
    
    console.log('🆔 Pedido criado com ID:', newOrder.id);
    
    setOrders(prev => {
      const updatedList = [...prev, newOrder];
      console.log('📋 Total de pedidos após adicionar:', updatedList.length);
      return updatedList;
    });
    
    return newOrder;
  };

  const updateOrder = (id: string, updates: Partial<Order>): Order | null => {
    let updatedOrder: Order | null = null;
    
    setOrders(prev => {
      const newOrders = prev.map(order => {
        if (order.id === id) {
          updatedOrder = { ...order, ...updates };
          return updatedOrder;
        }
        return order;
      });
      console.log('🔄 Pedido atualizado:', id);
      return newOrders;
    });
    
    return updatedOrder;
  };

  const getOrderById = (id: string): Order | null => {
    console.log('🔍 Buscando pedido por ID:', id);
    const found = orders.find(o => o.id === id) || null;
    
    if (found) {
      console.log('🎯 Pedido encontrado:', found.id);
    } else {
      console.log('❌ Pedido não encontrado para ID:', id);
    }
    
    return found;
  };

  const value: OrderContextType = {
    orders,
    addOrder,
    updateOrder,
    getOrderById,
    loading
  };

  return (
    <OrderContext.Provider value={value}>
      {children}
    </OrderContext.Provider>
  );
};