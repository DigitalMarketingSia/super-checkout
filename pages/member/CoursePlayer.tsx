import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { storage } from '../../services/storageService';
import { Content, Module, Lesson, MemberArea, AccessGrant } from '../../types';
import { ChevronLeft, CheckCircle, Circle, PlayCircle, FileText, Download, Menu, X, ChevronDown, ChevronUp, PanelLeftClose, PanelLeftOpen, Search, Play, ChevronRight, Home } from 'lucide-react';
import { useAccessControl } from '../../hooks/useAccessControl';
import { ProductSalesModal } from '../../components/member/ProductSalesModal';

export const CoursePlayer = () => {
    const { slug, id } = useParams<{ slug: string; id: string }>();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const [loading, setLoading] = useState(true);
    const [content, setContent] = useState<Content | null>(null);
    const [memberArea, setMemberArea] = useState<MemberArea | null>(null);
    const [modules, setModules] = useState<Module[]>([]);
    const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
    const [progressMap, setProgressMap] = useState<Record<string, boolean>>({});
    const [accessGrants, setAccessGrants] = useState<AccessGrant[]>([]);
    const { handleAccess, checkAccess } = useAccessControl(accessGrants);
    const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [expandedModuleId, setExpandedModuleId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (id) {
            loadData(id);
        }
    }, [id, slug]);

    const loadData = async (contentId: string) => {
        setLoading(true);
        try {
            if (slug) {
                const area = await storage.getMemberAreaBySlug(slug);
                setMemberArea(area);
            }

            const contents = await storage.getContents();
            const foundContent = contents.find(c => c.id === contentId);

            if (!foundContent) {
                navigate(slug ? `/app/${slug}` : '/app');
                return;
            }

            setContent(foundContent);
            const modulesData = await storage.getModules(contentId);
            setModules(modulesData);

            const grants = await storage.getAccessGrants();
            setAccessGrants(grants);

            // Find lesson to play
            let lessonToPlay: Lesson | null = null;
            const lessonIdParam = searchParams.get('lesson_id');
            const moduleIdParam = searchParams.get('module_id');

            if (lessonIdParam) {
                // Find specific lesson
                for (const m of modulesData) {
                    const l = m.lessons?.find(l => l.id === lessonIdParam);
                    if (l) {
                        lessonToPlay = l;
                        break;
                    }
                }
            } else if (moduleIdParam) {
                // Find first lesson of specific module
                const m = modulesData.find(m => m.id === moduleIdParam);
                if (m && m.lessons && m.lessons.length > 0) {
                    lessonToPlay = m.lessons[0];
                }
            }

            // Fallback to first lesson of first module
            if (!lessonToPlay && modulesData.length > 0 && modulesData[0].lessons && modulesData[0].lessons.length > 0) {
                lessonToPlay = modulesData[0].lessons[0];
            }

            if (lessonToPlay) {
                setCurrentLesson(lessonToPlay);
                setExpandedModuleId(lessonToPlay.module_id);
                checkProgress(lessonToPlay.id);
            } else if (modulesData.length > 0) {
                // Expand first module by default if no lesson selected
                setExpandedModuleId(modulesData[0].id);
            }

        } catch (error) {
            console.error('Error loading course:', error);
        } finally {
            setLoading(false);
        }
    };

    const checkProgress = async (lessonId: string) => {
        const progress = await storage.getLessonProgress(lessonId);
        if (progress?.completed) {
            setProgressMap(prev => ({ ...prev, [lessonId]: true }));
        }
    };

    // Check access when currentLesson changes (for direct URL access)
    useEffect(() => {
        if (!loading && currentLesson) {
            handleAccess(currentLesson, {
                onAccess: () => { }, // Do nothing, already here
                onSalesModal: (product) => {
                    setSelectedProduct(product);
                    setIsModalOpen(true);
                }
            }, { content: content || undefined });
        }
    }, [currentLesson, loading, accessGrants, content]);

    const handleLessonSelect = (lesson: Lesson) => {
        handleAccess(lesson, {
            onAccess: () => {
                setCurrentLesson(lesson);
                checkProgress(lesson.id);
                // On mobile, close sidebar
                if (window.innerWidth < 768) {
                    setSidebarOpen(false);
                }
            },
            onSalesModal: (product) => {
                setSelectedProduct(product);
                setIsModalOpen(true);
            }
        }, { content: content || undefined });
    };

    const toggleModule = (module: Module) => {
        handleAccess(module, {
            onAccess: () => {
                setExpandedModuleId(prev => prev === module.id ? null : module.id);
            },
            onSalesModal: (product) => {
                setSelectedProduct(product);
                setIsModalOpen(true);
            }
        }, { content: content || undefined });
    };

    const handleMarkCompleted = async () => {
        if (!currentLesson) return;

        const newStatus = !progressMap[currentLesson.id];
        setProgressMap(prev => ({ ...prev, [currentLesson.id]: newStatus }));

        await storage.updateLessonProgress({
            lesson_id: currentLesson.id,
            completed: newStatus
        });
    };

    const handlePrevious = () => {
        if (!currentLesson) return;
        const allLessons = modules.flatMap(m => m.lessons || []);
        const currentIndex = allLessons.findIndex(l => l.id === currentLesson.id);
        if (currentIndex > 0) {
            handleLessonSelect(allLessons[currentIndex - 1]);
        }
    };

    const handleNext = () => {
        if (!currentLesson) return;
        const allLessons = modules.flatMap(m => m.lessons || []);
        const currentIndex = allLessons.findIndex(l => l.id === currentLesson.id);
        if (currentIndex < allLessons.length - 1) {
            handleLessonSelect(allLessons[currentIndex + 1]);
        }
    };

    const renderContent = () => {
        if (!currentLesson) return <div className="text-white">Selecione uma aula</div>;

        const allLessons = modules.flatMap(m => m.lessons || []);
        const currentIndex = allLessons.findIndex(l => l.id === currentLesson.id);
        const hasPrevious = currentIndex > 0;
        const hasNext = currentIndex < allLessons.length - 1;

        const renderSection = (type: string) => {
            switch (type) {
                case 'video':
                    return currentLesson.video_url ? (
                        <div key="video" className="aspect-video bg-black rounded-xl overflow-hidden shadow-2xl border border-white/10 w-full">
                            <iframe
                                src={currentLesson.video_url.replace('watch?v=', 'embed/')}
                                className="w-full h-full"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            />
                        </div>
                    ) : null;

                case 'text':
                    return currentLesson.content_text ? (
                        <div key="text" className="bg-white/5 rounded-xl p-8 border border-white/5">
                            <div className="prose prose-invert max-w-none whitespace-pre-wrap">
                                {currentLesson.content_text}
                            </div>
                        </div>
                    ) : null;

                case 'file':
                    return currentLesson.file_url ? (
                        <div key="file" className="bg-white/5 rounded-xl p-6 border border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-white/5 rounded-lg">
                                    <FileText className="w-6 h-6 text-primary" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-white text-sm">Material Complementar</h3>
                                    <p className="text-xs text-gray-400">Clique para acessar o arquivo ou link externo</p>
                                </div>
                            </div>
                            <a
                                href={currentLesson.file_url}
                                target="_blank"
                                rel="noreferrer"
                                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                            >
                                <Download className="w-4 h-4" /> Acessar Recurso
                            </a>
                        </div>
                    ) : null;

                case 'gallery':
                    return (currentLesson.gallery && currentLesson.gallery.length > 0) ? (
                        <div key="gallery" className="pt-8 border-t border-white/5">
                            <h3 className="text-xl font-bold text-white mb-6">Galeria de Recursos</h3>
                            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {currentLesson.gallery.map((resource) => (
                                    <div key={resource.id} className="bg-[#1a1e26] rounded-xl overflow-hidden border border-white/5 hover:border-white/10 transition-all group">
                                        <div className="aspect-video w-full bg-black/20 relative overflow-hidden">
                                            {resource.image_url ? (
                                                <img src={resource.image_url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-white/5">
                                                    <FileText className="w-10 h-10 text-gray-600" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="p-3">
                                            <h4 className="font-bold text-white mb-2 text-sm line-clamp-2 leading-snug">{resource.title}</h4>
                                            <a
                                                href={resource.link_url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="block w-full text-center py-2 rounded-lg font-bold text-xs transition-colors bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white"
                                            >
                                                Acessar
                                            </a>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : null;

                default:
                    return null;
            }
        };

        const contentOrder = currentLesson.content_order || ['video', 'text', 'file', 'gallery'];

        return (
            <div className="LESSON-CONTAINER w-full max-w-[1100px] mx-auto px-6 space-y-8 pb-20">
                <div className="space-y-8">
                    {contentOrder.map(type => renderSection(type))}
                </div>

                {/* Footer Actions & Navigation */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-6 pt-8 border-t border-white/10 pb-8">
                    <div className="w-full md:w-auto">
                        <h1 className="text-2xl font-bold text-white mb-1">{currentLesson.title}</h1>
                        <p className="text-gray-400 text-sm">Módulo: {modules.find(m => m.id === currentLesson.module_id)?.title}</p>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handlePrevious}
                                disabled={!hasPrevious}
                                className={`p-3 rounded-full border transition-colors ${!hasPrevious ? 'border-white/5 text-gray-600 cursor-not-allowed' : 'border-white/10 text-white hover:bg-white/10 hover:border-white/20'}`}
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <button
                                onClick={handleNext}
                                disabled={!hasNext}
                                className={`p-3 rounded-full border transition-colors ${!hasNext ? 'border-white/5 text-gray-600 cursor-not-allowed' : 'border-white/10 text-white hover:bg-white/10 hover:border-white/20'}`}
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>

                        <button
                            onClick={handleMarkCompleted}
                            className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold transition-all ${progressMap[currentLesson.id]
                                ? 'bg-green-500 text-white hover:bg-green-600'
                                : 'bg-white/10 text-white hover:bg-white/20'
                                }`}
                            style={progressMap[currentLesson.id] && memberArea?.primary_color ? { backgroundColor: memberArea.primary_color } : {}}
                        >
                            {progressMap[currentLesson.id] ? (
                                <>
                                    <CheckCircle className="w-5 h-5" /> Concluída
                                </>
                            ) : (
                                <>
                                    <Circle className="w-5 h-5" /> Marcar como Concluída
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div >
        );
    };

    const primaryColor = memberArea?.primary_color || '#dc2626'; // Default red

    const filteredModules = React.useMemo(() => {
        if (!searchTerm) return modules;
        const lowerTerm = searchTerm.toLowerCase();
        return modules.map(m => {
            const moduleMatches = m.title.toLowerCase().includes(lowerTerm);
            const matchingLessons = m.lessons?.filter(l => l.title.toLowerCase().includes(lowerTerm));

            if (moduleMatches) return m; // Return full module if title matches
            if (matchingLessons && matchingLessons.length > 0) {
                return { ...m, lessons: matchingLessons }; // Return module with filtered lessons
            }
            return null;
        }).filter(Boolean) as Module[];
    }, [modules, searchTerm]);

    // Auto-expand modules when searching
    useEffect(() => {
        if (searchTerm && filteredModules.length > 0) {
            const newExpanded: Record<string, boolean> = {};
            filteredModules.forEach(m => newExpanded[m.id] = true);
            // We don't setExpandedModuleId here because that controls the accordion state which is single-expand in the current UI logic? 
            // Actually the current UI uses `expandedModuleId` state which is a string (single expansion). 
            // The user might want to see multiple results. 
            // Let's check the state definition: const [expandedModuleId, setExpandedModuleId] = useState<string | null>(null);
            // It only supports one open module at a time. 
            // For search, it might be better to allow multiple or just expand the first one.
            // Let's just expand the first match for now to keep it simple and consistent with current state type.
            if (filteredModules.length > 0) {
                setExpandedModuleId(filteredModules[0].id);
            }
        }
    }, [searchTerm, filteredModules]);

    return (
        <div className="flex h-screen bg-[#0D1118] text-white overflow-hidden">
            {/* Sidebar */}
            <aside
                className={`
          fixed md:static inset-y-0 left-0 z-50 bg-gradient-to-b from-[#0f131a] to-[#0b0f16] border-r border-white/5 flex flex-col transition-all duration-300
          ${sidebarOpen ? 'translate-x-0 w-80' : '-translate-x-full md:translate-x-0 md:w-20'}
        `}
            >
                {sidebarOpen ? (
                    <>
                        <div className="p-4 flex items-center justify-between sticky top-0 bg-[#0f131a]/95 backdrop-blur-sm z-20">
                            <h2 className="font-bold truncate pr-4 text-sm uppercase tracking-wider text-gray-400">{content?.title || 'Carregando...'}</h2>
                            <button
                                onClick={() => setSidebarOpen(false)}
                                className="p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
                                style={{ backgroundColor: primaryColor }}
                            >
                                <PanelLeftClose className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Search Bar */}
                        <div className="px-4 pb-4 border-b border-white/5 sticky top-[61px] bg-[#0f131a]/95 backdrop-blur-sm z-20">
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                                <input
                                    id="search-input"
                                    type="text"
                                    placeholder="Buscar conteúdo"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full bg-[#1a1e26] border-none rounded-full py-2.5 pl-10 pr-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-white/20 transition-all"
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            {filteredModules.map((module, index) => (
                                <div key={module.id} className="border-b border-white/5 mb-6 last:mb-0">
                                    <div
                                        onClick={() => toggleModule(module)}
                                        className="p-0 cursor-pointer hover:bg-white/5 transition-colors"
                                    >
                                        {/* Module Card Header */}
                                        <div className="relative h-24 w-full overflow-hidden">
                                            {module.image_horizontal_url ? (
                                                <img src={module.image_horizontal_url} className="w-full h-full object-cover opacity-60" />
                                            ) : (
                                                <div className="w-full h-full bg-gradient-to-r from-gray-800 to-gray-900" />
                                            )}
                                            <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-transparent flex items-center justify-between p-4">
                                                <div className="flex-1 pr-4">
                                                    <span
                                                        className="text-[10px] text-white font-bold uppercase tracking-wider mb-1.5 inline-block px-2 py-0.5 rounded shadow-sm"
                                                        style={{ backgroundColor: primaryColor }}
                                                    >
                                                        Módulo {modules.findIndex(m => m.id === module.id) + 1}
                                                    </span>
                                                    <h3 className="text-sm font-bold text-white line-clamp-2 leading-tight">{module.title}</h3>
                                                </div>
                                                {expandedModuleId === module.id ? <ChevronUp size={18} className="text-white" /> : <ChevronDown size={18} className="text-white" />}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Lessons List (Accordion) */}
                                    {expandedModuleId === module.id && (
                                        <div className="bg-transparent px-2 pb-2 pt-6 space-y-4">
                                            {module.lessons?.map((lesson, lIndex) => {
                                                const isActive = currentLesson?.id === lesson.id;
                                                const isCompleted = progressMap[lesson.id];

                                                // Determine thumbnail
                                                let thumbnailUrl = lesson.image_url;
                                                if (!thumbnailUrl && lesson.video_url) {
                                                    // Try to get YT thumbnail
                                                    const videoId = lesson.video_url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/)?.[1];
                                                    if (videoId) {
                                                        thumbnailUrl = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
                                                    }
                                                }

                                                return (
                                                    <button
                                                        key={lesson.id}
                                                        onClick={() => handleLessonSelect(lesson)}
                                                        className={`group w-full text-left p-2 flex items-center gap-3 rounded-xl transition-all border border-transparent ${isActive
                                                            ? 'bg-[#1c212c] border-white/10 shadow-lg'
                                                            : 'bg-[#131720] hover:bg-[#1a1e26] border-transparent'
                                                            }`}
                                                    >
                                                        {/* Thumbnail */}
                                                        <div className="relative w-24 aspect-video flex-shrink-0 bg-gray-800 rounded-lg overflow-hidden shadow-sm">
                                                            {thumbnailUrl ? (
                                                                <img src={thumbnailUrl} className={`w-full h-full object-cover transition-opacity ${isActive ? 'opacity-40' : 'opacity-80 group-hover:opacity-100'}`} alt="" />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center text-gray-600">
                                                                    <FileText size={20} />
                                                                </div>
                                                            )}

                                                            {isActive && (
                                                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[1px]">
                                                                    <span className="text-[9px] font-bold text-white uppercase tracking-wider bg-black/60 px-1.5 py-0.5 rounded-full">Tocando</span>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Info */}
                                                        <div className="flex-1 min-w-0 py-1">
                                                            <p className={`text-sm font-medium line-clamp-2 leading-snug ${isActive ? 'text-white' : 'text-gray-300 group-hover:text-white'}`}>
                                                                {lesson.title}
                                                            </p>
                                                        </div>

                                                        {/* Status */}
                                                        <div className="flex-shrink-0 pr-1">
                                                            {isCompleted ? (
                                                                <div className="bg-green-500/20 rounded-full p-0.5">
                                                                    <CheckCircle className="w-5 h-5 text-green-500 fill-green-500/20" />
                                                                </div>
                                                            ) : (
                                                                <div className="w-5 h-5 rounded-full border-2 border-gray-700/50 group-hover:border-gray-600" />
                                                            )}
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                            {(!module.lessons || module.lessons.length === 0) && (
                                                <div className="p-4 text-xs text-gray-500 text-center">Nenhuma aula neste módulo.</div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className="border-t border-white/10">
                            <button
                                onClick={() => navigate(slug ? `/app/${slug}` : '/app')}
                                className="flex items-center justify-center gap-2 w-full py-4 font-medium text-sm transition-all bg-white/5 hover:bg-white/10 text-white"
                                style={{ backgroundColor: primaryColor }}
                            >
                                <Home className="w-4 h-4" /> Ir para Vitrine
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center py-6 space-y-6">
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="p-3 text-white hover:bg-white/10 rounded-xl transition-all"
                            title="Expandir menu"
                            style={{ backgroundColor: primaryColor }}
                        >
                            <PanelLeftOpen className="w-6 h-6" />
                        </button>

                        <button
                            onClick={() => {
                                setSidebarOpen(true);
                                setTimeout(() => document.getElementById('search-input')?.focus(), 100);
                            }}
                            className="p-3 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                            title="Buscar"
                        >
                            <Search className="w-6 h-6" />
                        </button>

                        <button
                            onClick={() => navigate(slug ? `/app/${slug}` : '/app')}
                            className="p-3 text-white hover:bg-white/10 rounded-xl transition-all"
                            title="Ir para Vitrine"
                            style={{ backgroundColor: primaryColor }}
                        >
                            <Home className="w-6 h-6" />
                        </button>
                    </div>
                )}
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col h-full relative">
                {/* Mobile Toggle */}
                {!sidebarOpen && (
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="absolute top-6 left-6 z-30 p-2 text-white md:hidden rounded-lg backdrop-blur-sm transition-colors"
                        style={{ backgroundColor: primaryColor }}
                    >
                        <PanelLeftOpen className="w-6 h-6" />
                    </button>
                )}

                <div className="LESSON-WRAP flex-1 overflow-y-auto bg-[#0D1118] p-4 md:p-8 pt-12 md:pt-16 flex justify-center">
                    {loading ? (
                        <div className="flex items-center justify-center h-64 w-full">
                            <div className="animate-spin w-8 h-8 border-2 border-t-transparent rounded-full" style={{ borderColor: `${primaryColor} transparent transparent transparent` }}></div>
                        </div>
                    ) : (
                        renderContent()
                    )}
                </div>
            </main>

            <ProductSalesModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                product={selectedProduct}
            />
        </div>
    );
};
