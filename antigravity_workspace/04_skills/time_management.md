# Time Management
# Estàndard de Temps i Fusos Horaris
- **Backend (PostgreSQL/Python):** Única i exclusivament **UTC**. Les columnes de data han de ser `TIMESTAMP WITH TIME ZONE` guardades en UTC.
- **Processament IMAP:** Qualsevol data extreta d'una capçalera de correu s'ha de convertir a UTC abans de calcular el hash de deduplicació.
- **Frontend (react-big-calendar):** És l'únic lloc on es fa la transformació a la zona horària local del navegador de l'usuari (Europa/Madrid) per a la visualització.
