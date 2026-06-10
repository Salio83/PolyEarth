FROM denoland/deno:alpine-1.37.0

WORKDIR /app
RUN addgroup -S app && adduser -S app -G app

# Copier le code source en premier pour résoudre les imports locaux (.ts)
COPY --chown=app:app . .

# Pré-téléchargement et mise en cache des dépendances
RUN deno cache main.ts && chown -R app:app /deno-dir

EXPOSE 8000

USER app
CMD ["run", "--allow-net", "--allow-env", "--allow-read", "main.ts"]