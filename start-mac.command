#!/bin/bash
# Human Atlas Learning Studio: one-click local start for macOS.
# Double-click in Finder. It checks Node and MongoDB, installs dependencies the first time,
# starts the API (port 5050) and the React app (port 3016), then opens the browser.
cd "$(dirname "$0")" || exit 1
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
bold(){ printf "\n\033[1m%s\033[0m\n" "$1"; }

bold "1/5 Checking Node.js"
if ! command -v node >/dev/null; then echo "Node.js is not installed. Install Node 22 LTS from https://nodejs.org and run this again."; read -r -p "Press Return to close."; exit 1; fi
echo "Node $(node -v)"

bold "2/5 Checking MongoDB"
if nc -z 127.0.0.1 27017 2>/dev/null; then echo "MongoDB is already running on 127.0.0.1:27017"
elif command -v brew >/dev/null; then
  if ! brew list mongodb-community >/dev/null 2>&1; then
    echo "Installing MongoDB Community Server with Homebrew (first time only, a few minutes)..."
    brew tap mongodb/brew
    # Newer Homebrew only installs from third-party taps you have trusted.
    brew trust mongodb/brew >/dev/null 2>&1 || brew trust --formula mongodb/brew/mongodb-community >/dev/null 2>&1 || true
    HOMEBREW_NO_AUTO_UPDATE=1 brew install mongodb/brew/mongodb-community
  fi
  brew services start mongodb-community
  for i in $(seq 1 30); do nc -z 127.0.0.1 27017 2>/dev/null && break; sleep 1; done
  nc -z 127.0.0.1 27017 2>/dev/null && echo "MongoDB started" || echo "MongoDB did not start. Check: brew services list"
else
  echo "MongoDB is not running and Homebrew is not installed."
  echo "Either install MongoDB Community Server (https://www.mongodb.com/try/download/community) or put a MongoDB Atlas URI in server/.env."
fi

bold "3/5 Preparing server/.env"
if [ ! -f server/.env ]; then
  cp server/.env.example server/.env
  secret=$(node -e "process.stdout.write(require('crypto').randomBytes(48).toString('hex'))")
  sed -i '' "s|^JWT_SECRET=.*|JWT_SECRET=$secret|" server/.env
  echo "Created server/.env with a new random JWT secret"
else echo "server/.env already exists"; fi

bold "4/5 Installing dependencies (first run takes a minute)"
# npm ci installs exactly what package-lock.json lists and never rewrites it.
[ -d server/node_modules ] || npm --prefix server ci --no-audit --no-fund
[ -d client/node_modules ] || npm --prefix client ci --no-audit --no-fund

bold "5/5 Starting the API and the React app"
# Stop a copy left running by an earlier start.
for port in 5050 3016; do pids=$(lsof -ti tcp:$port 2>/dev/null); [ -n "$pids" ] && kill $pids 2>/dev/null; done
sleep 1
mkdir -p .logs
# The API runs without --watch: synced folders (iCloud Documents) touch files and would restart it constantly.
npm --prefix server start > .logs/server.log 2>&1 & API=$!
npm --prefix client run dev > .logs/client.log 2>&1 & WEB=$!
trap 'echo; echo "Stopping..."; kill $API $WEB 2>/dev/null; exit 0' INT TERM
for i in $(seq 1 60); do nc -z 127.0.0.1 3016 2>/dev/null && nc -z 127.0.0.1 5050 2>/dev/null && break; sleep 1; done
curl -s http://127.0.0.1:5050/api/health; echo
open "http://localhost:3016"
bold "Running. App: http://localhost:3016   API: http://localhost:5050/api/health"
echo "Logs are in .logs/. Press Ctrl+C here to stop both servers."
wait
