#!/bin/bash
set -e

# Les migracions s'executen des del "Pre-Deploy Command" d'EasyPanel (alembic upgrade head)
# per garantir que s'executen 1 sola vegada abans d'aixecar els contenidors.
exec uvicorn main:app --host 0.0.0.0 --port 8000
