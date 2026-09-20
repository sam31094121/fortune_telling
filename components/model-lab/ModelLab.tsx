'use client';

import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react';
import type * as THREE from 'three';
import type { CSSProperties } from 'react';
import LabStage, { type NudgeFn, type StageSettings } from './LabStage';
import { LAB_MODELS, defaultLayers, type LabModel, type LabRef } from './models/registry';
import styles from './ModelLab.module.css';
import LatticeInterior from './LatticeInterior';
import LatticeEntrance from './LatticeEntrance';

type BlendMode = 'normal' | 'difference' | 'screen';

const BLEND_LABEL: Record<BlendMode, string> = {
  normal: '一般（疊上去）',
  difference: '差異（對位用）',
  screen: '濾色（看輪廓）',
};

const PAD: [number, number, string][] = [
  [-1, 1, '↖'], [0, 1, '↑'], [1, 1, '↗'],
  [-1, 0, '←'], [0, 0, '⟲'], [1, 0, '→'],
  [-1, -1, '↙'], [0, -1, '↓'], [1, -1, '↘'],
];

function modelDefaults(model: LabModel | undefined): Partial<StageSettings> {
  const hasViews = Boolean(model?.views?.length);
  return {
    layers: defaultLayers(model),
    viewId: model?.views?.[0]?.id ?? null,
    ortho: hasViews,
    showGrid: !hasViews,
    showShadow: !hasViews,
  };
}

const INITIAL_MODEL = LAB_MODELS[0];

