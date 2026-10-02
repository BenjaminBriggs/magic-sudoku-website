// Shared behaviour for the learn section: step-through examples and grid diagrams.

// Step-through example. Markup:
// <div data-stepper>
//   <span data-counter></span> <button data-prev> <button data-next>
//   <div data-track></div>
//   <figure class="stepper-slide" data-slide>...</figure> (one per step)
// </div>
function initStepper(root) {
  const slides = Array.from(root.querySelectorAll('[data-slide]'));
  const track = root.querySelector('[data-track]');
  const counter = root.querySelector('[data-counter]');
  const prev = root.querySelector('[data-prev]');
  const next = root.querySelector('[data-next]');
  let current = 0;

  const segments = slides.map((_, index) => {
    const segment = document.createElement('button');
    segment.type = 'button';
    segment.className = 'stepper-segment';
    segment.title = `Step ${index + 1}`;
    segment.addEventListener('click', () => show(index));
    track.appendChild(segment);
    return segment;
  });

  function show(index) {
    current = index;
    slides.forEach((slide, i) => slide.classList.toggle('is-active', i === current));
    segments.forEach((segment, i) => {
      segment.classList.toggle('is-done', i < current);
      segment.classList.toggle('is-active', i === current);
    });
    counter.textContent = `Step ${current + 1} of ${slides.length}`;
    prev.disabled = current === 0;
    next.textContent = current === slides.length - 1 ? 'Start over' : 'Next step';
  }

  prev.addEventListener('click', () => show(Math.max(current - 1, 0)));
  next.addEventListener('click', () => show(current === slides.length - 1 ? 0 : current + 1));

  show(0);
}

// Returns "row,col" keys for a highlight spec: "row:4", "col:7", "box:5" or "cell:5,5".
function cellsForSpec(spec) {
  const [kind, value] = spec.split(':');
  const keys = [];

  for (let row = 1; row <= 9; row++) {
    for (let col = 1; col <= 9; col++) {
      const box = Math.floor((row - 1) / 3) * 3 + Math.floor((col - 1) / 3) + 1;
      const matches =
        (kind === 'row' && row === Number(value)) ||
        (kind === 'col' && col === Number(value)) ||
        (kind === 'box' && box === Number(value)) ||
        (kind === 'cell' && `${row},${col}` === value);

      if (matches) {
        keys.push(`${row},${col}`);
      }
    }
  }

  return keys;
}

// 9×9 diagram. Markup: <div class="grid-diagram" data-strong="box:5" data-soft="row:5 col:5"></div>
function renderGridDiagram(element) {
  const specs = (attribute) => (element.dataset[attribute] || '').split(' ').filter(Boolean);
  const strong = new Set(specs('strong').flatMap(cellsForSpec));
  const soft = new Set(specs('soft').flatMap(cellsForSpec));

  for (let row = 1; row <= 9; row++) {
    for (let col = 1; col <= 9; col++) {
      const cell = document.createElement('span');
      const key = `${row},${col}`;

      if (strong.has(key)) {
        cell.classList.add('is-strong');
      } else if (soft.has(key)) {
        cell.classList.add('is-soft');
      }

      if (col % 3 === 0) cell.classList.add(col === 9 ? 'last-col' : 'edge-r');
      if (row % 3 === 0) cell.classList.add(row === 9 ? 'last-row' : 'edge-b');

      element.appendChild(cell);
    }
  }
}

// Full board. Markup: <div class="demo-board" data-givens="81 digits" data-added="81 digits" data-highlight="row:5"></div>
// Givens are prefilled cells, added digits are the player's (they pop in at random like the app's tutorial).
// Hint boards also take data-marks (81 candidate strings joined by "|") and data-roles
// (81 chars: p primary, s secondary, a action, w warning, g success, . none).
function renderDemoBoard(element) {
  const empty = '0'.repeat(81);
  const givens = element.dataset.givens || empty;
  const added = element.dataset.added || empty;
  const marks = element.dataset.marks ? element.dataset.marks.split('|') : [];
  const roles = element.dataset.roles || '';
  const highlight = element.dataset.highlight || '';
  const highlighted = new Set(highlight ? cellsForSpec(highlight) : []);
  const highlightClass = `hl-${highlight.split(':')[0]}`;

  for (let i = 0; i < 81; i++) {
    const row = Math.floor(i / 9) + 1;
    const col = (i % 9) + 1;
    const cell = document.createElement('span');

    if (givens[i] !== '0') {
      cell.textContent = givens[i];
      cell.classList.add('given');
    } else if (added[i] !== '0') {
      cell.textContent = added[i];
      cell.classList.add('added');
      cell.style.animationDelay = `${Math.round(Math.random() * 600)}ms`;
    } else if (marks[i]) {
      const pencil = document.createElement('div');
      pencil.className = 'marks';
      for (let digit = 1; digit <= 9; digit++) {
        const mark = document.createElement('span');
        if (marks[i].includes(String(digit))) mark.textContent = digit;
        pencil.appendChild(mark);
      }
      cell.appendChild(pencil);
    }

    if (roles[i] && roles[i] !== '.') cell.classList.add(`role-${roles[i]}`);

    if (highlighted.has(`${row},${col}`)) cell.classList.add(highlightClass);
    if (col % 3 === 0) cell.classList.add(col === 9 ? 'last-col' : 'edge-r');
    if (row % 3 === 0) cell.classList.add(row === 9 ? 'last-row' : 'edge-b');

    element.appendChild(cell);
  }
}

// Cell with pencil marks. Markup: <span class="mini-cell" data-candidates="258"></span>
function renderMiniCell(element) {
  for (let digit = 1; digit <= 9; digit++) {
    const mark = document.createElement('span');
    if (element.dataset.candidates.includes(String(digit))) mark.textContent = digit;
    element.appendChild(mark);
  }
}

// Highlighted cells on the background board: [x, y, style].
// x counts 64px cells from the viewport centre, y counts cells from the top.
// Kept to |x| >= 9 so they sit in the margins outside the content column.
const BOARD_CELLS = [
  [-10, 2, 'sage'], [-9, 2, 'yellow'],
  [-11, 8, 'coral'], [-11, 9, 'coral'],
  [10, 4, 'yellow'], [9, 10, 'sage']
];

function renderBoard(element) {
  BOARD_CELLS.forEach(([x, y, style]) => {
    const cell = document.createElement('span');
    cell.style.setProperty('--x', x);
    cell.style.setProperty('--y', y);
    cell.className = `is-${style}`;
    element.appendChild(cell);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.board').forEach(renderBoard);
  document.querySelectorAll('[data-stepper]').forEach(initStepper);
  document.querySelectorAll('.grid-diagram').forEach(renderGridDiagram);
  document.querySelectorAll('.mini-cell').forEach(renderMiniCell);
  document.querySelectorAll('.demo-board').forEach(renderDemoBoard);
});
