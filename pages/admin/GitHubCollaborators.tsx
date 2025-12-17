import React, { useState } from 'react';
import { UserPlus, UserMinus, Users, AlertCircle } from 'lucide-react';

export default function GitHubCollaborators() {
    const [githubUsername, setGithubUsername] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState<'success' | 'error'>('success');
    const [collaborators, setCollaborators] = useState<any[]>([]);

    const adminToken = localStorage.getItem('admin_token') || '';

    const showMessage = (msg: string, type: 'success' | 'error') => {
        setMessage(msg);
        setMessageType(type);
        setTimeout(() => setMessage(''), 5000);
    };

    const addCollaborator = async () => {
        if (!githubUsername.trim()) {
            showMessage('Digite um username do GitHub', 'error');
            return;
        }

        setIsLoading(true);
        try {
            const res = await fetch('/api/admin/github-collaborators', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${adminToken}`
                },
                body: JSON.stringify({
                    action: 'add_collaborator',
                    githubUsername: githubUsername.trim()
                })
            });

            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Erro ao adicionar colaborador');

            showMessage(`✅ ${githubUsername} adicionado como colaborador!`, 'success');
            setGithubUsername('');
            loadCollaborators();
        } catch (error: any) {
            showMessage(`❌ ${error.message}`, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const removeCollaborator = async (username: string) => {
        if (!confirm(`Remover ${username} como colaborador?`)) return;

        setIsLoading(true);
        try {
            const res = await fetch('/api/admin/github-collaborators', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${adminToken}`
                },
                body: JSON.stringify({
                    action: 'remove_collaborator',
                    githubUsername: username
                })
            });

            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Erro ao remover colaborador');

            showMessage(`✅ ${username} removido!`, 'success');
            loadCollaborators();
        } catch (error: any) {
            showMessage(`❌ ${error.message}`, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const loadCollaborators = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/admin/github-collaborators', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${adminToken}`
                },
                body: JSON.stringify({
                    action: 'list_collaborators'
                })
            });

            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Erro ao listar colaboradores');

            setCollaborators(data.collaborators || []);
        } catch (error: any) {
            showMessage(`❌ ${error.message}`, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    React.useEffect(() => {
        loadCollaborators();
    }, []);

    return (
        <div className="max-w-4xl mx-auto p-6">
            <div className="bg-white rounded-lg shadow-lg p-6">
                <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
                    <Users className="w-6 h-6" />
                    Gerenciar Colaboradores GitHub
                </h1>

                {message && (
                    <div className={`mb-4 p-4 rounded-lg ${messageType === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                        {message}
                    </div>
                )}

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <div className="flex gap-2 items-start">
                        <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                        <div className="text-sm text-blue-800">
                            <p className="font-bold mb-1">Como funciona:</p>
                            <ol className="list-decimal list-inside space-y-1">
                                <li>Cliente compra licença e te envia username do GitHub</li>
                                <li>Você adiciona ele aqui como colaborador</li>
                                <li>Cliente usa o instalador normalmente</li>
                                <li>Após fork, você remove ele da lista</li>
                            </ol>
                        </div>
                    </div>
                </div>

                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Adicionar Colaborador
                    </label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={githubUsername}
                            onChange={(e) => setGithubUsername(e.target.value)}
                            placeholder="username-do-github"
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            onKeyPress={(e) => e.key === 'Enter' && addCollaborator()}
                        />
                        <button
                            onClick={addCollaborator}
                            disabled={isLoading}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                        >
                            <UserPlus className="w-4 h-4" />
                            Adicionar
                        </button>
                    </div>
                </div>

                <div>
                    <h2 className="text-lg font-semibold mb-4">Colaboradores Atuais</h2>
                    {collaborators.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">Nenhum colaborador adicionado</p>
                    ) : (
                        <div className="space-y-2">
                            {collaborators.map((collab) => (
                                <div key={collab.username} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                    <div>
                                        <p className="font-medium">{collab.username}</p>
                                        <p className="text-sm text-gray-500">Permissão: {collab.permissions?.pull ? 'Leitura' : 'N/A'}</p>
                                    </div>
                                    <button
                                        onClick={() => removeCollaborator(collab.username)}
                                        disabled={isLoading}
                                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
                                    >
                                        <UserMinus className="w-4 h-4" />
                                        Remover
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