export default function ModelLab() {
  const [inside, setInside] = useState(false);
  const [entrance, setEntrance] = useState(false);
  const enterInterior = useCallback(() => { setEntrance(false); setInside(true); }, []);
  const leaveInterior = useCallback(() => setInside(false), []);
  const [settings, setSettings] = useState<StageSettings>(() => ({
    modelId: INITIAL_MODEL.id,
    glbUrl: null,
    wireframe: false,
    showGrid: true,
    showGizmo: true,
    showShadow: true,
    autoRotate: true,
    background: '#0d1018',
    ambient: 0.55,
    keyLight: 2.2,
    fillLight: 0.6,
    keyAngle: 45,
    fov: 45,
    ortho: false,
    viewId: null,
    viewNonce: 0,
    layers: {},
    dragSpeed: 1,
    ...modelDefaults(INITIAL_MODEL),
  }));
  const [stepDeg, setStepDeg] = useState(5);
  const nudgeRef = useRef<NudgeFn | null>(null);
  const [overlayAspect, setOverlayAspect] = useState<number | null>(null);
  const [lockAspect, setLockAspect] = useState(true);
  const [refId, setRefId] = useState('');

  const [overlaySrc, setOverlaySrc] = useState<string | null>(null);
  const [overlayOn, setOverlayOn] = useState(true);
  // 參考幀只存在本機：別台機器（含正式站）載不到時要照實說，不能讓狀態列繼續報吻合率。
  const [overlayMissing, setOverlayMissing] = useState(false);
  const [overlayOpacity, setOverlayOpacity] = useState(0.5);
  const [overlayBlend, setOverlayBlend] = useState<BlendMode>('normal');
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [fps, setFps] = useState(30);
  const [videoTime, setVideoTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [status, setStatus] = useState('舞台就緒。等你的影片。');
  const [glbName, setGlbName] = useState<string | null>(null);

  const readoutRef = useRef<HTMLSpanElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const objectUrls = useRef<string[]>([]);

  useEffect(() => {
    const urls = objectUrls.current;
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  const trackUrl = (url: string) => {
    objectUrls.current.push(url);
    return url;
  };

  const patch = useCallback((next: Partial<StageSettings>) => {
    setSettings((prev) => ({ ...prev, ...next }));
  }, []);

  const onRendererReady = useCallback((gl: THREE.WebGLRenderer) => {
    rendererRef.current = gl;
  }, []);

  const onLoadError = useCallback((message: string) => {
    setStatus(`模型載入失敗：${message}`);
  }, []);

  function pickReference(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const url = trackUrl(URL.createObjectURL(file));
    setRefId('');
    if (file.type.startsWith('video/')) {
      setVideoSrc(url);
      setOverlaySrc(null);
      setStatus(`影片已載入：${file.name}。拖時間軸選幀，再按「設為參考幀」。`);
    } else {
      setVideoSrc(null);
      setOverlaySrc(url);
      setStatus(`參考圖已載入：${file.name}`);
    }
    event.target.value = '';
  }

  function pickGlb(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const url = trackUrl(URL.createObjectURL(file));
    setGlbName(file.name);
    patch({ glbUrl: url });
    setStatus(`模型已載入：${file.name}`);
    event.target.value = '';
  }

  function stepFrame(direction: number) {
    const video = videoRef.current;
    if (!video) return;
    const next = Math.min(Math.max(video.currentTime + direction / fps, 0), video.duration || 0);
    video.currentTime = next;
    setVideoTime(next);
  }

  function captureFrame() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) {
      setStatus('還沒有影片可以擷取。');
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setStatus('這台瀏覽器取不到 2D 繪圖環境，無法擷取幀。');
      return;
    }
    ctx.drawImage(video, 0, 0);
    setOverlaySrc(canvas.toDataURL('image/png'));
    setOverlayOn(true);
    const frameNo = Math.round(video.currentTime * fps);
    setStatus(`已擷取第 ${frameNo} 幀（${video.currentTime.toFixed(3)}s）當參考。`);
  }

  function saveRender() {
    const gl = rendererRef.current;
    if (!gl) {
      setStatus('畫面還沒準備好。');
      return;
    }
    const link = document.createElement('a');
    link.download = `model-lab-${Date.now()}.png`;
    link.href = gl.domElement.toDataURL('image/png');
    link.click();
    setStatus('已輸出目前視角的 PNG。');
  }

  function applyRef(ref: LabRef) {
    setRefId(ref.id);
    setVideoSrc(null);
    setOverlaySrc(ref.src);
    setOverlayOn(true);
    setOverlayMissing(false);
    patch({ viewId: ref.viewId, layers: { ...defaultLayers(activeModel), ...ref.layers }, ortho: true, showGrid: false, showShadow: false, showGizmo: false });
    setSettings((prev) => ({ ...prev, viewNonce: prev.viewNonce + 1 }));
    const view = activeModel?.views?.find((v) => v.id === ref.viewId);
    setStatus(`已套用參考幀 ${ref.name}。${view?.note ?? ''}　建議混合選「差異」：對齊的地方會變暗。`);
  }

  const activeModel = LAB_MODELS.find((m) => m.id === settings.modelId);
  const activeNote = activeModel?.note ?? '';
  const activeView = activeModel?.views?.find((v) => v.id === settings.viewId) ?? null;
  const aspectLocked = lockAspect && overlaySrc && overlayOn && overlayAspect;
  const frameStyle = aspectLocked ? ({ '--ar': overlayAspect } as CSSProperties) : undefined;

  return (
    <>
    {inside ? <LatticeInterior onExit={leaveInterior} /> : null}
    {entrance ? <LatticeEntrance settings={settings} onEnter={enterInterior} onExit={() => setEntrance(false)} /> : null}
    <div className={styles.lab} style={inside || entrance ? { visibility: 'hidden', pointerEvents: 'none' } : undefined} aria-hidden={inside || entrance || undefined} inert={inside || entrance || undefined}>
      <aside className={styles.panel}>
        <header className={styles.head}>
          <h1 className={styles.title}>3D 模型工作室</h1>
          <p className={styles.sub}>獨立工作區。影片逐幀對位 → 建模 → 對照 → 輸出。</p>
        </header>

        <section className={styles.group}>
          <h2 className={styles.groupTitle}>模型</h2>
          <label className={styles.row}>
            <span>舞台內容</span>
            <select
              className={styles.select}
              value={settings.glbUrl ? '__glb' : settings.modelId}
              onChange={(e) => {
                if (e.target.value === '__glb') return;
                const next = LAB_MODELS.find((m) => m.id === e.target.value);
                patch({ modelId: e.target.value, glbUrl: null, ...modelDefaults(next) });
                setGlbName(null);
                setRefId('');
              }}
            >
              {LAB_MODELS.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
              {settings.glbUrl ? <option value="__glb">{glbName ?? '已載入模型'}</option> : null}
            </select>
          </label>
          <p className={styles.note}>{settings.glbUrl ? `外部模型：${glbName}` : activeNote}</p>
          {settings.modelId === 'taiji' && !settings.glbUrl ? <>
            <button type="button" className={styles.primaryBtn} onClick={() => setSettings(previous => ({ ...previous, viewId: 'cavity_front', viewNonce: previous.viewNonce + 1, autoRotate: false }))}>查看本體方形厚度</button>
            <button type="button" className={styles.primaryBtn} onClick={() => setEntrance(true)}>沿方形通道查看深層格網</button>
          </> : null}
          <label className={styles.fileBtn}>
            載入 .glb / .gltf
            <input type="file" accept=".glb,.gltf,model/gltf-binary,model/gltf+json" onChange={pickGlb} hidden />
          </label>
        </section>

        {activeModel?.refs?.length && !settings.glbUrl ? (
          <section className={styles.group}>
            <h2 className={styles.groupTitle}>對位參考幀</h2>
            <label className={styles.row}>
              <span>選一幀：視角、圖層、疊圖一起套用</span>
              <select
                className={styles.select}
                value={refId}
                onChange={(e) => {
                  const ref = activeModel.refs?.find((r) => r.id === e.target.value);
                  if (ref) applyRef(ref);
                }}
              >
                <option value="" disabled>— 選擇參考幀 —</option>
                {activeModel.refs.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </label>
            <p className={styles.note}>參考幀只存在本機（不進版控），用來證明模型與影片對得上。</p>
          </section>
        ) : null}

        {activeModel?.views?.length && !settings.glbUrl ? (
          <section className={styles.group}>
            <h2 className={styles.groupTitle}>物體姿態</h2>
            <label className={styles.row}>
              <span>影片反推的姿態</span>
              <select
                className={styles.select}
                value={settings.viewId ?? ''}
                onChange={(e) => {
                  patch({ viewId: e.target.value });
                  setSettings((prev) => ({ ...prev, viewNonce: prev.viewNonce + 1 }));
                }}
              >
                {activeModel.views.map((v) => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </label>
            {activeView?.note ? <p className={styles.note}>{activeView.note}</p> : null}
            <button
              type="button"
              className={styles.fileBtn}
              onClick={() => setSettings((prev) => ({ ...prev, viewNonce: prev.viewNonce + 1 }))}
            >
              相機回到對位位置
            </button>
          </section>
        ) : null}

        {activeModel?.layers?.length && !settings.glbUrl ? (
          <section className={styles.group}>
            <h2 className={styles.groupTitle}>模型圖層</h2>
            <div className={styles.layerList}>
              {activeModel.layers.map((layer) => (
                <label key={layer.id} className={styles.toggle}>
                  <input
                    type="checkbox"
                    checked={settings.layers[layer.id] ?? layer.defaultOn}
                    onChange={(e) => patch({ layers: { ...settings.layers, [layer.id]: e.target.checked } })}
                  />
                  <span>{layer.name}</span>
                </label>
              ))}
            </div>
          </section>
        ) : null}

        <section className={styles.group}>
          <h2 className={styles.groupTitle}>參考影片 / 參考圖</h2>
          <label className={styles.fileBtn}>
            選擇影片或圖片
            <input type="file" accept="video/*,image/*" onChange={pickReference} hidden />
          </label>

          {videoSrc ? (
            <div className={styles.videoBox}>
              <video
                ref={videoRef}
                src={videoSrc}
                className={styles.video}
                playsInline
                muted
                onLoadedMetadata={(e) => setVideoDuration(e.currentTarget.duration || 0)}
                onTimeUpdate={(e) => setVideoTime(e.currentTarget.currentTime)}
              />
              <div className={styles.frameBar}>
                <button type="button" className={styles.stepBtn} onClick={() => stepFrame(-1)}>◀ 前一幀</button>
                <span className={styles.frameNo}>
                  第 {Math.round(videoTime * fps)} 幀 · {videoTime.toFixed(3)}s
                </span>
                <button type="button" className={styles.stepBtn} onClick={() => stepFrame(1)}>後一幀 ▶</button>
              </div>
              <input
                type="range"
                min={0}
                max={videoDuration || 0}
                step={1 / fps}
                value={videoTime}
                onChange={(e) => {
                  const t = Number(e.target.value);
                  if (videoRef.current) videoRef.current.currentTime = t;
                  setVideoTime(t);
                }}
              />
              <label className={styles.row}>
                <span>影格率</span>
                <input
                  className={styles.number}
                  type="number"
                  min={1}
                  max={120}
                  value={fps}
                  onChange={(e) => setFps(Math.min(120, Math.max(1, Number(e.target.value) || 30)))}
                />
              </label>
              <button type="button" className={styles.primaryBtn} onClick={captureFrame}>設為參考幀</button>
            </div>
          ) : null}

          {overlaySrc && overlayMissing ? (
            <p className={styles.note}>這台機器上沒有這張參考幀，所以沒有疊圖；視角與圖層仍照常套用。</p>
          ) : null}

          {overlaySrc ? (
            <div className={styles.sub2}>
              <label className={styles.toggle}>
                <input type="checkbox" checked={overlayOn} onChange={(e) => setOverlayOn(e.target.checked)} />
                <span>疊在畫面上</span>
              </label>
              <label className={styles.toggle}>
                <input type="checkbox" checked={lockAspect} onChange={(e) => setLockAspect(e.target.checked)} />
                <span>舞台鎖定參考圖比例（對位必開）</span>
              </label>
              <label className={styles.row}>
                <span>透明度 {Math.round(overlayOpacity * 100)}%</span>
                <input type="range" min={0} max={1} step={0.01} value={overlayOpacity}
                  onChange={(e) => setOverlayOpacity(Number(e.target.value))} />
              </label>
              <label className={styles.row}>
                <span>混合</span>
                <select className={styles.select} value={overlayBlend}
                  onChange={(e) => setOverlayBlend(e.target.value as BlendMode)}>
                  {(Object.keys(BLEND_LABEL) as BlendMode[]).map((k) => (
                    <option key={k} value={k}>{BLEND_LABEL[k]}</option>
                  ))}
                </select>
              </label>
            </div>
          ) : null}
        </section>

        <section className={styles.group}>
          <h2 className={styles.groupTitle}>精準轉動</h2>
          <label className={styles.row}>
            <span>方向鍵每按一下轉 {stepDeg}°</span>
            <input type="range" min={0.5} max={45} step={0.5} value={stepDeg}
              onChange={(e) => setStepDeg(Number(e.target.value))} />
          </label>
          <label className={styles.row}>
            <span>滑鼠／手指拖曳速度 {settings.dragSpeed.toFixed(1)}</span>
            <input type="range" min={0.1} max={5} step={0.1} value={settings.dragSpeed}
              onChange={(e) => patch({ dragSpeed: Number(e.target.value) })} />
          </label>
          <p className={styles.note}>方向鍵在舞台左下角，中間鍵回到對位位置。</p>
        </section>

        <section className={styles.group}>
          <h2 className={styles.groupTitle}>燈光</h2>
          <label className={styles.row}>
            <span>環境光 {settings.ambient.toFixed(2)}</span>
            <input type="range" min={0} max={3} step={0.05} value={settings.ambient}
              onChange={(e) => patch({ ambient: Number(e.target.value) })} />
          </label>
          <label className={styles.row}>
            <span>主光 {settings.keyLight.toFixed(2)}</span>
            <input type="range" min={0} max={8} step={0.05} value={settings.keyLight}
              onChange={(e) => patch({ keyLight: Number(e.target.value) })} />
          </label>
          <label className={styles.row}>
            <span>補光 {settings.fillLight.toFixed(2)}</span>
            <input type="range" min={0} max={4} step={0.05} value={settings.fillLight}
              onChange={(e) => patch({ fillLight: Number(e.target.value) })} />
          </label>
          <label className={styles.row}>
            <span>主光方位 {settings.keyAngle}°</span>
            <input type="range" min={0} max={360} step={1} value={settings.keyAngle}
              onChange={(e) => patch({ keyAngle: Number(e.target.value) })} />
          </label>
        </section>

        <section className={styles.group}>
          <h2 className={styles.groupTitle}>畫面</h2>
          <label className={styles.row}>
            <span>視角 FOV {settings.fov}°</span>
            <input type="range" min={15} max={90} step={1} value={settings.fov}
              onChange={(e) => patch({ fov: Number(e.target.value) })} />
          </label>
          <label className={styles.row}>
            <span>背景</span>
            <input className={styles.color} type="color" value={settings.background}
              onChange={(e) => patch({ background: e.target.value })} />
          </label>
          <div className={styles.toggles}>
            <label className={styles.toggle}>
              <input type="checkbox" checked={settings.wireframe} onChange={(e) => patch({ wireframe: e.target.checked })} />
              <span>線框</span>
            </label>
            <label className={styles.toggle}>
              <input type="checkbox" checked={settings.showGrid} onChange={(e) => patch({ showGrid: e.target.checked })} />
              <span>格線</span>
            </label>
            <label className={styles.toggle}>
              <input type="checkbox" checked={settings.showShadow} onChange={(e) => patch({ showShadow: e.target.checked })} />
              <span>投影</span>
            </label>
            <label className={styles.toggle}>
              <input type="checkbox" checked={settings.showGizmo} onChange={(e) => patch({ showGizmo: e.target.checked })} />
              <span>方位球</span>
            </label>
            <label className={styles.toggle}>
              <input type="checkbox" checked={settings.autoRotate} onChange={(e) => patch({ autoRotate: e.target.checked })} />
              <span>自轉</span>
            </label>
            <label className={styles.toggle}>
              <input type="checkbox" checked={settings.ortho} onChange={(e) => patch({ ortho: e.target.checked })} />
              <span>正交相機</span>
            </label>
          </div>
          <button type="button" className={styles.primaryBtn} onClick={saveRender}>輸出目前視角 PNG</button>
        </section>

        <section className={styles.group}>
          <h2 className={styles.groupTitle}>相機座標</h2>
          <span ref={readoutRef} className={styles.readout}>—</span>
          <p className={styles.note}>1 單位 = 1 公尺。要重現影片鏡頭時，記下這組數字。</p>
        </section>

        <p className={styles.status} role="status">{status}</p>
      </aside>

      <main className={styles.stage}>
        <div className={aspectLocked ? styles.frameLocked : styles.frame} style={frameStyle}>
          <LabStage
            paused={inside || entrance}
            settings={settings}
            readoutRef={readoutRef}
            nudgeRef={nudgeRef}
            onRendererReady={onRendererReady}
            onLoadError={onLoadError}
          />
          {overlaySrc && overlayOn ? (
            <img
              className={styles.overlay}
              src={overlaySrc}
              alt=""
              onLoad={(e) => {
                setOverlayAspect(e.currentTarget.naturalWidth / e.currentTarget.naturalHeight);
                setOverlayMissing(false);
              }}
              onError={() => {
                setOverlayMissing(true);
                setOverlayAspect(null);
                setStatus(`這台機器上沒有 ${overlaySrc} 這張參考幀（參考幀不進版控），所以沒有疊圖。視角與圖層已照常套用；吻合率要在有參考幀的機器上才算數。`);
              }}
              style={{ opacity: overlayOpacity, mixBlendMode: overlayBlend }}
            />
          ) : null}
        </div>
        <div className={styles.pad} aria-label="精準轉動方向鍵">
          {PAD.map(([sx, sy, label]) =>
            sx === 0 && sy === 0 ? (
              <button key="reset" type="button" className={styles.padBtn} title="回到對位位置"
                onClick={() => setSettings((prev) => ({ ...prev, viewNonce: prev.viewNonce + 1 }))}>
                {label}
              </button>
            ) : (
              <button key={label} type="button" className={styles.padBtn} title={`轉 ${stepDeg}°`}
                onClick={() => nudgeRef.current?.(sx, sy, stepDeg)}>
                {label}
              </button>
            ),
          )}
        </div>
      </main>
    </div>
    </>
  );
}
