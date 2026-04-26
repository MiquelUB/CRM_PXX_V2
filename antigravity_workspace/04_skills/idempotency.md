# Idempotency
# Scripts d'Ingesta i Idempotència
- **Execució Repetitiva:** Qualsevol script d'importació (DIBA, Idescat, Neteja) o tasca de fons (IMAP) ha de ser 100% idempotent. Es pot executar 10 vegades seguides i el resultat a la base de dades ha de ser el mateix que si s'executa 1 vegada.
- **Instruccions SQL:** Utilitzar sempre clàusules com `ON CONFLICT DO UPDATE` (Upsert) a PostgreSQL en lloc de simples `INSERT` quan es processen dades externes.
