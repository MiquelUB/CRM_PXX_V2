# Architecture
# Arquitectura v2: Zero Duplicats
Aquesta versió neix per corregir els errors de la v1 mitjançant una centralització estricta.

- **La Regla de l'Endpoint Únic:** Tot el frontend es construeix consumint `GET /deals/{id}/full`. Aquest endpoint ha de fer *eager loading* de totes les relacions associades (municipi, contactes, interaccions).
- **Agent IA Integrat:** L'agent IA viu dins del *Deal Drawer* al frontend, però s'alimenta del backend llegint l'historial unificat abans de proposar accions.