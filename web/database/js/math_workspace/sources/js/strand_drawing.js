(function(root){
  'use strict';
  // One drawing implementation for the full editor and read-only thumbnails.
  function create({state, fixedTrackOffset, fixedLayerOffset, fixedGeometryActive, strandColor, GENERATOR_CUT_SIZE}) {
  const trackIndexMap = tracks => new Map(tracks.map((label, index) => [label, index]));
  function drawStrands(ctx, width, height, view) {
    const tracks = view.tracks;
    if (!tracks.length) return;
    const trackIndex = trackIndexMap(tracks);
    const records = (view.records || []).filter((record) => record.pairs.some(([left, right]) => trackIndex.has(left) && trackIndex.has(right)));
    const rows = state.thumbnail ? consecutiveRows(records) : records.map(record => [record]);
    const layout = strandLayerLayout(rows.length);
    const layerMax = layout.total;
    const order = tracks.slice();
    const strandSegments = new Map();
    const strandClipMasks = new Map();
    order.forEach((label, index) => {
      strandSegments.set(label, [[pointForLayerPosition(index, 0, tracks.length, layerMax, width, height)]]);
    });

    if (!records.length) {
      order.forEach((label, index) => {
        appendStrandPoint(strandSegments, label, pointForLayerPosition(index, layerMax, tracks.length, layerMax, width, height));
      });
    } else {
      const glyphs = [];
      rows.forEach((row, stepIndex) => {
        const previousLayer = stepIndex === 0
          ? 0
          : layout.intervals[stepIndex - 1]?.end ?? layout.crossingEnds[stepIndex - 1];
        const crossingEnd = layout.crossingEnds[stepIndex];
        const crossingLayer = (previousLayer + crossingEnd) / 2;
        const nextOrder = order.slice(), klBreaks = new Map(), tlBreaks = new Map();
        row.forEach(record => {
          const recordGlyphs = [];
          record.pairs.forEach(([leftTrack, rightTrack]) => {
            const left = trackIndex.get(leftTrack);
            const right = trackIndex.get(rightTrack);
            if (left == null || right == null) return;
            const glyph = {
              record,
              leftIndex: left,
              rightIndex: right,
              leftLabel: order[left],
              rightLabel: order[right],
              startLayer: previousLayer,
              crossingLayer,
              endLayer: crossingEnd
            };
            glyphs.push(glyph);
            recordGlyphs.push(glyph);
          });
          if (record.shouldSwap !== false) {
            record.pairs.forEach(([leftTrack, rightTrack]) => {
              const left = trackIndex.get(leftTrack);
              const right = trackIndex.get(rightTrack);
              if (left == null || right == null) return;
              nextOrder[left] = order[right];
              nextOrder[right] = order[left];
            });
          }
          addBraidClipMasks(recordGlyphs, record, strandClipMasks, tracks.length, layerMax, width, height, lineWidthForTrackCount(tracks.length));
          klVisualBreaks(recordGlyphs, record).forEach((value,key)=>klBreaks.set(key,value));
          tlVisualBreaks(recordGlyphs, record).forEach((value,key)=>tlBreaks.set(key,value));
        });
        nextOrder.forEach((label, index) => {
          const tlBreak = tlBreaks.get(label);
          if (tlBreak) {
            appendTlBreak(strandSegments, label, tlBreak, index, tracks.length, layerMax, width, height);
            return;
          }
          const klBreak = klBreaks.get(label);
          if (klBreak) {
            appendKlBreak(strandSegments, label, klBreak, index, tracks.length, layerMax, width, height);
            return;
          }
          appendStrandPoint(strandSegments, label, pointForLayerPosition(index, crossingEnd, tracks.length, layerMax, width, height));
        });
        const interval = layout.intervals[stepIndex];
        if (interval) {
          nextOrder.forEach((label, index) => {
            if (interval.cutStart != null && interval.cutEnd != null) {
              appendStrandPoint(strandSegments, label, pointForLayerPosition(index, interval.cutStart, tracks.length, layerMax, width, height));
              startStrandSegment(strandSegments, label, pointForLayerPosition(index, interval.cutEnd, tracks.length, layerMax, width, height));
            }
            if (interval.end !== layout.crossingEnds[stepIndex]) {
              appendStrandPoint(strandSegments, label, pointForLayerPosition(index, interval.end, tracks.length, layerMax, width, height));
            }
          });
        }
        order.splice(0, order.length, ...nextOrder);
      });

      const lineWidth = lineWidthForTrackCount(tracks.length);
      strandSegments.forEach((segments, label) => {
        segments.forEach((points) => drawStrandPath(ctx, points, strandColor(label), lineWidth, state.strandDisplayStyle, strandClipMasks.get(label), width, height));
      });
      drawGeneratorGlyphs(ctx, glyphs, tracks.length, layerMax, width, height, lineWidth);

      const endpoints = endpointMapFromSegments(strandSegments);
      drawEndpointLabels(ctx, endpoints, tracks.length, layerMax, width, height);
      return;
    }

    const lineWidth = lineWidthForTrackCount(tracks.length);
    strandSegments.forEach((segments, label) => {
      segments.forEach((points) => drawStrandPath(ctx, points, strandColor(label), lineWidth, state.strandDisplayStyle, null, width, height));
    });

    const endpoints = endpointMapFromSegments(strandSegments);
    drawEndpointLabels(ctx, endpoints, tracks.length, layerMax, width, height);
  }

  function lineWidthForTrackCount(trackCount) {
    if (state.thumbnail) return state.thumbnailStrokeWidth || 12;
    return trackCount > 42 ? 1.05 : trackCount > 20 ? 1.45 : 2.2;
  }

  function addBraidClipMasks(recordGlyphs, record, strandClipMasks, trackCount, layerMax, width, height, lineWidth) {
    if (record.family !== 'braid') return;
    const radius = state.thumbnail ? lineWidth * 1.4 + 1 : Math.max(5.5, lineWidth * 2.6 + 3);
    recordGlyphs.forEach((glyph) => {
      const positive = record.sign !== -1;
      const label = positive ? glyph.rightLabel : glyph.leftLabel;
      const center = pointForLayerPosition((glyph.leftIndex + glyph.rightIndex) / 2, glyph.crossingLayer, trackCount, layerMax, width, height);
      addStrandClipMask(strandClipMasks, label, { x: center.x, y: center.y, radius });
    });
  }

  function addStrandClipMask(strandClipMasks, label, mask) {
    const masks = strandClipMasks.get(label) || [];
    masks.push(mask);
    strandClipMasks.set(label, masks);
  }

  function klVisualBreaks(recordGlyphs, record) {
    const breaks = new Map();
    if (record.family !== 'kl') return breaks;
    recordGlyphs.forEach((glyph) => {
      breaks.set(glyph.leftLabel, {
        trackIndex: glyph.leftIndex,
        beforeLayer: glyph.startLayer,
        afterLayer: glyph.endLayer,
        endLayer: glyph.endLayer
      });
      breaks.set(glyph.rightLabel, {
        trackIndex: glyph.rightIndex,
        beforeLayer: glyph.startLayer,
        afterLayer: glyph.endLayer,
        endLayer: glyph.endLayer
      });
    });
    return breaks;
  }

  function tlVisualBreaks(recordGlyphs, record) {
    const breaks = new Map();
    if (record.family !== 'tl') return breaks;
    recordGlyphs.forEach((glyph) => {
      breaks.set(glyph.leftLabel, {
        trackIndex: glyph.leftIndex,
        beforeLayer: glyph.startLayer,
        afterLayer: glyph.endLayer,
        endLayer: glyph.endLayer
      });
      breaks.set(glyph.rightLabel, {
        trackIndex: glyph.rightIndex,
        beforeLayer: glyph.startLayer,
        afterLayer: glyph.endLayer,
        endLayer: glyph.endLayer
      });
    });
    return breaks;
  }

  function appendKlBreak(strandSegments, label, klBreak, targetIndex, trackCount, layerMax, width, height) {
    appendStrandPoint(strandSegments, label, pointForLayerPosition(klBreak.trackIndex, klBreak.beforeLayer, trackCount, layerMax, width, height));
    startStrandSegment(strandSegments, label, pointForLayerPosition(klBreak.trackIndex, klBreak.afterLayer, trackCount, layerMax, width, height));
    if (klBreak.afterLayer !== klBreak.endLayer) {
      appendStrandPoint(strandSegments, label, pointForLayerPosition(targetIndex, klBreak.endLayer, trackCount, layerMax, width, height));
    }
  }

  function appendTlBreak(strandSegments, label, tlBreak, targetIndex, trackCount, layerMax, width, height) {
    startStrandSegment(strandSegments, label, pointForLayerPosition(targetIndex, tlBreak.endLayer, trackCount, layerMax, width, height));
  }

  function strandLayerLayout(stepCount) {
    if (stepCount <= 0) {
      return {
        total: 1,
        crossingEnds: [],
        intervals: [],
        guideLayers: [0, 1]
      };
    }
    const spacing = state.generatorSpacing;
    const cutSize = state.generatorGapEnabled ? GENERATOR_CUT_SIZE : 0;
    const crossingEnds = [];
    const intervals = [];
    const guideLayers = [0];
    let position = 0;
    for (let index = 0; index < stepCount; index++) {
      position += 1;
      crossingEnds.push(position);
      if (index < stepCount - 1) {
        const interval = { end: position, cutStart: null, cutEnd: null };
        const beforeCut = spacing / 2;
        const afterCut = spacing - beforeCut;
        if (cutSize > 0) {
          interval.cutStart = position + beforeCut;
          interval.cutEnd = interval.cutStart + cutSize;
          interval.end = interval.cutEnd + afterCut;
          guideLayers.push((interval.cutStart + interval.cutEnd) / 2);
        } else {
          interval.end = position + spacing;
          guideLayers.push(position + spacing / 2);
        }
        position = interval.end;
        intervals.push(interval);
      } else {
        guideLayers.push(position);
        intervals.push(null);
      }
    }
    return {
      total: Math.max(1, position),
      crossingEnds,
      intervals,
      guideLayers
    };
  }

  function appendStrandPoint(strandSegments, label, point) {
    const segments = strandSegments.get(label);
    if (!segments?.length) return;
    segments[segments.length - 1].push(point);
  }

  function startStrandSegment(strandSegments, label, point) {
    const segments = strandSegments.get(label);
    if (!segments) return;
    segments.push([point]);
  }

  function endpointMapFromSegments(strandSegments) {
    const endpoints = new Map();
    strandSegments.forEach((segments, label) => {
      const firstSegment = segments.find((segment) => segment.length);
      const lastSegment = segments.slice().reverse().find((segment) => segment.length);
      if (!firstSegment || !lastSegment) return;
      endpoints.set(label, [firstSegment[0], lastSegment[lastSegment.length - 1]]);
    });
    return endpoints;
  }

  function drawStrandPath(ctx, points, color, lineWidth, style, clipMasks = null, width = 0, height = 0) {
    if (points.length < 2) return;
    ctx.save();
    if (clipMasks?.length) applyInverseClipMasks(ctx, clipMasks, width, height);
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = state.thumbnail ? 1 : 0.92;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    if (style === 'soft') drawSoftPathSegments(ctx, points);
    else drawStraightPathSegments(ctx, points);
    ctx.stroke();
    ctx.restore();
  }

  function applyInverseClipMasks(ctx, masks, width, height) {
    ctx.beginPath();
    ctx.rect(0, 0, Math.max(1, width), Math.max(1, height));
    masks.forEach((mask) => {
      ctx.moveTo(mask.x + mask.radius, mask.y);
      ctx.arc(mask.x, mask.y, mask.radius, 0, Math.PI * 2);
    });
    ctx.clip('evenodd');
  }

  function drawStraightPathSegments(ctx, points) {
    for (let index = 1; index < points.length; index++) {
      ctx.lineTo(points[index].x, points[index].y);
    }
  }

  function drawSoftPathSegments(ctx, points) {
    const vertical = isVerticalDirection();
    for (let index = 1; index < points.length; index++) {
      const previous = points[index - 1];
      const point = points[index];
      const layerDelta = vertical ? point.y - previous.y : point.x - previous.x;
      const controlScale = 0.55;
      const c1 = vertical
        ? { x: previous.x, y: previous.y + layerDelta * controlScale }
        : { x: previous.x + layerDelta * controlScale, y: previous.y };
      const c2 = vertical
        ? { x: point.x, y: point.y - layerDelta * controlScale }
        : { x: point.x - layerDelta * controlScale, y: point.y };
      ctx.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, point.x, point.y);
    }
  }

  function drawGeneratorGlyphs(ctx, glyphs, trackCount, layerMax, width, height, lineWidth) {
    glyphs.forEach((glyph) => {
      const family = glyph.record.family;
      if (family === 'kl') drawKlGlyph(ctx, glyph, trackCount, layerMax, width, height, lineWidth);
      else if (family === 'tl') drawTlGlyph(ctx, glyph, trackCount, layerMax, width, height, lineWidth);
    });
  }

  function drawKlGlyph(ctx, glyph, trackCount, layerMax, width, height, lineWidth) {
    const midTrack = (glyph.leftIndex + glyph.rightIndex) / 2;
    const topLeft = pointForLayerPosition(glyph.leftIndex, glyph.startLayer, trackCount, layerMax, width, height);
    const topRight = pointForLayerPosition(glyph.rightIndex, glyph.startLayer, trackCount, layerMax, width, height);
    const bottomLeft = pointForLayerPosition(glyph.leftIndex, glyph.endLayer, trackCount, layerMax, width, height);
    const bottomRight = pointForLayerPosition(glyph.rightIndex, glyph.endLayer, trackCount, layerMax, width, height);
    const center = pointForLayerPosition(midTrack, glyph.crossingLayer, trackCount, layerMax, width, height);

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = state.thumbnail ? 1 : 0.92;
    const color = state.thumbnail ? strandColor(glyph.leftLabel) : '#211c18';
    drawTlCurve(ctx, topLeft, center, topRight, color, lineWidth);
    drawTlCurve(ctx, bottomLeft, center, bottomRight, color, lineWidth);
    ctx.restore();
  }

  function drawTlGlyph(ctx, glyph, trackCount, layerMax, width, height, lineWidth) {
    const span = Math.max(0.01, glyph.endLayer - glyph.startLayer);
    const bow = Math.min(span * 0.28, Math.max(0.01, span / 2 - 0.04));
    const topLeft = pointForLayerPosition(glyph.leftIndex, glyph.startLayer, trackCount, layerMax, width, height);
    const topRight = pointForLayerPosition(glyph.rightIndex, glyph.startLayer, trackCount, layerMax, width, height);
    const bottomLeft = pointForLayerPosition(glyph.leftIndex, glyph.endLayer, trackCount, layerMax, width, height);
    const bottomRight = pointForLayerPosition(glyph.rightIndex, glyph.endLayer, trackCount, layerMax, width, height);
    const topControls = [
      pointForLayerPosition(glyph.leftIndex, glyph.startLayer + bow, trackCount, layerMax, width, height),
      pointForLayerPosition(glyph.rightIndex, glyph.startLayer + bow, trackCount, layerMax, width, height)
    ];
    const bottomControls = [
      pointForLayerPosition(glyph.leftIndex, glyph.endLayer - bow, trackCount, layerMax, width, height),
      pointForLayerPosition(glyph.rightIndex, glyph.endLayer - bow, trackCount, layerMax, width, height)
    ];

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = state.thumbnail ? 1 : 0.92;
    const color = state.thumbnail ? strandColor(glyph.leftLabel) : '#7b477e';
    drawTlArc(ctx, topLeft, topControls[0], topControls[1], topRight, color, lineWidth);
    drawTlArc(ctx, bottomLeft, bottomControls[0], bottomControls[1], bottomRight, color, lineWidth);
    ctx.restore();
  }

  function drawTlArc(ctx, start, controlStart, controlEnd, end, color, width) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.bezierCurveTo(controlStart.x, controlStart.y, controlEnd.x, controlEnd.y, end.x, end.y);
    ctx.stroke();
  }

  function drawTlCurve(ctx, start, control, end, color, width) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    drawSoftPathSegments(ctx, [start, control, end]);
    ctx.stroke();
  }

  function drawInsertionGuide(ctx, width, height, view) {
    const drag = state.dragInput;
    if (!drag?.dragging || drag.guideLayer == null || !view.tracks.length) return;
    const layout = strandLayerLayout(view.steps.length);
    const layerMax = layout.total;
    const start = pointForLayerPosition(0, drag.guideLayer, view.tracks.length, layerMax, width, height);
    const end = pointForLayerPosition(view.tracks.length - 1, drag.guideLayer, view.tracks.length, layerMax, width, height);
    ctx.save();
    ctx.strokeStyle = '#8b3a2a';
    ctx.fillStyle = '#8b3a2a';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 5]);
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
    ctx.setLineDash([]);
    const marker = pointForLayerPosition(Math.max(0, Math.floor((view.tracks.length - 1) / 2)), drag.guideLayer, view.tracks.length, layerMax, width, height);
    ctx.beginPath();
    ctx.arc(marker.x, marker.y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawEndpointLabels(ctx, paths, trackCount, layerMax, width, height) {
    if (state.thumbnail || trackCount > 28 || !endpointLabelsHaveRoom(paths, trackCount, width, height)) return;
    ctx.save();
    ctx.font = '12px JetBrains Mono, Consolas, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    paths.forEach((points, label) => {
      const start = points[0];
      const end = points[points.length - 1];
      const color = strandColor(label);
      drawEndpointLabel(ctx, label, start, color, endpointSide(0, layerMax, width, height));
      drawEndpointLabel(ctx, label, end, color, endpointSide(layerMax, layerMax, width, height));
    });
    ctx.restore();
  }

  function endpointLabelsHaveRoom(paths, trackCount, width, height) {
    if (trackCount <= 1) return true;
    if (fixedGeometryActive()) {
      const longest = Math.max(...[...paths.keys()].map((label) => String(label).length), 1);
      return longest * 7 + 10 <= state.fixedGeneratorSize;
    }
    const margin = canvasMargins(width, height);
    const vertical = state.direction === 'up-down' || state.direction === 'down-up';
    const trackSpan = vertical
      ? width - margin.left - margin.right
      : height - margin.top - margin.bottom;
    const trackSpacing = trackSpan / Math.max(1, trackCount - 1);
    const longest = Math.max(...[...paths.keys()].map((label) => String(label).length), 1);
    return longest * 7 + 10 <= trackSpacing;
  }

  function drawEndpointLabel(ctx, label, point, color, side) {
    const offset = 17;
    const x = point.x + side.x * offset;
    const y = point.y + side.y * offset;
    ctx.save();
    ctx.fillStyle = 'rgba(255, 253, 248, 0.86)';
    ctx.strokeStyle = 'rgba(216, 208, 196, 0.86)';
    ctx.lineWidth = 1;
    const text = String(label);
    const width = Math.max(18, ctx.measureText(text).width + 8);
    const height = 17;
    roundedRect(ctx, x - width / 2, y - height / 2, width, height, 3);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.fillText(text, x, y + 0.5);
    ctx.restore();
  }

  function endpointSide(layer, layerMax) {
    if (state.direction === 'up-down') return layer === 0 ? { x: 0, y: -1 } : { x: 0, y: 1 };
    if (state.direction === 'down-up') return layer === 0 ? { x: 0, y: 1 } : { x: 0, y: -1 };
    if (state.direction === 'left-right') return layer === 0 ? { x: -1, y: 0 } : { x: 1, y: 0 };
    return layer === 0 ? { x: 1, y: 0 } : { x: -1, y: 0 };
  }

  function drawCanvasLegend(ctx, width, height, view) {
    ctx.save();
    ctx.fillStyle = '#7a6f65';
    ctx.font = '12px JetBrains Mono, Consolas, monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    const hidden = view.hiddenSteps ? `; ${view.hiddenSteps} step${view.hiddenSteps === 1 ? '' : 's'} outside view` : '';
    ctx.fillText(`${view.label}${hidden}`, 14, 12);
    ctx.restore();
  }

  function roundedRect(ctx, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function canvasMargins(width, height) {
    if (state.thumbnail) return { left: 16, right: 16, top: 16, bottom: 16 };
    const vertical = isVerticalDirection();
    return vertical
      ? { left: 46, right: 46, top: 52, bottom: 52 }
      : { left: 58, right: 58, top: 44, bottom: 44 };
  }

  function pointForLayerPosition(trackIndex, layerPosition, trackCount, layerMax, width, height) {
    const margin = canvasMargins(width, height);
    const vertical = isVerticalDirection();
    const trackRatio = trackCount <= 1 ? 0.5 : trackIndex / (trackCount - 1);
    const layerRatio = layerMax <= 0 ? 0 : layerPosition / layerMax;
    const fixed = fixedGeometryActive();
    const trackCoord = vertical
      ? margin.left + (fixed ? fixedTrackOffset(trackIndex, trackCount) : trackRatio * (width - margin.left - margin.right))
      : margin.top + (fixed ? fixedTrackOffset(trackIndex, trackCount) : trackRatio * (height - margin.top - margin.bottom));
    const layerCoord = vertical
      ? margin.top + (fixed ? fixedLayerOffset(layerPosition) : layerRatio * (height - margin.top - margin.bottom))
      : margin.left + (fixed ? fixedLayerOffset(layerPosition) : layerRatio * (width - margin.left - margin.right));

    if (state.direction === 'up-down') return { x: trackCoord, y: layerCoord };
    if (state.direction === 'down-up') return { x: trackCoord, y: height - layerCoord };
    if (state.direction === 'left-right') return { x: layerCoord, y: trackCoord };
    return { x: width - layerCoord, y: trackCoord };
  }

  function isVerticalDirection() {
    return state.direction === 'up-down' || state.direction === 'down-up';
  }

    return { drawStrands, lineWidthForTrackCount, addBraidClipMasks, addStrandClipMask, klVisualBreaks, tlVisualBreaks, appendKlBreak, appendTlBreak, strandLayerLayout, appendStrandPoint, startStrandSegment, endpointMapFromSegments, drawStrandPath, applyInverseClipMasks, drawStraightPathSegments, drawSoftPathSegments, drawGeneratorGlyphs, drawKlGlyph, drawTlGlyph, drawTlArc, drawTlCurve, drawInsertionGuide, drawEndpointLabels, endpointLabelsHaveRoom, drawEndpointLabel, endpointSide, drawCanvasLegend, roundedRect, canvasMargins, pointForLayerPosition, isVerticalDirection };
  }
  function swapPairs(groupType,n,index) {
    if(groupType==='symmetric')return [[index,index+1]];
    if(index===0)return groupType==='D'?[[-2,1],[-1,2]]:[[-1,1]];
    return [[-index-1,-index],[index,index+1]];
  }
  function scene({groupType, strandCount:n, generators}) {
    const signed = groupType !== 'symmetric';
    const tracks = signed ? [...Array.from({length:n},(_,i)=>i-n), ...Array.from({length:n},(_,i)=>i+1)] : Array.from({length:n},(_,i)=>i+1);
    const records = generators.map(generator => {
      const i=generator.index;
      const pairs = swapPairs(groupType,n,i);
      return {generator, family:generator.family, sign:generator.sign || 1, pairs, shouldSwap:['coxeter','braid'].includes(generator.family)};
    });
    return {tracks, records, steps:generators};
  }
  function consecutiveRows(records) {
    // Only extend the current row. Mirrored signed crossings stay together,
    // and any shared physical track starts a new row; never backfill a row.
    const rows=[];let occupied=new Set();
    for(const record of records){
      const support=new Set(record.pairs.flat());
      if(!rows.length||[...support].some(track=>occupied.has(track))){rows.push([]);occupied=new Set();}
      rows[rows.length-1].push(record);support.forEach(track=>occupied.add(track));
    }
    return rows;
  }
  function thumbnail(ctx,width,height,model,color='#486c68',{strokeWidth=12}={}) {
    const state={direction:'up-down',generatorSpacing:0.3,generatorGapEnabled:false,strandDisplayStyle:'soft',thumbnail:true,thumbnailStrokeWidth:strokeWidth};
    const drawing=create({state,fixedTrackOffset:()=>0,fixedLayerOffset:()=>0,fixedGeometryActive:()=>false,strandColor:()=>color,GENERATOR_CUT_SIZE:0.34});
    drawing.drawStrands(ctx,width,height,scene(model));
  }
  const api={create,swapPairs,scene,thumbnail,consecutiveRows};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.StrandDrawing=api;
})(typeof window!=='undefined'?window:globalThis);
