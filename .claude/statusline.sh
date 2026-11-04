#!/usr/bin/env bash
# Статус-строка Claude Code: полоски лимитов 5-часового и недельного планов.
# Читает JSON со stdin (поле rate_limits.five_hour / rate_limits.seven_day).
input=$(cat)

bar() { # $1 = процент, $2 = метка, $3 = unix-время сброса
  local pct=${1%.*} label=$2 reset=$3 width=10 color filled empty b="" i
  [ -z "$pct" ] && { printf '%s --' "$label"; return; }
  [ "$pct" -gt 100 ] && pct=100
  filled=$(( pct * width / 100 )); empty=$(( width - filled ))
  if   [ "$pct" -ge 90 ]; then color=31   # красный
  elif [ "$pct" -ge 70 ]; then color=33   # жёлтый
  else color=32; fi                       # зелёный
  for ((i=0;i<filled;i++)); do b+="█"; done
  for ((i=0;i<empty;i++));  do b+="░"; done
  local left=""
  if [ -n "$reset" ]; then
    local s=$(( reset - $(date +%s) ))
    if [ "$s" -gt 0 ]; then
      if [ "$s" -ge 86400 ]; then left=" ($((s/86400))д $((s%86400/3600))ч)"
      else left=" ($((s/3600))ч $((s%3600/60))м)"; fi
    fi
  fi
  printf '%s \033[%sm%s\033[0m %s%%%s' "$label" "$color" "$b" "$pct" "$left"
}

p5=$(jq -r '.rate_limits.five_hour.used_percentage // empty' <<<"$input")
r5=$(jq -r '.rate_limits.five_hour.resets_at // empty' <<<"$input")
p7=$(jq -r '.rate_limits.seven_day.used_percentage // empty' <<<"$input")
r7=$(jq -r '.rate_limits.seven_day.resets_at // empty' <<<"$input")

printf '%s  │  %s\n' "$(bar "$p5" '5ч' "$r5")" "$(bar "$p7" 'Неделя' "$r7")"
