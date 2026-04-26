# Advanced SQLModel
# Càrrega de Dades i Rendiment (Eager Loading)
- **Zero N+1 Queries:** Per a l'endpoint `GET /deals/{id}/full`, està prohibit deixar que SQLModel faci "lazy loading" (el comportament per defecte).
- **Ús Obligatori:** Has d'utilitzar `selectinload` per a relacions 1-a-N (ex: interaccions d'un deal) i `joinedload` per a relacions 1-a-1 o N-a-1 (ex: municipi del deal).
- **Consultes Asíncrones:** Totes les crides a PostgreSQL s'han de fer amb `AsyncSession` de SQLAlchemy/SQLModel.