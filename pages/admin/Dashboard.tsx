
import React, { useEffect, useState } from 'react';
import { storage } from '../../services/storageService';
import { Order, OrderStatus } from '../../types';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DollarSign, ShoppingCart, TrendingUp, Users, ShoppingBag, CreditCard, ArrowRight, Barcode, QrCode } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { useTheme } from '../../context/ThemeContext';
import { Layout } from '../../components/Layout';

type Period = 'today' | '7d' | '15d' | '30d';

export const Dashboard = () => {
  const { theme } = useTheme();
  const [period, setPeriod] = useState<Period>('today');
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    successfulOrders: 0,
    abandonedCarts: 0,
    conversionRate: 0,
    avgTicket: 0,
    customers: 0,
    paymentMethods: { pix: 0, card: 0, boleto: 0 }
  });
  const [chartData, setChartData] = useState<{ name: string; value: number }[]>([]);

  // Filter orders by period
  const filterOrdersByPeriod = (orders: Order[], selectedPeriod: Period): Order[] => {
    const now = new Date();
    let cutoffDate: Date;

    switch (selectedPeriod) {
      case 'today':
        cutoffDate = new Date(now.setHours(0, 0, 0, 0));
        break;
      case '7d':
        cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '15d':
        cutoffDate = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        cutoffDate = new Date(now.setHours(0, 0, 0, 0));
    }

    return orders.filter(order => {
      const orderDate = new Date(order.created_at);
      return orderDate >= cutoffDate;
    });
  };

  // Generate chart data based on period
  const generateChartData = (orders: Order[], selectedPeriod: Period) => {
    const paidOrders = orders.filter(o => o.status === OrderStatus.PAID);

    if (selectedPeriod === 'today') {
      // Group by hour (0-23)
      const hourlyData = Array.from({ length: 24 }, (_, i) => ({
        name: `${i}h`,
        value: 0
      }));

      paidOrders.forEach(order => {
        const hour = new Date(order.created_at).getHours();
        hourlyData[hour].value += order.amount;
      });

      return hourlyData;
    } else {
      // Group by day
      const days = selectedPeriod === '7d' ? 7 : selectedPeriod === '15d' ? 15 : 30;
      const dailyData = Array.from({ length: days }, (_, i) => ({
        name: `Dia ${i + 1}`,
        value: 0
      }));

      const now = Date.now();
      paidOrders.forEach(order => {
        const dayIndex = Math.floor(
          (now - new Date(order.created_at).getTime()) / (24 * 60 * 60 * 1000)
        );
        if (dayIndex >= 0 && dayIndex < days) {
          dailyData[days - 1 - dayIndex].value += order.amount;
        }
      });

      return dailyData;
    }
  };

  useEffect(() => {
    const load = async () => {
      const allOrders = await storage.getOrders();
      const filteredOrders = filterOrdersByPeriod(allOrders, period);

      // Calculate metrics
      const paidOrders = filteredOrders.filter(o => o.status === OrderStatus.PAID);
      const revenue = paidOrders.reduce((acc, curr) => acc + curr.amount, 0);
      const success = paidOrders.length;
      const total = filteredOrders.length;

      // Payment methods
      const pixCount = paidOrders.filter(o => o.payment_method === 'pix').length;
      const cardCount = paidOrders.filter(o => o.payment_method === 'credit_card').length;
      const boletoCount = paidOrders.filter(o => o.payment_method === 'boleto').length;

      // Unique customers
      const uniqueCustomers = new Set(filteredOrders.map(o => o.customer_email)).size;

      setStats({
        totalRevenue: revenue,
        totalOrders: total,
        successfulOrders: success,
        abandonedCarts: total - success,
        conversionRate: total > 0 ? (success / total) * 100 : 0,
        avgTicket: success > 0 ? revenue / success : 0,
        customers: uniqueCustomers,
        paymentMethods: { pix: pixCount, card: cardCount, boleto: boletoCount }
      });

      // Generate chart data
      setChartData(generateChartData(filteredOrders, period));
    };

    load();
  }, [period]);

  const FilterButton = ({ label, value }: { label: string; value: Period }) => (
    <button
      onClick={() => setPeriod(value)}
      className={`px-6 py-2 rounded-full text-sm font-medium transition-all duration-300 ${period === value
        ? 'bg-primary text-white shadow-[0_0_15px_rgba(138,43,226,0.5)] border border-primary'
        : 'bg-white border-gray-200 text-gray-500 hover:text-gray-900 hover:bg-gray-50 dark:bg-white/5 dark:text-gray-400 dark:border-white/5 dark:hover:border-white/20 dark:hover:text-white'
        }`}
    >
      {label}
    </button>
  );

  return (
    <Layout>
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">Visão geral do seu negócio em tempo real.</p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
          <FilterButton label="Hoje" value="today" />
          <FilterButton label="7 dias" value="7d" />
          <FilterButton label="15 dias" value="15d" />
          <FilterButton label="30 dias" value="30d" />
        </div>
      </div>

      {/* MAIN GRID LAYOUT - Optimized for First Fold */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">

        {/* COLUMN 1 & 2 (Wide Area) */}
        <div className="lg:col-span-3 flex flex-col gap-6">

          {/* Top Row: Sales & Count */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Card 1: Revenue */}
            <Card className="relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <DollarSign className="w-24 h-24 text-primary" />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-primary/20 text-primary border border-primary/20">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <span className="text-gray-600 dark:text-gray-400 font-medium text-sm">Vendas realizadas</span>
                </div>
                <h3 className="text-3xl font-bold text-gray-900 dark:text-white mt-4">
                  R$ {stats.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </h3>
              </div>
            </Card>

            {/* Card 2: Volume */}
            <Card className="relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <ShoppingBag className="w-24 h-24 text-blue-500" />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/20">
                    <ShoppingCart className="w-5 h-5" />
                  </div>
                  <span className="text-gray-600 dark:text-gray-400 font-medium text-sm">Quantidade de vendas</span>
                </div>
                <h3 className="text-3xl font-bold text-gray-900 dark:text-white mt-4">
                  {stats.successfulOrders}
                </h3>
              </div>
            </Card>
          </div>

          {/* Row 2: Payment Methods (Wide) */}
          <Card className="flex-1 min-h-[180px] flex flex-col justify-center">
            <div className="flex items-center justify-between mb-6">
              <span className="text-gray-600 dark:text-gray-400 font-medium text-sm">Meios de Pagamento</span>
              <div className="text-xs text-gray-500">Conversão</div>
            </div>

            {stats.successfulOrders > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Pix */}
                <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-4 border border-gray-200 dark:border-white/5 flex items-center justify-between group hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
                  <div className="flex items-center gap-3">
                    <QrCode className="w-5 h-5 text-[#10B981]" />
                    <span className="text-gray-900 dark:text-white font-medium">Pix</span>
                  </div>
                  <span className="text-gray-600 dark:text-gray-400">{stats.paymentMethods.pix}</span>
                </div>
                {/* Card */}
                <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-4 border border-gray-200 dark:border-white/5 flex items-center justify-between group hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
                  <div className="flex items-center gap-3">
                    <CreditCard className="w-5 h-5 text-primary" />
                    <span className="text-gray-900 dark:text-white font-medium">Cartão</span>
                  </div>
                  <span className="text-gray-600 dark:text-gray-400">{stats.paymentMethods.card}</span>
                </div>
                {/* Boleto */}
                <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-4 border border-gray-200 dark:border-white/5 flex items-center justify-between group hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
                  <div className="flex items-center gap-3">
                    <Barcode className="w-5 h-5 text-orange-400" />
                    <span className="text-gray-900 dark:text-white font-medium">Boleto</span>
                  </div>
                  <span className="text-gray-600 dark:text-gray-400">{stats.paymentMethods.boleto}</span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <p>Nenhuma venda encontrada para este período</p>
              </div>
            )}
          </Card>

        </div>

        {/* COLUMN 3 (Vertical Stats Stack) */}
        <div className="lg:col-span-1">
          <Card className="h-full flex flex-col">
            <h3 className="text-gray-900 dark:text-white font-bold mb-6">Performance</h3>

            <div className="flex-1 flex flex-col justify-between gap-4">
              <div className="group">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-gray-600 dark:text-gray-400 text-sm">Abandono C.</span>
                  <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"></div>
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.abandonedCarts}</div>
              </div>

              <div className="h-px bg-gray-200 dark:bg-white/5"></div>

              <div className="group">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-gray-600 dark:text-gray-400 text-sm">Taxa Conversão</span>
                  <TrendingUp className="w-4 h-4 text-green-500" />
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.conversionRate.toFixed(1)}%</div>
              </div>

              <div className="h-px bg-gray-200 dark:bg-white/5"></div>

              <div className="group">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-gray-600 dark:text-gray-400 text-sm">Ticket Médio</span>
                  <DollarSign className="w-4 h-4 text-primary" />
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">R$ {stats.avgTicket.toFixed(2)}</div>
              </div>

              <div className="h-px bg-gray-200 dark:bg-white/5"></div>

              <div className="group">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-gray-600 dark:text-gray-400 text-sm">Clientes</span>
                  <Users className="w-4 h-4 text-blue-400" />
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.customers}</div>
              </div>
            </div>
          </Card>
        </div>

      </div>

      {/* CHART SECTION (Bottom of first fold) */}
      <div className="w-full h-72">
        <Card className="h-full" noPadding>
          <div className="p-6 pb-0 flex justify-between items-center">
            <h3 className="font-bold text-gray-900 dark:text-white">Volume de Vendas</h3>
            <button className="text-xs text-primary hover:text-primary-hover transition-colors flex items-center gap-1">
              Ver relatório completo <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="w-full h-[220px] px-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8A2BE2" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8A2BE2" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: theme === 'dark' ? '#6B7280' : '#9CA3AF', fontSize: 12 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: theme === 'dark' ? '#6B7280' : '#9CA3AF', fontSize: 12 }}
                  tickFormatter={(value) => `R$${(value / 1000).toFixed(1)}k`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: theme === 'dark' ? '#161A23' : '#FFFFFF',
                    borderRadius: '12px',
                    border: theme === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
                    boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.5)',
                    color: theme === 'dark' ? '#fff' : '#000'
                  }}
                  itemStyle={{ color: theme === 'dark' ? '#fff' : '#000' }}
                  cursor={{ stroke: 'rgba(138, 43, 226, 0.5)', strokeWidth: 1 }}
                  formatter={(value: number) => [`R$ ${value.toFixed(2)}`, 'Vendas']}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#8A2BE2"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorRevenue)"
                  activeDot={{ r: 6, strokeWidth: 0, fill: '#fff', shadow: '0 0 10px #8A2BE2' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </Layout>
  );
};
