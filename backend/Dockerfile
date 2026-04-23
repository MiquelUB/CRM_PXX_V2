FROM python:3.11-slim

WORKDIR /app

# Instal·lació de dependències del sistema per a PostgreSQL
RUN apt-get update && apt-get install -y libpq-dev gcc && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ .

# Permisos per a l'entrypoint
RUN chmod +x entrypoint.sh

# Exposar el port de FastAPI
EXPOSE 8000

# Executar mitjançant l'entrypoint
ENTRYPOINT ["./entrypoint.sh"]
