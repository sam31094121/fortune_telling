import AiTrustFeedback from '@/components/AiTrustFeedback';
import FeatureVisitorCounter from '@/components/FeatureVisitorCounter';

export default function HomeTrustCounters(_props: { onFeedback?: (vote: 'agree' | 'disagree') => void }) {
  return <div className="home-trust-counters grid gap-3 sm:grid-cols-2"><AiTrustFeedback /><FeatureVisitorCounter featureKey="home" compact /></div>;
}
