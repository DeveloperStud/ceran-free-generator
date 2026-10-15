/**
 * Ceran Free Generator — Cloudflare Worker
 * Free AI image generation for standalone production.
 *
 * Engines (no paid keys required):
 *  1) Pollinations.ai  — always free, no account
 *  2) Cloudflare Workers AI (FLUX / SD) — free tier neurons when AI binding is set
 *
 * POST /api/generate  { prompt, style?, width?, height?, engine?, seed? }
 * GET  /api/health
 * Static assets from /public via Pages
 */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

function enhancePrompt(prompt, style) {
  const styleMap = {
    "saran-cling":
      "clear saran wrap / ceran plastic film pressed firmly stretching over form, taut transparent cling, artistic nude photography, high detail, soft studio light",
    "stretch-gluteus":
      "rear view nude art photography model, wrap stretching over gluteus, hands spreading, pressed taut plastic, fine art",
    "front-firm":
      "front view nude art photography model, wrap pressed firmly stretching over vulva and mons, transparent plastic cling, elegant studio",
    "reflective": "reflective wet-look plastic film, specular highlights, clinical art light, photorealistic",
    "soft-studio": "soft diffused studio light, pale gray seamless, elegant fine art nude photography",
  };
  const extra = styleMap[style] || styleMap["saran-cling"];
  return `${prompt}, ${extra}, photorealistic, high detail, tasteful erotic fine art composition`;
}

async function generatePollinations(prompt, width, height, seed) {
  const encoded = encodeURIComponent(prompt);
  const s = seed != null && seed !== "" ? Number(seed) : Math.floor(Math.random() * 1e9);
  // Pollinations free public image API — no key
  const url = `https://image.pollinations.ai/prompt/${encoded}?width=${width}&height=${height}&seed=${s}&nologo=true&enhance=true&model=flux`;
  const res = await fetch(url, {
    headers: { "User-Agent": "CeranFreeGenerator/1.0" },
  });
  if (!res.ok) throw new Error(`Pollinations error ${res.status}`);
  const buf = await res.arrayBuffer();
  const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
  return {
    engine: "pollinations-flux",
    mime: res.headers.get("content-type") || "image/jpeg",
    imageBase64: b64,
    seed: s,
    url, // also usable as direct hotlink
  };
}

async function generateWorkersAI(env, prompt, width, height) {
  if (!env.AI) throw new Error("Workers AI binding not available");
  // Prefer fast free-tier friendly FLUX schnell
  const model = "@cf/black-forest-labs/flux-1-schnell";
  const result = await env.AI.run(model, {
    prompt,
    // steps low for free tier neuron budget
  });
  // flux-1-schnell returns { image: base64 string } typically
  let b64 = result?.image || result;
  if (typeof b64 !== "string" && result instanceof ArrayBuffer) {
    b64 = btoa(String.fromCharCode(...new Uint8Array(result)));
  }
  if (typeof b64 !== "string") {
    // some models return binary
    const bytes = new Uint8Array(result);
    b64 = btoa(String.fromCharCode(...bytes));
  }
  return {
    engine: "cloudflare-workers-ai-flux",
    mime: "image/jpeg",
    imageBase64: b64,
  };
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS });
    }

    if (url.pathname === "/api/health") {
      return json({
        ok: true,
        app: env.APP_NAME || "Ceran Free Generator",
        engines: {
          pollinations: true,
          workersAI: Boolean(env.AI),
        },
        free: true,
      });
    }

    if (url.pathname === "/api/generate" && request.method === "POST") {
      try {
        const body = await request.json().catch(() => ({}));
        let {
          prompt = "",
          style = "saran-cling",
          width = 768,
          height = 1024,
          engine = "auto",
          seed = null,
        } = body;

        prompt = String(prompt).trim();
        if (!prompt) return json({ error: "prompt required" }, 400);
        if (prompt.length > 2000) return json({ error: "prompt too long" }, 400);

        width = Math.min(Math.max(Number(width) || 768, 256), 1280);
        height = Math.min(Math.max(Number(height) || 1024, 256), 1280);

        const fullPrompt = enhancePrompt(prompt, style);

        let out;
        const preferCF = engine === "cloudflare" || (engine === "auto" && env.AI);

        if (preferCF) {
          try {
            out = await generateWorkersAI(env, fullPrompt, width, height);
          } catch (e) {
            // fall back free
            out = await generatePollinations(fullPrompt, width, height, seed);
            out.fallbackFrom = "cloudflare";
            out.fallbackReason = String(e.message || e);
          }
        } else {
          out = await generatePollinations(fullPrompt, width, height, seed);
        }

        return json({
          ok: true,
          free: true,
          prompt: fullPrompt,
          style,
          width,
          height,
          ...out,
          dataUrl: `data:${out.mime};base64,${out.imageBase64}`,
        });
      } catch (err) {
        return json({ error: String(err.message || err), free: true }, 500);
      }
    }

    // Static fallback for Worker-only deploy
    if (url.pathname === "/" || url.pathname === "/index.html") {
      return env.ASSETS
        ? env.ASSETS.fetch(request)
        : new Response("Deploy with Cloudflare Pages (public/).", {
            status: 200,
            headers: { "Content-Type": "text/plain", ...CORS },
          });
    }

    return new Response("Not found", { status: 404, headers: CORS });
  },
};
