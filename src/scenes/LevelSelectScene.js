import { LevelGenerator, LEVELS } from '../levels/LevelGenerator.js';

export class LevelSelectScene extends Phaser.Scene {
    constructor() {
        super({ key: 'LevelSelectScene' });
        this.levelGenerator = new LevelGenerator();
    }

    init(data) {
        this.user = data?.user || null;
        this.profile = data?.profile || null;
        this.isGuest = data?.isGuest || false;

        // Start at index 1 (level 1) — index 0 is Endless (to the left)
        this.currentIndex = 1;
        this.levelCards = [];
        this._bgTextures = []; // RenderTextures for each level background
    }

    // Draw an accurate mini-preview of the first ~1280px of the level into a RenderTexture.
    // scaleX/scaleY map level world coords to the texture dimensions.
    _buildLevelSnapshot(level, rtW, rtH) {
        const WORLD_W = 1280; // how many world px we preview
        const WORLD_H = 720;
        const GROUND_Y = 650;
        const CEILING_Y = 70;
        const sx = rtW / WORLD_W;
        const sy = rtH / WORLD_H;

        const rt = this.add.renderTexture(0, 0, rtW, rtH);

        // Background fill
        const bgGfx = this.make.graphics({ add: false });
        bgGfx.fillStyle(level.backgroundColor || 0x1a1a2e, 1);
        bgGfx.fillRect(0, 0, rtW, rtH);
        rt.draw(bgGfx, 0, 0);
        bgGfx.destroy();

        // Ground slab
        const groundGfx = this.make.graphics({ add: false });
        groundGfx.fillStyle(level.groundColor || 0x2a2a4e, 1);
        groundGfx.fillRect(0, GROUND_Y * sy, rtW, rtH - GROUND_Y * sy);
        // Ceiling slab
        groundGfx.fillRect(0, 0, rtW, CEILING_Y * sy);
        rt.draw(groundGfx, 0, 0);
        groundGfx.destroy();

        // Obstacles — draw only those in first WORLD_W px
        const obsGfx = this.make.graphics({ add: false });
        const spikeColor = level.spikeColor || 0xff4444;
        const blockColor = 0x6a4a8a;

        level.obstacles.forEach(obs => {
            if (obs.x > WORLD_W) return;
            const ox = obs.x * sx;
            const oy = obs.y * sy;

            if (obs.type === 'spike') {
                obsGfx.fillStyle(spikeColor, 1);
                const hw = 12 * sx, hh = 14 * sy;
                if (obs.flipY) {
                    obsGfx.fillTriangle(ox, oy - hh, ox - hw, oy + hh, ox + hw, oy + hh);
                } else {
                    obsGfx.fillTriangle(ox, oy + hh, ox - hw, oy - hh, ox + hw, oy - hh);
                }
            } else if (obs.type === 'block') {
                obsGfx.fillStyle(blockColor, 1);
                const bw = 24 * sx, bh = 24 * sy;
                obsGfx.fillRect(ox - bw / 2, oy - bh / 2, bw, bh);
            }
        });
        rt.draw(obsGfx, 0, 0);
        obsGfx.destroy();

        return rt;
    }

    create() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // Pre-generate all level data for backgrounds + thumbnails
        this._generatedLevels = LEVELS.map(ld => this.levelGenerator.generateLevel(ld.difficulty, ld.seed));

