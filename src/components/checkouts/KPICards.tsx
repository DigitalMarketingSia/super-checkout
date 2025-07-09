
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Target, Users } from 'lucide-react';
import { useSupabaseVendas } from '@/hooks/useSupabaseVendas';

interface KPICardsProps {
  checkoutsCount: number;
}

export const KPICards = ({ checkoutsCount }: KPICardsProps) => {
  const { getTotalRevenue, getConversionRate, loading: vendasLoading } = useSupabaseVendas();
  
  const totalRevenue = getTotalRevenue();
  const conversionRate = getConversionRate(checkoutsCount);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <Card className="rounded-lg border border-white/10 bg-white/5 backdrop-blur-lg bg-gradient-to-b from-purple-500/10 to-transparent">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-400">
            Total de Checkouts
          </CardTitle>
          <ShoppingCart className="h-4 w-4 text-gray-400" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-white">{checkoutsCount}</div>
          <p className="text-xs text-green-400 flex items-center mt-1">
            <TrendingUp className="h-3 w-3 mr-1" />
            +12% em relação ao mês passado
          </p>
        </CardContent>
      </Card>

      <Card className="rounded-lg border border-white/10 bg-white/5 backdrop-blur-lg bg-gradient-to-b from-purple-500/10 to-transparent">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-400">
            Receita Total
          </CardTitle>
          <DollarSign className="h-4 w-4 text-gray-400" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-white">
            {vendasLoading ? 'Carregando...' : formatCurrency(totalRevenue)}
          </div>
          <p className="text-xs text-gray-400 flex items-center mt-1">
            <TrendingUp className="h-3 w-3 mr-1" />
            Receita total acumulada
          </p>
        </CardContent>
      </Card>

      <Card className="rounded-lg border border-white/10 bg-white/5 backdrop-blur-lg bg-gradient-to-b from-purple-500/10 to-transparent">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-400">
            Taxa de Conversão
          </CardTitle>
          <Target className="h-4 w-4 text-gray-400" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-white">
            {vendasLoading ? 'Carregando...' : `${conversionRate.toFixed(1)}%`}
          </div>
          <p className="text-xs text-gray-400 flex items-center mt-1">
            <Target className="h-3 w-3 mr-1" />
            Vendas / Checkouts criados
          </p>
        </CardContent>
      </Card>

      <Card className="rounded-lg border border-white/10 bg-white/5 backdrop-blur-lg bg-gradient-to-b from-purple-500/10 to-transparent">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-400">
            Visitantes Únicos
          </CardTitle>
          <Users className="h-4 w-4 text-gray-400" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-white">N/D</div>
          <p className="text-xs text-gray-400 flex items-center mt-1">
            <Users className="h-3 w-3 mr-1" />
            Funcionalidade em desenvolvimento
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
