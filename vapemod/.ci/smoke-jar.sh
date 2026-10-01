#!/usr/bin/env bash
# Stage 9 check: installs a clean Forge server with the official installer, puts ONLY the built
# jar into an empty mods folder and starts it.
set -u
MC=$(grep '^minecraft_version=' gradle.properties | cut -d= -f2)
FORGE=$(grep '^forge_version=' gradle.properties | cut -d= -f2)
JAR=$(ls build/libs/vapemod-*.jar | head -1)
DIR=/tmp/clean-server
rm -rf $DIR && mkdir -p $DIR && cd $DIR
curl -sSfL -o installer.jar "https://maven.minecraftforge.net/net/minecraftforge/forge/$MC-$FORGE/forge-$MC-$FORGE-installer.jar"
java -jar installer.jar --installServer . > install.log 2>&1 || { tail -30 install.log; echo "Forge install failed"; exit 1; }
mkdir -p mods && cp "$OLDPWD/$JAR" mods/
ls -la mods
echo "eula=true" > eula.txt
printf 'online-mode=false\nlevel-type=minecraft\\:flat\n' > server.properties
ls
if [ -f run.sh ]; then START="bash run.sh nogui"; else START="java -jar $(ls forge-*-shim.jar forge-*.jar 2>/dev/null | grep -v installer | head -1) nogui"; fi
echo "start: $START"
mkfifo in
( $START < in > server.log 2>&1; echo "exit=$?" >> server.log ) &
exec 3>in
ok=0
for i in $(seq 1 600); do
  grep -q 'Done (' server.log && { ok=1; break; }
  grep -q '^exit=' server.log && break
  sleep 1
done
[ $ok = 1 ] && { sleep 3; echo "stop" >&3; }
for i in $(seq 1 120); do grep -q '^exit=' server.log && break; sleep 1; done
exec 3>&-
grep -E 'vapemod|Vape Mod|ERROR|Done \(|exit=' server.log | grep -v kqueue | head -60
[ $ok = 1 ] || { tail -40 server.log; echo "Clean server did not start"; exit 1; }
grep -q 'Vape Mod loaded' server.log || { echo "Mod was not loaded from the jar"; exit 1; }
if grep -E 'ERROR|Exception' server.log | grep -qE 'vapemod:|com\.example\.vapemod|co\.ex\.va\.'; then echo "Mod errors found"; exit 1; fi
echo "Clean jar test OK"
