# CRM PXX v2 - Project Memory & PRD (v1.0)

Aquest document serveix com a font de veritat (Single Source of Truth) per al desenvolupament, auditoria i configuració d'IA del CRM PXX v2.

## 1. Filosofia i Regles d'Or
* **El Deal com a Epicentre:** Tota l'activitat de negoci es gestiona des de la vista del Deal. No existeixen gestors de correu independents ni bústies globals que fragmentin el context.
* **Municipi com a Arrel:** El Municipi és l'entitat de nivell 0. És la base de dades mestre: sense Municipi no existeixen ni Deals ni Contactes.
* **Font de Veritat Única:** Tota l'activitat (notes, correus, trucades) es consolida en una única taula d'**Interaccions**.
* **Fresh Start:** Arquitectura neta, totalment tipada amb TypeScript i optimitzada per a la comprensió d'agents d'IA.

## 2. Jerarquia de Dades i Dependències
L'arquitectura segueix una estructura de cascada estricta per evitar redundàncies:
1. **Municipi (Root):** Dades demogràfiques (habitants) i d'ubicació. És el contenidor principal.
2. **Deal (Fill del Municipi):** El projecte comercial actiu. Hi ha una relació 1:1 (un sol deal per municipi).
3. **Contactes (Fills del Municipi):** Persones de referència de l'ajuntament o entitat. Es vinculen al Municipi, no al Deal.
4. **Interaccions (Línia Temporal):** Inclou el **Notes Box**, Emails i Trucades. Tota la "intel·ligència" de l'estat del deal es bolca aquí. L'Agent IA llegeix aquesta taula per respondre consultes.

## 3. Especificacions Tècniques
### Backend
* **Stack:** Python, SQLModel (ORM), PostgreSQL.
* **IA:** Integració amb OpenRouter utilitzant el model `moonshotai/kimi-k2.5`.
* **Sincronització:** Motor IMAP asíncron amb deduplicació mitjançant `external_id` (hash de capçaleres).
* **Endpoints:** Ús de l'endpoint agregador `GET /deals/{id}/full` per alimentar tota la vista del detall amb una sola consulta.

### Frontend
* **Stack:** Vite + React + TypeScript + Tailwind CSS.
* **Estat:** SWR per a la sincronització de dades amb el servidor i "Optimistic Updates" per al moviment de dades al Kanban.
* **Disseny:** Paleta semàntica basada en `Slate` (per a fons i textos) i `Indigo` (per a accions). Mode Fosc persistent via `localStorage`.

## 4. Plans SaaS i Lògica de Negoci
Basat en les directives de llançament 2026, el sistema gestiona tres nivells:
* **Pla Roure (2.500 €/any):** Fins a 5 rutes i 10 POIs per ruta.
* **Pla Mirador (5.000 €/any):** Fins a 10 rutes i 20 POIs. Inclou redacció de la IA.
* **Pla Territori (14.000 €/any):** Fins a 20 rutes i 35 POIs. Gestió de gran format.
* **Flexibilitat Comercial:** Els límits de rutes i POIs són editables manualment per cada Deal per permetre "add-ons" comercials sense canviar de pla.

## 5. Estructura de l'Aplicació (Rutes)
* `/` : **Dashboard** (Vista combinada: Kanban 66% + Calendari 33%).
* `/deals/{id}` : **L'Epicentre**. Detall del deal, dades del pla, Timeline d'interaccions i xat amb l'Agent IA.
* `/municipis` : **Directori Mestre**. Llistat alfabètic amb dades demogràfiques.
* `/contactes` : **Agenda**. Llistat de persones vinculades obligatòriament a un municipi.
* `/pagaments` : **Gestor Financer**. Llistat de facturació.

## 6. Estat del Desenvolupament (Phases)
* **Fase 1:** Setup de l'entorn, ThemeProvider (Mode Fosc) i Enrutament.
* **Fase 2:** DealProvider, SWR Integration i maquetació de l'Epicentre (Detall del Deal).
* **Fase 3:** Dashboard interactiu amb Kanban (Drag & Drop) i Calendari d'interaccions.
* **Fase 4:** Implementació de CRUDs de Municipis/Contactes sota la nova jerarquia i auditoria de seguretat (TestSprite).
