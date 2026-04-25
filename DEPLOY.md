# 🌿 PolyEarth - Guide de Déploiement

Ce projet est une application web moderne pour l'association **PolyEarth** de Polytech Montpellier. Il utilise **Deno** pour le backend et le frontend, et **PostgreSQL** pour la base de données.

---

## 🚀 Lancement Rapide

La méthode recommandée est d'utiliser **Docker Desktop**.

1.  Ouvrez un terminal à la racine du projet.
2.  Lancez tous les services :
    ```powershell
    docker-compose up --build
    ```
3.  Accédez à l'application :
    -   **Site Web (Frontend)** : [http://localhost:3000](http://localhost:3000)
    -   **API (Backend)** : [http://localhost:8000](http://localhost:8000)

---

## 🏗 Architecture du Projet

-   **/frontend** : Serveur Deno servant les fichiers statiques (HTML, CSS, JS).
    -   `public/index.html` : Structure de la page.
    -   `public/app.js` : Logique de navigation (SPA) et appels API.
-   **/backend** : API REST construite avec Deno et Oak.
    -   `main.ts` : Serveur et logique métier.
-   **schema.sql** : Définition de votre base de données PostgreSQL.

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

| Méthode | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/users` | Liste tous les utilisateurs |
| `POST` | `/api/users` | Crée un utilisateur (`{name, email}`) |
| `GET` | `/api/items` | Liste tous les objets |
| `POST` | `/api/items` | Ajoute un objet (Header `X-Sharer-User-Id` requis) |

---

## ⚠️ Notes Importantes
-   **Permissions Deno** : Le projet utilise les drapeaux `--allow-net`, `--allow-read` et `--allow-env` pour garantir une sécurité maximale tout en permettant le fonctionnement réseau.
-   **CORS** : Le backend est configuré pour accepter les requêtes provenant du port `3000` (frontend).
