import Phaser from 'phaser';
import type { AdventureFeedback, AdventureRun } from '../../../shared/types/adventure';
import { adventureNode, adventureRegion, adventureRoutes } from '../../../core/game/adventure';

export interface AdventureSceneView {
  run: AdventureRun | null; target: number; paused: boolean; reducedMotion: boolean; sound: boolean;
  labels: Record<string, string>;
}
const TEXTURE_SCALE = 8;
const PALETTES = [
  { sky: 0x0c2025, far: 0x14383c, mid: 0x23504b, ground: 0x233934, glow: 0x72e5bb, accent: 0xc6efbc },
  { sky: 0x11172f, far: 0x252b4c, mid: 0x3c456e, ground: 0x272d48, glow: 0xaca2ff, accent: 0xe5cbff },
  { sky: 0x241526, far: 0x492a3c, mid: 0x623948, ground: 0x342331, glow: 0xff986a, accent: 0xffd18a },
];

export class AdventureScene extends Phaser.Scene {
  private view!: AdventureSceneView;
  private onNode!: (id: string) => void;
  private onTarget!: (id: number) => void;
  private background!: Phaser.GameObjects.Container;
  private actors!: Phaser.GameObjects.Container;
  private overlay!: Phaser.GameObjects.Container;
  private feedbackLayer!: Phaser.GameObjects.Container;
  private hero?: Phaser.GameObjects.Image;
  private enemies = new Map<number, Phaser.GameObjects.Image>();
  private burst!: Phaser.GameObjects.Particles.ParticleEmitter;
  private dust!: Phaser.GameObjects.Particles.ParticleEmitter;
  private region = -1;
  private sceneKey = '';
  private lastTurn = -1;
  private selected = -1;
  private ready = false;
  private soundReady = false;
  private textResolution = 1;

