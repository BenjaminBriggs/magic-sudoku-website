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
      // The number pops in on its own; the square, its lines and highlight stay put.
      const digit = document.createElement('span');
      digit.className = 'digit';
      digit.textContent = added[i];
      digit.style.animationDelay = `${Math.round(Math.random() * 600)}ms`;
      cell.appendChild(digit);
      cell.classList.add('added');
    } else if (marks[i]) {
      const pencil = document.createElement('div');
      pencil.className = 'marks';
      // Fewer marks read stronger, as in the app.
      if (marks[i].length <= 2) pencil.classList.add('is-few');
      else if (marks[i].length <= 4) pencil.classList.add('is-some');
      else pencil.classList.add('is-many');
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

// One frame of a technique page's worked example, as scripts/build-learn.py writes it from
// guides.json. Markup:
// <div class="demo-board" data-givens="81 digits" data-notes="81 note strings joined by |"
//      data-frame='{"highlights":[{"square":[r,c],"role":"primary",…}],"crossedOff":[[r,c,n]],…}'></div>
// Rows and columns count from 0. Like the app's example board: squares in the hint card's
// colours, or a selection tinting its row, column and house; notes crossed off in red; other
// notes faded where a square spotlights some; and outlines and dashed links drawn over the top.
const GUIDE_ROLES = { primary: 'p', secondary: 's', action: 'a', warning: 'w', success: 'g' };

function renderGuideBoard(element) {
  const givens = element.dataset.givens;
  const notes = element.dataset.notes.split('|');
  const frame = JSON.parse(element.dataset.frame);
  const at = ([row, col]) => row * 9 + col;
  const boxOf = (i) => Math.floor(i / 27) * 3 + Math.floor((i % 9) / 3);
  const highlights = new Map((frame.highlights || []).map((h) => [at(h.square), h]));
  const crossed = new Map();
  for (const [row, col, number] of frame.crossedOff || []) {
    const i = at([row, col]);
    crossed.set(i, `${crossed.get(i) || ''}${number}`);
  }
  const selected = new Set((frame.selection || []).map(at));
  const influenced = (i) => [...selected].some((s) =>
    Math.floor(s / 9) === Math.floor(i / 9) || s % 9 === i % 9 || boxOf(s) === boxOf(i));

  for (let i = 0; i < 81; i++) {
    const row = Math.floor(i / 9) + 1;
    const col = (i % 9) + 1;
    const cell = document.createElement('span');
    const highlight = highlights.get(i);

    if (givens[i] !== '0') {
      cell.textContent = givens[i];
      cell.classList.add('given');
    } else if (highlight && highlight.value) {
      const digit = document.createElement('span');
      digit.className = 'digit';
      digit.textContent = highlight.value;
      cell.appendChild(digit);
      cell.classList.add('added');
    } else {
      const digits = highlight && highlight.notes !== undefined ? highlight.notes : notes[i];
      if (digits) {
        const spotlight = (highlight && highlight.spotlight) || '';
        const crossedHere = crossed.get(i) || '';
        // As in the app, the notes left after crossing off decide how strongly the square's
        // notes are drawn, and a square that both keeps and loses notes draws them smaller.
        const kept = [...digits].filter((digit) => crossedHere.includes(digit) === false);
        const pencil = document.createElement('div');
        pencil.className = 'marks';
        if (spotlight) pencil.classList.add('has-spotlight');
        else if (kept.length <= 2) pencil.classList.add('is-few');
        else if (kept.length <= 4) pencil.classList.add('is-some');
        else pencil.classList.add('is-many');
        if (crossedHere && kept.length > 0) pencil.classList.add('keeps-notes');
        for (let digit = 1; digit <= 9; digit++) {
          const mark = document.createElement('span');
          if (digits.includes(String(digit))) {
            mark.textContent = digit;
            if (crossedHere.includes(String(digit))) mark.className = 'is-crossed';
            else if (spotlight && spotlight.includes(String(digit))) mark.className = 'is-spotlit';
            else if (spotlight) mark.className = 'is-faded';
          }
          pencil.appendChild(mark);
        }
        cell.appendChild(pencil);
      }
    }

    if (highlight && GUIDE_ROLES[highlight.role]) {
      cell.classList.add(`role-${GUIDE_ROLES[highlight.role]}`);
    } else if (selected.has(i)) {
      cell.classList.add('is-selected');
    } else if (selected.size > 0 && influenced(i)) {
      cell.classList.add('is-influenced');
    }
    if (highlight && highlight.label) {
      const label = document.createElement('span');
      label.className = 'cell-label';
      label.textContent = highlight.label;
      cell.appendChild(label);
    }

    if (col % 3 === 0) cell.classList.add(col === 9 ? 'last-col' : 'edge-r');
    if (row % 3 === 0) cell.classList.add(row === 9 ? 'last-row' : 'edge-b');

    element.appendChild(cell);
  }

  if (frame.marks && frame.marks.length > 0) {
    element.appendChild(guideMarks(frame.marks));
  }
}

// Outlines and dashed links over a guide board, in the app's accent colour, on a 9×9 grid of
// squares. An outline runs along the inside of its edge; a link runs between the squares' edges,
// so it points at them without covering their notes.
function guideMarks(marks) {
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('class', 'guide-marks');
  svg.setAttribute('viewBox', '0 0 9 9');
  svg.setAttribute('aria-hidden', 'true');
  const outline = 0.08;
  const shape = (name, attributes) => {
    const node = document.createElementNS(svgNS, name);
    Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, value));
    svg.appendChild(node);
  };
  const box = (x, y, size) => shape('rect', {
    x: x + outline / 2, y: y + outline / 2, width: size - outline, height: size - outline,
    rx: 0.12, class: 'is-outline'
  });

  for (const mark of marks) {
    if (mark.house !== undefined) {
      box((mark.house % 3) * 3, Math.floor(mark.house / 3) * 3, 3);
    } else if (mark.square) {
      box(mark.square[1], mark.square[0], 1);
    } else if (mark.link) {
      const [[fromRow, fromCol], [toRow, toCol]] = mark.link;
      const dx = toCol - fromCol;
      const dy = toRow - fromRow;
      const share = 0.5 / Math.max(Math.abs(dx), Math.abs(dy));
      shape('line', {
        x1: fromCol + 0.5 + dx * share, y1: fromRow + 0.5 + dy * share,
        x2: toCol + 0.5 - dx * share, y2: toRow + 0.5 - dy * share,
        class: 'is-link'
      });
    }
  }
  return svg;
}

