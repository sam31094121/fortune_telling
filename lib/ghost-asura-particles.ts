/**
 * 鬼魅阿修羅 - Canvas 粒子系統
 * 卡片邊緣能量流、印記光粒子、衝擊波擴散
 */

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number; // 0-1
  size: number;
  color: string;
  opacity: number;
}

export class ParticleSystem {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null;
  private particles: Particle[] = [];
  private animationId: number | null = null;
  private isRunning = false;

  constructor(container: HTMLElement) {
    this.canvas = document.createElement('canvas');
    this.canvas.style.position = 'absolute';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.pointerEvents = 'none';
    this.canvas.style.zIndex = '10';

    container.style.position = 'relative';
    container.appendChild(this.canvas);

    this.ctx = this.canvas.getContext('2d');
    this.resizeCanvas();
    this.setupResizeListener(container);
  }

  private resizeCanvas(): void {
    const rect = this.canvas.parentElement?.getBoundingClientRect();
    if (rect) {
      this.canvas.width = rect.width;
      this.canvas.height = rect.height;
    }
  }

  private setupResizeListener(container: HTMLElement): void {
    const observer = new ResizeObserver(() => {
      this.resizeCanvas();
    });
    observer.observe(container);
  }

  /**
   * 建立卡片邊緣能量流
   */
  public createCardEnergyFlow(cardElement: HTMLElement): void {
    const rect = cardElement.getBoundingClientRect();
    const parentRect = this.canvas.parentElement?.getBoundingClientRect();
    if (!parentRect) return;

    const startX = rect.left - parentRect.left;
    const startY = rect.top - parentRect.top;
    const width = rect.width;
    const height = rect.height;

    // 上邊界能量流
    for (let i = 0; i < 15; i++) {
      this.addParticle({
        x: startX + Math.random() * width,
        y: startY - 5,
        vx: (Math.random() - 0.5) * 2,
        vy: -Math.random() * 3,
        life: 1,
        size: 2 + Math.random() * 3,
        color: '#d4af37', // 金色
        opacity: 0.8,
      });
    }
  }

  /**
   * 建立印記點亮光粒子（逐個觸發）
   * @param element 印記元素
   * @param index 印記索引
   */
  public createImpressionGlow(element: HTMLElement, index: number): void {
    const rect = element.getBoundingClientRect();
    const parentRect = this.canvas.parentElement?.getBoundingClientRect();
    if (!parentRect) return;

    const centerX = rect.left - parentRect.left + rect.width / 2;
    const centerY = rect.top - parentRect.top + rect.height / 2;

    // 放射狀光粒子
    const particleCount = 12;
    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      const speed = 2 + Math.random() * 3;

      this.addParticle({
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        size: 1.5 + Math.random() * 2,
        color: '#ffd700', // 淡金色
        opacity: 0.9,
      });
    }
  }

  /**
   * 建立衝擊波擴散效果
   * @param centerX 中心 X
   * @param centerY 中心 Y
   * @param intensity 強度倍數
   */
  public createShockwave(
    centerX: number,
    centerY: number,
    intensity: number = 1
  ): void {
    const particleCount = Math.floor(30 * intensity);
    const colors = ['#d4af37', '#ffd700', '#ff6b6b'];

    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      const speed = 4 + Math.random() * 6;

      this.addParticle({
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        size: 2 + Math.random() * 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        opacity: 1,
      });
    }
  }

  /**
   * 添加單個粒子
   */
  private addParticle(particle: Particle): void {
    this.particles.push(particle);
    if (!this.isRunning) {
      this.start();
    }
  }

  /**
   * 開始渲染迴圈
   */
  private start(): void {
    if (this.isRunning) return;
    this.isRunning = true;

    const animate = () => {
      this.update();
      this.draw();

      if (this.particles.length > 0) {
        this.animationId = requestAnimationFrame(animate);
      } else {
        this.isRunning = false;
      }
    };

    this.animationId = requestAnimationFrame(animate);
  }

  /**
   * 更新粒子狀態
   */
  private update(): void {
    this.particles = this.particles.filter((p) => {
      // 重力
      p.vy += 0.1;

      // 位移
      p.x += p.vx;
      p.y += p.vy;

      // 生命衰減
      p.life -= 0.015;
      p.opacity = Math.max(0, p.opacity - 0.02);

      return p.life > 0;
    });
  }

  /**
   * 繪製粒子
   */
  private draw(): void {
    if (!this.ctx) return;

    // 清除畫布
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // 繪製每個粒子
    this.particles.forEach((p) => {
      this.ctx!.save();
      this.ctx!.globalAlpha = p.opacity;
      this.ctx!.fillStyle = p.color;
      this.ctx!.beginPath();
      this.ctx!.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx!.fill();
      this.ctx!.restore();
    });
  }

  /**
   * 清理資源
   */
  public destroy(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
    }
    this.canvas.remove();
  }
}

/**
 * 全局粒子系統實例
 */
let globalParticleSystem: ParticleSystem | null = null;

/**
 * 初始化粒子系統
 */
export function initializeParticleSystem(container: HTMLElement): ParticleSystem {
  if (globalParticleSystem) {
    globalParticleSystem.destroy();
  }
  globalParticleSystem = new ParticleSystem(container);
  return globalParticleSystem;
}

/**
 * 取得全局粒子系統
 */
export function getParticleSystem(): ParticleSystem | null {
  return globalParticleSystem;
}

/**
 * 清理粒子系統
 */
export function cleanupParticleSystem(): void {
  if (globalParticleSystem) {
    globalParticleSystem.destroy();
    globalParticleSystem = null;
  }
}
