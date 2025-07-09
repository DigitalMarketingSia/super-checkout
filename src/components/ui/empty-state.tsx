import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

export const EmptyState = ({ 
  title, 
  description, 
  icon = <AlertCircle className="h-12 w-12 text-muted-foreground" />,
  action 
}: EmptyStateProps) => {
  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardContent className="flex flex-col items-center justify-center p-8 text-center">
        <div className="mb-4">
          {icon}
        </div>
        <CardTitle className="text-xl font-semibold text-white mb-2">
          {title}
        </CardTitle>
        <p className="text-gray-400 mb-4 max-w-md">
          {description}
        </p>
        {action && (
          <div className="mt-4">
            {action}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Estados vazios específicos para cada seção
export const EmptyProductsState = () => (
  <EmptyState
    title="Nenhum produto encontrado"
    description="Você ainda não criou nenhum produto. Crie seu primeiro produto para começar a vender."
    icon={<div className="text-6xl">📦</div>}
  />
);

export const EmptyCheckoutsState = () => (
  <EmptyState
    title="Nenhum checkout criado"
    description="Crie seu primeiro checkout para começar a receber pedidos dos seus clientes."
    icon={<div className="text-6xl">💳</div>}
  />
);

export const EmptyGatewaysState = () => (
  <EmptyState
    title="Nenhum gateway configurado"
    description="Configure um gateway de pagamento para processar transações reais."
    icon={<div className="text-6xl">⚡</div>}
  />
);

export const EmptyOrderBumpsState = () => (
  <EmptyState
    title="Nenhum Order Bump disponível"
    description="Crie produtos do tipo 'Order Bump' para oferecer produtos complementares."
    icon={<div className="text-6xl">🎁</div>}
  />
);