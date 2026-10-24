import type { Command } from '../../game-core/src/types.ts';

/** PC adapter only: convert keyboard events into command HOLD states. */
export class KeyboardInput {
  private pressed = new Set<string>();
  private attached = false;
  private onDown = (event: KeyboardEvent): void => {
    const target = event.target;
    if (target instanceof Element && target.closest('input,textarea,[contenteditable="true"]')) return;
    if (this.controls.has(event.code)) {
      event.preventDefault();
      this.pressed.add(event.code);
    }
  };
  private onUp = (event: KeyboardEvent): void => { this.pressed.delete(event.code); };
  private onBlur = (): void => { this.reset(); };
  private onVisibility = (): void => { if (document.hidden) this.reset(); };
  private controls = new Set([
    'KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight',
    'Space', 'KeyJ', 'ShiftLeft', 'ShiftRight', 'KeyK',
  ]);
  attach(): void {
    if (this.attached) return;
    window.addEventListener('keydown', this.onDown, { passive: false });
    window.addEventListener('keyup', this.onUp);
    window.addEventListener('blur', this.onBlur);
    document.addEventListener('visibilitychange', this.onVisibility);
    this.attached = true;
  }
  detach(): void {
    if (!this.attached) return;
    window.removeEventListener('keydown', this.onDown);
    window.removeEventListener('keyup', this.onUp);
    window.removeEventListener('blur', this.onBlur);
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.reset(); this.attached = false;
  }
  reset(): void { this.pressed.clear(); }
  read(): Command {
    const has = (...codes: string[]) => codes.some(c => this.pressed.has(c));
    const moveX = Number(has('KeyD', 'ArrowRight')) - Number(has('KeyA', 'ArrowLeft'));
    const moveZ = Number(has('KeyS', 'ArrowDown')) - Number(has('KeyW', 'ArrowUp'));
    return {
      moveX, moveZ,
      attackHeld: has('Space', 'KeyJ'),
      guardHeld: has('KeyK', 'ShiftLeft', 'ShiftRight'),
    };
  }
}
