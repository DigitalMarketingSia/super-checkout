
import { Link } from 'react-router-dom';
import { Button } from '../ui/button';
import { Eye, Link2, Pencil, Trash2 } from 'lucide-react';

interface CheckoutTableActionsProps {
  checkoutId: string;
  checkoutName: string;
  domainId?: string | null;
  onCopyLink: (checkoutId: string, domainId?: string | null) => void;
  onDelete: (checkoutId: string, checkoutName: string) => void;
}

export const CheckoutTableActions = ({ 
  checkoutId, 
  checkoutName, 
  domainId, 
  onCopyLink, 
  onDelete 
}: CheckoutTableActionsProps) => {
  return (
    <div className="flex items-center space-x-1">
      {/* Visualizar */}
      <Link to={`/checkout/${checkoutId}`} target="_blank">
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 text-gray-400 hover:text-blue-400 hover:bg-gray-700"
          title="Visualizar checkout"
        >
          <Eye className="h-4 w-4" />
        </Button>
      </Link>
      
      {/* Copiar Link */}
      <Button 
        variant="ghost" 
        size="icon" 
        className="h-8 w-8 text-gray-400 hover:text-green-400 hover:bg-gray-700"
        onClick={() => onCopyLink(checkoutId, domainId)}
        title="Copiar link do checkout"
      >
        <Link2 className="h-4 w-4" />
      </Button>
      
      {/* Editar */}
      <Link to={`/checkouts/edit/${checkoutId}`}>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 text-gray-400 hover:text-yellow-400 hover:bg-gray-700"
          title="Editar checkout"
        >
          <Pencil className="h-4 w-4" />
        </Button>
      </Link>
      
      {/* Excluir */}
      <Button 
        variant="ghost" 
        size="icon" 
        className="h-8 w-8 text-gray-400 hover:text-red-400 hover:bg-gray-700"
        onClick={() => onDelete(checkoutId, checkoutName)}
        title="Excluir checkout"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
};
