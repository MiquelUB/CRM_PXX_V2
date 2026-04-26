# SWR Mutations
# Mutacions i SWR Cache
- **Mutacions Optimistes:** Quan l'usuari crea una "interacció" (ex: nova nota), el frontend ha d'actualitzar la memòria cau local de SWR immediatament abans que el backend respongui, per donar sensació de temps real.
- **Revalidació Selectiva:** Després d'un POST/PUT a qualsevol entitat relacionada amb el Deal, s'ha de forçar la invalidació i revalidació de la key clau de SWR (`/deals/{id}/full`) per garantir la sincronia.
