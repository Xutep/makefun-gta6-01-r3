// Marisol City — keyboard + mouse input, with edge-triggered "pressed" keys.

export function createInput(canvas) {
  const input = {
    keys: new Set(),
    pressed: new Set(),
    mouse: { x: 0, y: 0, down: false, clicked: false },
  };
  const blocked = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'];
  window.addEventListener('keydown', (e) => {
    if (!input.keys.has(e.code)) input.pressed.add(e.code);
    input.keys.add(e.code);
    if (blocked.includes(e.code)) e.preventDefault();
  });
  window.addEventListener('keyup', (e) => input.keys.delete(e.code));
  window.addEventListener('blur', () => input.keys.clear());
  canvas.addEventListener('mousemove', (e) => {
    const r = canvas.getBoundingClientRect();
    input.mouse.x = (e.clientX - r.left) * (canvas.width / Math.max(1, r.width));
    input.mouse.y = (e.clientY - r.top) * (canvas.height / Math.max(1, r.height));
  });
  canvas.addEventListener('mousedown', (e) => {
    input.mouse.down = true;
    input.mouse.clicked = true;
    if (e.button === 0) e.preventDefault();
  });
  window.addEventListener('mouseup', () => { input.mouse.down = false; });
  return input;
}

// Call once per rendered frame, after the update, to clear edge triggers.
export function endFrame(input) {
  input.pressed.clear();
  input.mouse.clicked = false;
}

export function keyDown(input, ...codes) {
  return codes.some((c) => input.keys.has(c));
}

export function keyPressed(input, ...codes) {
  return codes.some((c) => input.pressed.has(c));
}
