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
    }

    create() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // Background
        this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);

        // Title
        this.add.text(width / 2, 50, 'SELECT LEVEL', {
            font: 'bold 48px Arial',
            fill: '#00ffff',
            stroke: '#ffffff',
            strokeThickness: 2
        }).setOrigin(0.5);

        // Back button
        const backButton = this.add.text(80, 50, '< BACK', {
            font: 'bold 24px Arial',
            fill: '#ffffff',
            backgroundColor: '#2a2a4e',
            padding: { x: 15, y: 10 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        backButton.on('pointerover', () => backButton.setStyle({ fill: '#00ffff' }));
        backButton.on('pointerout', () => backButton.setStyle({ fill: '#ffffff' }));
        backButton.on('pointerdown', () => {
            this.scene.start('MenuScene', { user: this.user, profile: this.profile, isGuest: this.isGuest });
        });

        // Create level cards container
        this.cardsContainer = this.add.container(0, 0);

        // Generate level cards
        this.createLevelCards();

        // Navigation arrows
        this.createNavigation(width, height);

        // Instructions
        this.add.text(width / 2, height - 30, 'Use arrow keys or click arrows to navigate', {
            font: '16px Arial',
            fill: '#666666'
        }).setOrigin(0.5);

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
    }

    createLevelCards() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        const cardWidth = 300;
        const cardHeight = 400;

        // --- Endless card at index 0 ---
        this._createEndlessCard(cardWidth, cardHeight, height);

        // --- Normal level cards at indices 1–8 ---
        LEVELS.forEach((levelData, index) => {
            const level = this.levelGenerator.generateLevel(levelData.difficulty, levelData.seed);
            const cardIndex = index + 1; // shift by 1 to make room for endless

            // Card container
            const card = this.add.container(0, height / 2 + 20);

            // Card background
            const bg = this.add.rectangle(0, 0, cardWidth, cardHeight, level.backgroundColor)
                .setStrokeStyle(4, 0x4a4a6a);
            card.add(bg);

            // Level preview (mini visualization)
            const preview = this.createLevelPreview(level, cardWidth - 40, 120);
            preview.setPosition(0, -100);
            card.add(preview);

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

    createLevelPreview(level, previewWidth, previewHeight) {
        const container = this.add.container(0, 0);

        // Preview background
        const previewBg = this.add.rectangle(0, 0, previewWidth, previewHeight, 0x0a0a1a)
            .setStrokeStyle(2, 0x3a3a5a);
        container.add(previewBg);

        // Ground line
        const groundLine = this.add.rectangle(0, previewHeight / 2 - 10, previewWidth - 10, 4, level.groundColor);
        container.add(groundLine);

        // Sample obstacles (scaled down)
        const scale = previewWidth / level.levelLength;
        const maxObstacles = 15;
        const step = Math.max(1, Math.floor(level.obstacles.length / maxObstacles));

        for (let i = 0; i < level.obstacles.length && i < maxObstacles * step; i += step) {
            const obs = level.obstacles[i];
            const x = (obs.x * scale) - previewWidth / 2 + 20;
            const y = previewHeight / 2 - 20;

            if (obs.type === 'spike') {
                const spike = this.add.triangle(x, y, 0, 8, 4, 0, 8, 8, level.spikeColor);
                container.add(spike);
            } else if (obs.type === 'block') {
                const block = this.add.rectangle(x, y - 4, 8, 8, 0x6a4a8a);
                container.add(block);
            }
        }

        return container;
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
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        this.leftArrow.on('pointerover', () => this.leftArrow.setStyle({ fill: '#00ffff' }));
        this.leftArrow.on('pointerout', () => this.leftArrow.setStyle({ fill: '#ffffff' }));
        this.leftArrow.on('pointerdown', () => this.navigateLeft());

        // Right arrow
        this.rightArrow = this.add.text(width - 50, height / 2 + 20, '▶', {
            font: 'bold 60px Arial',
            fill: '#ffffff'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        this.rightArrow.on('pointerover', () => this.rightArrow.setStyle({ fill: '#00ffff' }));
        this.rightArrow.on('pointerout', () => this.rightArrow.setStyle({ fill: '#ffffff' }));
        this.rightArrow.on('pointerdown', () => this.navigateRight());

        // Level indicator dots
        this.dotsContainer = this.add.container(width / 2, height - 70);
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
        }
    }

    navigateRight() {
        if (this.currentIndex < LEVELS.length) { // LEVELS.length = 8, max index = 8 (9 cards)
            this.currentIndex++;
            this.updateCardPositions(true);
            this.updateDots();
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
