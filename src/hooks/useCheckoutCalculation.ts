import { useEffect } from 'react';
import { CheckoutConfig, Product } from '@/api/mockDatabase';
import { calculateOrder, CartItem, OrderCalculationResult } from '@/core/checkoutEngine';
import { PRODUCT_TYPES } from '@/constants';

interface UseCheckoutCalculationProps {
  mainProduct: Product | null;
  orderBumps: Product[];
  selectedOrderBumps: string[];
  onCalculationUpdate: (calculation: OrderCalculationResult) => void;
}

export const useCheckoutCalculation = ({
  mainProduct,
  orderBumps,
  selectedOrderBumps,
  onCalculationUpdate
}: UseCheckoutCalculationProps) => {
  useEffect(() => {
    if (!mainProduct) return;

    console.log('🔄 Recalculando pedido...');

    // Montar carrinho com produto principal
    const cartItems: CartItem[] = [
      {
        id: mainProduct.id,
        name: mainProduct.name,
        price: mainProduct.price,
        type: PRODUCT_TYPES.MAIN
      }
    ];

    // Adicionar order bumps selecionados
    selectedOrderBumps.forEach(bumpId => {
      const bump = orderBumps.find(b => b.id === bumpId);
      if (bump) {
        cartItems.push({
          id: bump.id,
          name: bump.name,
          price: bump.price,
          type: PRODUCT_TYPES.BUMP
        });
      }
    });

    // CHAMAR O MOTOR DE CÁLCULO
    const calculation = calculateOrder(cartItems);
    onCalculationUpdate(calculation);

  }, [mainProduct, selectedOrderBumps, orderBumps, onCalculationUpdate]);
};