import { logOut, getProfile, updateProfile } from '../../supabase-browser.js';

export class MenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MenuScene' });
    }

    init(data) {
        this.user = data?.user || null;
        this.isGuest = data?.isGuest || false;
        this.profile = null;
    }

    async create() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // Load profile if logged in
        if (this.user) {
            this.profile = await getProfile(this.user.id);
        }

        // Title
        this.add.text(width / 2, 120, 'PULSE DASH', {
            font: 'bold 72px Arial',
            fill: '#00ffff',
            stroke: '#ffffff',
            strokeThickness: 4
        }).setOrigin(0.5);

        // Subtitle
        this.add.text(width / 2, 190, 'A Geometry Dash-Inspired Game', {
            font: '24px Arial',
            fill: '#aaaaaa'
        }).setOrigin(0.5);

        // User info display
        this.createUserInfo(width);

        // Play button
        const playButton = this.add.rectangle(width / 2, 380, 200, 60, 0x00aa88)
            .setInteractive({ useHandCursor: true });

        this.add.text(width / 2, 380, 'PLAY', {
            font: 'bold 32px Arial',
            fill: '#ffffff'
        }).setOrigin(0.5);

        playButton.on('pointerover', () => {
            playButton.setFillStyle(0x00ccaa);
        });

        playButton.on('pointerout', () => {
            playButton.setFillStyle(0x00aa88);
        });

        playButton.on('pointerdown', () => {
            this.scene.start('LevelSelectScene', { user: this.user, profile: this.profile, isGuest: this.isGuest });
        });

        // Row 2: Stats + Leaderboard side by side
        const statsButton = this.add.rectangle(width / 2 - 110, 458, 190, 46, 0x4a4a8a)
            .setInteractive({ useHandCursor: true });
        this.add.text(width / 2 - 110, 458, 'STATS', {
            font: 'bold 18px Arial', fill: '#ffffff'
        }).setOrigin(0.5);
        statsButton.on('pointerover', () => statsButton.setFillStyle(0x6a6aaa));
        statsButton.on('pointerout', () => statsButton.setFillStyle(0x4a4a8a));
        statsButton.on('pointerdown', () => {
            this.scene.start('StatsScene', { user: this.user, profile: this.profile, isGuest: this.isGuest });
        });

        const lbButton = this.add.rectangle(width / 2 + 110, 458, 190, 46, 0x2a4a6a)
            .setInteractive({ useHandCursor: true });
        this.add.text(width / 2 + 110, 458, 'LEADERBOARD', {
            font: 'bold 15px Arial', fill: '#ffffff'
        }).setOrigin(0.5);
        lbButton.on('pointerover', () => lbButton.setFillStyle(0x3a6a8a));
        lbButton.on('pointerout', () => lbButton.setFillStyle(0x2a4a6a));
        lbButton.on('pointerdown', () => {
            this.scene.start('LeaderboardScene', { user: this.user, profile: this.profile, isGuest: this.isGuest });
        });

        // Row 3: Community Levels
        const communityBtn = this.add.rectangle(width / 2, 520, 420, 46, 0x5a3a8a)
            .setInteractive({ useHandCursor: true });
        this.add.text(width / 2, 520, 'COMMUNITY LEVELS', {
            font: 'bold 18px Arial', fill: '#ffffff'
        }).setOrigin(0.5);
        communityBtn.on('pointerover', () => communityBtn.setFillStyle(0x7a5aaa));
        communityBtn.on('pointerout', () => communityBtn.setFillStyle(0x5a3a8a));
        communityBtn.on('pointerdown', () => {
            this.scene.start('CommunityScene', { user: this.user, profile: this.profile, isGuest: this.isGuest });
        });

        // Row 4: Level Editor
        const editorBtn = this.add.rectangle(width / 2, 578, 420, 46, 0x3a5a2a)
            .setInteractive({ useHandCursor: true });
        this.add.text(width / 2, 578, 'LEVEL EDITOR', {
            font: 'bold 18px Arial', fill: '#ffffff'
        }).setOrigin(0.5);
        editorBtn.on('pointerover', () => editorBtn.setFillStyle(0x5a7a4a));
        editorBtn.on('pointerout', () => editorBtn.setFillStyle(0x3a5a2a));
        editorBtn.on('pointerdown', () => {
            this.scene.start('LevelEditorScene', { user: this.user, profile: this.profile, isGuest: this.isGuest });
        });

        // Instructions
        this.add.text(width / 2, 638, 'SPACE / CLICK / UP - Jump    |    R - Restart    |    ESC - Menu', {
            font: '15px Arial', fill: '#555577'
        }).setOrigin(0.5);

        // Version
        this.add.text(width - 10, height - 10, 'v0.1.0', {
            font: '16px Arial',
            fill: '#666666'
        }).setOrigin(1, 1);

        // Settings gear icon (top-left)
        this._createSettingsButton(width, height);
    }

    _createSettingsButton(width, height) {
        // Gear icon button
        const gearBtn = this.add.text(30, 30, '⚙', {
            font: 'bold 32px Arial',
            fill: '#aaaaaa'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        gearBtn.on('pointerover', () => gearBtn.setStyle({ fill: '#ffffff' }));
        gearBtn.on('pointerout', () => gearBtn.setStyle({ fill: '#aaaaaa' }));
        gearBtn.on('pointerdown', () => this._openSettings(width, height));
    }

    _openSettings(width, height) {
        const cx = width / 2;
        const cy = height / 2;

        // Darken overlay
        const overlay = this.add.rectangle(cx, cy, width, height, 0x000000, 0.7)
            .setInteractive();

        // Settings panel
        const panel = this.add.rectangle(cx, cy, 440, 290, 0x1a1a3e)
            .setStrokeStyle(2, 0x4a4aaa);

        const titleText = this.add.text(cx, cy - 115, 'SETTINGS', {
            font: 'bold 28px Arial', fill: '#00ffff'
        }).setOrigin(0.5);

        const elements = [overlay, panel, titleText];

        const makeToggleRow = (labelStr, yOffset, isOn, onToggle) => {
            const label = this.add.text(cx - 140, cy + yOffset, labelStr, {
                font: '20px Arial', fill: '#ffffff'
            }).setOrigin(0, 0.5);

            const bg = this.add.rectangle(cx + 110, cy + yOffset, 60, 30,
                isOn ? 0x00cc66 : 0x555555).setInteractive({ useHandCursor: true });

            const knob = this.add.circle(cx + (isOn ? 125 : 95), cy + yOffset, 11, 0xffffff);

            let state = isOn;
            bg.on('pointerdown', () => {
                state = !state;
                bg.setFillStyle(state ? 0x00cc66 : 0x555555);
                knob.setX(cx + (state ? 125 : 95));
                onToggle(state);
            });

            elements.push(label, bg, knob);
        };

        // AI Trash Talk toggle
        const trashOn = this.profile?.ai_trash_talk_enabled ?? false;
        makeToggleRow('AI Trash Talk', -45, trashOn, async (val) => {
            if (this.user && this.profile && !this.isGuest) {
                await updateProfile(this.user.id, { ai_trash_talk_enabled: val });
                this.profile.ai_trash_talk_enabled = val;
            }
        });

        // Auto Retry toggle
        const retryOn = this.profile?.auto_retry_enabled ?? false;
        makeToggleRow('Auto Retry (1s)', 25, retryOn, async (val) => {
            if (this.user && this.profile && !this.isGuest) {
                await updateProfile(this.user.id, { auto_retry_enabled: val });
                this.profile.auto_retry_enabled = val;
            }
        });

        const hint = this.add.text(cx, cy + 75, 'Settings save automatically', {
            font: '13px Arial', fill: '#555577'
        }).setOrigin(0.5);

        // Close button
        const closeBtn = this.add.text(cx, cy + 115, '[ CLOSE ]', {
            font: 'bold 18px Arial', fill: '#ff6666'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        closeBtn.on('pointerover', () => closeBtn.setStyle({ fill: '#ff9999' }));
        closeBtn.on('pointerout', () => closeBtn.setStyle({ fill: '#ff6666' }));

        elements.push(hint, closeBtn);

        const destroyAll = () => elements.forEach(e => e.destroy());
        closeBtn.on('pointerdown', destroyAll);
        overlay.on('pointerdown', destroyAll);
    }

    createUserInfo(width) {
        const userContainer = this.add.container(width / 2, 260);

        if (this.user && this.profile) {
            // Logged in user display
            const username = this.profile.username || 'Player';
            const stars = this.profile.total_stars || 0;
            const isAdmin = this.profile.is_admin || false;

            // User box background
            const boxWidth = 400;
            const boxHeight = 60;
            this.add.rectangle(width / 2, 260, boxWidth, boxHeight, 0x2a2a4e, 0.8)
                .setStrokeStyle(2, 0x4a4a6a);

            // Username with admin badge
            let displayName = username;
            if (isAdmin) {
                displayName = '[ADMIN] ' + username;
            }

            this.add.text(width / 2 - 120, 260, displayName, {
                font: 'bold 22px Arial',
                fill: isAdmin ? '#ffaa00' : '#ffffff'
            }).setOrigin(0, 0.5);

            // Stars display
            this.add.text(width / 2 + 80, 260, `Stars: ${stars}`, {
                font: '20px Arial',
                fill: '#ffff00'
            }).setOrigin(0, 0.5);

            // Logout button
            const logoutButton = this.add.text(width - 100, 30, 'Logout', {
                font: '18px Arial',
                fill: '#ff6666',
                backgroundColor: '#2a2a4e',
                padding: { x: 15, y: 8 }
            }).setOrigin(0.5).setInteractive({ useHandCursor: true });

            logoutButton.on('pointerover', () => {
                logoutButton.setStyle({ fill: '#ff9999' });
            });

            logoutButton.on('pointerout', () => {
                logoutButton.setStyle({ fill: '#ff6666' });
            });

            logoutButton.on('pointerdown', async () => {
                await logOut();
                this.scene.start('AuthScene');
            });

        } else if (this.isGuest) {
            // Guest display
            this.add.rectangle(width / 2, 260, 300, 50, 0x4a3a2a, 0.8)
                .setStrokeStyle(2, 0x6a5a4a);

            this.add.text(width / 2, 260, 'Playing as Guest', {
                font: '20px Arial',
                fill: '#ffaa66'
            }).setOrigin(0.5);

            // Login button for guests
            const loginButton = this.add.text(width - 100, 30, 'Login', {
                font: '18px Arial',
                fill: '#66ff66',
                backgroundColor: '#2a2a4e',
                padding: { x: 15, y: 8 }
            }).setOrigin(0.5).setInteractive({ useHandCursor: true });

            loginButton.on('pointerover', () => {
                loginButton.setStyle({ fill: '#99ff99' });
            });

            loginButton.on('pointerout', () => {
                loginButton.setStyle({ fill: '#66ff66' });
            });

            loginButton.on('pointerdown', () => {
                this.scene.start('AuthScene');
            });
        }
    }
}
