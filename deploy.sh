#!/bin/bash
set -e

export JAVA_HOME="C:/Program Files/Java/jdk-21.0.10"
export PATH="$JAVA_HOME/bin:$PATH"

ROOT="c:/Users/SEIFN/Desktop/Inventaire dendro/geonav-pro_V6/Geonavigateur Forestier"
DEPLOY="c:/Users/SEIFN/Desktop/Deploiement dashboard"

echo "=== 1/4  Building frontend ==="
cd "$ROOT/Frontend"
npm run build

echo "=== 2/4  Copying dist to backend static ==="
rm -rf "$ROOT/Backend/src/main/resources/static"
mkdir -p "$ROOT/Backend/src/main/resources/static"
cp -r dist/* "$ROOT/Backend/src/main/resources/static/"

echo "=== 3/4  Building backend JAR ==="
cd "$ROOT/Backend"
./mvnw clean package -DskipTests -q

echo "=== 4/4  Copying JAR to deployment folder ==="
cp target/*.jar "$DEPLOY/"

echo ""
echo "=== Done! Restart the service to apply changes ==="
