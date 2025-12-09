import React, { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Tabs from '@radix-ui/react-tabs';
import { X, User, ShoppingBag, Clock, FileText, Activity, Shield, Mail, Calendar, Key, Ban, ExternalLink, Plus, Trash2, Tag, Save } from 'lucide-react';
import { memberService } from '../../../services/memberService';
import { Profile, ActivityLog, MemberNote, MemberTag } from '../../../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MemberDetailsModalProps {
    member: any; // Using enriched member type
    isOpen: boolean;
    onClose: () => void;
    onUpdate?: () => void;
}

export const MemberDetailsModal: React.FC<MemberDetailsModalProps> = ({ member, isOpen, onClose, onUpdate }) => {
    const [activeTab, setActiveTab] = useState('overview');
    const [details, setDetails] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [newNote, setNewNote] = useState('');
    const [newTag, setNewTag] = useState('');
    const [addingTag, setAddingTag] = useState(false);

    useEffect(() => {
        if (isOpen && member) {
            loadDetails();
        }
    }, [isOpen, member]);

    const loadDetails = async () => {
        setLoading(true);
        try {
            const data = await memberService.getMemberDetails(member.user_id);
            setDetails(data);
        } catch (error) {
            console.error('Error loading member details:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddNote = async () => {
        if (!newNote.trim()) return;
        try {
            await memberService.addMemberNote(member.user_id, newNote);
            setNewNote('');
            loadDetails(); // Reload to show new note
        } catch (error) {
            console.error('Error adding note:', error);
        }
    };

    const handleAddTag = async () => {
        if (!newTag.trim()) return;
        try {
            await memberService.addMemberTag(member.user_id, newTag);
            setNewTag('');
            setAddingTag(false);
            loadDetails();
        } catch (error) {
            console.error('Error adding tag:', error);
        }
    };

    const handleRemoveTag = async (tag: string) => {
        try {
            await memberService.removeMemberTag(member.user_id, tag);
            loadDetails();
        } catch (error) {
            console.error('Error removing tag:', error);
        }
    };

    const handleAction = async (action: 'suspend' | 'activate' | 'email_reset' | 'email_welcome') => {
        // Implement action logic
        console.log('Action:', action);
        alert(`Ação ${action} solicitada (simulação)`);
    };

    if (!isOpen) return null;

    return (
        <Dialog.Root open={isOpen} onOpenChange={onClose}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 animate-in fade-in duration-200" />
                <Dialog.Content className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] w-full max-w-5xl h-[90vh] bg-white dark:bg-[#151520] rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden outline-none animate-in zoom-in-95 duration-200">

                    {/* Header */}
                    <div className="flex-none p-6 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/5 flex justify-between items-start">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-primary/20">
                                {member.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    {member.name}
                                    {details?.profile?.status === 'suspended' && (
                                        <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-medium border border-red-200">Suspenso</span>
                                    )}
                                </h2>
                                <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                                    <span className="flex items-center gap-1.5">
                                        <Mail className="w-4 h-4" />
                                        {member.email}
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                        <Calendar className="w-4 h-4" />
                                        Desde {member.joined_at ? format(new Date(member.joined_at), "d MMM, yyyy", { locale: ptBR }) : '-'}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors">
                            <X className="w-6 h-6 text-gray-500" />
                        </button>
                    </div>

                    {/* Tabs & Content */}
                    <Tabs.Root value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
                        <div className="px-6 border-b border-gray-100 dark:border-white/5 bg-white dark:bg-[#151520]">
                            <Tabs.List className="flex gap-6">
                                {[
                                    { id: 'overview', label: 'Visão Geral', icon: Activity },
                                    { id: 'products', label: 'Produtos e Acesso', icon: ShoppingBag },
                                    { id: 'orders', label: 'Histórico de Compras', icon: FileText },
                                    { id: 'history', label: 'Log de Atividades', icon: Clock },
                                    { id: 'notes', label: 'Notas Internas', icon: Tag },
                                ].map(tab => (
                                    <Tabs.Trigger
                                        key={tab.id}
                                        value={tab.id}
                                        className={`group flex items-center gap-2 py-4 text-sm font-medium border-b-2 transition-colors outline-none ${activeTab === tab.id
                                                ? 'border-primary text-primary'
                                                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                            }`}
                                    >
                                        <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-primary' : 'text-gray-400 group-hover:text-gray-500'}`} />
                                        {tab.label}
                                    </Tabs.Trigger>
                                ))}
                            </Tabs.List>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30 dark:bg-black/20">
                            {loading ? (
                                <div className="flex items-center justify-center h-full">
                                    <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                                </div>
                            ) : (
                                <>
                                    <Tabs.Content value="overview" className="space-y-6 outline-none animate-in fade-in slide-in-from-bottom-2 duration-300">
                                        {/* Quick Stats Grid */}
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div className="p-4 bg-white dark:bg-[#1A1A24] rounded-xl border border-gray-200 dark:border-white/5 shadow-sm">
                                                <div className="text-sm text-gray-500 mb-1">Total Gasto</div>
                                                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                                    {details?.orders ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(details.orders.reduce((acc: number, o: any) => acc + (o.amount || 0), 0)) : 'R$ 0,00'}
                                                </div>
                                            </div>
                                            <div className="p-4 bg-white dark:bg-[#1A1A24] rounded-xl border border-gray-200 dark:border-white/5 shadow-sm">
                                                <div className="text-sm text-gray-500 mb-1">Último Acesso</div>
                                                <div className="text-lg font-semibold text-gray-900 dark:text-white">
                                                    {details?.profile?.last_seen_at ? format(new Date(details.profile.last_seen_at), "dd/MM/yyyy HH:mm") : 'Nunca'}
                                                </div>
                                            </div>
                                            <div className="p-4 bg-white dark:bg-[#1A1A24] rounded-xl border border-gray-200 dark:border-white/5 shadow-sm">
                                                <div className="text-sm text-gray-500 mb-1">Produtos Ativos</div>
                                                <div className="text-2xl font-bold text-green-500">
                                                    {details?.accessGrants?.filter((g: any) => g.status === 'active').length || 0}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                            {/* Actions Column */}
                                            <div className="space-y-6">
                                                <div className="bg-white dark:bg-[#1A1A24] rounded-xl border border-gray-200 dark:border-white/5 p-5 shadow-sm">
                                                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-4">Ações Rápidas</h3>
                                                    <div className="space-y-2">
                                                        <button onClick={() => handleAction('email_reset')} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 rounded-lg border border-gray-200 dark:border-white/10 transition-colors">
                                                            <Key className="w-4 h-4 text-gray-400" />
                                                            Enviar Redefinição de Senha
                                                        </button>
                                                        <button onClick={() => handleAction('email_welcome')} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 rounded-lg border border-gray-200 dark:border-white/10 transition-colors">
                                                            <Mail className="w-4 h-4 text-gray-400" />
                                                            Reenviar Email de Boas-vindas
                                                        </button>
                                                        <hr className="border-gray-100 dark:border-white/5 my-2" />
                                                        {details?.profile?.status === 'suspended' ? (
                                                            <button onClick={() => handleAction('activate')} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800 transition-colors">
                                                                <Shield className="w-4 h-4" />
                                                                Reativar Acesso
                                                            </button>
                                                        ) : (
                                                            <button onClick={() => handleAction('suspend')} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800 transition-colors">
                                                                <Ban className="w-4 h-4" />
                                                                Suspender Acesso
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Tags */}
                                                <div className="bg-white dark:bg-[#1A1A24] rounded-xl border border-gray-200 dark:border-white/5 p-5 shadow-sm">
                                                    <div className="flex justify-between items-center mb-4">
                                                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Tags</h3>
                                                        <button onClick={() => setAddingTag(true)} className="text-xs text-primary hover:underline">+ Adicionar</button>
                                                    </div>

                                                    {addingTag && (
                                                        <div className="flex gap-2 mb-3">
                                                            <input
                                                                autoFocus
                                                                className="flex-1 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded px-2 py-1 text-xs"
                                                                placeholder="Nova tag..."
                                                                value={newTag}
                                                                onChange={e => setNewTag(e.target.value)}
                                                                onKeyDown={e => e.key === 'Enter' && handleAddTag()}
                                                            />
                                                            <button onClick={handleAddTag} className="p-1 bg-primary text-white rounded"><Save className="w-3 h-3" /></button>
                                                        </div>
                                                    )}

                                                    <div className="flex flex-wrap gap-2">
                                                        {details?.tags?.map((t: MemberTag) => (
                                                            <span key={t.id} className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 text-xs rounded-md group">
                                                                {t.tag}
                                                                <button onClick={() => handleRemoveTag(t.tag)} className="hidden group-hover:block ml-1 text-gray-400 hover:text-red-500">
                                                                    <X className="w-3 h-3" />
                                                                </button>
                                                            </span>
                                                        ))}
                                                        {(!details?.tags || details.tags.length === 0) && !addingTag && (
                                                            <span className="text-sm text-gray-500 italic">Nenhuma tag atribuída.</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Recent Activity Column */}
                                            <div className="lg:col-span-2 bg-white dark:bg-[#1A1A24] rounded-xl border border-gray-200 dark:border-white/5 p-5 shadow-sm">
                                                <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-4">Atividade Recente</h3>
                                                <div className="space-y-4">
                                                    {details?.logs?.slice(0, 5).map((log: ActivityLog) => (
                                                        <div key={log.id} className="flex gap-4 items-start">
                                                            <div className="mt-1 w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600 flex-shrink-0" />
                                                            <div>
                                                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                                    {log.event.replace('_', ' ')}
                                                                </div>
                                                                <div className="text-xs text-gray-500">
                                                                    {format(new Date(log.created_at), "d 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                                                                </div>
                                                                {log.metadata && Object.keys(log.metadata).length > 0 && (
                                                                    <pre className="mt-1 text-xs bg-gray-50 dark:bg-black/20 p-2 rounded text-gray-600 dark:text-gray-400 overflow-x-auto">
                                                                        {JSON.stringify(log.metadata, null, 2)}
                                                                    </pre>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                    {(!details?.logs || details.logs.length === 0) && (
                                                        <div className="text-center py-8 text-gray-500">
                                                            Nenhuma atividade registrada.
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </Tabs.Content>

                                    <Tabs.Content value="products" className="space-y-4 outline-none animate-in fade-in slide-in-from-bottom-2 duration-300">
                                        <div className="bg-white dark:bg-[#1A1A24] rounded-xl border border-gray-200 dark:border-white/5 overflow-hidden">
                                            <table className="w-full text-left">
                                                <thead className="bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-white/5">
                                                    <tr>
                                                        <th className="p-4 text-xs font-semibold text-gray-500 uppercase">Produto</th>
                                                        <th className="p-4 text-xs font-semibold text-gray-500 uppercase">Status</th>
                                                        <th className="p-4 text-xs font-semibold text-gray-500 uppercase">Data Liberação</th>
                                                        <th className="p-4 text-xs font-semibold text-gray-500 uppercase">Expira em</th>
                                                        <th className="p-4 text-xs font-semibold text-gray-500 uppercase text-right">Ações</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                                    {details?.accessGrants?.map((grant: any) => (
                                                        <tr key={grant.id}>
                                                            <td className="p-4 font-medium text-gray-900 dark:text-white">
                                                                {grant.product?.name || grant.content?.title || 'Produto Desconhecido'}
                                                            </td>
                                                            <td className="p-4">
                                                                <span className={`px-2 py-1 rounded text-xs font-medium ${grant.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                                    {grant.status === 'active' ? 'Ativo' : 'Inativo'}
                                                                </span>
                                                            </td>
                                                            <td className="p-4 text-sm text-gray-500">
                                                                {format(new Date(grant.granted_at), "dd/MM/yyyy")}
                                                            </td>
                                                            <td className="p-4 text-sm text-gray-500">
                                                                {grant.expires_at ? format(new Date(grant.expires_at), "dd/MM/yyyy") : 'Vitalício'}
                                                            </td>
                                                            <td className="p-4 text-right">
                                                                <button className="text-red-500 hover:text-red-700 text-sm font-medium">Revogar</button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                            {(!details?.accessGrants || details.accessGrants.length === 0) && (
                                                <div className="p-8 text-center text-gray-500">Nenhum produto liberado para este usuário.</div>
                                            )}
                                        </div>
                                    </Tabs.Content>

                                    <Tabs.Content value="orders" className="space-y-4 outline-none animate-in fade-in slide-in-from-bottom-2 duration-300">
                                        <div className="bg-white dark:bg-[#1A1A24] rounded-xl border border-gray-200 dark:border-white/5 overflow-hidden">
                                            <table className="w-full text-left">
                                                <thead className="bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-white/5">
                                                    <tr>
                                                        <th className="p-4 text-xs font-semibold text-gray-500 uppercase">ID</th>
                                                        <th className="p-4 text-xs font-semibold text-gray-500 uppercase">Valor</th>
                                                        <th className="p-4 text-xs font-semibold text-gray-500 uppercase">Status</th>
                                                        <th className="p-4 text-xs font-semibold text-gray-500 uppercase">Data</th>
                                                        <th className="p-4 text-xs font-semibold text-gray-500 uppercase">Gateway</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                                    {details?.orders?.map((order: any) => (
                                                        <tr key={order.id}>
                                                            <td className="p-4 font-mono text-xs text-gray-500">{order.id.slice(0, 8)}...</td>
                                                            <td className="p-4 font-medium text-gray-900 dark:text-white">
                                                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.amount)}
                                                            </td>
                                                            <td className="p-4">
                                                                <span className={`px-2 py-1 rounded text-xs font-medium ${order.status === 'paid' ? 'bg-green-100 text-green-700' :
                                                                        order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                                                            'bg-red-100 text-red-700'
                                                                    }`}>
                                                                    {order.status}
                                                                </span>
                                                            </td>
                                                            <td className="p-4 text-sm text-gray-500">
                                                                {format(new Date(order.created_at), "dd/MM/yyyy HH:mm")}
                                                            </td>
                                                            <td className="p-4 text-sm text-gray-500">
                                                                {order.payment_method || '-'}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                            {(!details?.orders || details.orders.length === 0) && (
                                                <div className="p-8 text-center text-gray-500">Nenhuma compra encontrada para este usuário.</div>
                                            )}
                                        </div>
                                    </Tabs.Content>

                                    <Tabs.Content value="notes" className="space-y-6 outline-none animate-in fade-in slide-in-from-bottom-2 duration-300">
                                        <div className="bg-white dark:bg-[#1A1A24] rounded-xl border border-gray-200 dark:border-white/5 p-4">
                                            <textarea
                                                className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg p-3 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all resize-none"
                                                rows={3}
                                                placeholder="Adicionar nota interna sobre este aluno..."
                                                value={newNote}
                                                onChange={e => setNewNote(e.target.value)}
                                            />
                                            <div className="flex justify-end mt-2">
                                                <button
                                                    onClick={handleAddNote}
                                                    disabled={!newNote.trim()}
                                                    className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg disabled:opacity-50 hover:bg-primary/90 transition-colors"
                                                >
                                                    Adicionar Nota
                                                </button>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            {details?.notes?.map((note: MemberNote) => (
                                                <div key={note.id} className="bg-white dark:bg-[#1A1A24] rounded-xl border border-gray-200 dark:border-white/5 p-4 shadow-sm">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div className="font-medium text-gray-900 dark:text-white text-sm">
                                                            {note.author?.full_name || note.author?.email || 'Admin'}
                                                        </div>
                                                        <div className="text-xs text-gray-500">
                                                            {format(new Date(note.created_at), "d MMM, yyyy HH:mm", { locale: ptBR })}
                                                        </div>
                                                    </div>
                                                    <p className="text-gray-600 dark:text-gray-300 text-sm whitespace-pre-wrap">
                                                        {note.content}
                                                    </p>
                                                </div>
                                            ))}
                                            {(!details?.notes || details.notes.length === 0) && (
                                                <div className="text-center text-gray-500 py-8">
                                                    Nenhuma nota interna registrada.
                                                </div>
                                            )}
                                        </div>
                                    </Tabs.Content>

                                    <Tabs.Content value="history" className="outline-none animate-in fade-in slide-in-from-bottom-2 duration-300">
                                        <div className="bg-white dark:bg-[#1A1A24] rounded-xl border border-gray-200 dark:border-white/5 p-6 shadow-sm">
                                            <div className="relative border-l border-gray-200 dark:border-white/10 ml-3 space-y-8">
                                                {details?.logs?.map((log: ActivityLog) => (
                                                    <div key={log.id} className="relative pl-8">
                                                        <span className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-gray-300 dark:bg-gray-600 ring-4 ring-white dark:ring-[#1A1A24]" />
                                                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1">
                                                            <div>
                                                                <span className="text-sm font-medium text-gray-900 dark:text-white">
                                                                    {log.event}
                                                                </span>
                                                                {log.metadata && (
                                                                    <p className="text-xs text-gray-500 mt-0.5">
                                                                        {JSON.stringify(log.metadata)}
                                                                    </p>
                                                                )}
                                                            </div>
                                                            <span className="text-xs text-gray-400 whitespace-nowrap">
                                                                {format(new Date(log.created_at), "dd/MM/yyyy HH:mm")}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                                {(!details?.logs || details.logs.length === 0) && (
                                                    <div className="pl-6 text-gray-500">Sem histórico disponível.</div>
                                                )}
                                            </div>
                                        </div>
                                    </Tabs.Content>
                                </>
                            )}
                        </div>
                    </Tabs.Root>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
};
