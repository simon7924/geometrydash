// EndlessGenerator - generates an infinite sequence of pre-defined chunks
// Each chunk is a self-contained obstacle pattern ~800-1200px wide
// 20 chunk types covering all game modes

export class EndlessGenerator {
    constructor() {
        this.groundY = 650;
        this.ceilingY = 70;
        this.playableTop = 120;
        this.playableBottom = 600;
    }

    // Returns a level-like object for use with GameScene
    // The level has a very large levelLength; EndlessScene extends it dynamically
    buildEndlessLevel() {
        return {
            id: 'endless',
            name: 'ENDLESS',
            difficulty: 0,
            stars: 0,
            levelLength: 99999999,
            gameSpeed: 380,
            obstacles: [],   // Filled dynamically
            portals: [],
            backgroundColor: 0x0a0a1e,
            groundColor: 0x2a2a4e,
            spikeColor: 0x00ffff,
            isEndless: true
        };
    }

    // Returns the 20 chunk definitions. Each chunk is a function that
    // takes (startX) and returns { obstacles[], portals[], width, mode }
    // mode = the gamemode active during this chunk (for portal injection)
    getChunks() {
        return [
            // --- CUBE chunks (0-6) ---
            (x) => this.chunk_cube_easy(x),
            (x) => this.chunk_cube_medium(x),
            (x) => this.chunk_cube_hard(x),
            (x) => this.chunk_cube_blocks(x),
            (x) => this.chunk_cube_mixed(x),
            (x) => this.chunk_cube_triple(x),
            (x) => this.chunk_cube_platform(x),
            // --- SHIP chunks (7-9) ---
            (x) => this.chunk_ship_wide(x),
            (x) => this.chunk_ship_narrow(x),
            (x) => this.chunk_ship_zigzag(x),
            // --- BALL chunks (10-11) ---
            (x) => this.chunk_ball_alternating(x),
            (x) => this.chunk_ball_doubles(x),
            // --- UFO chunks (12-13) ---
            (x) => this.chunk_ufo_scattered(x),
            (x) => this.chunk_ufo_columns(x),
            // --- WAVE chunks (14-15) ---
            (x) => this.chunk_wave_gentle(x),
            (x) => this.chunk_wave_tight(x),
            // --- SPIDER chunks (16-17) ---
            (x) => this.chunk_spider_slow(x),
            (x) => this.chunk_spider_fast(x),
            // --- ROBOT chunks (18-19) ---
            (x) => this.chunk_robot_low(x),
            (x) => this.chunk_robot_high(x),
        ];
    }

    // Pick a random sequence of chunk indices, biased toward cube early on
    // Returns array of chunk indices
    getChunkSequence(count, rng) {
        const result = [];
        for (let i = 0; i < count; i++) {
            // Every 4th chunk force a mode change for variety
            if (i % 4 === 3) {
                // Pick from non-cube modes
                result.push(7 + Math.floor(rng() * 13));
            } else {
                result.push(Math.floor(rng() * 20));
            }
        }
        return result;
    }

    // Generate N chunks starting at startX, return { obstacles, portals, totalWidth }
    generateChunks(startX, chunkIndices) {
        const chunks = this.getChunks();
        const obstacles = [];
        const portals = [];
        let currentX = startX;
        let prevMode = 'CUBE';

        chunkIndices.forEach(idx => {
            const chunk = chunks[idx](currentX);

            // Insert mode portal if mode changes
            if (chunk.mode !== prevMode) {
                portals.push({ type: 'gamemode', mode: chunk.mode, x: currentX + 50, y: 500 });
                currentX += 150; // clearance after portal
                // Regenerate chunk at new startX
                const shifted = chunks[idx](currentX);
                obstacles.push(...shifted.obstacles);
                currentX += shifted.width + 300;
            } else {
                obstacles.push(...chunk.obstacles);
                currentX += chunk.width + 300;
            }

            prevMode = chunk.mode;
        });

        // Return to CUBE at the end of a batch
        if (prevMode !== 'CUBE') {
            portals.push({ type: 'gamemode', mode: 'CUBE', x: currentX, y: 500 });
        }

        return { obstacles, portals, endX: currentX };
    }

    // ==================== CUBE CHUNKS ====================

