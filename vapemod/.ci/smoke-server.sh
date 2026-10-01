#!/usr/bin/env bash
# Starts a dedicated server with the mod, waits for "Done", stops it and fails on mod errors.
set -u
mkdir -p run
echo "eula=true" > run/eula.txt
printf 'online-mode=false\nlevel-type=minecraft\\:flat\nspawn-protection=0\n' > run/server.properties
mkfifo /tmp/srv_in
( ./gradlew --no-configuration-cache runServer < /tmp/srv_in > /tmp/server.log 2>&1; echo "exit=$?" >> /tmp/server.log ) &
exec 3>/tmp/srv_in
ok=0
for i in $(seq 1 600); do
  if grep -q 'Done (' /tmp/server.log; then ok=1; break; fi
  if grep -q '^exit=' /tmp/server.log; then break; fi
  sleep 1
done
if [ $ok = 1 ]; then
  sleep 5
  echo "stop" >&3
fi
for i in $(seq 1 120); do grep -q '^exit=' /tmp/server.log && break; sleep 1; done
exec 3>&-
echo "=== server log (filtered) ==="
grep -E 'vapemod|VapeMod|Vape Mod|ERROR|Exception|Caused by|Done \(|exit=' /tmp/server.log | head -300
echo "=== server log tail ==="
tail -60 /tmp/server.log
if [ $ok != 1 ]; then echo "Server did not start"; exit 1; fi
if grep -E '(ERROR|Exception).*' /tmp/server.log | grep -qi 'vapemod'; then echo "Mod errors found"; exit 1; fi
echo "Smoke test OK"
