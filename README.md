# CRM PXX V2 - Gestión Institucional

Sistema de gestión de relaciones (CRM) de alto rendimiento, diseñado bajo la filosofía **Organic Tech**. Esta versión V2 prioriza una experiencia de usuario manual, institucional y robusta, eliminando distracciones y automatizaciones innecesarias para centrarse en la integridad de los datos y la eficiencia operativa.

## 🏛️ Filosofía del Proyecto: Organic Tech
A diferencia de los sistemas saturados de IA y automatizaciones, el CRM PXX V2 apuesta por:
- **Gestión Manual**: Control absoluto sobre cada acción y dato.
- **Estética Institucional**: Interfaz limpia en paleta *Cream/Paper/Ink* que reduce la fatiga visual.
- **Transparencia**: Arquitectura clara y flujos de trabajo predecibles.

## 🚀 Características Principales
- **Epicentre (Deal Detail)**: Vista unificada para el seguimiento detallado de acuerdos.
- **Kanban Pro**: Tablero de gestión visual con actualizaciones optimistas para una fluidez máxima.
- **Unified Timeline**: Registro histórico cronológico de todas las interacciones.
- **SaaS Plan Editor**: Herramientas específicas para la gestión de planes y suscripciones.
- **Calendario Nativo**: Integración directa para la gestión de tiempos y tareas.

## 🛠️ Stack Tecnológico

### Backend (Robustez y Escalabilidad)
- **FastAPI**: Framework moderno y rápido para la API.
- **SQLModel**: Integración perfecta entre SQLAlchemy y Pydantic.
- **PostgreSQL**: Base de datos relacional para máxima integridad.
- **Alembic**: Gestión de migraciones de base de datos.
- **Asincronía**: Operaciones I/O no bloqueantes para alto rendimiento.

### Frontend (Experiencia Premium)
- **React 19 + TypeScript**: Tipado estricto y componentes modernos.
- **Vite**: Herramienta de construcción ultra rápida.
- **SWR**: Estrategia de caching y sincronización de datos en tiempo real.
- **TailwindCSS**: Estilizado personalizado bajo la guía de diseño institucional.
- **Hello Pangea DND**: Arrastrar y soltar de alto rendimiento para el Kanban.

## 📦 Instalación y Configuración

### Requisitos Previos
- Python 3.10+
- Node.js 18+
- PostgreSQL

### Backend
1. Navega a la carpeta `/backend`.
2. Crea un entorno virtual: `python -m venv venv`.
3. Instala dependencias: `pip install -r requirements.txt`.
4. Configura el archivo `.env` basado en `.env.example`.
5. Ejecuta las migraciones: `alembic upgrade head`.
6. Inicia el servidor: `uvicorn main:app --reload`.

### Frontend
1. Navega a la carpeta `/frontend`.
2. Instala dependencias: `npm install`.
3. Inicia el modo desarrollo: `npm run dev`.

---
© 2026 CRM PXX V2 - Diseñado para la excelencia institucional.