    chunk_cube_easy(x) {
        const obs = [];
        obs.push({ type: 'spike', x: x + 300, y: this.groundY - 57 });
        obs.push({ type: 'spike', x: x + 700, y: this.groundY - 57 });
        return { obstacles: obs, mode: 'CUBE', width: 1000 };
    }

    chunk_cube_medium(x) {
        const obs = [];
        obs.push({ type: 'spike', x: x + 200, y: this.groundY - 57 });
        obs.push({ type: 'spike', x: x + 500, y: this.groundY - 57 });
        obs.push({ type: 'spike', x: x + 800, y: this.groundY - 57 });
        return { obstacles: obs, mode: 'CUBE', width: 1000 };
    }

    chunk_cube_hard(x) {
        const obs = [];
        obs.push({ type: 'spike', x: x + 200, y: this.groundY - 57 });
        obs.push({ type: 'spike', x: x + 250, y: this.groundY - 57 });
        obs.push({ type: 'spike', x: x + 550, y: this.groundY - 57 });
        obs.push({ type: 'spike', x: x + 800, y: this.groundY - 57 });
        return { obstacles: obs, mode: 'CUBE', width: 1000 };
    }

    chunk_cube_blocks(x) {
        const obs = [];
        obs.push({ type: 'block', x: x + 250, y: this.groundY - 75 });
        obs.push({ type: 'spike', x: x + 550, y: this.groundY - 57 });
        obs.push({ type: 'block', x: x + 800, y: this.groundY - 75 });
        return { obstacles: obs, mode: 'CUBE', width: 1050 };
    }

    chunk_cube_mixed(x) {
        const obs = [];
        obs.push({ type: 'spike', x: x + 200, y: this.groundY - 57 });
        obs.push({ type: 'block', x: x + 500, y: this.groundY - 75 });
        obs.push({ type: 'spike', x: x + 800, y: this.groundY - 57 });
        return { obstacles: obs, mode: 'CUBE', width: 1000 };
    }

    chunk_cube_triple(x) {
        const obs = [];
        obs.push({ type: 'spike', x: x + 200, y: this.groundY - 57 });
        obs.push({ type: 'spike', x: x + 250, y: this.groundY - 57 });
        obs.push({ type: 'spike', x: x + 600, y: this.groundY - 57 });
        return { obstacles: obs, mode: 'CUBE', width: 900 };
    }

    chunk_cube_platform(x) {
        const obs = [];
        obs.push({ type: 'block', x: x + 200, y: this.groundY - 75 });
        obs.push({ type: 'block', x: x + 250, y: this.groundY - 75 });
        obs.push({ type: 'spike', x: x + 600, y: this.groundY - 57 });
        obs.push({ type: 'spike', x: x + 850, y: this.groundY - 57 });
        return { obstacles: obs, mode: 'CUBE', width: 1050 };
    }

    // ==================== SHIP CHUNKS ====================
    // Helpers for building block pillars with spike tips

    // Block column from ceiling down to 'endY', spike at bottom tip
    _shipCeilingPillar(obs, cx, endY) {
        for (let y = this.ceilingY + 25; y <= endY; y += 50) {
            obs.push({ type: 'block', x: cx, y });
        }
        obs.push({ type: 'spike', x: cx, y: endY + 50 });
    }

    // Block column from floor up to 'endY', spike at top tip (pointing up = default)
    _shipFloorPillar(obs, cx, endY) {
        for (let y = this.groundY - 25; y >= endY; y -= 50) {
            obs.push({ type: 'block', x: cx, y });
        }
        obs.push({ type: 'spike', x: cx, y: endY - 50 });
    }

    // Floating block platform: 2-wide block with spikes on top and bottom
    _shipFloatingPlatform(obs, cx, cy) {
        obs.push({ type: 'block', x: cx,      y: cy });
        obs.push({ type: 'block', x: cx + 50, y: cy });
        obs.push({ type: 'spike', x: cx,      y: cy - 50 });       // top spikes
        obs.push({ type: 'spike', x: cx + 50, y: cy - 50 });
        obs.push({ type: 'spike', x: cx,      y: cy + 50, flipY: true }); // bottom spikes
        obs.push({ type: 'spike', x: cx + 50, y: cy + 50, flipY: true });
    }

