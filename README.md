# Truck Finanças

Truck Finanças é uma aplicação para auxiliar proprietários e motoristas de pequenas e médias transportadoras a fazer as finanças e acertos patrão–motorista de seus caminhões.

## Sobre o projeto

Este repositório contém o **frontend** da aplicação Truck Finanças.

O frontend será desenvolvido com:

- **Next.js**
- **TypeScript**
- **Tailwind CSS**
- **Supabase** (Auth)

## Autenticação

Rotas de auth (grupo `(auth)`):

| Rota | Descrição |
|------|------------|
| `/login` | Entrada com e-mail/senha (Supabase Auth) |
| `/signup` | Cadastro; após confirmar e-mail, fazer login |
| `/forgot-password` | Solicita e-mail de recuperação (chama backend `POST /auth/recover-password`) |
| `/reset-password` | Nova senha após clicar no link do e-mail |

**Se o cadastro falhar com "rate limit" ou "limite de e-mails":** no [Supabase Dashboard](https://supabase.com/dashboard) → **Authentication** → **Providers** → **Email**, desative **"Confirm email"**. Assim o signup não envia e-mail e o usuário entra logo após cadastrar (recomendado para desenvolvimento).

Fluxo:

1. **Login/Signup:** feitos no frontend com `supabase.auth.signInWithPassword` / `signUp`.
2. **Sessão:** o `AuthProvider` escuta `onAuthStateChange` e, ao ter sessão, chama o backend **GET /auth/me** (com o JWT no `Authorization`) para obter/criar o perfil (`appUser` com `role`).
3. **Recuperar senha:** o formulário em `/forgot-password` chama **POST /auth/recover-password** com o e-mail; o backend usa Supabase para enviar o link. O usuário cai em `/reset-password` e usa `supabase.auth.updateUser({ password })`.
4. **Home (`/`):** se logado → redireciona para `/dashboard`; senão → `/login`.
5. **Chamar o backend com JWT:** use `apiFetch` de `@/lib`; o token é colocado automaticamente a partir da sessão Supabase.

## Estrutura do projeto

```
pds-frontend/
├── app/                    # Next.js App Router
│   ├── (auth)/             # Rotas de autenticação (login, signup, etc.)
│   │   ├── layout.tsx
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   ├── forgot-password/page.tsx
│   │   └── reset-password/page.tsx
│   ├── dashboard/          # Área logada
│   │   ├── layout.tsx      # Protege rotas (exige sessão)
│   │   └── page.tsx
│   ├── layout.tsx          # Root layout (AuthProvider)
│   ├── page.tsx            # Redireciona / → dashboard ou /login
│   └── globals.css
├── components/
│   ├── auth/               # Formulários de autenticação
│   │   ├── login-form.tsx
│   │   ├── signup-form.tsx
│   │   ├── forgot-password-form.tsx
│   │   ├── reset-password-form.tsx
│   │   └── index.ts
│   └── ui/                 # Componentes de interface reutilizáveis
│       └── card.tsx
├── contexts/
│   └── auth-context.tsx    # AuthProvider e estado de autenticação
├── hooks/
│   └── index.ts            # Re-exporta useAuth (e futuros hooks)
├── lib/
│   ├── api.ts              # Cliente HTTP (apiFetch, fetchMe, registerProfile, recoverPassword)
│   ├── supabase.ts         # Cliente Supabase (browser)
│   └── index.ts
├── types/
│   ├── auth.ts
│   └── index.ts
└── public/
```

- **Páginas** em `app/` importam componentes de `@/components/auth` e `@/components/ui`.
- **Autenticação:** `useAuth()` em `@/hooks`; chamadas ao backend via `@/lib` (apiFetch, fetchMe, etc.).
- **Path alias:** `@/*` aponta para a raiz do projeto (`tsconfig.json`).

## Como usar

### Pré-requisitos

- [Node.js](https://nodejs.org/) (versão 18 ou superior)
- npm, yarn ou pnpm

### Instalação e execução

1. **Instale as dependências:**

   ```bash
   npm install
   ```

2. **Configure as variáveis de ambiente:**

   ```bash
   cp .env.example .env.local
   ```

   Edite `.env.local` com a URL e a Anon Key do Supabase (Project Settings > API) e a URL do backend (`NEXT_PUBLIC_API_URL`). Sem isso, a aplicação exibirá um aviso de configuração.

3. **Suba o servidor de desenvolvimento:**

   ```bash
   npm run dev
   ```

   Acesse [http://localhost:3000](http://localhost:3000) no navegador.

4. **Build para produção (opcional):**

   ```bash
   npm run build
   npm start
   ```

## Licença

Projeto PDS.
