# Multiverso POS — Boneless and Food

Punto de venta web, 100% gratuito, accesible desde cualquier lugar.

**Stack:**
- **Frontend:** React + Vite + Tailwind (hospedado gratis en Netlify)
- **Base de datos + usuarios:** Supabase (Postgres gratis, con seguridad por roles)

**Módulos:** Dashboard con métricas (día, 7/30 días, utilidad mensual) · Pedidos (Sitio,
Uber Eats, Didi Food, Rappi) con ticket imprimible y folio · Artículos con costo de
producción y precio por canal · Insumos · Gastos/Egresos · Reportes diarios/semanales/
mensuales con exportación CSV · Usuarios con roles · Configuración (comisión por
plataforma editable, categorías, datos del negocio).

Uber Eats, Didi Food y Rappi cobran comisión (43% por defecto, editable en
Configuración) sobre cada pedido; todos los cálculos de utilidad la descuentan.

---

## 1. Crear la base de datos (Supabase — gratis)

1. Entra a <https://supabase.com> y crea una cuenta (con Google o GitHub).
2. **New project** → ponle nombre (ej. `multiverso-pos`), elige una contraseña de base
   de datos (guárdala) y región `East US` o la más cercana. Plan **Free**.
3. Cuando termine de crear, ve a **SQL Editor** (icono de terminal en el menú izquierdo)
   → **New query** → pega TODO el contenido de [`supabase/schema.sql`](supabase/schema.sql)
   → botón **Run**. Debe decir "Success".
   - Si ya tenías el proyecto creado de antes, en vez de correr `schema.sql` de nuevo
     corre [`supabase/migration_commission.sql`](supabase/migration_commission.sql) y
     luego [`supabase/migration_v2.sql`](supabase/migration_v2.sql) (en ese orden),
     para agregar comisión, folio, categorías y configuración sin perder tus datos.
4. Ve a **Authentication → Sign In / Up → Email** y **desactiva** "Confirm email"
   (para que tus empleados no necesiten confirmar correo). Guarda.
5. En esa misma pantalla, **desactiva "Allow new users to sign up"** (o "Enable email
   signups"). Esto es importante: sin esto, cualquiera que encuentre la URL de tu sitio
   podría crearse una cuenta. Con el registro cerrado, solo tú das de alta gente
   (paso 6 de "Uso diario", más abajo).
6. Ve a **Project Settings → API** (o "API Keys") y copia:
   - **Project URL** (ej. `https://abcd1234.supabase.co`)
   - **anon / public key** (empieza con `eyJ...`)

## 2. Probar en tu computadora

```bash
# En la carpeta del proyecto:
copy .env.example .env
# Edita .env y pega tu URL y anon key de Supabase

npm install
npm run dev
```

Abre <http://localhost:5173> e inicia sesión. Para crear tu primera cuenta (antes de
desactivar el registro, o siempre desde el panel de Supabase — ver "Uso diario" abajo):
en Supabase ve a **Authentication → Users → Add user → Create new user**, pon tu correo
y contraseña, marca "Auto Confirm User". **El primer usuario creado queda como
administrador automáticamente.** Los siguientes entran como "solo lectura" y tú les
subes el rol desde la sección Usuarios del sitio.

## 3. Publicar gratis en Netlify (acceso desde cualquier lugar)

Opción recomendada (con GitHub, se actualiza solo):

1. Sube el proyecto a un repositorio de GitHub (puede ser privado).
2. Entra a <https://netlify.com> → **Add new site → Import an existing project** → GitHub
   → elige tu repo. Netlify detecta Vite solo (build `npm run build`, publish `dist`).
3. Antes de deployar, en **Site configuration → Environment variables** agrega:
   - `VITE_SUPABASE_URL` = tu Project URL
   - `VITE_SUPABASE_ANON_KEY` = tu anon key
4. **Deploy**. Te da una URL tipo `https://multiverso-pos.netlify.app` —
   ábrela desde el celular, la tablet del local o cualquier lado.

Opción rápida sin GitHub: `npm run build` y arrastra la carpeta `dist` a
<https://app.netlify.com/drop> (pero así no se actualiza sola; para las variables
de entorno crea antes un archivo `.env` local antes de hacer el build).

## 4. Uso diario

- **Pedidos:** eliges canal (Sitio / Uber / Didi / Rappi), tocas los artículos, registras.
  El sistema guarda venta y costo de producción del momento.
- **Artículos:** costo de producción + precio por canal. Deja vacío el precio si no se
  vende en ese canal. La utilidad por canal se calcula sola.
- **Insumos / Gastos:** registra compras y gastos; se restan en la utilidad neta del reporte.
- **Reportes:** hoy / 7 días / mes / rango libre. Utilidad por canal y por artículo.
  Botón para exportar CSV (se abre en Excel).
- **Usuarios:** el registro público está cerrado (por seguridad). Para dar de alta a
  alguien: Supabase → **Authentication → Users → Add user → Create new user**, ponle
  correo y una contraseña temporal, marca "Auto Confirm User". Esa persona entra
  automáticamente como "solo lectura"; tú le subes el rol a admin desde la sección
  Usuarios del sitio si necesita capturar pedidos.
- **Configuración** (solo admin): ajustar el % de comisión de cada plataforma, agregar
  categorías de artículos y los datos del negocio que aparecen en el ticket.
- **Ticket:** cada pedido tiene folio consecutivo; da click en un pedido de la lista
  para ver/imprimir su recibo.

## Límites del plan gratis (más que suficientes para empezar)

- Supabase Free: 500 MB de base de datos, 50,000 usuarios activos/mes.
  *Nota: pausa el proyecto tras ~1 semana sin uso; con uso diario del POS no pasa.*
- Netlify Free: 100 GB de tráfico/mes.
