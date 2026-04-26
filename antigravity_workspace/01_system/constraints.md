# Constraints
# Límits Tecnològics Estrictes
- **Backend:** PostgreSQL obligatori. Ús exclusiu de SQLModel (unifica SQLAlchemy + Pydantic).
- **Frontend:** React amb SWR per la revalidació de dades i React Context per l'estat global.
- **Integració IA:** Ús exclusiu de l'API d'OpenRouter. Totalment prohibit l'ús directe de l'API d'OpenAI. Unic Agent Kimi k2.
- **Calendari:** Implementació nativa amb `react-big-calendar`. Sense integracions externes (ni Google Calendar ni Outlook).
- **Dades:** Prohibit inventar dades geogràfiques o poblacionals. Ús exclusiu de fonts oficials (DIBA, Idescat).