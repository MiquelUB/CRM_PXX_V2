#!/bin/sh

# Esperar a que la base de dades estigui llista (opcional si usem healthchecks al compose)
echo "Esperant a la base de dades..."

# Executar migracions d'Alembic
echo "Executant migracions..."
alembic upgrade head

# Iniciar l'aplicació
echo "Iniciant FastAPI..."
exec uvicorn main:app --host 0.0.0.0 --port 8000
