import { getLeaderboard, getEndlessLeaderboard, getCommunityLeaderboard } from '../../supabase-browser.js';

export class LeaderboardScene extends Phaser.Scene {
    constructor() {
        super({ key: 'LeaderboardScene' });
    }

    init(data) {
        this.user = data?.user || null;
        this.profile = data?.profile || null;
        this.isGuest = data?.isGuest || false;
    }

    async create() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        this.cameras.main.setBackgroundColor(0x0a0a1e);

        // Title
        this.add.text(width / 2, 50, 'LEADERBOARD', {
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
            this.scene.start('MenuScene', { user: this.user, profile: this.profile, isGuest: this.isGuest });
        });

        // Loading text
        const loadingText = this.add.text(width / 2, height / 2, 'Loading leaderboard...', {
            font: '24px Arial',
            fill: '#888888'
        }).setOrigin(0.5);

        try {
            const [data, endlessData, communityData] = await Promise.all([getLeaderboard(), getEndlessLeaderboard(), getCommunityLeaderboard()]);
            loadingText.destroy();
            this.displayLeaderboard(data, endlessData, communityData, width, height);
        } catch (e) {
            loadingText.setText('Failed to load leaderboard');
            console.error('Leaderboard error:', e);
        }
    }

    displayLeaderboard(data, endlessData, communityData, width, height) {
        const colWidth = 340;
        const topY = 110;
        const spacing = 30;

        const leftX = width / 2 - colWidth - spacing / 2;
        const rightX = width / 2 + colWidth + spacing / 2;
        const centerX = width / 2;

        // ---- STARS SECTION (top-left) ----
        this.drawSection(
            leftX, topY, colWidth,
            'MOST STARS', '#ffff00', 0x1a1a10, 0x4a4a20,
            data.stars,
            (entry, i) => ({
                left: `${i + 1}. ${entry.username}`,
                right: `★ ${entry.total_stars}`,
                rightColor: '#ffff00'
            })
        );

        // ---- ATTEMPTS SECTION (top-right) ----
        this.drawSection(
            rightX, topY, colWidth,
            'MOST ATTEMPTS', '#ff8866', 0x1a100a, 0x4a2a10,
            data.attempts,
            (entry, i) => ({
                left: `${i + 1}. ${entry.username}`,
                right: `${entry.total_attempts}`,
                rightColor: '#ff8866'
            })
        );

        // Calculate Y below the top two sections
        const rowHeight = 44;
        const headerHeight = 50;
        const padding = 20;
        const topSectionRows = Math.max(Math.max(data.stars.length, data.attempts.length), 1);
        const topBoxHeight = headerHeight + topSectionRows * rowHeight + padding;
        const midY = topY + topBoxHeight + 25;

        const wideColWidth = colWidth * 2 + spacing;

        // ---- ENDLESS SECTION (middle center, wider) ----
        const endlessBoxHeight = headerHeight + Math.max(endlessData.length, 1) * rowHeight + padding;
        this.drawSection(
            centerX, midY, wideColWidth,
            '∞ ENDLESS HIGH SCORES', '#00ffff', 0x0a0a1e, 0x004466,
            endlessData,
            (entry, i) => ({
                left: `${i + 1}. ${entry.username}`,
                right: `${entry.score} pts`,
                rightColor: '#00ffff'
            })
        );

        const bottomY = midY + endlessBoxHeight + 25;

        // ---- COMMUNITY LEVELS SECTION (bottom center, wider) ----
        this.drawSection(
            centerX, bottomY, wideColWidth,
            '🏅 COMMUNITY LEVEL COMPLETIONS', '#cc88ff', 0x0f0a1a, 0x442266,
            communityData,
            (entry, i) => ({
                left: `${i + 1}. ${entry.username}`,
                right: `${entry.count} level${entry.count !== 1 ? 's' : ''}`,
                rightColor: '#cc88ff'
            })
        );
    }

    drawSection(centerX, topY, colWidth, title, titleColor, bgColor, borderColor, entries, rowFn) {
        const rowHeight = 44;
        const headerHeight = 50;
        const padding = 20;
        const totalRows = Math.max(entries.length, 1);
        const boxHeight = headerHeight + totalRows * rowHeight + padding;

        // Section box
        this.add.rectangle(centerX, topY + boxHeight / 2, colWidth, boxHeight, bgColor)
            .setStrokeStyle(2, borderColor);

        // Section title
        this.add.text(centerX, topY + headerHeight / 2, title, {
            font: 'bold 20px Arial',
            fill: titleColor
        }).setOrigin(0.5);

        // Divider
        this.add.rectangle(centerX, topY + headerHeight, colWidth - 20, 2, borderColor);

        if (entries.length === 0) {
            this.add.text(centerX, topY + headerHeight + rowHeight, 'No data yet', {
                font: '18px Arial',
                fill: '#555555'
            }).setOrigin(0.5);
            return;
        }

        entries.forEach((entry, i) => {
            const rowY = topY + headerHeight + padding / 2 + i * rowHeight + rowHeight / 2;
            const { left, right, rightColor } = rowFn(entry, i);

            // Highlight top 3
            if (i < 3) {
                const rankColors = [0x3a3a00, 0x2a2a2a, 0x2a1a00];
                this.add.rectangle(centerX, rowY, colWidth - 4, rowHeight - 4, rankColors[i])
                    .setAlpha(0.5);
            }

            const medalColors = ['#ffd700', '#c0c0c0', '#cd7f32'];
            const nameColor = i < 3 ? medalColors[i] : '#cccccc';

            this.add.text(centerX - colWidth / 2 + 20, rowY, left, {
                font: i === 0 ? 'bold 18px Arial' : '16px Arial',
                fill: nameColor
            }).setOrigin(0, 0.5);

            this.add.text(centerX + colWidth / 2 - 20, rowY, right, {
                font: 'bold 16px Arial',
                fill: rightColor
            }).setOrigin(1, 0.5);
        });
    }
}
