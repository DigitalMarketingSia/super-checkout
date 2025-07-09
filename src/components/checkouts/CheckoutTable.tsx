
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Globe } from 'lucide-react';
import { CheckoutConfig, Product } from '../../api/mockDatabase';
import { CustomDomain } from '../../context/DomainContext';
import { CheckoutTableActions } from './CheckoutTableActions';

interface CheckoutTableProps {
  checkouts: CheckoutConfig[];
  products: Product[];
  customDomain: CustomDomain | null;
  onCopyLink: (checkoutId: string, domainId?: string | null) => void;
  onDeleteCheckout: (checkoutId: string, checkoutName: string) => void;
}

export const CheckoutTable = ({ 
  checkouts, 
  products, 
  customDomain, 
  onCopyLink, 
  onDeleteCheckout 
}: CheckoutTableProps) => {
  const getStatusBadge = (status: string) => {
    if (status === 'active' || status === 'ativo') {
      return <Badge className="bg-green-500/10 text-green-400 border-green-500/20">Ativo</Badge>;
    }
    return <Badge variant="secondary">Inativo</Badge>;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getDomainBadge = (domainId?: string | null) => {
    if (domainId && customDomain && customDomain.id === domainId) {
      return (
        <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 flex items-center space-x-1">
          <Globe className="h-3 w-3" />
          <span>Personalizado</span>
        </Badge>
      );
    }
    return (
      <Badge variant="secondary">
        Padrão
      </Badge>
    );
  };

  return (
    <Card className="rounded-lg border border-white/10 bg-white/5 backdrop-blur-lg bg-gradient-to-b from-purple-500/10 to-transparent">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-semibold text-white">
            Histórico de Checkouts
          </CardTitle>
          <Link to="/checkouts/new">
            <Button className="bg-violet-600 hover:bg-violet-700">
              + Novo Checkout
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow className="border-gray-700">
              <TableHead className="text-gray-400">Nome do Checkout</TableHead>
              <TableHead className="text-gray-400">Produto</TableHead>
              <TableHead className="text-gray-400">Domínio</TableHead>
              <TableHead className="text-gray-400">Data de Criação</TableHead>
              <TableHead className="text-gray-400">Status</TableHead>
              <TableHead className="text-gray-400">Order Bumps</TableHead>
              <TableHead className="text-gray-400">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {checkouts.map((checkout) => (
              <TableRow key={checkout.id} className="border-gray-700 hover:bg-gray-700/50">
                <TableCell className="font-medium text-white">
                  {checkout.name}
                </TableCell>
                <TableCell className="text-gray-300">
                  {products.find(p => p.id === checkout.mainProductId)?.name || 'Produto não encontrado'}
                </TableCell>
                <TableCell>
                  {getDomainBadge(checkout.domainId)}
                </TableCell>
                <TableCell className="text-gray-300">
                  {formatDate(checkout.createdAt)}
                </TableCell>
                <TableCell>
                  {getStatusBadge(checkout.status)}
                </TableCell>
                <TableCell className="text-gray-300">
                  {checkout.allowedOrderBumps.length} bump(s)
                </TableCell>
                <TableCell>
                  <CheckoutTableActions
                    checkoutId={checkout.id}
                    checkoutName={checkout.name}
                    domainId={checkout.domainId}
                    onCopyLink={onCopyLink}
                    onDelete={onDeleteCheckout}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
