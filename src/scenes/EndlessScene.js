import { Player } from '../entities/Player.js';
import { EndlessGenerator } from '../levels/EndlessGenerator.js';
import { saveEndlessScore } from '../../supabase-browser.js';
import { getRandomTrashTalk } from '../data/TrashTalk.js';

const CHUNK_BATCH = 5;       // How many chunks to generate ahead at a time
const SPAWN_AHEAD = 4000;    // Generate new chunks when player is within this many px of the end
const SCORE_RATE = 10;       // Score points per second (constant speed)

export class EndlessScene extends Phaser.Scene {
    constructor() {
        super({ key: 'EndlessScene' });
        this.generator = new EndlessGenerator();
    }

    init(data) {
        this.user = data?.user || null;
        this.profile = data?.profile || null;
        this.isGuest = data?.isGuest || false;
        this.attempts = data?.attempts || 1;
        this.trashTalkEnabled = this.profile?.ai_trash_talk_enabled ?? false;

        this.isPlaying = true;
        this.isDead = false;
        this._restarting = false;
        this.score = 0;
        this.scoreAccum = 0;  // fractional accumulator
        this.generatedUpToX = 0;
        this.currentMode = 'CUBE';

        // Simple seeded rng state (changes each run)
        this._rngState = (Date.now() & 0x7fffffff) || 12345;
        this.rng = () => {
            this._rngState = (this._rngState * 1103515245 + 12345) & 0x7fffffff;
            return this._rngState / 0x7fffffff;
        };

        this.inputHeld = false;
        this.inputJustPressed = false;
        this.lastInputState = false;
    }

    create() {
        this.physics.world.gravity.y = 0;
        // Very wide physics world for endless
        this.physics.world.setBounds(0, 0, 9999999, 900);

        this.cameras.main.setBackgroundColor(0x0a0a1e);

        // Create player
        this.player = new Player(this, 200, 500);
        this.player.setSpeedMode('DOUBLE'); // ~380px/s

        // Ground & ceiling
        this._groundTiles = [];
        this._ceilingTiles = [];
        this._placedGroundTiles = new Set();
        this.groundGroup = this.physics.add.staticGroup();
        this.ceilingGroup = this.physics.add.staticGroup();
        this._extendGroundTo(0, 3000);
        this.groundExtendedTo = 3000;

        this.physics.add.collider(this.player.sprite, this.groundGroup);
        this.physics.add.collider(this.player.sprite, this.ceilingGroup);

        // Obstacle groups (replenished as chunks generate)
        this.hazards = this.physics.add.staticGroup();
        this.solidBlocks = this.physics.add.staticGroup();
        this.gameModePortals = this.physics.add.staticGroup();
        this.portalModeMap = new Map();
        this.passedPortals = new Set();

        // Overlap handlers
        this.physics.add.overlap(this.player.sprite, this.hazards, () => this.handleDeath(), null, this);
        this.physics.add.collider(this.player.sprite, this.solidBlocks, (playerSprite) => {
            if (playerSprite.body.touching.right || playerSprite.body.blocked.right) {
                this.handleDeath();
            }
        }, null, this);
        this.physics.add.overlap(this.player.sprite, this.gameModePortals, (playerSprite, portalSprite) => {
            const mode = this.portalModeMap.get(portalSprite);
            if (!mode) return;
            const portalX = Math.round(portalSprite.x);
            if (this.passedPortals.has(portalX)) return;
            this.passedPortals.add(portalX);
            this.currentMode = mode;
            this.player.setGameMode(mode);
            if (this.player.gravityDirection !== 1 && mode !== 'BALL') {
                this.player.gravityDirection = 1;
                this.player.sprite.setFlipY(false);
                this.player.applyGameMode();
            }
            this.cameras.main.setAlpha(0.7);
            this.time.delayedCall(100, () => this.cameras.main.setAlpha(1));
        }, null, this);

        // Camera: follow X, lock Y
        this.cameras.main.startFollow(this.player.sprite, true, 0.1, 0.1);
        this.cameras.main.setBounds(0, -10, 9999999, 720);

        // Generate first batch of chunks
        this._generateMoreChunks();

        // Input
        this.cursors = this.input.keyboard.createCursorKeys();
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.restartKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
        this.escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
        this.input.on('pointerdown', () => { this.pointerDown = true; });
        this.input.on('pointerup', () => { this.pointerDown = false; });
        this.pointerDown = false;

        // UI
        this._createUI();
    }

