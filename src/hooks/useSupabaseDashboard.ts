
import { useState, useEffect, useMemo } from 'react';
import { useSupabaseVendas } from './useSupabaseVendas';
import { useSupabaseClientes } from './useSupabaseClientes';
import { useSupabaseCheckouts } from './useSupabaseCheckouts';

interface DashboardMetrics {
  totalRevenue: number;
  totalSales: number;
  conversionRate: number;
  averageTicket: number;
  uniqueCustomers: number;
  abandonedCheckouts: number;
  salesByPaymentMethod: Map<string, { count: number; total: number }>;
  salesByHour: Array<{ hour: string; count: number; revenue: number }>;
}

interface DateFilter {
  startDate: string;
  endDate: string;
}

export const useSupabaseDashboard = (dateFilter?: DateFilter) => {
  const { vendas, loading: vendasLoading, getTotalRevenue } = useSupabaseVendas();
  const { clientes, loading: clientesLoading, getUniqueCustomersCount } = useSupabaseClientes();
  const { checkouts, loading: checkoutsLoading } = useSupabaseCheckouts();
  
  const [loading, setLoading] = useState(true);

  // Filter data by date range if provided
  const filteredVendas = useMemo(() => {
    if (!dateFilter) return vendas;
    
    return vendas.filter(venda => {
      const vendaDate = new Date(venda.created_at || '').toISOString().split('T')[0];
      return vendaDate >= dateFilter.startDate && vendaDate <= dateFilter.endDate;
    });
  }, [vendas, dateFilter]);

  const filteredCheckouts = useMemo(() => {
    if (!dateFilter) return checkouts;
    
    return checkouts.filter(checkout => {
      const checkoutDate = new Date(checkout.created_at || '').toISOString().split('T')[0];
      return checkoutDate >= dateFilter.startDate && checkoutDate <= dateFilter.endDate;
    });
  }, [checkouts, dateFilter]);

  // Calculate metrics
  const metrics = useMemo((): DashboardMetrics => {
    const paidSales = filteredVendas.filter(venda => venda.status === 'pago');
    const totalRevenue = paidSales.reduce((sum, venda) => sum + Number(venda.valor_total || 0), 0);
    const totalSales = paidSales.length;
    const totalCheckouts = filteredCheckouts.length;
    const conversionRate = totalCheckouts > 0 ? (totalSales / totalCheckouts) * 100 : 0;
    const averageTicket = totalSales > 0 ? totalRevenue / totalSales : 0;
    const uniqueCustomers = getUniqueCustomersCount();
    const abandonedCheckouts = totalCheckouts - totalSales;

    // Group sales by payment method
    const salesByPaymentMethod = new Map<string, { count: number; total: number }>();
    paidSales.forEach(venda => {
      const method = venda.metodo_pagamento;
      if (!salesByPaymentMethod.has(method)) {
        salesByPaymentMethod.set(method, { count: 0, total: 0 });
      }
      const current = salesByPaymentMethod.get(method)!;
      salesByPaymentMethod.set(method, {
        count: current.count + 1,
        total: current.total + Number(venda.valor_total || 0)
      });
    });

    // Group sales by hour
    const salesByHour = Array.from({ length: 24 }, (_, hour) => {
      const hourStr = hour.toString().padStart(2, '0') + ':00';
      const hourSales = paidSales.filter(venda => {
        const vendaHour = new Date(venda.created_at || '').getHours();
        return vendaHour === hour;
      });
      
      return {
        hour: hourStr,
        count: hourSales.length,
        revenue: hourSales.reduce((sum, venda) => sum + Number(venda.valor_total || 0), 0)
      };
    });

    return {
      totalRevenue,
      totalSales,
      conversionRate,
      averageTicket,
      uniqueCustomers,
      abandonedCheckouts,
      salesByPaymentMethod,
      salesByHour
    };
  }, [filteredVendas, filteredCheckouts, getUniqueCustomersCount]);

  // Update loading state
  useEffect(() => {
    setLoading(vendasLoading || clientesLoading || checkoutsLoading);
  }, [vendasLoading, clientesLoading, checkoutsLoading]);

  // Helper functions
  const getPaymentMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      'pix': 'Pix',
      'credit_card': 'Cartão de crédito',
      'boleto': 'Boleto'
    };
    return labels[method] || method;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getDateRangeForPeriod = (period: string) => {
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

  return {
    metrics,
    loading,
    formatCurrency,
    getPaymentMethodLabel,
    getDateRangeForPeriod,
    vendas: filteredVendas,
    checkouts: filteredCheckouts,
    clientes
  };
};
