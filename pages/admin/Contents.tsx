import React, { useState, useEffect } from 'react';
import { Layout } from '../../components/Layout';
import { storage } from '../../services/storageService';
import { Content } from '../../types';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ConfirmModal, AlertModal } from '../../components/ui/Modal';
import {
    Plus, Edit2, Trash2, Image as ImageIcon, Search, BookOpen, Package, Monitor, FileText, Layers
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Contents = ({ memberAreaId }: { memberAreaId: string }) => {
    const navigate = useNavigate();
    const [contents, setContents] = useState<Content[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // Modal States
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [alertState, setAlertState] = useState<{ isOpen: boolean; title: string; message: string; variant: 'success' | 'error' | 'info' }>({
        isOpen: false,
        title: '',
        message: '',
        variant: 'info'
    });

    useEffect(() => {
        if (memberAreaId) {
            loadData();
        }
    }, [memberAreaId]);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await storage.getContents(memberAreaId);
            setContents(data);
        } catch (error) {
            console.error('Error loading contents:', error);
            showAlert('Erro', 'Erro ao carregar conteúdos.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const showAlert = (title: string, message: string, variant: 'success' | 'error' | 'info' = 'info') => {
        setAlertState({ isOpen: true, title, message, variant });
    };

    const handleDeleteClick = (id: string) => {
        setDeleteId(id);
    };

    const handleConfirmDelete = async () => {
        if (!deleteId) return;

        try {
            setIsDeleting(true);
            await storage.deleteContent(deleteId);
            await loadData();
            setDeleteId(null);
            showAlert('Sucesso', 'Conteúdo excluído com sucesso.', 'success');
        } catch (error) {
            console.error('Error deleting content:', error);
            showAlert('Erro', 'Erro ao excluir conteúdo.', 'error');
        } finally {
            setIsDeleting(false);
        }
    };

    const getIconByType = (type: string) => {
        switch (type) {
            case 'course': return <BookOpen className="w-4 h-4" />;
            case 'pack': return <Package className="w-4 h-4" />;
            case 'software': return <Monitor className="w-4 h-4" />;
            case 'ebook': return <FileText className="w-4 h-4" />;
            default: return <Layers className="w-4 h-4" />;
        }
    };

    const filteredContents = contents.filter(content =>
        content.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        content.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <div>
                    <h2 className="text-xl font-bold text-white">Conteúdos do Portal</h2>
                    <p className="text-gray-400 text-sm mt-1">Gerencie os cursos e materiais desta área.</p>
                </div>
                <Button onClick={() => navigate(`/admin/contents/new?areaId=${memberAreaId}`)} className="shadow-xl shadow-primary/20">
                    <Plus className="w-4 h-4" /> Criar Novo Conteúdo
                </Button>
            </div>

            {/* Search Bar */}
            <div className="mb-6">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                        type="text"
                        placeholder="Buscar por título ou descrição..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3.5 text-white outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all placeholder:text-gray-500"
                    />
                </div>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => <Card key={i} className="h-[350px] animate-pulse"><div /></Card>)}
                </div>
            ) : contents.length === 0 ? (
                <Card className="text-center py-20 border-dashed border-white/10 bg-white/5">
                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Layers className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-white">Nenhum conteúdo criado</h3>
                    <div className="flex justify-center mt-4">
                        <Button onClick={() => navigate(`/admin/contents/new?areaId=${memberAreaId}`)}>Criar Conteúdo</Button>
                    </div>
                </Card>
            ) : filteredContents.length === 0 ? (
                <Card className="text-center py-20 border-dashed border-white/10 bg-white/5">
                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Search className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-white">Nenhum conteúdo encontrado</h3>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {filteredContents.map(content => (
                        <Card key={content.id} className="group relative flex flex-col hover:-translate-y-1 transition-all" noPadding>
                            <div className="p-5 flex flex-col h-full">
                                <div className="flex justify-between items-start mb-4">
                                    <h3 className="text-lg font-bold text-white leading-tight line-clamp-1">{content.title}</h3>
                                    <span className="text-[10px] font-bold px-2 py-1 rounded-full border bg-white/5 text-gray-400 flex items-center gap-1">
                                        {getIconByType(content.type)}
                                        <span className="capitalize">{content.type}</span>
                                    </span>
                                </div>

                                <div className="w-full h-40 rounded-xl overflow-hidden bg-white/5 relative mb-4 border border-white/5">
                                    {content.thumbnail_url ? (
                                        <img src={content.thumbnail_url} className="w-full h-full object-cover" alt={content.title} />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <ImageIcon className="w-8 h-8 text-gray-600" />
                                        </div>
                                    )}
                                </div>

                                <p className="text-sm text-gray-400 line-clamp-2 mb-6 flex-1">
                                    {content.description || 'Sem descrição.'}
                                </p>

                                <div className="flex items-center justify-between mb-4 text-xs text-gray-500">
                                    <span>{content.modules_count || 0} módulos</span>
                                    <span>Atualizado em {new Date(content.updated_at || content.created_at).toLocaleDateString()}</span>
                                </div>

                                <div className="flex gap-3 mt-auto">
                                    <button
                                        onClick={() => navigate(`/admin/contents/${content.id}`)}
                                        className="flex-1 bg-white/5 hover:bg-white/10 text-gray-300 py-2.5 rounded-xl text-sm font-medium border border-white/5 transition-colors"
                                    >
                                        <Edit2 className="w-4 h-4 inline mr-2" /> Editar
                                    </button>
                                    <button
                                        onClick={() => handleDeleteClick(content.id)}
                                        className="w-12 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl flex items-center justify-center border border-red-500/10 transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            <ConfirmModal
                isOpen={!!deleteId}
                onClose={() => setDeleteId(null)}
                onConfirm={handleConfirmDelete}
                title="Excluir Conteúdo"
                message="Tem certeza que deseja excluir este conteúdo? Todos os módulos e aulas serão perdidos."
                confirmText="Sim, excluir"
                cancelText="Cancelar"
                variant="danger"
                loading={isDeleting}
            />

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
