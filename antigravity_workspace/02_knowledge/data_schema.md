# Data Schema
# Esquema de Dades Central
- **Taula `interaccions`:** L'eix vertebrador. Tota activitat (emails entrants/sortints, notes humanes, trucades, visites, canvis d'estat) es guarda aquí per mantenir un context cronològic absolut.
- **Relacions Estrictes:** Un Deal pertany a un Municipi. Un Deal té múltiples Contactes. Un Deal té múltiples Interaccions. Totes les Foreign Keys han d'estar perfectament definides a SQLModel.