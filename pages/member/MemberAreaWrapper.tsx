import React, { useState, useEffect } from 'react';
import { Outlet, useParams, useNavigate } from 'react-router-dom';
import { MemberAreaLayout } from './MemberAreaLayout';
import { storage } from '../../services/storageService';
import { MemberArea } from '../../types';
import { Loader2 } from 'lucide-react';

export const MemberAreaWrapper: React.FC = () => {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();
    const [memberArea, setMemberArea] = useState<MemberArea | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadMemberArea = async () => {
            if (!slug) return;
            try {
                const area = await storage.getMemberAreaBySlug(slug);
                if (area) {
                    setMemberArea(area);
                } else {
                    console.error('Member Area not found');
                    navigate('/app'); // Redirect if not found
                }
            } catch (error) {
                console.error('Error loading member area:', error);
            } finally {
                setLoading(false);
            }
        };

        loadMemberArea();
    }, [slug, navigate]);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0E1012] flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-red-600" />
            </div>
        );
    }

    return (
        <MemberAreaLayout memberArea={memberArea}>
            <Outlet context={{ memberArea }} />
        </MemberAreaLayout>
    );
};
