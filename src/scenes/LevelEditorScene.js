import { saveUserLevel } from '../../supabase-browser.js';

// Grid / world constants
const GRID = 64;
const GROUND_Y = 650;
const CEILING_Y = 70;
const LEVEL_LENGTH = 6000;
const CAM_SPEED = 400; // px/s when scrolling

// Obstacle palette entries
const TOOLS = [
    { id: 'spike',         label: '▲ Spike',          color: 0xff4444 },
    { id: 'block',         label: '■ Block',           color: 0x4488ff },
    { id: 'portal_CUBE',   label: '◆ Cube Portal',    color: 0x00ff88 },
    { id: 'portal_SHIP',   label: '◆ Ship Portal',    color: 0x00ccff },
    { id: 'portal_BALL',   label: '◆ Ball Portal',    color: 0xff88ff },
    { id: 'portal_UFO',    label: '◆ UFO Portal',     color: 0xffff00 },
    { id: 'portal_WAVE',   label: '◆ Wave Portal',    color: 0xff6600 },
    { id: 'portal_SPIDER', label: '◆ Spider Portal',  color: 0xaa44ff },
    { id: 'portal_ROBOT',  label: '◆ Robot Portal',   color: 0xff4488 },
    { id: 'speed_HALF',    label: '» Slow (0.5x)',    color: 0x88aaff },
    { id: 'speed_NORMAL',  label: '» Normal (1x)',    color: 0xaaffaa },
    { id: 'speed_DOUBLE',  label: '» Fast (2x)',      color: 0xffff44 },
    { id: 'speed_TRIPLE',  label: '» Faster (3x)',    color: 0xffaa00 },
    { id: 'speed_QUADRUPLE',label: '» Fastest (4x)', color: 0xff4400 },
    { id: 'erase',         label: '✕ Erase',           color: 0x444444 },
];

const PORTAL_COLORS = {
    CUBE: 0x00ff88, SHIP: 0x00ccff, BALL: 0xff88ff,
    UFO: 0xffff00, WAVE: 0xff6600, SPIDER: 0xaa44ff, ROBOT: 0xff4488
};

const SPEED_COLORS = {
    HALF: 0x88aaff, NORMAL: 0xaaffaa, DOUBLE: 0xffff44,
    TRIPLE: 0xffaa00, QUADRUPLE: 0xff4400
};

const SPEED_LABELS = {
    HALF: '0.5x', NORMAL: '1x', DOUBLE: '2x', TRIPLE: '3x', QUADRUPLE: '4x'
};

export class LevelEditorScene extends Phaser.Scene {
    constructor() {
        super({ key: 'LevelEditorScene' });
    }

    init(data) {
        this.user = data?.user || null;
        this.profile = data?.profile || null;
        this.isGuest = data?.isGuest || false;
        this.activeTool = 'spike';
        this.spikeRotation = 0; // 0=up, 90=right, 180=down, 270=left
        this.placedObjects = [];
        this.camX = 0;
        this.saving = false;
        // Restored state after test play
        this._savedObjects = data?.savedObjects || null;
        this._savedName   = data?.savedName   || null;
        this._savedLength = data?.savedLength  || null;
        this._dialogOpen  = false;
    }

