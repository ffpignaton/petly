# 🐾 Animal Care

PWA para acompanhar a saúde dos seus pets — vacinas, peso, remédios e consultas veterinárias. Instala no iPhone direto pelo Safari, sem App Store.

## Stack

- **React 19 + TypeScript** — UI reativa
- **Tailwind CSS v4** — estilo mobile-first
- **Vite PWA** — instalável no iPhone / Android
- **Supabase** — banco de dados PostgreSQL + autenticação (gratuito)
- **React Router v7** — navegação

---

## 1. Configurar o Supabase

1. Crie uma conta gratuita em [supabase.com](https://supabase.com)
2. Crie um novo projeto
3. No painel, vá em **SQL Editor** e execute o conteúdo de [`supabase/schema.sql`](./supabase/schema.sql)
4. Em **Project Settings → API**, copie:
   - `Project URL`
   - `anon public key`

---

## 2. Variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto (baseado em `.env.example`):

```
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anonima
```

---

## 3. Rodar localmente

```bash
npm install
npm run dev
```

Acesse `http://localhost:5173` no browser.

---

## 4. Build de produção

```bash
npm run build
npm run preview
```

---

## 5. Deploy (Vercel — gratuito)

1. Suba o código para um repositório GitHub
2. Importe o repositório no [vercel.com](https://vercel.com)
3. Configure as variáveis de ambiente (`VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`)
4. Deploy automático a cada push

---

## 6. Instalar no iPhone

1. Acesse a URL do app no Safari
2. Toque em **Compartilhar** (ícone de caixa com seta)
3. Selecione **"Adicionar à Tela de Início"**
4. O app aparecerá como ícone nativo no iPhone ✅

---

## Funcionalidades

| Módulo | O que registra |
|---|---|
| 🐶 **Pets** | Cadastro de nome, raça, nascimento, sexo |
| 💉 **Vacinas** | Vacinas aplicadas + próxima dose com alerta de vencimento |
| ⚖️ **Peso** | Histórico de pesagens com tendência (subiu/desceu) |
| 💊 **Remédios** | Medicamentos com dosagem, frequência e período |
| 🩺 **Consultas** | Histórico veterinário com diagnóstico |
| 🔔 **Alertas** | Vacinas próximas ao vencimento na tela inicial |

---

## Estrutura de arquivos

```
src/
├── contexts/
│   └── AuthContext.tsx       # Gerenciamento de sessão Supabase
├── lib/
│   ├── api.ts                # Funções de acesso ao banco
│   ├── database.types.ts     # Tipos TypeScript das tabelas
│   ├── supabase.ts           # Cliente Supabase
│   └── utils.ts              # Helpers (formatDate, calcAge, etc.)
├── components/ui/
│   ├── BottomNav.tsx         # Navegação inferior
│   ├── Button.tsx
│   ├── Card.tsx
│   ├── EmptyState.tsx
│   ├── Input.tsx             # Input, Textarea, Select
│   └── TopBar.tsx
├── pages/
│   ├── HomePage.tsx          # Dashboard com alertas
│   ├── LoginPage.tsx         # Login / Cadastro
│   ├── PetsPage.tsx          # Lista de pets
│   ├── PetProfilePage.tsx    # Perfil do pet
│   ├── VaccinesPage.tsx
│   ├── WeightsPage.tsx
│   ├── MedicationsPage.tsx
│   └── VetVisitsPage.tsx
└── App.tsx                   # Rotas + AuthProvider
supabase/
└── schema.sql                # SQL para criar as tabelas
```
