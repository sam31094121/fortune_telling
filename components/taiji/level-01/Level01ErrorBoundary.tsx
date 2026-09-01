'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';

export class Level01ErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(_error: Error, _info: ErrorInfo) {
    // LEVEL_01 errors are intentionally contained here. No raw sensor data is logged.
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
