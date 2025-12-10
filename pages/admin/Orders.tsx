import React, { useState, useEffect } from 'react';
import { Layout } from '../../components/Layout';
import { storage } from '../../services/storageService';
import { Order, OrderStatus, Product } from '../../types';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import {
  Search, Filter, MessageCircle, ShoppingBag,
  DollarSign, Users, Download, ArrowDownRight, Package, X
} from 'lucide-react';
import { OrderDetailsModal } from '../../components/admin/orders/OrderDetailsModal';
import { CustomerDetailsModal } from '../../components/admin/orders/CustomerDetailsModal';

interface CustomerProfile {
  email: string;
  name: string;
  phone?: string;
  totalSpent: number;
  orderCount: number;
  lastOrderDate: string;
  products: string[];
}

export const Orders = () => {
  const [activeTab, setActiveTab] = useState<'orders' | 'customers'>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<CustomerProfile[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Filters State
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    method: 'all',
    productId: 'all',
  });

  const [messageTemplate, setMessageTemplate] = useState(
    "Olá {{nome}}, vi que você adquiriu o produto {{produto}}. Precisa de ajuda em algo?"
  );
  const [isMsgModalOpen, setIsMsgModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerProfile | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const allOrders = await storage.getOrders();
    const allProducts = await storage.getProducts();
    setProducts(allProducts);

    const sortedOrders = allOrders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    setOrders(sortedOrders);

    // Process Customers
    const customerMap = new Map<string, CustomerProfile>();
    sortedOrders.forEach(order => {
      const email = order.customer_email;
      if (!email) return;

      const existing = customerMap.get(email);
      const productName = order.items?.[0]?.name || 'Produto';

      if (existing) {
        existing.totalSpent += order.amount;
        existing.orderCount += 1;
        if (!existing.products.includes(productName)) existing.products.push(productName);
      } else {
        customerMap.set(email, {
          email,
          name: order.customer_name,
          phone: order.customer_phone,
          totalSpent: order.amount,
          orderCount: 1,
          lastOrderDate: order.created_at,
          products: [productName]
        });
      }
    });
    setCustomers(Array.from(customerMap.values()));
  };

  // Helpers
  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });

  const getStatusBadge = (status: OrderStatus) => {
    const map = {
      [OrderStatus.PAID]: { label: 'Aprovado', cls: 'bg-green-500/10 text-green-500 border-green-500/20' },
      [OrderStatus.PENDING]: { label: 'Pendente', cls: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' },
      [OrderStatus.FAILED]: { label: 'Falhou', cls: 'bg-red-500/10 text-red-500 border-red-500/20' },
      [OrderStatus.CANCELED]: { label: 'Cancelado', cls: 'bg-gray-500/10 text-gray-500 border-gray-500/20' },
      [OrderStatus.REFUNDED]: { label: 'Reembolsado', cls: 'bg-purple-500/10 text-purple-500 border-purple-500/20' },
    };
    const s = map[status] || map[OrderStatus.PENDING];
    return <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${s.cls}`}>{s.label}</span>;
  };

  // Filter Logic
  const filteredOrders = orders.filter(order => {
    const matchesSearch =
      order.customer_name.toLowerCase().includes(filters.search.toLowerCase()) ||
      order.customer_email.toLowerCase().includes(filters.search.toLowerCase()) ||
      order.id.includes(filters.search);

    const matchesStatus = filters.status === 'all' || order.status === filters.status;
    const matchesMethod = filters.method === 'all' || order.payment_method === filters.method;

    // Check if ANY item in the order matches the selected product ID
    const matchesProduct = filters.productId === 'all' ||
      (order.items && order.items.some(i => i.name === products.find(p => p.id === filters.productId)?.name));

    return matchesSearch && matchesStatus && matchesMethod && matchesProduct;
  });

  const filteredCustomers = customers.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(filters.search.toLowerCase()) ||
      c.email.toLowerCase().includes(filters.search.toLowerCase());

    const selectedProductName = filters.productId !== 'all' ? products.find(p => p.id === filters.productId)?.name : null;
    const matchesProduct = !selectedProductName || c.products.includes(selectedProductName);

    return matchesSearch && matchesProduct;
  });

  // Pagination Logic
  const totalPages = activeTab === 'orders'
    ? Math.ceil(filteredOrders.length / itemsPerPage)
    : Math.ceil(filteredCustomers.length / itemsPerPage);

  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const paginatedCustomers = filteredCustomers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset to page 1 when switching tabs or changing filters
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, filters.search, filters.status, filters.method, filters.productId]);

  // Dynamic Metrics
  const revenueData = filters.productId !== 'all' ? filteredOrders : orders.filter(o => o.status === OrderStatus.PAID);
  const totalRevenue = revenueData.reduce((acc, curr) => acc + (curr.status === OrderStatus.PAID ? curr.amount : 0), 0);
  const salesCount = filteredOrders.length;
  const customersCount = activeTab === 'customers' ? filteredCustomers.length : new Set(filteredOrders.map(o => o.customer_email)).size;

  const handleExportCustomers = () => {
    const csvContent = [
      ['Nome', 'Email', 'Telefone', 'Total Gasto', 'Pedidos', 'Produtos'].join(','),
      ...filteredCustomers.map(c => [
        `"${c.name}"`,
        c.email,
        c.phone || '',
        c.totalSpent.toFixed(2),
        c.orderCount,
        `"${c.products.join('; ')}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'clientes_export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Layout>
      {/* Top Header: Title + Controls */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-6 gap-4 border-b border-gray-200 dark:border-white/5 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Pedidos & CRM</h1>
          <p className="text-gray-500 text-sm">Visão geral de vendas e gerenciamento de clientes</p>
        </div>

        {/* Unified Button Group for Single Line Layout */}
        <div className="flex flex-wrap items-center gap-2 bg-gray-100 dark:bg-black/20 p-1.5 rounded-xl border border-gray-200 dark:border-white/5">
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-5 py-2 rounded-lg text-sm transition-all font-medium ${activeTab === 'orders' ? 'bg-primary text-white shadow-lg' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200 dark:text-gray-400 dark:hover:text-white dark:hover:bg-white/5'}`}
          >
            Pedidos
          </button>
          <button
            onClick={() => setActiveTab('customers')}
            className={`px-5 py-2 rounded-lg text-sm transition-all font-medium ${activeTab === 'customers' ? 'bg-primary text-white shadow-lg' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200 dark:text-gray-400 dark:hover:text-white dark:hover:bg-white/5'}`}
          >
            Clientes
          </button>

          <div className="h-6 w-px bg-white/10 mx-1"></div>

          {activeTab === 'customers' && (
            <Button variant="ghost" onClick={handleExportCustomers} className="text-gray-500 hover:text-gray-900 hover:bg-gray-200 dark:text-gray-400 dark:hover:text-white dark:hover:bg-white/5 px-4 h-9">
              <Download className="w-4 h-4 mr-2" /> Exportar
            </Button>
          )}
          <Button variant="ghost" onClick={() => setIsMsgModalOpen(true)} className="text-gray-500 hover:text-gray-900 hover:bg-gray-200 dark:text-gray-400 dark:hover:text-white dark:hover:bg-white/5 px-4 h-9">
            <MessageCircle className="w-4 h-4 mr-2" /> Msg WhatsApp
          </Button>
        </div>
      </div>

      {/* Smart Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card noPadding className="p-6 relative overflow-hidden group border-gray-200 dark:border-white/5 bg-white dark:bg-[#12121A]">
          <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full blur-3xl -mr-16 -mt-16 transition-opacity opacity-50 group-hover:opacity-100" />
          <div className="flex justify-between items-start relative">
            <div>
              <p className="text-xs text-green-400 font-bold uppercase tracking-wider mb-1">
                {filters.productId !== 'all' ? 'Faturamento (Filtrado)' : 'Faturamento Total'}
              </p>
              <h3 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">{formatCurrency(totalRevenue)}</h3>
            </div>
            <div className="p-3 bg-green-500/10 rounded-xl border border-green-500/20 text-green-500 shadow-[0_0_15px_rgba(34,197,94,0.1)]">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>
        </Card>

        <Card noPadding className="p-6 relative overflow-hidden group border-gray-200 dark:border-white/5 bg-white dark:bg-[#12121A]">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-16 -mt-16 transition-opacity opacity-50 group-hover:opacity-100" />
          <div className="flex justify-between items-start relative">
            <div>
              <p className="text-xs text-blue-400 font-bold uppercase tracking-wider mb-1">
                {activeTab === 'orders' ? 'Vendas Realizadas' : 'Vendas Totais'}
              </p>
              <h3 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">{salesCount}</h3>
            </div>
            <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20 text-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.1)]">
              <ShoppingBag className="w-6 h-6" />
            </div>
          </div>
        </Card>

        <Card noPadding className="p-6 relative overflow-hidden group border-gray-200 dark:border-white/5 bg-white dark:bg-[#12121A]">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl -mr-16 -mt-16 transition-opacity opacity-50 group-hover:opacity-100" />
          <div className="flex justify-between items-start relative">
            <div>
              <p className="text-xs text-purple-400 font-bold uppercase tracking-wider mb-1">
                {activeTab === 'customers' ? 'Clientes (Filtrado)' : 'Clientes Únicos'}
              </p>
              <h3 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">{customersCount}</h3>
            </div>
            <div className="p-3 bg-purple-500/10 rounded-xl border border-purple-500/20 text-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.1)]">
              <Users className="w-6 h-6" />
            </div>
          </div>
        </Card>
      </div>

      <Card noPadding className="flex flex-col min-h-[600px] border-gray-200 dark:border-white/5 bg-white dark:bg-[#12121A]">
        {/* Unified Filter Toolbar */}
        <div className="p-4 border-b border-gray-200 dark:border-white/5 flex flex-col xl:flex-row justify-between gap-4 bg-gray-50 dark:bg-white/[0.02]">
          <div className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
            {activeTab === 'orders' ? 'Todas as Vendas' : 'Base de Clientes'}
            <span className="bg-gray-200 dark:bg-white/10 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded text-xs font-mono">
              {activeTab === 'orders' ? filteredOrders.length : filteredCustomers.length}
            </span>
          </div>

          <div className="flex flex-wrap gap-3 items-center">
            {/* SEARCH */}
            <div className="relative flex-grow md:flex-grow-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text" placeholder={activeTab === 'orders' ? "Buscar pedido..." : "Buscar cliente..."}
                className="w-full md:w-64 bg-white dark:bg-[#0A0A0F] border border-gray-200 dark:border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-gray-900 dark:text-white focus:ring-1 focus:ring-primary focus:border-primary/50 transition-all placeholder:text-gray-500 dark:placeholder:text-gray-600"
                value={filters.search} onChange={e => setFilters({ ...filters, search: e.target.value })}
              />
            </div>

            {/* PRODUCT FILTER */}
            <div className="flex-grow md:flex-grow-0 min-w-[200px]">
              <div className="relative">
                <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <select
                  className="w-full bg-white dark:bg-[#0A0A0F] border border-gray-200 dark:border-white/10 rounded-lg pl-10 pr-8 py-2 text-sm text-gray-900 dark:text-white focus:ring-1 focus:ring-primary appearance-none cursor-pointer hover:border-gray-300 dark:hover:border-white/20 transition-colors"
                  value={filters.productId} onChange={e => setFilters({ ...filters, productId: e.target.value })}
                >
                  <option value="all">Todos os Produtos</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <ArrowDownRight className="w-3 h-3 text-gray-500" />
                </div>
              </div>
            </div>

            {/* TOGGLE ADVANCED FILTERS */}
            <Button variant="outline" onClick={() => setShowFilters(!showFilters)} className={`border-gray-200 dark:border-white/10 ${showFilters ? 'bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
              <Filter className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Extended Filters Drawer */}
        {showFilters && (
          <div className="p-4 bg-gray-50 dark:bg-black/20 border-b border-gray-200 dark:border-white/5 grid grid-cols-1 md:grid-cols-4 gap-4 animate-in slide-in-from-top-2">
            <div>
              <label className="text-xs text-gray-500 font-bold uppercase block mb-1.5">Status do Pedido</label>
              <select
                className="w-full bg-white dark:bg-[#0A0A0F] border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-gray-700 dark:text-gray-300 focus:text-gray-900 dark:focus:text-white"
                value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })}
              >
                <option value="all">Todos</option>
                <option value={OrderStatus.PAID}>Aprovado</option>
                <option value={OrderStatus.PENDING}>Pendente</option>
                <option value={OrderStatus.FAILED}>Falhou</option>
                <option value={OrderStatus.REFUNDED}>Reembolsado</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 font-bold uppercase block mb-1.5">Método de Pagamento</label>
              <select
                className="w-full bg-white dark:bg-[#0A0A0F] border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-gray-700 dark:text-gray-300 focus:text-gray-900 dark:focus:text-white"
                value={filters.method} onChange={e => setFilters({ ...filters, method: e.target.value })}
              >
                <option value="all">Todos</option>
                <option value="credit_card">Cartão de Crédito</option>
                <option value="pix">Pix</option>
              </select>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 overflow-auto bg-white dark:bg-[#12121A]">
          {activeTab === 'orders' ? (
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-100 dark:bg-[#151520] text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-white/5 sticky top-0 backdrop-blur-md">
                <tr>
                  <th className="px-6 py-4 font-semibold uppercase text-xs tracking-wider">Pedido</th>
                  <th className="px-6 py-4 font-semibold uppercase text-xs tracking-wider">Cliente</th>
                  <th className="px-6 py-4 font-semibold uppercase text-xs tracking-wider">Produto</th>
                  <th className="px-6 py-4 font-semibold uppercase text-xs tracking-wider">Valor</th>
                  <th className="px-6 py-4 font-semibold uppercase text-xs tracking-wider">Status</th>
                  <th className="px-6 py-4 font-semibold uppercase text-xs tracking-wider text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-white/5">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center text-gray-500">
                        <ShoppingBag className="w-12 h-12 mb-4 opacity-20" />
                        <p className="text-lg font-medium">Nenhum pedido encontrado</p>
                        <p className="text-sm">Tente ajustar os filtros de busca.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedOrders.map(order => (
                    <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors group">
                      <td className="px-6 py-4">
                        <span className="font-mono text-xs text-gray-600 dark:text-gray-500 bg-gray-100 dark:bg-white/5 px-2 py-1 rounded border border-gray-200 dark:border-white/5">
                          #{order.id.slice(0, 8)}
                        </span>
                        <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                          {formatDate(order.created_at)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-gray-900 dark:text-white font-medium">{order.customer_name}</div>
                        <div className="text-gray-500 text-xs">{order.customer_email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-gray-600 dark:text-gray-300 text-xs max-w-[200px] truncate bg-gray-100 dark:bg-white/5 px-2 py-1 rounded w-fit" title={order.items?.[0]?.name}>
                          {order.items?.[0]?.name || 'Produto Indefinido'}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-bold text-gray-900 dark:text-white tracking-wider">{formatCurrency(order.amount)}</td>
                      <td className="px-6 py-4">{getStatusBadge(order.status)}</td>
                      <td className="px-6 py-4 text-right">
                        <button
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-primary hover:text-white text-xs font-bold border border-primary/30 hover:bg-primary px-3 py-1.5 rounded-lg"
                          onClick={() => setSelectedOrder(order)}
                        >
                          Ver Detalhes
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-100 dark:bg-[#151520] text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-white/5 sticky top-0 backdrop-blur-md">
                <tr>
                  <th className="px-6 py-4 font-semibold uppercase text-xs tracking-wider">Nome</th>
                  <th className="px-6 py-4 font-semibold uppercase text-xs tracking-wider">Contato</th>
                  <th className="px-6 py-4 font-semibold uppercase text-xs tracking-wider">Total Gasto</th>
                  <th className="px-6 py-4 font-semibold uppercase text-xs tracking-wider">Pedidos</th>
                  <th className="px-6 py-4 font-semibold uppercase text-xs tracking-wider">Produtos Adquiridos</th>
                  <th className="px-6 py-4 font-semibold uppercase text-xs tracking-wider text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-white/5">
                {paginatedCustomers.map((customer, i) => (
                  <tr key={i} className="hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors group">
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center text-sm font-bold text-white ring-1 ring-white/10">
                          {customer.name.charAt(0).toUpperCase()}
                        </div>
                        {customer.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-400">
                      <div>{customer.email}</div>
                      <div className="text-xs text-gray-600 font-mono mt-0.5">{customer.phone || '-'}</div>
                    </td>
                    <td className="px-6 py-4 font-bold text-green-400 tracking-wider font-mono">{formatCurrency(customer.totalSpent)}</td>
                    <td className="px-6 py-4 text-gray-900 dark:text-white">
                      <span className="bg-gray-100 dark:bg-white/5 px-2.5 py-1 rounded-md text-xs font-medium border border-gray-200 dark:border-white/5 whitespace-nowrap">{customer.orderCount} pedidos</span>
                    </td>
                    <td className="px-6 py-4 text-gray-400 text-xs">
                      <div className="flex flex-wrap gap-1">
                        {customer.products.slice(0, 2).map((p, idx) => (
                          <span key={idx} className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1.5 py-0.5 rounded">
                            {p}
                          </span>
                        ))}
                        {customer.products.length > 2 && (
                          <span className="text-gray-600 px-1.5 py-0.5 text-[10px] self-center">+{customer.products.length - 2} outros</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-primary hover:text-white text-xs font-bold border border-primary/30 hover:bg-primary px-3 py-1.5 rounded-lg"
                        onClick={() => setSelectedCustomer(customer)}
                      >
                        Ver Detalhes
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-gray-200 dark:border-white/5 bg-gray-50 dark:bg-white/[0.02] flex items-center justify-between">
            <div className="text-sm text-gray-400">
              Página {currentPage} de {totalPages} • Mostrando {activeTab === 'orders' ? paginatedOrders.length : paginatedCustomers.length} de {activeTab === 'orders' ? filteredOrders.length : filteredCustomers.length} {activeTab === 'orders' ? 'pedidos' : 'clientes'}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="border-white/10 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Anterior
              </Button>
              <div className="flex gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${currentPage === page
                      ? 'bg-primary text-white'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                      }`}
                  >
                    {page}
                  </button>
                ))}
              </div>
              <Button
                variant="outline"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="border-white/10 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Próxima
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Helper Modals */}
      {isMsgModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-[9999]" style={{ zIndex: 9999 }}>
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black/90 backdrop-blur-sm"
            onClick={() => setIsMsgModalOpen(false)}
          />

          {/* Content */}
          <div
            className="relative w-full max-w-md bg-[#12121A]/80 backdrop-blur-xl border border-purple-500/20 rounded-xl shadow-2xl overflow-hidden flex flex-col z-[10000]"
            style={{ zIndex: 10000 }}
          >
            {/* Purple glow effect */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/20 rounded-full blur-3xl -mr-16 -mt-16" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl -ml-16 -mb-16" />

            <div className="relative flex justify-between items-center p-6 border-b border-white/10 bg-white/[0.02]">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-purple-400" /> Configurar Mensagem
              </h2>
              <button
                onClick={() => setIsMsgModalOpen(false)}
                className="text-gray-400 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative p-6">
              <p className="text-sm text-gray-400 mb-4">
                Define a mensagem padrão que será aberta no WhatsApp ao clicar no contato do cliente.
              </p>

              <textarea
                className="w-full h-32 bg-black/30 border border-purple-500/20 rounded-lg p-3 text-white text-sm mb-4 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 outline-none resize-none placeholder:text-gray-600"
                value={messageTemplate}
                onChange={e => setMessageTemplate(e.target.value)}
                placeholder="Digite sua mensagem..."
              />

              <div className="text-xs text-gray-500">
                Variáveis disponíveis: <code className="text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded">{"{{nome}}"}</code>, <code className="text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded">{"{{produto}}"}</code>
              </div>
            </div>

            <div className="relative p-6 border-t border-white/10 bg-white/[0.02] flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setIsMsgModalOpen(false)} className="text-gray-300 hover:bg-white/5">Cancelar</Button>
              <Button onClick={() => setIsMsgModalOpen(false)} className="bg-purple-600 hover:bg-purple-700 text-white border-none shadow-lg shadow-purple-500/20">Salvar Modelo</Button>
            </div>
          </div>
        </div>
      )}

      {selectedOrder && (
        <OrderDetailsModal
          isOpen={true}
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
        />
      )}

      {selectedCustomer && (
        <CustomerDetailsModal
          isOpen={true}
          customer={selectedCustomer}
          onClose={() => setSelectedCustomer(null)}
        />
      )}
    </Layout>
  );
};
