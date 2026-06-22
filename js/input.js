export function createInput() {
  const keysDown = new Set();
  const keysPressed = new Set();

  const actionMap = {
    ArrowLeft: 'left',
    ArrowRight: 'right',
    ArrowUp: 'rotateCW',
    ArrowDown: 'softDrop',
    ' ': 'hardDrop',
    Space: 'hardDrop',
    h: 'hold',
    H: 'hold',
    z: 'rotateCCW',
    Z: 'rotateCCW',
    Control: 'rotateCCW',
    p: 'pause',
    P: 'pause',
  };

  function onKeyDown(event) {
    if (event.repeat) {
      return;
    }
    const action = actionMap[event.key];
    if (action) {
      event.preventDefault();
      if (!keysDown.has(event.key)) {
        keysPressed.add(action);
      }
      keysDown.add(event.key);
    }
  }

  function onKeyUp(event) {
    keysDown.delete(event.key);
  }

  function isHeld(action) {
    for (const [key, mapped] of Object.entries(actionMap)) {
      if (mapped === action && keysDown.has(key)) {
        return true;
      }
    }
    return false;
  }

  function consumePressed() {
    const pressed = [...keysPressed];
    keysPressed.clear();
    return pressed;
  }

  function attach() {
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
  }

  function detach() {
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    keysDown.clear();
    keysPressed.clear();
  }

  return {
    attach,
    detach,
    consumePressed,
    isHeld,
  };
}
