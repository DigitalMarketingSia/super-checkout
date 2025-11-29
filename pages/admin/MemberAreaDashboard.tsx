import React, { useState, useEffect } from 'react';
import { Layout } from '../../components/Layout';
import { storage } from '../../services/storageService';
import { MemberArea } from '../../types';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ArrowLeft, BookOpen, Settings, Globe, Package, Save, ExternalLink, Layers, Users } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { Contents } from './Contents';
import { MemberSettings } from './MemberSettings';
import { MemberDomains } from './MemberDomains';
import { MemberAreaTracks } from './MemberAreaTracks';
import { MemberAreaMembers } from './MemberAreaMembers';
import { MemberAreaProducts } from './MemberAreaProducts';

export const MemberAreaDashboard = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const isNew = !id || id === 'new';

    const [activeTab, setActiveTab] = useState<'contents' | 'settings' | 'domains' | 'products' | 'tracks'>('contents');
    const [loading, setLoading] = useState(true);
    const [area, setArea] = useState<MemberArea>({
        id: '',
        owner_id: '',
        name: '',
        slug: '',
        primary_color: '#E50914',
        created_at: ''
    });

    useEffect(() => {
        if (!isNew && id) {
            loadArea(id);
        } else {
            setArea({ ...area, id: crypto.randomUUID() });
            setLoading(false);
            setActiveTab('settings'); // Force settings for new area
        }
    }, [id]);

    const loadArea = async (areaId: string) => {
        setLoading(true);
        try {
            const data = await storage.getMemberAreaById(areaId);
            if (data) {
                setArea(data);
            } else {
                navigate('/admin/members');
            }
        } catch (error) {
            console.error('Error loading area:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (updatedArea: MemberArea) => {
        try {
            if (isNew) {
                // Remove created_at (empty string) to avoid DB error
                const { created_at, ...areaData } = updatedArea;
                // @ts-ignore
                const newArea = await storage.createMemberArea(areaData);
                navigate(`/admin/members/${newArea.id}`, { replace: true });
            } else {
                await storage.updateMemberArea(updatedArea);
            }
            setArea(updatedArea);
        } catch (error: any) {
            console.error('Error saving area:', error);
            alert(`Erro ao salvar área de membros: ${error.message}`);
        }
    };

    if (loading) return <Layout><div>Carregando...</div></Layout>;

    return (
        <Layout>
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/admin/members')} className="p-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                        <ArrowLeft className="w-5 h-5 text-white" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{isNew ? 'Nova Área de Membros' : area.name}</h1>
                        <p className="text-gray-500 text-sm">{isNew ? 'Configure seu novo portal' : `Gerenciando portal /${area.slug}`}</p>
                    </div>
                </div>
                {!isNew && (
                    <a
                        href={`/app/${area.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary hover:bg-primary/20 rounded-lg transition-colors"
                    >
                        <ExternalLink className="w-4 h-4" />
                        Visualizar Portal
                    </a>
                )}
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-2 mb-8 border-b border-gray-200 dark:border-white/10 overflow-x-auto">
                {!isNew && (
                    <button
                        onClick={() => setActiveTab('contents')}
                        className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'contents' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-white'}`}
                    >
                        <BookOpen className="w-4 h-4" /> Conteúdos
                    </button>
                )}
                {!isNew && (
                    <button
                        onClick={() => setActiveTab('tracks')}
                        className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'tracks' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-white'}`}
                    >
                        <Layers className="w-4 h-4" /> Trilhas (Vitrine)
                    </button>
                )}
                {!isNew && (
                    <button
                        onClick={() => setActiveTab('members')}
                        className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'members' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-white'}`}
                    >
                        <Users className="w-4 h-4" /> Membros
                    </button>
                )}
                <button
                    onClick={() => setActiveTab('settings')}
                    className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'settings' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-white'}`}
                >
                    <Settings className="w-4 h-4" /> Configurações & Aparência
                </button>
                {!isNew && (
                    <button
                        onClick={() => setActiveTab('products')}
                        className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'products' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-white'}`}
                    >
                        <Package className="w-4 h-4" /> Produtos Vinculados
                    </button>
                )}
            </div>

            {/* Tab Content */}
            <div className="animate-in fade-in duration-300">
                {activeTab === 'contents' && !isNew && (
                    <Contents memberAreaId={area.id} />
                )}

                {activeTab === 'tracks' && !isNew && (
                    <MemberAreaTracks memberAreaId={area.id} />
                )}

                {activeTab === 'members' && !isNew && (
                    <MemberAreaMembers memberAreaId={area.id} />
                )}

                {activeTab === 'settings' && (
                    <div className="space-y-12">
                        <MemberSettings area={area} onSave={handleSave} isNew={isNew} />
                        {!isNew && (
                            <div className="border-t border-white/10 pt-10">
                                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                    <Globe className="w-5 h-5 text-primary" />
                                    Domínio Personalizado
                                </h2>
                                <MemberDomains area={area} onSave={handleSave} />
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'products' && (
                    <MemberAreaProducts memberAreaId={area.id} />
                )}
            </div>
        </Layout>
    );
};
