import { Component, DestroyRef, effect, inject, input, output } from '@angular/core';
import { NotificationTimer } from './notification-timer';

@Component({
  selector: 'app-cart-notice', standalone: true,
  template: `
    @if (message()) {
      <div class="cart-toast" role="status" aria-live="polite" aria-atomic="true"
        (mouseenter)="timer.pause('pointer')" (mouseleave)="timer.resume('pointer')"
        (focusin)="timer.pause('focus')" (focusout)="focusOut($event)">
        <span>{{ message() }}</span>
        <button type="button" class="toast-close" aria-label="Benachrichtigung schließen" (click)="dismiss()">×</button>
      </div>
    }
  `,
})
export class CartNoticeComponent {
  readonly message = input('');
  readonly closed = output<void>();
  readonly timer = new NotificationTimer(() => this.closed.emit());
  constructor() {
    effect(() => { if (this.message()) this.timer.start(); else this.timer.stop(); });
    inject(DestroyRef).onDestroy(() => this.timer.stop());
  }
  dismiss(): void { this.timer.stop(); this.closed.emit(); }
  focusOut(event: FocusEvent): void {
    const container = event.currentTarget as HTMLElement;
    if (!(event.relatedTarget instanceof Node) || !container.contains(event.relatedTarget)) this.timer.resume('focus');
  }
}
