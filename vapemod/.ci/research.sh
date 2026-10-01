#!/usr/bin/env bash
# Prints member signatures of the Minecraft/Forge classes listed in .ci/javap-classes.txt
# so the mod code can be checked against the real 26.2 API.
set -u
./gradlew -q --no-configuration-cache printCompileClasspath > /tmp/cp.txt
CP=$(paste -sd: /tmp/cp.txt)
echo "=== classpath jars containing net/minecraft ==="
for j in $(cat /tmp/cp.txt); do
  case "$j" in *.jar) unzip -l "$j" 2>/dev/null | grep -q 'net/minecraft/client/Minecraft.class\|net/minecraft/server/MinecraftServer.class' && echo "$j";; esac
done
if [ -f .ci/grep-classes.txt ]; then
  echo "=== class name search ==="
  for j in $(cat /tmp/cp.txt); do
    case "$j" in *.jar) unzip -Z1 "$j" 2>/dev/null | grep '\.class$' | grep -v '\$[0-9]' > /tmp/classes.txt
      while read -r pat; do [ -z "$pat" ] && continue; grep -E "$pat" /tmp/classes.txt | sed "s|^|[$pat] |"; done < .ci/grep-classes.txt;;
    esac
  done
fi
while read -r cls; do
  [ -z "$cls" ] && continue
  echo "=== $cls ==="
  javap -protected -cp "$CP" "$cls" 2>&1 | grep -v '^Compiled from'
done < .ci/javap-classes.txt
