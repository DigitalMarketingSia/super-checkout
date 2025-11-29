import React, { useState, useEffect } from 'react';
import { storage } from '../../services/storageService';
import { Member } from '../../types';
import { Card } from '../../components/ui/Card';
import { Search, User, Mail, Calendar, Shield } from 'lucide-react';

interface MemberAreaMembersProps {
    memberAreaId: string;
}

export const MemberAreaMembers: React.FC<MemberAreaMembersProps> = ({ memberAreaId }) => {
    const [members, setMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        loadMembers();
    }, [memberAreaId]);

    const loadMembers = async () => {
        setLoading(true);
        try {
            const data = await storage.getMemberAreaMembers(memberAreaId);
            setMembers(data);
        } catch (error) {
            console.error('Error loading members:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredMembers = members.filter(member =>
        member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Membros</h2>
                    <p className="text-gray-500 text-sm mt-1">Gerencie os alunos que possuem acesso a este portal.</p>
                </div>
            </div>

            {/* Search Bar */}
            <div className="mb-6">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                        type="text"
                        placeholder="Buscar por nome ou email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3.5 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all placeholder:text-gray-500"
                    />
                </div>
            </div>

            {loading ? (
                <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-20 bg-white/5 rounded-xl animate-pulse" />
                    ))}
                </div>
            ) : filteredMembers.length === 0 ? (
                <Card className="text-center py-20 border-dashed border-white/10 bg-white/5">
                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                        <User className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">Nenhum membro encontrado</h3>
                    <p className="text-gray-500 text-sm mt-2">Os alunos aparecerão aqui assim que ganharem acesso.</p>
                </Card>
            ) : (
                <div className="bg-white dark:bg-[#0A0A12] rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5">
                                    <th className="p-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Aluno</th>
                                    <th className="p-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                    <th className="p-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Entrou em</th>
                                    <th className="p-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-white/10">
                                {filteredMembers.map((member) => (
                                    <tr key={member.user_id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                                                    {member.name.charAt(0).toUpperCase()}
                                                </div>
                                                <span className="font-medium text-gray-900 dark:text-white">{member.name}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-sm text-gray-500">
                                            <div className="flex items-center gap-2">
                                                <Mail className="w-3 h-3" />
                                                {member.email}
                                            </div>
                                        </td>
                                        <td className="p-4 text-sm text-gray-500">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="w-3 h-3" />
                                                {new Date(member.joined_at).toLocaleDateString()}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${member.status === 'active'
                                                    ? 'bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-400'
                                                    : 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-400'
                                                }`}>
                                                {member.status === 'active' ? 'Ativo' : 'Inativo'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};
