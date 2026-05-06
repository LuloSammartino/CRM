## CRM/ERP MVP (StockBase-inspired)

Monorepo con `frontend` (React + Vite + Tailwind) y `backend` (Node + Express + Prisma).

### Requisitos

- Node.js 18+ (recomendado)

### Configuración rápida

#### 1) Backend

```bash
cd backend
npm install
```

Crear `.env`:

```env
DATABASE_URL="file:./dev.db"
PORT=4000
```

Inicializar DB (SQLite para desarrollo local):

```bash
npx prisma migrate dev --name init
npx prisma generate
npm run dev
```

El backend corre en `http://localhost:4000`.

#### 2) Frontend

```bash
cd frontend
npm install
npm run dev
```

El frontend corre en `http://localhost:5173`.

### Notas

- Para cambiar a PostgreSQL, reemplaza `DATABASE_URL` en `.env` por una URL de Postgres (ej. `postgresql://user:pass@localhost:5432/crm?schema=public`) y vuelve a correr migraciones.

