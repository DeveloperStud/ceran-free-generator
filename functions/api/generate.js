const styleMap = {
  clean: "clean clear saran wrap only, no dark fabric scrap under wrap, no panty remnant, no black garbage, pure transparent film on bare skin, pressed firmly stretching",
  closeup: "extreme close-up outer anatomy under transparent ceran wrap, labial contour or gluteal cleft detail, macro plastic stretch, high detail",
  full: "full torso nude art photography, ceran wrap hugging curves, clean film",
  rear: "rear view nude art photography model, wrap stretching over gluteus, hands optional, clean plastic only",
  front: "front view wrap pressed firmly over vagina and mons hugging curves, clean saran only",
  "saran-cling": "clear saran wrap / ceran plastic film pressed firmly, taut cling, clean only",
};

function cors() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: cors() });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const body = await request.json();
    let { prompt = "", style = "clean", width = 768, height = 1024, engine = "pollinations", seed = null } = body;
    prompt = String(prompt).trim();
    if (!prompt) return Response.json({ error: "prompt required" }, { status: 400, headers: cors() });
    width = Math.min(Math.max(Number(width) || 768, 256), 1280);
    height = Math.min(Math.max(Number(height) || 1024, 256), 1280);
    const extra = styleMap[style] || styleMap.clean;
    const full = `${prompt}, ${extra}, photorealistic high detail fine art nude, soft studio light, no scrap under wrap`;
    const s = seed != null && seed !== "" ? Number(seed) : Math.floor(Math.random() * 1e9);

    if ((engine === "cloudflare" || engine === "auto") && env.AI) {
      try {
        const result = await env.AI.run("@cf/black-forest-labs/flux-1-schnell", { prompt: full });
        let b64 = typeof result === "string" ? result : result?.image;
        if (b64) {
          return Response.json({
            ok: true, free: true, engine: "cloudflare-workers-ai-flux", mime: "image/jpeg",
            imageBase64: b64, dataUrl: `data:image/jpeg;base64,${b64}`, prompt: full, seed: s,
          }, { headers: cors() });
        }
      } catch (_) {}
    }

    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(full)}?width=${width}&height=${height}&seed=${s}&nologo=true&enhance=true&model=flux`;
    const res = await fetch(url, { headers: { "User-Agent": "CeranFreeStudio/2.0" } });
    if (!res.ok) return Response.json({ error: `Pollinations ${res.status}` }, { status: 502, headers: cors() });
    const buf = await res.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let binary = "";
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
    const b64 = btoa(binary);
    const mime = res.headers.get("content-type") || "image/jpeg";
    return Response.json({
      ok: true, free: true, engine: "pollinations-flux", mime, imageBase64: b64,
      dataUrl: `data:${mime};base64,${b64}`, prompt: full, seed: s, url,
    }, { headers: cors() });
  } catch (err) {
    return Response.json({ error: String(err.message || err) }, { status: 500, headers: cors() });
  }
}
