import { getUserStats } from '../../supabase-browser.js';

export class StatsScene extends Phaser.Scene {
    constructor() {
        super({ key: 'StatsScene' });
    }

    init(data) {
        this.user = data?.user || null;
        this.profile = data?.profile || null;
        this.isGuest = data?.isGuest || false;
    }

    async create() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // Background
        this.cameras.main.setBackgroundColor(0x0a0a1e);

        // Title
        this.add.text(width / 2, 50, 'PLAYER STATS', {
            font: 'bold 48px Arial',
            fill: '#00ffff',
            stroke: '#ffffff',
            strokeThickness: 3
        }).setOrigin(0.5);

        // Back button
        const backButton = this.add.text(80, 50, '← BACK', {
            font: 'bold 22px Arial',
            fill: '#ffffff',
            backgroundColor: '#2a2a4e',
            padding: { x: 15, y: 8 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        backButton.on('pointerover', () => backButton.setStyle({ fill: '#00ffff' }));
        backButton.on('pointerout', () => backButton.setStyle({ fill: '#ffffff' }));
        backButton.on('pointerdown', () => {
            this.scene.start('MenuScene', { user: this.user, isGuest: this.isGuest });
        });

        if (this.isGuest || !this.user) {
            this.add.text(width / 2, height / 2, 'Log in to track your stats!', {
                font: '28px Arial',
                fill: '#aaaaaa'
            }).setOrigin(0.5);
            return;
        }

        // Loading text
        const loadingText = this.add.text(width / 2, height / 2, 'Loading stats...', {
            font: '24px Arial',
            fill: '#888888'
        }).setOrigin(0.5);

        try {
            const stats = await getUserStats(this.user.id);
            loadingText.destroy();
            this.displayStats(stats, width, height);
        } catch (e) {
            loadingText.setText('Failed to load stats');
            console.error('Stats error:', e);
        }
    }

    displayStats(stats, width, height) {
        const startY = 120;

        // Username header
        this.add.text(width / 2, startY, stats.username, {
            font: 'bold 36px Arial',
            fill: '#ffffff'
        }).setOrigin(0.5);

        // Stats cards
        const cardData = [
            { label: 'Total Stars', value: `★ ${stats.totalStars}`, color: '#ffff00' },
            { label: 'Levels Completed', value: `${stats.levelsCompleted} / ${stats.totalLevels}`, color: '#00ff88' },
            { label: 'Total Attempts', value: `${stats.totalAttempts}`, color: '#ff8866' },
        ];

        const cardWidth = 300;
        const cardHeight = 80;
        const cardSpacing = 20;
        const totalWidth = cardData.length * cardWidth + (cardData.length - 1) * cardSpacing;
        const cardsStartX = (width - totalWidth) / 2 + cardWidth / 2;

        cardData.forEach((card, i) => {
            const x = cardsStartX + i * (cardWidth + cardSpacing);
            const y = startY + 80;

            // Card background
            this.add.rectangle(x, y, cardWidth, cardHeight, 0x1a1a3e)
                .setStrokeStyle(2, 0x3a3a6a);

            // Label
            this.add.text(x, y - 15, card.label, {
                font: '16px Arial',
                fill: '#888888'
            }).setOrigin(0.5);

            // Value
            this.add.text(x, y + 15, card.value, {
                font: 'bold 28px Arial',
                fill: card.color
            }).setOrigin(0.5);
        });

        // Level breakdown header
        const tableY = startY + 200;
        this.add.text(width / 2, tableY, 'LEVEL BREAKDOWN', {
            font: 'bold 24px Arial',
            fill: '#00ffff'
        }).setOrigin(0.5);

        // Level names
        const levelNames = [
            'Starter Plains', 'Green Hills', 'Crystal Caves', 'Neon City',
            'Lava Fortress', 'Storm Peaks', 'Shadow Realm', 'Chaos Engine'
        ];

        // Table headers
        const colX = [150, 450, 650, 830, 1000];
        const headerY = tableY + 40;

        this.add.text(colX[0], headerY, 'LEVEL', { font: 'bold 16px Arial', fill: '#888888' }).setOrigin(0, 0.5);
        this.add.text(colX[1], headerY, 'STATUS', { font: 'bold 16px Arial', fill: '#888888' }).setOrigin(0, 0.5);
        this.add.text(colX[2], headerY, 'BEST %', { font: 'bold 16px Arial', fill: '#888888' }).setOrigin(0, 0.5);
        this.add.text(colX[3], headerY, 'ATTEMPTS', { font: 'bold 16px Arial', fill: '#888888' }).setOrigin(0, 0.5);

        // Separator
        this.add.rectangle(width / 2, headerY + 20, 1000, 2, 0x3a3a6a);

        // Level rows
        levelNames.forEach((name, i) => {
            const rowY = headerY + 50 + i * 40;
            const levelId = `level_${i + 1}_${[12345, 23456, 34567, 45678, 56789, 67890, 78901, 89012][i]}`;
            const score = stats.scores.find(s => s.level_id === levelId);

            // Level name
            this.add.text(colX[0], rowY, `${i + 1}. ${name}`, {
                font: '16px Arial',
                fill: '#cccccc'
            }).setOrigin(0, 0.5);

            // Status
            if (score?.completed) {
                this.add.text(colX[1], rowY, 'COMPLETED', {
                    font: 'bold 16px Arial',
                    fill: '#00ff88'
                }).setOrigin(0, 0.5);
            } else if (score) {
                this.add.text(colX[1], rowY, 'In Progress', {
                    font: '16px Arial',
                    fill: '#ffaa00'
                }).setOrigin(0, 0.5);
            } else {
                this.add.text(colX[1], rowY, 'Not Started', {
                    font: '16px Arial',
                    fill: '#666666'
                }).setOrigin(0, 0.5);
            }

            // Best percentage
            const bestPercent = score?.best_percent || 0;
            const percentColor = bestPercent === 100 ? '#00ff88' : bestPercent > 0 ? '#00ccff' : '#666666';
            this.add.text(colX[2], rowY, bestPercent > 0 ? `${bestPercent}%` : '-', {
                font: 'bold 16px Arial',
                fill: percentColor
            }).setOrigin(0, 0.5);

            // Attempts
            this.add.text(colX[3], rowY, score ? `${score.attempts}` : '-', {
                font: '16px Arial',
                fill: '#ff8866'
            }).setOrigin(0, 0.5);
        });
    }
}
