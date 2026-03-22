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

    chunk_ship_wide(x) {
        const obs = [];
        // Floor and ceiling spikes to prevent hugging walls
        for (let i = 0; i < 5; i++) {
            obs.push({ type: 'spike', x: x + 150 + i * 220, y: this.groundY - 57 });
            obs.push({ type: 'spike', x: x + 150 + i * 220, y: this.ceilingY + 57, flipY: true });
        }
        // 3 pillars with centered gap
        const pillars = [{ cx: x + 220, center: 320 }, { cx: x + 550, center: 300 }, { cx: x + 880, center: 340 }];
        const gapSize = 270;
        pillars.forEach(({ cx, center }) => {
            const top = center - gapSize / 2;
            const bot = center + gapSize / 2;
            for (let y = this.playableTop; y < top; y += 50) {
                obs.push({ type: 'spike', x: cx, y, flipY: true });
            }
            for (let y = bot; y < this.playableBottom; y += 50) {
                obs.push({ type: 'spike', x: cx, y });
            }
        });
        return { obstacles: obs, mode: 'SHIP', width: 1100 };
    }

    chunk_ship_narrow(x) {
        const obs = [];
        // Floor and ceiling spikes to prevent hugging walls
        for (let i = 0; i < 5; i++) {
            obs.push({ type: 'spike', x: x + 150 + i * 220, y: this.groundY - 57 });
            obs.push({ type: 'spike', x: x + 150 + i * 220, y: this.ceilingY + 57, flipY: true });
        }
        // 4 pillars with centered gap
        const pillars = [{ cx: x + 180, center: 300 }, { cx: x + 430, center: 380 }, { cx: x + 680, center: 280 }, { cx: x + 930, center: 360 }];
        const gapSize = 240;
        pillars.forEach(({ cx, center }) => {
            const top = center - gapSize / 2;
            const bot = center + gapSize / 2;
            for (let y = this.playableTop; y < top; y += 50) {
                obs.push({ type: 'spike', x: cx, y, flipY: true });
            }
            for (let y = bot; y < this.playableBottom; y += 50) {
                obs.push({ type: 'spike', x: cx, y });
            }
        });
        return { obstacles: obs, mode: 'SHIP', width: 1100 };
    }

    chunk_ship_zigzag(x) {
        const obs = [];
        // Floor and ceiling spikes to prevent hugging walls
        for (let i = 0; i < 5; i++) {
            obs.push({ type: 'spike', x: x + 150 + i * 220, y: this.groundY - 57 });
            obs.push({ type: 'spike', x: x + 150 + i * 220, y: this.ceilingY + 57, flipY: true });
        }
        // 4 pillars alternating high/low gap centers
        const pillars = [{ cx: x + 180, center: 260 }, { cx: x + 430, center: 420 }, { cx: x + 680, center: 240 }, { cx: x + 930, center: 400 }];
        const gapSize = 250;
        pillars.forEach(({ cx, center }) => {
            const top = center - gapSize / 2;
            const bot = center + gapSize / 2;
            for (let y = this.playableTop; y < top; y += 50) {
                obs.push({ type: 'spike', x: cx, y, flipY: true });
            }
            for (let y = bot; y < this.playableBottom; y += 50) {
                obs.push({ type: 'spike', x: cx, y });
            }
        });
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

    chunk_ufo_scattered(x) {
        const obs = [];
        // Floor and ceiling spikes every 200px to prevent sitting
        for (let i = 0; i < 6; i++) {
            obs.push({ type: 'spike', x: x + 150 + i * 220, y: this.groundY - 57 });
            obs.push({ type: 'spike', x: x + 150 + i * 220, y: this.ceilingY + 57, flipY: true });
        }
        // Mid-air obstacles to dodge
        const heights = [300, 420, 260, 380, 320];
        heights.forEach((y, i) => {
            obs.push({ type: 'spike', x: x + 260 + i * 220, y });
        });
        return { obstacles: obs, mode: 'UFO', width: 1400 };
    }

    chunk_ufo_columns(x) {
        const obs = [];
        // Floor and ceiling spikes every 200px to prevent sitting
        for (let i = 0; i < 6; i++) {
            obs.push({ type: 'spike', x: x + 150 + i * 220, y: this.groundY - 57 });
            obs.push({ type: 'spike', x: x + 150 + i * 220, y: this.ceilingY + 57, flipY: true });
        }
        // Column pairs with gap in middle
        const centers = [320, 380, 300, 360];
        centers.forEach((center, i) => {
            const cx = x + 200 + i * 320;
            const gapSize = 220;
            obs.push({ type: 'spike', x: cx, y: center - gapSize / 2 - 20, flipY: true });
            obs.push({ type: 'spike', x: cx, y: center + gapSize / 2 + 20 });
        });
        return { obstacles: obs, mode: 'UFO', width: 1400 };
    }

    // ==================== WAVE CHUNKS ====================

    chunk_wave_gentle(x) {
        const obs = [];
        // Floor and ceiling spikes to prevent sitting
        for (let i = 0; i < 6; i++) {
            obs.push({ type: 'spike', x: x + 150 + i * 220, y: this.groundY - 57 });
            obs.push({ type: 'spike', x: x + 150 + i * 220, y: this.ceilingY + 57, flipY: true });
        }
        // 5 pillars alternating gap centers for a gentle wave pattern
        const pillars = [{ cx: x + 150, center: 340 }, { cx: x + 370, center: 290 }, { cx: x + 590, center: 370 }, { cx: x + 810, center: 300 }, { cx: x + 1030, center: 350 }];
        const gapSize = 230;
        pillars.forEach(({ cx, center }) => {
            const top = center - gapSize / 2;
            const bot = center + gapSize / 2;
            for (let y = this.playableTop; y < top; y += 50) {
                obs.push({ type: 'spike', x: cx, y, flipY: true });
            }
            for (let y = bot; y < this.playableBottom; y += 50) {
                obs.push({ type: 'spike', x: cx, y });
            }
        });
        return { obstacles: obs, mode: 'WAVE', width: 1200 };
    }

    chunk_wave_tight(x) {
        const obs = [];
        // Floor and ceiling spikes to prevent sitting
        for (let i = 0; i < 6; i++) {
            obs.push({ type: 'spike', x: x + 150 + i * 220, y: this.groundY - 57 });
            obs.push({ type: 'spike', x: x + 150 + i * 220, y: this.ceilingY + 57, flipY: true });
        }
        // 5 pillars with tight gap and dramatic high/low alternation
        const pillars = [{ cx: x + 150, center: 260 }, { cx: x + 370, center: 420 }, { cx: x + 590, center: 250 }, { cx: x + 810, center: 410 }, { cx: x + 1030, center: 280 }];
        const gapSize = 210;
        pillars.forEach(({ cx, center }) => {
            const top = center - gapSize / 2;
            const bot = center + gapSize / 2;
            for (let y = this.playableTop; y < top; y += 50) {
                obs.push({ type: 'spike', x: cx, y, flipY: true });
            }
            for (let y = bot; y < this.playableBottom; y += 50) {
                obs.push({ type: 'spike', x: cx, y });
            }
        });
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
