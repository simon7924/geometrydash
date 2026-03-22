import { getCommunityLevels, getLevelById, getMyLevels, deleteUserLevel } from '../../supabase-browser.js';

const PAGE_SIZE = 8;

export class CommunityScene extends Phaser.Scene {
    constructor() {
        super({ key: 'CommunityScene' });
    }

    init(data) {
        this.user = data?.user || null;
        this.profile = data?.profile || null;
        this.isGuest = data?.isGuest || false;
        this.levels = [];
        this.page = 0;
        this.tab = 'browse'; // 'browse' | 'mine'
    }

    async create() {
        const W = this.cameras.main.width;
        const H = this.cameras.main.height;

        // Background
        this.add.rectangle(W / 2, H / 2, W, H, 0x1a1a2e);

        // Title
        this.add.text(W / 2, 36, 'COMMUNITY LEVELS', {
            font: 'bold 36px Arial', fill: '#00ffff',
            stroke: '#ffffff', strokeThickness: 2
        }).setOrigin(0.5);

        // Back button
        const backBtn = this.add.text(70, 36, '< BACK', {
            font: 'bold 20px Arial', fill: '#ffffff',
            backgroundColor: '#2a2a4e', padding: { x: 12, y: 8 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        backBtn.on('pointerover', () => backBtn.setStyle({ fill: '#00ffff' }));
        backBtn.on('pointerout', () => backBtn.setStyle({ fill: '#ffffff' }));
        backBtn.on('pointerdown', () => this.scene.start('MenuScene', {
            user: this.user, profile: this.profile, isGuest: this.isGuest
        }));

        // Tabs
        this._buildTabs(W);

        // Level list container
        this._listContainer = this.add.container(0, 0);

        // Nav buttons
        this._buildNav(W, H);

        // Load initial data
        await this._loadLevels();
    }

    _buildTabs(W) {
        const tabY = 80;
        const tabs = [
            { id: 'browse', label: 'Browse All' },
            { id: 'mine',   label: 'My Levels'  }
        ];

        this._tabBtns = {};
        tabs.forEach((t, i) => {
            const x = W / 2 - 100 + i * 200;
            const isActive = t.id === this.tab;
            const btn = this.add.text(x, tabY, t.label, {
                font: `${isActive ? 'bold' : ''} 18px Arial`,
                fill: isActive ? '#00ffff' : '#888888',
                backgroundColor: isActive ? '#2a2a5e' : 'transparent',
                padding: { x: 16, y: 8 }
            }).setOrigin(0.5).setInteractive({ useHandCursor: true });

            btn.on('pointerdown', async () => {
                if (this.tab === t.id) return;
                this.tab = t.id;
                this.page = 0;
                this._refreshTabStyles();
                await this._loadLevels();
            });
            this._tabBtns[t.id] = btn;
        });
    }

    _refreshTabStyles() {
        Object.entries(this._tabBtns).forEach(([id, btn]) => {
            const active = id === this.tab;
            btn.setStyle({
                fontStyle: active ? 'bold' : 'normal',
                fill: active ? '#00ffff' : '#888888',
                backgroundColor: active ? '#2a2a5e' : 'transparent'
            });
        });
    }

    _buildNav(W, H) {
        this._prevBtn = this.add.text(W / 2 - 120, H - 36, '< PREV', {
            font: 'bold 18px Arial', fill: '#aaaaaa',
            backgroundColor: '#2a2a4e', padding: { x: 14, y: 8 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        this._prevBtn.on('pointerdown', async () => {
            if (this.page > 0) { this.page--; this._renderList(); }
        });

        this._nextBtn = this.add.text(W / 2 + 120, H - 36, 'NEXT >', {
            font: 'bold 18px Arial', fill: '#aaaaaa',
            backgroundColor: '#2a2a4e', padding: { x: 14, y: 8 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        this._nextBtn.on('pointerdown', async () => {
            if ((this.page + 1) * PAGE_SIZE < this.levels.length) { this.page++; this._renderList(); }
        });

        this._pageText = this.add.text(W / 2, H - 36, '', {
            font: '16px Arial', fill: '#666666'
        }).setOrigin(0.5);
    }

    async _loadLevels() {
        // Clear list
        this._listContainer.removeAll(true);
        this._showLoading();

        if (this.tab === 'browse') {
            this.levels = await getCommunityLevels();
        } else {
            if (!this.user || this.isGuest) {
                this.levels = [];
            } else {
                const raw = await getMyLevels(this.user.id);
                // Attach username from profile
                this.levels = raw.map(l => ({
                    ...l,
                    profiles: { username: this.profile?.username || 'You' }
                }));
            }
        }

        this._hideLoading();
        this._renderList();
    }

    _showLoading() {
        const W = this.cameras.main.width;
        const H = this.cameras.main.height;
        this._loadingText = this.add.text(W / 2, H / 2, 'Loading...', {
            font: '24px Arial', fill: '#666688'
        }).setOrigin(0.5);
    }

    _hideLoading() {
        if (this._loadingText) { this._loadingText.destroy(); this._loadingText = null; }
    }

    _renderList() {
        this._listContainer.removeAll(true);

        const W = this.cameras.main.width;
        const startY = 108;
        const rowH = 60;
        const start = this.page * PAGE_SIZE;
        const pageItems = this.levels.slice(start, start + PAGE_SIZE);

        if (pageItems.length === 0) {
            const msg = this.tab === 'mine'
                ? (this.isGuest ? 'Login to create levels!' : 'No levels yet. Go make one!')
                : 'No community levels yet. Be the first!';
            this._listContainer.add(this.add.text(W / 2, 300, msg, {
                font: '20px Arial', fill: '#555577'
            }).setOrigin(0.5));
        }

        pageItems.forEach((level, i) => {
            const y = startY + i * rowH;
            const isEven = i % 2 === 0;

            // Row bg
            const rowBg = this.add.rectangle(W / 2, y + rowH / 2, W - 40, rowH - 4,
                isEven ? 0x1e1e3e : 0x222244)
                .setInteractive({ useHandCursor: true });

            const author = level.profiles?.username || 'Unknown';
            const date = new Date(level.created_at).toLocaleDateString();

            // Level name
            const nameTxt = this.add.text(80, y + rowH / 2, level.name, {
                font: 'bold 18px Arial', fill: '#ffffff'
            }).setOrigin(0, 0.5);

            // Author
            const authorTxt = this.add.text(W / 2, y + rowH / 2, `by ${author}`, {
                font: '14px Arial', fill: '#888888'
            }).setOrigin(0.5, 0.5);

            // Date
            const dateTxt = this.add.text(W - 240, y + rowH / 2, date, {
                font: '13px Arial', fill: '#555577'
            }).setOrigin(0.5, 0.5);

            // Play button
            const playBtn = this.add.text(W - 140, y + rowH / 2, 'PLAY', {
                font: 'bold 15px Arial', fill: '#ffffff',
                backgroundColor: '#005533', padding: { x: 12, y: 6 }
            }).setOrigin(0.5).setInteractive({ useHandCursor: true });
            playBtn.on('pointerdown', () => this._playLevel(level.id));

            const rowItems = [rowBg, nameTxt, authorTxt, dateTxt, playBtn];

            // Copy ID + Delete buttons (only for own levels in "mine" tab)
            if (this.tab === 'mine') {
                const copyBtn = this.add.text(W - 195, y + rowH / 2, '📋 ID', {
                    font: 'bold 13px Arial', fill: '#00ffff',
                    backgroundColor: '#0a1a3e', padding: { x: 8, y: 6 }
                }).setOrigin(0.5).setInteractive({ useHandCursor: true });
                copyBtn.on('pointerdown', () => {
                    navigator.clipboard.writeText(level.id).then(() => {
                        copyBtn.setText('Copied!').setStyle({ fill: '#00ff88' });
                        this.time.delayedCall(1500, () => copyBtn.setText('📋 ID').setStyle({ fill: '#00ffff' }));
                    });
                });

                const delBtn = this.add.text(W - 55, y + rowH / 2, '✕', {
                    font: 'bold 18px Arial', fill: '#ff4444',
                    backgroundColor: '#330000', padding: { x: 8, y: 6 }
                }).setOrigin(0.5).setInteractive({ useHandCursor: true });
                delBtn.on('pointerdown', () => this._confirmDelete(level.id, level.name));
                rowItems.push(copyBtn, delBtn);
            }

            rowBg.on('pointerover', () => rowBg.setFillStyle(isEven ? 0x2a2a5e : 0x2e2e5e));
            rowBg.on('pointerout', () => rowBg.setFillStyle(isEven ? 0x1e1e3e : 0x222244));
            rowBg.on('pointerdown', () => this._playLevel(level.id));

            rowItems.forEach(obj => this._listContainer.add(obj));
        });

        // Nav state
        const total = this.levels.length;
        const totalPages = Math.ceil(total / PAGE_SIZE);
        this._prevBtn.setAlpha(this.page > 0 ? 1 : 0.3);
        this._nextBtn.setAlpha(this.page + 1 < totalPages ? 1 : 0.3);
        this._pageText.setText(total > 0 ? `Page ${this.page + 1} / ${totalPages}  (${total} levels)` : '');
    }


    async _playLevel(levelId) {
        const level = await getLevelById(levelId);
        if (!level) { this._showError('Could not load level.'); return; }
        this._launchLevel(level);
    }

    _launchLevel(level) {
        // level_data is the stored JSON; add the DB id onto it
        const levelData = { ...level.level_data, id: level.id, name: level.name };
        this.scene.start('GameScene', {
            user: this.user,
            profile: this.profile,
            isGuest: this.isGuest,
            level: levelData,
            fromCommunity: true,
            attempts: 1
        });
    }

    _confirmDelete(levelId, levelName) {
        const W = this.cameras.main.width;
        const H = this.cameras.main.height;

        const overlay = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.7)
            .setInteractive().setDepth(60);
        const panel = this.add.rectangle(W / 2, H / 2, 420, 180, 0x1a1a3e)
            .setStrokeStyle(2, 0xff4444).setDepth(61);
        const title = this.add.text(W / 2, H / 2 - 55, `Delete "${levelName}"?`, {
            font: 'bold 20px Arial', fill: '#ffffff'
        }).setOrigin(0.5).setDepth(62);
        const sub = this.add.text(W / 2, H / 2 - 20, 'This cannot be undone.', {
            font: '15px Arial', fill: '#888888'
        }).setOrigin(0.5).setDepth(62);

        const confirmBtn = this.add.text(W / 2 - 70, H / 2 + 40, 'DELETE', {
            font: 'bold 18px Arial', fill: '#ffffff',
            backgroundColor: '#880000', padding: { x: 16, y: 8 }
        }).setOrigin(0.5).setDepth(62).setInteractive({ useHandCursor: true });

        const cancelBtn = this.add.text(W / 2 + 70, H / 2 + 40, 'CANCEL', {
            font: 'bold 18px Arial', fill: '#ffffff',
            backgroundColor: '#333355', padding: { x: 16, y: 8 }
        }).setOrigin(0.5).setDepth(62).setInteractive({ useHandCursor: true });

        const elements = [overlay, panel, title, sub, confirmBtn, cancelBtn];
        const close = () => elements.forEach(e => e.destroy());

        confirmBtn.on('pointerdown', async () => {
            close();
            await deleteUserLevel(levelId);
            await this._loadLevels();
        });
        cancelBtn.on('pointerdown', close);
        overlay.on('pointerdown', close);
    }

    _showError(msg) {
        const W = this.cameras.main.width;
        const H = this.cameras.main.height;
        const txt = this.add.text(W / 2, H / 2 + 200, msg, {
            font: 'bold 18px Arial', fill: '#ff4444',
            backgroundColor: '#1a0000', padding: { x: 16, y: 8 }
        }).setOrigin(0.5).setDepth(70);
        this.time.delayedCall(2500, () => txt.destroy());
    }

    shutdown() {}
}
