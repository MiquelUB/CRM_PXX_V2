# Deduplication
# Motor de Processament IMAP
Els correus sovint arriben desincronitzats o repetits. La lògica de deduplicació és innegociable:

- **Clau Compost per Deduplicar:** No confiar només en el `Message-ID`. Validar la combinació de: `message_id_extern` + `from` + `date` + `hash(subject)`.
- **Cues:** Les sincronitzacions s'han de fer en segon pla (background tasks) amb sistema de reintents en cas d'errada temporal.