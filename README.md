# 🎮 Game Vault Advisor

Application web pour gérer votre collection de jeux vidéo, organisée par sagas et avec un système de planification.

## 🚀 Installation avec Docker

### Prérequis
- Docker et Docker Compose installés
- Un dossier pour les données : `/opt/game-vault-data/`

### Démarrage rapide

1. **Cloner le projet** :
   ```bash
   git clone https://github.com/jviou/game-vault-advisor.git
   cd game-vault-advisor
   ```

2. **Configuration** :
   Créez un fichier `.env` avec votre clé SteamGridDB :
   ```
   SGDB_KEY=votre_cle_api_ici
   ```

3. **Créer le dossier de données** :
   ```bash
   sudo mkdir -p /opt/game-vault-data
   sudo sh -c 'echo "{\"games\":[]}" > /opt/game-vault-data/db.json'
   ```

4. **Lancer l'application** :
   ```bash
   docker compose up -d
   ```

5. **Accéder à l'application** :
   Ouvrez votre navigateur sur `http://localhost:8099`

## 📤📥 Import/Export de données

### Exporter vos jeux
- Cliquez sur **Actions** → **Exporter JSON**
- Un fichier `game-vault_YYYY-MM-DD.json` sera téléchargé

### Importer vos jeux

**⚠️ IMPORTANT** : L'import **ajoute** les jeux, il ne remplace pas la base !

Pour importer une sauvegarde **en remplaçant** la base actuelle :

1. **Videz d'abord la base** :
   ```bash
   ./reset-db.sh
   ```
   OU manuellement :
   ```bash
   docker compose down -v
   docker compose up -d
   ```

2. **Importez ensuite votre JSON** :
   - Actions → Importer JSON
   - Sélectionnez votre fichier

3. **Vérifiez la console du navigateur** (F12) pour voir les logs détaillés d'import

📖 **[Guide complet d'import/export](IMPORT_GUIDE.md)**

## 🏗️ Architecture

- **Frontend** : React + TypeScript + Vite
- **Backend API** : json-server (base de données JSON simple)
- **Proxy** : nginx
- **Service tiers** : SteamGridDB pour les jaquettes

### Services Docker

- `game-vault` (port 8099) : Application web
- `game-vault-db` : API json-server
- `game-vault-sgdb` : Proxy pour SteamGridDB

## 🛠️ Développement local

```bash
# Installer les dépendances
npm install

# Lancer en mode dev
npm run dev
```

## 📂 Structure du projet

```
.
├── src/                    # Code source React
│   ├── components/         # Composants réutilisables
│   ├── pages/             # Pages de l'app
│   ├── lib/               # Utilitaires (API, etc.)
│   └── hooks/             # Hooks React personnalisés
├── server/                # Proxy SteamGridDB
├── public/                # Assets statiques
├── docker-compose.yml     # Configuration Docker
├── IMPORT_GUIDE.md        # Guide détaillé import/export
└── reset-db.sh           # Script pour réinitialiser la DB

```

## 🐛 Dépannage

### Les jeux n'apparaissent pas après import

1. Ouvrez la console du navigateur (F12)
2. Regardez les logs d'import (🔍, 📦, ➡️, ✨)
3. Vérifiez que la base était vide avant l'import
4. Consultez le [guide d'import](IMPORT_GUIDE.md)

### Réinitialiser complètement la base

```bash
docker compose down -v
docker compose up -d
```

## 📝 Fonctionnalités

- ✅ Gestion de collection de jeux
- ✅ Organisation par sagas
- ✅ Section "À faire" pour les jeux planifiés
- ✅ Recherche et filtres avancés
- ✅ Import/export JSON avec logs détaillés
- ✅ Intégration SteamGridDB pour les jaquettes
- ✅ Interface responsive (mobile + desktop)
- ✅ PWA (Progressive Web App)

## 🔐 Données persistantes

Les données sont stockées dans `/opt/game-vault-data/db.json` qui persiste entre les redémarrages de conteneurs.

**Pour sauvegarder vos données**, exportez régulièrement en JSON !

## 📜 Licence

(Ajoutez votre licence ici)
