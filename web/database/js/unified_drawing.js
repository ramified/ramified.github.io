// Unified Drawing System - Refactored Approach
// This replaces the dual-mode system with a single unified gesture handler

/*
DESIGN PRINCIPLES:
1. Each tile is handled independently based only on:
   - Entry edge (or null if starting fresh)
   - Tile type (arc tile or vertex tile)
   - Current mouse position

2. Single drawState structure for all tile types:
   drawState = {
     pointerId: number,
     current: {
       index: number,           // tile index
       offset: {x, y},          // position offset for wrapped grids
       entryDir: number|null,   // which edge we entered from (null if starting at center)
       isVertexTile: boolean,   // true for vertex tiles, false for arc tiles
       vertexTouched: boolean,  // for vertex tiles: has center been touched?
       originalTile: any,       // backup for undo
       removedEntryPair: any,   // for arc tiles: the arc removed at entry
       removedEntryIndex: number // for arc tiles: index of removed arc
     },
     history: [],               // for multi-segment undo
     eraseMode: string,         // 'detecting' or 'drawing'
     completed: boolean
   }

3. Vertex tile behavior:
   - Entry from edge E, exit from same edge E → backtrack/undo
   - Entry from edge E, exit from different edge E' → toggle both spokes
   - Entry from center, exit from edge E → toggle spoke E
   - Entry from edge E, touch center, exit from edge E' → toggle both spokes

4. Arc tile behavior:
   - Entry from edge E, exit from same edge E → backtrack/undo
   - Entry from edge E, exit from different edge E' → draw arc E-E'
*/

// Main entry point - called on pointerdown
function beginUnifiedDrawGesture(event) {
  const point = clientPointToBoardPoint(event.clientX, event.clientY);

  // Try to find a tile at this point
  const tileHit = tileHitTest(event.clientX, event.clientY, 1.02);
  if (!tileHit) return;

  const tile = state.tiles[tileHit.index];
  const isVertex = isVertexTileValue(tile);

  // Determine entry point
  let entryDir = null;
  let vertexTouched = false;

  if (isVertex) {
    // For vertex tiles, check if starting at center or edge
    const anchor = dualGraphAnchorFromPoint(point, tileHit);
    if (anchor && anchor.type === 'edge') {
      entryDir = anchor.dir;
    } else {
      // Starting at center
      vertexTouched = true;
    }
  } else {
    // For arc tiles, must start at an edge
    const edgeHit = edgeHitTest(event.clientX, event.clientY, 0);
    if (edgeHit && edgeHit.index === tileHit.index) {
      entryDir = edgeHit.dir;
    } else {
      // Not at an edge, can't start drawing
      return;
    }
  }

  // Set up pointer state
  pointerState = {
    id: event.pointerId,
    index: tileHit.index,
    x: event.clientX,
    y: event.clientY,
    lastX: event.clientX,
    lastY: event.clientY,
    moved: false
  };
  refs.canvas.setPointerCapture(event.pointerId);

  // Initialize draw state
  drawState = {
    pointerId: event.pointerId,
    current: {
      index: tileHit.index,
      offset: copyOffsetRecord(tileHit.offset),
      entryDir: entryDir,
      isVertexTile: isVertex,
      vertexTouched: vertexTouched,
      originalTile: cloneTile(tile),
      removedEntryPair: null,
      removedEntryIndex: -1
    },
    history: [],
    eraseMode: 'detecting',
    completed: false
  };

  // For arc tiles, remove existing arc at entry edge
  if (!isVertex && entryDir != null) {
    const removed = removePairAtEdge(tile || [], entryDir);
    state.tiles[tileHit.index] = removed.tile;
    drawState.current.removedEntryPair = removed.pair;
    drawState.current.removedEntryIndex = removed.pairIndex;
  }

  state.hoverIndex = tileHit.index;
  updateUnifiedDrawPreview(event.clientX, event.clientY, false);
  draw(analyze());
}

// Main update - called on pointermove
function updateUnifiedDrawGesture(event) {
  if (!drawState) return;

  // Update preview
  updateUnifiedDrawPreview(event.clientX, event.clientY);

  // If no current tile, try to start at first hit
  if (!drawState.current) {
    const tileHit = tileHitTest(event.clientX, event.clientY, 1.02);
    if (!tileHit) return;

    // Start drawing at this tile
    // (similar logic to beginUnifiedDrawGesture)
    return;
  }

  const point = clientPointToBoardPoint(event.clientX, event.clientY);
  const currentHit = tileHitTest(event.clientX, event.clientY, 1.02);

  // Check if still in same tile
  if (currentHit && currentHit.index === drawState.current.index) {
    // Still in same tile - update internal state
    if (drawState.current.isVertexTile) {
      // Check if touching center
      const centerDist = dualGraphCenterDistanceFromPoint(point, drawState.current);
      if (centerDist != null && centerDist <= geometry.radius * 0.32) {
        drawState.current.vertexTouched = true;
      }
    }
    return;
  }

  // We've moved to a different tile - need to commit current and continue
  const exitDir = detectExitDirection(event.clientX, event.clientY, drawState.current);

  if (exitDir == null) return; // Not at an edge yet

  // Check for backtrack
  if (exitDir === drawState.current.entryDir && !drawState.current.vertexTouched) {
    // Backtracking - undo
    if (drawState.history.length) {
      undoLastDrawSegment();
    } else {
      restorePendingDrawTile();
    }
    updateUnifiedDrawPreview(event.clientX, event.clientY);
    return;
  }

  // Commit current tile
  commitCurrentTile(exitDir);

  // Move to next tile
  const next = nextDrawEntry(drawState.current, exitDir);
  if (next) {
    startDrawingAtTile(next, event.clientX, event.clientY);
  } else {
    drawState.current = null;
  }

  updateReport(false);
}

