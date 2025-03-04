# Signal-CLI Dockerfile

FROM node:18-alpine

WORKDIR /app
COPY backend/package*.json /app/
RUN npm install --omit=dev
COPY backend /app/

ENV MODE=json-rpc
ENV CORS_ALLOW_ORIGIN=*

EXPOSE 8080

VOLUME ["/home/.local/share/signal-cli"]

CMD ["npm", "run", "start-pm2"]
