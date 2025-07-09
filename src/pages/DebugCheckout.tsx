import { useCheckoutContext } from '@/context/CheckoutContext';
import { useProductContext } from '@/context/ProductContext';

const DebugCheckout = () => {
  const { checkouts, getCheckoutById } = useCheckoutContext();
  const { products, getProductById } = useProductContext();

  console.log('🐛 DEBUG - Total checkouts:', checkouts.length);
  console.log('🐛 DEBUG - Checkouts:', checkouts);
  console.log('🐛 DEBUG - Total products:', products.length);
  console.log('🐛 DEBUG - Products:', products);

  const testCheckout = getCheckoutById('chk_01');
  console.log('🐛 DEBUG - Teste getCheckoutById(chk_01):', testCheckout);

  const testProduct = getProductById('prod_01');
  console.log('🐛 DEBUG - Teste getProductById(prod_01):', testProduct);

  return (
    <div className="min-h-screen bg-gray-900 p-8 text-white">
      <h1 className="text-2xl font-bold mb-6">Debug - Estado dos Contextos</h1>
      
      <div className="space-y-6">
        <div className="bg-gray-800 p-4 rounded">
          <h2 className="text-lg font-semibold mb-2">Checkouts ({checkouts.length})</h2>
          {checkouts.length > 0 ? (
            <ul className="space-y-2">
              {checkouts.map(checkout => (
                <li key={checkout.id} className="text-sm">
                  <strong>{checkout.id}</strong> - {checkout.name} (Status: {checkout.status})
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-red-400">Nenhum checkout encontrado</p>
          )}
        </div>

        <div className="bg-gray-800 p-4 rounded">
          <h2 className="text-lg font-semibold mb-2">Products ({products.length})</h2>
          {products.length > 0 ? (
            <ul className="space-y-2">
              {products.map(product => (
                <li key={product.id} className="text-sm">
                  <strong>{product.id}</strong> - {product.name} (R$ {product.price})
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-red-400">Nenhum produto encontrado</p>
          )}
        </div>

        <div className="bg-gray-800 p-4 rounded">
          <h2 className="text-lg font-semibold mb-2">Teste de Funções</h2>
          <p className="text-sm">
            getCheckoutById('chk_01'): {testCheckout ? `✅ ${testCheckout.name}` : '❌ Não encontrado'}
          </p>
          <p className="text-sm">
            getProductById('prod_01'): {testProduct ? `✅ ${testProduct.name}` : '❌ Não encontrado'}
          </p>
        </div>

        <div className="bg-blue-900 p-4 rounded">
          <h2 className="text-lg font-semibold mb-2">Links de Teste</h2>
          <div className="space-y-2">
            <a href="/checkout/chk_01" className="block text-blue-300 hover:text-blue-100">
              /checkout/chk_01 - Curso Marketing Digital
            </a>
            <a href="/checkout/chk_02" className="block text-blue-300 hover:text-blue-100">
              /checkout/chk_02 - Programa de Vendas
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DebugCheckout;