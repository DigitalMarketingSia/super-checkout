
import { useState } from 'react';
import { Layout } from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Eye, QrCode, CreditCard, Barcode, Loader2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { useSupabaseDashboard } from '@/hooks/useSupabaseDashboard';

const Dashboard = () => {
  const [period, setPeriod] = useState('hoje');
  
  // Get date filter based on selected period
  const getDateFilter = () => {
    const today = new Date();
    const startDate = new Date();

    switch (period) {
      case 'hoje':
        startDate.setHours(0, 0, 0, 0);
        break;
      case '7dias':
        startDate.setDate(today.getDate() - 7);
        break;
      case '30dias':
        startDate.setDate(today.getDate() - 30);
        break;
      default:
        startDate.setHours(0, 0, 0, 0);
    }

    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: today.toISOString().split('T')[0]
    };
  };

  const { 
    metrics, 
    loading, 
    formatCurrency, 
    getPaymentMethodLabel 
  } = useSupabaseDashboard(getDateFilter());

  const getPaymentMethodIcon = (method: string) => {
    const iconMap: Record<string, React.ComponentType<any>> = {
      'pix': QrCode,
      'credit_card': CreditCard,
      'boleto': Barcode
    };
    return iconMap[method] || CreditCard;
  };

  // Filter to show only the main payment methods
  const mainPaymentMethods = ['pix', 'credit_card', 'boleto'];
  const filteredPaymentMethods = Array.from(metrics.salesByPaymentMethod.entries())
    .filter(([method]) => mainPaymentMethods.includes(method));

  const chartConfig = {
    count: {
      label: "Vendas",
      color: "hsl(var(--primary))",
    },
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-400">Carregando dados do dashboard...</span>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
            <div className="flex items-center space-x-2">
              <span className="text-slate-600 dark:text-gray-400">Produtos</span>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-slate-600 dark:text-gray-400">Período</span>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-32 bg-white dark:bg-gray-800 border-slate-200 dark:border-gray-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hoje">Hoje</SelectItem>
                <SelectItem value="7dias">Últimos 7 dias</SelectItem>
                <SelectItem value="30dias">Últimos 30 dias</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="rounded-lg border border-white/10 bg-white/5 backdrop-blur-lg bg-gradient-to-b from-purple-500/10 to-transparent">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-gray-400">
                Vendas realizadas
              </CardTitle>
              <Eye className="h-4 w-4 text-slate-600 dark:text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(metrics.totalRevenue)}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-lg border border-white/10 bg-white/5 backdrop-blur-lg bg-gradient-to-b from-purple-500/10 to-transparent">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-gray-400">
                Quantidade de vendas
              </CardTitle>
              <Eye className="h-4 w-4 text-slate-600 dark:text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {metrics.totalSales}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Payment Methods and Additional Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Payment Methods Card */}
          <Card className="lg:col-span-2 rounded-lg border border-white/10 bg-white/5 backdrop-blur-lg bg-gradient-to-b from-purple-500/10 to-transparent">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-slate-600 dark:text-gray-400">
                  Meios de Pagamento
                </CardTitle>
                <div className="flex space-x-4 text-xs text-slate-600 dark:text-gray-400">
                  <span>Conversão</span>
                  <span>Valor</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {filteredPaymentMethods.length > 0 ? (
                filteredPaymentMethods.map(([method, data]) => {
                  const IconComponent = getPaymentMethodIcon(method);
                  const conversionRate = metrics.totalSales > 0 ? (data.count / metrics.totalSales) * 100 : 0;
                  return (
                    <div key={method} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <IconComponent className="h-5 w-5 text-slate-600 dark:text-gray-400" />
                        <span className="text-gray-900 dark:text-white">{getPaymentMethodLabel(method)}</span>
                      </div>
                      <div className="flex items-center space-x-8">
                        <span className="text-slate-600 dark:text-gray-400">{conversionRate.toFixed(1)}%</span>
                        <span className="text-gray-900 dark:text-white">{formatCurrency(data.total)}</span>
                        <Eye className="h-4 w-4 text-slate-600 dark:text-gray-400" />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-4 text-slate-600 dark:text-gray-400">
                  Nenhuma venda encontrada para este período
                </div>
              )}
            </CardContent>
          </Card>

          {/* Additional Metrics Card */}
          <Card className="rounded-lg border border-white/10 bg-white/5 backdrop-blur-lg bg-gradient-to-b from-purple-500/10 to-transparent">
            <CardContent className="space-y-6 pt-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-gray-400">Abandono C.</span>
                  <Eye className="h-4 w-4 text-slate-600 dark:text-gray-400" />
                </div>
                <div className="text-xl font-bold text-gray-900 dark:text-white">{metrics.abandonedCheckouts}</div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-gray-400">Taxa Conversão</span>
                  <Eye className="h-4 w-4 text-slate-600 dark:text-gray-400" />
                </div>
                <div className="text-xl font-bold text-gray-900 dark:text-white">{metrics.conversionRate.toFixed(1)}%</div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-gray-400">Ticket Médio</span>
                  <Eye className="h-4 w-4 text-slate-600 dark:text-gray-400" />
                </div>
                <div className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(metrics.averageTicket)}</div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-gray-400">Clientes</span>
                  <Eye className="h-4 w-4 text-slate-600 dark:text-gray-400" />
                </div>
                <div className="text-xl font-bold text-gray-900 dark:text-white">{metrics.uniqueCustomers}</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sales Chart */}
        <Card className="rounded-lg border border-white/10 bg-white/5 backdrop-blur-lg bg-gradient-to-b from-purple-500/10 to-transparent">
          <CardContent className="pt-6">
            <ChartContainer config={chartConfig} className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={metrics.salesByHour}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="hour" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <ChartTooltip 
                    content={<ChartTooltipContent />}
                    cursor={{ stroke: "hsl(var(--border))" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: "hsl(var(--primary))", strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Dashboard;
