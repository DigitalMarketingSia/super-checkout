
import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { getSales, Sale } from '@/api/mockDatabase';

const Reports = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [filteredSales, setFilteredSales] = useState<Sale[]>([]);
  const [period, setPeriod] = useState('30');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSales();
  }, []);

  useEffect(() => {
    filterByPeriod();
  }, [sales, period]);

  const loadSales = async () => {
    try {
      const data = await getSales();
      setSales(data);
    } catch (error) {
      console.error('Erro ao carregar vendas:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterByPeriod = () => {
    const now = new Date();
    const daysAgo = parseInt(period);
    const startDate = new Date(now.getTime() - (daysAgo * 24 * 60 * 60 * 1000));
    
    const filtered = sales.filter(sale => 
      new Date(sale.date) >= startDate
    );
    
    setFilteredSales(filtered);
  };

  // Calcular métricas
  const totalSales = filteredSales.length;
  const totalRevenue = filteredSales.reduce((sum, sale) => sale.status === 'pago' ? sum + sale.amount : sum, 0);
  const paidSales = filteredSales.filter(sale => sale.status === 'pago');
  const conversionRate = totalSales > 0 ? (paidSales.length / totalSales) * 100 : 0;
  const averageTicket = paidSales.length > 0 ? totalRevenue / paidSales.length : 0;
  const uniqueVisits = totalSales * 3; // Mock data
  const abandonment = ((totalSales - paidSales.length) / totalSales) * 100 || 0;
  const refunds = Math.floor(paidSales.length * 0.05); // Mock: 5% refund rate

  // Dados para gráfico de evolução
  const salesEvolution = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    const dayStr = date.toISOString().split('T')[0];
    
    const daySales = filteredSales.filter(sale => sale.date === dayStr && sale.status === 'pago');
    const dayRevenue = daySales.reduce((sum, sale) => sum + sale.amount, 0);
    
    return {
      date: date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      vendas: daySales.length,
      receita: dayRevenue
    };
  });

  // Dados para gráfico de métodos de pagamento
  const paymentMethods = [
    { name: 'PIX', value: paidSales.filter(s => s.paymentMethod === 'pix').length, color: '#10b981' },
    { name: 'Cartão', value: paidSales.filter(s => s.paymentMethod === 'credit_card').length, color: '#3b82f6' },
    { name: 'Boleto', value: paidSales.filter(s => s.paymentMethod === 'boleto').length, color: '#f59e0b' }
  ].filter(method => method.value > 0);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-400">Carregando relatórios...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-white">Relatórios</h1>
            <p className="text-gray-400 mt-1">Visão geral da performance de vendas</p>
          </div>
          
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Últimos 7 dias</SelectItem>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="90">Últimos 90 dias</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Cards de KPI */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="rounded-lg border border-white/10 bg-white/5 backdrop-blur-lg bg-gradient-to-b from-purple-500/10 to-transparent">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-400">Total de Vendas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{paidSales.length}</div>
            </CardContent>
          </Card>

          <Card className="rounded-lg border border-white/10 bg-white/5 backdrop-blur-lg bg-gradient-to-b from-purple-500/10 to-transparent">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-400">Total Faturado</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-400">
                R$ {totalRevenue.toFixed(2)}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-lg border border-white/10 bg-white/5 backdrop-blur-lg bg-gradient-to-b from-purple-500/10 to-transparent">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-400">Taxa de Conversão</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-violet-400">
                {conversionRate.toFixed(1)}%
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-lg border border-white/10 bg-white/5 backdrop-blur-lg bg-gradient-to-b from-purple-500/10 to-transparent">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-400">Ticket Médio</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-400">
                R$ {averageTicket.toFixed(2)}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-lg border border-white/10 bg-white/5 backdrop-blur-lg bg-gradient-to-b from-purple-500/10 to-transparent">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-400">Visitas Únicas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-400">{uniqueVisits}</div>
            </CardContent>
          </Card>

          <Card className="rounded-lg border border-white/10 bg-white/5 backdrop-blur-lg bg-gradient-to-b from-purple-500/10 to-transparent">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-400">Taxa de Abandono</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-400">
                {abandonment.toFixed(1)}%
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-lg border border-white/10 bg-white/5 backdrop-blur-lg bg-gradient-to-b from-purple-500/10 to-transparent">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-400">Reembolsos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-400">{refunds}</div>
            </CardContent>
          </Card>
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="rounded-lg border border-white/10 bg-white/5 backdrop-blur-lg bg-gradient-to-b from-purple-500/10 to-transparent">
            <CardHeader>
              <CardTitle className="text-white">Evolução das Vendas</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={salesEvolution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="date" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1F2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="vendas" 
                    stroke="#8b5cf6" 
                    strokeWidth={2}
                    name="Vendas"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="receita" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    name="Receita (R$)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="rounded-lg border border-white/10 bg-white/5 backdrop-blur-lg bg-gradient-to-b from-purple-500/10 to-transparent">
            <CardHeader>
              <CardTitle className="text-white">Métodos de Pagamento</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={paymentMethods}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {paymentMethods.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ 
                      backgroundColor: '#1F2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Tabela Detalhada */}
        <Card className="rounded-lg border border-white/10 bg-white/5 backdrop-blur-lg bg-gradient-to-b from-purple-500/10 to-transparent">
          <CardHeader>
            <CardTitle className="text-white">Relatório Detalhado</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-gray-300">Data</TableHead>
                  <TableHead className="text-gray-300">Cliente</TableHead>
                  <TableHead className="text-gray-300">Valor</TableHead>
                  <TableHead className="text-gray-300">Método</TableHead>
                  <TableHead className="text-gray-300">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSales.slice(0, 10).map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell className="text-gray-300">
                      {new Date(sale.date).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell className="text-white">{sale.customerName}</TableCell>
                    <TableCell className="text-green-400 font-semibold">
                      R$ {sale.amount.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-gray-300">
                      {sale.paymentMethod.toUpperCase()}
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        sale.status === 'pago' ? 'bg-green-500/20 text-green-400' :
                        sale.status === 'pendente' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {sale.status.charAt(0).toUpperCase() + sale.status.slice(1)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {filteredSales.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                Nenhuma venda encontrada no período selecionado
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Reports;
