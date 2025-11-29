import { useNavigate, useOutletContext } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AccessGrant, Content, Module, Lesson, Product, TrackItem } from '../types';

export type AccessAction = 'ACCESS' | 'LOGIN' | 'SALES_MODAL';

interface UseAccessControlResult {
    checkAccess: (item: TrackItem | Content | Module | Lesson | Product) => AccessAction;
    handleAccess: (
        item: TrackItem | Content | Module | Lesson | Product,
        callbacks: {
            onAccess: () => void;
            onSalesModal: (product?: Product) => void;
        }
    ) => void;
}

export const useAccessControl = (accessGrants: AccessGrant[] = []): UseAccessControlResult => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { memberArea } = useOutletContext<{ memberArea: any }>() || {};

    const checkAccess = (item: TrackItem | Content | Module | Lesson | Product): AccessAction => {
        // Normalize item to check properties
        let isFree = false;
        let productId: string | undefined;
        let contentId: string | undefined;
        let product: Product | undefined;

        if ('product' in item && item.product) {
            // It's a TrackItem with a product
            product = item.product;
            productId = item.product.id;
        } else if ('content' in item && item.content) {
            // It's a TrackItem with content
            isFree = item.content.is_free || false;
            contentId = item.content.id;
        } else if ('module' in item && item.module) {
            // It's a TrackItem with module
            isFree = item.module.is_free || false;
            contentId = item.module.content_id;
        } else if ('lesson' in item && item.lesson) {
            // It's a TrackItem with lesson
            isFree = item.lesson.is_free || false;
            // We'd need to know the parent content/module to check access fully, 
            // but usually lessons inherit access. For now, assume strict check if passed directly.
        } else if ('is_free' in item) {
            // Direct Content/Module/Lesson object
            isFree = (item as any).is_free || false;
            if ('content_id' in item) contentId = (item as any).content_id;
            if ('id' in item && !('content_id' in item) && !('video_url' in item)) contentId = (item as any).id; // Content object
        } else if ('price_real' in item) {
            // Direct Product object
            product = item as Product;
            productId = item.id;
            import { useNavigate, useOutletContext } from 'react-router-dom';
            import { useAuth } from '../context/AuthContext';
            import { AccessGrant, Content, Module, Lesson, Product, TrackItem } from '../types';

            export type AccessAction = 'ACCESS' | 'LOGIN' | 'SALES_MODAL';

            interface UseAccessControlResult {
                checkAccess: (item: TrackItem | Content | Module | Lesson | Product) => AccessAction;
                handleAccess: (
                    item: TrackItem | Content | Module | Lesson | Product,
                    callbacks: {
                        onAccess: () => void;
                        onSalesModal: (product?: Product) => void;
                    }
                ) => void;
            }

            export const useAccessControl = (accessGrants: AccessGrant[] = []): UseAccessControlResult => {
                const { user } = useAuth();
                const navigate = useNavigate();
                const { memberArea } = useOutletContext<{ memberArea: any }>() || {};

                const checkAccess = (item: TrackItem | Content | Module | Lesson | Product): AccessAction => {
                    // Normalize item to check properties
                    let isFree = false;
                    let productId: string | undefined;
                    let contentId: string | undefined;
                    let product: Product | undefined;

                    if ('product' in item && item.product) {
                        // It's a TrackItem with a product
                        product = item.product;
                        productId = item.product.id;
                    } else if ('content' in item && item.content) {
                        // It's a TrackItem with content
                        isFree = item.content.is_free || false;
                        contentId = item.content.id;
                    } else if ('module' in item && item.module) {
                        // It's a TrackItem with module
                        isFree = item.module.is_free || false;
                        contentId = item.module.content_id;
                    } else if ('lesson' in item && item.lesson) {
                        // It's a TrackItem with lesson
                        isFree = item.lesson.is_free || false;
                        // We'd need to know the parent content/module to check access fully, 
                        // but usually lessons inherit access. For now, assume strict check if passed directly.
                    } else if ('is_free' in item) {
                        // Direct Content/Module/Lesson object
                        isFree = (item as any).is_free || false;
                        if ('content_id' in item) contentId = (item as any).content_id;
                        if ('id' in item && !('content_id' in item) && !('video_url' in item)) contentId = (item as any).id; // Content object
                    } else if ('price_real' in item) {
                        // Direct Product object
                        product = item as Product;
                        productId = item.id;
                    }

                    // 1. Free Content Logic
                    if (isFree) {
                        if (!user) return 'LOGIN';
                        return 'ACCESS';
                    }

                    // 2. Paid Content Logic
                    // If it's a product itself, check if we own it
                    if (productId) {
                        // Check if we have a grant for this product
                        const hasAccess = accessGrants.some(g => g.product_id === productId && g.status === 'active');
                        if (hasAccess) return 'ACCESS';
                        return 'SALES_MODAL';
                    }

                    // If it's content/module, check if we have access via any product or direct content grant
                    if (contentId) {
                        const hasAccess = accessGrants.some(g =>
                            (g.content_id === contentId && g.status === 'active')
                        );

                        if (hasAccess) return 'ACCESS';

                        // If user is logged in but doesn't have access -> Sales Modal
                        // If user is NOT logged in -> Sales Modal (per requirement)
                        return 'SALES_MODAL';
                    }

                    // Fallback
                    return 'SALES_MODAL';
                };

                const handleAccess = (
                    item: TrackItem | Content | Module | Lesson | Product,
                    callbacks: {
                        onAccess: () => void;
                        onSalesModal: (product?: Product) => void;
                    }
                ) => {
                    const action = checkAccess(item);

                    if (action === 'LOGIN') {
                        const appLink = memberArea ? `/app/${memberArea.slug}` : '/app';
                        navigate(`${appLink}/login`);
                    } else if (action === 'SALES_MODAL') {
                        // Determine which product to show in modal
                        let productToSell: Product | undefined;

                        if ('product' in item && item.product) {
                            productToSell = item.product;
                        } else if ('price_real' in item) {
                            productToSell = item as Product;
                        }
                        // For content/module/lesson, we might not know WHICH product to sell without more info.
                        // The caller might need to handle fetching the associated product.
                        // But we can pass what we have.

                        callbacks.onSalesModal(productToSell);
                    } else {
                        callbacks.onAccess();
                    }
                };

                return { checkAccess, handleAccess };
            };
