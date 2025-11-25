
import {
  Product, Offer, Checkout, Gateway, Order, Payment, WebhookLog, Domain, WebhookConfig, Integration
} from '../types';
import { supabase } from './supabase';
export { supabase };

/**
 * SERVICE LAYER - SUPABASE IMPLEMENTATION
 */
class StorageService {

  private async getUser() {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user;
  }

  // --- PRODUCTS ---

  async getProducts(): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching products:', error.message);
      return [];
    }

    return (data || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      active: p.active,
      imageUrl: p.image_url,
      price_real: p.price_real,
      price_fake: p.price_fake,
      sku: p.sku,
      category: p.category,
      redirect_link: p.redirect_link,
      is_order_bump: p.is_order_bump,
      is_upsell: p.is_upsell
    }));
  }


  async createProduct(product: Omit<Product, 'id'> & { id?: string }) {
    const user = await this.getUser();
    if (!user) throw new Error('No user logged in');

    const record = {
      id: product.id,
      user_id: user.id,
      name: product.name,
      description: product.description,
      active: product.active,
      image_url: product.imageUrl,
      price: product.price_real, // Required by DB constraint
      price_real: product.price_real,
      price_fake: product.price_fake,
      sku: product.sku,
      category: product.category,
      redirect_link: product.redirect_link,
      is_order_bump: product.is_order_bump,
      is_upsell: product.is_upsell
    };

    const { data, error } = await supabase
      .from('products')
      .insert(record)
      .select()
      .single();

    if (error) {
      console.error('Error creating product:', error.message);
      throw error;
    }
    return data;
  }

  async updateProduct(product: Product) {
    const user = await this.getUser();
    if (!user) throw new Error('No user logged in');

    const record = {
      name: product.name,
      description: product.description,
      active: product.active,
      image_url: product.imageUrl,
      price: product.price_real, // Required by DB constraint
      price_real: product.price_real,
      price_fake: product.price_fake,
      sku: product.sku,
      category: product.category,
      redirect_link: product.redirect_link,
      is_order_bump: product.is_order_bump,
      is_upsell: product.is_upsell
    };

    const { data, error } = await supabase
      .from('products')
      .update(record)
      .eq('id', product.id)
      .eq('user_id', user.id) // Extra safety
      .select()
      .single();

    if (error) {
      console.error('Error updating product:', error.message);
      throw error;
    }
    return data;
  }

  async deleteProduct(id: string) {
    const user = await this.getUser();
    if (!user) throw new Error('No user logged in');

    console.log('Tentando deletar arquivos da pasta:', id);

    // 1. Try main path: {id}/
    let folderPath = `${id}`;
    let { data: files, error: listError } = await supabase.storage
      .from('products')
      .list(folderPath);

    if (listError) {
      console.error('Erro ao listar:', listError);
    } else if (!files || files.length === 0) {
      console.warn('Nenhum arquivo encontrado na pasta (Caminho pode estar errado ou pasta vazia).');

      // Fallback: Try legacy path 'products/{id}/'
      console.log('Tentando caminho legado: products/' + id);
      folderPath = `products/${id}`;
      const legacyResult = await supabase.storage.from('products').list(folderPath);
      files = legacyResult.data;
      listError = legacyResult.error;

      if (listError) {
        console.error('Erro ao listar caminho legado:', listError);
      } else if (files && files.length > 0) {
        console.log('Arquivos encontrados no caminho legado:', files);
      } else {
        console.warn('Nenhum arquivo encontrado também no caminho legado.');
      }
    } else {
      console.log('Arquivos encontrados:', files);
    }

    if (files && files.length > 0) {
      // Important: Path must be relative to bucket: {folder}/{filename}
      const filesToRemove = files.map(f => `${folderPath}/${f.name}`);
      console.log('Tentando remover arquivos:', filesToRemove);

      const { error: removeError } = await supabase.storage
        .from('products')
        .remove(filesToRemove);

      if (removeError) {
        console.error('Erro ao remover arquivos (Provavel erro de RLS/Permissão):', removeError);
      } else {
        console.log('Arquivos removidos com sucesso');
      }
    }

    // 3. Delete product record
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting product:', error.message);
      throw error;
    }
  }

  private extractPathFromUrl(url: string): string | null {
    try {
      const bucketName = 'products';
      const parts = url.split(`/${bucketName}/`);
      if (parts.length === 2) {
        return parts[1];
      }
      return null;
    } catch (e) {
      console.error('Error extracting path from URL:', e);
      return null;
    }
  }

  async uploadProductImage(file: File, productId: string): Promise<string> {
    const user = await this.getUser();
    if (!user) throw new Error('No user logged in');

    const fileExt = file.name.split('.').pop();

    // REGRA 2: Caminho deve ser APENAS ${productId}/${fileName}
    // Usando timestamp para garantir unicidade dentro da pasta do produto
    const fileName = `${productId}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('products')
      .upload(fileName, file);

    if (uploadError) {
      console.error('Error uploading image:', uploadError.message);
      throw uploadError;
    }

    const { data } = supabase.storage
      .from('products')
      .getPublicUrl(fileName);

    return data.publicUrl;
  }

  async uploadCheckoutBanner(file: File, checkoutId: string): Promise<string> {
    const user = await this.getUser();
    if (!user) throw new Error('No user logged in');

    const fileExt = file.name.split('.').pop();
    // NOVA ESTRUTURA: checkouts/{checkoutId}/{timestamp}.{ext}
    const fileName = `${checkoutId}/${Date.now()}.${fileExt}`;

    // Usando o novo bucket 'checkouts'
    const { error: uploadError } = await supabase.storage
      .from('checkouts')
      .upload(fileName, file);

    if (uploadError) {
      console.error('Error uploading banner:', uploadError.message);
      throw uploadError;
    }

    const { data } = supabase.storage
      .from('checkouts')
      .getPublicUrl(fileName);

    return data.publicUrl;
  }

  // @deprecated Use createProduct or updateProduct instead
  async saveProducts(items: Product[]) {
    console.warn('saveProducts is deprecated. Use createProduct/updateProduct instead.');
    // Keeping for backward compatibility during refactor, but it might fail for new items with invalid IDs
    const user = await this.getUser();
    if (!user) return;

    // ... implementation kept but warned
    const records = items.map(p => ({
      id: p.id.startsWith('prod_') ? undefined : p.id, // Try to strip invalid IDs if possible, but upsert needs ID for update
      user_id: user.id,
      name: p.name,
      description: p.description,
      active: p.active,
      image_url: p.imageUrl,
      price_real: p.price_real,
      price_fake: p.price_fake,
      sku: p.sku,
      category: p.category,
      redirect_link: p.redirect_link,
      is_order_bump: p.is_order_bump,
      is_upsell: p.is_upsell
    }));

    // Filter out items that would cause issues if we can't map them perfectly, 
    // but for now let's just try to save what we can. 
    // Actually, the best way is to just log error if this is called.

    const { data, error } = await supabase
      .from('products')
      .upsert(records, { onConflict: 'id', ignoreDuplicates: false })
      .select();

    if (error) console.error('Error saving products (bulk):', error.message);
  }


  // --- OFFERS ---

  async getOffers(): Promise<Offer[]> {
    const { data, error } = await supabase.from('offers').select('*');
    if (error) {
      console.error('Error fetching offers:', error.message);
      return [];
    }
    return data as Offer[];
  }

  async createOffer(offer: Omit<Offer, 'id'>) {
    const user = await this.getUser();
    if (!user) throw new Error('No user logged in');

    const record = {
      user_id: user.id,
      name: offer.name,
      product_id: offer.product_id,
      price: offer.price,
      payment_type: offer.payment_type,
      recurrence_type: offer.recurrence_type,
      active: offer.active
    };

    const { data, error } = await supabase
      .from('offers')
      .insert(record)
      .select()
      .single();

    if (error) {
      console.error('Error creating offer:', error.message);
      throw error;
    }
    return data;
  }

  async updateOffer(offer: Offer) {
    const user = await this.getUser();
    if (!user) throw new Error('No user logged in');

    const record = {
      name: offer.name,
      product_id: offer.product_id,
      price: offer.price,
      payment_type: offer.payment_type,
      recurrence_type: offer.recurrence_type,
      active: offer.active
    };

    const { data, error } = await supabase
      .from('offers')
      .update(record)
      .eq('id', offer.id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating offer:', error.message);
      throw error;
    }
    return data;
  }

  async deleteOffer(id: string) {
    const user = await this.getUser();
    if (!user) throw new Error('No user logged in');

    const { error } = await supabase
      .from('offers')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting offer:', error.message);
      throw error;
    }
  }

  // @deprecated Use createOffer or updateOffer
  async saveOffers(items: Offer[]) {
    console.warn('saveOffers is deprecated');
    const user = await this.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('offers')
      .upsert(
        items.map(i => ({ ...i, user_id: user.id })),
        { onConflict: 'id', ignoreDuplicates: false }
      )
      .select();

    if (error) console.error('Error saving offers:', error.message, error);
  }

  // --- CHECKOUTS ---

  async getCheckouts(): Promise<Checkout[]> {
    const { data, error } = await supabase.from('checkouts').select('*');
    if (error) {
      console.error('Error fetching checkouts:', error.message);
      return [];
    }
    return data as Checkout[];
  }

  async createCheckout(checkout: Omit<Checkout, 'id'> & { id?: string }) {
    const user = await this.getUser();
    if (!user) throw new Error('No user logged in');

    const record = {
      id: checkout.id, // Optional: allow pre-generated ID
      user_id: user.id,
      name: checkout.name,
      offer_id: checkout.offer_id,
      domain_id: checkout.domain_id,
      gateway_id: checkout.gateway_id,
      product_id: checkout.product_id,
      custom_url_slug: checkout.custom_url_slug,
      order_bump_ids: checkout.order_bump_ids,
      upsell_product_id: checkout.upsell_product_id,
      config: checkout.config,
      active: checkout.active,
    };

    const { data, error } = await supabase
      .from('checkouts')
      .insert(record)
      .select()
      .single();

    if (error) {
      console.error('Error creating checkout:', error.message);
      throw error;
    }
    return data;
  }

  async getCheckoutByDomainId(domainId: string): Promise<Checkout | null> {
    const { data, error } = await supabase
      .from('checkouts')
      .select('*')
      .eq('domain_id', domainId)
      .eq('active', true)
      .single();

    if (error) {
      if (error.code !== 'PGRST116') { // Row not found
        console.error('Error fetching checkout by domain:', error.message);
      }
      return null;
    }
    return data as Checkout;
  }

  async updateCheckout(checkout: Checkout) {
    const user = await this.getUser();
    if (!user) throw new Error('No user logged in');

    const record = {
      name: checkout.name,
      offer_id: checkout.offer_id,
      domain_id: checkout.domain_id,
      gateway_id: checkout.gateway_id,
      product_id: checkout.product_id,
      custom_url_slug: checkout.custom_url_slug,
      order_bump_ids: checkout.order_bump_ids,
      upsell_product_id: checkout.upsell_product_id,
      config: checkout.config,
      active: checkout.active,
    };

    const { data, error } = await supabase
      .from('checkouts')
      .update(record)
      .eq('id', checkout.id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating checkout:', error.message);
      throw error;
    }
    return data;
  }

  async deleteCheckout(id: string) {
    const user = await this.getUser();
    if (!user) throw new Error('No user logged in');

    console.log('Iniciando exclusão do checkout:', id);

    // 1. Limpar Storage (Bucket 'checkouts')
    // Lista arquivos na pasta do checkout
    const { data: files, error: listError } = await supabase.storage
      .from('checkouts')
      .list(id);

    if (listError) {
      console.error('Erro ao listar arquivos do checkout:', listError);
      // Não interrompe, tenta deletar o registro mesmo assim
    } else if (files && files.length > 0) {
      const filesToRemove = files.map(f => `${id}/${f.name}`);
      console.log('Removendo arquivos do checkout:', filesToRemove);

      const { error: removeError } = await supabase.storage
        .from('checkouts')
        .remove(filesToRemove);

      if (removeError) {
        console.error('Erro ao remover arquivos do checkout:', removeError);
      } else {
        console.log('Arquivos do checkout removidos com sucesso.');
      }
    } else {
      console.log('Nenhum arquivo encontrado para este checkout.');
    }

    // 2. Deletar Registro do Banco
    const { error } = await supabase
      .from('checkouts')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting checkout:', error.message);
      throw error;
    }
  }

  // @deprecated
  async saveCheckouts(items: Checkout[]) {
    console.warn('saveCheckouts is deprecated');
    const user = await this.getUser();
    if (!user) return;

    const records = items.map(c => ({
      ...c,
      user_id: user.id
    }));

    const { data, error } = await supabase
      .from('checkouts')
      .upsert(records, { onConflict: 'id', ignoreDuplicates: false })
      .select();

    if (error) console.error('Error saving checkouts:', error.message, error);
  }

  // --- DOMAINS ---

  async getDomains(): Promise<Domain[]> {
    const { data, error } = await supabase.from('domains').select('*');
    if (error) {
      console.error('Error fetching domains:', error.message);
      return [];
    }
    return data as Domain[];
  }

  async getDomainByHostname(hostname: string): Promise<Domain | null> {
    const { data, error } = await supabase
      .from('domains')
      .select('*')
      .eq('domain', hostname)
      .eq('status', 'active')
      .single();

    if (error) {
      // Ignore "Row not found" errors, just return null
      if (error.code !== 'PGRST116') {
        console.error('Error fetching domain by hostname:', error.message);
      }
      return null;
    }
    return data as Domain;
  }

  async createDomain(domain: Omit<Domain, 'id'>) {
    const user = await this.getUser();
    if (!user) throw new Error('No user logged in');

    const record = {
      user_id: user.id,
      domain: domain.domain,
      status: domain.status,
      type: domain.type,
      checkout_id: domain.checkout_id,
      slug: domain.slug
    };

    const { data, error } = await supabase
      .from('domains')
      .insert(record)
      .select()
      .single();

    if (error) {
      console.error('Error creating domain:', error.message);
      throw error;
    }
    return data;
  }

  async deleteDomain(id: string) {
    const user = await this.getUser();
    if (!user) throw new Error('No user logged in');

    const { error } = await supabase
      .from('domains')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting domain:', error.message);
      throw error;
    }
  }

  async saveDomains(items: Domain[]) {
    console.warn('saveDomains is deprecated. Use createDomain instead.');
    const user = await this.getUser();
    if (!user) return;

    // Filter out items with temp IDs (starting with 'dom_') to avoid UUID errors
    const validItems = items.filter(i => !i.id.startsWith('dom_'));

    if (validItems.length === 0) return;

    const { data, error } = await supabase
      .from('domains')
      .upsert(
        validItems.map(i => ({ ...i, user_id: user.id })),
        { onConflict: 'id', ignoreDuplicates: false }
      )
      .select();

    if (error) {
      console.error('Error saving domains:', error.message, error);
    }
  }

  // --- GATEWAYS ---

  async getGateways(): Promise<Gateway[]> {
    const { data, error } = await supabase.from('gateways').select('*');
    if (error) {
      console.error('Error fetching gateways:', error.message);
      return [];
    }
    return data as Gateway[];
  }

  async createGateway(gateway: Omit<Gateway, 'id'>) {
    const user = await this.getUser();
    if (!user) throw new Error('No user logged in');

    const record = {
      user_id: user.id,
      name: gateway.name,
      public_key: gateway.public_key,
      private_key: gateway.private_key,
      webhook_secret: gateway.webhook_secret,
      active: gateway.active
    };

    const { data, error } = await supabase
      .from('gateways')
      .insert(record)
      .select()
      .single();

    if (error) {
      console.error('Error creating gateway:', error.message);
      throw error;
    }
    return data;
  }

  async updateGateway(gateway: Gateway) {
    const user = await this.getUser();
    if (!user) throw new Error('No user logged in');

    const record = {
      name: gateway.name,
      public_key: gateway.public_key,
      private_key: gateway.private_key,
      webhook_secret: gateway.webhook_secret,
      active: gateway.active
    };

    const { data, error } = await supabase
      .from('gateways')
      .update(record)
      .eq('id', gateway.id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating gateway:', error.message);
      throw error;
    }
    return data;
  }

  // @deprecated Use createGateway or updateGateway
  async saveGateways(items: Gateway[]) {
    console.warn('saveGateways is deprecated. Use createGateway/updateGateway instead.');
    const user = await this.getUser();
    if (!user) {
      console.error('No user logged in');
      return;
    }

    const { data, error } = await supabase
      .from('gateways')
      .upsert(
        items.map(i => ({ ...i, user_id: user.id })),
        { onConflict: 'id', ignoreDuplicates: false }
      )
      .select();

    if (error) {
      console.error('Error saving gateways:', error.message, error);
    } else {
      console.log('Gateways saved successfully:', data);
    }
  }

  // --- ORDERS ---

  async getOrders(): Promise<Order[]> {
    // RLS handles filtering for the logged-in merchant
    const { data: orders, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error getting orders:", error.message);
      return [];
    }

    // Manually fetch related data to avoid join issues
    const { data: checkouts } = await supabase.from('checkouts').select('id, product_id');
    const { data: products } = await supabase.from('products').select('id, name');

    return orders.map((o: any) => {
      let items = o.items;

      // Fallback for old orders (no items saved)
      if (!items || !Array.isArray(items) || items.length === 0) {
        const checkout = checkouts?.find(c => c.id === o.checkout_id);
        const product = products?.find(p => p.id === checkout?.product_id);
        const productName = product?.name || 'Produto';
        items = [{ name: productName, price: o.total, quantity: 1 }];
      }

      return {
        ...o,
        amount: o.total, // Map DB 'total' back to 'amount'
        items: items
      };
    }) as Order[];
  }

  async saveOrders(items: Order[]) {
    if (items.length === 0) return;

    const order = items[0];
    let merchantId = null;

    // If logged in (Merchant creating manual order)
    const user = await this.getUser();
    if (user) {
      merchantId = user.id;
    } else if (order.checkout_id) {
      // Public Checkout: Fetch checkout to find merchant ID
      const { data: checkout } = await supabase
        .from('checkouts')
        .select('user_id')
        .eq('id', order.checkout_id)
        .single();
      if (checkout) merchantId = checkout.user_id;
    }

    // We prepare records.
    const records = items.map(o => {
      // Map 'amount' to 'total' and keep 'items' for the new JSONB column
      const { amount, ...rest } = o;
      return {
        ...rest,
        total: amount, // Map amount to total
        items: o.items, // Persist items!
        user_id: merchantId
      };
    });

    const { error } = await supabase.from('orders').upsert(records);
    if (error) {
      console.error("Error saving order:", error.message);
      throw new Error(`Failed to save order: ${error.message}`);
    }
  }

  async createOrder(order: Order) {
    let merchantId = null;

    // If logged in (Merchant creating manual order)
    const user = await this.getUser();
    if (user) {
      merchantId = user.id;
    } else if (order.checkout_id) {
      // Public Checkout: Fetch checkout to find merchant ID
      const { data: checkout } = await supabase
        .from('checkouts')
        .select('user_id')
        .eq('id', order.checkout_id)
        .single();
      if (checkout) merchantId = checkout.user_id;
    }

    // Prepare record
    const { amount, ...rest } = order;
    const record = {
      ...rest,
      total: amount,
      items: order.items,
      user_id: merchantId
    };

    const { error } = await supabase.from('orders').insert(record);
    if (error) {
      console.error("Error creating order:", error.message);
      throw new Error(`Failed to create order: ${error.message}`);
    }
  }

  // --- PAYMENTS ---
  // --- PAYMENTS ---

  async getPayments(): Promise<Payment[]> {
    const { data, error } = await supabase.from('payments').select('*');
    if (error) {
      console.error('Error fetching payments:', error.message);
      return [];
    }
    return data as Payment[];
  }

  async createPayment(payment: Payment) {
    // Ensure user_id is set
    let paymentToSave = { ...payment };

    if (!paymentToSave.user_id) {
      const user = await this.getUser();
      if (user) {
        paymentToSave.user_id = user.id;
      } else {
        const { data: order } = await supabase
          .from('orders')
          .select('user_id')
          .eq('id', payment.order_id)
          .single();
        paymentToSave.user_id = order?.user_id;
      }
    }

    const { error } = await supabase.from('payments').insert(paymentToSave);

    if (error) {
      console.error('Error creating payment:', error.message);
      throw error;
    }
  }

  async getPaymentByTransactionId(transactionId: string): Promise<Payment | null> {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('transaction_id', transactionId)
      .single();

    if (error) {
      // It's common to not find it if it doesn't exist yet
      return null;
    }
    return data as Payment;
  }

  async savePayments(items: Payment[]) {
    if (items.length === 0) return;

    // We need to ensure each payment has a user_id (Merchant ID) for RLS
    const paymentsWithUser = await Promise.all(items.map(async (p) => {
      // If we already have a user (logged in), use it
      const user = await this.getUser();
      if (user) return { ...p, user_id: user.id };

      // Otherwise, fetch the Order to find the merchant
      const { data: order } = await supabase
        .from('orders')
        .select('user_id')
        .eq('id', p.order_id)
        .single();

      return {
        ...p,
        user_id: order?.user_id
      };
    }));

    const { error } = await supabase.from('payments').upsert(paymentsWithUser);

    if (error) {
      console.error('Error saving payments:', error.message);
      throw error;
    }
  }

  // --- INTEGRATIONS ---

  async getIntegration(name: string): Promise<Integration | null> {
    const user = await this.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('integrations')
      .select('*')
      .eq('name', name)
      .eq('user_id', user.id)
      .single();

    if (error) {
      if (error.code !== 'PGRST116') { // Not found
        console.error('Error fetching integration:', error.message);
      }
      return null;
    }
    return data as Integration;
  }

  async saveIntegration(integration: { name: string; config: any; active: boolean }) {
    const user = await this.getUser();
    if (!user) throw new Error('No user logged in');

    const record = {
      user_id: user.id,
      name: integration.name,
      config: integration.config,
      active: integration.active
    };

    const { data, error } = await supabase
      .from('integrations')
      .upsert(record, { onConflict: 'user_id, name' })
      .select()
      .single();

    if (error) {
      console.error('Error saving integration:', error.message);
      throw error;
    }
    return data;
  }

  // --- WEBHOOKS ---

  async getWebhooks(): Promise<WebhookConfig[]> {
    const { data, error } = await supabase.from('webhooks').select('*');
    if (error) {
      console.error('Error fetching webhooks:', error.message);
      return [];
    }
    return data as WebhookConfig[];
  }

  async saveWebhooks(items: WebhookConfig[]) {
    const user = await this.getUser();
    if (!user) {
      console.error('No user logged in');
      return;
    }

    const { data, error } = await supabase
      .from('webhooks')
      .upsert(
        items.map(i => ({ ...i, user_id: user.id })),
        { onConflict: 'id', ignoreDuplicates: false }
      )
      .select();

    if (error) {
      console.error('Error saving webhooks:', error.message, error);
    } else {
      console.log('Webhooks saved successfully:', data);
    }
  }

  async getWebhookLogs(): Promise<WebhookLog[]> {
    const { data, error } = await supabase.from('webhook_logs').select('*').order('created_at', { ascending: false }).limit(100);
    if (error) return [];
    return data as WebhookLog[];
  }

  async saveWebhookLogs(items: WebhookLog[]) {
    const { error } = await supabase.from('webhook_logs').insert(items);
    if (error) console.error('Error saving logs:', error.message);
  }
}

export const storage = new StorageService();
