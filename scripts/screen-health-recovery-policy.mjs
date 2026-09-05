/** Functional regressions must never trigger a server restart. */
export function canRecoverService(report, recoveryRequested) {
  if (!recoveryRequested || report.ok) return false;
  return report.routes.some((route) =>
    ['HOME', 'READY'].includes(route.id)
    && route.status === 'FAILED'
    && (route.httpStatus === 0 || route.httpStatus >= 500));
}