    create() {
        const W = this.cameras.main.width;   // 1280
        const H = this.cameras.main.height;  // 720
        const TOOLBAR_W = 160;
        const PLAY_AREA_W = W - TOOLBAR_W;

        // ── Single scrollable camera ───────────────────────────────────────
        this.worldCam = this.cameras.main;
        this.worldCam.setBounds(0, 0, LEVEL_LENGTH + W, H);
        this.worldCam.setScroll(0, 0);
        this.cameras.main.setBackgroundColor(0x1a1a2e);

        // Level bounds line (set after _buildNameInput restores _levelLength)
        this._boundLine = this.add.rectangle(LEVEL_LENGTH + TOOLBAR_W, H / 2, 4, H, 0xff0000)
            .setDepth(10);

        // ── Ground & Ceiling ───────────────────────────────────────────────
        this.groundGraphics = this.add.graphics();
        this.groundGraphics.fillStyle(0x2a2a4e, 1);
        this.groundGraphics.fillRect(TOOLBAR_W, GROUND_Y, LEVEL_LENGTH, H - GROUND_Y);
        this.groundGraphics.fillRect(TOOLBAR_W, 0, LEVEL_LENGTH, CEILING_Y);
        this.groundGraphics.setScrollFactor(1, 0);

        // ── Grid ───────────────────────────────────────────────────────────
        this.gridGraphics = this.add.graphics();
        this.gridGraphics.lineStyle(1, 0x2a2a5e, 0.4);
        // Vertical lines
        for (let x = TOOLBAR_W; x <= LEVEL_LENGTH + TOOLBAR_W; x += GRID) {
            this.gridGraphics.lineBetween(x, CEILING_Y, x, GROUND_Y);
        }
        // Horizontal lines
        for (let y = CEILING_Y; y <= GROUND_Y; y += GRID) {
            this.gridGraphics.lineBetween(TOOLBAR_W, y, LEVEL_LENGTH + TOOLBAR_W, y);
        }
        this.gridGraphics.strokePath();

        // ── Ghost cursor (graphics, redrawn each move) ─────────────────────
        this.ghost = this.add.graphics().setDepth(20).setAlpha(0.4).setVisible(false);
        this._ghostPos = { x: 0, y: 0 };

        // ── Toolbar (drawn on UI cam, ignore world scroll) ─────────────────
        this._buildToolbar(TOOLBAR_W, H);

        // ── Level name + length inputs ─────────────────────────────────────
        this._buildNameInput(W, TOOLBAR_W);
        this._updateLevelBoundLine(); // apply restored/default length

        // ── Scrollbar ──────────────────────────────────────────────────────
        this._scrollbarBg = this.add.rectangle(
            TOOLBAR_W + PLAY_AREA_W / 2, H - 8, PLAY_AREA_W, 12, 0x1a1a3e
        ).setScrollFactor(0).setDepth(25);
        this._scrollbarThumb = this.add.rectangle(
            TOOLBAR_W + 20, H - 8, 40, 8, 0x4a4a8e
        ).setScrollFactor(0).setDepth(26);
        this._uiObjects = this._uiObjects || [];
        this._uiObjects.push(this._scrollbarBg, this._scrollbarThumb);

        // ── Input ──────────────────────────────────────────────────────────
        this._middleDragging = false;
        this._middleDragStartX = 0;
        this._middleDragCamX = 0;

        this.input.on('pointermove', (p) => {
            // Middle-mouse pan
            if (this._middleDragging) {
                const dx = p.x - this._middleDragStartX;
                this.worldCam.scrollX = Phaser.Math.Clamp(
                    this._middleDragCamX - dx, 0, this._levelLength
                );
            }
            this._onMove(p, TOOLBAR_W);
        });

        this.input.on('pointerdown', (p) => {
            if (p.middleButtonDown()) {
                this._middleDragging = true;
                this._middleDragStartX = p.x;
                this._middleDragCamX = this.worldCam.scrollX;
                return;
            }
            this._onDown(p, TOOLBAR_W);
        });

        this.input.on('pointerup', () => { this._middleDragging = false; });

        // Native wheel event — scrolls world cam unless pointer is over toolbar
        this._wheelHandler = (e) => {
            e.preventDefault();
            if (e.offsetX <= 160) return; // toolbar handles its own scroll
            this.worldCam.scrollX = Phaser.Math.Clamp(
                this.worldCam.scrollX + e.deltaY * 1.5, 0, this._levelLength
            );
        };
        this.game.canvas.addEventListener('wheel', this._wheelHandler, { passive: false });

        // Keyboard scroll
        this.cursors = this.input.keyboard.createCursorKeys();
        this.wasd = this.input.keyboard.addKeys({ left: 'A', right: 'D' });

        // Spike rotation (Q = CCW, E = CW) — redraw ghost immediately
        this.input.keyboard.on('keydown-Q', () => {
            this.spikeRotation = (this.spikeRotation + 270) % 360;
            this._redrawGhost();
        });
        this.input.keyboard.on('keydown-E', () => {
            this.spikeRotation = (this.spikeRotation + 90) % 360;
            this._redrawGhost();
        });

        // Back / save shortcuts
        this.input.keyboard.on('keydown-ESC', () => this._goBack());
        this.input.keyboard.on('keydown-S', (e) => {
            if (e.ctrlKey || e.metaKey) { e.preventDefault(); this._save(); }
        });


        // Restore saved state from test play
        if (this._savedObjects) {
            this._savedObjects.forEach(o => {
                const prevRot = this.spikeRotation;
                this.spikeRotation = o.rotation || 0;
                this._place(o.gx, o.gy, 0, 0, o.type);
                this.spikeRotation = prevRot;
            });
        }
    }

