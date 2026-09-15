export const editors = [
  {id:'slice', page:'higher_dimensional_slice_calculator.html', script:'js/higher_dimensional_slice_explorer.js', en:'Higher-dimensional Slicing', zh:'高维切片'},
  {id:'young', page:'young_diagrams.html', script:'js/young_diagrams.js', en:'Young Diagrams', zh:'杨图'},
  {id:'double-young', page:'double_young_diagram.html', script:'js/double_young_diagram.js', en:'Double Young Diagrams', zh:'双杨图'},
  {id:'production', page:'double_young_diagram_production_process.html', en:'Double Young: Production Process', zh:'双杨图：构造过程'},
  {id:'dynkin', page:'dynkin_diagram_calculator.html', script:'js/dynkin_diagram_calculator.js', en:'Dynkin Diagrams', zh:'Dynkin 图'},
  {id:'strand', page:'strand_diagram_calculator.html', script:'js/strand_diagram_calculator.js', en:'Strand Diagrams', zh:'线股图'},
  {id:'matrix', page:'matrix_calculator.html', script:'js/matrix_calculator.js', en:'Matrices', zh:'矩阵'},
  {id:'sheaf', page:'sheaf_calculator.html', script:'js/sheaf_calculator.js', en:'Varieties and Sheaves', zh:'簇与层'},
  {id:'complex', page:'sheaf_complex_calculator.html', script:'js/sheaf_complex_calculator.js', en:'Sheaf Complexes', zh:'层复形'},
  {id:'mosaic', page:'mosaic_calculator.html', script:'js/mosaic_calculator.js', en:'Mosaic', zh:'镶嵌'},
  {id:'category', page:'category_calculator.html', script:'js/category_calculator.js', en:'Categories', zh:'范畴'},
  {id:'ramification', page:'place_ramification_calculator.html', script:'js/place_ramification_calculator.js', en:'Place Ramification', zh:'素位分歧'},
];
export const editorName = (e, locale) => locale === 'zh-cn' ? e.zh : e.en;