    _extendGroundTo(fromX, toX) {
        const tileWidth = 64;
        const groundColor = 0x2a2a4e;
        // Go back 2 tiles from fromX to guarantee no gap, skip already-placed indices
        const startTile = Math.max(0, Math.floor(fromX / tileWidth) - 2);
        const endTile = Math.ceil(toX / tileWidth) + 1;
        let added = false;
        for (let i = startTile; i <= endTile; i++) {
            if (this._placedGroundTiles.has(i)) continue;
            this._placedGroundTiles.add(i);
            const tx = i * tileWidth + tileWidth / 2;
            const g = this.groundGroup.create(tx, 650, 'ground');
            g.setTint(groundColor);
            const c = this.ceilingGroup.create(tx, 70, 'ground');
            c.setTint(groundColor);
            c.setAlpha(0.3);
            added = true;
        }
        if (added) {
            this.groundGroup.refresh();
            this.ceilingGroup.refresh();
        }
    }

    _generateMoreChunks() {
        const startX = Math.max(800, this.generatedUpToX);
        // Pick random chunk indices
        const chunkIndices = [];
        for (let i = 0; i < CHUNK_BATCH; i++) {
            chunkIndices.push(Math.floor(this.rng() * 20));
        }
        const { obstacles, portals, endX } = this.generator.generateChunks(startX, chunkIndices);

        // Extend ground/ceiling to cover new area
        this._extendGroundTo(this.groundExtendedTo, endX + 1500);
        this.groundExtendedTo = endX + 1500;

        // Add obstacles
        const spikeColor = 0x00ffff;
        obstacles.forEach(obs => {
            if (obs.type === 'spike') {
                const spike = this.hazards.create(obs.x, obs.y, 'spike');
                spike.setSize(30, 40);
                spike.setOffset(10, 10);
                spike.setTint(spikeColor);
                if (obs.flipY) spike.setFlipY(true);
            } else if (obs.type === 'block') {
                const block = this.solidBlocks.create(obs.x, obs.y, 'block');
                block.setSize(50, 50);
                block.refreshBody();
            }
        });

        // Add portals
        const portalColors = {
            CUBE: 0x00ff00, SHIP: 0x00ccff, BALL: 0xff8800,
            UFO: 0xff00ff, WAVE: 0x00ffcc, SPIDER: 0xaa00ff, ROBOT: 0xffff00
        };
        portals.forEach(p => {
            const color = portalColors[p.mode] || 0xffffff;
            for (let y = 100; y < 650; y += 50) {
                const portal = this.gameModePortals.create(p.x, y, 'portal');
                portal.setTint(color);
                portal.setAlpha(0.7);
                this.portalModeMap.set(portal, p.mode);
            }
            this.add.text(p.x, 85, p.mode, {
                font: 'bold 14px Arial',
                fill: '#' + color.toString(16).padStart(6, '0')
            }).setOrigin(0.5);
        });

        this.generatedUpToX = endX;
    }

