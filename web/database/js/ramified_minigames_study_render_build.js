/* Study adapter only: preserve the original board, pieces, gluing and animation. */
'use strict';
module.exports = function buildStudyAdapter(source) {
  source = source.replace(/\r\n/g, '\n');
  const anchor = "fit() { setCanvasDisplayMode('fit-viewport'); },";
  if (!source.includes(anchor)) throw new Error('Study adapter anchor missing.');
  return '/* Generated study adapter. Original drawing and rules are unchanged. */\n' + source.replace(anchor, `refreshPresentation() { renderAfterCanvasLayoutChange(); },
    paintPlayerPiece(canvas, color) {
      if (!canvas || !['black', 'white', 'red', 'yellow', 'blue', 'green'].includes(color)) return false;
      const size = canvas.parentElement?.getBoundingClientRect().width || 32;
      const dpr = Math.max(1, window.devicePixelRatio || 1);
      canvas.width = canvas.height = Math.ceil(size * dpr);
      const context = canvas.getContext('2d');
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.clearRect(0, 0, size, size);
      const radius = size * .42 / Math.max(.1, selectedPlacementPieceRadiusFraction());
      drawPlacementPieceAtPoint(context, { radius }, { x: size / 2, y: size / 2 }, { color });
      return true;
    },
    presentationInfo() { return { restartPending: fullscreenRestartPending, turn: game?.turn, gameMode: game?.gameMode, phase: game?.phase }; },
    replayPresentation() { if (!game || !['gameover', 'complete'].includes(game.phase)) return false; if (onlineIsInRoom()) { handleCanvasStartBeginClick(); return true; } return resetCurrentGameFromShortcut(); },
    ${anchor}`);
};
