# PolyEarth - Application de Partage d'Objets

PolyEarth est une plateforme web collaborative de partage d'objets, conçue pour l'association étudiante **PolyEarth** de Polytech Montpellier. Ce projet encourage l'économie circulaire sur le campus en permettant aux étudiants et personnels de prêter, emprunter et s'échanger des objets inutilisés.

L'application est construite avec **Deno** (Oak) pour le backend, **Vanilla HTML/CSS/JS (Modules ESM)** pour le frontend, et **PostgreSQL** pour la persistance des données, le tout orchestré de manière sécurisée par **Docker Compose** et un reverse proxy **Nginx**.

---

## 🏗 Architecture & Restructuration du Projet

Le backend a été restructuré de façon modulaire et sécurisée pour éviter les fichiers monolithiques et centraliser la configuration.

PolyEarth/
├── backend/                # API REST & WebSocket (Deno)
│   ├── middleware/
│   │   └── auth.ts         # Middleware de vérification JWT
│   ├── routes/
│   │   ├── auth.ts         # Inscription, connexion, vérification d'email
│   │   ├── items.ts        # Gestion des annonces et réservations d'objets
│   │   ├── loans.ts        # Gestion des prêts, extensions et retards
│   │   ├── messages.ts     # Discussions instantanées & WebSockets
│   │   ├── reviews.ts      # Évaluations & commentaires
│   │   └── users.ts        # Profils utilisateurs
│   ├── services/
│   │   ├── email.ts        # Simulation/Envoi de courriels
│   │   └── websocket.ts    # Gestion des sockets et notifications temps réel
│   ├── utils/
│   │   ├── rate_limit.ts   # Limiteur de débit (Rate Limiting) anti-brute-force
│   │   └── validators.ts   # Validateurs d'entrées et sanitisation
│   ├── config.ts           # Centralisation de la configuration (Deno.env)
│   ├── db.ts               # Connexion PostgreSQL & migrations automatiques
│   ├── Dockerfile          # Image Docker du backend
│   └── main.ts             # Point d'entrée principal (Oak application)
├── frontend/               # Serveur Frontend (Deno Oak)
│   ├── public/             # Fichiers statiques servis au navigateur (SPA)
│   │   ├── app.js          # Logique frontend, gestion des routes & WS
│   │   └── index.html      # Point d'entrée utilisateur unique
│   ├── server.ts           # Serveur Deno servant les pages et fichiers statiques
│   └── Dockerfile          # Image Docker du frontend
├── nginx/
│   └── default.conf        # Configuration du Reverse Proxy Nginx
├── .github/workflows/
│   └── ci.yml              # Pipeline CI/CD (GitHub Actions)
├── docker-compose.yml      # Orchestration multi-conteneurs
└── schema.sql              # Schéma initial de la base de données SQL


---

## 🔌 Ports Exposés

Pour maximiser la sécurité de l'application, aucun service (API, Base de données, Frontend) n'est directement accessible depuis l'adresse IP de l'hôte, à l'exception de **Nginx**.

| Service | Port Interne | Port Externe (Hôte) | Accessibilité |
| :--- | :--- | :--- | :--- |
| **Nginx Proxy** | `80` (HTTP) | **`80`** | **Publique** (Unique point d'entrée) |
| **Frontend** | `3000` | *Non exposé* | Uniquement via Nginx (`proxy_pass http://front:3000`) |
| **Backend API** | `8000` | *Non exposé* | Uniquement via Nginx (`proxy_pass http://api:8000`) |
| **PostgreSQL** | `5432` | *Non exposé* | Uniquement via l'API sur le réseau privé Docker |

---

## 🛠 Lancement en Local (Développement)

### Prérequis
- Avoir [Docker Desktop](https://www.docker.com/products/docker-desktop/) installé et démarré.

### Étapes de démarrage
1. Créez un fichier `.env` à la racine du projet en vous basant sur la structure ci-dessous :
   ```env
   POSTGRES_DB=polyearth
   POSTGRES_USER=polyearth_user
   POSTGRES_PASSWORD=votre_mot_de_passe_securise
   JWT_SECRET=votre_cle_jwt_secrete_longue
   NODE_ENV=development
   APP_URL=http://localhost

⚠️ Important : Ne jamais commiter votre fichier .env dans le gestionnaire de versions (assurez-vous qu'il est bien présent dans votre .gitignore).

    Démarrez l'application :
    Bash

    docker compose up --build

    Ouvrez votre navigateur sur http://localhost.

🚀 Déploiement en Production

Pour déployer PolyEarth sur un serveur de production (VPS Linux) :
1. Préparer le serveur

Installez Docker et Git sur le serveur, puis clonez le dépôt.
2. Configurer les variables d'environnement

Créez un fichier .env de production avec des mots de passe robustes et uniques :
Extrait de code

POSTGRES_DB=polyearth
POSTGRES_USER=polyearth_prod_user
POSTGRES_PASSWORD=MOT_DE_PASSE_TRES_FORT_ET_SECRET
JWT_SECRET=CLE_JWT_FORTEMENT_ALEATOIRE_ET_TRES_LONGUE_HAUTEMENT_SECURISEE
NODE_ENV=production
APP_URL=[https://votre-domaine.com](https://votre-domaine.com)

3. Persistance et volumes

Veillez à ce que vos services de base de données utilisent des volumes Docker nommés pour garantir la durabilité des données lors des mises à jour des conteneurs.
4. Configurer SSL/TLS (HTTPS) avec Certbot

Utilisez Certbot pour sécuriser les flux via Nginx :
Bash

sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d votre-domaine.com

5. Démarrer l'application

Lancez les conteneurs en arrière-plan :
Bash

docker compose up -d --build

🔄 Pipeline CI/CD (GitHub Actions)

L'application intègre un workflow CI/CD complet via GitHub Actions (.github/workflows/ci.yml).

    Validation (CI) : À chaque push ou pull request sur la branche main, Deno effectue un contrôle de la qualité du code (deno lint) et Docker valide la compilation des images.

    Déploiement Continu (CD) : En cas de succès des tests sur la branche principale, le déploiement sur le serveur cible peut être automatisé via des clés SSH sécurisées configurées dans les Secrets du dépôt GitHub.
