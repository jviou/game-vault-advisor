#!/bin/bash

# Script pour réinitialiser la base de données Game Vault
# Usage: ./reset-db.sh

echo "⚠️  ATTENTION: Ce script va SUPPRIMER toutes les données de Game Vault!"
echo ""
read -p "Êtes-vous sûr de vouloir continuer? (oui/non): " confirmation

if [ "$confirmation" != "oui" ]; then
    echo "❌ Opération annulée."
    exit 0
fi

echo ""
echo "📦 Arrêt des conteneurs..."
docker compose down

echo "🗑️  Suppression du volume de données..."
docker volume rm game-vault-advisor-main_game-vault-data 2>/dev/null || true

echo "🔄 Création d'une base vide..."
sudo mkdir -p /opt/game-vault-data
sudo sh -c 'echo "{\"games\":[]}" > /opt/game-vault-data/db.json'
sudo chmod 644 /opt/game-vault-data/db.json

echo "🚀 Redémarrage des conteneurs..."
docker compose up -d

echo ""
echo "✅ Base de données réinitialisée!"
echo "👉 Vous pouvez maintenant importer votre fichier JSON."
