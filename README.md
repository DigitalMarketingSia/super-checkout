# Super Checkout - Sistema de Checkout Profissional

Sistema completo de checkout com integração Mercado Pago, domínios customizados e área de membros.

## 🚀 Funcionalidades

- ✅ Checkout personalizado com múltiplos produtos
- ✅ Integração com Mercado Pago (PIX, Cartão de Crédito, Boleto)
- ✅ Domínios customizados (White Label)
- ✅ Order Bumps e Upsells
- ✅ Área de membros
- ✅ Webhooks personalizados
- ✅ CRM integrado
- ✅ Emails transacionais

## 📋 Pré-requisitos

- Node.js 18+ instalado
- Conta no Supabase
- Conta no Mercado Pago
- Conta na Vercel (para domínios customizados)

## 🔧 Instalação

### 1. Clone o repositório

```bash
git clone https://github.com/seu-usuario/super-checkout.git
cd super-checkout
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Configure as variáveis de ambiente

Copie o arquivo `.env.example` para `.env.local`:

```bash
cp .env.example .env.local
```

Edite o arquivo `.env.local` e preencha as seguintes variáveis:

#### Supabase

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua_chave_anon
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key
```

**Como obter:**
1. Acesse [Supabase Dashboard](https://app.supabase.com)
2. Vá em Settings → API
3. Copie a URL e as chaves

#### Mercado Pago

```env
MERCADO_PAGO_ACCESS_TOKEN=TEST-XXXXX-XXXXXX-XXXXXX
MERCADO_PAGO_PUBLIC_KEY=TEST-XXXXX-XXXXXX-XXXXXX
MERCADO_PAGO_WEBHOOK_SECRET=seu_webhook_secret
```

**Como obter:**
1. Acesse [Mercado Pago Developers](https://www.mercadopago.com.br/developers/panel/credentials)
2. Copie suas credenciais de teste ou produção

#### Vercel (Domínios Customizados)

```env
VERCEL_TOKEN=seu_token_vercel
VERCEL_PROJECT_ID=seu_project_id
VERCEL_TEAM_ID=seu_team_id_opcional
```

**Como obter:**
1. **Token**: Acesse [Vercel Tokens](https://vercel.com/account/tokens) e crie um novo token
2. **Project ID**: 
   - Acesse seu projeto na Vercel
   - Vá em Settings → General
   - Copie o Project ID
3. **Team ID** (opcional): Se estiver usando um time, copie o Team ID das configurações

**Ou use o script automático:**

```bash
node scripts/setup-vercel-env.js
```

### 4. Configure o banco de dados

Execute as migrations do Supabase para criar as tabelas necessárias:

```sql
-- Execute no SQL Editor do Supabase
-- Copie o conteúdo de supabase_schema.sql
```

### 5. Execute o projeto
 
 Para desenvolvimento completo (com API de domínios e webhooks):
 
 ```bash
 vercel dev
 ```
 
 Ou apenas o frontend (sem funções serverless):
 
 ```bash
 npm run dev
 ```
 
 O projeto estará disponível em `http://localhost:3000` (Vercel) ou `http://localhost:5173` (Vite).

## 🌐 Domínios Customizados

### Configuração

1. Acesse o painel admin em `/admin/domains`
2. Clique em "Adicionar Domínio"
3. Digite seu domínio (ex: `checkout.seusite.com`)
4. Configure o DNS no seu provedor:

```
Tipo: CNAME
Nome: @ (ou subdomínio)
Valor: cname.vercel-dns.com
```

5. Aguarde a propagação do DNS (pode levar até 48h)
6. Clique em "Verificar Conexão" para ativar

### Vincular ao Checkout

Após o domínio estar ativo:
1. Selecione o checkout que deseja vincular
2. Opcionalmente, adicione um slug customizado
3. Seu checkout estará disponível em `https://seudominio.com/slug`

## 📧 Emails Transacionais

O sistema envia emails automaticamente após pagamento aprovado usando Resend.

Configure a integração em `/admin/integrations`

## 🔗 Webhooks

Configure webhooks personalizados em `/admin/webhooks` para integrar com:
- CRMs (RD Station, HubSpot, etc)
- Plataformas de membros
- Sistemas de automação

## 📊 Estrutura do Projeto

```
super-checkout/
├── api/                    # API endpoints (Vercel Functions)
│   ├── domains/           # Gerenciamento de domínios
│   └── webhooks/          # Webhooks de pagamento
├── components/            # Componentes React
├── pages/                 # Páginas da aplicação
│   ├── admin/            # Painel administrativo
│   └── public/           # Páginas públicas
├── services/             # Serviços (Supabase, Pagamentos)
├── scripts/              # Scripts utilitários
└── types.ts              # Definições TypeScript
```

## 🛠️ Scripts Disponíveis

```bash
npm run dev          # Inicia servidor de desenvolvimento
npm run build        # Build para produção
npm run preview      # Preview do build
npm run lint         # Verifica código
```

## 📝 Licença

Este projeto está sob a licença MIT.

## 🤝 Suporte

Para suporte, entre em contato através do email: suporte@supercheckout.com
