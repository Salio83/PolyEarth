# PolyEarth - Application de Partage d'Objets

PolyEarth est une plateforme web collaborative de partage d'objets, conçue pour l'association étudiante **PolyEarth** de Polytech Montpellier. Ce projet encourage l'économie circulaire au sein du campus en permettant aux étudiants et personnels de prêter, emprunter et s'échanger des objets inutilisés.

L'application est construite avec **Deno** (Oak) pour le backend, **Vanilla HTML/CSS/JS** pour le frontend, et **PostgreSQL** pour la persistance des données, le tout orchestré de manière sécurisée par **Docker Compose** et un reverse proxy **Nginx**.

---

## 🏗 Architecture & Restructuration du Projet

Le backend a été restructuré de façon modulaire et hautement sécurisée pour éviter les fichiers monolithiques et centraliser la configuration.

```
PolyEarth/
├── backend/                  # API REST & WebSocket (Deno)
│   ├── middleware/
│   │   └── auth.ts           # Middleware de vérification JWT
│   ├── routes/
│   │   ├── auth.ts           # Inscription, connexion, vérification d'email
│   │   ├── items.ts          # Gestion des annonces et réservations d'objets
│   │   ├── loans.ts          # Gestion des prêts, extensions et retards
│   │   ├── messages.ts       # Discussions instantanées & WebSockets
│   │   ├── reviews.ts        # Évaluations & commentaires
│   │   └── users.ts          # Profils utilisateurs
│   ├── services/
│   │   ├── email.ts          # Simulation/Envoi de courriels
│   │   └── websocket.ts      # Gestion des sockets et notifications temps réel
│   ├── utils/
│   │   ├── rate_limit.ts     # Limiteur de débit (Rate Limiting) anti-brute-force
│   │   └── validators.ts     # Validateurs d'entrées et sanitisation
│   ├── config.ts             # Centralisation de la configuration (Deno.env)
│   ├── db.ts                 # Connexion PostgreSQL & migrations automatiques
│   ├── Dockerfile            # Image Docker du backend
│   └── main.ts               # Point d'entrée principal (Oak application)
├── frontend/                 # Serveur Frontend (Deno Oak)
│   ├── public/               # Fichiers statiques servis au navigateur (SPA)
│   │   ├── app.js            # Logique frontend, gestion des routes & WS
│   │   └── index.html        # Point d'entrée utilisateur unique
│   ├── server.ts             # Serveur Deno servant les pages et fichiers statiques
│   └── Dockerfile            # Image Docker du frontend
├── nginx/
│   └── default.conf          # Configuration du Reverse Proxy Nginx
├── .github/workflows/
│   └── ci.yml                # Pipeline CI/CD (GitHub Actions)
├── docker-compose.yml        # Orchestration multi-conteneurs
└── schema.sql                # Schéma initial de la base de données SQL
```

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
1. Créez un fichier `.env` à la racine du projet avec les configurations suivantes :
   ```env
   POSTGRES_DB=polyearth
   POSTGRES_USER=root
   POSTGRES_PASSWORD=votre_mot_de_passe_local
   JWT_SECRET=un_secret_tres_long_de_plus_de_32_caracteres
   NODE_ENV=development
   APP_URL=http://localhost
   ```
   *Note : En mode `development`, le système de validation d'email est contourné et valide automatiquement les nouveaux comptes pour faciliter les tests.*

2. Démarrez l'application :
   ```bash
   docker compose up --build
   ```

3. Ouvrez votre navigateur sur [http://localhost](http://localhost).

---

## 🚀 Déploiement en Production

Pour déployer PolyEarth sur un serveur de production (VPS Linux sous Debian/Ubuntu) :

### 1. Préparer le serveur
Installez Docker et Git sur le serveur :
```bash
sudo apt update
sudo apt install -y docker.io docker-compose git
```

### 2. Cloner le projet et créer le fichier `.env` de production
Clonez le dépôt Git du projet et créez le fichier `.env` :
```env
POSTGRES_DB=polyearth
POSTGRES_USER=db_prod_user
POSTGRES_PASSWORD=MOT_DE_PASSE_TRES_FORT_ET_SECRET
JWT_SECRET=CLE_JWT_FORTEMENT_ALEATOIRE_ET_TRES_LONGUE_HAUTEMENT_SECURISEE
NODE_ENV=production
APP_URL=https://votre-domaine.com
```

### 3. Configurer SSL/TLS (HTTPS) avec Certbot / Let's Encrypt
Pour sécuriser l'application en production, il est indispensable de passer par du HTTPS.

Modifiez le fichier `nginx/default.conf` sur votre serveur pour écouter sur le port `443` et pointer vers vos certificats SSL, ou utilisez **Certbot** pour configurer Nginx automatiquement.

Exemple de script Certbot :
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d votre-domaine.com
```

### 4. Démarrer l'application
Démarrez les conteneurs en tâche de fond (détachés) :
```bash
docker compose up -d --build
```

---

## 🔄 Pipeline CI/CD (GitHub Actions)

L'application intègre un workflow CI/CD complet via GitHub Actions (défini dans `.github/workflows/ci.yml`).

### Validation (CI)
À chaque modification de code poussée (`push`) ou demande d'intégration (`pull request`) sur la branche `main` :
1. **Linting** : Deno vérifie que le code backend respecte les standards de qualité (`deno lint`).
2. **Build Test** : Docker tente de construire l'ensemble des conteneurs pour s'assurer qu'aucun changement ne casse le déploiement.

### Déploiement Continu (CD)
Si toutes les étapes de validation (CI) réussissent et que le code est fusionné sur la branche `main`, le déploiement sur votre serveur de production est automatique.

#### Configuration des secrets de déploiement sur GitHub :
Sur votre dépôt GitHub, allez dans **Settings > Secrets and variables > Actions > New repository secret** et ajoutez :
- `SSH_HOST` : Adresse IP de votre serveur de production.
- `SSH_USER` : Utilisateur SSH (ex: `ubuntu`, `debian` ou `root`).
- `SSH_KEY` : Clé privée SSH autorisée sur le serveur (sans mot de passe).

*Pensez à modifier le chemin d'accès au projet `/home/votre_utilisateur/PolyEarth` dans le script `.github/workflows/ci.yml` pour correspondre à votre serveur.*