// Commit the current tile's changes
function commitCurrentTile(exitDir) {
  if (!drawState || !drawState.current) return;

  const current = drawState.current;

  if (current.isVertexTile) {
    // Vertex tile: toggle spokes
    if (current.entryDir != null) {
      commitDualGraphSpoke(current.index, current.entryDir);
    }
    if (exitDir != null && exitDir !== current.entryDir) {
      commitDualGraphSpoke(current.index, exitDir);
    }
  } else {
    // Arc tile: draw arc from entry to exit
    if (current.entryDir != null && exitDir != null) {
      const eraseModeBefore = drawState.eraseMode;
      const erasesExisting = eraseModeBefore === 'detecting'
        && pairHasEndpoints(current.removedEntryPair, current.entryDir, exitDir);

      if (erasesExisting) {
        // Just restore the tile (erasing the arc)
        state.tiles[current.index] = cloneTile(state.tiles[current.index] || []);
      } else {
        // Add new arc
        drawState.eraseMode = 'drawing';
        const removed = removePairAtEdge(state.tiles[current.index] || [], exitDir);
        const next = removed.tile;
        const newPair = [current.entryDir, exitDir];
        if (state.drawLayer === 'below') next.unshift(newPair);
        else next.push(newPair);
        state.tiles[current.index] = cloneTile(next);
      }

      state.edits += 1;

      // Save to history
      drawState.history.push({
        tileState: cloneDrawTileState(current),
        exitDir,
        eraseModeBefore,
        eraseModeAfter: drawState.eraseMode
      });
    }
  }

  drawState.completed = true;
}

// Start drawing at a new tile
function startDrawingAtTile(entry, clientX, clientY) {
  const tile = state.tiles[entry.index];
  const isVertex = isVertexTileValue(tile);

  drawState.current = {
    index: entry.index,
    offset: copyOffsetRecord(entry.offset),
    entryDir: entry.dir,
    isVertexTile: isVertex,
    vertexTouched: false,
    originalTile: cloneTile(tile),
    removedEntryPair: null,
    removedEntryIndex: -1
  };

  // For arc tiles, remove existing arc at entry edge
  if (!isVertex && entry.dir != null) {
    const removed = removePairAtEdge(tile || [], entry.dir);
    state.tiles[entry.index] = removed.tile;
    drawState.current.removedEntryPair = removed.pair;
    drawState.current.removedEntryIndex = removed.pairIndex;
  }

  state.hoverIndex = entry.index;
  updateUnifiedDrawPreview(clientX, clientY);
  draw(analyze());
}

// Detect exit direction from current tile
function detectExitDirection(clientX, clientY, tileState) {
  if (tileState.isVertexTile) {
    // For vertex tiles, use the dual graph endpoint detection
    const point = clientPointToBoardPoint(clientX, clientY);
    const endpoint = dualGraphEndpointFromPoint(point, {
      index: tileState.index,
      offset: tileState.offset,
      anchor: tileState.entryDir != null ? 'edge' : 'center',
      entryDir: tileState.entryDir
    });
    return endpoint && endpoint.type === 'edge' ? endpoint.dir : null;
  } else {
    // For arc tiles, use the standard exit direction detection
    return drawExitDirection(clientX, clientY, tileState);
  }
}

// Update visual preview
function updateUnifiedDrawPreview(clientX, clientY, redraw = true) {
  if (!drawState || !drawState.current) {
    updateDrawDebugFromPoint(clientX, clientY, redraw);
    return;
  }

  const current = drawState.current;
  const point = clientPointToBoardPoint(clientX, clientY);

  if (current.isVertexTile) {
    // Vertex tile preview
    const endpoint = dualGraphEndpointFromPoint(point, {
      index: current.index,
      offset: current.offset,
      anchor: current.entryDir != null ? 'edge' : 'center',
      entryDir: current.entryDir
    });

    const dir = current.entryDir != null
      ? current.entryDir
      : (endpoint && endpoint.type === 'edge'
        ? endpoint.dir
        : nearestDirectionForTilePoint(point, current));

    setDrawDebugHit({
      index: current.index,
      dir: dir == null || dir < 0 ? 0 : dir,
      offset: copyOffsetRecord(current.offset),
      point,
      graphAnchor: current.entryDir != null ? 'edge' : 'center',
      graphVertex: !!endpoint && endpoint.type === 'center'
    }, redraw);
  } else {
    // Arc tile preview
    if (state.drawStyle === 'shade') {
      setDrawDebugHit({
        index: current.index,
        dir: current.entryDir,
        offset: copyOffsetRecord(current.offset),
        point
      }, redraw);
    } else {
      updateDrawDebugFromPoint(clientX, clientY, redraw);
    }
  }
}

// Helper to clone draw tile state for history
function cloneDrawTileState(tileState) {
  return {
    index: tileState.index,
    offset: copyOffsetRecord(tileState.offset),
    entryDir: tileState.entryDir,
    isVertexTile: tileState.isVertexTile,
    vertexTouched: tileState.vertexTouched,
    originalTile: cloneTile(tileState.originalTile),
    removedEntryPair: tileState.removedEntryPair ? tileState.removedEntryPair.slice() : null,
    removedEntryIndex: tileState.removedEntryIndex
  };
}
