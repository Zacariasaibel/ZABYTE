interface TimerClock {
  now(): number;
  set(callback: () => void, delay: number): ReturnType<typeof setTimeout>;
  clear(handle: ReturnType<typeof setTimeout>): void;
}

export class NotificationTimer {
  private handle: ReturnType<typeof setTimeout> | null = null;
  private remaining = 0;
  private started = 0;
  private active = false;
  private readonly pauses = new Set<string>();

  constructor(private readonly dismiss: () => void, private readonly clock: TimerClock = {
    now: () => Date.now(), set: (callback, delay) => setTimeout(callback, delay), clear: (handle) => clearTimeout(handle),
  }) {}

  start(duration = 6000): void {
    this.cancel();
    this.remaining = duration;
    this.active = true;
    this.schedule();
  }

  pause(reason: string): void {
    if (this.pauses.has(reason)) return;
    if (this.handle !== null) this.remaining = Math.max(0, this.remaining - (this.clock.now() - this.started));
    this.pauses.add(reason);
    this.cancel();
  }

  resume(reason: string): void {
    this.pauses.delete(reason);
    if (this.handle === null) this.schedule();
  }

  stop(): void {
    this.cancel();
    this.active = false;
    this.pauses.clear();
  }

  private cancel(): void {
    if (this.handle !== null) this.clock.clear(this.handle);
    this.handle = null;
  }

  private schedule(): void {
    if (!this.active || this.pauses.size) return;
    this.started = this.clock.now();
    this.handle = this.clock.set(() => { this.handle = null; this.active = false; this.dismiss(); }, this.remaining);
  }
}
