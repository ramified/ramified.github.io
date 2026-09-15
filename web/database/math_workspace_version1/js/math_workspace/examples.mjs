export const examples = [
  { key: 'exampleSlice', source: 'cube = polytope("hypercube", 3)\nB = matrix([[1,0],[0,1],[1,1]], "QQ")\nF = frame(B, [0,0,0])\nsection = slice(cube, F, "4")', show: ['cube','section'] },
  { key: 'exampleSymmetric', source: 'lambda = partition([2])\nf = symmetricFunction("s", lambda)\nmonomials = changeBasis(f, "m")\nproduct = symmetricProduct(f, f, "s")\npolynomial = specializeVariables(f, 3)', show: ['f','monomials','product','polynomial'] },
  { key: 'exampleSheaf', source: 'X = projectiveSpace(2)\nL = lineBundle(X, -3)\nH = sheafCohomology(L)\ndiamond = hodge(X)', show: ['X', 'L', 'H', 'diamond'] },
  { key: 'examplePartitions', source: 'lambda = partition([3, 2])\nmu = partition([2, 1])\nproduct = littlewoodRichardson(lambda, mu)\nhookData = hooks(lambda)', show: ['lambda', 'mu', 'product'] },
  { key: 'exampleMatrix', source: 'A = matrix([["1/2", "2"], ["3", "4"]], "QQ")\nAi = inverse(A)\nidentity = multiply(A, Ai)\nd = determinant(A)', show: ['A', 'Ai', 'identity'] },
  { key: 'exampleRoots', source: 'roots = rootSystem("A", 2)\nlambda = partition([1])\nV = representation(lambda, roots)\ndimension = weylDimension(V)\nC = cartan(roots)\npositive = positiveRoots(roots)\nproduct = tensor(V, V)', show: ['roots', 'C', 'product'] },
  { key: 'exampleToric', source: 'sigma = cone([[1, 0], [1, 2]])\nfaces = analyzeCone(sigma)', show: ['sigma', 'faces'] },
  { key: 'exampleStrand', source: 'braid = strand(3, [1, -2, 1])\nimage = strandEvaluate(braid, "symmetric")\nhecke = strandEvaluate(braid, "hecke", "standard")', show: ['braid', 'image'] },
  { key: 'exampleSurface', source: 'torus = surface({"lattice":"square","rows":1,"cols":1,"gluedEdges":[{"first":{"index":0,"dir":0},"second":{"index":0,"dir":2},"reversed":false},{"first":{"index":0,"dir":1},"second":{"index":0,"dir":3},"reversed":false}]})\nH = homology(torus)', show: ['torus', 'H'] },
  { key: 'exampleFields', source: 'K = fieldExtension({"kind":"Q"}, "x^2-2")\nplaces = ramification(K, {"bound":7,"includeInfinite":false})', show: ['K', 'places'] },
  { key: 'exampleCategory', source: 'C = category({"objects":["X","Y","Z"],"morphisms":[{"id":"f","source":"X","target":"Y"},{"id":"g","source":"Y","target":"Z"}]})', show: ['C'] },
];
