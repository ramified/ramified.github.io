"use strict";

importScripts("toric_cone_math.js?v=20260830-2");

self.addEventListener("message", (event) => {
  const request = event.data || {};
  if (request.type !== "analyze-cone") return;
  try {
    const analysis = self.ToricConeMath.analyzeCone(request.input, request.limits);
    self.postMessage({
      type: "cone-analysis",
      requestId: request.requestId,
      objectId: request.objectId,
      revision: request.revision,
      analysis,
    });
  } catch (error) {
    self.postMessage({
      type: "cone-analysis-error",
      requestId: request.requestId,
      objectId: request.objectId,
      revision: request.revision,
      error: error?.message || String(error),
    });
  }
});
