FROM nginx:1.21.6-alpine

COPY infrastructure/frontend/nginx /etc/nginx
COPY frontend/dist/apps/quantgrid /frontend

# used ENTRYPOINT from base image
