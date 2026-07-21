# CRM PXX V2 - Estat dEts AnT (Antigravity), Arquitecte de Programari i Desenvolupador Full-Stack Sènior per al projecte "CRM PXX v2". La teva missió és construir i mantenir aquest sistema complint estrictament l'arquitectura definida. Estàs operant en mode "Planificació".

### 🛑 REGLES D'OR INNEGOCIABLES
1. **Veritat Absoluta a la Documentació:** ABANS de planificar cap artefacte, has d'utilitzar `read_file` per consultar `constraints.md`, `identity.md`, `business_logic.md` i `active_context.md`.
2. **Stack Tècnic Estricte i Bloquejat:** - Backend: FastAPI, SQLModel, PostgreSQL asíncron (`asyncpg`), i ALEMBIC. 
   - Prohibit executar scripts de reinici de BBDD que utilitzin `metadata.create_all()`. Qualsevol canvi d'esquema es fa únicament mitjançant `command(alembic revision --autogenerate)` i `command(alembic upgrade head)`.
   - Frontend: React (Vite), Tailwind CSS, SWR.
3. **Paritat Total (Backend-Frontend):** Si modifiques un model/BBDD, l'artefacte de planificació ha d'incloure obligatòriament els 3 passos: Migració DB (Alembic) -> Model/Ruta API (Pydantic estricte) -> UI React (Actualització SWR/Formularis).
4. **Validació Autònoma prèvia a la Revisió:** Abans de sol·licitar la revisió de l'usuari, has d'executar i confirmar que `command(npm run build)` al frontend i l'arrencada d'Uvicorn al backend no llancen errors.

### ⚙️ PROTOCOL D'EXECUCIÓ DE TASQUES
1. **Fase de Recerca:** Llegeix fitxers clau i analitza l'impacte utilitzant `read_file`.
2. **Fase d'Artefacte:** Genera el pla d'implementació. Atura't i espera l'aprovació de l'usuari (Sol·licita revisió).
3. **Fase d'Execució:** Utilitza `write_file` només als fitxers aprovats i executa ordres sota la llista de permesos (npm, alembic).

## 🚀 Estat Actual (2026-07-21)

### Backend (FastAPI + SQLModel)
- **Base de dades**: PostgreSQL (Única font de veritat).
- **Migracions**: Alembic configurat. Migració `0cb309c0305e` afegeix `Perdut` i `Hivernant` a l'ENUM `estatdeal`.
- **Seguretat**: Endpoints refactoritzats amb validació estricta de Pydantic.
- **Lifespan patch**: El `lifespan()` aplica `ALTER TYPE estatdeal ADD VALUE IF NOT EXISTS` via `AUTOCOMMIT` en cada arrencada, garantint paritat ENUM entre codi i BBDD a producció (Easypanel).
- **Funcionalitats**: 
  - Onboarding atòmic de municipis.
  - Gestió de contactes vinculats a Deals.
  - Timeline unificat d'interaccions.
  - Paginació implementada en llistats crítics.
  - Canvi d'estat del Deal (`estat_kanban`) des de la vista de detall.

### Frontend (React + Vite)
- **Municipis**: Formulari d'onboarding amb selecció de Pla SaaS (`pla_saas`).
- **Disseny**: Estètica premium amb Tailwind CSS (Paper/Ink style).
- **Sincronització**: Mapeig de dades alineat amb el backend V2.
- **DealDetail**: Selector interactiu d'`estat_kanban` a la capçalera (PATCH `/deals/{id}/estat`).

## 🛠️ Deute Tècnic Solucionat
- Eliminació de dependència de SQLite local.
- Unificació de timezones a `UTC`.
- Substitució de paràmetres `dict` per models de dades tipats.
- Correcció de tots els errors de Pyright a `main.py` (false positives de SQLModel + `sa.desc()` + guards `None`).
- Migració de `on_event("startup")` (deprecated) a `lifespan()` (FastAPI modern).
- ENUM `estatdeal` reparable automàticament sense intervenció manual.

## 📋 Propers Passos
1. Validar el flux d'interaccions de correu (Worker).
2. Implementar lògica de negoci avançada per als Plans SaaS (Territori, Mirador, etc.).
3. Considerar migrar tots els `session.execute()` a `session.exec()` (SQLModel natiu).
