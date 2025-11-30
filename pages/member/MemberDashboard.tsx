import React, { useState, useEffect } from 'react';
import { useOutletContext, useNavigate, useParams } from 'react-router-dom';
import { storage } from '../../services/storageService';
import { Content, MemberArea, Track, AccessGrant } from '../../types';
import { Play, Info } from 'lucide-react';
import { TrackSlider } from '../../components/member/TrackSlider';
import { useAccessControl } from '../../hooks/useAccessControl';
import { ProductSalesModal } from '../../components/member/ProductSalesModal';

interface MemberAreaContextType {
    memberArea: MemberArea | null;
}

export const MemberDashboard = () => {
    const navigate = useNavigate();
    const { memberArea } = useOutletContext<MemberAreaContextType>();
    const [tracks, setTracks] = useState<Track[]>([]);
    const [loading, setLoading] = useState(true);
    const [featuredContent, setFeaturedContent] = useState<Content | null>(null);
    const [accessGrants, setAccessGrants] = useState<AccessGrant[]>([]);
    const { handleAccess } = useAccessControl(accessGrants);
    const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const appLink = memberArea ? `/app/${memberArea.slug}` : '/app';

    useEffect(() => {
        loadData();
    }, [memberArea]);

    const loadData = async () => {
        if (!memberArea) return;

        setLoading(true);
        try {
            // Fetch Tracks
            const tracksData = await storage.getTracks(memberArea.id);
            const fullTracks = await Promise.all(tracksData.map(t => storage.getTrackWithItems(t.id)));
            const validTracks = fullTracks.filter(t => t !== null) as Track[];
            setTracks(validTracks);

            // Fetch Access Grants
            const grants = await storage.getAccessGrants();
            setAccessGrants(grants);

            // Set Featured Content
            if (validTracks.length > 0 && validTracks[0].items && validTracks[0].items.length > 0) {
                const firstItem = validTracks[0].items[0];
                if (firstItem.content) {
                    setFeaturedContent(firstItem.content);
                }
            }
        } catch (error) {
            console.error('Error loading dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleItemClick = async (item: any) => {
        console.log('Item clicked:', item);
        handleAccess(item, {
            onAccess: () => {
                console.log('Access granted');
                const appLink = memberArea ? `/app/${memberArea.slug}` : '/app';
                console.log('Navigating to:', appLink);
                if (item.content) {
                    console.log('Navigating to content:', `${appLink}/content/${item.content.id}`);
                    navigate(`${appLink}/content/${item.content.id}`);
                } else if (item.module) {
                    navigate(`${appLink}/course/${item.module.content_id}`);
                } else if (item.lesson) {
                    navigate(`${appLink}/course/${item.lesson.module_id}`);
                }
            },
            onSalesModal: (product) => {
                console.log('Sales modal triggered', product);
                if (product) {
                    setSelectedProduct(product);
                    setIsModalOpen(true);
                } else {
                    // Fallback if no product found directly
                    alert('Conteúdo exclusivo para assinantes.');
                }
            }
        });
    };

    if (loading && tracks.length === 0) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin" style={{ borderColor: memberArea?.primary_color ? `${memberArea.primary_color} transparent transparent transparent` : undefined }}></div>
            </div>
        );
    }

    return (
        <>
            {/* Hero / Banner */}
            {(memberArea?.banner_url || featuredContent?.thumbnail_url) && (
                <div className="relative h-[50vh] md:h-[70vh] w-full -mt-20 mb-12">
                    <div className="absolute inset-0">
                        {memberArea?.banner_url ? (
                            <img
                                src={memberArea.banner_url}
                                className="w-full h-full object-cover"
                                alt={memberArea.name}
                            />
                        ) : featuredContent?.thumbnail_url ? (
                            <img
                                src={featuredContent.thumbnail_url}
                                className="w-full h-full object-cover"
                                alt={featuredContent.title}
                            />
                        ) : (
                            <div className="w-full h-full bg-gradient-to-br from-gray-900 to-[#0E1012]" />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-r from-[#0E1012] via-[#0E1012]/50 to-transparent" />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0E1012] via-transparent to-transparent" />
                    </div>

                    <div className="absolute bottom-0 left-0 p-8 md:p-16 w-full md:w-2/3 lg:w-1/2 space-y-2 md:space-y-4">
                        {/* Only show badge if it's a featured content fallback, not custom banner */}
                        {!memberArea?.banner_title && featuredContent && (
                            <span className="text-red-600 font-bold tracking-widest text-sm uppercase bg-black/50 px-3 py-1 rounded backdrop-blur-sm border border-red-600/30 inline-block mb-2" style={{ color: memberArea?.primary_color, borderColor: memberArea?.primary_color ? `${memberArea.primary_color}4D` : undefined }}>
                                Destaque
                            </span>
                        )}

                        <h1 className="text-4xl md:text-6xl font-bold text-white leading-tight drop-shadow-lg">
                            {memberArea?.banner_title || featuredContent?.title}
                        </h1>
                        <p className="text-lg text-gray-200 line-clamp-3 drop-shadow-md pb-2">
                            {memberArea?.banner_description || featuredContent?.description}
                        </p>

                        <div className="flex items-center gap-4">
                            {memberArea?.banner_button_text && memberArea?.banner_button_link ? (
                                <a
                                    href={memberArea.banner_button_link}
                                    className="flex items-center gap-2 bg-white text-black px-8 py-3 rounded font-bold hover:bg-gray-200 transition-colors"
                                    style={{ backgroundColor: memberArea.primary_color, color: '#fff' }}
                                >
                                    {memberArea.banner_button_text}
                                </a>
                            ) : featuredContent ? (
                                <>
                                    <button
                                        onClick={() => handleItemClick({ content: featuredContent })}
                                        className="flex items-center gap-2 bg-white text-black px-8 py-3 rounded font-bold hover:bg-gray-200 transition-colors"
                                        style={{ backgroundColor: memberArea?.primary_color, color: '#fff' }}
                                    >
                                        <Play className="w-5 h-5 fill-current" /> Assistir
                                    </button>
                                    <button className="flex items-center gap-2 bg-gray-500/70 text-white px-8 py-3 rounded font-bold hover:bg-gray-500/90 transition-colors backdrop-blur-sm">
                                        <Info className="w-5 h-5" /> Mais Info
                                    </button>
                                </>
                            ) : null}
                        </div>
                    </div>
                </div>
            )}

            {/* Tracks Section */}
            <div className="px-4 md:px-12 space-y-8 relative z-10 -mt-10 pb-20">
                {tracks.length === 0 ? (
                    <div className="text-gray-500 py-10 text-center border border-white/10 rounded-xl bg-white/5">
                        {memberArea ? 'Nenhuma trilha configurada.' : 'Selecione uma área de membros.'}
                    </div>
                ) : (
                    tracks.map(track => (
                        <TrackSlider
                            key={track.id}
                            track={track}
                            onItemClick={handleItemClick}
                            accessGrants={accessGrants}
                            primaryColor={memberArea?.primary_color}
                        />
                    ))
                )}
            </div>

            <ProductSalesModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                product={selectedProduct}
            />
        </>
    );
};
