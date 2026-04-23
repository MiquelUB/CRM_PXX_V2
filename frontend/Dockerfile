# Etapa de construcció
FROM node:20-alpine as build

WORKDIR /app

# Argument de compilació necessari per a Vite
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

# Instal·lació de dependències
COPY package*.json ./
RUN npm install

# Construcció de l'aplicació
COPY . .
RUN npm run build

# Etapa de producció
FROM nginx:stable-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
