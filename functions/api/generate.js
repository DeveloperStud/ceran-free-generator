// Cloudflare Pages Function — free image generation API
// POST /api/generate

const styleMap = {
  "saran-cling": "clear saran wrap / ceran plastic film pressed firmly stretching over form, taut transparent cling, artistic nude photography, high detail, soft studio light",
  "front-firm": "front view nude art photography model, wrap pressed firmly stretching over vulva and mons, transparent plastic cling, elegant studio",
  "stretch-gluteus": "rear view nude art photography model, wrap stretching over gluteus, hands spreading, pressed taut plastic, fine art",
  "reflective": "reflective wet-look plastic film, specular highlights, clinical art light, photorealistic",
  "soft-studio": "soft diffused studio light, pale gray seamless, elegant fine art nude photography",
};

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const body = await request.json();
    let { prompt = "", style = "saran-cling", width = 768, height = 1024, engine = "pollinations", seed = null } = body;
    prompt = String(prompt).trim();
    if (!prompt) {
      return Response.json({ error: "prompt required" }, { status: 400, headers: corsHeaders() });
    }
    width = Math.min(Math.max(Number(width) || 768, 256), 1280);
    height = Math.min(Math.max(Number(height) || 1024, 256), 1280);
    const extra = styleMap[style] || styleMap["saran-cling"];
    const full = `${prompt}, ${extra}, photorealistic, high detail, tasteful erotic fine art composition`;
    const s = seed != null && seed !== "" ? Number(seed) : Math.floor(Math.random() * 1e9);

    // Prefer Workers AI if requested and bound
    if ((engine === "cloudflare" || engine === "auto") && env.AI) {
      try {
        const result = await env.AI.run("@cf/black-forest-labs/flux-1-schnell", { prompt: full });
        let b64 = typeof result === "string" ? result : result?.image;
        if (!b64 && result instanceof ArrayBuffer) {
          b64 = btoa(String.fromCharCode(...new Uint8Array(result)));
        }
        if (b64) {
          return Response.json(
            {
              ok: true,
              free: true,
              engine: "cloudflare-workers-ai-flux",
              mime: "image/jpeg",
              imageBase64: b64,
              dataUrl: `data:image/jpeg;base64,${b64}`,
              prompt: full,
              seed: s,
            },
            { headers: corsHeaders() }
          );
        }
      } catch (e) {
        // fall through to Pollinations
      }
    }

    // Entirely free: Pollinations FLUX (no key)
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(full)}?width=${width}&height=${height}&seed=${s}&nologo=true&enhance=true&model=flux`;
    const res = await fetch(url, { headers: { "User-Agent": "CeranFreeGenerator/1.0" } });
    if (!res.ok) {
      return Response.json({ error: `Pollinations ${res.status}` }, { status: 502, headers: corsHeaders() });
    }
    const buf = await res.arrayBuffer();
    // chunk-safe base64
    const bytes = new Uint8Array(buf);
    let binary = "";
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
    }
    const b64 = btoa(binary);
    const mime = res.headers.get("content-type") || "image/jpeg";
    return Response.json(
      {
        ok: true,
        free: true,
        engine: "pollinations-flux",
        mime,
        imageBase64: b64,
        dataUrl: `data:${mime};base64,${b64}`,
        prompt: full,
        seed: s,
        url,
      },
      { headers: corsHeaders() }
    );
  } catch (err) {
    return Response.json({ error: String(err.message || err) }, { status: 500, headers: corsHeaders() });
  }
}
