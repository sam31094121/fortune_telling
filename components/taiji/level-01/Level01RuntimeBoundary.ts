export class Level01RuntimeBoundary {
  private disposed = false;
  private onError: (error: unknown) => void;

  constructor(onError: (error: unknown) => void) {
    this.onError = onError;
  }

  run<T>(fallback: T, task: () => T): T {
    if (this.disposed) return fallback;
    try {
      return task();
    } catch (error) {
      this.onError(error);
      return fallback;
    }
  }

  dispose() {
    this.disposed = true;
  }
}
