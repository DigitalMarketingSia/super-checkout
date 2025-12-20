import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { storage } from '../../services/storageService';
import { supabase } from '../../services/supabase';

export const AuthDebug = () => {
    const { user: authUser, session: authSession, loading: authLoading } = useAuth();
    const [storageUser, setStorageUser] = useState<any>(null);
    const [products, setProducts] = useState<any[]>([]);
    const [productsError, setProductsError] = useState<string | null>(null);
    const [rawSession, setRawSession] = useState<any>(null);

    useEffect(() => {
        const check = async () => {
            const sUser = await storage.getUser();
            setStorageUser(sUser);

            const sess = await supabase.auth.getSession();
            setRawSession(sess);

            try {
                const prods = await storage.getProducts();
                setProducts(prods);
            } catch (e: any) {
                setProductsError(e.message);
            }
        };
        check();
    }, [authUser]);

    return (
        <div className="min-h-screen bg-black text-white p-8 font-mono text-sm overflow-auto">
            <h1 className="text-2xl text-red-500 font-bold mb-4">SYSTEM DIAGNOSTIC</h1>

            <div className="grid grid-cols-2 gap-4">
                <div className="border border-gray-800 p-4 rounded">
                    <h2 className="text-blue-400 font-bold mb-2">AuthContext State</h2>
                    <pre>{JSON.stringify({ authLoading, userId: authUser?.id, hasSession: !!authSession }, null, 2)}</pre>
                </div>

                <div className="border border-gray-800 p-4 rounded">
                    <h2 className="text-yellow-400 font-bold mb-2">StorageService State</h2>
                    <pre>{JSON.stringify({ storageUser: storageUser?.id }, null, 2)}</pre>
                </div>

                <div className="border border-gray-800 p-4 rounded col-span-2">
                    <h2 className="text-green-400 font-bold mb-2">Supabase Raw Session</h2>
                    <pre className="whitespace-pre-wrap word-break">{JSON.stringify(rawSession, null, 2)}</pre>
                </div>

                <div className="border border-gray-800 p-4 rounded col-span-2">
                    <h2 className="text-purple-400 font-bold mb-2">Products Query Result</h2>
                    {productsError && <div className="text-red-500">Error: {productsError}</div>}
                    <div className="text-gray-400">Count: {products.length}</div>
                    <pre>{JSON.stringify(products.slice(0, 2), null, 2)}</pre>
                </div>
            </div>
        </div>
    );
};
