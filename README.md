# Super Checkout

Uma plataforma completa de checkout para e-commerce com arquitetura multi-tenant simulada, construída com React e TypeScript.

## 📋 Sobre o Projeto

O Super Checkout é uma solução moderna para criação e gerenciamento de páginas de checkout personalizáveis. A plataforma permite que usuários criem múltiplos checkouts, configurem gateways de pagamento, gerenciem produtos e acompanhem vendas através de um painel administrativo intuitivo.

### Características Principais

- ✅ **Multi-Tenant Simulado**: Isolamento completo de dados por usuário
- ✅ **Autenticação Mock**: Sistema de login simulado para desenvolvimento
- ✅ **Gerenciamento de Produtos**: CRUD completo de produtos
- ✅ **Checkouts Customizáveis**: Criação de páginas de checkout personalizadas
- ✅ **Gateways de Pagamento**: Integração com Mercado Pago (simulada)
- ✅ **Domínios Personalizados**: Sistema de configuração de domínios
- ✅ **Dashboard Analítico**: Relatórios e métricas de vendas
- ✅ **Tema Dark/Light**: Interface adaptável
- ✅ **Design Responsivo**: Compatível com todos os dispositivos

## 🚀 Tecnologias Utilizadas

### Frontend Core
- **React 18** - Biblioteca principal para construção da interface
- **TypeScript** - Tipagem estática para maior segurança
- **Vite** - Build tool moderna e rápida
- **React Router DOM** - Roteamento client-side

### UI/UX
- **Tailwind CSS** - Framework de estilização utility-first
- **Shadcn/UI** - Componentes de interface pré-construídos
- **Lucide React** - Biblioteca de ícones SVG
- **Recharts** - Gráficos e visualizações de dados

### Estado e Dados
- **React Context API** - Gerenciamento de estado global
- **React Query** - Cache e gerenciamento de dados assíncronos
- **React Hook Form** - Gerenciamento eficiente de formulários
- **Zod** - Validação de esquemas TypeScript-first

## 📁 Estrutura de Pastas

```
src/
├── pages/                    # Páginas e rotas da aplicação
│   ├── Dashboard.tsx         # Página principal com métricas
│   ├── Login.tsx            # Página de autenticação
│   ├── Products.tsx         # Listagem de produtos
│   ├── Checkouts.tsx        # Listagem de checkouts
│   └── ...
├── components/              # Componentes reutilizáveis
│   ├── ui/                  # Componentes base (shadcn/ui)
│   ├── forms/               # Componentes de formulário específicos
│   ├── checkouts/           # Componentes relacionados a checkout
│   ├── Layout.tsx           # Layout principal com sidebar
│   ├── AuthGuard.tsx        # Proteção de rotas
│   └── ...
├── context/                 # Contexts para estado global
│   ├── AuthContext.tsx      # Autenticação e sessão do usuário
│   ├── ProductContext.tsx   # Gerenciamento de produtos
│   ├── CheckoutContext.tsx  # Gerenciamento de checkouts
│   ├── GatewayContext.tsx   # Gateways de pagamento
│   ├── DomainContext.tsx    # Domínios personalizados
│   └── ThemeContext.tsx     # Tema dark/light
├── api/                     # Dados mockados e simulações
│   ├── mockDatabase.ts      # Dados iniciais do sistema
│   └── mockOrders.ts        # Simulação de pedidos
├── hooks/                   # Hooks personalizados
├── types/                   # Definições de tipos TypeScript
├── lib/                     # Utilitários e helpers
└── constants/               # Constantes e configurações
```

## 🏗️ Arquitetura e Fluxo de Dados

### Arquitetura Multi-Tenant Simulada

O projeto implementa um sistema multi-tenant simulado que permite o isolamento completo de dados entre diferentes usuários, preparando o terreno para uma futura implementação com backend real.

#### Estrutura de Dados no LocalStorage

```typescript
// Estrutura no localStorage: chave "app_data"
{
  "usuario1@email.com": {
    "products": [...],
    "checkouts": [...],
    "gateways": [...],
    "customDomain": {...}
  },
  "usuario2@email.com": {
    "products": [...],
    "checkouts": [...],
    "gateways": [...],
    "customDomain": {...}
  }
}
```

### Fluxo de Autenticação (Mock Auth)

1. **Login**: Usuário acessa `/login` e insere qualquer email + senha '123'
2. **Sessão**: Sistema salva `isLoggedIn: true` e `currentUserEmail` no localStorage
3. **Proteção**: `AuthGuard` protege todas as rotas administrativas
4. **Isolamento**: Cada context carrega dados específicos do usuário logado
5. **Logout**: Limpa dados de sessão e redireciona para login

### Contexts como Fonte Única da Verdade

Cada context é responsável por:

- **Carregar dados específicos do usuário** logado do localStorage
- **Manter estado em memória** durante a sessão
- **Persistir alterações** automaticamente no localStorage
- **Fornecer métodos CRUD** para componentes React

#### Fluxo de Dados

```
[Componente] → [Context] → [LocalStorage]
     ↑              ↓
[Re-render] ← [Estado Atualizado]
```

### Sistema de Roteamento

