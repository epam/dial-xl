FROM nginx:stable-alpine3.21-perl

COPY infrastructure/frontend/nginx /etc/nginx
COPY frontend/dist /frontend

# used ENTRYPOINT from base image