    chunk_ship_wide(x) {
        const obs = [];
        // Pillar 1: floor pillar with wide gap center at 320
        // Gap: 185-455 → floor pillar up to 455, ceiling pillar down to 185
        this._shipCeilingPillar(obs, x + 220, 185);
        this._shipFloorPillar(obs, x + 220, 455);
        // Pillar 2: floor pillar, gap center 300 → floor to 435, ceiling to 165
        this._shipCeilingPillar(obs, x + 550, 165);
        this._shipFloorPillar(obs, x + 550, 435);
        // Pillar 3: gap center 340 → floor to 475, ceiling to 205
        this._shipCeilingPillar(obs, x + 880, 205);
        this._shipFloorPillar(obs, x + 880, 475);
        // Floating platforms mid-section between pillars
        this._shipFloatingPlatform(obs, x + 370, 310);
        this._shipFloatingPlatform(obs, x + 700, 290);
        return { obstacles: obs, mode: 'SHIP', width: 1100 };
    }

    chunk_ship_narrow(x) {
        const obs = [];
        // 4 closer pillars, tighter gap (240px), alternating gap centers
        // [300, 380, 280, 360]
        const defs = [
            { cx: x + 180, center: 300 },
            { cx: x + 430, center: 380 },
            { cx: x + 680, center: 280 },
            { cx: x + 930, center: 360 },
        ];
        const half = 120; // half of 240 gap
        defs.forEach(({ cx, center }) => {
            this._shipCeilingPillar(obs, cx, center - half - 50);
            this._shipFloorPillar(obs, cx, center + half + 50);
        });
        // Small floating single-block hazards in the gaps
        obs.push({ type: 'block', x: x + 300, y: 330 });
        obs.push({ type: 'spike', x: x + 300, y: 280 });
        obs.push({ type: 'spike', x: x + 300, y: 380, flipY: true });
        obs.push({ type: 'block', x: x + 800, y: 310 });
        obs.push({ type: 'spike', x: x + 800, y: 260 });
        obs.push({ type: 'spike', x: x + 800, y: 360, flipY: true });
        return { obstacles: obs, mode: 'SHIP', width: 1100 };
    }

    chunk_ship_zigzag(x) {
        const obs = [];
        // 4 pillars alternating high/low, forcing the player to zigzag
        const defs = [
            { cx: x + 180, center: 240 },
            { cx: x + 430, center: 430 },
            { cx: x + 680, center: 220 },
            { cx: x + 930, center: 410 },
        ];
        const half = 125; // half of 250 gap
        defs.forEach(({ cx, center }) => {
            this._shipCeilingPillar(obs, cx, center - half - 50);
            this._shipFloorPillar(obs, cx, center + half + 50);
        });
        // Floating hazard blocks in the wide open areas to break them up
        // Between pillar 1 (top gap) and pillar 2 (bottom gap): place obstacle mid-height
        obs.push({ type: 'block', x: x + 300, y: 420 });
        obs.push({ type: 'spike', x: x + 300, y: 370 });
        // Between pillar 3 (top gap) and pillar 4 (bottom gap)
        obs.push({ type: 'block', x: x + 800, y: 400 });
        obs.push({ type: 'spike', x: x + 800, y: 350 });
        return { obstacles: obs, mode: 'SHIP', width: 1100 };
    }

    // ==================== BALL CHUNKS ====================

    chunk_ball_alternating(x) {
        const obs = [];
        let onGround = true;
        for (let i = 0; i < 3; i++) {
            const cx = x + 300 + i * 450;
            if (onGround) {
                obs.push({ type: 'spike', x: cx, y: this.groundY - 57 });
            } else {
                obs.push({ type: 'spike', x: cx, y: this.ceilingY + 57, flipY: true });
            }
            onGround = !onGround;
        }
        return { obstacles: obs, mode: 'BALL', width: 1500 };
    }

    chunk_ball_doubles(x) {
        const obs = [];
        let onGround = true;
        for (let i = 0; i < 3; i++) {
            const cx = x + 250 + i * 450;
            if (onGround) {
                obs.push({ type: 'spike', x: cx, y: this.groundY - 57 });
                obs.push({ type: 'spike', x: cx + 50, y: this.groundY - 57 });
            } else {
                obs.push({ type: 'spike', x: cx, y: this.ceilingY + 57, flipY: true });
                obs.push({ type: 'spike', x: cx + 50, y: this.ceilingY + 57, flipY: true });
            }
            onGround = !onGround;
        }
        return { obstacles: obs, mode: 'BALL', width: 1500 };
    }