    _buildToolbar(toolbarW, H) {
        this._uiObjects = [];

        // Bottom buttons area height
        const BOTTOM_H = 220;
        // Tool list area: from title to just above bottom buttons
        const listTop = 42;
        const listH = H - BOTTOM_H - listTop;

        // Toolbar background
        const bg = this.add.rectangle(toolbarW / 2, H / 2, toolbarW, H, 0x0d0d1e)
            .setScrollFactor(0).setDepth(30);
        this._uiObjects.push(bg);

        // Title
        const title = this.add.text(toolbarW / 2, 14, 'EDITOR', {
            font: 'bold 14px Arial', fill: '#00ffff'
        }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(34);
        this._uiObjects.push(title);

        // Tool list scroll state
        this._toolScrollY = 0;
        this._toolButtons = {};
        const btnH = 34;
        const pad = 3;
        const itemH = btnH + pad;
        const totalToolH = TOOLS.length * itemH;

        // Container holds all tool buttons; scrolled by adjusting .y
        this._toolListContainer = this.add.container(0, listTop).setScrollFactor(0).setDepth(31);

        TOOLS.forEach((tool, i) => {
            const localY = i * itemH;
            const isActive = tool.id === this.activeTool;

            const btn = this.add.rectangle(toolbarW / 2, localY + btnH / 2, toolbarW - 12, btnH,
                isActive ? 0x2a2a6e : 0x1a1a3e)
                .setScrollFactor(0).setInteractive({ useHandCursor: true });

            const lbl = this.add.text(toolbarW / 2, localY + btnH / 2, tool.label, {
                font: '11px Arial', fill: isActive ? '#ffffff' : '#aaaaaa'
            }).setOrigin(0.5).setScrollFactor(0);

            btn.on('pointerover', () => {
                if (this.activeTool !== tool.id) btn.setFillStyle(0x2a2a4e);
            });
            btn.on('pointerout', () => {
                if (this.activeTool !== tool.id) btn.setFillStyle(0x1a1a3e);
            });
            btn.on('pointerdown', (p) => {
                // Only activate if click is within the visible tool list area
                if (p.y >= listTop && p.y <= listTop + listH) this._selectTool(tool.id);
            });

            this._toolButtons[tool.id] = { btn, lbl };
            this._toolListContainer.add([btn, lbl]);
        });

        // Cover strips to hide buttons outside the visible list area
        // Top cover: hides buttons that scroll above the title
        this.add.rectangle(toolbarW / 2, listTop / 2, toolbarW, listTop, 0x0d0d1e)
            .setScrollFactor(0).setDepth(33);
        // Bottom cover: hides buttons that overflow below the list into the buttons area
        const coverTop = listTop + listH;
        const coverH = H - coverTop;
        this.add.rectangle(toolbarW / 2, coverTop + coverH / 2, toolbarW, coverH, 0x0d0d1e)
            .setScrollFactor(0).setDepth(33);

        // Scroll the tool list when mouse wheel is over toolbar
        this._toolScrollHandler = (e) => {
            if (e.offsetX > toolbarW) return;
            const maxScroll = Math.max(0, totalToolH - listH);
            this._toolScrollY = Phaser.Math.Clamp(this._toolScrollY + e.deltaY * 0.5, 0, maxScroll);
            this._toolListContainer.y = listTop - this._toolScrollY;
        };
        this.game.canvas.addEventListener('wheel', this._toolScrollHandler);

        // Separator
        const sep = this.add.rectangle(toolbarW / 2, H - BOTTOM_H + 5, toolbarW - 12, 1, 0x3a3a5e)
            .setScrollFactor(0).setDepth(34);
        this._uiObjects.push(sep);

        // Save button
        const saveBtn = this.add.rectangle(toolbarW / 2, H - 185, toolbarW - 12, 36, 0x006633)
            .setScrollFactor(0).setDepth(34).setInteractive({ useHandCursor: true });
        const saveLbl = this.add.text(toolbarW / 2, H - 185, 'PUBLISH', {
            font: 'bold 13px Arial', fill: '#ffffff'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(35);
        saveBtn.on('pointerover', () => saveBtn.setFillStyle(0x008844));
        saveBtn.on('pointerout', () => saveBtn.setFillStyle(0x006633));
        saveBtn.on('pointerdown', () => this._save());
        this._uiObjects.push(saveBtn, saveLbl);

        // Test play button
        const testBtn = this.add.rectangle(toolbarW / 2, H - 140, toolbarW - 12, 36, 0x004488)
            .setScrollFactor(0).setDepth(34).setInteractive({ useHandCursor: true });
        const testLbl = this.add.text(toolbarW / 2, H - 140, 'TEST PLAY', {
            font: 'bold 13px Arial', fill: '#ffffff'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(35);
        testBtn.on('pointerover', () => testBtn.setFillStyle(0x0066aa));
        testBtn.on('pointerout', () => testBtn.setFillStyle(0x004488));
        testBtn.on('pointerdown', () => this._testPlay());
        this._uiObjects.push(testBtn, testLbl);

        // Clear button
        const clearBtn = this.add.rectangle(toolbarW / 2, H - 95, toolbarW - 12, 36, 0x550000)
            .setScrollFactor(0).setDepth(34).setInteractive({ useHandCursor: true });
        const clearLbl = this.add.text(toolbarW / 2, H - 95, 'CLEAR ALL', {
            font: 'bold 13px Arial', fill: '#ffffff'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(35);
        clearBtn.on('pointerover', () => clearBtn.setFillStyle(0x880000));
        clearBtn.on('pointerout', () => clearBtn.setFillStyle(0x550000));
        clearBtn.on('pointerdown', () => this._clearAll());
        this._uiObjects.push(clearBtn, clearLbl);

        // Back button
        const backBtn = this.add.rectangle(toolbarW / 2, H - 48, toolbarW - 12, 36, 0x2a2a4e)
            .setScrollFactor(0).setDepth(34).setInteractive({ useHandCursor: true });
        const backLbl = this.add.text(toolbarW / 2, H - 48, '< BACK', {
            font: 'bold 13px Arial', fill: '#aaaaaa'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(35);
        backBtn.on('pointerover', () => backBtn.setFillStyle(0x3a3a6e));
        backBtn.on('pointerout', () => backBtn.setFillStyle(0x2a2a4e));
        backBtn.on('pointerdown', () => this._goBack());
        this._uiObjects.push(backBtn, backLbl);

        // Status text
        this._statusText = this.add.text(toolbarW / 2, H - 10, '', {
            font: '10px Arial', fill: '#888888'
        }).setOrigin(0.5, 1).setScrollFactor(0).setDepth(35);
        this._uiObjects.push(this._statusText);

        // Ignore tool list container in world cam (after worldCam is set)
        this.worldCam?.ignore(this._toolListContainer);
    }

    _buildNameInput(W, toolbarW) {
        this._levelName   = this._savedName   || 'My Level';
        this._levelLength = this._savedLength || LEVEL_LENGTH;

        const inputStyle = `
            background: #1a1a3e;
            color: #ffffff;
            border: 1px solid #4a4a8e;
            border-radius: 4px;
            padding: 6px 10px;
            font: 15px Arial;
            outline: none;
            z-index: 100;
            position: absolute;
            top: 10px;
        `;

        // Level name input
        const nameEl = document.createElement('input');
        nameEl.type = 'text';
        nameEl.value = this._levelName;
        nameEl.placeholder = 'Level name...';
        nameEl.maxLength = 40;
        nameEl.style.cssText = inputStyle + `left: ${toolbarW + 10}px; width: 220px;`;
        nameEl.addEventListener('input', () => { this._levelName = nameEl.value || 'My Level'; });
        nameEl.addEventListener('keydown', (e) => e.stopPropagation());
        document.getElementById('game-container').appendChild(nameEl);
        this._inputEl = nameEl;

        // Length label
        const lenLabel = document.createElement('span');
        lenLabel.textContent = 'Length:';
        lenLabel.style.cssText = `position:absolute;top:16px;left:${toolbarW+244}px;color:#aaaaaa;font:14px Arial;z-index:100;`;
        document.getElementById('game-container').appendChild(lenLabel);
        this._lenLabelEl = lenLabel;

        // Level length input
        const lenEl = document.createElement('input');
        lenEl.type = 'number';
        lenEl.value = this._levelLength;
        lenEl.min = 2000;
        lenEl.max = 20000;
        lenEl.step = 500;
        lenEl.style.cssText = inputStyle + `left: ${toolbarW + 300}px; width: 90px;`;
        lenEl.addEventListener('input', () => {
            const v = parseInt(lenEl.value);
            if (!isNaN(v) && v >= 2000 && v <= 20000) {
                this._levelLength = v;
                this._updateLevelBoundLine();
            }
        });
        lenEl.addEventListener('keydown', (e) => e.stopPropagation());
        document.getElementById('game-container').appendChild(lenEl);
        this._lenEl = lenEl;
    }

    _updateLevelBoundLine() {
        const TOOLBAR_W = 160;
        if (this._boundLine) this._boundLine.destroy();
        this._boundLine = this.add.rectangle(
            TOOLBAR_W + this._levelLength, this.cameras.main.height / 2,
            4, this.cameras.main.height, 0xff0000
        ).setDepth(10);
        // Update camera bounds
        this.worldCam.setBounds(0, 0, TOOLBAR_W + this._levelLength + this.cameras.main.width, this.cameras.main.height);
    }

    _selectTool(toolId) {
        const prev = this._toolButtons[this.activeTool];
        if (prev) {
            prev.btn.setFillStyle(0x1a1a3e);
            prev.lbl.setStyle({ fill: '#aaaaaa' });
        }
        this.activeTool = toolId;
        const cur = this._toolButtons[toolId];
        if (cur) {
            cur.btn.setFillStyle(0x2a2a6e);
            cur.lbl.setStyle({ fill: '#ffffff' });
        }
    }

    _redrawGhost() {
        if (!this._lastSnapped) return;
        const { x: cx, y: cy } = this._lastSnapped;
        const h = GRID - 8, hw = GRID / 2 - 4;
        this.ghost.clear().setVisible(true);
        if (this.activeTool === 'spike') {
            this.ghost.fillStyle(0xff4444, 1);
            const rot = this.spikeRotation;
            let pts;
            if (rot === 0)        pts = [cx, cy - h/2,  cx - hw, cy + h/2,  cx + hw, cy + h/2];
            else if (rot === 180) pts = [cx, cy + h/2,  cx + hw, cy - h/2,  cx - hw, cy - h/2];
            else if (rot === 90)  pts = [cx + h/2, cy,  cx - h/2, cy - hw,  cx - h/2, cy + hw];
            else                  pts = [cx - h/2, cy,  cx + h/2, cy + hw,  cx + h/2, cy - hw];
            this.ghost.fillTriangle(pts[0], pts[1], pts[2], pts[3], pts[4], pts[5]);
        } else if (this.activeTool === 'erase') {
            this.ghost.fillStyle(0xff0000, 1);
            this.ghost.fillRect(cx - GRID/2 + 4, cy - GRID/2 + 4, GRID - 8, GRID - 8);
        } else if (this.activeTool === 'block') {
            this.ghost.fillStyle(0x4488ff, 1);
            this.ghost.fillRect(cx - GRID/2 + 2, cy - GRID/2 + 2, GRID - 4, GRID - 4);
        } else if (this.activeTool.startsWith('portal_')) {
            const mode = this.activeTool.replace('portal_', '');
            this.ghost.fillStyle(PORTAL_COLORS[mode] || 0xffffff, 0.5);
            this.ghost.fillRect(cx - 16, CEILING_Y, 32, GROUND_Y - CEILING_Y);
        } else if (this.activeTool.startsWith('speed_')) {
            const speedMode = this.activeTool.replace('speed_', '');
            this.ghost.fillStyle(SPEED_COLORS[speedMode] || 0xffffff, 0.5);
            this.ghost.fillRect(cx - 12, CEILING_Y, 24, GROUND_Y - CEILING_Y);
        }
    }

    _onMove(pointer, toolbarW) {
        if (this._dialogOpen || pointer.x < toolbarW) { this.ghost.setVisible(false); return; }

        const worldX = pointer.x + this.worldCam.scrollX;
        const worldY = pointer.y + this.worldCam.scrollY;
        const snapped = this._snap(worldX, worldY);
        if (!snapped) { this.ghost.setVisible(false); return; }

        this._lastSnapped = snapped;
        this._redrawGhost();

        // Drag-place
        if (pointer.isDown && pointer.x >= toolbarW) {
            this._place(snapped.gx, snapped.gy, worldX, worldY);
        }
    }

    _onDown(pointer, toolbarW) {
        if (this._dialogOpen || pointer.x < toolbarW) return;
        const worldX = pointer.x + this.worldCam.scrollX;
        const worldY = pointer.y + this.worldCam.scrollY;
        const snapped = this._snap(worldX, worldY);
        if (snapped) this._place(snapped.gx, snapped.gy, worldX, worldY);
    }

    // Draw a spike triangle at (cx, cy) with given rotation (0/90/180/270)
    // 0=tip up, 90=tip right, 180=tip down, 270=tip left
    _drawSpike(cx, cy, rotation) {
        const g = this.add.graphics().setDepth(15);
        g.fillStyle(0xff4444, 1);
        const h = GRID - 8;  // height of triangle
        const hw = GRID / 2 - 4; // half-width of base
        // Define triangle pointing UP, then rotate
        let pts;
        if (rotation === 0) {
            // tip up
            pts = [cx, cy - h / 2,  cx - hw, cy + h / 2,  cx + hw, cy + h / 2];
        } else if (rotation === 180) {
            // tip down
            pts = [cx, cy + h / 2,  cx + hw, cy - h / 2,  cx - hw, cy - h / 2];
        } else if (rotation === 90) {
            // tip right
            pts = [cx + h / 2, cy,  cx - h / 2, cy - hw,  cx - h / 2, cy + hw];
        } else {
            // tip left (270)
            pts = [cx - h / 2, cy,  cx + h / 2, cy + hw,  cx + h / 2, cy - hw];
        }
        g.fillTriangle(pts[0], pts[1], pts[2], pts[3], pts[4], pts[5]);
        return g;
    }

    // Snap world coords to grid. Returns null if out of play area.
    // worldX = pointer.x + scrollX, worldY = pointer.y (no Y scroll)
    _snap(worldX, worldY) {
        const TOOLBAR_W = 160;
        // Level space: x offset from toolbar (world coords include scrollX)
        const levelX = worldX - TOOLBAR_W;
        if (levelX < 0 || levelX > this._levelLength) return null;
        if (worldY < CEILING_Y || worldY > GROUND_Y) return null;

        const gx = Math.floor(levelX / GRID);
        const gy = Math.floor((worldY - CEILING_Y) / GRID);
        const x = TOOLBAR_W + gx * GRID + GRID / 2;
        const y = CEILING_Y + gy * GRID + GRID / 2;
        return { gx, gy, x, y };
    }

    _place(gx, gy, worldX, worldY, forceTool) {
        const TOOLBAR_W = 160;
        const tool = forceTool || this.activeTool;

        if (tool === 'erase') { this._erase(gx, gy); return; }

        // Temporarily override activeTool for placement logic
        const prevTool = this.activeTool;
        if (forceTool) this.activeTool = forceTool;

        // Only one portal/speed per column (x position)
        if (this.activeTool.startsWith('portal_') || this.activeTool.startsWith('speed_')) {
            const existingPortal = this.placedObjects.find(
                o => (o.type.startsWith('portal_') || o.type.startsWith('speed_')) && o.gx === gx
            );
            if (existingPortal) { this.activeTool = prevTool; return; }
        }

        // Don't stack on same cell
        if (this.placedObjects.find(o => o.gx === gx && o.gy === gy)) return;

        const snapX = TOOLBAR_W + gx * GRID + GRID / 2;
        const snapY = CEILING_Y + gy * GRID + GRID / 2;

        let gameObj;
        if (this.activeTool === 'spike') {
            const rot = this.spikeRotation;
            gameObj = this._drawSpike(snapX, snapY, rot);
        } else if (this.activeTool === 'block') {
            const g = this.add.graphics().setDepth(15);
            g.fillStyle(0x4488ff, 1);
            g.fillRect(snapX - GRID / 2 + 2, snapY - GRID / 2 + 2, GRID - 4, GRID - 4);
            g.lineStyle(2, 0x88aaff, 1);
            g.strokeRect(snapX - GRID / 2 + 2, snapY - GRID / 2 + 2, GRID - 4, GRID - 4);
            gameObj = g;
        } else if (this.activeTool.startsWith('portal_')) {
            const mode = this.activeTool.replace('portal_', '');
            const color = PORTAL_COLORS[mode] || 0xffffff;
            const g = this.add.graphics().setDepth(15);
            g.fillStyle(color, 0.5);
            g.fillRect(snapX - 16, CEILING_Y, 32, GROUND_Y - CEILING_Y);
            g.lineStyle(2, color, 1);
            g.strokeRect(snapX - 16, CEILING_Y, 32, GROUND_Y - CEILING_Y);
            const lbl = this.add.text(snapX, CEILING_Y + 20, mode, {
                font: 'bold 11px Arial', fill: '#ffffff'
            }).setOrigin(0.5, 0).setDepth(16);
            gameObj = [g, lbl];
        } else if (this.activeTool.startsWith('speed_')) {
            const speedMode = this.activeTool.replace('speed_', '');
            const color = SPEED_COLORS[speedMode] || 0xffffff;
            const g = this.add.graphics().setDepth(15);
            g.fillStyle(color, 0.4);
            g.fillRect(snapX - 12, CEILING_Y, 24, GROUND_Y - CEILING_Y);
            g.lineStyle(2, color, 1);
            g.strokeRect(snapX - 12, CEILING_Y, 24, GROUND_Y - CEILING_Y);
            const lbl = this.add.text(snapX, CEILING_Y + 20, SPEED_LABELS[speedMode], {
                font: 'bold 11px Arial', fill: '#ffffff'
            }).setOrigin(0.5, 0).setDepth(16);
            gameObj = [g, lbl];
        }

        const rotation = (this.activeTool === 'spike') ? this.spikeRotation : 0;
        const entry = { type: this.activeTool, gx, gy, rotation, gameObj };
        this.placedObjects.push(entry);
        if (forceTool) this.activeTool = prevTool;
    }

    _erase(gx, gy) {
        // Portals and speed portals: match by column only. Everything else: exact cell.
        const toRemove = this.placedObjects.filter(o => {
            if (o.type.startsWith('portal_') || o.type.startsWith('speed_')) return o.gx === gx;
            return o.gx === gx && o.gy === gy;
        });
        toRemove.forEach(o => {
            if (Array.isArray(o.gameObj)) o.gameObj.forEach(g => g.destroy());
            else o.gameObj.destroy();
        });
        this.placedObjects = this.placedObjects.filter(o => !toRemove.includes(o));
    }

    _clearAll() {
        this.placedObjects.forEach(o => {
            if (Array.isArray(o.gameObj)) o.gameObj.forEach(g => g.destroy());
            else o.gameObj.destroy();
        });
        this.placedObjects = [];
    }

    _buildLevelData() {
        const TOOLBAR_W = 160;
        const obstacles = [];
        const portals = [];

        this.placedObjects.forEach(o => {
            // World pixel coords (without toolbar offset)
            const wx = o.gx * GRID + GRID / 2;
            const wy = CEILING_Y + o.gy * GRID + GRID / 2;

            if (o.type === 'spike') {
                const rot = o.rotation || 0;
                // Snap floor/ceiling spikes to exact game positions
                let sy = wy;
                if (rot === 0)   sy = GROUND_Y - 57;   // tip up, sits on floor
                if (rot === 180) sy = CEILING_Y + 57;  // tip down, hangs from ceiling
                obstacles.push({ type: 'spike', x: wx, y: sy, rotation: rot });
            } else if (o.type === 'block') {
                obstacles.push({ type: 'block', x: wx, y: wy });
            } else if (o.type.startsWith('portal_')) {
                const mode = o.type.replace('portal_', '');
                portals.push({ type: 'gamemode', mode, x: wx, y: 360 });
            } else if (o.type.startsWith('speed_')) {
                const speedMode = o.type.replace('speed_', '');
                portals.push({ type: 'speed', speedMode, x: wx, y: 360 });
            }
        });

        // Sort portals by x
        portals.sort((a, b) => a.x - b.x);

        return {
            id: null, // assigned by DB
            name: this._levelName,
            difficulty: 1,
            stars: 1,
            levelLength: this._levelLength,
            gameSpeed: 350,
            backgroundColor: 0x1a1a2e,
            groundColor: 0x2a2a4e,
            spikeColor: 0xff4444,
            obstacles,
            portals
        };
    }

    async _save() {
        if (this.saving) return;
        if (!this.user || this.isGuest) {
            this._setStatus('Login required to publish!');
            return;
        }
        if (this.placedObjects.length === 0) {
            this._setStatus('Place some obstacles first!');
            return;
        }

        this.saving = true;
        this._setStatus('Publishing...');

        const levelData = this._buildLevelData();
        const result = await saveUserLevel(this.user.id, this._levelName, levelData);

        if (result.success) {
            this._setStatus(`Published! ID: ${result.id.slice(0, 8)}...`);
            // Show shareable ID
            this._showPublishSuccess(result.id);
        } else {
            this._setStatus('Error: ' + result.error);
        }
        this.saving = false;
    }

    _showPublishSuccess(levelId) {
        const W = this.cameras.main.width;
        const H = this.cameras.main.height;

        // Block world placement while dialog is open
        this._dialogOpen = true;

        const overlay = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.7)
            .setScrollFactor(0).setDepth(50).setInteractive(); // consumes all clicks

        const panel = this.add.rectangle(W / 2, H / 2, 500, 260, 0x1a1a3e)
            .setScrollFactor(0).setDepth(51).setStrokeStyle(2, 0x00ff88);

        const title = this.add.text(W / 2, H / 2 - 95, 'Level Published!', {
            font: 'bold 28px Arial', fill: '#00ff88'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(52);

        const hint = this.add.text(W / 2, H / 2 - 50, 'Share this Level ID:', {
            font: '16px Arial', fill: '#aaaaaa'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(52);

        const idText = this.add.text(W / 2, H / 2 - 10, levelId, {
            font: 'bold 14px Arial', fill: '#ffffff',
            backgroundColor: '#0a0a2e', padding: { x: 12, y: 8 }
        }).setOrigin(0.5).setScrollFactor(0).setDepth(52);

        const copyBtn = this.add.text(W / 2, H / 2 + 38, '[ COPY ID ]', {
            font: 'bold 16px Arial', fill: '#00ffff',
            backgroundColor: '#0a1a3e', padding: { x: 14, y: 8 }
        }).setOrigin(0.5).setScrollFactor(0).setDepth(52).setInteractive({ useHandCursor: true });

        copyBtn.on('pointerdown', (p) => {
            p.event.stopPropagation();
            navigator.clipboard.writeText(levelId).then(() => {
                copyBtn.setText('[ COPIED! ]').setStyle({ fill: '#00ff88' });
                this.time.delayedCall(1500, () => {
                    if (copyBtn.active) copyBtn.setText('[ COPY ID ]').setStyle({ fill: '#00ffff' });
                });
            });
        });

        const menuBtn = this.add.text(W / 2, H / 2 + 88, '[ GO TO MENU ]', {
            font: 'bold 18px Arial', fill: '#ffffff',
            backgroundColor: '#004422', padding: { x: 16, y: 10 }
        }).setOrigin(0.5).setScrollFactor(0).setDepth(52).setInteractive({ useHandCursor: true });

        menuBtn.on('pointerdown', (p) => {
            p.event.stopPropagation();
            this._cleanup();
            this.scene.start('MenuScene', { user: this.user, profile: this.profile, isGuest: this.isGuest });
        });

        this.worldCam.ignore([overlay, panel, title, hint, idText, copyBtn, menuBtn]);
    }

    _testPlay() {
        if (this.placedObjects.length === 0) {
            this._setStatus('Nothing to test!');
            return;
        }
        const levelData = this._buildLevelData();
        levelData.id = '__editor_test__';
        // Serialize placed objects (strip Phaser gameObj refs) to restore after test
        const savedObjects = this.placedObjects.map(o => ({ type: o.type, gx: o.gx, gy: o.gy, rotation: o.rotation || 0 }));
        this._cleanup();
        this.scene.start('GameScene', {
            user: this.user,
            profile: this.profile,
            isGuest: this.isGuest,
            level: levelData,
            fromEditor: true,
            editorState: { savedObjects, savedName: this._levelName, savedLength: this._levelLength },
            attempts: 1
        });
    }

    _goBack() {
        this._cleanup();
        this.scene.start('MenuScene', { user: this.user, profile: this.profile, isGuest: this.isGuest });
    }

    _cleanup() {
        [this._inputEl, this._lenEl, this._lenLabelEl].forEach(el => {
            if (el && el.parentNode) el.parentNode.removeChild(el);
        });
        if (this._wheelHandler) {
            this.game.canvas.removeEventListener('wheel', this._wheelHandler);
            this._wheelHandler = null;
        }
        if (this._toolScrollHandler) {
            this.game.canvas.removeEventListener('wheel', this._toolScrollHandler);
            this._toolScrollHandler = null;
        }
    }

    _setStatus(msg) {
        if (this._statusText) this._statusText.setText(msg);
    }

    update(time, delta) {
        const dt = delta / 1000;
        const TOOLBAR_W = 160;
        const W = this.cameras.main.width;
        const H = this.cameras.main.height;
        const PLAY_AREA_W = W - TOOLBAR_W;

        // Keyboard scroll
        const left = this.cursors.left.isDown || this.wasd.left.isDown;
        const right = this.cursors.right.isDown || this.wasd.right.isDown;
        const maxScroll = this._levelLength;
        if (left)  this.worldCam.scrollX = Math.max(0, this.worldCam.scrollX - CAM_SPEED * dt);
        if (right) this.worldCam.scrollX = Math.min(maxScroll, this.worldCam.scrollX + CAM_SPEED * dt);

        // Update scrollbar thumb
        if (this._scrollbarThumb && this._scrollbarThumb.active) {
            const totalWorld = this._levelLength + PLAY_AREA_W;
            const thumbW = Math.max(30, (PLAY_AREA_W / totalWorld) * PLAY_AREA_W);
            const scrollRatio = this.worldCam.scrollX / maxScroll;
            const thumbX = TOOLBAR_W + (scrollRatio * (PLAY_AREA_W - thumbW)) + thumbW / 2;
            this._scrollbarThumb.setSize(thumbW, 8).setPosition(thumbX, H - 8);
        }
    }

    shutdown() {
        this._cleanup();
    }
}
