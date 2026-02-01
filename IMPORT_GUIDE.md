# Guide d'Importation/Exportation JSON

## 🔍 Problème Identifié

L'import JSON ne fonctionne pas comme attendu car :

1. **Les données persistent dans Docker** : Le fichier `db.json` est stocké dans `/opt/game-vault-data/` et survit même après `docker compose down`
2. **L'import ajoute des jeux** : Il n'écrase pas la base, il ajoute les jeux importés aux jeux existants

## ✅ Solutions

### Solution 1 : Vider la base avant d'importer

Pour **supprimer toutes les données** et repartir à zéro :

```bash
# Sur votre serveur
docker compose down -v  # Le flag -v supprime les volumes
docker compose up -d
```

> ⚠️ **ATTENTION** : Cette commande supprime TOUTES vos données actuelles !

### Solution 2 : Vider manuellement le fichier db.json

Si vous voulez garder le volume mais vider les données :

```bash
# Sur votre serveur
docker compose down
sudo sh -c 'echo "{\"games\":[]}" > /opt/game-vault-data/db.json'
docker compose up -d
```

## 📤 Exporter vos jeux

1. Ouvrez l'application Game Vault
2. Cliquez sur le bouton **Actions** (trois points)
3. Sélectionnez **Exporter JSON**
4. Le fichier sera téléchargé avec le nom `game-vault_YYYY-MM-DD.json`

## 📥 Importer vos jeux

### Méthode recommandée (avec base vide)

1. **Videz d'abord la base** (voir Solution 1 ou 2 ci-dessus)
2. Ouvrez l'application Game Vault
3. Cliquez sur **Actions** → **Importer JSON**
4. Sélectionnez votre fichier de sauvegarde
5. Les jeux seront importés et visibles immédiatement

### Vérification dans la console du navigateur

La nouvelle version améliorée affiche des logs détaillés dans la console :

1. Appuyez sur `F12` pour ouvrir les outils de développement
2. Allez dans l'onglet **Console**
3. Lors de l'import, vous verrez :
   - 🔍 Le nom du fichier importé
   - 📄 La taille du fichier
   - ✅ Le format détecté (Array ou Object.games)
   - 📦 Le nombre de jeux
   - ➡️ Chaque jeu en cours d'import
   - ✨ Le résumé final

**Si l'import échoue, la console vous dira exactement pourquoi !**

## 🐛 Déboguer un import qui ne fonctionne pas

Si vos jeux n'apparaissent pas après l'import :

1. **Vérifiez la console** (F12) pour voir les logs d'import
2. **Vérifiez le format JSON** :
   ```json
   [
     {
       "id": 1,
       "title": "The Legend of Zelda",
       "rating": 5,
       "genres": ["Action", "Adventure"],
       ...
     }
   ]
   ```
   OU
   ```json
   {
     "games": [
       {
         "id": 1,
         "title": "The Legend of Zelda",
         ...
       }
     ]
   }
   ```
3. **Vérifiez que la base est vide** avant l'import
4. **Vérifiez que l'API fonctionne** :
   ```bash
   curl http://localhost:8099/api/games
   ```

## 📋 Format JSON supporté

L'application supporte maintenant **deux formats** :

### Format 1 : Tableau direct (recommandé)
```json
[
  {
    "title": "Game Title",
    "rating": 5,
    "genres": ["Action"],
    "platform": "PC",
    "saga": "ZELDA",
    "order": 1,
    "isPlanned": false
  }
]
```

### Format 2 : Objet avec propriété games
```json
{
  "games": [
    {
      "title": "Game Title",
      ...
    }
  ]
}
```

## 🔄 Workflow complet pour migrer d'un serveur à l'autre

1. **Sur l'ancien serveur** :
   - Exportez vos jeux via l'interface
   - Téléchargez le JSON

2. **Sur le nouveau serveur** :
   - Installez Game Vault avec Docker
   - Videz la base (si nécessaire)
   - Importez votre JSON
   - Vérifiez que tout est bien là

3. **Répétez** pour chaque mise à jour future
