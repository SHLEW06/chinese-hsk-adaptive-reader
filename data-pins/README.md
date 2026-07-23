# Pinned dictionary source

`cedict-2026-07-13.txt.gz` is the reproducible CC-CEDICT snapshot used by the
dictionary build. Its decompressed SHA-256 and release timestamp are declared
in `scripts/lib/dictionary-quality.mjs` and verified by the fetch/build scripts.

CC-CEDICT is redistributed under CC BY-SA 4.0. See
[`THIRD_PARTY_NOTICES.md`](../THIRD_PARTY_NOTICES.md) for attribution, license
terms, source pins, and the modification notice. The HSK JSON is fetched from
an immutable Git commit and therefore is not vendored here.
