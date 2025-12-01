
import {
  Product, Offer, Checkout, Gateway, Order, Payment, WebhookLog, Domain, WebhookConfig, Integration,
  Content, Module, Lesson, MemberArea, LessonProgress, Track, TrackItem
} from '../types';
import { supabase } from './supabase';
export { supabase };

/**
 * SERVICE LAYER - SUPABASE IMPLEMENTATION
 */
class StorageService {

  async getUser() {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user;
  }

  // --- PRODUCTS ---

  async getProducts(): Promise<Product[]> {
    const user = await this.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('user_id', user.id)
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
      is_upsell: p.is_upsell,
      visible_in_member_area: p.visible_in_member_area,
      for_sale: p.for_sale,
      member_area_action: p.member_area_action,
      member_area_checkout_id: p.member_area_checkout_id
    }));
  }

  async getMemberAreaProducts(areaId: string): Promise<Product[]> {
    // 1. Get all PRODUCT tracks for this member area
    const { data: tracks, error: tracksError } = await supabase
      .from('tracks')
      .select('id')
      .eq('member_area_id', areaId)
      .eq('type', 'products'); // Filter by track type

    if (tracksError) {
      console.error('Error fetching tracks for products:', tracksError.message);
      return [];
    }

    if (!tracks || tracks.length === 0) return [];

    const trackIds = tracks.map(t => t.id);

    // 2. Get all items from these tracks (they are guaranteed to be products)
    const { data: trackItems, error: itemsError } = await supabase
      .from('track_items')
      .select('item_id')
      .in('track_id', trackIds);

    if (itemsError) {
      console.error('Error fetching track items:', itemsError.message);
      return [];
    }

    if (!trackItems || trackItems.length === 0) return [];

    const productIds = [...new Set(trackItems.map(i => i.item_id))]; // Unique IDs

    // 3. Get the actual products
    const { data, error } = await supabase
      .from('products')
      .select('*, checkouts:member_area_checkout_id(id, custom_url_slug, domain_id, domains:domain_id(domain))')
      .in('id', productIds)
      .eq('active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching member area products:', error.message);
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
      is_upsell: p.is_upsell,
      visible_in_member_area: p.visible_in_member_area,
      for_sale: p.for_sale,
      member_area_action: p.member_area_action,
      member_area_checkout_id: p.member_area_checkout_id,
      // Helper to resolve redirect link dynamically if checkout is selected
      redirect_link: (p.member_area_action === 'checkout' && p.checkouts)
        ? `https://${p.checkouts.domains?.domain || 'checkout.supercheckout.com'}/${p.checkouts.custom_url_slug}`
        : p.redirect_link
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
      is_upsell: product.is_upsell,
      visible_in_member_area: product.visible_in_member_area,
      for_sale: product.for_sale,
      member_area_action: product.member_area_action,
      member_area_checkout_id: product.member_area_checkout_id
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
      is_upsell: product.is_upsell,
      visible_in_member_area: product.visible_in_member_area,
      for_sale: product.for_sale,
      member_area_action: product.member_area_action,
      member_area_checkout_id: product.member_area_checkout_id
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
    const user = await this.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('offers')
      .select('*')
      .eq('user_id', user.id);

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
    const user = await this.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('checkouts')
      .select('*')
      .eq('user_id', user.id);

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

  async getCheckoutByDomainAndSlug(domainId: string, slug?: string): Promise<Checkout | null> {
    let query = supabase
      .from('checkouts')
      .select('*')
      .eq('domain_id', domainId)
      .eq('active', true);

    if (slug) {
      query = query.eq('custom_url_slug', slug);
    }

    // If no slug is provided, we might want to find a "default" checkout (e.g. one with empty slug)
    // or just return the first one found. For now, let's return the first one found to keep simple.

    const { data, error } = await query.limit(1).maybeSingle();

    if (error) {
      console.error('Error fetching checkout by domain/slug:', error.message);
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

  // --- PUBLIC METHODS (NO AUTH REQUIRED) ---

  async getPublicCheckout(idOrSlug: string): Promise<Checkout | null> {
    // Try by ID first
    let { data, error } = await supabase
      .from('checkouts')
      .select('*')
      .eq('id', idOrSlug)
      .eq('active', true)
      .maybeSingle();

    if (!data) {
      // Try by Slug
      const { data: dataSlug, error: errorSlug } = await supabase
        .from('checkouts')
        .select('*')
        .eq('custom_url_slug', idOrSlug)
        .eq('active', true)
        .maybeSingle();

      data = dataSlug;
      error = errorSlug;
    }

    if (error) {
      console.error('Error fetching public checkout:', error.message);
      return null;
    }
    return data as Checkout;
  }

  async getPublicProduct(id: string): Promise<Product | null> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching public product:', error.message);
      return null;
    }

    return {
      id: data.id,
      name: data.name,
      description: data.description,
      active: data.active,
      imageUrl: data.image_url,
      price_real: data.price_real,
      price_fake: data.price_fake,
      sku: data.sku,
      category: data.category,
      redirect_link: data.redirect_link,
      is_order_bump: data.is_order_bump,
      is_upsell: data.is_upsell,
      visible_in_member_area: data.visible_in_member_area,
      for_sale: data.for_sale,
      member_area_action: data.member_area_action,
      member_area_checkout_id: data.member_area_checkout_id
    };
  }

  async getPublicGateway(id: string): Promise<Gateway | null> {
    const { data, error } = await supabase
      .from('gateways')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching public gateway:', error.message);
      return null;
    }
    return data as Gateway;
  }

  // --- DOMAINS ---

  async getDomains(): Promise<Domain[]> {
    const user = await this.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('domains')
      .select('*')
      .eq('user_id', user.id);

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
    const user = await this.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('gateways')
      .select('*')
      .eq('user_id', user.id);

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
    const user = await this.getUser();
    if (!user) return [];

    const { data: orders, error } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', user.id)
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
    const user = await this.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('user_id', user.id);
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
    const user = await this.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('webhooks')
      .select('*')
      .eq('user_id', user.id);
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

  // --- MEMBER AREA: CONTENTS ---

  async getContents(memberAreaId?: string): Promise<Content[]> {
    let query = supabase
      .from('contents')
      .select('*, modules_count:modules(count), product_contents(product:products(*, checkout:checkouts!products_member_area_checkout_id_fkey(*, domain:domains(*))))')
      .order('created_at', { ascending: false });

    if (memberAreaId) {
      query = query.eq('member_area_id', memberAreaId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching contents:', error.message);
      return [];
    }

    return data.map((c: any) => {
      const product = c.product_contents?.[0]?.product;
      const checkout = product?.checkout;
      const checkoutSlug = checkout?.custom_url_slug;
      const domain = checkout?.domain?.domain;

      let checkoutUrl = undefined;
      if (domain && checkoutSlug) {
        checkoutUrl = `https://${domain}/${checkoutSlug}`;
      } else if (checkoutSlug) {
        checkoutUrl = `/checkout/${checkoutSlug}`;
      }

      return {
        ...c,
        modules_count: c.modules_count?.[0]?.count || 0,
        associated_product: product ? {
          ...product,
          imageUrl: product.image_url,
          checkout_slug: checkoutSlug,
          checkout_url: checkoutUrl
        } : undefined
      };
    }) as Content[];
  }

  async createContent(content: Omit<Content, 'id' | 'created_at' | 'updated_at'> & { id?: string }, productId?: string) {
    const user = await this.getUser();
    if (!user) throw new Error('No user logged in');

    const record = {
      id: content.id,
      title: content.title,
      description: content.description,
      thumbnail_url: content.thumbnail_url,
      type: content.type,
      member_area_id: content.member_area_id,
      author_id: user.id,
      is_free: content.is_free,
      image_vertical_url: content.image_vertical_url,
      image_horizontal_url: content.image_horizontal_url,
      modules_layout: content.modules_layout || 'horizontal'
    };

    const { data, error } = await supabase
      .from('contents')
      .insert(record)
      .select()
      .single();

    if (error) throw error;

    if (productId) {
      await this.setContentProduct(data.id, productId);
    }

    return data;
  }

  async updateContent(content: Content, productId?: string) {
    const record = {
      title: content.title,
      description: content.description,
      thumbnail_url: content.thumbnail_url,
      type: content.type,
      updated_at: new Date().toISOString(),
      image_vertical_url: content.image_vertical_url,
      image_horizontal_url: content.image_horizontal_url,
      modules_layout: content.modules_layout,
      is_free: content.is_free
    };

    const { data, error } = await supabase
      .from('contents')
      .update(record)
      .eq('id', content.id)
      .select()
      .single();

    if (error) throw error;

    if (productId !== undefined) {
      await this.setContentProduct(content.id, productId || null);
    }

    return data;
  }

  async deleteContent(id: string) {
    // 1. Delete files from storage
    try {
      const { data: files } = await supabase.storage.from('contents').list(id);
      if (files && files.length > 0) {
        const filesToRemove = files.map(f => `${id}/${f.name}`);
        await supabase.storage.from('contents').remove(filesToRemove);
      }
    } catch (error) {
      console.error('Error deleting content files:', error);
      // Continue to delete DB record even if storage cleanup fails
    }

    // 2. Delete DB record
    const { error } = await supabase.from('contents').delete().eq('id', id);
    if (error) throw error;
  }

  async uploadContentThumbnail(file: File, contentId: string): Promise<string> {
    const fileExt = file.name.split('.').pop();
    const fileName = `${contentId}/thumb_${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('contents') // Ensure this bucket exists!
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from('contents').getPublicUrl(fileName);
    return data.publicUrl;
  }

  async uploadContentImage(file: File, contentId: string, type: 'vertical' | 'horizontal'): Promise<string> {
    const fileExt = file.name.split('.').pop();
    const fileName = `${contentId}/${type}_${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('contents')
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from('contents').getPublicUrl(fileName);
    return data.publicUrl;
  }

  // --- MEMBER AREA: MODULES ---

  async getModules(contentId: string): Promise<Module[]> {
    const { data, error } = await supabase
      .from('modules')
      .select('*, lessons(*)')
      .eq('content_id', contentId)
      .order('order_index', { ascending: true });

    if (error) {
      console.error('Error fetching modules:', error.message);
      return [];
    }

    // Sort lessons inside modules
    const modules = data.map((m: any) => ({
      ...m,
      lessons: m.lessons?.sort((a: any, b: any) => a.order_index - b.order_index) || []
    }));

    return modules as Module[];
  }

  async getModulesByAreaId(areaId: string): Promise<Module[]> {
    // First get all contents for the area
    const { data: contents, error: contentsError } = await supabase
      .from('contents')
      .select('id')
      .eq('member_area_id', areaId);

    if (contentsError || !contents) return [];

    const contentIds = contents.map(c => c.id);
    if (contentIds.length === 0) return [];

    // Then get modules for these contents
    const { data, error } = await supabase
      .from('modules')
      .select('*, lessons(*)')
      .in('content_id', contentIds)
      .order('order_index', { ascending: true });

    if (error) {
      console.error('Error fetching modules by area:', error.message);
      return [];
    }

    return data as Module[];
  }

  async createModule(module: Partial<Module>) {
    const record = {
      id: module.id,
      content_id: module.content_id,
      title: module.title,
      description: module.description,
      order_index: module.order_index,
      image_vertical_url: module.image_vertical_url,
      image_horizontal_url: module.image_horizontal_url,
      is_free: module.is_free
    };

    const { data, error } = await supabase
      .from('modules')
      .insert(record)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateModule(module: Module) {
    const { data, error } = await supabase
      .from('modules')
      .update({
        title: module.title,
        description: module.description,
        order_index: module.order_index,
        image_vertical_url: module.image_vertical_url,
        image_horizontal_url: module.image_horizontal_url,
        is_free: module.is_free
      })
      .eq('id', module.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteModule(id: string) {
    const { error } = await supabase.from('modules').delete().eq('id', id);
  }

  async uploadModuleImage(file: File, moduleId: string, type: 'vertical' | 'horizontal'): Promise<string> {
    const fileExt = file.name.split('.').pop();
    const fileName = `${moduleId}/${type}_${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('contents')
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from('contents').getPublicUrl(fileName);
    return data.publicUrl;
  }

  // --- MEMBER AREA: LESSONS ---

  async createLesson(lesson: Omit<Lesson, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('lessons')
      .insert(lesson)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateLesson(lesson: Lesson) {
    const { data, error } = await supabase
      .from('lessons')
      .update({
        title: lesson.title,
        content_type: lesson.content_type,
        video_url: lesson.video_url,
        content_text: lesson.content_text,
        file_url: lesson.file_url,
        order_index: lesson.order_index,
        is_free: lesson.is_free,
        duration: lesson.duration,
        image_url: lesson.image_url,
        gallery: lesson.gallery,
        content_order: lesson.content_order
      })
      .eq('id', lesson.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteLesson(id: string) {
    const { error } = await supabase.from('lessons').delete().eq('id', id);
    if (error) throw error;
  }

  async uploadLessonImage(file: File, lessonId: string): Promise<string> {
    const fileExt = file.name.split('.').pop();
    const fileName = `${lessonId}/card_${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('contents')
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from('contents').getPublicUrl(fileName);
    return data.publicUrl;
  }


  // --- PRODUCT - CONTENT LINKING ---

  async getProductContents(productId: string): Promise<string[]> {
    const { data, error } = await supabase
      .from('product_contents')
      .select('content_id')
      .eq('product_id', productId);

    if (error) {
      console.error('Error fetching product contents:', error.message);
      return [];
    }
    return data.map((r: any) => r.content_id);
  }

  async setProductContents(productId: string, contentIds: string[]) {
    // 1. Remove existing links
    await supabase.from('product_contents').delete().eq('product_id', productId);

    if (contentIds.length === 0) return;

    // 2. Insert new links
    const records = contentIds.map(cid => ({
      product_id: productId,
      content_id: cid
    }));

    const { error } = await supabase.from('product_contents').insert(records);
    if (error) throw error;
  }

  async setContentProduct(contentId: string, productId: string | null) {
    // 1. Remove existing links for this content (ensure 1 product per content for this flow)
    await supabase.from('product_contents').delete().eq('content_id', contentId);

    if (!productId) return;

    // 2. Insert new link
    const { error } = await supabase.from('product_contents').insert({
      product_id: productId,
      content_id: contentId
    });
    if (error) throw error;
  }

  // --- LESSON PROGRESS ---

  async getLessonProgress(lessonId: string): Promise<LessonProgress | null> {
    const user = await this.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('lesson_progress')
      .select('*')
      .eq('lesson_id', lessonId)
      .eq('user_id', user.id)
      .single();

    if (error) return null;
    return data as LessonProgress;
  }

  // --- ACCESS GRANTS ---

  async getAccessGrants(): Promise<AccessGrant[]> {
    const user = await this.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('access_grants')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active');

    if (error) {
      console.error('Error fetching access grants:', error.message);
      return [];
    }
    return data as AccessGrant[];
  }

  async updateLessonProgress(progress: { lesson_id: string, completed: boolean, last_position_seconds?: number }) {
    const user = await this.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('lesson_progress')
      .upsert({
        user_id: user.id,
        lesson_id: progress.lesson_id,
        completed: progress.completed,
        last_position_seconds: progress.last_position_seconds,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id, lesson_id' });

    if (error) console.error('Error updating progress:', error);
  }

  // --- MEMBER AREAS ---

  async getMemberAreas(): Promise<MemberArea[]> {
    const user = await this.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('member_areas')
      .select('*')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching member areas:', error.message);
      return [];
    }
    return data as MemberArea[];
  }

  async getMemberAreaById(id: string): Promise<MemberArea | null> {
    const { data, error } = await supabase
      .from('member_areas')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return null;
    return data as MemberArea;
  }

  async getMemberAreaBySlug(slug: string): Promise<MemberArea | null> {
    const { data, error } = await supabase
      .from('member_areas')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error) return null;
    return data as MemberArea;
  }

  async getMemberAreaMembers(areaId: string): Promise<Member[]> {
    const { data, error } = await supabase.rpc('get_member_area_members', { area_id: areaId });

    if (error) {
      console.error('Error fetching member area members:', error.message);
      return [];
    }
    return data as Member[];
  }

  async createMemberArea(area: Omit<MemberArea, 'id' | 'created_at'>) {
    const user = await this.getUser();
    if (!user) throw new Error('No user logged in');

    const { data, error } = await supabase
      .from('member_areas')
      .insert({
        ...area,
        owner_id: user.id,
        login_image_url: area.login_image_url,
        allow_free_signup: area.allow_free_signup,
        banner_url: area.banner_url,
        banner_title: area.banner_title,
        banner_description: area.banner_description,
        banner_button_text: area.banner_button_text,
        banner_button_link: area.banner_button_link,
        sidebar_config: area.sidebar_config,
        custom_links: area.custom_links,
        faqs: area.faqs
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateMemberArea(area: MemberArea) {
    const { data, error } = await supabase
      .from('member_areas')
      .update({
        name: area.name,
        slug: area.slug,
        domain_id: area.domain_id,
        logo_url: area.logo_url,
        primary_color: area.primary_color,
        favicon_url: area.favicon_url,
        favicon_url: area.favicon_url,
        layout_mode: area.layout_mode,
        card_style: area.card_style,
        login_image_url: area.login_image_url,
        allow_free_signup: area.allow_free_signup,
        banner_url: area.banner_url,
        banner_title: area.banner_title,
        banner_description: area.banner_description,
        banner_button_text: area.banner_button_text,
        banner_button_link: area.banner_button_link,
        sidebar_config: area.sidebar_config,
        custom_links: area.custom_links,
        faqs: area.faqs
      })
      .eq('id', area.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteMemberArea(id: string) {
    // 1. Delete files from storage (member-areas bucket)
    try {
      const { data: files } = await supabase.storage.from('member-areas').list(id);
      if (files && files.length > 0) {
        const filesToRemove = files.map(f => `${id}/${f.name}`);
        await supabase.storage.from('member-areas').remove(filesToRemove);
      }
    } catch (error) {
      console.error('Error deleting member area files:', error);
    }

    // 2. Delete DB record
    const { error } = await supabase.from('member_areas').delete().eq('id', id);
    if (error) throw error;
  }

  async uploadMemberAreaLogo(file: File, areaId: string): Promise<string> {
    const fileExt = file.name.split('.').pop();
    const fileName = `${areaId}/logo_${Date.now()}.${fileExt}`; // Removed 'member-areas/' prefix as it's now the bucket name

    const { error: uploadError } = await supabase.storage
      .from('member-areas') // Use dedicated bucket
      .upload(fileName, file, {
        upsert: true
      });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from('member-areas').getPublicUrl(fileName);
    return data.publicUrl;
  }

  async uploadMemberAreaFavicon(file: File, areaId: string): Promise<string> {
    const fileExt = file.name.split('.').pop();
    const fileName = `${areaId}/favicon_${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('member-areas')
      .upload(fileName, file, {
        upsert: true
      });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from('member-areas').getPublicUrl(fileName);
    return data.publicUrl;
  }

  async uploadMemberAreaLoginImage(file: File, areaId: string): Promise<string> {
    const fileExt = file.name.split('.').pop();
    const fileName = `${areaId}/login_${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('member-areas')
      .upload(fileName, file, {
        upsert: true
      });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from('member-areas').getPublicUrl(fileName);
    return data.publicUrl;
  }

  async uploadMemberAreaBanner(file: File, areaId: string): Promise<string> {
    const fileExt = file.name.split('.').pop();
    const fileName = `${areaId}/banner_${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('member-areas')
      .upload(fileName, file, {
        upsert: true
      });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from('member-areas').getPublicUrl(fileName);
    return data.publicUrl;
  }


  // --- TRACKS ---

  async getTracks(memberAreaId: string): Promise<Track[]> {
    const { data, error } = await supabase
      .from('tracks')
      .select('*')
      .eq('member_area_id', memberAreaId)
      .order('position');

    if (error) {
      console.error('Error fetching tracks:', error.message);
      return [];
    }
    return data as Track[];
  }

  async getTrackWithItems(trackId: string): Promise<Track | null> {
    // 1. Get Track
    const { data: track, error } = await supabase
      .from('tracks')
      .select('*')
      .eq('id', trackId)
      .single();

    if (error || !track) return null;

    // 2. Get Items
    const { data: items, error: itemsError } = await supabase
      .from('track_items')
      .select('*')
      .eq('track_id', trackId)
      .order('position');

    if (itemsError) return null;

    // 3. Populate Items based on Track Type
    const populatedItems: TrackItem[] = [];

    if (items && items.length > 0) {
      const itemIds = items.map(i => i.item_id);
      console.log(`[getTrackWithItems] Track: ${track.title}, Type: ${track.type}, Items: ${items.length}`);

      let relatedData: any[] = [];

      if (track.type === 'products') {
        const { data } = await supabase
          .from('products')
          .select('*, checkouts:member_area_checkout_id(id, custom_url_slug, domain_id, domains:domain_id(domain))')
          .in('id', itemIds);
        relatedData = data || [];
      } else if (track.type === 'contents') {
        const { data } = await supabase
          .from('contents')
          .select('*, product_contents(products(*, checkouts:member_area_checkout_id(id, custom_url_slug, domain_id, domains:domain_id(domain))))')
          .in('id', itemIds);

        relatedData = (data || []).map((c: any) => ({
          ...c,
          associated_product: c.product_contents?.[0]?.products
        }));
      } else if (track.type === 'modules') {
        const { data } = await supabase
          .from('modules')
          .select('*, content:contents(product_contents(products(*, checkouts:member_area_checkout_id(id, custom_url_slug, domain_id, domains:domain_id(domain)))))')
          .in('id', itemIds);

        relatedData = (data || []).map((m: any) => ({
          ...m,
          associated_product: m.content?.product_contents?.[0]?.products
        }));
      } else if (track.type === 'lessons') {
        const { data } = await supabase
          .from('lessons')
          .select('*, module:modules(content:contents(product_contents(products(*, checkouts:member_area_checkout_id(id, custom_url_slug, domain_id, domains:domain_id(domain))))))')
          .in('id', itemIds);

        relatedData = (data || []).map((l: any) => {
          const module = Array.isArray(l.module) ? l.module[0] : l.module;
          const content = module && Array.isArray(module.content) ? module.content[0] : module?.content;
          const product = content?.product_contents?.[0]?.products;

          return {
            ...l,
            module: module ? { ...module, content } : undefined,
            associated_product: product
          };
        });
      }

      // Helper to map product fields
      const mapProductFields = (p: any) => {
        if (!p) return undefined;

        let redirectLink = p.redirect_link;
        if ((!p.member_area_action || p.member_area_action === 'checkout') && p.checkouts) {
          redirectLink = `https://${p.checkouts.domains?.domain || 'checkout.supercheckout.com'}/${p.checkouts.custom_url_slug}`;
        }

        return {
          ...p,
          imageUrl: p.image_url || p.imageUrl,
          redirect_link: redirectLink
        };
      };

      // Map associated_product for all types
      relatedData = relatedData.map(item => {
        if (item.associated_product) {
          item.associated_product = mapProductFields(item.associated_product);
        }
        return item;
      });

      // Merge
      console.log(`[getTrackWithItems] Related Data Found: ${relatedData.length}`);
      populatedItems.push(...items.map((item: any) => {
        const related = relatedData.find(r => r.id === item.item_id);
        // Map image_url to imageUrl for Products to match interface
        if (track.type === 'products' && related) {
          related.imageUrl = related.image_url;

          // Construct redirect link if needed
          if ((!related.member_area_action || related.member_area_action === 'checkout') && related.checkouts) {
            related.redirect_link = `https://${related.checkouts.domains?.domain || 'checkout.supercheckout.com'}/${related.checkouts.custom_url_slug}`;
          }
        }

        return {
          ...item,
          product: track.type === 'products' ? related : undefined,
          content: track.type === 'contents' ? related : undefined,
          module: track.type === 'modules' ? related : undefined,
          lesson: track.type === 'lessons' ? related : undefined,
        };
      }));
    }

    return { ...track, items: populatedItems };
  }

  async createTrack(track: Omit<Track, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('tracks')
      .insert(track)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateTrack(track: Partial<Track> & { id: string }) {
    const { data, error } = await supabase
      .from('tracks')
      .update(track)
      .eq('id', track.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteTrack(id: string) {
    const { error } = await supabase.from('tracks').delete().eq('id', id);
    if (error) throw error;
  }

  async addTrackItem(trackId: string, itemId: string, position: number) {
    const { data, error } = await supabase
      .from('track_items')
      .insert({ track_id: trackId, item_id: itemId, position })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async removeTrackItem(itemId: string) {
    const { error } = await supabase.from('track_items').delete().eq('id', itemId);
    if (error) throw error;
  }

  async updateTrackPositions(updates: { id: string, position: number }[]) {
    // Supabase doesn't support bulk update easily with different values, so loop for now or use RPC
    // For small number of tracks, loop is fine.
    for (const update of updates) {
      await supabase.from('tracks').update({ position: update.position }).eq('id', update.id);
    }
  }

}

export const storage = new StorageService();