    // ==================== UFO CHUNKS ====================

    // Floating block island: blocks stacked 2 tall, spikes on top and below
    _ufoIsland(obs, cx, cy, width = 2) {
        for (let i = 0; i < width; i++) {
            obs.push({ type: 'block', x: cx + i * 50, y: cy });
            obs.push({ type: 'block', x: cx + i * 50, y: cy + 50 });
            obs.push({ type: 'spike', x: cx + i * 50, y: cy - 50 });           // spike on top
            obs.push({ type: 'spike', x: cx + i * 50, y: cy + 100, flipY: true }); // spike below
        }
    }

    chunk_ufo_scattered(x) {
        const obs = [];
        // Floor block wall with spike top, ceiling block wall with spike bottom — forces player off edges
        // Floor ridge at left
        for (let bx = x + 150; bx <= x + 250; bx += 50) {
            obs.push({ type: 'block', x: bx, y: this.groundY - 25 });
            obs.push({ type: 'spike', x: bx, y: this.groundY - 75 });
        }
        // Ceiling ridge at right
        for (let bx = x + 1100; bx <= x + 1200; bx += 50) {
            obs.push({ type: 'block', x: bx, y: this.ceilingY + 25 });
            obs.push({ type: 'spike', x: bx, y: this.ceilingY + 75, flipY: true });
        }
        // Floating islands at varying heights — player must tap-boost between them
        this._ufoIsland(obs, x + 380, 270, 2);   // high island
        this._ufoIsland(obs, x + 620, 390, 2);   // low island
        this._ufoIsland(obs, x + 860, 250, 2);   // high island
        // Single spike hazards in open space between islands
        obs.push({ type: 'spike', x: x + 500, y: 430 });
        obs.push({ type: 'spike', x: x + 740, y: 290 });
        obs.push({ type: 'spike', x: x + 980, y: 370 });
        return { obstacles: obs, mode: 'UFO', width: 1400 };
    }

    chunk_ufo_columns(x) {
        const obs = [];
        // 4 column obstacles: block stack from floor with spike top, paired with ceiling stack below
        // Player must navigate through the gap in the middle
        const defs = [
            { cx: x + 200, gapCenter: 320 },
            { cx: x + 500, gapCenter: 390 },
            { cx: x + 800, gapCenter: 300 },
            { cx: x + 1100, gapCenter: 370 },
        ];
        const half = 110; // half gap = 220 total
        defs.forEach(({ cx, gapCenter }) => {
            // Ceiling column: blocks from ceiling down to gap top, spike pointing down at tip
            for (let y = this.ceilingY + 25; y <= gapCenter - half - 50; y += 50) {
                obs.push({ type: 'block', x: cx, y });
            }
            obs.push({ type: 'spike', x: cx, y: gapCenter - half });
            // Floor column: blocks from floor up to gap bottom, spike pointing up at tip
            for (let y = this.groundY - 25; y >= gapCenter + half + 50; y -= 50) {
                obs.push({ type: 'block', x: cx, y });
            }
            obs.push({ type: 'spike', x: cx, y: gapCenter + half });
        });
        // Floating single block in each wide gap to add extra obstacle
        obs.push({ type: 'block', x: x + 340, y: 355 });
        obs.push({ type: 'spike', x: x + 340, y: 305 });
        obs.push({ type: 'block', x: x + 640, y: 340 });
        obs.push({ type: 'spike', x: x + 640, y: 290 });
        return { obstacles: obs, mode: 'UFO', width: 1400 };
    }

    // ==================== WAVE CHUNKS ====================
    // Wave pillars: blocks form the solid body, spike at the opening tip

