
import { useState } from 'react';
import { Layout } from '../components/Layout';
import { useCheckoutContext } from '../context/CheckoutContext';
import { useDomainContext } from '../context/DomainContext';
import { KPICards } from '../components/checkouts/KPICards';
import { CheckoutTable } from '../components/checkouts/CheckoutTable';
import { EmptyCheckoutState } from '../components/checkouts/EmptyCheckoutState';
import { LoadingState } from '../components/checkouts/LoadingState';
import { useCheckoutActions } from '../hooks/useCheckoutActions';

const Checkouts = () => {
  const { checkouts, products } = useCheckoutContext();
  const { customDomain } = useDomainContext();
  const [loading, setLoading] = useState(false);
  const { handleCopyLink, handleDeleteCheckout } = useCheckoutActions();
  
  // Debug: mostrar checkouts no console
  console.log('📊 Dashboard - Total de checkouts:', checkouts.length);
  console.log('📋 Dashboard - Lista de checkouts:', checkouts.map(c => ({ id: c.id, name: c.name })));

  if (loading) {
    return (
      <Layout>
        <LoadingState />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8">
        {/* KPI Cards */}
        <KPICards checkoutsCount={checkouts.length} />

        {/* Checkouts Table */}
        {checkouts.length > 0 ? (
          <CheckoutTable
            checkouts={checkouts}
            products={products}
            customDomain={customDomain}
            onCopyLink={handleCopyLink}
            onDeleteCheckout={handleDeleteCheckout}
          />
        ) : (
          <EmptyCheckoutState />
        )}
      </div>
    </Layout>
  );
};

export default Checkouts;
