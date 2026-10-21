FROM node:22-bookworm-slim

ENV NODE_ENV=production
WORKDIR /app
RUN chown node:node /app

COPY --chown=node:node package.json package-lock.json ./
USER node
RUN npm ci --omit=dev

COPY --chown=node:node . .

EXPOSE 8690
CMD ["npm", "start"]