    // Build a full-height wave pillar: ceiling block column + floor block column with gap opening
    // Ceiling column has spike at bottom tip, floor column has spike at top tip
    _wavePillar(obs, cx, gapCenter, gapSize) {
        const half = gapSize / 2;
        const topEnd = gapCenter - half;
        const botStart = gapCenter + half;
        // Ceiling blocks
        for (let y = this.ceilingY + 25; y <= topEnd - 50; y += 50) {
            obs.push({ type: 'block', x: cx, y });
        }
        obs.push({ type: 'spike', x: cx, y: topEnd });          // spike tip pointing down into gap
        // Floor blocks
        for (let y = this.groundY - 25; y >= botStart + 50; y -= 50) {
            obs.push({ type: 'block', x: cx, y });
        }
        obs.push({ type: 'spike', x: cx, y: botStart, flipY: true }); // spike tip pointing up into gap
    }

    chunk_wave_gentle(x) {
        const obs = [];
        // 5 pillars with gentle alternating gaps — wave path is subtle
        const pillars = [
            { cx: x + 150,  center: 340 },
            { cx: x + 370,  center: 285 },
            { cx: x + 590,  center: 370 },
            { cx: x + 810,  center: 295 },
            { cx: x + 1030, center: 355 },
        ];
        pillars.forEach(({ cx, center }) => this._wavePillar(obs, cx, center, 220));
        // Small floating block between pillars 2 and 3, above the wave path — visual interest
        obs.push({ type: 'block', x: x + 480, y: 200 });
        obs.push({ type: 'spike', x: x + 480, y: 250, flipY: true });
        obs.push({ type: 'block', x: x + 700, y: 470 });
        obs.push({ type: 'spike', x: x + 700, y: 420 });
        return { obstacles: obs, mode: 'WAVE', width: 1200 };
    }

    chunk_wave_tight(x) {
        const obs = [];
        // 5 pillars with dramatic high/low zigzag — tight gap forces precision
        const pillars = [
            { cx: x + 150,  center: 250 },
            { cx: x + 370,  center: 430 },
            { cx: x + 590,  center: 240 },
            { cx: x + 810,  center: 420 },
            { cx: x + 1030, center: 270 },
        ];
        pillars.forEach(({ cx, center }) => this._wavePillar(obs, cx, center, 200));
        // No floating extras — tight enough already
        return { obstacles: obs, mode: 'WAVE', width: 1200 };
    }

    // ==================== SPIDER CHUNKS ====================

    chunk_spider_slow(x) {
        const obs = [];
        let onGround = true;
        for (let i = 0; i < 3; i++) {
            const cx = x + 300 + i * 450;
            if (onGround) {
                obs.push({ type: 'spike', x: cx, y: this.groundY - 57 });
            } else {
                obs.push({ type: 'spike', x: cx, y: this.ceilingY + 57, flipY: true });
            }
            onGround = !onGround;
        }
        return { obstacles: obs, mode: 'SPIDER', width: 1400 };
    }

    chunk_spider_fast(x) {
        const obs = [];
        let onGround = true;
        for (let i = 0; i < 3; i++) {
            const cx = x + 250 + i * 420;
            if (onGround) {
                obs.push({ type: 'spike', x: cx, y: this.groundY - 57 });
                obs.push({ type: 'spike', x: cx + 50, y: this.groundY - 57 });
            } else {
                obs.push({ type: 'spike', x: cx, y: this.ceilingY + 57, flipY: true });
                obs.push({ type: 'spike', x: cx + 50, y: this.ceilingY + 57, flipY: true });
            }
            onGround = !onGround;
        }
        return { obstacles: obs, mode: 'SPIDER', width: 1400 };
    }

    // ==================== ROBOT CHUNKS ====================

    chunk_robot_low(x) {
        const obs = [];
        obs.push({ type: 'spike', x: x + 250, y: this.groundY - 57 });
        obs.push({ type: 'block', x: x + 550, y: this.groundY - 75 });
        obs.push({ type: 'spike', x: x + 850, y: this.groundY - 57 });
        return { obstacles: obs, mode: 'ROBOT', width: 1100 };
    }

    chunk_robot_high(x) {
        const obs = [];
        obs.push({ type: 'block', x: x + 250, y: this.groundY - 75 });
        obs.push({ type: 'block', x: x + 250, y: this.groundY - 125 });
        obs.push({ type: 'spike', x: x + 600, y: this.groundY - 57 });
        obs.push({ type: 'block', x: x + 900, y: this.groundY - 75 });
        return { obstacles: obs, mode: 'ROBOT', width: 1100 };
    }
}
