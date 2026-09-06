'use client';

/**
 * Engine Layered Puppet — rAF 驅動的分層傀儡衝鋒（6.0s）。
 *
 * 為什麼不用 mp4：人審（human gate）連續 FAIL 了「整身 Ken Burns／假動態」版本。
 * 引擎路徑讓 jaw / limb / tail 各自獨立 transform，肉眼可見咬擊與衝刺。
 * full_body 僅作資產存檔，禁止拿來做縮放動畫。
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import styles from './BeastLayeredPuppet.module.css';

export type BeastLayeredPuppetProps = {
  poolId: string;
  playing: boolean;
  onDone?: () => void;
  className?: string;
};

type PuppetManifest = {
  poolId: string;
  durationSec?: number;
  layers: string[];
  paths: Record<string, string>;
  stage?: string;
  motion?: string;
};

const LAYER_ORDER = [
  'torso',
  'rear_limb',
  'tail',
  'front_limb',
  'head_upper',
  'jaw_mouth',
] as const;

type LayerId = (typeof LAYER_ORDER)[number];

const DURATION_MS = 6000;

function clamp01(t: number) {
  return Math.max(0, Math.min(1, t));
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function smoothstep(t: number) {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
}

/** 依時間算出各層 transform（禁止整身 Ken Burns）。v1.2：咬合 peak≥2.6、肢 amp40、尾 ±36deg — 肉眼必見。 */
function computePose(elapsedSec: number) {
  // build 0–1.8 | rush 1.8–3.8 | bite 3.8–6.0
  const breathe = 1 + 0.025 * Math.sin(elapsedSec * Math.PI * 2); // ≤1.03
  let bodyX = 0;
  let bodyY = 0;
  let bodyScale = 1;
  let frontY = 0;
  let frontX = 0;
  let rearY = 0;
  let rearX = 0;
  let tailRot = 0;
  let jawScaleY = 1;
  let jawRot = 0;
  let headY = 0;
  let headX = 0;
  let flash = 0;

  if (elapsedSec < 1.8) {
    // build：呼吸、尾明顯擺、顎幾乎閉
    const t = elapsedSec / 1.8;
    bodyScale = breathe;
    tailRot = Math.sin(elapsedSec * Math.PI * 2.4) * 22;
    jawScaleY = 1 + 0.12 * Math.sin(t * Math.PI);
    jawRot = -6 * Math.sin(t * Math.PI);
    frontY = Math.sin(elapsedSec * Math.PI * 2) * 6;
    rearY = -Math.sin(elapsedSec * Math.PI * 2) * 6;
    bodyY = lerp(0, -3, smoothstep(t));
  } else if (elapsedSec < 3.8) {
    // rush：上衝、肢大幅交替、尾 ±36deg、顎蓄咬
    const t = (elapsedSec - 1.8) / 2.0;
    const s = smoothstep(t);
    bodyScale = breathe;
    bodyY = lerp(-3, -32, s);
    bodyX = lerp(0, 12, s);
    const limbAmp = 40;
    const limbPhase = Math.sin((elapsedSec - 1.8) * Math.PI * 5.2);
    frontY = limbPhase * limbAmp;
    frontX = limbPhase * 14;
    rearY = -limbPhase * limbAmp;
    rearX = -limbPhase * 12;
    tailRot = Math.sin((elapsedSec - 1.8) * Math.PI * 3.6) * 36;
    jawScaleY = lerp(1.08, 1.45, s);
    jawRot = lerp(-6, -14, s);
    headY = lerp(0, -8, s);
  } else {
    // bite：顎 scaleY → 2.6 再 snap、頭前衝、白閃
    const t = (elapsedSec - 3.8) / 2.2;
    bodyScale = 1.025;
    bodyY = -34;
    bodyX = 14;
    const openPhase = clamp01(t / 0.30);
    const snapPhase = clamp01((t - 0.30) / 0.10);
    if (t < 0.30) {
      jawScaleY = lerp(1.45, 2.6, smoothstep(openPhase));
      jawRot = lerp(-14, -26, smoothstep(openPhase));
      headY = lerp(-8, -16, smoothstep(openPhase));
      headX = lerp(0, 10, smoothstep(openPhase));
      flash = openPhase * 0.3;
    } else if (t < 0.48) {
      jawScaleY = lerp(2.6, 1.0, smoothstep(snapPhase));
      jawRot = lerp(-26, 0, smoothstep(snapPhase));
      headY = -18;
      headX = 16;
      flash = 1 - snapPhase;
    } else {
      jawScaleY = 1.0;
      jawRot = 0;
      headY = -12;
      headX = 12;
      flash = t < 0.65 ? (1 - (t - 0.48) / 0.17) * 0.6 : 0;
    }
    const limbAmp = 24;
    const limbPhase = Math.sin((elapsedSec - 3.8) * Math.PI * 2.6);
    frontY = 10 + limbPhase * limbAmp;
    frontX = 14;
    rearY = -8 - limbPhase * limbAmp * 0.85;
    rearX = -12;
    tailRot = Math.sin(elapsedSec * Math.PI * 3.0) * 30;
  }

  return { bodyX, bodyY, bodyScale, frontY, frontX, rearY, rearX, tailRot, jawScaleY, jawRot, headY, headX, flash };
}

