import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, ShoppingBag, Package, User, Search, Menu, ChevronLeft, BookOpen } from 'lucide-react';

interface IconSidebarProps {
    onToggleMenu: () => void;
    isMenuOpen: boolean;
    memberAreaSlug?: string;
    primaryColor?: string;
}

interface IconButtonProps {
    icon: React.ElementType;
    label: string;
    to?: string;
    onClick?: () => void;
    isActive?: boolean;
    disabled?: boolean;
    color?: string;
}

const IconButton: React.FC<IconButtonProps> = ({ icon: Icon, label, to, onClick, isActive, disabled, color }) => {
    const content = (
        <div className="relative group">
            <button
                onClick={onClick}
                disabled={disabled}
                className={`
                    w-12 h-12 rounded-xl flex items-center justify-center
                    transition-all duration-200
                    ${isActive
                        ? 'bg-white/10 text-white shadow-lg'
                        : disabled
                            ? 'text-gray-600 cursor-not-allowed'
                            : 'text-gray-400 hover:text-white hover:bg-white/10'
                    }
                `}
                style={isActive && color ? { backgroundColor: `${color}20`, color: color, borderColor: color, border: '1px solid' } : { color: color }}
            >
                <Icon className="w-5 h-5" />
            </button>

            {/* Tooltip */}
            <div className="absolute left-full ml-4 px-3 py-2 bg-gray-800 text-white text-sm rounded-lg
                          opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap
                          shadow-xl border border-white/10 z-50">
                {label}
                <div className="absolute right-full top-1/2 -translate-y-1/2 border-8 border-transparent border-r-gray-800"></div>
            </div>
        </div>
    );

    if (to && !disabled) {
        return <Link to={to}>{content}</Link>;
    }

    return content;
};

export const IconSidebar: React.FC<IconSidebarProps> = ({ onToggleMenu, isMenuOpen, memberAreaSlug, primaryColor }) => {
    const location = useLocation();

    // Detect if we're on a custom domain
    const isCustomDomain = typeof window !== 'undefined' &&
        !window.location.hostname.includes('vercel.app') &&
        !window.location.hostname.includes('localhost') &&
        !window.location.pathname.startsWith('/app/');

    const appLink = isCustomDomain ? '' : (memberAreaSlug ? `/app/${memberAreaSlug}` : '/app');

    const isActive = (path: string) => {
        if (isCustomDomain) {
            return location.pathname === path;
        }
        return location.pathname.startsWith(`${appLink}${path}`);
    };

    return (
        <div className="fixed left-0 top-0 h-screen w-16 bg-[#0E1012] border-r border-white/10 flex flex-col items-center py-6 gap-3 z-[100]">
            {/* Menu Toggle */}
            <IconButton
                icon={isMenuOpen ? ChevronLeft : BookOpen}
                label={isMenuOpen ? 'Fechar Menu' : 'Abrir Menu'}
                onClick={onToggleMenu}
                isActive={isMenuOpen}
                color={primaryColor}
            />

            <div className="w-8 h-px bg-white/10 my-2"></div>

            {/* Home */}
            <IconButton
                icon={Home}
                label="Início"
                to={`${appLink}/`}
                isActive={isActive('/')}
            />

            {/* Vitrine (Products for Sale) */}
            <IconButton
                icon={ShoppingBag}
                label="Vitrine"
                to={`${appLink}/products`}
                isActive={isActive('/products')}
            />

            {/* My Products */}
            <IconButton
                icon={Package}
                label="Meus Produtos"
                to={`${appLink}/my-products`}
                isActive={isActive('/my-products')}
            />

            <div className="flex-1"></div>

            {/* Profile */}
            <IconButton
                icon={User}
                label="Perfil"
                to={`${appLink}/profile`}
                isActive={isActive('/profile')}
            />
        </div>
    );
};
