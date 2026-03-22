export class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
    }

    preload() {
        // Create loading bar
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        const progressBar = this.add.graphics();
        const progressBox = this.add.graphics();
        progressBox.fillStyle(0x222222, 0.8);
        progressBox.fillRect(width / 2 - 160, height / 2 - 25, 320, 50);

        const loadingText = this.add.text(width / 2, height / 2 - 50, 'Loading...', {
            font: '20px monospace',
            fill: '#ffffff'
        }).setOrigin(0.5, 0.5);

        // Update progress bar as assets load
        this.load.on('progress', (value) => {
            progressBar.clear();
            progressBar.fillStyle(0x00ffff, 1);
            progressBar.fillRect(width / 2 - 150, height / 2 - 15, 300 * value, 30);
        });

        this.load.on('complete', () => {
            progressBar.destroy();
            progressBox.destroy();
            loadingText.destroy();
        });

        // Generate placeholder assets
        this.createPlaceholderAssets();
    }

    createPlaceholderAssets() {
        // ===== CUBE: Cyan square with white border and inner diamond =====
        const playerGraphics = this.make.graphics({ x: 0, y: 0, add: false });
        playerGraphics.fillStyle(0x00ffff, 1);
        playerGraphics.fillRect(0, 0, 50, 50);
        playerGraphics.lineStyle(3, 0xffffff, 1);
        playerGraphics.strokeRect(0, 0, 50, 50);
        // Inner diamond detail
        playerGraphics.lineStyle(2, 0x00aacc, 1);
        playerGraphics.beginPath();
        playerGraphics.moveTo(25, 10);
        playerGraphics.lineTo(40, 25);
        playerGraphics.lineTo(25, 40);
        playerGraphics.lineTo(10, 25);
        playerGraphics.closePath();
        playerGraphics.strokePath();
        playerGraphics.generateTexture('player', 50, 50);
        playerGraphics.destroy();

        // ===== SHIP: Blue pointed arrow/rocket shape =====
        const shipGfx = this.make.graphics({ x: 0, y: 0, add: false });
        shipGfx.fillStyle(0x0088ff, 1);
        // Main body - pointed right
        shipGfx.beginPath();
        shipGfx.moveTo(50, 25);  // Nose
        shipGfx.lineTo(5, 5);    // Top-left
        shipGfx.lineTo(12, 25);  // Left indent
        shipGfx.lineTo(5, 45);   // Bottom-left
        shipGfx.closePath();
        shipGfx.fillPath();
        // Cockpit highlight
        shipGfx.fillStyle(0x44ccff, 1);
        shipGfx.fillCircle(30, 25, 6);
        // Border
        shipGfx.lineStyle(2, 0xffffff, 1);
        shipGfx.beginPath();
        shipGfx.moveTo(50, 25);
        shipGfx.lineTo(5, 5);
        shipGfx.lineTo(12, 25);
        shipGfx.lineTo(5, 45);
        shipGfx.closePath();
        shipGfx.strokePath();
        shipGfx.generateTexture('player_ship', 50, 50);
        shipGfx.destroy();

        // ===== BALL: Orange circle with segments =====
        const ballGfx = this.make.graphics({ x: 0, y: 0, add: false });
        ballGfx.fillStyle(0xff8800, 1);
        ballGfx.fillCircle(25, 25, 23);
        ballGfx.lineStyle(2, 0xffffff, 1);
        ballGfx.strokeCircle(25, 25, 23);
        // Cross lines
        ballGfx.lineStyle(2, 0xcc6600, 1);
        ballGfx.lineBetween(25, 2, 25, 48);
        ballGfx.lineBetween(2, 25, 48, 25);
        ballGfx.generateTexture('player_ball', 50, 50);
        ballGfx.destroy();

        // ===== UFO: Purple dome with beam underneath =====
        const ufoGfx = this.make.graphics({ x: 0, y: 0, add: false });
        // Dome top
        ufoGfx.fillStyle(0xcc00ff, 1);
        ufoGfx.beginPath();
        ufoGfx.arc(25, 22, 16, Math.PI, 0, false);
        ufoGfx.closePath();
        ufoGfx.fillPath();
        // Body disc
        ufoGfx.fillStyle(0x9900cc, 1);
        ufoGfx.fillRect(5, 20, 40, 10);
        // Window
        ufoGfx.fillStyle(0xff66ff, 1);
        ufoGfx.fillCircle(25, 18, 5);
        // Bottom beam lines
        ufoGfx.lineStyle(1, 0xff66ff, 0.6);
        ufoGfx.lineBetween(15, 30, 10, 48);
        ufoGfx.lineBetween(35, 30, 40, 48);
        // Border
        ufoGfx.lineStyle(2, 0xffffff, 1);
        ufoGfx.beginPath();
        ufoGfx.arc(25, 22, 16, Math.PI, 0, false);
        ufoGfx.closePath();
        ufoGfx.strokePath();
        ufoGfx.generateTexture('player_ufo', 50, 50);
        ufoGfx.destroy();

        // ===== WAVE: Teal diamond/dart shape =====
        const waveGfx = this.make.graphics({ x: 0, y: 0, add: false });
        waveGfx.fillStyle(0x00ffcc, 1);
        waveGfx.beginPath();
        waveGfx.moveTo(48, 25);  // Right point
        waveGfx.lineTo(25, 5);   // Top
        waveGfx.lineTo(2, 25);   // Left point
        waveGfx.lineTo(25, 45);  // Bottom
        waveGfx.closePath();
        waveGfx.fillPath();
        // Inner highlight
        waveGfx.fillStyle(0x66ffdd, 1);
        waveGfx.beginPath();
        waveGfx.moveTo(38, 25);
        waveGfx.lineTo(25, 15);
        waveGfx.lineTo(12, 25);
        waveGfx.lineTo(25, 35);
        waveGfx.closePath();
        waveGfx.fillPath();
        // Border
        waveGfx.lineStyle(2, 0xffffff, 1);
        waveGfx.beginPath();
        waveGfx.moveTo(48, 25);
        waveGfx.lineTo(25, 5);
        waveGfx.lineTo(2, 25);
        waveGfx.lineTo(25, 45);
        waveGfx.closePath();
        waveGfx.strokePath();
        waveGfx.generateTexture('player_wave', 50, 50);
        waveGfx.destroy();

        // ===== SPIDER: Dark purple with legs =====
        const spiderGfx = this.make.graphics({ x: 0, y: 0, add: false });
        // Body
        spiderGfx.fillStyle(0xaa00ff, 1);
        spiderGfx.fillCircle(25, 25, 15);
        // Eyes
        spiderGfx.fillStyle(0xff0000, 1);
        spiderGfx.fillCircle(20, 20, 4);
        spiderGfx.fillCircle(30, 20, 4);
        spiderGfx.fillStyle(0xffffff, 1);
        spiderGfx.fillCircle(21, 19, 2);
        spiderGfx.fillCircle(31, 19, 2);
        // Legs
        spiderGfx.lineStyle(2, 0x8800cc, 1);
        spiderGfx.lineBetween(12, 18, 2, 5);
        spiderGfx.lineBetween(10, 25, 2, 25);
        spiderGfx.lineBetween(12, 32, 2, 45);
        spiderGfx.lineBetween(38, 18, 48, 5);
        spiderGfx.lineBetween(40, 25, 48, 25);
        spiderGfx.lineBetween(38, 32, 48, 45);
        // Border
        spiderGfx.lineStyle(2, 0xffffff, 0.7);
        spiderGfx.strokeCircle(25, 25, 15);
        spiderGfx.generateTexture('player_spider', 50, 50);
        spiderGfx.destroy();

        // ===== ROBOT: Yellow mech/box with visor =====
        const robotGfx = this.make.graphics({ x: 0, y: 0, add: false });
        // Body
        robotGfx.fillStyle(0xdddd00, 1);
        robotGfx.fillRect(8, 5, 34, 40);
        // Head top
        robotGfx.fillStyle(0xaaaa00, 1);
        robotGfx.fillRect(12, 2, 26, 8);
        // Visor
        robotGfx.fillStyle(0x44ff44, 1);
        robotGfx.fillRect(14, 12, 22, 8);
        // Visor shine
        robotGfx.fillStyle(0xaaffaa, 1);
        robotGfx.fillRect(16, 13, 8, 4);
        // Legs
        robotGfx.fillStyle(0x888800, 1);
        robotGfx.fillRect(12, 42, 10, 6);
        robotGfx.fillRect(28, 42, 10, 6);
        // Border
        robotGfx.lineStyle(2, 0xffffff, 1);
        robotGfx.strokeRect(8, 5, 34, 40);
        robotGfx.generateTexture('player_robot', 50, 50);
        robotGfx.destroy();

        // ===== Fire particle for ship engine =====
        const fireGfx = this.make.graphics({ x: 0, y: 0, add: false });
        fireGfx.fillStyle(0xff6600, 1);
        fireGfx.fillCircle(4, 4, 4);
        fireGfx.generateTexture('fire_particle', 8, 8);
        fireGfx.destroy();

        // ===== Trail particle for wave =====
        const trailGfx = this.make.graphics({ x: 0, y: 0, add: false });
        trailGfx.fillStyle(0xffffff, 1);
        trailGfx.fillCircle(3, 3, 3);
        trailGfx.generateTexture('trail_particle', 6, 6);
        trailGfx.destroy();

        // Create ground texture
        const groundGraphics = this.make.graphics({ x: 0, y: 0, add: false });
        groundGraphics.fillStyle(0x4a4a6a, 1);
        groundGraphics.fillRect(0, 0, 64, 64);
        groundGraphics.lineStyle(2, 0x6a6a8a, 1);
        groundGraphics.strokeRect(0, 0, 64, 64);
        groundGraphics.generateTexture('ground', 64, 64);
        groundGraphics.destroy();

        // Create spike texture
        const spikeGraphics = this.make.graphics({ x: 0, y: 0, add: false });
        spikeGraphics.fillStyle(0xff4444, 1);
        spikeGraphics.beginPath();
        spikeGraphics.moveTo(25, 0);
        spikeGraphics.lineTo(50, 50);
        spikeGraphics.lineTo(0, 50);
        spikeGraphics.closePath();
        spikeGraphics.fillPath();
        spikeGraphics.generateTexture('spike', 50, 50);
        spikeGraphics.destroy();

        // Create block/obstacle texture
        const blockGraphics = this.make.graphics({ x: 0, y: 0, add: false });
        blockGraphics.fillStyle(0x6a4a8a, 1);
        blockGraphics.fillRect(0, 0, 50, 50);
        blockGraphics.lineStyle(2, 0x8a6aaa, 1);
        blockGraphics.strokeRect(0, 0, 50, 50);
        blockGraphics.generateTexture('block', 50, 50);
        blockGraphics.destroy();

        // Create portal texture
        const portalGraphics = this.make.graphics({ x: 0, y: 0, add: false });
        portalGraphics.fillStyle(0xffaa00, 1);
        portalGraphics.fillRect(0, 0, 30, 80);
        portalGraphics.generateTexture('portal', 30, 80);
        portalGraphics.destroy();
    }

    create() {
        this.scene.start('AuthScene');
    }
}
