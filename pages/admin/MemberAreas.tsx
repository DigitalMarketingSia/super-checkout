import React, { useState, useEffect } from 'react';
import { Layout } from '../../components/Layout';
import { storage } from '../../services/storageService';
import { MemberArea } from '../../types';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ConfirmModal } from '../../components/ui/Modal';
import { Plus, Users, ExternalLink, Settings, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export const MemberAreas = () => {
    const navigate = useNavigate();
    const { user } = useAuth(); // Get user from context
    const [loading, setLoading] = useState(true);
    const [areas, setAreas] = useState<MemberArea[]>([]);
    const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; areaId: string | null }>({ isOpen: false, areaId: null });
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        if (user) {
            loadAreas();
        }
    }, [user]); // Add user dependency

    const loadAreas = async () => {
        console.log('MemberAreas: loadAreas started');
        setLoading(true);

        // Safety timeout to prevent infinite loading
        const safetyTimer = setTimeout(() => {
            console.warn('MemberAreas: loadAreas timed out');
            setLoading(false);
        }, 5000);

        try {
            console.log('MemberAreas: calling storage.getMemberAreas() with user', user?.id);
            // PASS user.id to bypass storage internal getUser call
            const data = await storage.getMemberAreas(user?.id);
            console.log('MemberAreas: data received', data);
            setAreas(data);
        } catch (error) {
            console.error('Error loading member areas:', error);
        } finally {
            clearTimeout(safetyTimer);
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteModal.areaId) return;
        setIsDeleting(true);
        try {
            await storage.deleteMemberArea(deleteModal.areaId);
            setAreas(areas.filter(a => a.id !== deleteModal.areaId));
            setDeleteModal({ isOpen: false, areaId: null });
        } catch (error) {
            console.error('Error deleting member area:', error);
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <Layout>
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Áreas de Membros</h1>
                    <p className="text-gray-500 mt-1">Gerencie seus portais de alunos</p>
                </div>
                <Button onClick={() => navigate('/admin/members/new')}>
                    <Plus className="w-4 h-4" /> Nova Área
                </Button>
            </div>

            {loading ? (
                <div className="text-center py-10 text-gray-500">Carregando...</div>
            ) : areas.length === 0 ? (
                <div className="text-center py-20 bg-white dark:bg-[#0A0A0A] rounded-2xl border border-gray-200 dark:border-white/5">
                    <div className="w-16 h-16 bg-gray-100 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Users className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Nenhuma área criada</h3>
                    <p className="text-gray-500 mb-6 max-w-md mx-auto">Crie seu primeiro portal para hospedar seus cursos e conteúdos.</p>
                    <Button onClick={() => navigate('/admin/members/new')}>Criar Primeira Área</Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {areas.map(area => (
                        <div key={area.id} className="group relative bg-white dark:bg-[#0A0A0A] border border-gray-200 dark:border-white/10 rounded-2xl overflow-hidden hover:border-primary/50 transition-all hover:shadow-lg hover:shadow-primary/5">
                            <div className="h-32 bg-gradient-to-br from-gray-800 to-black relative">
                                {area.logo_url ? (
                                    <img src={area.logo_url} className="w-full h-full object-cover opacity-50" />
                                ) : (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <Users className="w-12 h-12 text-white/20" />
                                    </div>
                                )}
                                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                    <button onClick={() => setDeleteModal({ isOpen: true, areaId: area.id })} className="p-2 bg-black/50 text-white rounded-lg hover:bg-red-500/80 transition-colors">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <div className="p-6">
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">{area.name}</h3>
                                <p className="text-sm text-gray-500 mb-4">/{area.slug}</p>

                                <div className="flex items-center gap-3 mt-6">
                                    <Button className="flex-1" onClick={() => navigate(`/admin/members/${area.id}`)}>
                                        Gerenciar Portal
                                    </Button>
                                    <a href={`/app/${area.slug}`} target="_blank" className="p-2.5 border border-gray-200 dark:border-white/10 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 text-gray-500 transition-colors">
                                        <ExternalLink className="w-5 h-5" />
                                    </a>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <ConfirmModal
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ isOpen: false, areaId: null })}
                onConfirm={handleDelete}
                title="Excluir Área de Membros"
                message="Tem certeza que deseja excluir esta área de membros? Esta ação não pode ser desfeita."
                confirmText="Sim, excluir"
                variant="danger"
                loading={isDeleting}
            />
        </Layout>
    );
};
