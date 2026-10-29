(() => {
  'use strict';

  function ready(callback) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', callback, { once: true });
    else callback();
  }

  function clickAction(selector) {
    return () => {
      const target = document.querySelector(selector);
      if (!target || target.disabled || target.hidden || target.closest('[hidden]')) return false;
      target.click();
      return true;
    };
  }

  function enabledSelector(selector) {
    return () => {
      const target = document.querySelector(selector);
      return !!(target && !target.disabled && !target.hidden && !target.closest('[hidden]'));
    };
  }

  function pointer(input, description) {
    return { input, description };
  }

  function primaryAction(sessionRef, selectors, label = 'Run / apply current panel') {
    return {
      id: 'primary',
      group: 'Current task',
      label,
      description: 'Runs the primary action in the focused or most recently used panel.',
      defaultBindings: ['Mod+Enter'],
      allowInEditable: true,
      trigger: () => sessionRef.current && sessionRef.current.triggerPrimary(selectors)
    };
  }

  function registerSimple(profile) {
    const api = window.CalculatorInputSettings;
    if (!api || api.getSession(profile.pageId)) return null;
    const sessionRef = { current: null };
    const actions = [];
    if (profile.primary) actions.push(primaryAction(sessionRef, profile.primary, profile.primaryLabel));
    (profile.actions || []).forEach((action) => actions.push(action));
    sessionRef.current = api.register({
      pageId: profile.pageId,
      triggerHost: profile.triggerHost || '.canvas-panel .panel-title',
      actions,
      pointerHints: profile.pointerHints || []
    });
    return sessionRef.current;
  }

  const PROFILES = {
    'young_diagrams.html': {
      pageId: 'young-diagram',
      primary: ['[data-shortcut-primary]'],
      actions: [
        {
          id: 'clear-diagram', group: 'Diagram', label: 'Clear diagram',
          description: 'Removes every box from the current Young diagram.', defaultBindings: [],
          enabled: () => typeof window.drawPartitionRows === 'function',
          trigger: () => {
            if (typeof window.drawPartitionRows !== 'function') return false;
            window.drawPartitionRows([]);
            return true;
          }
        }
      ],
      pointerHints: [
        pointer('Primary click', 'Set the selected row length; click the same boundary again to erase.'),
        pointer('Card drag handle', 'Drag a card to reorder the dashboard.')
      ]
    },
    'double_young_diagram.html': {
      pageId: 'double-young-diagram',
      primary: ['[data-shortcut-primary]'],
      actions: [
        { id: 'swap', group: 'Diagrams', label: 'Swap λ and μ', description: 'Exchanges the two input diagrams.', defaultBindings: [], trigger: clickAction('#swap-diagrams'), enabled: enabledSelector('#swap-diagrams') },
        { id: 'clear-lambda', group: 'Diagrams', label: 'Clear λ', description: 'Clears the λ diagram.', defaultBindings: [], trigger: clickAction('#clear-lambda'), enabled: enabledSelector('#clear-lambda') },
        { id: 'clear-mu', group: 'Diagrams', label: 'Clear μ', description: 'Clears the μ diagram.', defaultBindings: [], trigger: clickAction('#clear-mu'), enabled: enabledSelector('#clear-mu') }
      ],
      pointerHints: [
        pointer('Primary click', 'Set a row length on the λ or μ canvas.'),
        pointer('Card drag handle', 'Drag a card to reorder the dashboard.')
      ]
    },
    'matrix_calculator.html': {
      pageId: 'matrix',
      actions: [
        {
          id: 'primary', group: 'Current task', label: 'Compute / import matrix',
          description: 'Imports the bulk matrix when its dialog is open; otherwise computes the selected operation.',
          defaultBindings: ['Mod+Enter'], allowInEditable: true,
          trigger: () => {
            const dialog = document.getElementById('import-dialog');
            const target = dialog && !dialog.hidden ? document.getElementById('confirm-import') : document.getElementById('compute-operation');
            if (!target || target.disabled) return false;
            target.click();
            return true;
          }
        },
        { id: 'clear-matrix', group: 'Matrix', label: 'Clear matrix', description: 'Clears all matrix entries.', defaultBindings: [], trigger: clickAction('#clear-matrix'), enabled: enabledSelector('#clear-matrix') },
        { id: 'clear-output', group: 'Matrix', label: 'Clear output', description: 'Clears the current result.', defaultBindings: [], trigger: clickAction('#clear-output'), enabled: enabledSelector('#clear-output') }
      ],
      pointerHints: [
        pointer('Primary click', 'Focus and edit a matrix entry or activate a control.'),
        pointer('Card drag handle', 'Drag a card to reorder the dashboard.')
      ]
    },
    'dynkin_diagram_calculator.html': {
      pageId: 'dynkin-diagram',
      actions: [
        { id: 'export-selection', group: 'Selection', label: 'Send selection to export', description: 'Copies the selected vertices into the export panel.', defaultBindings: [], trigger: clickAction('#dynkin-select-export'), enabled: enabledSelector('#dynkin-select-export') },
        {
          id: 'clear-selection', group: 'Selection', label: 'Clear multi-selection',
          description: 'Turns off multi-vertex selection and keeps one active vertex.', defaultBindings: [],
          enabled: () => !!document.getElementById('dynkin-multi-select')?.checked,
          trigger: () => {
            const checkbox = document.getElementById('dynkin-multi-select');
            if (!checkbox || !checkbox.checked) return false;
            checkbox.click();
            return true;
          }
        }
      ],
      pointerHints: [
        pointer('Primary click', 'Select a vertex; with multi-select enabled, toggle vertices.'),
        pointer('Drag', 'Move diagram labels and supported canvas controls.'),
        pointer('Canvas size handle', 'Drag vertically to resize the diagram canvas.')
      ]
    },
    'category_calculator.html': {
      pageId: 'category',
      primary: ['[data-shortcut-primary]'],
      primaryLabel: 'Add / update current category object',
      actions: [
        { id: 'delete-object', group: 'Category', label: 'Delete selected object', description: 'Deletes the active category object.', defaultBindings: [], trigger: clickAction('#category-delete-object'), enabled: enabledSelector('#category-delete-object') },
        { id: 'clear-category', group: 'Category', label: 'Clear category canvas', description: 'Clears all category objects.', defaultBindings: [], trigger: clickAction('#clear-category-canvas'), enabled: enabledSelector('#clear-category-canvas') },
        { id: 'reset-functor-pick', group: 'Category', label: 'Reset functor selection', description: 'Clears the current functor domain and codomain selection.', defaultBindings: [], trigger: clickAction('#reset-functor-pick'), enabled: enabledSelector('#reset-functor-pick') }
      ],
      pointerHints: [
        pointer('Primary click', 'Select a category object or activate a formula token.'),
        pointer('Card drag handle', 'Drag a card to reorder the dashboard.')
      ]
    },
    'sheaf_complex_calculator.html': {
      pageId: 'sheaf-complex',
      primary: ['[data-shortcut-primary]'],
      primaryLabel: 'Run / apply current Sheaf Complex panel',
      actions: [
        { id: 'formula-undo', group: 'Formula', label: 'Undo formula token', description: 'Uses the formula builder undo action when available.', defaultBindings: ['Mod+z'], trigger: clickAction('#class-formula-undo'), enabled: enabledSelector('#class-formula-undo') },
        { id: 'delete-object', group: 'Canvas', label: 'Delete active object', description: 'Deletes the currently active object.', defaultBindings: [], trigger: clickAction('#delete-object'), enabled: enabledSelector('#delete-object') },
        { id: 'clear-canvas', group: 'Canvas', label: 'Clear canvas', description: 'Clears the Sheaf Complex canvas.', defaultBindings: [], trigger: clickAction('#clear-canvas'), enabled: enabledSelector('#clear-canvas') },
        { id: 'restart-step', group: 'Formula', label: 'Restart step calculation', description: 'Restarts the current step-by-step calculation.', defaultBindings: [], trigger: clickAction('#class-step-restart'), enabled: enabledSelector('#class-step-restart') }
      ],
      pointerHints: [
        pointer('Primary click', 'Select a variety, sheaf, map, formula token, or chart object.'),
        pointer('Drag', 'Move labels, map controls, sequence tails, and dashboard cards.'),
        pointer('Enter / Space', 'Activate a focused canvas label or sequence control.'),
        pointer('Arrow keys', 'Move focused map and sequence controls; Shift moves farther.'),
        pointer('Home / End / Insert', 'Navigate or change insertion mode in the formula builder.')
      ]
    },
    'sheaf_calculator.html': {
      pageId: 'sheaf',
      actions: [
        { id: 'formula-undo', group: 'Formula', label: 'Undo formula token', description: 'Uses the formula builder undo action when available.', defaultBindings: ['Mod+z'], trigger: clickAction('#class-formula-undo'), enabled: enabledSelector('#class-formula-undo') },
        { id: 'delete-object', group: 'Canvas', label: 'Delete active object', description: 'Deletes the currently active object.', defaultBindings: [], trigger: clickAction('#delete-object'), enabled: enabledSelector('#delete-object') },
        { id: 'clear-canvas', group: 'Canvas', label: 'Clear canvas', description: 'Clears the Sheaf canvas.', defaultBindings: [], trigger: clickAction('#clear-canvas'), enabled: enabledSelector('#clear-canvas') },
        { id: 'restart-step', group: 'Formula', label: 'Restart step calculation', description: 'Restarts the current step-by-step calculation.', defaultBindings: [], trigger: clickAction('#class-step-restart'), enabled: enabledSelector('#class-step-restart') }
      ],
      pointerHints: [
        pointer('Primary click', 'Select a variety, sheaf, map, formula token, or chart object.'),
        pointer('Drag', 'Move labels, map controls, sequence tails, and dashboard cards.'),
        pointer('Enter / Space', 'Activate a focused canvas label or sequence control.'),
        pointer('Arrow keys', 'Move focused map and sequence controls; Shift moves farther.')
      ]
    },
    'place_ramification_calculator.html': {
      pageId: 'place-ramification',
      primary: ['[data-shortcut-primary]'],
      primaryLabel: 'Compute / update current ramification panel',
      actions: [
        { id: 'add-place', group: 'Places', label: 'Add place', description: 'Adds the place entered in the extra-prime field.', defaultBindings: [], trigger: clickAction('#add-extra-prime'), enabled: enabledSelector('#add-extra-prime') }
      ],
      pointerHints: [
        pointer('Primary click', 'Choose a field, place, or ramification result.'),
        pointer('Card drag handle', 'Drag a card to reorder the dashboard.')
      ]
    },
    'strand_diagram_calculator.html': {
      pageId: 'strand-diagram',
      primary: ['[data-shortcut-primary]'],
      primaryLabel: 'Calculate strand expression',
      actions: [
        { id: 'clear-strands', group: 'Diagram', label: 'Clear strand diagram', description: 'Clears all generators from the strand expression.', defaultBindings: [], trigger: clickAction('#strand-clear'), enabled: enabledSelector('#strand-clear') }
      ],
      pointerHints: [
        pointer('Primary click', 'Select a generator or insertion point.'),
        pointer('Drag', 'Drag generators between the input chart and canvas, or reorder them.'),
        pointer('Range drag', 'Adjust generator spacing and fixed generator size.')
      ]
    }
  };

  ready(() => {
    const page = location.pathname.split('/').pop() || 'index.html';
    const profile = PROFILES[page];
    if (profile) registerSimple(profile);
  });
})();
