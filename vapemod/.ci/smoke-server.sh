#!/usr/bin/env bash
# Starts a dedicated server with the mod, waits for "Done", stops it and fails on mod errors.
set -u
mkdir -p run
echo "eula=true" > run/eula.txt
cat > run/server.properties <<'PROPS'
online-mode=false
level-type=minecraft\:flat
generator-settings={"layers"\:[{"block"\:"minecraft\:bedrock","height"\:1},{"block"\:"minecraft\:dirt","height"\:2},{"block"\:"minecraft\:grass_block","height"\:1}],"biome"\:"minecraft\:plains"}
spawn-protection=0
gamemode=survival
PROPS
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
  sleep 3
  # exercise registries and the liquid data component through console commands
  echo 'forceload add 0 0 16 16' >&3
  sleep 3
  echo 'summon minecraft:armor_stand 0 -60 0 {Tags:["vt"],NoGravity:1b}' >&3
  sleep 1
  echo 'effect give @e[tag=vt,limit=1] vapemod:cough 5' >&3
  echo 'effect give @e[tag=vt,limit=1] vapemod:craving 5' >&3
  echo 'setblock 1 -60 1 minecraft:chest' >&3
  echo 'item replace block 1 -60 1 container.0 with vapemod:vape[vapemod:liquid={flavor:"mint",puffs:7,capacity:40}]' >&3
  echo 'item replace block 1 -60 1 container.1 with vapemod:liquid_apple 3' >&3
  echo 'data get block 1 -60 1 Items' >&3
  sleep 4
  echo "stop" >&3
fi
for i in $(seq 1 120); do grep -q '^exit=' /tmp/server.log && break; sleep 1; done
exec 3>&-
echo "=== server log (filtered) ==="
grep -E 'vapemod|VapeMod|Vape Mod|ERROR|Exception|Caused by|Done \(|exit=|Applied effect|has the following|Replaced a slot|Changed the block|Summoned|forceload|not loaded|No entity|Unknown|Expected|Invalid|Malformed' /tmp/server.log | grep -v kqueue | head -300
echo "=== server log tail ==="
tail -60 /tmp/server.log
if [ $ok != 1 ]; then echo "Server did not start"; exit 1; fi
grep -q 'Applied effect' /tmp/server.log || { echo "Effect command failed"; exit 1; }
grep -q 'vapemod:liquid' /tmp/server.log || { echo "Liquid component not found in chest data"; exit 1; }
if grep -E '(ERROR|Exception).*' /tmp/server.log | grep -qi 'vapemod'; then echo "Mod errors found"; exit 1; fi
echo "Smoke test OK"
