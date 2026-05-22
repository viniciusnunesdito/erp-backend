# ERP Backend

Backend Node.js (Express + TypeScript) com Prisma (SQLite) e JWT.

## Requisitos

- Node.js 18+

## Configuracao

1) Instale dependencias:

```bash
npm install
```

2) Configure o arquivo `.env` (ja existe um exemplo em `.env.example`).

3) Crie o banco e rode as migracoes:

```bash
npm run prisma:migrate -- --name init
```

4) Crie o usuario admin padrao:

```bash
npm run seed
```

5) Inicie o servidor:

```bash
npm run dev
```

Servidor padrao: http://localhost:4000

## Login

- `POST /auth/login`
- body: `{ "email": "admin2@erp.com", "password": "admin123" }`

O retorno inclui `token`, que deve ser enviado em `Authorization: Bearer <token>`.

## Endpoints

- `GET /health`
- `POST /auth/login`
- `GET /clientes`
- `POST /clientes`
- `PUT /clientes/:id`
- `DELETE /clientes/:id`
- `GET /produtos`
- `POST /produtos`
- `PUT /produtos/:sku`
- `DELETE /produtos/:sku`
- `GET /vendas`
- `POST /vendas`
- `GET /dashboard`