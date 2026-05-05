FROM denoland/deno:alpine-1.37.0

WORKDIR /app
RUN addgroup -S app && adduser -S app -G app

# copier les dépendances en root
COPY ./deps.ts ./
COPY ./main.ts ./

# Pré-téléchargement des dépendances
RUN deno cache main.ts

EXPOSE 8000
# copier le code en attribuant les droits à l'utilisateur non-root
COPY --chown=app:app . .

USER app
CMD ["run", "--allow-net", "--allow-env", "--allow-read", "main.ts"]

#pas utiliser root pour exécuter l'application
# restraindre au max les permissions d'accès aux ressources du système
# utiliser des variables d'environnement pour les configurations sensibles
# exposition des ports nécessaires uniquement