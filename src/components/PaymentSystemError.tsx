import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface PaymentSystemErrorProps {
  error: string;
  onRetry?: () => void;
  showRetryButton?: boolean;
}

export const PaymentSystemError = ({ 
  error, 
  onRetry, 
  showRetryButton = true 
}: PaymentSystemErrorProps) => {
  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <div className="max-w-md w-full space-y-4">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">Sistema de Pagamento Indisponível</p>
              <p className="text-sm">{error}</p>
            </div>
          </AlertDescription>
        </Alert>
        
        {showRetryButton && onRetry && (
          <Button 
            onClick={onRetry} 
            className="w-full"
            variant="outline"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Tentar Novamente
          </Button>
        )}
        
        <div className="text-center text-sm text-muted-foreground">
          <p>Se o problema persistir, entre em contato com o suporte.</p>
        </div>
      </div>
    </div>
  );
};