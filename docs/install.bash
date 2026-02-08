#!/usr/bin/env bash

BGIT_HOME="$HOME/.bgit"
mkdir -p $BGIT_HOME
cd $BGIT_HOME

OS=$(uname -s | tr '[:upper:]' '[:lower:]')
ARCH=$(uname -m)

if [ "$ARCH" = "x86_64" ]; then
  ARCH="x64"
elif [ "$ARCH" = "arm64" ] || [ "$ARCH" = "aarch64" ]; then
  ARCH="arm64"
else
  echo "❌ Unsupported architecture: $ARCH"
  exit 1
fi

case "$OS" in
  windows|mingw*|msys*|cygwin*) FILE="bun-windows-${ARCH}.exe" ;;
  *) FILE="bun-${OS}-${ARCH}" ;;
esac

API_URL="https://api.github.com/repos/plopix/bgit/releases/latest"
RESPONSE=$(curl -s "$API_URL")

LATEST_RELEASE=$(echo "$RESPONSE" | grep '"tag_name":' | cut -d'"' -f 4)

if [ -z "$LATEST_RELEASE" ]; then
  ERROR_MSG=$(echo "$RESPONSE" | grep '"message":' | cut -d'"' -f 4)
  if [ -z "$ERROR_MSG" ]; then
    ERROR_MSG="Unable to determine latest release. GitHub might be down or rate limited. Can you reach: $API_URL ?"
  fi
  echo "❌ Error fetching latest release: $ERROR_MSG"
  exit 1
fi
URL="https://github.com/plopix/bgit/releases/download/${LATEST_RELEASE}/bgit-${FILE}"

echo "🌍 Detected platform: ${OS}-${ARCH}"
echo "📥 Downloading file: ${URL}"

if curl -fLO "${URL}"; then
  echo "✅ Successfully downloaded ${FILE}"
else
  echo "❌ Failed to download ${FILE}. Please check the URL or platform."
  exit 1
fi

ln -sf $BGIT_HOME/bgit-${FILE} $HOME/bgit
chmod +x $HOME/bgit

echo "You can now use bgit by running: ~/bgit"
echo ""
echo "- You may want to put ~/bgit in you PATH"
echo "- You may want to creat an alias (in your .zshrc or .bashrc) alias bgit='~/bgit'"

~/bgit
exec "$SHELL" -l
