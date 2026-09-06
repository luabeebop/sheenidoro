# Maintainer: Sheenidoro <sheenidoro@local>
pkgname=sheenidoro
pkgver=1.0.0
pkgrel=1
pkgdesc="Pastel sakura pomodoro for Omarchy — Electron + React, track breaks"
arch=('x86_64')
url="https://github.com/local/sheenidoro"
license=('MIT')
depends=('electron37' 'libnotify' 'libpulse')
makedepends=('npm' 'nodejs')
source=()
sha256sums=()

build() {
  cd "$startdir"
  npm ci --ignore-scripts
  npm run build
  npx tsc -p tsconfig.electron.json
}

package() {
  cd "$startdir"
  install -dm755 "$pkgdir/opt/sheenidoro"
  install -dm755 "$pkgdir/usr/bin"
  install -dm755 "$pkgdir/usr/share/applications"
  install -dm755 "$pkgdir/usr/share/icons/hicolor/512x512/apps"
  install -dm755 "$pkgdir/usr/share/icons/hicolor/256x256/apps"
  install -dm755 "$pkgdir/usr/share/icons/hicolor/128x128/apps"
  install -dm755 "$pkgdir/usr/share/icons/hicolor/64x64/apps"

  # app files
  cp -r dist dist-electron package.json resources assets "$pkgdir/opt/sheenidoro/" 2>/dev/null || true
  # icons
  install -Dm644 resources/icon.png "$pkgdir/usr/share/icons/hicolor/512x512/apps/sheenidoro.png"
  install -Dm644 resources/icon-256.png "$pkgdir/usr/share/icons/hicolor/256x256/apps/sheenidoro.png"
  install -Dm644 resources/icon-128.png "$pkgdir/usr/share/icons/hicolor/128x128/apps/sheenidoro.png"
  install -Dm644 resources/icon-64.png "$pkgdir/usr/share/icons/hicolor/64x64/apps/sheenidoro.png"
  install -Dm644 resources/sheenidoro.desktop "$pkgdir/usr/share/applications/sheenidoro.desktop"

  # wrapper uses system electron37
  cat > "$pkgdir/usr/bin/sheenidoro" <<'WRAP'
#!/usr/bin/env bash
set -e
APPDIR="/opt/sheenidoro"
ELECTRON="/usr/bin/electron37"
if [ ! -x "$ELECTRON" ]; then ELECTRON="electron"; fi
exec "$ELECTRON" "$APPDIR/dist-electron/electron/main.js" "$@"
WRAP
  chmod +x "$pkgdir/usr/bin/sheenidoro"

  # waybar helper
  install -Dm755 scripts/waybar-sheenidoro.sh "$pkgdir/usr/share/sheenidoro/waybar-sheenidoro.sh"
}