    _createUI() {
        // Score display (top center)
        this.scoreText = this.add.text(640, 20, 'Score: 0', {
            font: 'bold 28px Arial',
            fill: '#00ffff',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5, 0).setScrollFactor(0);

        // Mode indicator
        this.gameModeText = this.add.text(20, 80, 'Mode: CUBE', {
            font: '16px Arial',
            fill: '#aaaaaa'
        }).setScrollFactor(0);

        // Attempt counter
        this.attemptsText = this.add.text(20, 20, `Attempt: ${this.attempts}`, {
            font: '20px Arial',
            fill: '#ffffff'
        }).setScrollFactor(0);

        // Death/restart overlay
        this.deathText = this.add.text(640, 280, '', {
            font: 'bold 48px Arial',
            fill: '#ff4444',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5).setScrollFactor(0).setVisible(false);

        this.finalScoreText = this.add.text(640, 350, '', {
            font: 'bold 36px Arial',
            fill: '#00ffff',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5).setScrollFactor(0).setVisible(false);

        this.restartText = this.add.text(640, 420, 'Press SPACE or CLICK to try again', {
            font: '22px Arial',
            fill: '#ffffff'
        }).setOrigin(0.5).setScrollFactor(0).setVisible(false);

        // ESC hint
        this.add.text(1260, 700, 'ESC - Back to levels', {
            font: '14px Arial',
            fill: '#666666'
        }).setOrigin(1, 1).setScrollFactor(0);
    }

    handleDeath() {
        if (this.isDead) return;
        this.isDead = true;
        this.isPlaying = false;

        this.physics.world.pause();
        this.player.die();
        this.cameras.main.shake(200, 0.01);

        const finalScore = Math.floor(this.score);

        this.deathText.setText('YOU DIED!').setVisible(true);
        this.finalScoreText.setText(`Score: ${finalScore}`).setVisible(true);
        this.restartText.setVisible(true);

        // AI trash talk
        if (this.trashTalkEnabled) {
            const mode = this.player.gameMode || 'CUBE';
            const taunt = getRandomTrashTalk(mode);
            this.add.text(640, 490, `"${taunt}"`, {
                font: 'italic 16px Arial',
                fill: '#ffaa00',
                stroke: '#000000',
                strokeThickness: 2,
                wordWrap: { width: 700 }
            }).setOrigin(0.5).setScrollFactor(0);
        }

        // Save score and show stars earned if new high score
        if (this.user && !this.isGuest) {
            saveEndlessScore(this.user.id, finalScore).then(result => {
                if (result.starsEarned > 0) {
                    this.finalScoreText.setText(
                        `Score: ${finalScore}  ⭐ +${result.starsEarned} star${result.starsEarned > 1 ? 's' : ''}!`
                    );
                } else if (result.newHighScore) {
                    this.finalScoreText.setText(`Score: ${finalScore}  🏆 New High Score!`);
                }
            }).catch(e => console.error('Endless save error:', e));
        }

        if (this.profile?.auto_retry_enabled) {
            this.time.delayedCall(1000, () => {
                if (this.isDead && !this._restarting) {
                    this._restarting = true;
                    this._restart();
                }
            });
        } else {
            this.time.delayedCall(500, () => {
                this.input.once('pointerdown', () => {
                    if (!this._restarting) { this._restarting = true; this._restart(); }
                });
                this.spaceKey.once('down', () => {
                    if (!this._restarting) { this._restarting = true; this._restart(); }
                });
            });
        }
    }

    _restart() {
        this.scene.restart({
            user: this.user,
            profile: this.profile,
            isGuest: this.isGuest,
            attempts: this.attempts + 1
        });
    }

    update(time, delta) {
        if (!this.isPlaying || this.isDead) return;

        // Input
        const currentInput = this.spaceKey.isDown || this.cursors.up.isDown || this.pointerDown;
        this.inputHeld = currentInput;
        this.inputJustPressed = currentInput && !this.lastInputState;
        this.lastInputState = currentInput;

        this.player.update(delta, this.inputHeld, this.inputJustPressed);

        // Score increments at constant rate (SCORE_RATE pts/sec)
        this.scoreAccum += SCORE_RATE * (delta / 1000);
        if (this.scoreAccum >= 1) {
            const pts = Math.floor(this.scoreAccum);
            this.score += pts;
            this.scoreAccum -= pts;
            this.scoreText.setText(`Score: ${Math.floor(this.score)}`);
        }

        // Mode display
        this.gameModeText.setText(`Mode: ${this.player.gameMode}`);

        // Generate more chunks when getting close to the end
        if (this.player.x > this.generatedUpToX - SPAWN_AHEAD) {
            this._generateMoreChunks();
        }

        // Restart / ESC
        if (Phaser.Input.Keyboard.JustDown(this.restartKey)) this._restart();
        if (Phaser.Input.Keyboard.JustDown(this.escKey)) {
            this.scene.start('LevelSelectScene', {
                user: this.user, profile: this.profile, isGuest: this.isGuest
            });
        }

        // Out of bounds
        if (this.player.y > 800 || this.player.y < -100) {
            this.handleDeath();
        }
    }
}