  constructor(view: AdventureSceneView, onNode: (id: string) => void, onTarget: (id: number) => void) {
    super('adventure-world'); this.view = view; this.onNode = onNode; this.onTarget = onTarget;
  }
  create() {
    this.resizeViewport();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.resizeViewport, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.resizeViewport, this);
    });
    this.buildTextures();
    this.background = this.add.container(0, 0);
    this.actors = this.add.container(0, 0);
    this.overlay = this.add.container(0, 0).setDepth(12);
    this.feedbackLayer = this.add.container(0, 0).setDepth(25);
    this.burst = this.add.particles(0, 0, 'adv-spark', {
      emitting: false, lifespan: 650, speed: { min: 45, max: 200 }, gravityY: 160,
      scale: { start: .9 / TEXTURE_SCALE, end: 0 }, alpha: { start: 1, end: 0 }, maxParticles: 150,
      blendMode: Phaser.BlendModes.ADD,
    }).setDepth(20);
    this.dust = this.add.particles(0, 0, 'adv-spark', {
      x: { min: 0, max: 1200 }, y: { min: 50, max: 480 }, lifespan: 6500,
      speedY: { min: -14, max: -5 }, speedX: { min: -7, max: 7 },
      scale: { start: .3 / TEXTURE_SCALE, end: 0 }, alpha: { start: .45, end: 0 },
      frequency: 180, maxParticles: 45, blendMode: Phaser.BlendModes.ADD,
    }).setDepth(9);
    this.prepareAudio();
    this.ready = true;
    this.sync(this.view);
  }
  private resizeViewport() {
    const { width, height } = this.scale.gameSize;
    const zoom = Math.min(width / 1200, height / 540);
    this.cameras.main.setViewport(0, 0, width, height).setZoom(zoom).centerOn(600, 270);
    const resolution = Math.max(1, Math.ceil(zoom));
    if (resolution === this.textResolution) return;
    this.textResolution = resolution;
    const update = (objects: Phaser.GameObjects.GameObject[]) => {
      for (const object of objects) {
        if (object instanceof Phaser.GameObjects.Text) object.setResolution(resolution);
        else if (object instanceof Phaser.GameObjects.Container) update(object.list);
      }
    };
    update(this.children.list);
  }
  private buildTextures() {
    const g = this.make.graphics({ x: 0, y: 0 }).setScale(TEXTURE_SCALE);
    const finish = (key: string, w = 128, h = 128) => { g.generateTexture(key, w * TEXTURE_SCALE, h * TEXTURE_SCALE); g.clear(); };
    g.fillStyle(0xffffff).fillCircle(6, 6, 6); finish('adv-spark', 12, 12);
    // Original vector silhouettes, generated locally once; no remote art or fonts.
    g.fillStyle(0x070f23).fillEllipse(64, 115, 85, 15);
    g.fillStyle(0x305b6c).fillTriangle(61, 28, 23, 107, 103, 110);
    g.fillStyle(0x5ba8b0).fillTriangle(60, 40, 30, 102, 77, 97);
    g.fillStyle(0x1c3347).fillCircle(61, 35, 23);
    g.fillStyle(0x0c1b2b).fillEllipse(63, 40, 31, 24);
    g.fillStyle(0xb6ffdd).fillRect(51, 36, 8, 4).fillRect(67, 36, 8, 4);
    g.fillStyle(0xbc965c).fillRect(93, 36, 5, 77);
    g.lineStyle(3, 0x8ceecd).strokeCircle(96, 27, 10);
    g.fillStyle(0xdefee1).fillCircle(96, 27, 4);
    g.fillStyle(0xdbcc98).fillRoundedRect(59, 68, 26, 20, 3);
    g.lineStyle(2, 0x715e52).lineBetween(72, 70, 72, 85); finish('adv-hero');
    g.fillStyle(0x102f33).fillEllipse(64, 111, 98, 16);
    g.fillStyle(0x448f83).fillEllipse(64, 78, 94, 66);
    g.fillStyle(0x72c6a0).fillEllipse(50, 66, 57, 40);
    g.fillStyle(0x112c34).fillCircle(46, 75, 8).fillCircle(78, 75, 8);
    g.fillStyle(0xf3ffc9).fillCircle(47, 73, 3).fillCircle(79, 73, 3); finish('adv-slime');
    g.fillStyle(0x6261a2, .35).fillCircle(64, 63, 48);
    g.fillStyle(0x8e94d5).fillTriangle(64, 12, 26, 89, 100, 89);
    g.fillStyle(0xc6bdf4).fillEllipse(64, 63, 55, 63);
    g.fillStyle(0x222444).fillEllipse(64, 63, 32, 26);
    g.fillStyle(0xefebff).fillCircle(58, 60, 4).fillCircle(73, 60, 4); finish('adv-wisp');
    g.fillStyle(0x293040).fillRoundedRect(24, 48, 80, 62, 8);
    g.fillStyle(0x74888f).fillRect(33, 50, 62, 48);
    g.fillStyle(0x485d64).fillRect(42, 20, 43, 40);
    g.fillStyle(0xd8c780).fillRect(48, 37, 31, 7);
    g.fillStyle(0x293040).fillRect(32, 102, 23, 20).fillRect(76, 102, 23, 20);
    g.lineStyle(3, 0xbdac79).strokeRect(43, 61, 43, 29); finish('adv-sentinel');
    g.fillStyle(0x31354e).fillTriangle(63, 23, 13, 113, 116, 109);
    g.fillStyle(0x77678c).fillEllipse(65, 75, 54, 62);
    g.fillStyle(0x25263e).fillTriangle(32, 48, 31, 5, 64, 41).fillTriangle(65, 40, 96, 5, 98, 48);
    g.fillStyle(0xffaa86).fillRect(45, 51, 12, 5).fillRect(73, 51, 12, 5);
    g.lineStyle(4, 0xbaa4ce).lineBetween(24, 72, 9, 106).lineBetween(103, 72, 121, 106); finish('adv-stalker');
    g.fillStyle(0x392945).fillCircle(64, 65, 49);
    g.lineStyle(7, 0x937491).strokeCircle(64, 65, 48);
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4;
      g.lineStyle(5, 0x756078).lineBetween(64 + Math.cos(a) * 42, 65 + Math.sin(a) * 42, 64 + Math.cos(a) * 61, 65 + Math.sin(a) * 61);
    }
    g.fillStyle(0xf4bd91).fillEllipse(64, 65, 72, 38);
    g.fillStyle(0xb96361).fillCircle(64, 65, 19);
    g.fillStyle(0x211928).fillEllipse(64, 65, 10, 30);
    g.fillStyle(0xfff2cd).fillCircle(71, 58, 5); finish('adv-boss');
    g.destroy();
  }
  private prepareAudio() {
    const manager = this.sound as Phaser.Sound.WebAudioSoundManager;
    if (!manager.context?.createBuffer) return;
    for (const [key, frequency] of [['strike', 240], ['spell', 640], ['guard', 390], ['hurt', 95], ['win', 880]] as const) {
      const context = manager.context, length = Math.floor(context.sampleRate * .17);
      const buffer = context.createBuffer(1, length, context.sampleRate), channel = buffer.getChannelData(0);
      for (let i = 0; i < length; i++) {
        const t = i / context.sampleRate;
        channel[i] = Math.sin(t * Math.PI * 2 * frequency * (1 - t * 1.5)) * Math.exp(-t * 26) * .12;
      }
      this.cache.audio.add('adv-' + key, buffer);
    }
    this.soundReady = true;
  }
  private drawBackground(region: number) {
    this.background.removeAll(true);
    const p = PALETTES[region]!;
    const g = this.add.graphics(); this.background.add(g);
    g.fillStyle(p.sky).fillRect(0, 0, 1200, 540);
    g.fillStyle(p.glow, .055).fillCircle(830, 140, 180);
    g.fillStyle(p.accent, .3).fillCircle(830, 128, 43);
    g.fillStyle(p.sky).fillCircle(813, 117, 42);
    for (let layer = 0; layer < 3; layer++) {
      const color = layer === 0 ? p.far : layer === 1 ? p.mid : p.ground;
      for (let i = 0; i < 15; i++) {
        const x = i * 99 + layer * 32, h = 95 + ((i * 71 + region * 37) % 160);
        g.fillStyle(color, layer === 2 ? .65 : 1);
        if (region === 0) {
          g.fillRect(x, 400 - h, 15 + layer * 5, h);
          g.fillTriangle(x - 60, 410 - h, x + 10, 220 - h, x + 88, 410 - h);
        } else {
          g.fillRect(x, 400 - h, 48, h);
          g.fillTriangle(x - 4, 400 - h, x + 24, 365 - h, x + 52, 400 - h);
          g.fillStyle(p.glow, .12).fillRect(x + 17, 415 - h, 12, 25);
        }
      }
    }
    g.fillStyle(p.ground).fillEllipse(580, 529, 1450, 260);
    g.lineStyle(2, p.glow, .14);
    for (let i = 0; i < 12; i++) g.lineBetween(0, 434 + i * 14, 1200, 434 + i * 14);
    for (let i = 0; i < 24; i++) {
      const x = (i * 173) % 1200, y = 423 + ((i * 47) % 107);
      g.fillStyle(p.accent, .12).fillEllipse(x, y, 26, 3);
    }
    this.dust.setParticleTint(p.glow);
  }
  sync(view: AdventureSceneView) {
    this.view = view;
    if (!this.ready) return;
    this.dust.emitting = !view.reducedMotion && !view.paused;
    const region = adventureRegion(view.run?.depth ?? 1);
    if (this.region !== region) { this.region = region; this.drawBackground(region); }
    const r = view.run;
    const key = [r?.seed, r?.depth, r?.phase, view.reducedMotion, view.labels.locale].join(':');
    if (key !== this.sceneKey) {
      this.sceneKey = key; this.lastTurn = -1; this.selected = -1;
      this.tweens.killAll(); this.feedbackLayer.removeAll(true); this.actors.removeAll(true); this.overlay.removeAll(true); this.enemies.clear();
      if (r?.phase === 'map') this.drawMap(r);
      else this.drawActors(r);
      if (!view.reducedMotion) this.cameras.main.fadeIn(250, 8, 15, 24);
    }
    if (r?.phase === 'battle' && (this.lastTurn !== r.turn || this.selected !== view.target)) {
      this.lastTurn = r.turn; this.selected = view.target; this.drawEnemyBars(r);
    }
    this.tweens.timeScale = view.paused ? 0 : 1;
  }
  private text(x: number, y: number, text: string, size = 16, color = '#dbe6df') {
    return this.add.text(x, y, text, { fontFamily: 'Segoe UI, sans-serif', fontSize: size, color, align: 'center', resolution: this.textResolution }).setOrigin(.5);
  }
  private drawActors(run: AdventureRun | null) {
    const heroX = run ? 235 : 855;
    this.hero = this.add.image(heroX, 354, 'adv-hero').setScale(1.5 / TEXTURE_SCALE);
    this.actors.add(this.add.ellipse(heroX, 441, 118, 18, 0x050d15, .5));
    this.actors.add(this.hero);
    if (!this.view.reducedMotion) this.tweens.add({ targets: this.hero, y: 349, duration: 1550, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    if (run?.phase === 'battle') {
      run.enemies.forEach((enemy, i) => {
        const x = run.enemies.length === 1 ? 815 : 690 + i * 235;
        const scale = enemy.kind === 'boss' ? 2.1 : 1.35;
        const sprite = this.add.image(x, 354, 'adv-' + enemy.kind).setScale(scale / TEXTURE_SCALE).setInteractive({ useHandCursor: true });
        sprite.on('pointerdown', () => { if (!this.view.paused) this.onTarget(enemy.id); });
        this.actors.add(this.add.ellipse(x, 441, 110 * scale / 1.3, 18, 0x060a15, .6));
        this.actors.add(sprite); this.enemies.set(enemy.id, sprite);
        if (!this.view.reducedMotion) this.tweens.add({ targets: sprite, y: 346, duration: 1100 + i * 180, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      });
    } else {
      const g = this.add.graphics(); this.actors.add(g);
      const p = PALETTES[this.region]!;
      g.lineStyle(5, p.glow, .8).strokeEllipse(810, 300, 158, 226);
      g.lineStyle(20, p.glow, .07).strokeEllipse(810, 300, 180, 247);
      g.fillStyle(p.glow, .05).fillEllipse(810, 300, 155, 223);
      for (let i = 0; i < 8; i++) {
        const a = i * Math.PI / 4;
        const rune = this.text(810 + Math.cos(a) * 79, 300 + Math.sin(a) * 113, ['◇','✧','ᛟ','ᛉ'][i % 4]!, 22, '#d9e7d1');
        this.actors.add(rune);
      }
    }
  }
  private drawEnemyBars(run: AdventureRun) {
    this.overlay.removeAll(true);
    run.enemies.forEach(enemy => {
      const sprite = this.enemies.get(enemy.id);
      if (!sprite) return;
      sprite.setAlpha(enemy.hp > 0 ? 1 : .15);
      if (enemy.hp <= 0) { sprite.disableInteractive(); return; }
      const x = sprite.x, y = enemy.kind === 'boss' ? 156 : 215;
      const g = this.add.graphics(); this.overlay.add(g);
      g.fillStyle(0x07111e, .85).fillRoundedRect(x - 91, y - 34, 182, 76, 8);
      g.fillStyle(0x253344).fillRoundedRect(x - 72, y + 22, 144, 7, 3);
      g.fillStyle(enemy.enraged ? 0xff785e : 0xc99187).fillRoundedRect(x - 72, y + 22, 144 * enemy.hp / enemy.maxHp, 7, 3);
      if (enemy.id === this.view.target) {
        g.lineStyle(2, 0xe8cf90).strokeEllipse(x, 437, 133, 26);
        g.fillStyle(0xe8cf90).fillTriangle(x - 7, y - 50, x + 7, y - 50, x, y - 40);
      }
      this.overlay.add(this.text(x, y - 15, this.view.labels[enemy.kind] ?? enemy.kind, 17));
      this.overlay.add(this.text(x, y + 7, `${this.view.labels[enemy.intent]} · ${enemy.countdown}  /  ${enemy.hp} HP`, 13, '#f3c28c'));
    });
  }
  private drawMap(run: AdventureRun) {
    const available = new Set(adventureRoutes(run).map(node => node.id));
    const p = PALETTES[this.region]!;
    const g = this.add.graphics(); this.actors.add(g);
    const start = Math.floor(run.depth / 5) * 5 + 1;
    const columns = Array.from({ length: 5 }, (_, i) => {
      const depth = start + i;
      return (depth % 5 === 0 ? [1] : [0, 1, 2]).map(lane => adventureNode(run.seed, depth, lane));
    });
    const xAt = (depth: number) => 220 + (depth - start) * 200;
    const yAt = (lane: number) => 160 + lane * 135;
    const visited = new Set(run.path.map(node => node.id));
    for (let i = 0; i < columns.length - 1; i++) {
      for (const from of columns[i]!) for (const to of columns[i + 1]!) {
        if (to.kind !== 'boss' && Math.abs(from.lane - to.lane) > 1) continue;
        const used = visited.has(from.id) && visited.has(to.id);
        g.lineStyle(used ? 3 : 1, used ? 0xe8cf90 : p.glow, used ? .85 : .2)
          .lineBetween(xAt(from.depth), yAt(from.lane), xAt(to.depth), yAt(to.lane));
      }
    }
    for (const node of columns.flat()) {
      const x = xAt(node.depth), y = yAt(node.lane);
      const enabled = available.has(node.id), done = visited.has(node.id);
      const circle = this.add.circle(x, y, node.kind === 'boss' ? 38 : 29, p.sky)
        .setStrokeStyle(enabled || done ? 3 : 1, enabled || done ? 0xe8cf90 : p.glow, enabled || done ? 1 : .4);
      if (enabled) {
        circle.setInteractive({ useHandCursor: true });
        circle.on('pointerover', () => circle.setFillStyle(p.mid));
        circle.on('pointerout', () => circle.setFillStyle(p.sky));
        circle.on('pointerdown', () => { if (!this.view.paused) this.onNode(node.id); });
        if (!this.view.reducedMotion) this.tweens.add({ targets: circle, alpha: .55, duration: 950, yoyo: true, repeat: -1 });
      }
      this.actors.add(circle);
      const symbol = done ? '✓' : { battle: '⚔', elite: '♜', camp: '✦', shop: '◈', event: '?', boss: '♛' }[node.kind];
      this.actors.add(this.text(x, y - 1, symbol, 26, enabled || done ? '#eed9a5' : '#92aaa5'));
      this.actors.add(this.text(x, y + 46, this.view.labels[node.kind] ?? node.kind, 13, enabled ? '#f1dfbc' : '#91aaa6'));
    }
    for (const column of columns) {
      const node = column[0]!;
      this.actors.add(this.text(xAt(node.depth), 95, String(node.depth).padStart(2, '0'), 15, '#e8cf90'));
    }
    this.hero = this.add.image(95, 300, 'adv-hero').setScale(.9 / TEXTURE_SCALE);
    this.actors.add(this.hero);
  }
  feedback(effects: AdventureFeedback[]) {
    if (!this.ready) return;
    effects.forEach((effect, i) => {
      this.time.delayedCall(i * 100, () => {
        const hurt = effect.kind === 'hurt';
        const enemy = this.enemies.get(effect.target);
        const sprite = hurt || effect.kind === 'guard' ? this.hero : enemy;
        const x = sprite?.x ?? 600, y = sprite?.y ?? 320;
        const color = hurt ? 0xff796e : effect.kind === 'guard' ? 0x87d3ff : effect.kind === 'spell' ? 0xc0a5ff : 0xffd38a;
        this.burst.setParticleTint(color);
        this.burst.explode(this.view.reducedMotion ? 3 : effect.critical ? 40 : 18, x, y);
        if (effect.amount > 0) {
          const text = this.text(x, y - 65, `${hurt ? '−' : effect.kind === 'guard' ? '+' : ''}${effect.amount}${effect.critical ? '!' : ''}`, effect.critical ? 38 : 27, Phaser.Display.Color.IntegerToColor(color).rgba);
          this.feedbackLayer.add(text);
          this.tweens.add({ targets: text, y: y - 115, alpha: 0, duration: this.view.reducedMotion ? 350 : 850, onComplete: () => text.destroy() });
        }
        if (sprite && !this.view.reducedMotion) {
          sprite.setTintFill(color);
          this.time.delayedCall(100, () => { if (sprite.active) sprite.clearTint(); });
          if (hurt && effect.amount > 0) this.cameras.main.shake(140, .004);
          if (!hurt && effect.kind !== 'guard' && enemy && this.hero) {
            const orb = this.add.image(this.hero.x + 40, this.hero.y - 10, 'adv-spark').setScale((effect.kind === 'spell' ? 2.2 : 1) / TEXTURE_SCALE).setTint(color).setDepth(19);
            this.feedbackLayer.add(orb);
            this.tweens.add({ targets: orb, x: enemy.x, y: enemy.y, duration: 190, onComplete: () => orb.destroy() });
          }
        }
        if (this.view.sound && this.soundReady && this.cache.audio.exists('adv-' + effect.kind)) this.sound.play('adv-' + effect.kind, { volume: .45 });
      });
    });
  }
}
