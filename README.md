## CRM/ERP MVP

Monorepo con `frontend` (React + Vite + Tailwind) y `backend` (Node + Express + Prisma).

### Requisitos

- Node.js 20.19 o superior. Recomendado: Node.js 22 LTS.
- pnpm mediante Corepack.

> El proyecto usa Vite 8, que no corre con Node 18.17. Prisma tambien requiere al menos Node 18.18, asi que actualizar Node resuelve ambos errores.

### Configuracion rapida

Desde la raiz del proyecto:

```bash
corepack enable
corepack pnpm install
corepack pnpm dev
```

Si Windows no deja ejecutar `corepack enable`, abri PowerShell como administrador y ejecutalo una vez:

```bash
corepack enable
```

Despues de eso, tambien podes usar `pnpm` directo:

```bash
pnpm install
pnpm dev
```

### Scripts utiles

```bash
pnpm dev           # levanta frontend y backend
pnpm dev:frontend  # levanta solo Vite
pnpm dev:backend   # levanta solo Express
pnpm build         # compila el frontend
pnpm start         # inicia el backend sin watch
```

### Variables de entorno

Crear `backend/.env`:

```env
DATABASE_URL="postgresql://user:pass@localhost:5432/crm?schema=public"
PORT=4000
```

Luego generar Prisma:

```bash
pnpm --filter crm-backend run prisma:generate
```

El backend corre en `http://localhost:4000` y el frontend en `http://localhost:5173`.
