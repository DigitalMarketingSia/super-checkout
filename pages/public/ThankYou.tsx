
import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { storage } from '../../services/storageService';
import { Order } from '../../types';
import { CheckCircle } from 'lucide-react';

export const ThankYou = () => {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId');
  const [order, setOrder] = useState<Order | null>(null);

  useEffect(() => {
    const load = async () => {
      if (orderId) {
        const orders = await storage.getOrders();
        const found = orders.find(o => o.id === orderId);
        if (found) setOrder(found);
      }
    };
    load();
  }, [orderId]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-10 h-10 text-green-500" />
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Pagamento Realizado com Sucesso!</h1>
        <p className="text-gray-500 mb-8">
          Obrigado pela sua compra, {order?.customer_name}. Enviamos um e-mail de confirmação para {order?.customer_email}.
        </p>

        <div className="bg-gray-50 rounded-lg p-4 mb-8 text-left">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">ID do Pedido</p>
          <p className="font-mono font-medium text-gray-700">{orderId}</p>
          
          <div className="mt-4 flex justify-between">
             <span className="text-sm text-gray-600">Valor Pago</span>
             <span className="font-bold text-gray-900">R$ {order?.amount.toFixed(2)}</span>
          </div>
        </div>

        <Link to="/admin" className="text-blue-600 hover:text-blue-800 font-medium text-sm">
          Voltar ao Admin (Simulação)
        </Link>
      </div>
    </div>
  );
};
