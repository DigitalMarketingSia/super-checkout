import { supabase } from './storageService';
import { Profile, MemberNote, MemberTag, ActivityLog, AccessGrant, Product } from '../types';

export const memberService = {
    /**
     * Get all members (profiles) with optional filtering
     * This uses the 'admin_members_view' if available, or manual joins
     */
    async getMembers(page = 1, limit = 20, search = '', status = '', productId = '') {
        // ... (existing implementation)
        return this.getMembersByArea('', page, limit, search, status);
    },

    /**
     * Get members for a specific area (or all if areaId is empty for now)
     * Supports filtering by status and type (free/paid)
     */
    async getMembersByArea(memberAreaId: string, page = 1, limit = 20, search = '', status = '', type: 'all' | 'free' | 'paid' = 'all') {
        const from = (page - 1) * limit;
        const to = from + limit - 1;

        // Use the view for easier querying of counts
        let query = supabase.from('admin_members_view').select('*', { count: 'exact' });

        if (search) {
            query = query.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`);
        }

        if (status) {
            query = query.eq('status', status);
        }

        if (type === 'paid') {
            query = query.gt('orders_count', 0);
        } else if (type === 'free') {
            query = query.eq('orders_count', 0);
        }

        query = query.range(from, to).order('joined_at', { ascending: false });

        const { data, error, count } = await query;

        if (error) {
            console.warn('View admin_members_view might not exist, falling back to profiles table', error);
            // Fallback to raw profiles if view doesn't exist
            let fallbackQuery = supabase.from('profiles').select('*', { count: 'exact' });
            if (search) fallbackQuery = fallbackQuery.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`);
            if (status) fallbackQuery = fallbackQuery.eq('status', status);

            // Cannot efficiently filter by paid/free on raw table without join, so we skip that strictly or do client side
            fallbackQuery = fallbackQuery.range(from, to).order('created_at', { ascending: false });

            const fallback = await fallbackQuery;
            if (fallback.error) throw fallback.error;

            // Map fallback data to match view structure loosely
            const mappedData = fallback.data.map((p: any) => ({
                user_id: p.id,
                email: p.email,
                full_name: p.full_name,
                status: p.status,
                joined_at: p.created_at,
                active_products_count: 0,
                orders_count: 0
            }));

            return { data: mappedData, count: fallback.count || 0 };
        }

        // Map view data to expected Member interface
        const mappedData = data.map((m: any) => ({
            user_id: m.user_id,
            email: m.email,
            name: m.full_name || m.email.split('@')[0],
            status: m.status,
            joined_at: m.joined_at,
            orders_count: m.orders_count, // Extra info
            active_products_count: m.active_products_count // Extra info
        }));

        return { data: mappedData, count: count || 0 };
    },

    async exportMembersCSV(memberAreaId: string) {
        const { data, error } = await supabase.from('admin_members_view').select('*');
        if (error) throw error;

        const csvContent = [
            ['ID', 'Nome', 'Email', 'Status', 'Entrou em', 'Pedidos', 'Produtos Ativos'],
            ...data.map((m: any) => [
                m.user_id,
                m.full_name,
                m.email,
                m.status,
                m.joined_at,
                m.orders_count,
                m.active_products_count
            ])
        ].map(e => e.join(',')).join('\n');

        return csvContent;
    },

    async getMemberDetails(userId: string) {
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (profileError) throw profileError;

        // Fetch related data in parallel
        const [accessGrants, notes, tags, logs, orders] = await Promise.all([
            this.getMemberAccess(userId),
            this.getMemberNotes(userId),
            this.getMemberTags(userId),
            this.getMemberActivityLogs(userId),
            this.getMemberOrders(userId),
        ]);

        return {
            profile: profile as Profile,
            accessGrants,
            notes,
            tags,
            logs,
            orders
        };
    },

    async getMemberAccess(userId: string) {
        const { data, error } = await supabase
            .from('access_grants')
            .select('*, product:products(*), content:contents(*)')
            .eq('user_id', userId);

        if (error) throw error;
        return data; // Typed as partial AccessGrant[]
    },

    async getMemberNotes(userId: string) {
        const { data, error } = await supabase
            .from('member_notes')
            .select('*, author:profiles(full_name, email)')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data as MemberNote[];
    },

    async addMemberNote(userId: string, content: string) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { error } = await supabase
            .from('member_notes')
            .insert({
                user_id: userId,
                author_id: user.id,
                content
            });

        if (error) throw error;
    },

    async getMemberTags(userId: string) {
        const { data, error } = await supabase
            .from('member_tags')
            .select('*')
            .eq('user_id', userId);

        if (error) throw error;
        return data as MemberTag[];
    },

    async addMemberTag(userId: string, tag: string) {
        const { error } = await supabase
            .from('member_tags')
            .insert({ user_id: userId, tag });

        if (error) throw error;
    },

    async removeMemberTag(userId: string, tag: string) {
        const { error } = await supabase
            .from('member_tags')
            .delete()
            .match({ user_id: userId, tag });

        if (error) throw error;
    },

    async getMemberActivityLogs(userId: string) {
        const { data, error } = await supabase
            .from('activity_logs')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) throw error;
        return data as ActivityLog[];
    },

    async getMemberOrders(userId: string) {
        const { data, error } = await supabase
            .from('orders')
            .select('*')
            .eq('customer_user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    },

    // Actions
    async updateMemberStatus(userId: string, status: 'active' | 'suspended' | 'disabled') {
        const action = status === 'suspended' ? 'suspend' : status === 'active' ? 'activate' : 'disable';

        const response = await fetch('/api/admin/members', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, userId })
        });

        if (!response.ok) throw new Error(await response.text());
    },

    async grantAccess(userId: string, productIds: string[]) {
        // This assumes product-based access
        const grants = productIds.map(pid => ({
            user_id: userId,
            product_id: pid,
            status: 'active',
            granted_at: new Date().toISOString()
        }));

        // Start of a "transaction" via RPC if possible, or just sequential inserts
        // We use upsert to avoid duplicates
        const { error } = await supabase
            .from('access_grants')
            .upsert(grants, { onConflict: 'user_id, product_id' });

        if (error) throw error;
    },

    async revokeAccess(userId: string, productId: string) {
        const { error } = await supabase
            .from('access_grants')
            .update({ status: 'revoked' }) // Soft delete/revoke
            .match({ user_id: userId, product_id: productId });

        if (error) throw error;
    },

    async createMember(email: string, fullName: string, initialProductIds: string[] = []) {
        const response = await fetch('/api/admin/members', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'create',
                email,
                name: fullName,
                productIds: initialProductIds
            })
        });

        if (!response.ok) {
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.includes("text/html")) {
                throw new Error("Erro: API Admin não detectada. Se estiver local, use 'vercel dev' para habilitar as funções de backend.");
            }

            // Try to parse JSON error first
            try {
                const errorJson = await response.json();
                throw new Error(errorJson.error || errorJson.message || 'Erro desconhecido');
            } catch (e: any) {
                // If json parse fails (and not html), throw text or the parsing error
                if (e.message !== 'Erro desconhecido' && !e.message.includes('JSON')) throw e;
                throw new Error(await response.text() || 'Erro ao comunicar com servidor');
            }
        }

        return response.json();
    }
};