        // Full-screen background image (level preview, blurred via dark overlay)
        this._bgImage = this.add.image(width / 2, height / 2, '__missing').setVisible(false);
        this._bgOverlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.55)
            .setDepth(1);

        // Fallback solid bg (for endless and before first render)
        this._fallbackBg = this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e).setDepth(0);

        // Build background RenderTextures for each level (not endless)
        this._bgTextures = this._generatedLevels.map((level, i) => {
            const rt = this._buildLevelSnapshot(level, width, height);
            rt.setVisible(false).setDepth(0).setScrollFactor(0);
            return rt;
        });

        // Title
        this.add.text(width / 2, 50, 'SELECT LEVEL', {
            font: 'bold 48px Arial',
            fill: '#00ffff',
            stroke: '#ffffff',
            strokeThickness: 2
        }).setOrigin(0.5).setDepth(3);

        // Back button
        const backButton = this.add.text(80, 50, '< BACK', {
            font: 'bold 24px Arial',
            fill: '#ffffff',
            backgroundColor: '#2a2a4e',
            padding: { x: 15, y: 10 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(3);

        backButton.on('pointerover', () => backButton.setStyle({ fill: '#00ffff' }));
        backButton.on('pointerout', () => backButton.setStyle({ fill: '#ffffff' }));
        backButton.on('pointerdown', () => {
            this.scene.start('MenuScene', { user: this.user, profile: this.profile, isGuest: this.isGuest });
        });

        // Create level cards container (depth above backgrounds)
        this.cardsContainer = this.add.container(0, 0).setDepth(2);

        // Generate level cards
        this.createLevelCards();

        // Navigation arrows
        this.createNavigation(width, height);

        // Instructions
        this.add.text(width / 2, height - 30, 'Use arrow keys or click arrows to navigate', {
            font: '16px Arial',
            fill: '#666666'
        }).setOrigin(0.5).setDepth(3);

        // Keyboard input
        this.cursors = this.input.keyboard.createCursorKeys();
        this.input.keyboard.on('keydown-LEFT', () => this.navigateLeft());
        this.input.keyboard.on('keydown-RIGHT', () => this.navigateRight());
        this.input.keyboard.on('keydown-ENTER', () => this.playSelectedLevel());
        this.input.keyboard.on('keydown-ESC', () => {
            this.scene.start('MenuScene', { user: this.user, profile: this.profile, isGuest: this.isGuest });
        });

        // Initial position
        this.updateCardPositions(false);

        // Show correct background for starting level
        this._updateBackground(false);
    }

    _updateBackground(animate) {
        const levelIndex = this.currentIndex - 1; // 0-based into _bgTextures; -1 = endless

        // Hide all bg textures
        this._bgTextures.forEach(rt => rt.setVisible(false));

        if (levelIndex < 0 || levelIndex >= this._bgTextures.length) {
            // Endless — just show fallback dark bg
            this._fallbackBg.setVisible(true);
            this._bgOverlay.setAlpha(0);
            return;
        }

        this._fallbackBg.setVisible(false);
        const rt = this._bgTextures[levelIndex];
        rt.setVisible(true);
        if (animate) {
            rt.setAlpha(0);
            this.tweens.add({ targets: rt, alpha: 1, duration: 250 });
        } else {
            rt.setAlpha(1);
        }
        this._bgOverlay.setAlpha(0.55);
    }

    createLevelCards() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        const cardWidth = 300;
        const cardHeight = 400;
        const thumbW = cardWidth - 40;
        const thumbH = 120;

        // --- Endless card at index 0 ---
        this._createEndlessCard(cardWidth, cardHeight, height);

        // --- Normal level cards at indices 1–8 ---
        this._generatedLevels.forEach((level, index) => {
            const cardIndex = index + 1; // shift by 1 to make room for endless

            // Card container
            const card = this.add.container(0, height / 2 + 20);

            // Card background
            const bg = this.add.rectangle(0, 0, cardWidth, cardHeight, level.backgroundColor)
                .setStrokeStyle(4, 0x4a4a6a);
            card.add(bg);

            // Accurate thumbnail — render into a small RenderTexture
            const thumbRT = this._buildLevelSnapshot(level, thumbW, thumbH);
            thumbRT.setPosition(-thumbW / 2, -cardHeight / 2 + 10);
            // Add a border around thumbnail
            const thumbBorder = this.add.rectangle(0, -cardHeight / 2 + 10 + thumbH / 2, thumbW + 4, thumbH + 4, 0x000000, 0)
                .setStrokeStyle(2, 0x4a4a6a);
            card.add(thumbBorder);
            card.add(thumbRT);

            // Level name
            const nameText = this.add.text(0, 20, level.name, {
                font: 'bold 24px Arial',
                fill: '#ffffff'
            }).setOrigin(0.5);
            card.add(nameText);

            // Difficulty indicator
            const difficultyText = this.add.text(0, 55, `Difficulty: ${level.difficulty}/8`, {
                font: '18px Arial',
                fill: this.getDifficultyColor(level.difficulty)
            }).setOrigin(0.5);
            card.add(difficultyText);

            // Stars reward
            const starsText = this.add.text(0, 85, `★ ${level.stars} Stars`, {
                font: 'bold 20px Arial',
                fill: '#ffff00'
            }).setOrigin(0.5);
            card.add(starsText);

            // Play button
            const playBtn = this.add.rectangle(0, 150, 120, 45, 0x00aa88)
                .setInteractive({ useHandCursor: true });
            card.add(playBtn);

            const playText = this.add.text(0, 150, 'PLAY', {
                font: 'bold 20px Arial',
                fill: '#ffffff'
            }).setOrigin(0.5);
            card.add(playText);

            playBtn.on('pointerover', () => playBtn.setFillStyle(0x00ccaa));
            playBtn.on('pointerout', () => playBtn.setFillStyle(0x00aa88));
            playBtn.on('pointerdown', () => {
                if (cardIndex === this.currentIndex) {
                    this.playLevel(level);
                }
            });

            // Store reference
            card.levelData = level;
            card.index = cardIndex;
            this.levelCards.push(card);
            this.cardsContainer.add(card);
        });
    }

    _createEndlessCard(cardWidth, cardHeight, height) {
        const card = this.add.container(0, height / 2 + 20);

        // Dark purple background with cyan border
        const bg = this.add.rectangle(0, 0, cardWidth, cardHeight, 0x0a0a2e)
            .setStrokeStyle(4, 0x00ffff);
        card.add(bg);

        // Infinity symbol / label
        const icon = this.add.text(0, -100, '∞', {
            font: 'bold 80px Arial',
            fill: '#00ffff'
        }).setOrigin(0.5);
        card.add(icon);

        const nameText = this.add.text(0, 20, 'ENDLESS', {
            font: 'bold 28px Arial',
            fill: '#00ffff'
        }).setOrigin(0.5);
        card.add(nameText);

        const descText = this.add.text(0, 58, 'How far can you go?', {
            font: '16px Arial',
            fill: '#aaaaaa'
        }).setOrigin(0.5);
        card.add(descText);

        const infiniteText = this.add.text(0, 88, '∞ Endless', {
            font: 'bold 18px Arial',
            fill: '#00ffff'
        }).setOrigin(0.5);
        card.add(infiniteText);

        // Play button
        const playBtn = this.add.rectangle(0, 150, 120, 45, 0x006688)
            .setInteractive({ useHandCursor: true });
        card.add(playBtn);

        const playText = this.add.text(0, 150, 'PLAY', {
            font: 'bold 20px Arial',
            fill: '#ffffff'
        }).setOrigin(0.5);
        card.add(playText);

        playBtn.on('pointerover', () => playBtn.setFillStyle(0x0099bb));
        playBtn.on('pointerout', () => playBtn.setFillStyle(0x006688));
        playBtn.on('pointerdown', () => {
            if (this.currentIndex === 0) this._playEndless();
        });

        card.levelData = null; // signals endless
        card.index = 0;
        this.levelCards.unshift(card); // insert at front
        this.cardsContainer.add(card);
    }


    getDifficultyColor(difficulty) {
        const colors = {
            1: '#44ff44', // Easy - Green
            2: '#88ff44', // Easy-Medium
            3: '#ccff44', // Medium
            4: '#ffff44', // Medium
            5: '#ffcc44', // Medium-Hard
            6: '#ff8844', // Hard
            7: '#ff4444', // Very Hard
            8: '#ff00ff'  // Extreme
        };
        return colors[difficulty] || '#ffffff';
    }

    createNavigation(width, height) {
        // Left arrow
        this.leftArrow = this.add.text(50, height / 2 + 20, '◀', {
            font: 'bold 60px Arial',
            fill: '#ffffff'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(3);

        this.leftArrow.on('pointerover', () => this.leftArrow.setStyle({ fill: '#00ffff' }));
        this.leftArrow.on('pointerout', () => this.leftArrow.setStyle({ fill: '#ffffff' }));
        this.leftArrow.on('pointerdown', () => this.navigateLeft());

        // Right arrow
        this.rightArrow = this.add.text(width - 50, height / 2 + 20, '▶', {
            font: 'bold 60px Arial',
            fill: '#ffffff'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(3);

        this.rightArrow.on('pointerover', () => this.rightArrow.setStyle({ fill: '#00ffff' }));
        this.rightArrow.on('pointerout', () => this.rightArrow.setStyle({ fill: '#ffffff' }));
        this.rightArrow.on('pointerdown', () => this.navigateRight());

        // Level indicator dots
        this.dotsContainer = this.add.container(width / 2, height - 70).setDepth(3);
        this.updateDots();
    }

    updateDots() {
        this.dotsContainer.removeAll(true);

        const totalCards = LEVELS.length + 1; // +1 for endless
        const dotSpacing = 20;
        const totalWidth = (totalCards - 1) * dotSpacing;
        const startX = -totalWidth / 2;

        for (let index = 0; index < totalCards; index++) {
            // Endless dot is cyan with ∞ tint; normal dots are standard
            const isSelected = index === this.currentIndex;
            const color = isSelected ? (index === 0 ? 0x00ffff : 0x00ffff) : 0x4a4a6a;
            const dot = this.add.circle(
                startX + index * dotSpacing,
                0,
                isSelected ? 8 : 5,
                color
            );
            this.dotsContainer.add(dot);
        }
    }

    navigateLeft() {
        if (this.currentIndex > 0) {
            this.currentIndex--;
            this.updateCardPositions(true);
            this.updateDots();
            this._updateBackground(true);
        }
    }

    navigateRight() {
        if (this.currentIndex < LEVELS.length) {
            this.currentIndex++;
            this.updateCardPositions(true);
            this.updateDots();
            this._updateBackground(true);
        }
    }

    updateCardPositions(animate) {
        const width = this.cameras.main.width;
        const centerX = width / 2;
        const cardSpacing = 350;

        this.levelCards.forEach((card, index) => {
            const targetX = centerX + (index - this.currentIndex) * cardSpacing;
            const targetScale = index === this.currentIndex ? 1 : 0.8;
            const targetAlpha = index === this.currentIndex ? 1 : 0.5;

            if (animate) {
                this.tweens.add({
                    targets: card,
                    x: targetX,
                    scaleX: targetScale,
                    scaleY: targetScale,
                    alpha: targetAlpha,
                    duration: 300,
                    ease: 'Power2'
                });
            } else {
                card.x = targetX;
                card.setScale(targetScale);
                card.setAlpha(targetAlpha);
            }
        });

        // Update arrow visibility
        if (this.leftArrow) {
            this.leftArrow.setAlpha(this.currentIndex > 0 ? 1 : 0.3);
        }
        if (this.rightArrow) {
            this.rightArrow.setAlpha(this.currentIndex < LEVELS.length ? 1 : 0.3);
        }
    }

    playSelectedLevel() {
        if (this.currentIndex === 0) {
            this._playEndless();
            return;
        }
        const card = this.levelCards[this.currentIndex];
        if (card) {
            this.playLevel(card.levelData);
        }
    }

    _playEndless() {
        this.scene.start('EndlessScene', {
            user: this.user,
            profile: this.profile,
            isGuest: this.isGuest
        });
    }

    playLevel(level) {
        this.scene.start('GameScene', {
            user: this.user,
            profile: this.profile,
            isGuest: this.isGuest,
            level: level
        });
    }
}