- **Rotas Públicas**: `/login`, `/checkout/:id`, `/pix/:id`, `/obrigado/:id`
- **Rotas Protegidas**: Todas as demais rotas administrativas
- **Proteção**: Implementada via `AuthGuard` que verifica autenticação

## 🔐 Sistema de Autenticação

### Implementação Atual (Mock)

- **Credencial Fixa**: Qualquer email + senha '123'
- **Sessão**: Baseada em localStorage
- **Isolamento**: Dados separados por email do usuário

### Preparação para Backend Real

O sistema está preparado para fácil migração para autenticação real:

- Contexts isolados por usuário
- Guards de rota implementados
- Estrutura de dados multi-tenant
- Separação clara entre autenticação e autorização

## 📊 Gestão de Estado

### Context Providers

1. **AuthContext**: Gerencia autenticação e sessão
2. **ProductContext**: CRUD de produtos por usuário
3. **CheckoutContext**: CRUD de checkouts por usuário
4. **GatewayContext**: Gerenciamento de gateways de pagamento
5. **DomainContext**: Configuração de domínios personalizados
6. **ThemeContext**: Preferências de tema (dark/light)

### Padrão de Dados

Todos os contexts seguem o mesmo padrão:

```typescript
interface ContextType {
  items: T[];
  loading: boolean;
  addItem: (data: Omit<T, 'id'>) => Promise<T>;
  updateItem: (id: string, updates: Partial<T>) => Promise<T>;
  deleteItem: (id: string) => Promise<boolean>;
  getItemById: (id: string) => T | null;
}
```

## 🚧 Preparação para Backend

### Próximos Passos

O código está marcado com comentários `// TODO: BACKEND INTEGRATION` em todos os pontos que precisarão ser substituídos por chamadas de API.

#### Principais Integrações Necessárias

1. **Autenticação Real**
   - Substituir mock auth por JWT/OAuth
   - Implementar refresh tokens
   - Adicionar middleware de autenticação

2. **API RESTful**
   - `GET /api/products` - Listar produtos
   - `POST /api/products` - Criar produto
   - `PUT /api/products/:id` - Atualizar produto
   - `DELETE /api/products/:id` - Deletar produto
   - Similar para checkouts, gateways, etc.

3. **Database Integration**
   - Substituir localStorage por banco de dados
   - Implementar migrações
   - Configurar relacionamentos entre entidades

4. **File Upload**
   - Sistema de upload de imagens
   - CDN para assets estáticos
   - Otimização de imagens

## 📝 Scripts Disponíveis

```bash
# Desenvolvimento
npm run dev

# Build para produção
npm run build

# Preview da build
npm run preview

# Linting
npm run lint
```

## 🎯 Funcionalidades Implementadas

### Dashboard
- Métricas de vendas em tempo real
- Gráficos de performance
- KPIs principais
- Listagem de pedidos recentes

### Produtos
- CRUD completo
- Upload de imagens (simulado)
- Categorização
- Preços e descrições

### Checkouts
- Criação de páginas personalizadas
- Configuração de métodos de pagamento
- Timer de urgência
- Order bumps
- Domínios personalizados

### Gateways
- Integração com Mercado Pago (simulada)
- Gerenciamento de credenciais
- Status de conexão

### Relatórios
- Análise de vendas
- Métricas de conversão
- Dados de performance

## 🔮 Roadmap Futuro

### Fase 1: Backend Integration
- [ ] Implementar API RESTful
- [ ] Migrar de localStorage para database
- [ ] Autenticação real com JWT
- [ ] Upload de arquivos real

### Fase 2: Features Avançadas
- [ ] Webhooks para gateways
- [ ] Notificações em tempo real
- [ ] A/B Testing para checkouts
- [ ] Analytics avançados

### Fase 3: Escala
- [ ] Cache com Redis
- [ ] CDN para assets
- [ ] Monitoramento e logs
- [ ] Otimizações de performance

## 👥 Como Contribuir

1. Clone o repositório
2. Instale as dependências: `npm install`
3. Rode o projeto: `npm run dev`
4. Faça suas alterações
5. Teste localmente
6. Commit com mensagens descritivas

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo LICENSE para mais detalhes.

---

**Desenvolvido com ❤️ para simplificar o e-commerce**

## 🔧 Configuração de Desenvolvimento

### URL do Projeto

**Lovable URL**: https://lovable.dev/projects/a2eebdfa-5841-4db0-a489-f8b04fdd0de8

### Como Editar o Código

**Use Lovable (Recomendado)**

Visite o [Projeto Lovable](https://lovable.dev/projects/a2eebdfa-5841-4db0-a489-f8b04fdd0de8) e comece a usar prompts.

**Use seu IDE Preferido**

```sh
# Clone o repositório
git clone <YOUR_GIT_URL>

# Navegue para o diretório
cd <YOUR_PROJECT_NAME>

# Instale dependências
npm install

# Inicie o servidor de desenvolvimento
npm run dev
```

### Deploy

Abra [Lovable](https://lovable.dev/projects/a2eebdfa-5841-4db0-a489-f8b04fdd0de8) e clique em Share → Publish.

### Domínio Personalizado

Para conectar um domínio personalizado, navegue até Project > Settings > Domains.

Leia mais: [Configurando domínio personalizado](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)