export default function BeastLayeredPuppet({
  poolId,
  playing,
  onDone,
  className,
}: BeastLayeredPuppetProps) {
  const [manifest, setManifest] = useState<PuppetManifest | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const layerRefs = useRef<Partial<Record<LayerId, HTMLImageElement | null>>>({});
  const bodyRef = useRef<HTMLDivElement>(null);
  const flashRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number>(0);
  const doneFired = useRef(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  // 載入 manifest；404 → null（父層退回影片）
  useEffect(() => {
    let cancelled = false;
    setFailed(false);
    setReady(false);
    setManifest(null);
    doneFired.current = false;

    void (async () => {
      try {
        const url = `/beast-game/puppets/${poolId}/manifest.json`;
        const res = await fetch(url, { cache: 'force-cache' });
        if (!res.ok) {
          if (!cancelled) setFailed(true);
          return;
        }
        const data = (await res.json()) as PuppetManifest;
        if (!data?.paths || !Array.isArray(data.layers)) {
          if (!cancelled) setFailed(true);
          return;
        }
        // 預載分層圖（不用 full_body 做動畫）
        const needed = LAYER_ORDER.filter((id) => data.paths[id]);
        await Promise.all(
          needed.map(
            (id) =>
              new Promise<void>((resolve, reject) => {
                const img = new Image();
                img.onload = () => resolve();
                img.onerror = () => reject(new Error(id));
                img.src = data.paths[id];
              }),
          ),
        );
        if (cancelled) return;
        setManifest(data);
        setReady(true);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [poolId]);

  const applyPose = useCallback((elapsedSec: number) => {
    const pose = computePose(elapsedSec);
    const body = bodyRef.current;
    if (body) {
      body.style.transform = `translate(${pose.bodyX}%, ${pose.bodyY}%) scale(${pose.bodyScale})`;
    }
    const setLayer = (id: LayerId, transform: string) => {
      const el = layerRefs.current[id];
      if (el) el.style.transform = transform;
    };
    setLayer('torso', 'translate(0,0)');
    setLayer('rear_limb', `translate(${pose.rearX}%, ${pose.rearY}%)`);
    setLayer('tail', `rotate(${pose.tailRot}deg)`);
    setLayer('front_limb', `translate(${pose.frontX}%, ${pose.frontY}%)`);
    setLayer('head_upper', `translate(${pose.headX}%, ${pose.headY}%)`);
    setLayer('jaw_mouth', `translate(${pose.headX}%, ${pose.headY + (pose.jawScaleY - 1) * 6}%) rotate(${pose.jawRot}deg) scaleY(${pose.jawScaleY})`);
    if (flashRef.current) {
      flashRef.current.style.opacity = String(pose.flash);
    }
  }, []);

  // rAF 6.0s
  useEffect(() => {
    if (!playing || !ready || failed || !manifest) return;

    doneFired.current = false;
    startRef.current = performance.now();
    applyPose(0);

    const tick = (now: number) => {
      const elapsed = now - startRef.current;
      const sec = Math.min(elapsed / 1000, DURATION_MS / 1000);
      applyPose(sec);
      if (elapsed >= DURATION_MS) {
        applyPose(DURATION_MS / 1000);
        if (!doneFired.current) {
          doneFired.current = true;
          onDoneRef.current?.();
        }
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [playing, ready, failed, manifest, applyPose]);

  // 資產 404／未就緒：render null，父層用 chargeVideoFor
  if (failed || !ready || !manifest) return null;

  const stageSrc =
    manifest.stage ?? '/beast-game/stage/default/circus_arena.jpg';

  return (
    <div
      ref={rootRef}
      className={`${styles.root} ${className ?? ''}`}
      data-beast-layered-puppet={poolId}
      data-motion={manifest.motion ?? 'engine_layered_puppet_v1'}
      aria-hidden
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className={styles.stage} src={stageSrc} alt="" draggable={false} />
      <div ref={bodyRef} className={styles.body}>
        {LAYER_ORDER.map((id) => {
          const src = manifest.paths[id];
          if (!src) return null;
          return (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={id}
              ref={(el) => {
                layerRefs.current[id] = el;
              }}
              className={`${styles.layer} ${styles[id] ?? ''}`}
              data-layer={id}
              src={src}
              alt=""
              draggable={false}
            />
          );
        })}
      </div>
      <div ref={flashRef} className={styles.flash} />
    </div>
  );
}

/** 探測某 poolId 是否有可用的分層傀儡 manifest（至少 beast_a01）。 */
export async function probePuppetManifest(poolId: string): Promise<boolean> {
  try {
    const res = await fetch(`/beast-game/puppets/${poolId}/manifest.json`, {
      cache: 'force-cache',
    });
    if (!res.ok) return false;
    const data = (await res.json()) as PuppetManifest;
    return Boolean(data?.paths?.torso && data?.paths?.jaw_mouth);
  } catch {
    return false;
  }
}
