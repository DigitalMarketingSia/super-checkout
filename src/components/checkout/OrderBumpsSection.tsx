
import { Flame, Check } from 'lucide-react';

interface OrderBumpsItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image?: string;
}

interface OrderBumpsSectionProps {
  orderBumps: OrderBumpsItem[];
  selectedOrderBumps: string[];
  onOrderBumpToggle: (bumpId: string) => void;
}

export const OrderBumpsSection = ({
  orderBumps,
  selectedOrderBumps,
  onOrderBumpToggle
}: OrderBumpsSectionProps) => {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  return (
    <div className="checkout-padrao-order-bumps">
      <div className="checkout-padrao-order-bumps-header">
        <h3>
          <Flame className="inline w-5 h-5 mr-2 text-orange-500" />
          Oferta Especial - Apenas Hoje!
        </h3>
      </div>
      <div className="checkout-padrao-order-bumps-content">
        <p className="checkout-padrao-order-bumps-description">
          Aproveite essas ofertas incríveis disponíveis apenas neste checkout
        </p>
        
        {orderBumps.map((bump) => (
          <div key={bump.id} className="checkout-padrao-order-bump-item">
            <div 
              className={`checkout-padrao-order-bump-content ${
                selectedOrderBumps.includes(bump.id) ? 'selected' : ''
              }`}
              onClick={() => onOrderBumpToggle(bump.id)}
            >
              <div className="checkout-padrao-order-bump-title-top">
                <h4 className="checkout-padrao-order-bump-title-main">
                  {bump.name}
                </h4>
              </div>
              <div className="checkout-padrao-order-bump-body">
                {bump.image && (
                  <div className="checkout-padrao-order-bump-image">
                    <img 
                      src={bump.image} 
                      alt={bump.name}
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                  </div>
                )}
                <div className="checkout-padrao-order-bump-info">
                  <p className="checkout-padrao-order-bump-description">
                    {bump.description}
                  </p>
                  <div className="checkout-padrao-order-bump-price">
                    + {formatPrice(bump.price)}
                  </div>
                  <div className="checkout-padrao-order-bump-selection-text">
                    <div className="flex items-center gap-2">
                      {selectedOrderBumps.includes(bump.id) ? (
                        <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                      ) : (
                        <Flame className="w-5 h-5 text-orange-500 flex-shrink-0" />
                      )}
                      <span className="checkout-padrao-order-bump-selection-label">
                        Sim, quero adicionar este item ao meu pedido!
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
