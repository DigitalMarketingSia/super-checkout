import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight, Lock, PlayCircle, Package, FileText, BookOpen } from 'lucide-react';
import { Track, TrackItem, AccessGrant } from '../../types';
import { ProductSalesModal } from './ProductSalesModal';
import { useAccessControl } from '../../hooks/useAccessControl';

interface TrackSliderProps {
    track: Track;
    onItemClick: (item: TrackItem) => void;
    accessGrants?: AccessGrant[];
}

export const TrackSlider: React.FC<TrackSliderProps> = ({ track, onItemClick, accessGrants = [] }) => {
    const { handleAccess } = useAccessControl(accessGrants);
    const [selectedProduct, setSelectedProduct] = React.useState<any | null>(null);
    const [isModalOpen, setIsModalOpen] = React.useState(false);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const [canScrollLeft, setCanScrollLeft] = React.useState(false);
    const [canScrollRight, setCanScrollRight] = React.useState(false);

    const checkScroll = () => {
        if (scrollContainerRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
            setCanScrollLeft(scrollLeft > 0);
            setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1); // -1 for tolerance
        }
    };

    React.useEffect(() => {
        checkScroll();
        window.addEventListener('resize', checkScroll);
        return () => window.removeEventListener('resize', checkScroll);
    }, [track.items]);

    const scroll = (direction: 'left' | 'right') => {
        if (scrollContainerRef.current) {
            const scrollAmount = 300; // Adjust based on card width
            scrollContainerRef.current.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth',
            });
        }
    };

    return (
        <div className="mb-8">
            <h3 className="text-xl font-semibold text-white mb-4 px-4 md:px-0">{track.title}</h3>

            <div className="relative group">
                {/* Left Button */}
                {canScrollLeft && (
                    <button
                        onClick={() => scroll('left')}
                        className="absolute -left-12 top-1/2 -translate-y-1/2 z-10 text-gray-400 hover:text-white p-2 transition-all hidden md:block opacity-0 group-hover:opacity-100 hover:scale-125"
                    >
                        <ChevronLeft size={40} strokeWidth={1.5} />
                    </button>
                )}

                <div
                    ref={scrollContainerRef}
                    onScroll={checkScroll}
                    className="flex overflow-x-auto gap-4 pb-4 scrollbar-hide px-4 md:px-0 snap-x"
                >
                    {track.items?.map((item) => (
                        <TrackItemCard
                            key={item.id}
                            item={item}
                            onClick={() => {
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

                {/* Right Button */}
                {canScrollRight && (
                    <button
                        onClick={() => scroll('right')}
                        className="absolute -right-12 top-1/2 -translate-y-1/2 z-10 text-gray-400 hover:text-white p-2 transition-all hidden md:block opacity-0 group-hover:opacity-100 hover:scale-125"
                    >
                        <ChevronRight size={40} strokeWidth={1.5} />
                    </button>
                )}
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
    const isVertical = cardStyle === 'vertical';

    if (item.product) {
        title = item.product.name;
        imageUrl = item.product.imageUrl || '';
        Icon = Package;
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
                    <div className="absolute top-2 left-2 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide shadow-sm">
                        Gratuito
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
