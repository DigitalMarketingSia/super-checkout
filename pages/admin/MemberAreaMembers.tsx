import React, { useState, useEffect } from 'react';
import { memberService } from '../../services/memberService';
import { Member } from '../../types';
import { Card } from '../../components/ui/Card';
import { Search, User, Mail, Calendar, Shield, MoreVertical, Filter, Download, Plus, PlayCircle, Eye, RefreshCw, Slash, Lock } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import { MemberDetailsModal } from '../../components/admin/members/MemberDetailsModal';
import { AddMemberModal } from '../../components/admin/members/AddMemberModal';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MemberAreaMembersProps {
    memberAreaId: string;
}

export const MemberAreaMembers: React.FC<MemberAreaMembersProps> = ({ memberAreaId }) => {
    const [members, setMembers] = useState<any[]>([]); // Using any for enriched member object
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [typeFilter, setTypeFilter] = useState<'all' | 'free' | 'paid'>('all');
    const [selectedMember, setSelectedMember] = useState<any | null>(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);

    useEffect(() => {
        loadMembers();
    }, [memberAreaId, searchQuery, statusFilter, typeFilter]);

    const loadMembers = async () => {
        setLoading(true);
        try {
            const { data } = await memberService.getMembersByArea(memberAreaId, 1, 100, searchQuery, statusFilter, typeFilter);
            setMembers(data);
        } catch (error) {
            console.error('Error loading members:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleExportCSV = async () => {
        try {
            const csv = await memberService.exportMembersCSV(memberAreaId);
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `members-${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
        } catch (error) {
            console.error('Error exporting CSV:', error);
            alert('Erro ao exportar CSV');
        }
    };

    return (
        <div className="animate-in fade-in duration-500 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Gerenciar Membros</h2>
                    <p className="text-gray-500 text-sm mt-1">Acompanhe seus alunos, assinaturas e acessos.</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleExportCSV}
                        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/10 transition-colors"
                    >
                        <Download className="w-4 h-4" />
                        Exportar CSV
                    </button>
                    <button
                        onClick={() => setIsAddMemberOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-primary/25"
                    >
                        <Plus className="w-4 h-4" />
                        Adicionar Membro
                    </button>
                </div>
            </div>

            <Card className="p-1">

                {/* Filters Toolbar */}
                <div className="p-4 border-b border-gray-100 dark:border-white/5 flex flex-col sm:flex-row gap-4 justify-between">
                    <div className="flex items-center gap-2">
                        {/* Type Filter Tabs */}
                        <div className="flex p-1 bg-gray-100 dark:bg-black/40 rounded-lg">
                            <button
                                onClick={() => setTypeFilter('all')}
                                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${typeFilter === 'all' ? 'bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-300'}`}
                            >
                                Todos
                            </button>
                            <button
                                onClick={() => setTypeFilter('free')}
                                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${typeFilter === 'free' ? 'bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-300'}`}
                            >
                                Gratuito
                            </button>
                            <button
                                onClick={() => setTypeFilter('paid')}
                                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${typeFilter === 'paid' ? 'bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-300'}`}
                            >
                                Pago
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 flex-1 justify-end">
                        <div className="relative w-full max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Buscar por nome ou email..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-primary/50"
                            />
                        </div>
                        <div className="relative min-w-[180px]">
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="w-full appearance-none bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-white/10 rounded-lg pl-4 pr-10 py-2 text-sm text-gray-900 dark:text-gray-200 outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer shadow-sm"
                            >
                                <option value="" className="text-gray-900 dark:text-gray-200 bg-white dark:bg-[#1A1A1A]">Todos os Status</option>
                                <option value="active" className="text-gray-900 dark:text-gray-200 bg-white dark:bg-[#1A1A1A]">Ativo</option>
                                <option value="suspended" className="text-gray-900 dark:text-gray-200 bg-white dark:bg-[#1A1A1A]">Suspenso</option>
                                <option value="expired" className="text-gray-900 dark:text-gray-200 bg-white dark:bg-[#1A1A1A]">Expirado</option>
                            </select>
                            <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50/50 dark:bg-white/5 border-b border-gray-100 dark:border-white/5">
                                <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Aluno</th>
                                <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Entrou em</th>
                                <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                            {members.map((member) => (
                                <tr key={member.user_id} className="group hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center text-primary font-bold text-sm border border-white/10">
                                                {member.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="font-medium text-gray-900 dark:text-white">{member.name}</div>
                                                <div className="text-sm text-gray-500 flex items-center gap-1.5">
                                                    <Mail className="w-3 h-3" />
                                                    {member.email}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        {member.status === 'active' && (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100/50 text-green-700 dark:bg-green-500/10 dark:text-green-400 border border-green-200 dark:border-green-500/20">
                                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                                                Ativo
                                            </span>
                                        )}
                                        {member.status === 'suspended' && (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100/50 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-500/20">
                                                <Lock className="w-3 h-3" />
                                                Suspenso
                                            </span>
                                        )}
                                        {(member.status === 'expired' || member.status === 'revoked') && (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100/50 text-red-700 dark:bg-red-500/10 dark:text-red-400 border border-red-200 dark:border-red-500/20">
                                                <Slash className="w-3 h-3" />
                                                Sem acesso
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-4 text-sm text-gray-500">
                                        {member.joined_at ? format(new Date(member.joined_at), "d 'de' MMMM, yyyy", { locale: ptBR }) : '-'}
                                        <div className="text-xs text-gray-400 mt-0.5">
                                            Há {Math.floor((new Date().getTime() - new Date(member.joined_at).getTime()) / (1000 * 60 * 60 * 24))} dias
                                        </div>
                                    </td>
                                    <td className="p-4 text-right">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                title="Reenviar Acesso"
                                                className="p-2 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                            >
                                                <RefreshCw className="w-4 h-4" />
                                            </button>
                                            <button
                                                title="Ver Detalhes"
                                                onClick={() => {
                                                    setSelectedMember(member);
                                                    setIsDetailsOpen(true);
                                                }}
                                                className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {members.length === 0 && !loading && (
                                <tr>
                                    <td colSpan={4} className="p-8 text-center text-gray-500">
                                        <div className="flex flex-col items-center justify-center">
                                            <User className="w-12 h-12 text-gray-300 mb-3" />
                                            <p className="font-medium">Nenhum membro encontrado</p>
                                            <p className="text-sm mt-1">Tente ajustar os filtros ou adicione um novo membro.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer / Pagination (Simplified) */}
                <div className="p-4 border-t border-gray-100 dark:border-white/5 flex items-center justify-between text-sm text-gray-500">
                    <div>
                        Mostrando {members.length} resultados
                    </div>
                </div>
            </Card>

            {/* Member Details Modal */}
            <MemberDetailsModal
                isOpen={isDetailsOpen}
                onClose={() => {
                    setIsDetailsOpen(false);
                    setSelectedMember(null);
                }}
                member={selectedMember}
                onUpdate={loadMembers}
            />

            {/* Add Member Modal */}
            <AddMemberModal
                isOpen={isAddMemberOpen}
                onClose={() => setIsAddMemberOpen(false)}
                onSuccess={() => {
                    loadMembers();
                    setIsAddMemberOpen(false);
                }}
            />
        </div>
    );
};
