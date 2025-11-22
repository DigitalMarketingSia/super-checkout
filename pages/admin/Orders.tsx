
import React, { useState, useEffect } from 'react';
import { Layout } from '../../components/Layout';
import { storage } from '../../services/storageService';
import { Order, OrderStatus, Product } from '../../types';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import {
  Search, Filter, MessageCircle, CreditCard, QrCode, Barcode,
  ShoppingBag, DollarSign, Users
} from 'lucide-react';

interface CustomerProfile {
  email: string;
  name: string;
  phone?: string;
  totalSpent: number;
  orderCount: number;
  lastOrderDate: string;
  products: string[];
  tags: ('Novo' | 'Recorrente' | 'VIP')[];
}

export const Orders = () => {
  const [activeTab, setActiveTab] = useState<'orders' | 'customers'>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<CustomerProfile[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  // Filters State
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    method: 'all',
    productId: 'all',
    dateStart: '',
    dateEnd: '',
    minVal: '',
    maxVal: '',
    customerType: 'all'
  });

  const [messageTemplate, setMessageTemplate] = useState(
    "Olá {{nome}}, vi que você adquiriu o produto {{produto}}. Precisa de ajuda em algo?"
  );
  const [isMsgModalOpen, setIsMsgModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

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
          products: [productName],
          tags: []
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
      [OrderStatus.PAID]: { label: 'Aprovado', cls: 'bg-green-500/10 text-green-500' },
      [OrderStatus.PENDING]: { label: 'Pendente', cls: 'bg-yellow-500/10 text-yellow-500' },
      [OrderStatus.FAILED]: { label: 'Falhou', cls: 'bg-red-500/10 text-red-500' },
      [OrderStatus.CANCELED]: { label: 'Cancelado', cls: 'bg-gray-500/10 text-gray-500' },
      [OrderStatus.REFUNDED]: { label: 'Reembolsado', cls: 'bg-purple-500/10 text-purple-500' },
    };
    const s = map[status] || map[OrderStatus.PENDING];
    return <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${s.cls}`}>{s.label}</span>;
  };

  // Filters
  const filteredOrders = orders.filter(order => {
    const matchesSearch =
      order.customer_name.toLowerCase().includes(filters.search.toLowerCase()) ||
      order.customer_email.toLowerCase().includes(filters.search.toLowerCase()) ||
      order.id.includes(filters.search);

    const matchesStatus = filters.status === 'all' || order.status === filters.status;
    const matchesMethod = filters.method === 'all' || order.payment_method === filters.method;
    return matchesSearch && matchesStatus && matchesMethod;
  });

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(filters.search.toLowerCase()) || c.email.toLowerCase().includes(filters.search.toLowerCase())
  );

  const totalRevenue = orders.filter(o => o.status === OrderStatus.PAID).reduce((acc, curr) => acc + curr.amount, 0);

  const openWhatsApp = (order: Order) => {
    if (!order.customer_phone) return;
    const phone = order.customer_phone.replace(/\D/g, '');
    const product = order.items?.[0]?.name || 'Produto';
    const msg = messageTemplate
      .replace('{{nome}}', order.customer_name)
      .replace('{{produto}}', product);

    window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <Layout>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-white">Pedidos & CRM</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsMsgModalOpen(true)}>
            <MessageCircle className="w-4 h-4 mr-2" /> Configurar Mensagem
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card noPadding className="p-6 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 uppercase font-bold">Total Faturado</p>
            <h3 className="text-2xl font-bold text-white">{formatCurrency(totalRevenue)}</h3>
          </div>
          <div className="p-3 bg-green-500/20 rounded-xl text-green-500"><DollarSign className="w-6 h-6" /></div>
        </Card>
        <Card noPadding className="p-6 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 uppercase font-bold">Total de Vendas</p>
            <h3 className="text-2xl font-bold text-white">{orders.length}</h3>
          </div>
          <div className="p-3 bg-blue-500/20 rounded-xl text-blue-500"><ShoppingBag className="w-6 h-6" /></div>
        </Card>
        <Card noPadding className="p-6 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 uppercase font-bold">Clientes</p>
            <h3 className="text-2xl font-bold text-white">{customers.length}</h3>
          </div>
          <div className="p-3 bg-purple-500/20 rounded-xl text-purple-500"><Users className="w-6 h-6" /></div>
        </Card>
      </div>

      <Card noPadding className="flex flex-col min-h-[500px]">
        {/* Toolbar */}
        <div className="p-4 border-b border-white/5 flex flex-col md:flex-row justify-between gap-4 bg-white/5">
          <div className="flex gap-2">
            <button onClick={() => setActiveTab('orders')} className={`px-4 py-2 rounded-lg text-sm font-bold ${activeTab === 'orders' ? 'bg-primary text-white' : 'text-gray-400'}`}>Pedidos</button>
            <button onClick={() => setActiveTab('customers')} className={`px-4 py-2 rounded-lg text-sm font-bold ${activeTab === 'customers' ? 'bg-primary text-white' : 'text-gray-400'}`}>Clientes</button>
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text" placeholder="Buscar..."
                className="bg-black/20 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white w-64 focus:ring-1 focus:ring-primary"
                value={filters.search} onChange={e => setFilters({ ...filters, search: e.target.value })}
              />
            </div>
            <Button variant="outline" onClick={() => setShowFilters(!showFilters)} className="bg-white/5 border-white/10">
              <Filter className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="p-4 bg-black/20 border-b border-white/5 grid grid-cols-1 md:grid-cols-3 gap-4 animate-in slide-in-from-top-2">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Status</label>
              <select
                className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white"
                value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })}
              >
                <option value="all">Todos</option>
                <option value={OrderStatus.PAID}>Aprovado</option>
                <option value={OrderStatus.PENDING}>Pendente</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Método</label>
              <select
                className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white"
                value={filters.method} onChange={e => setFilters({ ...filters, method: e.target.value })}
              >
                <option value="all">Todos</option>
                <option value="credit_card">Cartão</option>
                <option value="pix">Pix</option>
              </select>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          {activeTab === 'orders' ? (
            <table className="w-full text-left text-sm">
              <thead className="bg-white/5 text-gray-400">
                <tr>
                  <th className="px-6 py-3">Pedido</th>
                  <th className="px-6 py-3">Cliente</th>
                  <th className="px-6 py-3">Valor</th>
                  <th className="px-6 py-3">Data</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredOrders.length === 0 ? (
                  <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">Nenhum pedido encontrado.</td></tr>
                ) : (
                  filteredOrders.map(order => (
                    <tr key={order.id} className="hover:bg-white/5">
                      <td className="px-6 py-4 font-mono text-xs text-gray-400">{order.id.slice(0, 8)}...</td>
                      <td className="px-6 py-4">
                        <div className="text-white font-medium">{order.customer_name}</div>
                        <div className="text-gray-500 text-xs">{order.customer_email}</div>
                      </td>
                      <td className="px-6 py-4 font-bold text-white">{formatCurrency(order.amount)}</td>
                      <td className="px-6 py-4 text-gray-400">{formatDate(order.created_at)}</td>
                      <td className="px-6 py-4">{getStatusBadge(order.status)}</td>
                      <td className="px-6 py-4 text-right">
                        <button
                          className="text-primary hover:text-white text-xs font-bold"
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
              <thead className="bg-white/5 text-gray-400">
                <tr>
                  <th className="px-6 py-3">Nome</th>
                  <th className="px-6 py-3">Contato</th>
                  <th className="px-6 py-3">Total Gasto</th>
                  <th className="px-6 py-3">Pedidos</th>
                  <th className="px-6 py-3">Produtos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredCustomers.map((customer, i) => (
                  <tr key={i} className="hover:bg-white/5">
                    <td className="px-6 py-4 font-bold text-white">{customer.name}</td>
                    <td className="px-6 py-4 text-gray-400">{customer.email}</td>
                    <td className="px-6 py-4 font-bold text-green-400">{formatCurrency(customer.totalSpent)}</td>
                    <td className="px-6 py-4 text-white">{customer.orderCount}</td>
                    <td className="px-6 py-4 text-gray-500 text-xs max-w-xs truncate">
                      {customer.products.join(', ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      {/* WhatsApp Modal */}
      {isMsgModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#111] border border-white/10 rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-bold text-white mb-4">Configurar Mensagem WhatsApp</h3>
            <textarea
              className="w-full h-32 bg-white/5 border border-white/10 rounded-lg p-3 text-white text-sm mb-4"
              value={messageTemplate}
              onChange={e => setMessageTemplate(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setIsMsgModalOpen(false)}>Fechar</Button>
              <Button onClick={() => setIsMsgModalOpen(false)}>Salvar Modelo</Button>
            </div>
          </div>
        </div>
      )}

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#111] border border-white/10 rounded-xl p-6 max-w-lg w-full">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-xl font-bold text-white">Detalhes do Pedido</h3>
                <p className="text-gray-400 text-sm font-mono">{selectedOrder.items?.[0]?.name || selectedOrder.id}</p>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="text-gray-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-6">
              {/* Customer Info */}
              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                <h4 className="text-sm font-bold text-gray-400 uppercase mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4" /> Dados do Cliente
                </h4>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-sm">Nome:</span>
                    <span className="text-white font-medium">{selectedOrder.customer_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-sm">Email:</span>
                    <span className="text-white font-medium">{selectedOrder.customer_email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-sm">CPF:</span>
                    <span className="text-white font-medium">{selectedOrder.customer_cpf || '-'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-sm">Telefone:</span>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium">{selectedOrder.customer_phone || '-'}</span>
                      {selectedOrder.customer_phone && (
                        <button
                          onClick={() => openWhatsApp(selectedOrder)}
                          className="bg-green-500/20 hover:bg-green-500/30 text-green-500 p-1.5 rounded-lg transition-colors"
                          title="Enviar WhatsApp"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Order Info */}
              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                <h4 className="text-sm font-bold text-gray-400 uppercase mb-3 flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4" /> Resumo do Pedido
                </h4>
                <div className="space-y-2">
                  {selectedOrder.items?.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span className="text-white">{item.quantity}x {item.name}</span>
                      <span className="text-gray-400">{formatCurrency(item.price)}</span>
                    </div>
                  ))}
                  <div className="border-t border-white/10 pt-2 mt-2 flex justify-between font-bold">
                    <span className="text-white">Total</span>
                    <span className="text-green-400">{formatCurrency(selectedOrder.amount)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <Button variant="outline" onClick={() => setSelectedOrder(null)}>Fechar</Button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};
