#!/bin/bash
# Установка службы oak-printer для текущего пользователя (запускать БЕЗ sudo).
set -euo pipefail
cd "$(dirname "$0")/.."

npm ci --omit=dev

mkdir -p ~/.config/systemd/user
[ -f ~/.config/oak-printer.env ] || cp deploy/oak-printer.env.example ~/.config/oak-printer.env
ln -sf "$PWD/deploy/oak-printer.service" ~/.config/systemd/user/oak-printer.service

systemctl --user daemon-reload
systemctl --user enable --now oak-printer.service

if ! id -nG | grep -qw dialout; then
  echo
  echo "!! Нет доступа к COM-порту. Выполните один раз и перезайдите в систему:"
  echo "   sudo usermod -aG dialout $USER"
fi
if [ "$(loginctl show-user "$USER" -p Linger --value)" != "yes" ]; then
  echo "!! Чтобы служба работала без входа в систему:"
  echo "   sudo loginctl enable-linger $USER"
fi
echo
echo "Статус:  systemctl --user status oak-printer"
echo "Журнал:  journalctl --user -u oak-printer -f"
