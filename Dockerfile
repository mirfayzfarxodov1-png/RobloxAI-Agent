FROM node:22.13.0-bookworm-slim
ENV NODE_ENV=production
ENV PORT=3000
ENV DATA_DIR=/data
WORKDIR /app
COPY --chown=node:node . .
RUN mkdir -p /data && chown node:node /data
USER node
EXPOSE 3000
CMD ["node", "--experimental-sqlite", "src/server.js"]
