import React, { useState, useRef } from 'react';
import { storage } from '../../services/storageService';
import { MemberArea } from '../../types';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { AlertModal } from '../../components/ui/Modal';
import { Save, Upload, Palette, Layout as LayoutIcon, Globe, Link as LinkIcon, HelpCircle } from 'lucide-react';
import { SidebarBuilder } from '../../components/admin/SidebarBuilder';
import { LinksManager } from '../../components/admin/LinksManager';
import { FAQManager } from '../../components/admin/FAQManager';

interface MemberSettingsProps {
    area: MemberArea;
    onSave: (area: MemberArea) => Promise<void>;
    isNew: boolean;
}

export const MemberSettings: React.FC<MemberSettingsProps> = ({ area, onSave, isNew }) => {
    const [settings, setSettings] = useState<MemberArea>(area);
    const [saving, setSaving] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const faviconInputRef = useRef<HTMLInputElement>(null);
    const [alertState, setAlertState] = useState<{ isOpen: boolean; title: string; message: string; variant: 'success' | 'error' | 'info' }>({
        isOpen: false, title: '', message: '', variant: 'info'
    });

    const handleSaveClick = async () => {
        setSaving(true);
        try {
            await onSave(settings);
            setAlertState({ isOpen: true, title: 'Sucesso', message: 'Configurações salvas!', variant: 'success' });
        } catch (error) {
            setAlertState({ isOpen: true, title: 'Erro', message: 'Erro ao salvar.', variant: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            try {
                const areaId = settings.id || 'temp';
                const publicUrl = await storage.uploadMemberAreaLogo(file, areaId);
                setSettings({ ...settings, logo_url: publicUrl });
            } catch (error: any) {
                console.error('Upload error:', error);
                setAlertState({
                    isOpen: true,
                    title: 'Erro no Upload',
                    message: `Não foi possível fazer o upload da logo. Detalhes: ${error.message || 'Erro desconhecido'}`,
                    variant: 'error'
                });
            }
        }
    };

    const handleFaviconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            try {
                const areaId = settings.id || 'temp';
                const publicUrl = await storage.uploadMemberAreaFavicon(file, areaId);
                setSettings({ ...settings, favicon_url: publicUrl });
            } catch (error: any) {
                console.error('Upload error:', error);
                setAlertState({
                    isOpen: true,
                    title: 'Erro no Upload',
                    message: `Não foi possível fazer o upload do favicon. Detalhes: ${error.message || 'Erro desconhecido'}`,
                    variant: 'error'
                });
            }
        }
    };

    return (
        <div className="animate-in fade-in duration-500">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Aparência e Configurações</h2>
                    <p className="text-gray-500 text-sm mt-1">Personalize a identidade visual do seu portal.</p>
                </div>
                <Button onClick={handleSaveClick} isLoading={saving}>
                    <Save className="w-4 h-4" /> Salvar Alterações
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Visual Identity */}
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-primary/10 rounded-lg">
                                <LayoutIcon className="w-5 h-5 text-primary" />
                            </div>
                            <h3 className="font-bold text-gray-900 dark:text-white">Identidade Visual</h3>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Nome do Portal</label>
                                <input
                                    type="text"
                                    className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-primary/50"
                                    value={settings.name}
                                    onChange={e => setSettings({ ...settings, name: e.target.value })}
                                    placeholder="Ex: Academia do Jean"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Slug (URL)</label>
                                <div className="flex">
                                    <span className="inline-flex items-center px-4 rounded-l-xl border border-r-0 border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-white/5 text-gray-500 text-sm">
                                        /app/
                                    </span>
                                    <input
                                        type="text"
                                        className="flex-1 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-r-xl px-4 py-3 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-primary/50"
                                        value={settings.slug}
                                        onChange={e => setSettings({ ...settings, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                                        placeholder="academia-jean"
                                    />
                                </div>
                                <p className="text-xs text-gray-500 mt-1">Endereço de acesso ao portal.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Logo do Portal</label>
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-16 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
                                            {settings.logo_url ? (
                                                <img src={settings.logo_url} alt="Logo" className="w-full h-full object-contain" />
                                            ) : (
                                                <Upload className="w-6 h-6 text-gray-500" />
                                            )}
                                        </div>
                                        <div>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                id="logo-upload"
                                                onChange={handleLogoUpload}
                                            />
                                            <label
                                                htmlFor="logo-upload"
                                                className="cursor-pointer px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium text-white transition-colors inline-block"
                                            >
                                                Escolher Logo
                                            </label>
                                            <p className="text-xs text-gray-500 mt-2">Recomendado: 200x200px (PNG)</p>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Favicon</label>
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-16 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
                                            {settings.favicon_url ? (
                                                <img src={settings.favicon_url} alt="Favicon" className="w-8 h-8 object-contain" />
                                            ) : (
                                                <Globe className="w-6 h-6 text-gray-500" />
                                            )}
                                        </div>
                                        <div>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                id="favicon-upload"
                                                onChange={handleFaviconUpload}
                                            />
                                            <label
                                                htmlFor="favicon-upload"
                                                className="cursor-pointer px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium text-white transition-colors inline-block"
                                            >
                                                Escolher Favicon
                                            </label>
                                            <p className="text-xs text-gray-500 mt-2">Recomendado: 32x32px (ICO/PNG)</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </Card>

                    {/* Banner Settings */}
                    <Card>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-primary/10 rounded-lg">
                                <LayoutIcon className="w-5 h-5 text-primary" />
                            </div>
                            <h3 className="font-bold text-gray-900 dark:text-white">Banner do Topo (Vitrine)</h3>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Imagem do Banner</label>
                                <div className="flex items-center gap-4">
                                    <div className="w-full h-32 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden relative group">
                                        {settings.banner_url ? (
                                            <img src={settings.banner_url} alt="Banner" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="flex flex-col items-center justify-center text-gray-500">
                                                <Upload className="w-8 h-8 mb-2" />
                                                <span className="text-xs">Nenhuma imagem</span>
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <label
                                                htmlFor="banner-upload"
                                                className="cursor-pointer px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium text-white transition-colors backdrop-blur-sm"
                                            >
                                                Alterar Imagem
                                            </label>
                                        </div>
                                    </div>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        id="banner-upload"
                                        onChange={async (e) => {
                                            if (e.target.files && e.target.files[0]) {
                                                const file = e.target.files[0];
                                                try {
                                                    const areaId = settings.id || 'temp';
                                                    const publicUrl = await storage.uploadMemberAreaBanner(file, areaId);
                                                    setSettings({ ...settings, banner_url: publicUrl });
                                                } catch (error: any) {
                                                    console.error('Upload error:', error);
                                                    setAlertState({
                                                        isOpen: true,
                                                        title: 'Erro no Upload',
                                                        message: `Não foi possível fazer o upload do banner. Detalhes: ${error.message || 'Erro desconhecido'}`,
                                                        variant: 'error'
                                                    });
                                                }
                                            }
                                        }}
                                    />
                                </div>
                                <p className="text-xs text-gray-500 mt-2">Recomendado: 1920x600px (PNG/JPG). Esta imagem aparecerá no topo da área de membros.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Título do Banner</label>
                                    <input
                                        type="text"
                                        className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-primary/50"
                                        value={settings.banner_title || ''}
                                        onChange={e => setSettings({ ...settings, banner_title: e.target.value })}
                                        placeholder="Ex: Bem-vindo à Comunidade"
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Descrição do Banner</label>
                                    <textarea
                                        className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-primary/50 min-h-[100px]"
                                        value={settings.banner_description || ''}
                                        onChange={e => setSettings({ ...settings, banner_description: e.target.value })}
                                        placeholder="Ex: Aprenda tudo sobre marketing digital com nossos cursos exclusivos."
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Texto do Botão</label>
                                    <input
                                        type="text"
                                        className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-primary/50"
                                        value={settings.banner_button_text || ''}
                                        onChange={e => setSettings({ ...settings, banner_button_text: e.target.value })}
                                        placeholder="Ex: Começar Agora"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Link do Botão</label>
                                    <input
                                        type="text"
                                        className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-primary/50"
                                        value={settings.banner_button_link || ''}
                                        onChange={e => setSettings({ ...settings, banner_button_link: e.target.value })}
                                        placeholder="Ex: /curso/123 ou https://..."
                                    />
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* Menu Settings */}
                    <Card>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-primary/10 rounded-lg">
                                <LinkIcon className="w-5 h-5 text-primary" />
                            </div>
                            <h3 className="font-bold text-gray-900 dark:text-white">Links do Menu</h3>
                        </div>

                        <p className="text-sm text-gray-500 mb-6">
                            Adicione links externos que aparecerão no menu dropdown "Links".
                        </p>

                        <LinksManager
                            links={settings.custom_links || []}
                            onChange={(links) => setSettings({ ...settings, custom_links: links })}
                        />
                    </Card>

                    {/* FAQ Settings */}
                    <Card>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-primary/10 rounded-lg">
                                <HelpCircle className="w-5 h-5 text-primary" />
                            </div>
                            <h3 className="font-bold text-gray-900 dark:text-white">FAQ (Perguntas Frequentes)</h3>
                        </div>

                        <p className="text-sm text-gray-500 mb-6">
                            Gerencie as perguntas e respostas que aparecerão na página de FAQ.
                        </p>

                        <FAQManager
                            faqs={settings.faqs || []}
                            onChange={(faqs) => setSettings({ ...settings, faqs: faqs })}
                        />
                    </Card>
                </div>

                {/* Right Column: Colors */}
                <div className="lg:col-span-1 space-y-6">
                    <Card>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-primary/10 rounded-lg">
                                <Palette className="w-5 h-5 text-primary" />
                            </div>
                            <h3 className="font-bold text-gray-900 dark:text-white">Cores</h3>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Cor Primária</label>
                            <div className="flex items-center gap-3">
                                <div className="relative w-14 h-14 rounded-xl overflow-hidden border border-white/20 shadow-sm shrink-0">
                                    <div
                                        className="absolute inset-0"
                                        style={{ backgroundColor: settings.primary_color }}
                                    />
                                    <input
                                        type="color"
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        value={settings.primary_color}
                                        onChange={e => setSettings({ ...settings, primary_color: e.target.value })}
                                    />
                                </div>
                                <input
                                    type="text"
                                    className="flex-1 min-w-0 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-3 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-primary/50 uppercase"
                                    value={settings.primary_color}
                                    onChange={e => setSettings({ ...settings, primary_color: e.target.value })}
                                />
                            </div>
                            <p className="text-xs text-gray-500 mt-2">Usada em botões, links e destaques.</p>
                        </div>
                    </Card>

                    <Card>
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">Preview</h3>
                        <div className="aspect-[9/16] bg-[#05050A] rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden relative shadow-2xl">
                            {/* Mockup of Mobile View */}
                            <div className="absolute top-0 left-0 right-0 h-14 border-b border-white/5 flex items-center justify-between px-4" style={{ backgroundColor: '#0A0A12' }}>
                                <div className="w-8 h-8 rounded bg-white/10 overflow-hidden">
                                    {settings.logo_url && <img src={settings.logo_url} className="w-full h-full object-cover" />}
                                </div>
                                <div className="w-8 h-8 rounded-full bg-white/10"></div>
                            </div>
                            <div className="p-4 mt-14 space-y-4">
                                <div className="h-32 rounded-xl bg-gradient-to-br from-gray-800 to-black border border-white/5 relative overflow-hidden">
                                    <div className="absolute inset-0 opacity-30" style={{ backgroundColor: settings.primary_color }}></div>
                                    <div className="absolute bottom-3 left-3 font-bold text-white">Curso Exemplo</div>
                                </div>
                                <div className="h-32 rounded-xl bg-gradient-to-br from-gray-800 to-black border border-white/5"></div>
                            </div>
                        </div>
                        <p className="text-center text-xs text-gray-500 mt-4">Visualização simplificada</p>
                    </Card>
                </div>
            </div >

            <AlertModal
                isOpen={alertState.isOpen}
                onClose={() => setAlertState({ ...alertState, isOpen: false })}
                title={alertState.title}
                message={alertState.message}
                variant={alertState.variant}
            />
        </div >
    );
};
