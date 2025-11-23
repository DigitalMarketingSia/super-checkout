
import React, { useState, useEffect, useRef } from 'react';
import { Layout } from '../../components/Layout';
import { storage } from '../../services/storageService';
import { Product } from '../../types';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ConfirmModal, AlertModal } from '../../components/ui/Modal';
import {
  Plus, Edit2, Trash2, Image as ImageIcon, Search, Upload, ArrowLeft, Save, Layers, ArrowRight
} from 'lucide-react';

// Initial Form State
const initialFormState = {
  name: '',
  description: '',
  imageUrl: '',
  price_real: 0,
  price_fake: 0,
  sku: '',
  category: '',
  redirect_link: '',
  is_order_bump: false,
  is_upsell: false,
  active: true
};

export const Products = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'edit'>('grid');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [currentProductId, setCurrentProductId] = useState<string | null>(null);
  const [formData, setFormData] = useState(initialFormState);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modal States
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [alertState, setAlertState] = useState<{ isOpen: boolean; title: string; message: string; variant: 'success' | 'error' | 'info' }>({
    isOpen: false,
    title: '',
    message: '',
    variant: 'info'
  });

  const showAlert = (title: string, message: string, variant: 'success' | 'error' | 'info' = 'info') => {
    setAlertState({ isOpen: true, title, message, variant });
  };

  const closeAlert = () => {
    setAlertState(prev => ({ ...prev, isOpen: false }));
  };

  // Search and Pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 9;

  // Load Products Async
  useEffect(() => {
    loadData();
  }, []);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const loadData = async () => {
    setLoading(true);
    const data = await storage.getProducts();
    setProducts(data);
    setLoading(false);
  };

  // --- Actions ---

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingId) {
        // Update existing product
        const productToUpdate: Product = {
          id: editingId,
          ...formData
        };
        await storage.updateProduct(productToUpdate);
      } else {
        // Create new product using the pre-generated ID
        await storage.createProduct({
          id: currentProductId!, // Use the ID we generated for the upload
          ...formData
        });
      }

      // Reload real data
      await loadData();
      setViewMode('grid');
      setEditingId(null);
      setCurrentProductId(null);
    } catch (error) {
      console.error('Error saving product:', error);
      showAlert('Erro', 'Erro ao salvar produto. Verifique o console.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (id: string) => {
    setDeleteId(id);
  };

  const handleConfirmDelete = async () => {
    if (!deleteId) return;

    try {
      setIsDeleting(true);
      await storage.deleteProduct(deleteId);
      await loadData();
      setDeleteId(null);
      showAlert('Sucesso', 'Produto excluído com sucesso.', 'success');
    } catch (error) {
      console.error('Error deleting product:', error);
      showAlert('Erro', 'Erro ao excluir produto.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      try {
        setUploading(true);
        // Use currentProductId (either existing ID or new UUID)
        if (!currentProductId) throw new Error("No product ID available");

        const publicUrl = await storage.uploadProductImage(file, currentProductId);
        setFormData({ ...formData, imageUrl: publicUrl });
      } catch (error) {
        console.error('Error uploading image:', error);
        showAlert('Erro', 'Erro ao fazer upload da imagem.', 'error');
      } finally {
        setUploading(false);
      }
    }
  };

  const openEdit = (product?: Product) => {
    if (product) {
      setEditingId(product.id);
      setCurrentProductId(product.id);
      setFormData({
        name: product.name,
        description: product.description,
        imageUrl: product.imageUrl || '',
        price_real: product.price_real || 0,
        price_fake: product.price_fake || 0,
        sku: product.sku || '',
        category: product.category || '',
        redirect_link: product.redirect_link || '',
        is_order_bump: product.is_order_bump || false,
        is_upsell: product.is_upsell || false,
        active: product.active
      });
    } else {
      setEditingId(null);
      // Generate a new UUID for the new product immediately
      const newId = crypto.randomUUID();
      setCurrentProductId(newId);

      setFormData(initialFormState);
    }
    setViewMode('edit');
  };

  const renderGrid = () => {
    // Filter products based on search query
    const filteredProducts = products.filter(product => {
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      const matchesName = product.name.toLowerCase().includes(query);
      const matchesCategory = product.category?.toLowerCase().includes(query);
      const matchesPrice = product.price_real?.toString().includes(query);
      return matchesName || matchesCategory || matchesPrice;
    });

    const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

    return (
      <div className="animate-in fade-in duration-500">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Meus Produtos</h1>
            <p className="text-gray-400 text-sm mt-1">Gerencie seu catálogo digital.</p>
          </div>
          <Button onClick={() => openEdit()} className="shadow-xl shadow-primary/20">
            <Plus className="w-4 h-4" /> Criar Novo Produto
          </Button>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="text"
              placeholder="Buscar por nome, categoria ou preço..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3.5 text-white outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all placeholder:text-gray-500"
            />
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => <Card key={i} className="h-[420px] animate-pulse"><div /></Card>)}
          </div>
        ) : products.length === 0 ? (
          <Card className="text-center py-20 border-dashed border-white/10 bg-white/5">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
              <Layers className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-white">Nenhum produto cadastrado</h3>
            <div className="flex justify-center mt-4">
              <Button onClick={() => openEdit()}>Criar Produto</Button>
            </div>
          </Card>
        ) : filteredProducts.length === 0 ? (
          <Card className="text-center py-20 border-dashed border-white/10 bg-white/5">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-white">Nenhum produto encontrado</h3>
            <p className="text-gray-400 text-sm mt-2">Tente buscar com outros termos</p>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {paginatedProducts.map(product => (
                <Card key={product.id} className="group relative flex flex-col hover:-translate-y-1 transition-all" noPadding>
                  <div className="p-5 flex flex-col h-full">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-lg font-bold text-white leading-tight line-clamp-1">{product.name}</h3>
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-full border ${product.active ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>{product.active ? 'Ativo' : 'Inativo'}</span>
                    </div>
                    {product.category && (
                      <span className="text-xs text-primary bg-primary/10 px-2 py-1 rounded-md mb-3 inline-block self-start">
                        {product.category}
                      </span>
                    )}
                    <div className="w-full h-48 rounded-xl overflow-hidden bg-white/5 relative mb-4 border border-white/5">
                      {product.imageUrl ? <img src={product.imageUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-8 h-8 text-gray-600" /></div>}
                    </div>
                    <div className="flex items-center justify-between mb-6 mt-auto pt-4 border-t border-white/5">
                      <span className="text-sm text-gray-500">Preço</span>
                      <span className="text-lg font-bold text-white">R$ {product.price_real?.toFixed(2)}</span>
                    </div>
                    <div className="flex gap-3">
                      <button onClick={() => openEdit(product)} className="flex-1 bg-white/5 hover:bg-white/10 text-gray-300 py-2.5 rounded-xl text-sm font-medium border border-white/5"><Edit2 className="w-4 h-4 inline mr-2" /> Editar</button>
                      <button onClick={() => handleDeleteClick(product.id)} className="w-12 bg-red-500/10 text-red-400 rounded-xl flex items-center justify-center border border-red-500/10"><Trash2 className="w-4 h-4" /></button>
                    </div>

                    {/* Order Bump and Upsell Tags */}
                    {(product.is_order_bump || product.is_upsell) && (
                      <>
                        <div className="w-full h-px bg-white/5 my-3"></div>
                        <div className="flex gap-2 flex-wrap">
                          {product.is_order_bump && (
                            <div className="flex items-center gap-1.5 text-xs text-gray-400 bg-white/5 px-2.5 py-1.5 rounded-lg border border-white/10">
                              <Layers className="w-3.5 h-3.5" />
                              <span>Order bump</span>
                            </div>
                          )}
                          {product.is_upsell && (
                            <div className="flex items-center gap-1.5 text-xs text-gray-400 bg-white/5 px-2.5 py-1.5 rounded-lg border border-white/10">
                              <ArrowRight className="w-3.5 h-3.5" />
                              <span>Upsell</span>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </Card>
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 mt-8">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/10 transition-colors"
                >
                  Anterior
                </button>
                <span className="text-gray-400 text-sm">
                  Página {currentPage} de {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/10 transition-colors"
                >
                  Próxima
                </button>
              </div>
            )}
          </>
        )}
      </div>
    );
  };


  // ... (Edit Form is identical in structure, just passing props, reusing the renderEdit from previous file but keeping it clean here for brevity. Assuming you want the full file content for replacement)
  const renderEdit = () => (
    <div className="animate-in slide-in-from-right duration-300">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button onClick={() => setViewMode('grid')} className="p-2 rounded-full bg-white/5 border border-white/10"><ArrowLeft className="w-5 h-5 text-white" /></button>
          <div><h1 className="text-2xl font-bold text-white">{editingId ? 'Editar Produto' : 'Novo Produto'}</h1></div>
        </div>
        <Button onClick={handleSave} isLoading={loading}><Save className="w-4 h-4" /> Salvar</Button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <h3 className="text-sm font-bold text-white mb-4">Imagem</h3>
            <div className="relative w-full aspect-square rounded-xl bg-black/20 border-2 border-dashed border-white/10 overflow-hidden mb-4 group">
              {formData.imageUrl ? (
                <>
                  <img src={formData.imageUrl} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
                      <Upload className="w-4 h-4 mr-2" /> Trocar
                    </Button>
                  </div>
                </>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer hover:bg-white/5 transition-colors" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="w-8 h-8 text-gray-400 mb-2" />
                  <span className="text-xs text-gray-400">{uploading ? 'Enviando...' : 'Clique para upload'}</span>
                </div>
              )}
            </div>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={handleImageUpload}
            />
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Ou cole uma URL externa:</label>
              <input type="text" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-500" placeholder="https://..." value={formData.imageUrl} onChange={e => setFormData({ ...formData, imageUrl: e.target.value })} />
            </div>
          </Card>
        </div>
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <div className="grid grid-cols-1 gap-6">
              <div><label className="block text-sm text-gray-300 mb-2">Nome</label><input type="text" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-500" placeholder="Nome do produto" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} /></div>
              <div><label className="block text-sm text-gray-300 mb-2">Categoria</label><input type="text" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-500" placeholder="Ex: Marketing, Design, Cursos..." value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm text-gray-300 mb-2">Preço Real</label><input type="number" step="0.01" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-500" placeholder="0.00" value={formData.price_real} onChange={e => setFormData({ ...formData, price_real: parseFloat(e.target.value) })} /></div>
                <div><label className="block text-sm text-gray-300 mb-2">Preço Fictício</label><input type="number" step="0.01" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-500" placeholder="0.00" value={formData.price_fake} onChange={e => setFormData({ ...formData, price_fake: parseFloat(e.target.value) })} /></div>
              </div>
              <div><label className="block text-sm text-gray-300 mb-2">Descrição</label><textarea className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-500" rows={4} placeholder="Descreva seu produto..." value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} /></div>
            </div>
          </Card>

          {/* Configurações de Venda */}
          <Card>
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <Layers className="w-5 h-5 text-primary" />
              Configurações de Venda
            </h3>

            <div className="space-y-6">
              {/* Produto Ativo */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5">
                <div>
                  <p className="font-medium text-white">Produto Ativo</p>
                  <p className="text-xs text-gray-400">Exibir este produto no catálogo e permitir vendas.</p>
                </div>
                <button
                  onClick={() => setFormData({ ...formData, active: !formData.active })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.active ? 'bg-green-500' : 'bg-white/10'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.active ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>

              {/* Order Bump */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5">
                <div>
                  <p className="font-medium text-white">Order Bump</p>
                  <p className="text-xs text-gray-400">Oferta complementar exibida dentro do checkout.</p>
                </div>
                <button
                  onClick={() => setFormData({ ...formData, is_order_bump: !formData.is_order_bump })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.is_order_bump ? 'bg-green-500' : 'bg-white/10'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.is_order_bump ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>

              {/* Upsell */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5">
                <div>
                  <p className="font-medium text-white">Upsell (One Click)</p>
                  <p className="text-xs text-gray-400">Oferta apresentada imediatamente após a compra.</p>
                </div>
                <button
                  onClick={() => setFormData({ ...formData, is_upsell: !formData.is_upsell })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.is_upsell ? 'bg-green-500' : 'bg-white/10'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.is_upsell ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );

  return (
    <Layout>
      {viewMode === 'grid' ? renderGrid() : renderEdit()}

      <ConfirmModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleConfirmDelete}
        title="Excluir Produto"
        message="Tem certeza que deseja excluir este produto? Esta ação não pode ser desfeita."
        confirmText="Sim, excluir"
        cancelText="Cancelar"
        variant="danger"
        loading={isDeleting}
      />

      <AlertModal
        isOpen={alertState.isOpen}
        onClose={closeAlert}
        title={alertState.title}
        message={alertState.message}
        variant={alertState.variant}
      />
    </Layout>
  );
};
