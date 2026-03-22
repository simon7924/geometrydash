import { Player } from '../entities/Player.js';
import { SPEEDS } from '../physics/GameModePhysics.js';
import { saveLevelScore, updateProfile, getProfile, recordUserLevelCompletion } from '../../supabase-browser.js';
import { getRandomTrashTalk } from '../data/TrashTalk.js';

export class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    init(data) {
        // User data
        this.user = data?.user || null;
        this.profile = data?.profile || null;
        this.isGuest = data?.isGuest || false;

        // Level data
        this.level = data?.level || null;
        this.fromEditor = data?.fromEditor || false;
        this.fromCommunity = data?.fromCommunity || false;
        this.editorState = data?.editorState || null;

        // Game state
        this.levelLength = this.level?.levelLength || 5000;
        this.isPlaying = true;
        this.isDead = false;
        this._restarting = false;
        this.attempts = data?.attempts || 1;
        this.progress = 0;

        // Input state
        this.inputHeld = false;
        this.inputJustPressed = false;
        this.lastInputState = false;
    }

    create() {
        // Disable default gravity - Player handles its own
        this.physics.world.gravity.y = 0;

        // Extend physics world bounds to cover the entire level
        this.physics.world.setBounds(0, 0, this.levelLength + 1280, 900);

        // Set background color based on level
        if (this.level?.backgroundColor) {
            this.cameras.main.setBackgroundColor(this.level.backgroundColor);
        }

        // Create player with accurate physics
        this.player = new Player(this, 200, 500);

        // Set initial speed based on level
        if (this.level?.gameSpeed) {
            // Map old speed values to new speed modes
            const speed = this.level.gameSpeed;
            if (speed <= 280) this.player.setSpeedMode('HALF');
            else if (speed <= 350) this.player.setSpeedMode('NORMAL');
            else if (speed <= 420) this.player.setSpeedMode('DOUBLE');
            else if (speed <= 500) this.player.setSpeedMode('TRIPLE');
            else this.player.setSpeedMode('QUADRUPLE');
        }

        // Create ground
        this.createGround();

        // Create obstacles from level data
        this.createObstacles();

        // Create gamemode portals
        this.createGameModePortals();

        // Setup input
        this.setupInput();

        // Follow X with smooth lerp; Y is fixed via camera bounds so the full playfield is always visible
        this.cameras.main.startFollow(this.player.sprite, true, 0.1, 0.1);
        // Lock camera Y: set bounds so the camera can only scroll within a 1px range at y=-10
        this.cameras.main.setBounds(0, -10, this.levelLength + 1280, 720);

        // UI
        this.createUI();

        // Collision detection
        this.physics.add.collider(this.player.sprite, this.groundGroup);
        this.physics.add.collider(this.player.sprite, this.solidBlocks, (playerSprite, block) => {
            // Die if player hits the left side of a block (running into it)
            if (playerSprite.body.touching.right || playerSprite.body.blocked.right) {
                this.handleDeath();
            }
        }, null, this);
        this.physics.add.overlap(this.player.sprite, this.hazards, this.handleDeath, null, this);
    }

    createGround() {
        this.groundGroup = this.physics.add.staticGroup();

        const groundY = 650;
        const tileWidth = 64;
        const totalTiles = Math.ceil((this.levelLength + 1280) / tileWidth);

        const groundColor = this.level?.groundColor || 0x4a4a6a;

        for (let i = 0; i < totalTiles; i++) {
            const ground = this.groundGroup.create(i * tileWidth + tileWidth / 2, groundY, 'ground');
            ground.setTint(groundColor);
        }

        // Create ceiling for gravity flip
        this.ceilingGroup = this.physics.add.staticGroup();
        for (let i = 0; i < totalTiles; i++) {
            const ceiling = this.ceilingGroup.create(i * tileWidth + tileWidth / 2, 70, 'ground');
            ceiling.setTint(groundColor);
            ceiling.setAlpha(0.3);
        }
        this.physics.add.collider(this.player.sprite, this.ceilingGroup);
    }

    createObstacles() {
        this.hazards = this.physics.add.staticGroup();
        this.solidBlocks = this.physics.add.staticGroup();
        const groundY = 650;

        const spikeColor = this.level?.spikeColor || 0xff4444;

        if (this.level?.obstacles) {
            this.level.obstacles.forEach(obs => {
                if (obs.type === 'spike') {
                    const spike = this.hazards.create(obs.x, obs.y, 'spike');
                    spike.setSize(30, 40);
                    spike.setOffset(10, 10);
                    spike.setTint(spikeColor);
                    if (obs.flipY) {
                        spike.setFlipY(true);
                    }
                } else if (obs.type === 'block') {
                    const block = this.solidBlocks.create(obs.x, obs.y, 'block');
                    block.setSize(50, 50);
                    block.refreshBody();
                }
            });
        } else {
            // Fallback demo level
            const spikePositions = [600, 900, 1200, 1600, 2000, 2400, 2800, 3200, 3600, 4000];
            spikePositions.forEach(x => {
                const spike = this.hazards.create(x, groundY - 57, 'spike');
                spike.setSize(30, 40);
                spike.setOffset(10, 10);
            });
        }

        // End portal - make it tall so player can't miss it (full height barrier)
        this.endPortal = this.physics.add.staticGroup();
        const portalX = this.levelLength - 100;
        // Create a tall portal that spans from ground to ceiling
        for (let y = 100; y < groundY; y += 50) {
            const portalPiece = this.endPortal.create(portalX, y, 'portal');
            portalPiece.setTint(0x00ff00);
        }
        this.physics.add.overlap(this.player.sprite, this.endPortal, this.handleLevelComplete, null, this);
    }

    createGameModePortals() {
        this.gameModePortals = this.physics.add.staticGroup();
        this.portalModeMap = new Map(); // Map portal sprites to their target game mode

        // Portal colors for each game mode
        const portalColors = {
            CUBE: 0x00ff00,
            SHIP: 0x00ccff,
            BALL: 0xff8800,
            UFO: 0xff00ff,
            WAVE: 0x00ffcc,
            SPIDER: 0xaa00ff,
            ROBOT: 0xffff00
        };

        if (this.level?.portals) {
            this.level.portals.forEach(portalData => {
                const color = portalColors[portalData.mode] || 0xffffff;
                const groundY = 650;

                // Create tall portal that spans from ground to ceiling so player can't miss it
                for (let y = 100; y < groundY; y += 50) {
                    const portal = this.gameModePortals.create(portalData.x, y, 'portal');
                    portal.setTint(color);
                    portal.setAlpha(0.7);
                    this.portalModeMap.set(portal, portalData.mode);
                }

                // Add label above portal
                this.add.text(portalData.x, 85, portalData.mode, {
                    font: 'bold 14px Arial',
                    fill: '#' + color.toString(16).padStart(6, '0')
                }).setOrigin(0.5);
            });
        }

        // Track which portals the player already passed through to avoid re-triggering
        this.passedPortals = new Set();

        this.physics.add.overlap(this.player.sprite, this.gameModePortals, (playerSprite, portalSprite) => {
            const mode = this.portalModeMap.get(portalSprite);
            if (!mode) return;

            // Use portal X position as unique identifier
            const portalX = portalSprite.x;
            if (this.passedPortals.has(portalX)) return;

            // Mark this portal X as passed
            this.passedPortals.add(portalX);

            // Switch game mode
            this.player.setGameMode(mode);

            // Reset gravity to normal when switching modes
            if (this.player.gravityDirection !== 1 && mode !== 'BALL') {
                this.player.gravityDirection = 1;
                this.player.sprite.setFlipY(false);
                this.player.applyGameMode();
            }

            // Brief tint effect (no flash)
            this.cameras.main.setAlpha(0.7);
            this.time.delayedCall(100, () => {
                this.cameras.main.setAlpha(1);
            });
        }, null, this);
    }

    setupInput() {
        this.cursors = this.input.keyboard.createCursorKeys();
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.restartKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
        this.escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

        // Pointer input tracking
        this.input.on('pointerdown', () => {
            this.pointerDown = true;
        });
        this.input.on('pointerup', () => {
            this.pointerDown = false;
        });
        this.pointerDown = false;
    }

    createUI() {
        // Level name
        if (this.level?.name) {
            this.add.text(20, 50, this.level.name, {
                font: 'bold 24px Arial',
                fill: '#ffffff'
            }).setScrollFactor(0);
        }

        // Game mode indicator
        this.gameModeText = this.add.text(20, 80, 'Mode: CUBE', {
            font: '16px Arial',
            fill: '#aaaaaa'
        }).setScrollFactor(0);

        // Progress bar background
        this.progressBarBg = this.add.rectangle(640, 30, 400, 20, 0x333333)
            .setScrollFactor(0);

        // Progress bar fill
        this.progressBarFill = this.add.rectangle(440, 30, 0, 16, 0x00ffff)
            .setOrigin(0, 0.5)
            .setScrollFactor(0);

        // Progress text
        this.progressText = this.add.text(640, 30, '0%', {
            font: 'bold 14px Arial',
            fill: '#ffffff'
        }).setOrigin(0.5).setScrollFactor(0);

        // Attempts counter
        this.attemptsText = this.add.text(20, 20, `Attempt: ${this.attempts}`, {
            font: '20px Arial',
            fill: '#ffffff'
        }).setScrollFactor(0);

        // Stars display
        if (this.level?.stars) {
            this.add.text(1260, 20, `★ ${this.level.stars}`, {
                font: 'bold 24px Arial',
                fill: '#ffff00'
            }).setOrigin(1, 0).setScrollFactor(0);
        }

        // Death message (hidden initially)
        this.deathText = this.add.text(640, 300, '', {
            font: 'bold 48px Arial',
            fill: '#ff4444',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5).setScrollFactor(0).setVisible(false);

        this.restartText = this.add.text(640, 380, 'Press SPACE or CLICK to restart', {
            font: '24px Arial',
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

        this.deathText.setText('YOU DIED!').setVisible(true);
        this.deathText.setColor('#ff4444');
        this.restartText.setVisible(true);

        // AI trash talk
        if (this.profile?.ai_trash_talk_enabled) {
            const mode = this.player.gameMode || 'CUBE';
            const taunt = getRandomTrashTalk(mode);
            this.add.text(640, 460, `"${taunt}"`, {
                font: 'italic 17px Arial',
                fill: '#ffaa00',
                stroke: '#000000',
                strokeThickness: 2,
                wordWrap: { width: 700 }
            }).setOrigin(0.5).setScrollFactor(0);
        }

        this.cameras.main.shake(200, 0.01);

        // Save 1 attempt + best percentage on death (not for editor/community test levels)
        const isSaveableLevel = this.level?.id && this.level.id !== '__editor_test__' && !this.fromEditor && !this.fromCommunity;
        if (this.user && !this.isGuest && isSaveableLevel) {
            this.saveStats(0, this.progress);
        }

        if (this.profile?.auto_retry_enabled) {
            this._retryTimer = this.time.delayedCall(1000, () => {
                if (this.isDead && !this._restarting) {
                    this._restarting = true;
                    this.restartLevel();
                }
            });
        } else {
            this.time.delayedCall(500, () => {
                this.input.once('pointerdown', () => {
                    if (!this._restarting) { this._restarting = true; this.restartLevel(); }
                });
                this.spaceKey.once('down', () => {
                    if (!this._restarting) { this._restarting = true; this.restartLevel(); }
                });
            });
        }
    }

    async handleLevelComplete() {
        if (this.isDead || !this.isPlaying) return;

        this.isPlaying = false;
        this.player.setVelocityX(0);

        this.progressBarFill.setSize(396, 16);
        this.progressText.setText('100%');

        const starsEarned = this.level?.stars || 1;
        this.deathText.setText(`LEVEL COMPLETE!\n+${starsEarned} ★`);
        this.deathText.setColor('#00ff00');
        this.deathText.setVisible(true);
        this.restartText.setText('Press SPACE to continue').setVisible(true);

        // Save stats to Supabase if logged in (not for editor test levels)
        const isSaveable = this.level?.id && this.level.id !== '__editor_test__' && !this.fromEditor && !this.fromCommunity;
        if (this.user && !this.isGuest && isSaveable) {
            this.saveStats(starsEarned, 100);
        }
        // Record community level completion (own levels excluded inside the function)
        if (this.user && !this.isGuest && this.fromCommunity && this.level?.id) {
            recordUserLevelCompletion(this.user.id, this.level.id).catch(() => {});
        }

        this.time.delayedCall(1000, () => {
            this.spaceKey.once('down', () => this.returnToLevelSelect());
            this.input.once('pointerdown', () => this.returnToLevelSelect());
        });
    }

    async saveStats(starsEarned, percent) {
        try {
            // Always save 1 attempt per run — DB accumulates total across all runs
            // wasAlreadyCompleted is true if the level was completed in a prior session
            const { wasAlreadyCompleted } = await saveLevelScore(this.user.id, this.level.id, 1, starsEarned > 0, percent);

            // Only add stars to profile on the FIRST ever completion of this level
            if (starsEarned > 0 && !wasAlreadyCompleted) {
                const profile = await getProfile(this.user.id);
                if (profile) {
                    const newStars = (profile.total_stars || 0) + starsEarned;
                    await updateProfile(this.user.id, { total_stars: newStars });
                }
            }
        } catch (e) {
            console.error('Failed to save stats:', e);
        }
    }

    returnToLevelSelect() {
        const dest = this.fromEditor ? 'LevelEditorScene'
            : this.fromCommunity ? 'CommunityScene'
            : 'LevelSelectScene';
        const extra = this.fromEditor && this.editorState ? {
            savedObjects: this.editorState.savedObjects,
            savedName:    this.editorState.savedName,
            savedLength:  this.editorState.savedLength
        } : {};
        this.scene.start(dest, {
            user: this.user,
            profile: this.profile,
            isGuest: this.isGuest,
            ...extra
        });
    }

    restartLevel() {
        this.time.delayedCall(0, () => {
            this.scene.restart({
                user: this.user,
                profile: this.profile,
                isGuest: this.isGuest,
                level: this.level,
                attempts: this.attempts + 1,
                fromEditor: this.fromEditor,
                fromCommunity: this.fromCommunity,
                editorState: this.editorState
            });
        });
    }

    update(time, delta) {
        // ESC always works, even on death screen
        if (Phaser.Input.Keyboard.JustDown(this.escKey)) {
            this.returnToLevelSelect();
            return;
        }

        if (!this.isPlaying || this.isDead) return;

        // Calculate input state
        const currentInputState = this.spaceKey.isDown ||
            this.cursors.up.isDown ||
            this.pointerDown;

        this.inputHeld = currentInputState;
        this.inputJustPressed = currentInputState && !this.lastInputState;
        this.lastInputState = currentInputState;

        // Update player with accurate physics
        this.player.update(delta, this.inputHeld, this.inputJustPressed);

        // Update game mode display
        this.gameModeText.setText(`Mode: ${this.player.gameMode}`);

        // Restart
        if (Phaser.Input.Keyboard.JustDown(this.restartKey)) {
            this.restartLevel();
        }


        // Update progress
        this.progress = Math.min(100, Math.floor((this.player.x / this.levelLength) * 100));
        this.progressBarFill.setSize(Math.floor(396 * (this.progress / 100)), 16);
        this.progressText.setText(`${this.progress}%`);

        // (Camera Y is locked via setBounds in create())

        // Check if player fell off or went too high
        if (this.player.y > 800 || this.player.y < -100) {
            this.handleDeath();
        }
    }
}
