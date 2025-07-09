/**
 * Layout Component
 * 
 * Layout principal da aplicação que fornece a estrutura base com sidebar navegacional
 * e header superior. Utiliza o sistema de sidebar do shadcn/ui com suporte a collapse.
 * 
 * @component Layout
 * @description Componente de layout principal que envolve todas as páginas protegidas
 * da aplicação, fornecendo navegação consistente e responsiva.
 * 
 * Features:
 * - Sidebar colapsável com navegação principal
 * - Header superior com controles de tema e usuário
 * - Design responsivo que se adapta a diferentes tamanhos de tela
 * - Suporte completo a tema dark/light
 * 
 * @param {LayoutProps} props - Props do componente
 * @param {ReactNode} props.children - Conteúdo a ser renderizado dentro do layout
 * 
 * @returns {JSX.Element} Estrutura de layout completa da aplicação
 */

import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BarChart3, Package, CreditCard, Home, Settings, TrendingUp, Globe, Zap, ChevronLeft, ChevronRight } from 'lucide-react';
import { TopHeader } from './TopHeader';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from '@/components/ui/sidebar';

interface LayoutProps {
  children: ReactNode;
}

/**
 * AppSidebar Component
 * 
 * Componente de navegação lateral que renderiza os links principais da aplicação.
 * Suporta estado collapsed/expanded e destaque da rota ativa.
 * 
 * @returns {JSX.Element} Sidebar com navegação principal
 */
const AppSidebar = () => {
  const location = useLocation();
  const { state } = useSidebar();
  
  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: Home },
    { path: '/products', label: 'Produtos', icon: Package },
    { path: '/checkouts', label: 'Checkouts', icon: CreditCard },
    { path: '/gateways', label: 'Gateways', icon: Zap },
    { path: '/domain', label: 'Domínio', icon: Globe },
    { path: '/relatorios', label: 'Relatórios', icon: BarChart3 },
    { path: '/settings', label: 'Configurações', icon: Settings },
  ];

  const isActive = (path: string) => location.pathname === path;
  const isCollapsed = state === 'collapsed';

  return (
    <Sidebar className="bg-slate-50 dark:bg-gray-950 border-r border-slate-200 dark:border-gray-800" collapsible="icon">
      <SidebarHeader className={`p-6 ${isCollapsed ? 'px-2 py-4' : ''}`}>
        <div className={`flex items-center ${isCollapsed ? 'flex-col space-y-1' : 'space-x-2'}`}>
          <div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          {!isCollapsed && (
            <div className="text-xl font-bold text-gray-900 dark:text-white">Super Checkout</div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className={`flex-1 py-6 ${isCollapsed ? 'px-2' : 'px-4'}`}>
        <SidebarMenu className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            
            return (
              <SidebarMenuItem key={item.path}>
                <SidebarMenuButton asChild isActive={active} tooltip={isCollapsed ? item.label : undefined}>
                  <Link
                    to={item.path}
                    className={`relative flex transition-all duration-200 group ${
                      isCollapsed 
                        ? 'flex-col items-center justify-center px-2 py-3 text-xs' 
                        : 'items-center px-4 py-3 text-sm'
                    } rounded-lg font-medium ${
                      active
                        ? 'bg-violet-600/10 text-violet-400'
                        : 'text-slate-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-gray-800 hover:text-slate-800 dark:hover:text-gray-200'
                    }`}
                  >
                    {active && !isCollapsed && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-violet-400 rounded-r-full" />
                    )}
                    <Icon className={`${
                      isCollapsed 
                        ? 'h-6 w-6 mb-1' 
                        : 'mr-3 h-5 w-5'
                    } ${active ? 'text-violet-400' : 'text-slate-500 dark:text-gray-500 group-hover:text-slate-800 dark:group-hover:text-gray-300'}`} />
                    {isCollapsed ? (
                      <span className={`${active ? 'text-violet-400' : 'text-slate-500 dark:text-gray-500 group-hover:text-slate-800 dark:group-hover:text-gray-300'} leading-tight`}>
                        {item.label}
                      </span>
                    ) : (
                      item.label
                    )}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  );
};

/**
 * CollapseTrigger Component
 * 
 * Botão flutuante para controlar o estado collapsed/expanded da sidebar.
 * Posicionado de forma absoluta na borda direita da sidebar.
 * 
 * @returns {JSX.Element} Botão de toggle da sidebar
 */
const CollapseTrigger = () => {
  const { toggleSidebar, state } = useSidebar();
  const isCollapsed = state === 'collapsed';

  return (
    <button
      onClick={toggleSidebar}
      className="absolute right-0 top-4 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 text-slate-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-gray-700 hover:text-slate-800 dark:hover:text-gray-200 transition-colors"
      style={{ transform: 'translateX(50%)' }}
    >
      {isCollapsed ? (
        <ChevronRight className="h-4 w-4" />
      ) : (
        <ChevronLeft className="h-4 w-4" />
      )}
    </button>
  );
};

export const Layout = ({ children }: LayoutProps) => {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen bg-slate-50 dark:bg-gray-950 flex w-full">
        <div className="relative">
          <AppSidebar />
          <CollapseTrigger />
        </div>
        
        <SidebarInset className="flex-1">
          <TopHeader />
          <main className="px-8 pt-6 pb-8 bg-slate-50 dark:bg-gray-950">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};