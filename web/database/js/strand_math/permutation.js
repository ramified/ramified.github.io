(function (scope, factory) {
  'use strict';

  const root = scope.StrandMath = scope.StrandMath || {};
  const api = factory(root);
  Object.assign(root, api);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (math) {
  'use strict';

  const { CalculationError } = math;

  function identityPermutation(rank) {
    return Array.from({ length: rank }, (_, index) => index + 1);
  }

  function permutationKey(values) {
    return values.join(',');
  }

  function permutationBasis(values) {
    const clean = values.slice();
    return { key: permutationKey(clean), values: clean };
  }

  function permutationFromKey(key) {
    return String(key).split(',').filter(Boolean).map(Number);
  }

  function validatePermutation(values, rank) {
    if (!Array.isArray(values) || values.length !== rank) return false;
    const sorted = values.slice().sort((left, right) => left - right);
    return sorted.every((value, index) => value === index + 1);
  }

  function rightMultiplySimple(values, generator) {
    if (!Number.isInteger(generator) || generator < 1 || generator >= values.length) {
      throw new CalculationError('invalid-generator', `Generator index ${generator} is outside 1,...,${values.length - 1}.`);
    }
    const out = values.slice();
    [out[generator - 1], out[generator]] = [out[generator], out[generator - 1]];
    return out;
  }

  function multiplyPermutations(left, right) {
    if (left.length !== right.length) throw new TypeError('Permutation ranks differ.');
    return right.map((image) => left[image - 1]);
  }

  function permutationLength(values, budget) {
    let length = 0;
    for (let left = 0; left < values.length; left++) {
      for (let right = left + 1; right < values.length; right++) {
        budget?.tick();
        if (values[left] > values[right]) length += 1;
      }
    }
    return length;
  }

  function reducedWord(values, budget) {
    const current = values.slice();
    const reductions = [];
    while (true) {
      let descent = 0;
      for (let index = 1; index < current.length; index++) {
        budget?.tick();
        if (current[index - 1] > current[index]) {
          descent = index;
          break;
        }
      }
      if (!descent) break;
      [current[descent - 1], current[descent]] = [current[descent], current[descent - 1]];
      reductions.push(descent);
    }
    return reductions.reverse();
  }

  function permutationFromWord(rank, word, budget) {
    let out = identityPermutation(rank);
    for (const generator of word) {
      budget?.tick();
      out = rightMultiplySimple(out, generator);
    }
    return out;
  }

  function bruhatLeq(left, right, budget) {
    if (left.length !== right.length) return false;
    const rank = left.length;
    for (let prefix = 1; prefix <= rank; prefix++) {
      for (let threshold = 1; threshold <= rank; threshold++) {
        let leftCount = 0;
        let rightCount = 0;
        for (let index = 0; index < prefix; index++) {
          budget?.tick();
          if (left[index] >= threshold) leftCount += 1;
          if (right[index] >= threshold) rightCount += 1;
        }
        if (leftCount > rightCount) return false;
      }
    }
    return true;
  }

  function comparePermutationBasis(left, right) {
    const leftLength = permutationLength(left.values);
    const rightLength = permutationLength(right.values);
    if (leftLength !== rightLength) return rightLength - leftLength;
    return left.key.localeCompare(right.key);
  }

  function inversePermutation(values) {
    const out = Array(values.length);
    values.forEach((image, index) => { out[image - 1] = index + 1; });
    return out;
  }

  return {
    identityPermutation,
    permutationKey,
    permutationBasis,
    permutationFromKey,
    validatePermutation,
    rightMultiplySimple,
    multiplyPermutations,
    permutationLength,
    reducedWord,
    permutationFromWord,
    bruhatLeq,
    comparePermutationBasis,
    inversePermutation
  };
});
