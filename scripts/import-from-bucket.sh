#!/usr/bin/env bash
set -euo pipefail

BUCKET="${BUCKET:-vladimir-petrishchev}"
DESTINATION="${1:-reference-deployment}"
MANIFEST="$(mktemp)"
trap 'rm -f "$MANIFEST"' EXIT

curl --fail --silent --show-error --location \
  "https://storage.googleapis.com/storage/v1/b/${BUCKET}/o?alt=json&maxResults=1000" \
  > "$MANIFEST"

mkdir -p "$DESTINATION"

jq -r '.items[] | [.name, (.name | @uri)] | @tsv' "$MANIFEST" |
while IFS=$'\t' read -r object_name encoded_name; do
  target="$DESTINATION/$object_name"
  mkdir -p "$(dirname "$target")"
  curl --fail --silent --show-error --location \
    "https://storage.googleapis.com/download/storage/v1/b/${BUCKET}/o/${encoded_name}?alt=media" \
    --output "$target"
done

printf 'Imported %s objects from gs://%s into %s\n' \
  "$(jq '.items | length' "$MANIFEST")" "$BUCKET" "$DESTINATION"
