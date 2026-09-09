FROM node:20-alpine AS builder
WORKDIR /app
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL
COPY frontend/package*.json ./
RUN npm ci --silent
COPY frontend/ .
# public/manuel-admin.md est un symlink vers ../MANUEL_ADMIN_BACKEND.md (source
# unique) : hors contexte du build Docker scopé à frontend/, donc copié ici
# explicitement depuis la racine du dépôt (contexte étendu à la racine, voir
# docker-compose.yml).
COPY MANUEL_ADMIN_BACKEND.md ./public/manuel-admin.md
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY frontend/nginx.frontend.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
