
// CAMADA DE LÓGICA DE NEGÓCIO (O Motor - A Fábrica)
// Esta camada NÃO PODE TER NENHUMA IMPORTAÇÃO DO REACT
// Função: Motor de cálculos que processa pedidos e aplica regras de negócio

export interface CartItem {
  id: string;
  name: string;
  price: number;
  type: 'main' | 'bump';
}

export interface OrderCalculationResult {
  subtotal: number;
  totalBumps: number;
  totalFinal: number;
  items: CartItem[];
  discounts?: number;
  taxes?: number;
  // Adicionando propriedades que estavam faltando
  valorProdutoPrincipal: number;
  orderBumps: CartItem[];
}

/**
 * Converte valor em reais para centavos (inteiros) para cálculos precisos
 */
const toCents = (reais: number): number => Math.round(reais * 100);

/**
 * Converte centavos de volta para reais
 */
const toReais = (centavos: number): number => centavos / 100;

/**
 * MOTOR DE CÁLCULO PRINCIPAL
 * Esta é a função central que processa um carrinho e retorna os totais calculados
 * REGRA DE OURO: Esta função não sabe nada sobre React ou componentes UI
 */
export const calculateOrder = (items: CartItem[]): OrderCalculationResult => {
  console.log('🏭 Motor de Cálculo: Processando pedido', items);
  
  // Separar produtos principais dos order bumps
  const mainProducts = items.filter(item => item.type === 'main');
  const orderBumps = items.filter(item => item.type === 'bump');
  
  // Calcular usando aritmética de centavos para precisão
  const subtotalCents = mainProducts.reduce((total, item) => total + toCents(item.price), 0);
  const totalBumpsCents = orderBumps.reduce((total, item) => total + toCents(item.price), 0);
  
  // Converter de volta para reais
  const subtotal = toReais(subtotalCents);
  const totalBumps = toReais(totalBumpsCents);
  
  // REMOVIDO: Desconto automático oculto que estava causando o problema
  // Agora a soma é exata: produto principal + order bumps
  let discounts = 0;
  
  // Calcular total final (soma exata)
  const totalFinalCents = subtotalCents + totalBumpsCents;
  const totalFinal = toReais(totalFinalCents);
  
  const result: OrderCalculationResult = {
    subtotal,
    totalBumps,
    totalFinal,
    items,
    discounts,
    // Novas propriedades
    valorProdutoPrincipal: subtotal,
    orderBumps
  };
  
  console.log('💰 Resultado do cálculo (corrigido):', result);
  console.log('🔍 Verificação:', {
    subtotalCents,
    totalBumpsCents,
    totalFinalCents,
    'Soma em reais': subtotal + totalBumps,
    'Total final': totalFinal
  });
  
  return result;
};

/**
 * Função auxiliar para validar se um item pode ser adicionado ao carrinho
 */
export const validateCartItem = (item: CartItem): boolean => {
  return item.price > 0 && item.name.length > 0 && item.id.length > 0;
};

/**
 * Função para aplicar cupons de desconto (exemplo de extensibilidade)
 * IMPORTANTE: Descontos agora são aplicados explicitamente via cupons
 */
export const applyCoupon = (calculation: OrderCalculationResult, couponCode: string): OrderCalculationResult => {
  const validCoupons: Record<string, number> = {
    'DESCONTO10': 0.1,
    'PROMO20': 0.2,
    'BLACKFRIDAY': 0.3
  };
  
  const discountPercent = validCoupons[couponCode.toUpperCase()];
  if (!discountPercent) {
    return calculation;
  }
  
  // Usar aritmética de centavos para desconto preciso
  const totalCents = toCents(calculation.totalFinal);
  const couponDiscountCents = Math.round(totalCents * discountPercent);
  const newDiscountsCents = toCents(calculation.discounts || 0) + couponDiscountCents;
  const newTotalCents = totalCents - couponDiscountCents;
  
  return {
    ...calculation,
    discounts: toReais(newDiscountsCents),
    totalFinal: toReais(newTotalCents)
  };
};
