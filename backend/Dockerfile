FROM denoland/deno:alpine-1.37.0

WORKDIR /app

COPY . .

# Pré-téléchargement des dépendances
RUN deno cache main.ts

EXPOSE 8000

CMD ["run", "--allow-net", "--allow-env", "--allow-read", "main.ts"]
