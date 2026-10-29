(function(root, factory) {
  const presets = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = presets;
  if (root) root.CATEGORY_CALCULATOR_PRESETS = presets;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null), function() {
  return [
    {
      id: 'set',
      label: 'Set',
      categoryLabel: 'Set',
      objectSymbol: 'X',
      objectCondition: 'X\\text{ is a set}',
      morphismElement: 'f:{source}\\to {target}',
      morphismCondition: 'f\\text{ is a function}'
    },
    {
      id: 'set-star',
      label: 'Set_*',
      categoryLabel: 'Set_*',
      objectSymbol: 'X',
      objectCondition: '(X,x_0)\\text{ is a pointed set}',
      morphismElement: 'f:{source}\\to {target}',
      morphismCondition: 'f(x_0)=x_0^{\\prime}'
    },
    {
      id: 'top',
      label: 'Top',
      categoryLabel: 'Top',
      objectSymbol: 'X',
      objectCondition: 'X\\text{ is a topological space}',
      morphismElement: 'f:{source}\\to {target}',
      morphismCondition: 'f\\text{ is continuous}'
    },
    {
      id: 'grp',
      label: 'Grp',
      categoryLabel: 'Grp',
      objectSymbol: 'G',
      objectCondition: 'G\\text{ is a group}',
      morphismElement: '\\varphi:{source}\\to {target}',
      morphismCondition: '\\varphi\\text{ is a group homomorphism}'
    },
    {
      id: 'ab',
      label: 'Ab',
      categoryLabel: 'Ab',
      objectSymbol: 'A',
      objectCondition: 'A\\text{ is an abelian group}',
      morphismElement: '\\varphi:{source}\\to {target}',
      morphismCondition: '\\varphi\\text{ is a group homomorphism}'
    },
    {
      id: 'vect-k',
      label: 'Vect(k)',
      categoryLabel: 'Vect(k)',
      objectSymbol: 'V',
      objectCondition: 'V\\text{ is a }k\\text{-vector space}',
      morphismElement: 'T:{source}\\to {target}',
      morphismCondition: 'T\\text{ is }k\\text{-linear}'
    },
    {
      id: 'mod-r',
      label: 'Mod(R)',
      categoryLabel: 'Mod(R)',
      objectSymbol: 'M',
      objectCondition: 'M\\text{ is a left }R\\text{-module}',
      morphismElement: '\\varphi:{source}\\to {target}',
      morphismCondition: '\\varphi\\text{ is }R\\text{-linear}'
    },
    {
      id: 'ring',
      label: 'Ring',
      categoryLabel: 'Ring',
      objectSymbol: 'R',
      objectCondition: 'R\\text{ is a ring with identity}',
      morphismElement: '\\varphi:{source}\\to {target}',
      morphismCondition: '\\varphi\\text{ is a unital ring homomorphism}'
    },
    {
      id: 'cring',
      label: 'CRing',
      categoryLabel: 'CRing',
      objectSymbol: 'R',
      objectCondition: 'R\\text{ is a commutative ring with identity}',
      morphismElement: '\\varphi:{source}\\to {target}',
      morphismCondition: '\\varphi\\text{ is a unital ring homomorphism}'
    },
    {
      id: 'rng',
      label: 'Rng',
      categoryLabel: 'Rng',
      objectSymbol: 'R',
      objectCondition: 'R\\text{ is a ring, not necessarily unital}',
      morphismElement: '\\varphi:{source}\\to {target}',
      morphismCondition: '\\varphi\\text{ is a ring homomorphism}'
    },
    {
      id: 'field',
      label: 'Field',
      categoryLabel: 'Field',
      objectSymbol: 'K',
      objectCondition: 'K\\text{ is a field}',
      morphismElement: '\\varphi:{source}\\to {target}',
      morphismCondition: '\\varphi\\text{ is a field homomorphism}'
    },
    {
      id: 'zero',
      label: '0',
      categoryLabel: '0',
      objectSymbol: 'X',
      objectCondition: '\\text{false}',
      morphismElement: 'f:{source}\\to {target}',
      morphismCondition: '\\text{false}'
    },
    {
      id: 'one',
      label: '1',
      categoryLabel: '1',
      objectSymbol: '*',
      objectCondition: '',
      morphismElement: '1_*',
      morphismCondition: ''
    },
    {
      id: 'e-x',
      label: 'E_X',
      categoryLabel: 'E_X',
      objectSymbol: 'x',
      objectCondition: 'x\\in X',
      morphismElement: '1_{source}',
      morphismCondition: '{source}={target}'
    },
    {
      id: 'k2-arr',
      label: 'K(2) / Arr',
      categoryLabel: 'K(2)',
      objectSymbol: 'O',
      objectCondition: 'O\\in\\{V,E\\}',
      morphismElement: '\\alpha:{source}\\to {target}',
      morphismCondition: '\\alpha\\in\\{1_V,1_E,s,t\\}'
    },
    {
      id: 'delta',
      label: 'Delta',
      categoryLabel: '\\Delta',
      objectSymbol: '[n]',
      objectCondition: 'n\\ge 0',
      morphismElement: '\\alpha:[m]\\to[n]',
      morphismCondition: '\\alpha\\text{ is weakly monotone}'
    },
    {
      id: 'sset',
      label: 'sSet',
      categoryLabel: 'sSet',
      objectSymbol: 'X',
      objectCondition: 'X:\\Delta^{op}\\to Set',
      morphismElement: '\\alpha:{source}\\Rightarrow {target}',
      morphismCondition: '\\alpha\\text{ is a natural transformation}'
    },
    {
      id: 'chaus',
      label: 'CHaus',
      categoryLabel: 'CHaus',
      objectSymbol: 'X',
      objectCondition: 'X\\text{ is compact Hausdorff}',
      morphismElement: 'f:{source}\\to {target}',
      morphismCondition: 'f\\text{ is continuous}'
    },
    {
      id: 'met',
      label: 'Met',
      categoryLabel: 'Met',
      objectSymbol: 'X',
      objectCondition: 'X\\text{ is compact Hausdorff and metrizable}',
      morphismElement: 'f:{source}\\to {target}',
      morphismCondition: 'f\\text{ is continuous}'
    },
    {
      id: 'quiv-e',
      label: 'Quiv(E)',
      categoryLabel: 'Quiv(E)',
      objectSymbol: '\\Gamma',
      objectCondition: '\\Gamma:K(2)\\to E',
      morphismElement: '\\alpha:{source}\\Rightarrow {target}',
      morphismCondition: '\\alpha\\text{ is a natural transformation}'
    },
    {
      id: 'quiv',
      label: 'Quiv',
      categoryLabel: 'Quiv',
      objectSymbol: 'Q',
      objectCondition: 'Q:K(2)\\to Set',
      morphismElement: '\\alpha:{source}\\Rightarrow {target}',
      morphismCondition: '\\alpha\\text{ is a natural transformation}'
    }
  ];
});
