# Arquitectura d'Estat (SWR)
- **El DealProvider:** Aquest component embolcalla la ruta `/deals/{id}`. Fa la crida a `GET /deals/{id}/full`.
- **Exposició:** El Provider exporta el `deal_data`, `isLoading`, i una funció `mutateDeal` per forçar la recàrrega.
- **Mutacions Optimistes:** Quan l'usuari envia un correu o nota, la UI ha d'actualitzar el timeline de l'estat local i fer la crida a l'API de fons, evitant temps de càrrega bloquejants.