FROM python:3.11-slim

WORKDIR /app

# Instal·lació de dependències del sistema per a PostgreSQL
RUN apt-get update && apt-get install -y libpq-dev gcc && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Exposar el port de FastAPI
EXPOSE 8000

# Comanda per executar l'app amb Uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
