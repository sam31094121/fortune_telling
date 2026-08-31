type CrossCandidate = { version?: unknown; score?: unknown; matrix?: { score?: unknown; weight?: unknown; contribution?: unknown }; iching?: { score?: unknown; weight?: unknown; contribution?: unknown; signalSummary?: unknown } };
type IChingCandidate = { hexagram?: { kingWen?: unknown }; chainScore?: unknown; digitReadings?: unknown; crossChain?: unknown };

const finite = (value: unknown) => typeof value === 'number' && Number.isFinite(value);

/** The customer verdict may only render when both deterministic sources are present. */
export function hasCompleteNumberCrossVerdict(cross: CrossCandidate | null | undefined, iching: IChingCandidate | null | undefined) {
  return cross?.version === 'number-cross-verdict-v1' && finite(cross.score) && finite(cross.matrix?.score) && cross.matrix?.weight === 60 && finite(cross.matrix?.contribution)
    && finite(cross.iching?.score) && cross.iching?.weight === 40 && finite(cross.iching?.contribution) && typeof cross.iching?.signalSummary === 'string'
    && finite(iching?.hexagram?.kingWen) && finite(iching?.chainScore) && Array.isArray(iching?.digitReadings) && Array.isArray(iching?.crossChain);
}
