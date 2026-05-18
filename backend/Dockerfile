FROM denoland/deno:alpine-1.37.0

WORKDIR /app
RUN addgroup -S app && adduser -S app -G app

# copier les dépendances en root
COPY ./main.ts ./

# Pré-téléchargement des dépendances
RUN deno cache main.ts && chown -R app:app /deno-dir

EXPOSE 8000
# copier le code en attribuant les droits à l'utilisateur non-root
COPY --chown=app:app . .

USER app
CMD ["run", "--allow-net", "--allow-env", "--allow-read", "main.ts"]

# Ne pas utiliser l'utilisateur root pour exécuter l'application
# Restreindre au maximum les permissions d'accès aux ressources du système
# Utiliser des variables d'environnement pour les configurations sensibles
# Exposition des ports nécessaires uniquement