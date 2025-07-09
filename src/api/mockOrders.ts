export interface Order {
  id: string;
  checkoutId: string;
  totalAmount: number;
  status: 'paid' | 'refunded' | 'abandoned';
  paymentMethod: 'pix' | 'credit_card' | 'boleto' | 'pic_pay' | 'apple_pay' | 'google_pay' | '3ds';
  createdAt: Date;
}

// Gerar datas variadas ao longo do dia atual
const generateRandomDate = (hoursAgo: number) => {
  const now = new Date();
  const randomMinutes = Math.floor(Math.random() * 60);
  const randomSeconds = Math.floor(Math.random() * 60);
  return new Date(now.getTime() - (hoursAgo * 60 * 60 * 1000) + (randomMinutes * 60 * 1000) + (randomSeconds * 1000));
};

export const mockOrders: Order[] = [
  {
    id: '1',
    checkoutId: 'checkout_1',
    totalAmount: 299.90,
    status: 'paid',
    paymentMethod: 'pix',
    createdAt: generateRandomDate(1)
  },
  {
    id: '2',
    checkoutId: 'checkout_2',
    totalAmount: 149.90,
    status: 'paid',
    paymentMethod: 'credit_card',
    createdAt: generateRandomDate(2)
  },
  {
    id: '3',
    checkoutId: 'checkout_3',
    totalAmount: 89.90,
    status: 'abandoned',
    paymentMethod: 'pix',
    createdAt: generateRandomDate(3)
  },
  {
    id: '4',
    checkoutId: 'checkout_4',
    totalAmount: 199.90,
    status: 'paid',
    paymentMethod: 'boleto',
    createdAt: generateRandomDate(4)
  },
  {
    id: '5',
    checkoutId: 'checkout_5',
    totalAmount: 399.90,
    status: 'refunded',
    paymentMethod: 'credit_card',
    createdAt: generateRandomDate(5)
  },
  {
    id: '6',
    checkoutId: 'checkout_6',
    totalAmount: 79.90,
    status: 'paid',
    paymentMethod: 'pix',
    createdAt: generateRandomDate(6)
  },
  {
    id: '7',
    checkoutId: 'checkout_7',
    totalAmount: 249.90,
    status: 'paid',
    paymentMethod: 'pic_pay',
    createdAt: generateRandomDate(7)
  },
  {
    id: '8',
    checkoutId: 'checkout_8',
    totalAmount: 129.90,
    status: 'abandoned',
    paymentMethod: 'apple_pay',
    createdAt: generateRandomDate(8)
  },
  {
    id: '9',
    checkoutId: 'checkout_9',
    totalAmount: 179.90,
    status: 'paid',
    paymentMethod: 'google_pay',
    createdAt: generateRandomDate(9)
  },
  {
    id: '10',
    checkoutId: 'checkout_10',
    totalAmount: 349.90,
    status: 'paid',
    paymentMethod: 'credit_card',
    createdAt: generateRandomDate(10)
  },
  {
    id: '11',
    checkoutId: 'checkout_11',
    totalAmount: 99.90,
    status: 'paid',
    paymentMethod: 'pix',
    createdAt: generateRandomDate(11)
  },
  {
    id: '12',
    checkoutId: 'checkout_12',
    totalAmount: 189.90,
    status: 'abandoned',
    paymentMethod: 'boleto',
    createdAt: generateRandomDate(12)
  },
  {
    id: '13',
    checkoutId: 'checkout_13',
    totalAmount: 279.90,
    status: 'paid',
    paymentMethod: '3ds',
    createdAt: generateRandomDate(13)
  },
  {
    id: '14',
    checkoutId: 'checkout_14',
    totalAmount: 159.90,
    status: 'refunded',
    paymentMethod: 'pix',
    createdAt: generateRandomDate(14)
  },
  {
    id: '15',
    checkoutId: 'checkout_15',
    totalAmount: 219.90,
    status: 'paid',
    paymentMethod: 'credit_card',
    createdAt: generateRandomDate(15)
  },
  {
    id: '16',
    checkoutId: 'checkout_16',
    totalAmount: 119.90,
    status: 'paid',
    paymentMethod: 'pix',
    createdAt: generateRandomDate(2)
  },
  {
    id: '17',
    checkoutId: 'checkout_17',
    totalAmount: 299.90,
    status: 'abandoned',
    paymentMethod: 'apple_pay',
    createdAt: generateRandomDate(3)
  },
  {
    id: '18',
    checkoutId: 'checkout_18',
    totalAmount: 79.90,
    status: 'paid',
    paymentMethod: 'google_pay',
    createdAt: generateRandomDate(1)
  },
  {
    id: '19',
    checkoutId: 'checkout_19',
    totalAmount: 189.90,
    status: 'paid',
    paymentMethod: 'boleto',
    createdAt: generateRandomDate(4)
  },
  {
    id: '20',
    checkoutId: 'checkout_20',
    totalAmount: 329.90,
    status: 'paid',
    paymentMethod: 'pix',
    createdAt: generateRandomDate(6)
  },
  {
    id: '21',
    checkoutId: 'checkout_21',
    totalAmount: 149.90,
    status: 'paid',
    paymentMethod: 'credit_card',
    createdAt: generateRandomDate(8)
  },
  {
    id: '22',
    checkoutId: 'checkout_22',
    totalAmount: 259.90,
    status: 'abandoned',
    paymentMethod: 'pic_pay',
    createdAt: generateRandomDate(5)
  },
  {
    id: '23',
    checkoutId: 'checkout_23',
    totalAmount: 199.90,
    status: 'paid',
    paymentMethod: 'pix',
    createdAt: generateRandomDate(7)
  },
  {
    id: '24',
    checkoutId: 'checkout_24',
    totalAmount: 389.90,
    status: 'refunded',
    paymentMethod: 'credit_card',
    createdAt: generateRandomDate(9)
  },
  {
    id: '25',
    checkoutId: 'checkout_25',
    totalAmount: 109.90,
    status: 'paid',
    paymentMethod: '3ds',
    createdAt: generateRandomDate(1)
  }
];

export const getOrdersByStatus = (status: Order['status']) => {
  return mockOrders.filter(order => order.status === status);
};

export const getTotalRevenue = () => {
  return getOrdersByStatus('paid').reduce((total, order) => total + order.totalAmount, 0);
};

export const getOrdersByPaymentMethod = () => {
  const paidOrders = getOrdersByStatus('paid');
  const paymentMethods = new Map();
  
  paidOrders.forEach(order => {
    const method = order.paymentMethod;
    if (!paymentMethods.has(method)) {
      paymentMethods.set(method, { count: 0, total: 0 });
    }
    const current = paymentMethods.get(method);
    paymentMethods.set(method, {
      count: current.count + 1,
      total: current.total + order.totalAmount
    });
  });
  
  return paymentMethods;
};

export const getSalesDataByHour = () => {
  const paidOrders = getOrdersByStatus('paid');
  const hourlyData = Array.from({ length: 24 }, (_, hour) => ({
    hour: String(hour).padStart(2, '0') + ':00',
    value: 0,
    count: 0
  }));
  
  paidOrders.forEach(order => {
    const hour = order.createdAt.getHours();
    hourlyData[hour].value += order.totalAmount;
    hourlyData[hour].count += 1;
  });
  
  return hourlyData;
};