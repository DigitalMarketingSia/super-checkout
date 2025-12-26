import React, { useState, useEffect } from 'react';
import { storage } from '../../services/storageService';
import { Track, TrackItem, Product, Content, Module, Lesson } from '../../types';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ConfirmModal } from '../../components/ui/Modal';
import { Plus, GripVertical, Trash2, Eye, EyeOff, Save, X, Search } from 'lucide-react';

interface MemberAreaTracksProps {
    memberAreaId: string;
}

export const MemberAreaTracks: React.FC<MemberAreaTracksProps> = ({ memberAreaId }) => {
    const [tracks, setTracks] = useState<Track[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingTrack, setEditingTrack] = useState<Track | null>(null);
    const [isCreating, setIsCreating] = useState(false);

    // New Track Form State
    const [newTrackTitle, setNewTrackTitle] = useState('');
    const [newTrackType, setNewTrackType] = useState<'products' | 'contents' | 'modules' | 'lessons'>('contents');
    const [newTrackCardStyle, setNewTrackCardStyle] = useState<'vertical' | 'horizontal'>('horizontal');

    // Item Selection Modal State
    const [showItemModal, setShowItemModal] = useState(false);
    const [availableItems, setAvailableItems] = useState<any[]>([]);
    const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
    const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; trackId: string | null }>({ isOpen: false, trackId: null });
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        loadTracks();
    }, [memberAreaId]);

    const loadTracks = async () => {
        setLoading(true);
        try {
            const data = await storage.getTracks(memberAreaId);
            // Fetch items for each track to show count or preview? 
            // For admin list, maybe just count is enough, but let's fetch full for now to be safe or just fetch when expanding.
            // Let's fetch full for now to simplify.
            const fullTracks = await Promise.all(data.map(t => storage.getTrackWithItems(t.id)));
            setTracks(fullTracks.filter(t => t !== null) as Track[]);
        } catch (error) {
            console.error('Error loading tracks:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateTrack = async () => {
        if (!newTrackTitle) return;
        try {
            await storage.createTrack({
                member_area_id: memberAreaId,
                title: newTrackTitle,
                type: newTrackType,
                position: tracks.length,
                is_visible: true,
                card_style: newTrackCardStyle
            });
            setNewTrackTitle('');
            setNewTrackCardStyle('horizontal');
            setIsCreating(false);
            loadTracks();
        } catch (error) {
            console.error('Error creating track:', error);
        }
    };

    const handleDeleteTrack = async () => {
        if (!deleteModal.trackId) return;
        setIsDeleting(true);
        try {
            await storage.deleteTrack(deleteModal.trackId);
            setTracks(tracks.filter(t => t.id !== deleteModal.trackId));
            setDeleteModal({ isOpen: false, trackId: null });
        } catch (error) {
            console.error('Error deleting track:', error);
        } finally {
            setIsDeleting(false);
        }
    };

    const handleUpdateTrackStyle = async (trackId: string, style: 'vertical' | 'horizontal') => {
        try {
            await storage.updateTrack({ id: trackId, card_style: style });
            setTracks(tracks.map(t => t.id === trackId ? { ...t, card_style: style } : t));
        } catch (error) {
            console.error('Error updating track style:', error);
        }
    };

    const handleToggleVisibility = async (track: Track) => {
        try {
            await storage.updateTrack({ id: track.id, is_visible: !track.is_visible });
            setTracks(tracks.map(t => t.id === track.id ? { ...t, is_visible: !t.is_visible } : t));
        } catch (error) {
            console.error('Error updating visibility:', error);
        }
    };

    const handleAddItem = async (item: any) => {
        if (!selectedTrackId) return;
        try {
            const track = tracks.find(t => t.id === selectedTrackId);
            if (!track) return;

            await storage.addTrackItem(selectedTrackId, item.id, (track.items?.length || 0));
            setShowItemModal(false);
            loadTracks(); // Reload to show new item
        } catch (error) {
            console.error('Error adding item:', error);
        }
    };

    const handleRemoveItem = async (itemId: string) => {
        try {
            await storage.removeTrackItem(itemId);
            loadTracks();
        } catch (error) {
            console.error('Error removing item:', error);
        }
    };

    const openItemModal = async (trackId: string, type: string) => {
        setSelectedTrackId(trackId);
        setAvailableItems([]); // Clear previous
        setShowItemModal(true);

        // Fetch available items based on type
        try {
            let items: any[] = [];
            if (type === 'products') {
                items = await storage.getProducts();
            } else if (type === 'contents') {
                items = await storage.getContents(memberAreaId);
            } else if (type === 'modules') {
                items = await storage.getModulesByAreaId(memberAreaId);
            } else if (type === 'lessons') {
                // Fetch modules first, then extract lessons
                const modules = await storage.getModulesByAreaId(memberAreaId);
                items = modules.flatMap(m => m.lessons || []).map(l => ({ ...l, title: `${l.title} (Módulo: ${modules.find(m => m.id === l.module_id)?.title})` }));
            }
            setAvailableItems(items);
        } catch (error) {
            console.error('Error fetching items:', error);
        }
    };

    const moveTrack = async (index: number, direction: 'up' | 'down') => {
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === tracks.length - 1) return;

        const newTracks = [...tracks];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;

        // Swap
        [newTracks[index], newTracks[targetIndex]] = [newTracks[targetIndex], newTracks[index]];

        // Update positions locally
        newTracks.forEach((t, i) => t.position = i);
        setTracks(newTracks);

        // Save to DB
        try {
            await storage.updateTrackPositions(newTracks.map(t => ({ id: t.id, position: t.position })));
        } catch (error) {
            console.error('Error updating positions:', error);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Trilhas da Vitrine</h2>
                <Button onClick={() => setIsCreating(true)}>
                    <Plus className="w-4 h-4 mr-2" /> Nova Trilha
                </Button>
            </div>

            {isCreating && (
                <Card className="p-4 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10">
                    <h3 className="text-sm font-medium mb-4">Criar Nova Trilha</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div className="md:col-span-2">
                            <label className="block text-xs text-gray-500 mb-1">Título da Trilha</label>
                            <input
                                type="text"
                                value={newTrackTitle}
                                onChange={(e) => setNewTrackTitle(e.target.value)}
                                className="w-full bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm"
                                placeholder="Ex: Cursos em Destaque"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Tipo de Item</label>
                            <select
                                value={newTrackType}
                                onChange={(e) => setNewTrackType(e.target.value as any)}
                                className="w-full bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm"
                            >
                                <option value="contents" className="bg-white dark:bg-[#0A0A0A]">Conteúdos</option>
                                <option value="products" className="bg-white dark:bg-[#0A0A0A]">Produtos</option>
                                <option value="modules" className="bg-white dark:bg-[#0A0A0A]">Módulos</option>
                                <option value="lessons" className="bg-white dark:bg-[#0A0A0A]">Aulas</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Estilo dos Cards</label>
                            <select
                                value={newTrackCardStyle}
                                onChange={(e) => setNewTrackCardStyle(e.target.value as any)}
                                className="w-full bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm"
                            >
                                <option value="horizontal" className="bg-white dark:bg-[#0A0A0A]">Horizontal (Padrão)</option>
                                <option value="vertical" className="bg-white dark:bg-[#0A0A0A]">Vertical (Poster)</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="ghost" onClick={() => setIsCreating(false)}>Cancelar</Button>
                        <Button onClick={handleCreateTrack}>Criar Trilha</Button>
                    </div>
                </Card>
            )}

            <div className="space-y-4">
                {tracks.map((track, index) => (
                    <div key={track.id} className="bg-white dark:bg-[#0A0A0A] border border-gray-200 dark:border-white/10 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="flex flex-col gap-1">
                                    <button
                                        onClick={() => moveTrack(index, 'up')}
                                        disabled={index === 0}
                                        className="text-gray-400 hover:text-white disabled:opacity-30"
                                    >
                                        ▲
                                    </button>
                                    <button
                                        onClick={() => moveTrack(index, 'down')}
                                        disabled={index === tracks.length - 1}
                                        className="text-gray-400 hover:text-white disabled:opacity-30"
                                    >
                                        ▼
                                    </button>
                                </div>
                                <div>
                                    <h3 className="font-medium text-gray-900 dark:text-white">{track.title}</h3>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-gray-500 uppercase">{track.type}</span>
                                        <span className="text-gray-600 dark:text-gray-400">•</span>
                                        <select
                                            value={track.card_style || 'horizontal'}
                                            onChange={(e) => handleUpdateTrackStyle(track.id, e.target.value as any)}
                                            className="text-xs bg-transparent border-none text-gray-500 uppercase cursor-pointer focus:ring-0 p-0"
                                        >
                                            <option value="horizontal" className="bg-white dark:bg-[#0A0A0A]">Horizontal</option>
                                            <option value="vertical" className="bg-white dark:bg-[#0A0A0A]">Vertical</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handleToggleVisibility(track)}
                                    className={`p-2 rounded-lg transition-colors ${track.is_visible ? 'text-green-500 bg-green-500/10' : 'text-gray-500 bg-gray-500/10'}`}
                                >
                                    {track.is_visible ? <Eye size={18} /> : <EyeOff size={18} />}
                                </button>
                                <button
                                    onClick={() => setDeleteModal({ isOpen: true, trackId: track.id })}
                                    className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>

                        {/* Items List */}
                        <div className="pl-8">
                            <div className="flex flex-wrap gap-2 mb-3">
                                {track.items?.map((item) => (
                                    <div key={item.id} className="relative group bg-gray-100 dark:bg-white/5 rounded-lg p-2 pr-8 flex items-center gap-2 border border-gray-200 dark:border-white/5">
                                        {/* Thumbnail if available */}
                                        {(item.product?.imageUrl || item.content?.thumbnail_url) && (
                                            <img
                                                src={item.product?.imageUrl || item.content?.thumbnail_url}
                                                className="w-8 h-8 rounded object-cover"
                                            />
                                        )}
                                        <span className="text-sm truncate max-w-[150px]">
                                            {item.product?.name || item.content?.title || item.module?.title || item.lesson?.title || 'Item desconhecido'}
                                        </span>
                                        <button
                                            onClick={() => handleRemoveItem(item.id)}
                                            className="absolute right-1 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                ))}
                                <button
                                    onClick={() => openItemModal(track.id, track.type)}
                                    className="px-3 py-2 rounded-lg border border-dashed border-gray-300 dark:border-white/20 text-gray-500 hover:text-white hover:border-white/40 text-sm transition-colors flex items-center gap-2"
                                >
                                    <Plus size={14} /> Adicionar Item
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Item Selection Modal */}
            {showItemModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-[#111] w-full max-w-lg rounded-2xl border border-gray-200 dark:border-white/10 shadow-2xl flex flex-col max-h-[80vh]">
                        <div className="p-4 border-b border-gray-200 dark:border-white/10 flex justify-between items-center">
                            <h3 className="font-semibold">Selecionar Item</h3>
                            <button onClick={() => setShowItemModal(false)}><X size={20} /></button>
                        </div>
                        <div className="p-4 overflow-y-auto flex-1 space-y-2">
                            {availableItems.map(item => (
                                <div
                                    key={item.id}
                                    onClick={() => handleAddItem(item)}
                                    className="p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 cursor-pointer flex items-center gap-3 transition-colors"
                                >
                                    {(item.imageUrl || item.thumbnail_url || item.image_url || item.image_horizontal_url || item.image_vertical_url) && (
                                        <img src={item.imageUrl || item.thumbnail_url || item.image_url || item.image_horizontal_url || item.image_vertical_url} className="w-10 h-10 rounded object-cover" />
                                    )}
                                    <div>
                                        <div className="font-medium">{item.name || item.title}</div>
                                    </div>
                                </div>
                            ))}
                            {availableItems.length === 0 && (
                                <div className="text-center text-gray-500 py-8">Nenhum item encontrado.</div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <ConfirmModal
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ isOpen: false, trackId: null })}
                onConfirm={handleDeleteTrack}
                title="Excluir Trilha"
                message="Tem certeza que deseja excluir esta trilha? Esta ação não pode ser desfeita."
                confirmText="Sim, excluir"
                variant="danger"
                loading={isDeleting}
            />
        </div>
    );
};
