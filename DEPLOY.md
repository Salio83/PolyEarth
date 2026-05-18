# 🌿 PolyEarth - Guide de Déploiement

Ce projet est une application web moderne pour l'association **PolyEarth** de Polytech Montpellier. Il utilise **Deno** pour le backend et le frontend, et **PostgreSQL** pour la base de données.

---

## 🚀 Lancement Rapide

La méthode recommandée est d'utiliser **Docker Desktop**.

1.  Assurez-vous d'avoir un fichier `.env` à la racine avec les variables requises :
    ```env
    POSTGRES_DB=polyearth
    POSTGRES_USER=root
    POSTGRES_PASSWORD=votre_mot_de_passe_securise
    JWT_SECRET=votre_secret_jwt_tres_long_et_complexe_32_caracteres_minimum
    NODE_ENV=development
    APP_URL=http://localhost
    ```

    > 💡 Pour un déploiement en production, passez `NODE_ENV=production` et `APP_URL=https://votre-domaine.com`. En mode `production`, les cookies ne sont envoyés que via HTTPS.
2.  Ouvrez un terminal à la racine du projet.
3.  Lancez tous les services :
    ```powershell
    docker-compose up --build
    ```
4.  Accédez à l'application :
    -   **Application** : [http://localhost](http://localhost)

> ⚠️ **Important** : L'API n'est plus accessible directement depuis l'extérieur. Toutes les requêtes passent par le reverse proxy Nginx sur le port 80.

---

## 🏗 Architecture du Projet

L'architecture suit une approche sécurisée avec séparation des réseaux Docker :

-   **`front`** : Serveur Deno servant les fichiers statiques (HTML, CSS, JS). Exposé uniquement via le réseau `public`.
-   **`api`** : API REST construite avec Deno et Oak. Exposé uniquement via le réseau `backend`.
-   **`db`** : Base de données PostgreSQL. Exposé uniquement via le réseau `backend` avec un healthcheck.
-   **`proxy`** : Reverse proxy Nginx. Unique point d'entrée public (port 80) connecté aux réseaux `public` et `backend`.
-   **`schema.sql`** : Définition de votre base de données PostgreSQL.

### Avantages de cette architecture
-   **Isolation réseau** : La base de données et l'API ne sont pas directement accessibles depuis l'hôte.
-   **Point d'entrée unique** : Nginx gère tout le trafic (frontend, API et WebSockets).
-   **Résilience** : `depends_on` avec `condition: service_healthy` garantit que l'API démarre uniquement après que la base de données soit prête.
-   **Redémarrage automatique** : Tous les services sont configurés avec `restart: unless-stopped`.

---

## 🛠 Personnalisation

### 1. Modifier la Base de Données
Éditez le fichier `schema.sql` à la racine. Pour appliquer un changement de structure :
```powershell
docker-compose down -v     # Supprime les anciennes données
docker-compose up --build  # Relance avec le nouveau schéma
```

### 2. Développement en temps réel (Live Reload)
Les dossiers `frontend/` et `backend/` sont montés en **volumes Docker**. Cela signifie que :
-   Toute modification dans `frontend/public/app.js` est visible après un simple rafraîchissement (F5) de votre navigateur.
-   Toute modification dans `backend/main.ts` redémarre automatiquement le serveur interne grâce au mode watch de Deno.

---

## 📊 Endpoints API Disponibles

Accessible via le proxy sur `http://localhost/api/...

| Méthode | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/users/:id` | Récupère le profil d'un utilisateur |
| `POST` | `/api/auth/register` | Crée un compte utilisateur |
| `POST` | `/api/auth/login` | Connexion et récupération du JWT |
| `GET` | `/api/auth/verify` | Vérification du compte par email |
| `GET` | `/api/items` | Liste les annonces (filtres via query params) |
| `POST` | `/api/items` | Crée une nouvelle annonce |
| `GET` | `/api/items/:id` | Détails d'une annonce |
| `GET` | `/api/messages/:userId` | Messages d'un utilisateur |
| `POST` | `/api/messages` | Envoie un message |
| `GET` | `/api/loans/user/:userId` | Prêts d'un utilisateur |

---

## ⚠️ Notes Importantes
-   **Permissions Deno** : Le projet utilise les drapeaux `--allow-net`, `--allow-read` et `--allow-env` pour garantir une sécurité maximale tout en permettant le fonctionnement réseau.
-   **CORS** : Le backend est configuré pour accepter les requêtes provenant du proxy Nginx.
-   **WebSockets** : Le proxy Nginx est configuré pour supporter les connexions WebSocket sur `/ws/`.
