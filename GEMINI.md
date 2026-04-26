# CRM PXX V2 - Estat del Projecte

Aquest fitxer serveix com a registre de l'estat actual i les darreres intervencions realitzades pel model Gemini (Antigravity).

## 🚀 Estat Actual (2026-04-26)

### Backend (FastAPI + SQLModel)
- **Base de dades**: PostgreSQL (Restaurada com a única font de veritat).
- **Migracions**: Alembic configurat (llest per a `revision --autogenerate`).
- **Seguretat**: Endpoints refactoritzats amb validació estricta de Pydantic.
- **Funcionalitats**: 
  - Onboarding atòmic de municipis.
  - Gestió de contactes vinculats a Deals.
  - Timeline unificat d'interaccions.
  - Paginació implementada en llistats crítics.

### Frontend (React + Vite)
- **Municipis**: Formulari d'onboarding amb selecció de Pla SaaS (`pla_saas`).
- **Disseny**: Estètica premium amb Tailwind CSS (Paper/Ink style).
- **Sincronització**: Mapeig de dades alineat amb el backend V2.

## 🛠️ Deute Tècnic Solucionat
- Eliminació de dependència de SQLite local.
- Unificació de timezones a `UTC`.
- Substitució de paràmetres `dict` per models de dades tipats.

## 📋 Propers Passos
1. Executar migracions inicials d'Alembic en l'entorn de producció/local.
2. Validar el flux d'interaccions de correu (Worker).
3. Implementar lògica de negoci avançada per als Plans SaaS (Territori, Mirador, etc.).
