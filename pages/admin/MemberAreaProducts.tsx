import React, { useState, useEffect } from 'react';
import { storage } from '../../services/storageService';
import { Product, Content } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Package, Plus, Check, X, AlertCircle, Link as LinkIcon } from 'lucide-react';
import { AlertModal } from '../../components/ui/Modal';

interface MemberAreaProductsProps {
    memberAreaId: string;
}

export const MemberAreaProducts: React.FC<MemberAreaProductsProps> = ({ memberAreaId }) => {
    const [products, setProducts] = useState<Product[]>([]);
    const [contents, setContents] = useState<Content[]>([]);
    const [productLinks, setProductLinks] = useState<Record<string, string[]>>({}); // productId -> contentIds[]
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);

    const [alertState, setAlertState] = useState<{ isOpen: boolean; title: string; message: string; variant: 'success' | 'error' | 'info' }>({
        isOpen: false, title: '', message: '', variant: 'info'
    });

    useEffect(() => {
        loadData();
    }, [memberAreaId]);

    const loadData = async () => {
        setLoading(true);
        try {
            // 1. Load all products
            const allProducts = await storage.getProducts();
            setProducts(allProducts);

            // 2. Load all contents of this member area
            const areaContents = await storage.getContents(memberAreaId);
            setContents(areaContents);

            // 3. Load links for each product
            // This could be optimized with a specific query, but for now we iterate
            const links: Record<string, string[]> = {};
            await Promise.all(allProducts.map(async (p) => {
                const contentIds = await storage.getProductContents(p.id);
                // Filter only contents that belong to this area
                const areaContentIds = contentIds.filter(id => areaContents.some(c => c.id === id));
                links[p.id] = areaContentIds;
            }));
            setProductLinks(links);

        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleLinkAll = async (product: Product) => {
        setProcessingId(product.id);
        try {
            const allContentIds = contents.map(c => c.id);
            await storage.setProductContents(product.id, allContentIds);

            setProductLinks(prev => ({
                ...prev,
                [product.id]: allContentIds
            }));

            setAlertState({
                isOpen: true,
                title: 'Sucesso',
                message: `Produto "${product.name}" agora dá acesso a TODOS os conteúdos desta área.`,
                variant: 'success'
            });
        } catch (error) {
            console.error('Error linking product:', error);
            setAlertState({
                isOpen: true,
                title: 'Erro',
                message: 'Erro ao vincular produto.',
                variant: 'error'
            });
        } finally {
            setProcessingId(null);
        }
    };

    const handleUnlinkAll = async (product: Product) => {
        setProcessingId(product.id);
        try {
            // We need to keep contents that belong to OTHER areas
            // So we first fetch ALL contents of the product again to be safe
            const currentContentIds = await storage.getProductContents(product.id);
            const otherAreaContentIds = currentContentIds.filter(id => !contents.some(c => c.id === id));

            await storage.setProductContents(product.id, otherAreaContentIds);

            setProductLinks(prev => ({
                ...prev,
                [product.id]: []
            }));

            setAlertState({
                isOpen: true,
                title: 'Sucesso',
                message: `Acesso removido. O produto "${product.name}" não dá mais acesso a esta área.`,
                variant: 'success'
            });
        } catch (error) {
            console.error('Error unlinking product:', error);
            setAlertState({
                isOpen: true,
                title: 'Erro',
                message: 'Erro ao desvincular produto.',
                variant: 'error'
            });
        } finally {
            setProcessingId(null);
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Carregando produtos...</div>;

    return (
        <div className="animate-in fade-in duration-500 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Produtos Vinculados</h2>
                    <p className="text-gray-500 text-sm mt-1">Defina quais produtos dão acesso aos conteúdos desta área de membros.</p>
                </div>
            </div>

            {products.length === 0 ? (
                <Card className="text-center py-20 border-dashed border-white/10 bg-white/5">
                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Package className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">Nenhum produto cadastrado</h3>
                    <p className="text-gray-500 text-sm mt-2">Crie produtos na aba "Produtos" para vinculá-los aqui.</p>
                </Card>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {products.map(product => {
                        const linkedCount = productLinks[product.id]?.length || 0;
                        const totalContents = contents.length;
                        const isFullyLinked = linkedCount === totalContents && totalContents > 0;
                        const isPartiallyLinked = linkedCount > 0 && linkedCount < totalContents;
                        const isLinked = linkedCount > 0;

                        return (
                            <Card key={product.id} className="flex flex-col sm:flex-row items-center justify-between p-4 gap-4 hover:bg-white/5 transition-colors">
                                <div className="flex items-center gap-4 w-full sm:w-auto">
                                    <div className="w-12 h-12 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                                        {product.imageUrl ? (
                                            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <Package className="w-6 h-6 text-gray-500" />
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900 dark:text-white">{product.name}</h3>
                                        <div className="flex items-center gap-2 text-sm">
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${isLinked
                                                    ? 'bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-400'
                                                    : 'bg-gray-100 text-gray-800 dark:bg-gray-500/20 dark:text-gray-400'
                                                }`}>
                                                {isLinked ? 'Vinculado' : 'Não Vinculado'}
                                            </span>
                                            <span className="text-gray-500">
                                                • {linkedCount} de {totalContents} conteúdos
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 w-full sm:w-auto">
                                    {isLinked ? (
                                        <>
                                            {!isFullyLinked && (
                                                <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    onClick={() => handleLinkAll(product)}
                                                    isLoading={processingId === product.id}
                                                    className="flex-1 sm:flex-none"
                                                >
                                                    <Plus className="w-4 h-4 mr-2" />
                                                    Vincular Todos
                                                </Button>
                                            )}
                                            <Button
                                                variant="danger"
                                                size="sm"
                                                onClick={() => handleUnlinkAll(product)}
                                                isLoading={processingId === product.id}
                                                className="flex-1 sm:flex-none"
                                            >
                                                <X className="w-4 h-4 mr-2" />
                                                Desvincular
                                            </Button>
                                        </>
                                    ) : (
                                        <Button
                                            size="sm"
                                            onClick={() => handleLinkAll(product)}
                                            isLoading={processingId === product.id}
                                            className="flex-1 sm:flex-none"
                                        >
                                            <LinkIcon className="w-4 h-4 mr-2" />
                                            Vincular Tudo
                                        </Button>
                                    )}
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}

            <AlertModal
                isOpen={alertState.isOpen}
                onClose={() => setAlertState({ ...alertState, isOpen: false })}
                title={alertState.title}
                message={alertState.message}
                variant={alertState.variant}
            />
        </div>
    );
};
