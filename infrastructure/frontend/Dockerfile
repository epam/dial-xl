FROM nginx:stable-alpine3.17

COPY infrastructure/frontend/nginx /etc/nginx
COPY frontend/dist/apps/quantgrid /frontend

# used ENTRYPOINT from base image
