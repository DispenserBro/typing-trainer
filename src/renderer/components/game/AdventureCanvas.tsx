import { useEffect, useRef, useState } from 'react';
import type Phaser from 'phaser';
import type { AdventureFeedback } from '../../../shared/types/adventure';
import type { AdventureScene, AdventureSceneView } from './AdventureScene';

export function AdventureCanvas({ view, effects, onNode, onTarget, onUnavailable }: {
  view: AdventureSceneView; effects: AdventureFeedback[]; onNode: (id: string) => void;
  onTarget: (id: number) => void; onUnavailable: () => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const scene = useRef<AdventureScene | null>(null);
  const latest = useRef({ view, onNode, onTarget, onUnavailable });
  latest.current = { view, onNode, onTarget, onUnavailable };
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let disposed = false;
    let game: Phaser.Game | undefined;
    let resize: ResizeObserver | undefined;
    let densityQuery: MediaQueryList | undefined;
    let frame = 0;

    // FIT controls CSS size; the backing buffer must also follow physical pixels.
    const updateSize = () => {
      frame = 0;
      if (disposed || !game?.isBooted || !host.current) return;
      const { width, height } = host.current.getBoundingClientRect();
      if (width <= 0 || height <= 0) return;
      const fit = Math.min(width / 1200, height / 540);
      const density = Math.min(3, Math.max(1, window.devicePixelRatio || 1));
      // Bound GPU allocation for extreme zoom/fullscreen sizes, keeping aspect ratio.
      const scale = Math.min(fit * density, 8192 / 1200, Math.sqrt(16000000 / (1200 * 540)));
      const pixelWidth = Math.max(1, Math.round(1200 * scale));
      const pixelHeight = Math.max(1, Math.round(540 * scale));
      game.scale.getParentBounds();
      if (game.scale.width !== pixelWidth || game.scale.height !== pixelHeight) {
        game.scale.setGameSize(pixelWidth, pixelHeight);
      } else {
        game.scale.refresh();
      }
    };
    const scheduleSize = () => {
      if (!disposed && !frame) frame = requestAnimationFrame(updateSize);
    };
    const watchDensity = () => {
      densityQuery?.removeEventListener('change', watchDensity);
      densityQuery = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
      densityQuery.addEventListener('change', watchDensity);
      scheduleSize();
    };

    Promise.all([import('phaser'), import('./AdventureScene')]).then(([{ default: Phaser }, { AdventureScene }]) => {
      if (disposed || !host.current) return;
      const world = new AdventureScene(latest.current.view, id => latest.current.onNode(id), id => latest.current.onTarget(id));
      scene.current = world;
      game = new Phaser.Game({
        type: Phaser.AUTO, parent: host.current, width: 1200, height: 540, backgroundColor: '#0c2025',
        transparent: false, banner: false, antialias: true,
        render: { mipmapFilter: 'LINEAR_MIPMAP_LINEAR' },
        scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
        fps: { target: 60, forceSetTimeOut: false },
        input: { keyboard: false }, audio: { disableWebAudio: false },
        scene: [world],
      });
      const startSizing = () => {
        if (disposed || !host.current || resize) return;
        resize = new ResizeObserver(scheduleSize);
        resize.observe(host.current);
        window.addEventListener('resize', scheduleSize);
        watchDensity();
        updateSize();
        setReady(true);
      };
      if (game.isBooted) startSizing();
      else game.events.once('ready', startSizing);
      game.canvas.setAttribute('aria-hidden', 'true');
      game.canvas.addEventListener('webglcontextlost', latest.current.onUnavailable);
    }).catch(() => { if (!disposed) latest.current.onUnavailable(); });
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      resize?.disconnect();
      densityQuery?.removeEventListener('change', watchDensity);
      window.removeEventListener('resize', scheduleSize);
      scene.current = null;
      game?.destroy(true);
    };
  }, []);
  useEffect(() => { scene.current?.sync(view); }, [view, ready]);
  useEffect(() => { if (effects.length) scene.current?.feedback(effects); }, [effects]);
  return <div className="adventure-canvas" ref={host} />;
}
