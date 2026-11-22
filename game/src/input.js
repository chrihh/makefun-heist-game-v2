// Keyboard and mouse for the dock-thief: WASD/arrows to move, Shift to
// sneak, Space to sprint, P pauses, Enter confirms, and a mouse click throws
// a bottle that clinks where it lands and pulls wardens off their loops.

export function createInput(canvas) {
  const keys = new Set();
  let bottle = null;
  let confirmPressed = false;
  let pausePressed = false;

  window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    keys.add(e.code);
    if (e.code === 'Enter') confirmPressed = true;
    if (e.code === 'KeyP') pausePressed = true;
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));
  canvas.addEventListener('pointerdown', (e) => {
    const rect = canvas.getBoundingClientRect();
    bottle = {
      x: ((e.clientX - rect.left) / rect.width) * 1280,
      y: ((e.clientY - rect.top) / rect.height) * 720,
    };
  });

  return {
    read() {
      const x = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
      const y = (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) - (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0);
      const out = { x, y, sneak: keys.has('ShiftLeft') || keys.has('ShiftRight'), sprint: keys.has('Space'), bottle };
      bottle = null;
      return out;
    },
    takeConfirm() { const v = confirmPressed; confirmPressed = false; return v; },
    takePause() { const v = pausePressed; pausePressed = false; return v; },
  };
}
