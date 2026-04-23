# Etapa de construcció
FROM node:20-alpine as build

WORKDIR /app

# Instal·lació de dependències
COPY frontend/package*.json ./
RUN npm install

# Construcció de l'aplicació
COPY frontend/ .
RUN npm run build

# Etapa de producció
FROM nginx:stable-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