// Cell with pencil marks. Markup: <span class="mini-cell" data-candidates="258"></span>
function renderMiniCell(element) {
  for (let digit = 1; digit <= 9; digit++) {
    const mark = document.createElement('span');
    if (element.dataset.candidates.includes(String(digit))) mark.textContent = digit;
    element.appendChild(mark);
  }
}

// Board drawn to the app's spec (css/app-board.css). Markup:
// <div class="app-board" data-givens="81 digits" data-marks="4,1:139 4,3:1239 …"
//      data-select="4,6" data-answer="2"></div>
// Rows and columns count from 1. The selected square is highlighted with its row, column and
// box, shows the answer as its lone pencil mark, and turns it into a pen number on a loop.
function renderAppBoard(element) {
  const givens = element.dataset.givens;
  const marks = new Map(
    (element.dataset.marks || '').split(' ').filter(Boolean).map((entry) => entry.split(':'))
  );
  const [selectedRow, selectedCol] = (element.dataset.select || '0,0').split(',').map(Number);
  const answer = element.dataset.answer || '';
  const boxOf = (row, col) => Math.floor((row - 1) / 3) * 3 + Math.floor((col - 1) / 3);

  const marksGrid = (digits) => {
    const grid = document.createElement('span');
    grid.className = 'marks';
    if (digits.length <= 2) grid.classList.add('is-few');
    else if (digits.length <= 4) grid.classList.add('is-some');
    else grid.classList.add('is-many');
    for (let digit = 1; digit <= 9; digit++) {
      const mark = document.createElement('span');
      if (digits.includes(String(digit))) mark.textContent = digit;
      grid.appendChild(mark);
    }
    return grid;
  };

  for (let i = 0; i < 81; i++) {
    const row = Math.floor(i / 9) + 1;
    const col = (i % 9) + 1;
    const key = `${row},${col}`;
    const cell = document.createElement('span');

    // The app's lines sit on the left and top edges of every square after the first.
    cell.style.setProperty('--l', col === 1 ? '0px' : col % 3 === 1 ? 'var(--thick)' : 'var(--thin)');
    cell.style.setProperty('--t', row === 1 ? '0px' : row % 3 === 1 ? 'var(--thick)' : 'var(--thin)');
    if ((row + col) % 2 === 0) cell.classList.add('is-alt');

    const isSelected = row === selectedRow && col === selectedCol;
    if (isSelected) {
      cell.classList.add('is-selected');
    } else if (
      row === selectedRow ||
      col === selectedCol ||
      boxOf(row, col) === boxOf(selectedRow, selectedCol)
    ) {
      cell.classList.add('is-highlighted');
    }

    if (givens[i] !== '0') {
      cell.textContent = givens[i];
      cell.classList.add('is-given');
    } else if (isSelected) {
      cell.appendChild(marksGrid(answer));
      const pen = document.createElement('span');
      pen.className = 'pen';
      pen.textContent = answer;
      cell.appendChild(pen);
    } else if (marks.has(key)) {
      cell.appendChild(marksGrid(marks.get(key)));
    }

    element.appendChild(cell);
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
  document.querySelectorAll('.demo-board:not([data-frame])').forEach(renderDemoBoard);
  document.querySelectorAll('.demo-board[data-frame]').forEach(renderGuideBoard);
  document.querySelectorAll('.app-board').forEach(renderAppBoard);
});
