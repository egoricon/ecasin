#!/usr/bin/env bash
# Prints selected member signatures of Minecraft/Forge classes (and optionally the bytecode of
# selected methods) so the mod code can be checked against the real 26.2 API.
#   .ci/javap-queries.txt : "<class> <egrep regex>"   -> matching members only
#   .ci/javap-code.txt    : "<class> <method name>"   -> bytecode of that method (constants only)
#   .ci/grep-classes.txt  : "<regex>"                 -> class names in the classpath jars
set -u
./gradlew -q --no-configuration-cache printCompileClasspath > /tmp/cp.txt
CP=$(paste -sd: /tmp/cp.txt)
if [ -f .ci/grep-classes.txt ]; then
  echo "=== class name search ==="
  for j in $(cat /tmp/cp.txt); do
    case "$j" in *.jar) unzip -Z1 "$j" 2>/dev/null | grep '\.class$' | grep -v '\$[0-9]' >> /tmp/classes.txt;; esac
  done
  while read -r pat; do [ -z "$pat" ] && continue; grep -E "$pat" /tmp/classes.txt | sed 's|\.class$||; s|/|.|g' | sort -u | tr '\n' ' '; echo; done < .ci/grep-classes.txt
fi
if [ -f .ci/javap-queries.txt ]; then
  while read -r cls re; do
    [ -z "$cls" ] && continue
    echo "=== $cls :: $re"
    javap -protected -cp "$CP" "$cls" 2>&1 | grep -v '^Compiled from' | grep -E "class |interface |enum |record |$re" | sed 's/^  //'
  done < .ci/javap-queries.txt
fi
if [ -f .ci/javap-code.txt ]; then
  while read -r cls m; do
    [ -z "$cls" ] && continue
    echo "=== CODE $cls.$m"
    javap -c -p -cp "$CP" "$cls" 2>&1 | awk -v m=" $m(" 'index($0, m) && /\(/ {p=1} p && /^$/ {p=0} p' | grep -E "$m\(|push|iconst|ldc|invoke|getfield|getstatic" | sed -E 's/^ +//; s/\/\/ //' | head -400
  done < .ci/javap-code.txt
fi
