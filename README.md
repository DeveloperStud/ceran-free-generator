# Ceran Free Generator

**Entirely free** standalone AI image generator for artistic nude / ceran wrap studies.

## Free stack (production)

| Layer | Tech | Cost |
|-------|------|------|
| Hosting | Cloudflare Pages | Free |
| Edge API | Cloudflare Pages Functions | Free |
| Image AI (default) | [Pollinations](https://pollinations.ai) FLUX | Free, no key |
| Image AI (optional) | Cloudflare Workers AI `@cf/black-forest-labs/flux-1-schnell` | Free tier neurons |

No signup for visitors. No paid API keys required for the default engine.

## Local

```bash
npx wrangler pages dev public
# open http://localhost:8788
```

## Deploy to Cloudflare Pages (free)

1. `wrangler login`
2. `npx wrangler pages deploy public --project-name=ceran-free-generator`
3. Optional: bind **Workers AI** in the dashboard for CF FLUX.

Or connect this GitHub repo in Cloudflare Dashboard → Workers & Pages → Create.

## API

`POST /api/generate`

```json
{
  "prompt": "A ceran wrapped neglige pressed firmly...",
  "style": "saran-cling",
  "width": 768,
  "height": 1024,
  "engine": "pollinations",
  "seed": 42
}
```

`GET /api/health`

## Features

- Free Generate button (real AI images)
- Style presets (Saran/Ceran, front firm, rear gluteus, reflective, soft studio)
- Intensity slider, seed, aspect ratios
- Session gallery (localStorage)
- Download JPG
- Reference Study #001 frames + Grok link

Adult fine-art content · 18+
