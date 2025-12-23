import React, { useState, useEffect, useRef } from 'react';
import { Layout } from '../../components/Layout';
import { storage } from '../../services/storageService';
import { Content, Module, Lesson, Product } from '../../types';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ConfirmModal, AlertModal } from '../../components/ui/Modal';
import {
    ArrowLeft, Save, Upload, Plus, Trash2, Edit2, GripVertical, Video, FileText, Link as LinkIcon, File as FileIcon, MoreVertical, ChevronDown, ChevronRight, Layers
} from 'lucide-react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { LessonEditorModal } from '../../components/admin/LessonEditorModal';

export const ContentEditor = () => {
    console.log('ContentEditor rendering'); // Debug log
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const [searchParams] = useSearchParams();
    const areaId = searchParams.get('areaId');
    const isNew = !id || id === 'new';

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [content, setContent] = useState<Content>({
        id: '',
        title: '',
        description: '',
        thumbnail_url: '',
        type: 'course',
        member_area_id: areaId || '',
        created_at: '',
        updated_at: ''
    });

    const [modules, setModules] = useState<Module[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [selectedProductId, setSelectedProductId] = useState<string>('');

    // Upload State
    const [uploading, setUploading] = useState(false);
    const verticalInputRef = useRef<HTMLInputElement>(null);
    const horizontalInputRef = useRef<HTMLInputElement>(null);
    const moduleVerticalInputRef = useRef<HTMLInputElement>(null);
    const moduleHorizontalInputRef = useRef<HTMLInputElement>(null);

    // Modal States
    const [alertState, setAlertState] = useState<{ isOpen: boolean; title: string; message: string; variant: 'success' | 'error' | 'info' }>({
        isOpen: false, title: '', message: '', variant: 'info'
    });

    // Module/Lesson Editing State
    const [editingModule, setEditingModule] = useState<Module | null>(null);
    const [editingLesson, setEditingLesson] = useState<{ lesson: Lesson, moduleId: string } | null>(null);
    const [isModuleModalOpen, setIsModuleModalOpen] = useState(false);
    const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);

    // Expanded Modules State (for UI toggle)
    const [activeTab, setActiveTab] = useState<'info' | 'structure'>('info');

    // Expanded Modules State (for UI toggle)
    const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});

    useEffect(() => {
        if (!isNew && id) {
            loadData(id);
        } else {
            // Initialize new content
            setContent(prev => ({ ...prev, id: crypto.randomUUID(), member_area_id: areaId || '' }));
            setLoading(false);
            // Load products for dropdown even for new content
            storage.getProducts().then(setProducts);
        }
    }, [id, areaId]);

    const loadData = async (contentId: string) => {
        setLoading(true);
        try {
            const contents = await storage.getContents(); // Inefficient but simple for now, ideally getContentById
            const found = contents.find(c => c.id === contentId);
            if (found) {
                setContent(found);
                setSelectedProductId(found.associated_product?.id || '');
                const modulesData = await storage.getModules(contentId);
                setModules(modulesData);
                // Expand all by default
                const expanded: Record<string, boolean> = {};
                modulesData.forEach(m => expanded[m.id] = true);
                setExpandedModules(expanded);
            } else {
                navigate('/admin/members');
            }

            // Load products for dropdown
            const productsData = await storage.getProducts();
            setProducts(productsData);
        } catch (error) {
            console.error('Error loading content:', error);
            showAlert('Erro', 'Erro ao carregar conteúdo.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const showAlert = (title: string, message: string, variant: 'success' | 'error' | 'info' = 'info') => {
        setAlertState({ isOpen: true, title, message, variant });
    };

    const handleSaveContent = async () => {
        setSaving(true);
        try {
            if (isNew) {
                if (!content.member_area_id) {
                    showAlert('Erro', 'Erro interno: ID da área de membros não encontrado.', 'error');
                    return;
                }
                await storage.createContent(content, selectedProductId || undefined);
                // Navigate to edit mode to allow adding modules
                navigate(`/admin/contents/${content.id}`, { replace: true });
            } else {
                await storage.updateContent(content, selectedProductId || undefined);
            }
            showAlert('Sucesso', 'Conteúdo salvo com sucesso!', 'success');
        } catch (error) {
            console.error('Error saving content:', error);
            showAlert('Erro', `Erro ao salvar conteúdo: ${error.message || error}`, 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleBack = () => {
        if (content.member_area_id) {
            navigate(`/admin/members/${content.member_area_id}`);
        } else {
            navigate('/admin/members');
        }
    };

    const handleContentImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'vertical' | 'horizontal') => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            try {
                setUploading(true);
                const publicUrl = await storage.uploadContentImage(file, content.id, type);
                if (type === 'vertical') {
                    setContent({ ...content, image_vertical_url: publicUrl });
                } else {
                    setContent({ ...content, image_horizontal_url: publicUrl, thumbnail_url: publicUrl });
                }
            } catch (error) {
                console.error('Error uploading image:', error);
                showAlert('Erro', 'Erro ao fazer upload da imagem.', 'error');
            } finally {
                setUploading(false);
            }
        }
    };

    const handleModuleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, moduleId: string, type: 'vertical' | 'horizontal') => {
        if (e.target.files && e.target.files[0] && editingModule) {
            const file = e.target.files[0];
            try {
                setUploading(true);
                const publicUrl = await storage.uploadModuleImage(file, moduleId, type);
                setEditingModule({
                    ...editingModule,
                    [type === 'vertical' ? 'image_vertical_url' : 'image_horizontal_url']: publicUrl
                });
            } catch (error) {
                console.error('Error uploading module image:', error);
                showAlert('Erro', 'Erro ao fazer upload da imagem.', 'error');
            } finally {
                setUploading(false);
            }
        }
    };

    // --- MODULES ---

    const handleCreateModule = async () => {
        const newModule: Module = {
            id: crypto.randomUUID(),
            content_id: content.id,
            title: 'Novo Módulo',
            description: '',
            order_index: modules.length,
            created_at: new Date().toISOString(),
            is_published: true,
            lessons: []
        };

        // Optimistic update
        setModules([...modules, newModule]);
        setExpandedModules({ ...expandedModules, [newModule.id]: true });

        // Save to DB
        try {
            await storage.createModule(newModule);
            setEditingModule(newModule);
            setIsModuleModalOpen(true);
        } catch (error) {
            console.error('Error creating module:', error);
            showAlert('Erro', 'Erro ao criar módulo.', 'error');
            loadData(content.id); // Revert
        }
    };

    const handleUpdateModule = async (module: Module) => {
        try {
            await storage.updateModule(module);
            setModules(modules.map(m => m.id === module.id ? module : m));
            setIsModuleModalOpen(false);
        } catch (error) {
            console.error('Error updating module:', error);
            showAlert('Erro', 'Erro ao atualizar módulo.', 'error');
        }
    };

    const handleDeleteModule = async (moduleId: string) => {
        if (!confirm('Tem certeza que deseja excluir este módulo e todas as suas aulas?')) return;
        try {
            await storage.deleteModule(moduleId);
            setModules(modules.filter(m => m.id !== moduleId));
        } catch (error) {
            console.error('Error deleting module:', error);
            showAlert('Erro', 'Erro ao excluir módulo.', 'error');
        }
    };

    // --- LESSONS ---

    const handleCreateLesson = async (moduleId: string) => {
        const module = modules.find(m => m.id === moduleId);
        if (!module) return;

        const newLesson: Lesson = {
            id: crypto.randomUUID(),
            module_id: moduleId,
            title: 'Nova Aula',
            content_type: 'video',
            order_index: module.lessons?.length || 0,
            is_free: false,
            created_at: new Date().toISOString()
        };

        // Optimistic
        const updatedModules = modules.map(m => {
            if (m.id === moduleId) {
                return { ...m, lessons: [...(m.lessons || []), newLesson] };
            }
            return m;
        });
        setModules(updatedModules);

        try {
            await storage.createLesson(newLesson);
            setEditingLesson({ lesson: newLesson, moduleId });
            setIsLessonModalOpen(true);
        } catch (error) {
            console.error('Error creating lesson:', error);
            showAlert('Erro', 'Erro ao criar aula.', 'error');
            loadData(content.id);
        }
    };

    const handleUpdateLesson = async (lesson: Lesson) => {
        try {
            await storage.updateLesson(lesson);
            const updatedModules = modules.map(m => {
                if (m.id === lesson.module_id) {
                    return {
                        ...m,
                        lessons: m.lessons?.map(l => l.id === lesson.id ? lesson : l)
                    };
                }
                return m;
            });
            setModules(updatedModules);
            setIsLessonModalOpen(false);
        } catch (error) {
            console.error('Error updating lesson:', error);
            showAlert('Erro', 'Erro ao atualizar aula.', 'error');
        }
    };

    const handleDeleteLesson = async (lessonId: string, moduleId: string) => {
        if (!confirm('Tem certeza que deseja excluir esta aula?')) return;
        try {
            await storage.deleteLesson(lessonId);
            const updatedModules = modules.map(m => {
                if (m.id === moduleId) {
                    return {
                        ...m,
                        lessons: m.lessons?.filter(l => l.id !== lessonId)
                    };
                }
                return m;
            });
            setModules(updatedModules);
        } catch (error) {
            console.error('Error deleting lesson:', error);
            showAlert('Erro', 'Erro ao excluir aula.', 'error');
        }
    };

    const toggleModule = (moduleId: string) => {
        setExpandedModules(prev => ({ ...prev, [moduleId]: !prev[moduleId] }));
    };

    return (
        <Layout>
            <div className="animate-in slide-in-from-right duration-300 pb-20">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <button onClick={handleBack} className="p-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                            <ArrowLeft className="w-5 h-5 text-white" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-white">{isNew ? 'Novo Conteúdo' : 'Editar Conteúdo'}</h1>
                            <p className="text-gray-400 text-sm">{content.title || 'Sem título'}</p>
                        </div>
                    </div>
                    <Button onClick={handleSaveContent} isLoading={saving}>
                        <Save className="w-4 h-4" /> Salvar Alterações
                    </Button>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-2 mb-8 border-b border-gray-200 dark:border-white/10 overflow-x-auto">
                    <button
                        onClick={() => setActiveTab('info')}
                        className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'info' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-white'}`}
                    >
                        <FileText className="w-4 h-4" /> Informações Básicas
                    </button>
                    <button
                        onClick={() => setActiveTab('structure')}
                        disabled={isNew}
                        className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'structure' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-white'} ${isNew ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <Layers className="w-4 h-4" /> Estrutura (Módulos & Aulas)
                    </button>
                </div>

                <div className="animate-in fade-in duration-300">
                    {/* Tab: Info */}
                    {activeTab === 'info' && (
                        <div className="max-w-3xl mx-auto">
                            <Card>
                                <h3 className="text-sm font-bold text-white mb-4">Informações Básicas</h3>

                                {/* Images */}
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    {/* Vertical */}
                                    <div>
                                        <label className="block text-xs text-gray-400 mb-2">Capa Vertical (3:4)</label>
                                        <div className="relative w-full aspect-[3/4] rounded-xl bg-black/20 border-2 border-dashed border-white/10 overflow-hidden group">
                                            {content.image_vertical_url ? (
                                                <>
                                                    <img src={content.image_vertical_url} className="w-full h-full object-cover" />
                                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                        <Button variant="secondary" size="xs" onClick={() => verticalInputRef.current?.click()}>
                                                            <Upload className="w-3 h-3 mr-1" /> Trocar
                                                        </Button>
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer hover:bg-white/5 transition-colors" onClick={() => verticalInputRef.current?.click()}>
                                                    <Upload className="w-6 h-6 text-gray-400 mb-1" />
                                                    <span className="text-[10px] text-gray-400">Upload</span>
                                                </div>
                                            )}
                                        </div>
                                        <input type="file" ref={verticalInputRef} className="hidden" accept="image/*" onChange={(e) => handleContentImageUpload(e, 'vertical')} />
                                    </div>

                                    {/* Horizontal */}
                                    <div>
                                        <label className="block text-xs text-gray-400 mb-2">Capa Horizontal (16:9)</label>
                                        <div className="relative w-full aspect-video rounded-xl bg-black/20 border-2 border-dashed border-white/10 overflow-hidden group">
                                            {content.image_horizontal_url ? (
                                                <>
                                                    <img src={content.image_horizontal_url} className="w-full h-full object-cover" />
                                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                        <Button variant="secondary" size="xs" onClick={() => horizontalInputRef.current?.click()}>
                                                            <Upload className="w-3 h-3 mr-1" /> Trocar
                                                        </Button>
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer hover:bg-white/5 transition-colors" onClick={() => horizontalInputRef.current?.click()}>
                                                    <Upload className="w-6 h-6 text-gray-400 mb-1" />
                                                    <span className="text-[10px] text-gray-400">Upload</span>
                                                </div>
                                            )}
                                        </div>
                                        <input type="file" ref={horizontalInputRef} className="hidden" accept="image/*" onChange={(e) => handleContentImageUpload(e, 'horizontal')} />
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs text-gray-400 mb-1">Título</label>
                                        <input
                                            type="text"
                                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                                            value={content.title}
                                            onChange={e => setContent({ ...content, title: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-400 mb-1">Descrição</label>
                                        <textarea
                                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                                            rows={3}
                                            value={content.description}
                                            onChange={e => setContent({ ...content, description: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-400 mb-1">Tipo</label>
                                        <select
                                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                                        >
                                            <option value="horizontal">Horizontal (Padrão)</option>
                                            <option value="vertical">Vertical (Poster)</option>
                                        </select>
                                    </div>

                                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10">
                                        <div>
                                            <h4 className="font-medium text-gray-900 dark:text-white">Conteúdo Gratuito</h4>
                                            <p className="text-xs text-gray-500">Permitir acesso para contas gratuitas</p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                className="sr-only peer"
                                                checked={content.is_free || false}
                                                onChange={e => {
                                                    const isFree = e.target.checked;
                                                    setContent({ ...content, is_free: isFree });
                                                    if (isFree) setSelectedProductId('');
                                                }}
                                            />
                                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/30 dark:peer-focus:ring-primary/30 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
                                        </label>
                                    </div>

                                    {!content.is_free && (
                                        <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10 animate-in fade-in slide-in-from-top-2">
                                            <h4 className="font-medium text-gray-900 dark:text-white mb-2">Produto Vinculado</h4>
                                            <p className="text-xs text-gray-500 mb-3">Selecione o produto que o aluno precisa comprar para acessar este conteúdo.</p>

                                            <select
                                                value={selectedProductId}
                                                onChange={(e) => setSelectedProductId(e.target.value)}
                                                className="w-full bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-gray-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-primary/50"
                                            >
                                                <option value="">Selecione um produto...</option>
                                                {products.map(product => (
                                                    <option key={product.id} value={product.id}>
                                                        {product.name}
                                                    </option>
                                                ))}
                                            </select>
                                            {products.length === 0 && (
                                                <p className="text-xs text-yellow-500 mt-2">Nenhum produto encontrado. Crie um produto primeiro.</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </Card>
                        </div>
                    )}

                    {/* Tab: Structure */}
                    {activeTab === 'structure' && (
                        <div className="max-w-4xl mx-auto space-y-6">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-bold text-white">Estrutura do Conteúdo</h2>
                                <Button size="sm" variant="secondary" onClick={handleCreateModule} disabled={isNew}>
                                    <Plus className="w-4 h-4" /> Novo Módulo
                                </Button>
                            </div>

                            {isNew && (
                                <div className="p-8 border border-dashed border-white/10 rounded-xl text-center bg-white/5">
                                    <p className="text-gray-400">Salve o conteúdo primeiro para adicionar módulos.</p>
                                </div>
                            )}

                            {!isNew && modules.length === 0 && (
                                <div className="p-12 border border-dashed border-white/10 rounded-xl text-center bg-white/5">
                                    <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Plus className="w-6 h-6 text-gray-400" />
                                    </div>
                                    <h3 className="text-lg font-medium text-white mb-2">Comece criando um módulo</h3>
                                    <p className="text-gray-400 text-sm mb-4">Organize seu conteúdo em módulos e aulas.</p>
                                    <Button onClick={handleCreateModule}>Criar Primeiro Módulo</Button>
                                </div>
                            )}

                            <div className="space-y-4">
                                {modules.map((module, index) => (
                                    <div key={module.id} className="border border-white/10 rounded-xl bg-[#0A0A0A] overflow-hidden">
                                        {/* Module Header */}
                                        <div className="flex items-center justify-between p-4 bg-white/5 border-b border-white/5 group">
                                            <div className="flex items-center gap-3 flex-1 cursor-pointer" onClick={() => toggleModule(module.id)}>
                                                <div className="p-1 rounded hover:bg-white/10 text-gray-400">
                                                    {expandedModules[module.id] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-white text-sm">
                                                        {module.title}
                                                        {module.is_free && <span className="ml-2 text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded">Grátis</span>}
                                                    </h4>
                                                    <p className="text-xs text-gray-500">{module.lessons?.length || 0} aulas</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => { setEditingModule(module); setIsModuleModalOpen(true); }} className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg">
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => handleDeleteModule(module.id)} className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                                <Button size="xs" variant="secondary" onClick={() => handleCreateLesson(module.id)}>
                                                    <Plus className="w-3 h-3 mr-1" /> Aula
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Lessons List */}
                                        {expandedModules[module.id] && (
                                            <div className="bg-black/20">
                                                {module.lessons && module.lessons.length > 0 ? (
                                                    <div className="divide-y divide-white/5">
                                                        {module.lessons.map((lesson) => (
                                                            <div key={lesson.id} className="flex items-center justify-between p-3 pl-10 hover:bg-white/5 group transition-colors">
                                                                <div className="flex items-center gap-3">
                                                                    {lesson.content_type === 'video' && <Video className="w-4 h-4 text-blue-400" />}
                                                                    {lesson.content_type === 'text' && <FileText className="w-4 h-4 text-green-400" />}
                                                                    {lesson.content_type === 'file' && <FileIcon className="w-4 h-4 text-orange-400" />}
                                                                    {lesson.content_type === 'link' && <LinkIcon className="w-4 h-4 text-purple-400" />}
                                                                    <span className="text-sm text-gray-300">{lesson.title}</span>
                                                                    {lesson.is_free && <span className="text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded">Grátis</span>}
                                                                </div>
                                                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <button onClick={() => { setEditingLesson({ lesson, moduleId: module.id }); setIsLessonModalOpen(true); }} className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded">
                                                                        <Edit2 className="w-3.5 h-3.5" />
                                                                    </button>
                                                                    <button onClick={() => handleDeleteLesson(lesson.id, module.id)} className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded">
                                                                        <Trash2 className="w-3.5 h-3.5" />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="p-6 text-center text-xs text-gray-500 italic">
                                                        Nenhuma aula neste módulo.
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Edit Module Modal */}
                {isModuleModalOpen && editingModule && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                        <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 duration-200">
                            <h3 className="text-lg font-bold text-white mb-4">Editar Módulo</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Título do Módulo</label>
                                    <input
                                        type="text"
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-primary/50 outline-none"
                                        value={editingModule.title}
                                        onChange={e => setEditingModule({ ...editingModule, title: e.target.value })}
                                        autoFocus
                                    />
                                </div>

                                {/* Module Images */}
                                <div className="grid grid-cols-2 gap-4">
                                    {/* Vertical */}
                                    <div>
                                        <label className="block text-xs text-gray-400 mb-2">Capa Vertical (3:4)</label>
                                        <div className="relative w-full aspect-[3/4] rounded-xl bg-black/20 border-2 border-dashed border-white/10 overflow-hidden group">
                                            {editingModule.image_vertical_url ? (
                                                <>
                                                    <img src={editingModule.image_vertical_url} className="w-full h-full object-cover" />
                                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                        <Button variant="secondary" size="xs" onClick={() => moduleVerticalInputRef.current?.click()}>
                                                            <Upload className="w-3 h-3 mr-1" /> Trocar
                                                        </Button>
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer hover:bg-white/5 transition-colors" onClick={() => moduleVerticalInputRef.current?.click()}>
                                                    <Upload className="w-6 h-6 text-gray-400 mb-1" />
                                                    <span className="text-[10px] text-gray-400">Upload</span>
                                                </div>
                                            )}
                                        </div>
                                        <input type="file" ref={moduleVerticalInputRef} className="hidden" accept="image/*" onChange={(e) => handleModuleImageUpload(e, editingModule.id, 'vertical')} />
                                    </div>

                                    {/* Horizontal */}
                                    <div>
                                        <label className="block text-xs text-gray-400 mb-2">Capa Horizontal (16:9)</label>
                                        <div className="relative w-full aspect-video rounded-xl bg-black/20 border-2 border-dashed border-white/10 overflow-hidden group">
                                            {editingModule.image_horizontal_url ? (
                                                <>
                                                    <img src={editingModule.image_horizontal_url} className="w-full h-full object-cover" />
                                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                        <Button variant="secondary" size="xs" onClick={() => moduleHorizontalInputRef.current?.click()}>
                                                            <Upload className="w-3 h-3 mr-1" /> Trocar
                                                        </Button>
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer hover:bg-white/5 transition-colors" onClick={() => moduleHorizontalInputRef.current?.click()}>
                                                    <Upload className="w-6 h-6 text-gray-400 mb-1" />
                                                    <span className="text-[10px] text-gray-400">Upload</span>
                                                </div>
                                            )}
                                        </div>
                                        <input type="file" ref={moduleHorizontalInputRef} className="hidden" accept="image/*" onChange={(e) => handleModuleImageUpload(e, editingModule.id, 'horizontal')} />
                                    </div>
                                </div>
                                <div className="flex items-center pt-4">
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="w-5 h-5 rounded border-gray-600 text-primary bg-black/20"
                                            checked={editingModule.is_free || false}
                                            onChange={e => setEditingModule({ ...editingModule, is_free: e.target.checked })}
                                        />
                                        <span className="text-sm text-white">Módulo Gratuito (Acesso liberado)</span>
                                    </label>
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="w-5 h-5 rounded border-gray-600 text-primary bg-black/20"
                                            checked={editingModule.is_published !== false} // Default to true if undefined
                                            onChange={e => setEditingModule({ ...editingModule, is_published: e.target.checked })}
                                        />
                                        <span className="text-sm text-white">Publicado (Visível na vitrine/área de membros)</span>
                                    </label>
                                </div>
                                <div className="flex justify-end gap-3 mt-6">
                                    <Button variant="secondary" onClick={() => setIsModuleModalOpen(false)}>Cancelar</Button>
                                    <Button onClick={() => handleUpdateModule(editingModule)}>Salvar</Button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Edit Lesson Modal */}
                {editingLesson && (
                    <LessonEditorModal
                        isOpen={isLessonModalOpen}
                        onClose={() => setIsLessonModalOpen(false)}
                        onSave={handleUpdateLesson}
                        lesson={editingLesson.lesson}
                        moduleId={editingLesson.moduleId}
                    />
                )}

                <AlertModal
                    isOpen={alertState.isOpen}
                    onClose={() => setAlertState({ ...alertState, isOpen: false })}
                    title={alertState.title}
                    message={alertState.message}
                    variant={alertState.variant}
                />
            </div>
        </Layout>
    );
};
