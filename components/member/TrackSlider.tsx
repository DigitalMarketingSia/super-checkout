import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight, Lock, PlayCircle, Package, FileText, BookOpen, CheckCircle } from 'lucide-react';
import { Track, TrackItem, AccessGrant } from '../../types';
import { ProductSalesModal } from './ProductSalesModal';
import { useAccessControl } from '../../hooks/useAccessControl';

interface TrackSliderProps {
    track: Track;
    onItemClick: (item: TrackItem) => void;
    accessGrants?: AccessGrant[];
    primaryColor?: string;
}

export const TrackSlider: React.FC<TrackSliderProps> = ({ track, onItemClick, accessGrants = [], primaryColor }) => {
    const { handleAccess } = useAccessControl(accessGrants);
    const [selectedProduct, setSelectedProduct] = React.useState<any | null>(null);
    const [isModalOpen, setIsModalOpen] = React.useState(false);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const [canScrollLeft, setCanScrollLeft] = React.useState(false);
    const [canScrollRight, setCanScrollRight] = React.useState(false);

    // Drag to scroll state
    const [isDragging, setIsDragging] = React.useState(false);
    const [startX, setStartX] = React.useState(0);
    const [scrollLeft, setScrollLeft] = React.useState(0);

    const checkScroll = () => {
        if (scrollContainerRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
            setCanScrollLeft(scrollLeft > 0);
            setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
        }
    };

    React.useEffect(() => {
        checkScroll();
        window.addEventListener('resize', checkScroll);
        return () => window.removeEventListener('resize', checkScroll);
    }, [track.items]);

    const scroll = (direction: 'left' | 'right') => {
        if (scrollContainerRef.current) {
            const scrollAmount = 300;
            scrollContainerRef.current.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth',
            });
        }
    };

    // Drag to scroll handlers
    const handleMouseDown = (e: React.MouseEvent) => {
        if (!scrollContainerRef.current) return;
        setIsDragging(true);
        setStartX(e.pageX - scrollContainerRef.current.offsetLeft);
        setScrollLeft(scrollContainerRef.current.scrollLeft);
        scrollContainerRef.current.style.cursor = 'grabbing';
    };

    const handleMouseLeave = () => {
        setIsDragging(false);
        if (scrollContainerRef.current) {
            scrollContainerRef.current.style.cursor = 'grab';
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
        if (scrollContainerRef.current) {
            scrollContainerRef.current.style.cursor = 'grab';
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging || !scrollContainerRef.current) return;
        e.preventDefault();
        const x = e.pageX - scrollContainerRef.current.offsetLeft;
        const walk = (x - startX) * 2; // Scroll speed multiplier
        scrollContainerRef.current.scrollLeft = scrollLeft - walk;
    };

    return (
        <div className="mb-8">
            <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    height: 8px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 4px;
                    margin: 0 16px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: ${primaryColor || '#D4143C'};
                    border-radius: 4px;
                    transition: background 0.2s;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: ${primaryColor ? `color-mix(in srgb, ${primaryColor} 80%, white)` : '#E91E63'};
                }
                .custom-scrollbar {
                    cursor: grab;
                    user-select: none;
                }
                .custom-scrollbar:active {
                    cursor: grabbing;
                }
            `}</style>

            {/* Header with Title and Navigation Arrows */}
            <div className="flex items-center justify-between mb-4 px-4 md:px-0">
                <h3 className="text-xl font-semibold text-white">{track.title}</h3>

                {/* Navigation Arrows - Together on the right */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => scroll('left')}
                        disabled={!canScrollLeft}
                        className={`p-2 rounded-full transition-all ${canScrollLeft
                                ? 'bg-white/10 hover:bg-white/20 text-white'
                                : 'bg-white/5 text-gray-600 cursor-not-allowed'
                            }`}
                        style={canScrollLeft && primaryColor ? {
                            backgroundColor: `${primaryColor}20`,
                            color: primaryColor
                        } : {}}
                    >
                        <ChevronLeft size={20} strokeWidth={2} />
                    </button>
                    <button
                        onClick={() => scroll('right')}
                        disabled={!canScrollRight}
                        className={`p-2 rounded-full transition-all ${canScrollRight
                                ? 'bg-white/10 hover:bg-white/20 text-white'
                                : 'bg-white/5 text-gray-600 cursor-not-allowed'
                            }`}
                        style={canScrollRight && primaryColor ? {
                            backgroundColor: `${primaryColor}20`,
                            color: primaryColor
                        } : {}}
                    >
                        <ChevronRight size={20} strokeWidth={2} />
                    </button>
                </div>
            </div>

            <div className="relative">
                <div
                    ref={scrollContainerRef}
                    onScroll={checkScroll}
                    onMouseDown={handleMouseDown}
                    onMouseLeave={handleMouseLeave}
                    onMouseUp={handleMouseUp}
                    onMouseMove={handleMouseMove}
                    className="flex overflow-x-auto gap-4 pb-4 px-4 md:px-0 snap-x custom-scrollbar"
                >
                    {track.items?.map((item) => (
                        <TrackItemCard
                            key={item.id}
                            item={item}
                            onClick={() => {
                                if (isDragging) return; // Don't trigger click if dragging
                                handleAccess(item, {
                                    onAccess: () => onItemClick(item),
                                    onSalesModal: (product) => {
                                        const productToSell = product || item.product;
                                        if (productToSell) {
                                            setSelectedProduct(productToSell);
                                            setIsModalOpen(true);
                                        } else {
                                            alert('Conteúdo exclusivo para assinantes.');
                                        }
                                    }
                                });
                            }}
                            accessGrants={accessGrants}
                            cardStyle={track.card_style || 'vertical'}
                        />
                    ))}
                </div>
            </div>

            <ProductSalesModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                product={selectedProduct}
            />
        </div>
    );
};

interface TrackItemCardProps {
    item: TrackItem;
    onClick: () => void;
    accessGrants: AccessGrant[];
    cardStyle: 'vertical' | 'horizontal';
}

const TrackItemCard: React.FC<TrackItemCardProps> = ({ item, onClick, accessGrants, cardStyle }) => {
    const { checkAccess } = useAccessControl(accessGrants);
    // Determine content based on item type (polymorphic)
    let title = '';
    let imageUrl = '';
    let Icon = Package;
    let isFree = false;
    let isOwned = false; // NEW: Track if product is owned
    const isVertical = cardStyle === 'vertical';

    if (item.product) {
        title = item.product.name;
        imageUrl = item.product.imageUrl || '';
        Icon = Package;
        // Check if user owns this product
        isOwned = accessGrants.some(g => g.product_id === item.product!.id && g.status === 'active');
    } else if (item.content) {
        title = item.content.title;
        isFree = item.content.is_free || false;
        // Choose image based on style
        if (isVertical) {
            imageUrl = item.content.image_vertical_url || item.content.thumbnail_url || '';
        } else {
            imageUrl = item.content.image_horizontal_url || item.content.thumbnail_url || '';
        }
        Icon = BookOpen;
    } else if (item.module) {
        title = item.module.title;
        isFree = item.module.is_free || false;
        if (isVertical) {
            imageUrl = item.module.image_vertical_url || '';
        } else {
            imageUrl = item.module.image_horizontal_url || '';
        }
        Icon = FileText;
    } else if (item.lesson) {
        title = item.lesson.title;
        isFree = item.lesson.is_free || false;
        // Lessons are usually horizontal (card style)
        imageUrl = item.lesson.image_url || (item.lesson.video_url ? `https://img.youtube.com/vi/${getYouTubeId(item.lesson.video_url)}/mqdefault.jpg` : '');
        Icon = PlayCircle;
    }

    // Access Check Logic
    const isLocked = React.useMemo(() => {
        if (!item) return false;
        const action = checkAccess(item);
        return action === 'SALES_MODAL';
    }, [item, accessGrants, checkAccess]);


    return (
        <div
            onClick={onClick}
            className={`flex-none ${isVertical ? 'w-48' : 'w-72'} snap-start cursor-pointer group/card relative transition-transform hover:scale-105`}
        >
            <div className={`${isVertical ? 'aspect-[3/4]' : 'aspect-video'} rounded-lg overflow-hidden bg-gray-800 relative ${isLocked ? 'grayscale' : ''}`}>
                {imageUrl ? (
                    <img
                        src={imageUrl}
                        alt={title}
                        className={`w-full h-full ${item.product ? 'object-contain bg-black/20' : 'object-cover'}`}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-500">
                        <Icon size={48} />
                    </div>
                )}

                {isLocked && (
                    <div className="absolute top-2 right-2 bg-black/60 p-1 rounded-full text-white">
                        <Lock size={16} />
                    </div>
                )}

                {isFree && (
                    <div className="absolute top-2 left-2 bg-green-500/20 text-green-500 border border-green-500/20 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide shadow-sm flex items-center gap-1 backdrop-blur-sm">
                        <CheckCircle size={10} strokeWidth={3} />
                        Gratuito
                    </div>
                )}

                {/* Owned Product Badge */}
                {isOwned && (
                    <div className="absolute top-2 left-2 bg-orange-500/20 text-orange-500 border border-orange-500/20 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide shadow-sm flex items-center gap-1 backdrop-blur-sm">
                        <Package size={10} strokeWidth={3} />
                        Adquirido
                    </div>
                )}

                <div className="absolute inset-0 bg-black/0 group-hover/card:bg-black/20 transition-colors" />
            </div>

            <div className="mt-2">
                <h4 className="text-sm font-medium text-gray-200 group-hover/card:text-white truncate">{title}</h4>
            </div>
        </div>
    );
};

// Helper to extract YT ID (simplified)
function getYouTubeId(url: string) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}
