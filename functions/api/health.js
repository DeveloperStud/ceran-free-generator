export async function onRequestGet(context) {
  return Response.json({
    ok: true,
    free: true,
    app: "Ceran Free Generator",
    engines: {
      pollinations: true,
      workersAI: Boolean(context.env.AI),
    },
  }, {
    headers: {
      "Access-Control-Allow-Origin": "*",
    },
  });
}
