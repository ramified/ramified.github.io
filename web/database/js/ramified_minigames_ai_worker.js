'use strict';

importScripts(
  'ramified_minigames_setup.js?v=20260909-3',
  'ramified_minigames_ai.js?v=20260908-3'
);

self.addEventListener('message', (event) => {
  const request = event.data || {};
  if (request.type !== 'choose-move') return;
  try {
    const result = self.RamifiedMinigamesAI.chooseMove(request.state, {
      rules: self.RamifiedMinigames,
      seed: request.seed,
      profile: request.profile,
      safePruning: request.safePruning,
      softBudgetMs: request.softBudgetMs,
      hardBudgetMs: request.hardBudgetMs
    });
    self.postMessage({
      type: 'move-result',
      requestId: request.requestId,
      revision: request.revision,
      positionHash: request.positionHash,
      result
    });
  } catch (error) {
    self.postMessage({
      type: 'move-error',
      requestId: request.requestId,
      revision: request.revision,
      positionHash: request.positionHash,
      message: error && error.message ? error.message : String(error)
    });
  }
});
