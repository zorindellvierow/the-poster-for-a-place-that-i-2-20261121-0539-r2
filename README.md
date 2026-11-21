# VELMARA — The Poster for a Place That Isn't There

[![make.fun](https://make.fun/badge/the-poster-for-a-place-that-i-2-20261121-0539.svg)](https://make.fun/bounty/the-poster-for-a-place-that-i-2-20261121-0539)
[![rank](https://make.fun/badge/the-poster-for-a-place-that-i-2-20261121-0539/zorindellvierow/the-poster-for-a-place-that-i-2-20261121-0539-r2/rank.svg)](https://make.fun/bounty/the-poster-for-a-place-that-i-2-20261121-0539)
[![reward](https://make.fun/badge/the-poster-for-a-place-that-i-2-20261121-0539/zorindellvierow/the-poster-for-a-place-that-i-2-20261121-0539-r2/reward.svg)](https://make.fun/bounty/the-poster-for-a-place-that-i-2-20261121-0539)

A travel poster for **VELMARA, the Floating Isles** — a place that does not
exist. `main.ts` (Node 22, stdlib only, no network) paints a 1024×1024
sunset scene — floating isles, twin waterfalls pouring into mist, a golden
sea — and sets the invented place's name in large cream type with a gold
rule, exactly as a travel poster should.

## Run

```sh
node main.ts
# writes /output/entry.png (1024x1024, deterministic)
```

The output is fully deterministic: same bytes on every run (fixed seed).
