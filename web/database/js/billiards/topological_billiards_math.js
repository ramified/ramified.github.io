(function(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.TopologicalBilliardsMath = api;
})(typeof window !== 'undefined' ? window : globalThis, function() {
  'use strict';

  const EPSILON = 1e-10;

  function clamp(value, minimum, maximum) {
    return Math.max(minimum, Math.min(maximum, value));
  }

  function vec2(x = 0, y = 0) {
    return { x, y };
  }

  function add2(a, b) {
    return { x: a.x + b.x, y: a.y + b.y };
  }

  function sub2(a, b) {
    return { x: a.x - b.x, y: a.y - b.y };
  }

  function scale2(vector, scalar) {
    return { x: vector.x * scalar, y: vector.y * scalar };
  }

  function dot2(a, b) {
    return (a.x * b.x) + (a.y * b.y);
  }

  function length2(vector) {
    return Math.hypot(vector.x, vector.y);
  }

  function normalize2(vector, fallback = { x: 1, y: 0 }) {
    const magnitude = length2(vector);
    return magnitude > EPSILON ? scale2(vector, 1 / magnitude) : { ...fallback };
  }

  function identityAffine() {
    return { a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0 };
  }

  function applyAffine(transform, point) {
    return {
      x: (transform.a * point.x) + (transform.b * point.y) + transform.tx,
      y: (transform.c * point.x) + (transform.d * point.y) + transform.ty
    };
  }

  function applyLinear(transform, vector) {
    return {
      x: (transform.a * vector.x) + (transform.b * vector.y),
      y: (transform.c * vector.x) + (transform.d * vector.y)
    };
  }

  function composeAffine(after, before) {
    return {
      a: (after.a * before.a) + (after.b * before.c),
      b: (after.a * before.b) + (after.b * before.d),
      c: (after.c * before.a) + (after.d * before.c),
      d: (after.c * before.b) + (after.d * before.d),
      tx: (after.a * before.tx) + (after.b * before.ty) + after.tx,
      ty: (after.c * before.tx) + (after.d * before.ty) + after.ty
    };
  }

  function inverseAffine(transform) {
    const determinant = (transform.a * transform.d) - (transform.b * transform.c);
    if (Math.abs(determinant) < EPSILON) throw new Error('Glue transform is singular.');
    const a = transform.d / determinant;
    const b = -transform.b / determinant;
    const c = -transform.c / determinant;
    const d = transform.a / determinant;
    return {
      a,
      b,
      c,
      d,
      tx: -((a * transform.tx) + (b * transform.ty)),
      ty: -((c * transform.tx) + (d * transform.ty))
    };
  }

  function affineDeterminant(transform) {
    return (transform.a * transform.d) - (transform.b * transform.c);
  }

  function affineKey(transform, precision = 7) {
    return ['a', 'b', 'c', 'd', 'tx', 'ty']
      .map((key) => Number(transform[key]).toFixed(precision))
      .join(':');
  }

  function quaternion(w = 1, x = 0, y = 0, z = 0) {
    return { w, x, y, z };
  }

  function quaternionMultiply(left, right) {
    return {
      w: (left.w * right.w) - (left.x * right.x) - (left.y * right.y) - (left.z * right.z),
      x: (left.w * right.x) + (left.x * right.w) + (left.y * right.z) - (left.z * right.y),
      y: (left.w * right.y) - (left.x * right.z) + (left.y * right.w) + (left.z * right.x),
      z: (left.w * right.z) + (left.x * right.y) - (left.y * right.x) + (left.z * right.w)
    };
  }

  function normalizeQuaternion(value) {
    const magnitude = Math.hypot(value.w, value.x, value.y, value.z);
    if (magnitude < EPSILON) return quaternion();
    return {
      w: value.w / magnitude,
      x: value.x / magnitude,
      y: value.y / magnitude,
      z: value.z / magnitude
    };
  }

  function conjugateQuaternion(value) {
    return { w: value.w, x: -value.x, y: -value.y, z: -value.z };
  }

  function quaternionFromAxisAngle(axis, angle) {
    const magnitude = Math.hypot(axis.x, axis.y, axis.z);
    if (magnitude < EPSILON || Math.abs(angle) < EPSILON) return quaternion();
    const scale = Math.sin(angle / 2) / magnitude;
    return normalizeQuaternion({
      w: Math.cos(angle / 2),
      x: axis.x * scale,
      y: axis.y * scale,
      z: axis.z * scale
    });
  }

  function quaternionFromMat3(matrix) {
    const m00 = matrix[0][0];
    const m11 = matrix[1][1];
    const m22 = matrix[2][2];
    const trace = m00 + m11 + m22;
    let result;
    if (trace > 0) {
      const s = Math.sqrt(trace + 1) * 2;
      result = {
        w: 0.25 * s,
        x: (matrix[2][1] - matrix[1][2]) / s,
        y: (matrix[0][2] - matrix[2][0]) / s,
        z: (matrix[1][0] - matrix[0][1]) / s
      };
    } else if (m00 > m11 && m00 > m22) {
      const s = Math.sqrt(1 + m00 - m11 - m22) * 2;
      result = {
        w: (matrix[2][1] - matrix[1][2]) / s,
        x: 0.25 * s,
        y: (matrix[0][1] + matrix[1][0]) / s,
        z: (matrix[0][2] + matrix[2][0]) / s
      };
    } else if (m11 > m22) {
      const s = Math.sqrt(1 + m11 - m00 - m22) * 2;
      result = {
        w: (matrix[0][2] - matrix[2][0]) / s,
        x: (matrix[0][1] + matrix[1][0]) / s,
        y: 0.25 * s,
        z: (matrix[1][2] + matrix[2][1]) / s
      };
    } else {
      const s = Math.sqrt(1 + m22 - m00 - m11) * 2;
      result = {
        w: (matrix[1][0] - matrix[0][1]) / s,
        x: (matrix[0][2] + matrix[2][0]) / s,
        y: (matrix[1][2] + matrix[2][1]) / s,
        z: 0.25 * s
      };
    }
    return normalizeQuaternion(result);
  }

  // A 2D orthogonal glue A is lifted to diag(A, det(A)). This is always a
  // proper 3D rotation, so a reflected chart never mirrors a ball texture.
  function liftedMatrix3(transform) {
    const determinant = affineDeterminant(transform);
    return [
      [transform.a, transform.b, 0],
      [transform.c, transform.d, 0],
      [0, 0, determinant < 0 ? -1 : 1]
    ];
  }

  function glueQuaternion(transform) {
    return quaternionFromMat3(liftedMatrix3(transform));
  }

  function rotateVector3(rotation, vector) {
    const pure = { w: 0, x: vector.x, y: vector.y, z: vector.z };
    const rotated = quaternionMultiply(quaternionMultiply(rotation, pure), conjugateQuaternion(rotation));
    return { x: rotated.x, y: rotated.y, z: rotated.z };
  }

  function applyLiftedLinear(transform, vector) {
    const determinant = affineDeterminant(transform);
    return {
      x: (transform.a * vector.x) + (transform.b * vector.y),
      y: (transform.c * vector.x) + (transform.d * vector.y),
      z: (determinant < 0 ? -1 : 1) * vector.z
    };
  }

  function integrateQuaternion(orientation, angularVelocity, dt) {
    const speed = Math.hypot(angularVelocity.x, angularVelocity.y, angularVelocity.z);
    if (speed < EPSILON || dt <= 0) return normalizeQuaternion(orientation);
    const delta = quaternionFromAxisAngle(angularVelocity, speed * dt);
    return normalizeQuaternion(quaternionMultiply(delta, orientation));
  }

  function transportOrientation(orientation, transform) {
    return normalizeQuaternion(quaternionMultiply(glueQuaternion(transform), orientation));
  }

  function cross3(a, b) {
    return {
      x: (a.y * b.z) - (a.z * b.y),
      y: (a.z * b.x) - (a.x * b.z),
      z: (a.x * b.y) - (a.y * b.x)
    };
  }

  return {
    EPSILON,
    add2,
    affineDeterminant,
    affineKey,
    applyAffine,
    applyLiftedLinear,
    applyLinear,
    clamp,
    composeAffine,
    conjugateQuaternion,
    cross3,
    dot2,
    glueQuaternion,
    identityAffine,
    integrateQuaternion,
    inverseAffine,
    length2,
    liftedMatrix3,
    normalize2,
    normalizeQuaternion,
    quaternion,
    quaternionFromAxisAngle,
    quaternionFromMat3,
    quaternionMultiply,
    rotateVector3,
    scale2,
    sub2,
    transportOrientation,
    vec2
  };
});
