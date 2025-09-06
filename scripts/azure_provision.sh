#!/usr/bin/env bash
set -euo pipefail

# Provision Azure resources for Kudos Pass (Azure)
# Requirements: az CLI logged in (az login), subscription set (az account set)

RG_NAME=${RG_NAME:-kudos-rg}
LOCATION=${LOCATION:-westeurope}
APP_NAME=${APP_NAME:-kudos-pass-azure-$RANDOM}
PLAN_NAME=${PLAN_NAME:-${APP_NAME}-plan}
COSMOS_ACCOUNT=${COSMOS_ACCOUNT:-${APP_NAME//-/}cosmos}
COSMOS_DB=${COSMOS_DB:-kudos}
COSMOS_CONTAINER=${COSMOS_CONTAINER:-items}
WEBPUBSUB_NAME=${WEBPUBSUB_NAME:-${APP_NAME//-/}wps}
WEBPUBSUB_HUB=${WEBPUBSUB_HUB:-kudos}

echo "Resource Group: $RG_NAME"
echo "Location:       $LOCATION"
echo "App Name:       $APP_NAME"

az group create -n "$RG_NAME" -l "$LOCATION" 1>/dev/null


echo "Creating Cosmos DB (API for MongoDB) ..."
az cosmosdb create -g "$RG_NAME" -n "$COSMOS_ACCOUNT" --kind MongoDB --server-version 7.0 --enable-free-tier true 1>/dev/null
az cosmosdb mongodb database create -a "$COSMOS_ACCOUNT" -g "$RG_NAME" -n "$COSMOS_DB" 1>/dev/null
az cosmosdb mongodb collection create -a "$COSMOS_ACCOUNT" -g "$RG_NAME" -d "$COSMOS_DB" -n "$COSMOS_CONTAINER" \
  --throughput 400 1>/dev/null

echo "Creating Web PubSub (Free F1) ..."
az webpubsub create -g "$RG_NAME" -n "$WEBPUBSUB_NAME" --sku Free_F1 1>/dev/null

echo "Creating App Service Plan (F1 Linux) ..."
az appservice plan create -g "$RG_NAME" -n "$PLAN_NAME" --sku F1 --is-linux 1>/dev/null || true

echo "Creating Web App (Node 20 LTS) ..."
az webapp create -g "$RG_NAME" -p "$PLAN_NAME" -n "$APP_NAME" --runtime "NODE|20-lts" 1>/dev/null


COSMOS_CONN_STRING=$(az cosmosdb keys list -n "$COSMOS_ACCOUNT" -g "$RG_NAME" --type connection-strings --query "connectionStrings[?description=='MongoDB shell connection string'].connectionString | [0]" -o tsv)
WEBPUBSUB_CONN_STRING=$(az webpubsub key show -n "$WEBPUBSUB_NAME" -g "$RG_NAME" --query primaryConnectionString -o tsv)
ORIGIN_URL="https://$APP_NAME.azurewebsites.net"

echo "Configuring app settings ..."
az webapp config appsettings set -g "$RG_NAME" -n "$APP_NAME" --settings \
  COSMOS_CONN_STRING="$COSMOS_CONN_STRING" \
  COSMOS_DB_NAME="$COSMOS_DB" \
  COSMOS_CONTAINER_NAME="$COSMOS_CONTAINER" \
  WEBPUBSUB_CONN_STRING="$WEBPUBSUB_CONN_STRING" \
  WEBPUBSUB_HUB="$WEBPUBSUB_HUB" \
  ORIGIN_URL="$ORIGIN_URL" \
  NODE_ENV=production 1>/dev/null

echo "Done. Web App URL: $ORIGIN_URL"
echo "Set AZURE_WEBAPP_NAME=$APP_NAME and AZURE_RG_NAME=$RG_NAME for CI."

