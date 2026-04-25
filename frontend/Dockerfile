FROM denoland/deno:alpine-1.37.0

WORKDIR /app

COPY . .

# Pré-téléchargement des dépendances
RUN deno cache server.ts

EXPOSE 3000

CMD ["run", "--allow-net", "--allow-read", "server.ts"]
