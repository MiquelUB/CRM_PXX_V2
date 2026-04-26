# Pre-flight
# Checklist Pre-Desenvolupament
Aquestes condicions han d'estar validades abans d'escriure codi funcional:

1. **Fonts de Dades Mestres:** CSV de municipis (DIBA) i població (Idescat) descarregats i preparats per a la importació.
2. **Sanejament de Dades:** Neteja profunda de duplicats del dump de dades v1 per assegurar que la nova base de dades neix sense soroll.
3. **Comunicacions:** Credencials IMAP (CDmon) verificades mitjançant un script de test independent.
4. **IA Stack:** API Key d'OpenRouter confirmada i operativa (validar via curl).
5. **Infraestructura:** Accés SSH a Hetzner confirmat i instància de PostgreSQL activa a EasyPanel.
6. **Entorn de Dades:** Base de dades `crm_pxx_v2` creada i accessible, preparada per a les migracions d'Alembic.