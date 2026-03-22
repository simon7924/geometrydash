// Level Generator - Creates balanced, playable levels with mode-specific sections
export class LevelGenerator {
    constructor() {
        this.groundY = 650;
        this.ceilingY = 70;
        this.playableTop = 120;    // Safe top boundary
        this.playableBottom = 600; // Safe bottom boundary
    }

    generateLevel(difficulty, seed) {
        const random = this.seededRandom(seed);
        const config = this.getDifficultyConfig(difficulty);
        config.difficulty = difficulty;
        const obstacles = [];
        const portals = [];

        // Build sections: divide level by portal positions
        // Each section has a game mode and X range
        const sections = this.buildSections(config);

        // Generate portals
        sections.forEach(section => {
            if (section.portalX !== null) {
                portals.push({
                    type: 'gamemode',
                    mode: section.mode,
                    x: section.portalX,
                    y: 500
                });
            }
        });

        // Add return-to-CUBE portal before end (if there were any mode portals)
        if (config.gameModePortals && config.gameModePortals.length > 0) {
            const cubeReturnX = config.levelLength - 300;
            portals.push({
                type: 'gamemode',
                mode: 'CUBE',
                x: cubeReturnX,
                y: 500
            });
            // No final CUBE section needed — end portal is right after the return portal
        }

        // Generate obstacles for each section (skip invalid sections)
        sections.forEach(section => {
            if (section.startX >= section.endX) return;
            const sectionObstacles = this.generateSection(section, config, random);
            obstacles.push(...sectionObstacles);
        });

        // Spike in the gap at the BALL portal in Lava Fortress (level 5)
        // The UFO-to-BALL transition has a floor gap that needs covering
        if (difficulty === 5) {
            const ballPortal = portals.find(p => p.mode === 'BALL');
            if (ballPortal) {
                obstacles.push({ type: 'spike', x: ballPortal.x - 60, y: this.groundY - 57 });
            }
        }

        return {
            id: `level_${difficulty}_${seed}`,
            name: config.name,
            difficulty: difficulty,
            stars: config.stars,
            levelLength: config.levelLength,
            gameSpeed: config.gameSpeed,
            obstacles: obstacles,
            portals: portals,
            backgroundColor: config.backgroundColor,
            groundColor: config.groundColor,
            spikeColor: config.spikeColor
        };
    }

    buildSections(config) {
        const sections = [];
        const modePortals = config.gameModePortals || [];

        if (modePortals.length === 0) {
            // Entire level is CUBE mode
            sections.push({
                mode: 'CUBE',
                startX: 800,
                endX: config.levelLength - 600,
                portalX: null
            });
            return sections;
        }

        // Calculate portal positions (evenly spaced)
        const portalSpacing = config.levelLength / (modePortals.length + 1);
        const portalPositions = modePortals.map((mode, i) => ({
            mode,
            x: portalSpacing * (i + 1)
        }));

        // First section is always CUBE (before first portal)
        sections.push({
            mode: 'CUBE',
            startX: 800,
            endX: portalPositions[0].x - 200,
            portalX: null
        });

        // Middle sections: each portal starts a new mode section
        const cubeReturnX = config.levelLength - 300;
        portalPositions.forEach((portal, i) => {
            const nextEnd = (i < portalPositions.length - 1)
                ? portalPositions[i + 1].x - 200
                : cubeReturnX - 200; // Last section extends to just before the CUBE return portal

            sections.push({
                mode: portal.mode,
                startX: portal.x + 200,
                endX: nextEnd,
                portalX: portal.x
            });
        });

        return sections;
    }

    generateSection(section, config, random) {
        const portalClearance = 200;

        switch (section.mode) {
            case 'CUBE':
                return this.generateCubeSection(section, config, random);
            case 'SHIP':
                return this.generateShipSection(section, config, random);
            case 'BALL':
                return this.generateBallSection(section, config, random);
            case 'UFO':
                return this.generateUFOSection(section, config, random);
            case 'WAVE':
                return this.generateWaveSection(section, config, random);
            case 'SPIDER':
                return this.generateSpiderSection(section, config, random);
            case 'ROBOT':
                return this.generateRobotSection(section, config, random);
            default:
                return this.generateCubeSection(section, config, random);
        }
    }

    // ==================== CUBE SECTION ====================
    // Ground spikes and blocks - jump to avoid
    generateCubeSection(section, config, random) {
        const obstacles = [];
        const jumpDistance = config.gameSpeed * 0.5;
        const minGap = Math.max(200, jumpDistance * 0.8);
        let currentX = section.startX;

        while (currentX < section.endX) {
            const pattern = this.selectCubePattern(config, random);
            const patternObs = this.generateCubePattern(pattern, currentX, config, random);
            obstacles.push(...patternObs);

            const patternWidth = this.getPatternWidth(patternObs);
            const gap = minGap + random() * config.gapVariance;
            currentX += patternWidth + gap;
        }

        return obstacles;
    }

    selectCubePattern(config, random) {
        const patterns = ['single_spike'];
        if (config.useDoubleSpikes) patterns.push('double_spike');
        if (config.useTripleSpikes) patterns.push('triple_spike');
        if (config.useBlocks) {
            patterns.push('block_jump');
            patterns.push('spike_block_combo');
        }
        if (config.platformChance > 0 && random() < config.platformChance) {
            patterns.push('platform_section');
        }
        return patterns[Math.floor(random() * patterns.length)];
    }

    generateCubePattern(pattern, startX, config, random) {
        const obstacles = [];
        switch (pattern) {
            case 'single_spike':
                obstacles.push({ type: 'spike', x: startX, y: this.groundY - 57 });
                break;
            case 'double_spike':
                obstacles.push({ type: 'spike', x: startX, y: this.groundY - 57 });
                obstacles.push({ type: 'spike', x: startX + 50, y: this.groundY - 57 });
                break;
            case 'triple_spike':
                for (let i = 0; i < 3; i++) {
                    obstacles.push({ type: 'spike', x: startX + i * 45, y: this.groundY - 57 });
                }
                break;
            case 'block_jump':
                obstacles.push({ type: 'block', x: startX, y: this.groundY - 75 });
                break;
            case 'spike_block_combo':
                obstacles.push({ type: 'spike', x: startX, y: this.groundY - 57 });
                const blockGap = 250 + random() * 50;
                obstacles.push({ type: 'block', x: startX + blockGap, y: this.groundY - 75 });
                break;
            case 'platform_section':
                obstacles.push({ type: 'block', x: startX, y: this.groundY - 75 });
                obstacles.push({ type: 'block', x: startX + 50, y: this.groundY - 75 });
                obstacles.push({ type: 'spike', x: startX + 250, y: this.groundY - 57 });
                break;
        }
        return obstacles;
    }

    // ==================== SHIP SECTION ====================
    // Block pillar corridors — purple block body with spike tips at the gap opening.
    // Floating block platforms between pillars add visual variety.
    generateShipSection(section, config, random) {
        const obstacles = [];
        const sectionLen = section.endX - section.startX;
        const numColumns = Math.max(3, Math.floor(sectionLen / 300));
        const colSpacing = sectionLen / (numColumns + 1);
        const gapCenters = [280, 400, 260, 420, 300, 380];
        const gapSize = config.difficulty >= 5 ? 200 : 230;

        for (let i = 0; i < numColumns; i++) {
            const cx = section.startX + colSpacing * (i + 1);
            const gapCenter = gapCenters[i % gapCenters.length];
            const topEnd = gapCenter - gapSize / 2;
            const botStart = gapCenter + gapSize / 2;

            // Ceiling block pillar — blocks from ceiling down, spike tip points DOWN into gap
            for (let y = this.ceilingY + 25; y <= topEnd - 50; y += 50) {
                obstacles.push({ type: 'block', x: cx, y });
            }
            obstacles.push({ type: 'spike', x: cx, y: topEnd, flipY: true });

            // Floor block pillar — blocks from floor up, spike tip points UP into gap
            for (let y = this.groundY - 25; y >= botStart + 50; y -= 50) {
                obstacles.push({ type: 'block', x: cx, y });
            }
            obstacles.push({ type: 'spike', x: cx, y: botStart });

            // Floating 2-block platform with spikes top+bottom between alternating pillars
            if (i % 2 === 0 && i + 1 < numColumns) {
                const midX = cx + colSpacing / 2;
                const midY = (gapCenter + gapCenters[(i + 1) % gapCenters.length]) / 2;
                obstacles.push({ type: 'block', x: midX,      y: midY });
                obstacles.push({ type: 'block', x: midX + 50, y: midY });
                obstacles.push({ type: 'spike', x: midX,      y: midY - 50 });
                obstacles.push({ type: 'spike', x: midX + 50, y: midY - 50 });
                obstacles.push({ type: 'spike', x: midX,      y: midY + 50, flipY: true });
                obstacles.push({ type: 'spike', x: midX + 50, y: midY + 50, flipY: true });
            }
        }

        return obstacles;
    }

    // ==================== BALL SECTION ====================
    // Alternating ground and ceiling spikes - tap to flip gravity
    // Ball rolls on ground or ceiling; tap flips which surface it's on
    generateBallSection(section, config, random) {
        const obstacles = [];
        // Extra space at start so player has time to adjust to ball mode
        let currentX = section.startX + 300;
        const spacing = 300 + random() * 60;
        // First obstacle is on ceiling — player starts on ground and is safe
        let onGround = false;

        while (currentX < section.endX) {
            if (onGround) {
                // Spike on ground - player needs to flip to ceiling
                obstacles.push({
                    type: 'spike',
                    x: currentX,
                    y: this.groundY - 57
                });
                // Sometimes add a double ground spike
                if (random() > 0.6) {
                    obstacles.push({
                        type: 'spike',
                        x: currentX + 50,
                        y: this.groundY - 57
                    });
                }
            } else {
                // Spike on ceiling - player needs to flip back to ground
                obstacles.push({
                    type: 'spike',
                    x: currentX,
                    y: this.ceilingY + 57,
                    flipY: true
                });
                if (random() > 0.6) {
                    obstacles.push({
                        type: 'spike',
                        x: currentX + 50,
                        y: this.ceilingY + 57,
                        flipY: true
                    });
                }
            }

            onGround = !onGround;
            currentX += spacing + random() * 80;
        }

        return obstacles;
    }

    // ==================== UFO SECTION ====================
    // Block pillar columns from floor+ceiling with gap in middle, plus floating block islands.
    // UFO taps to boost upward — player must navigate through gap and dodge islands.
    generateUFOSection(section, config, random) {
        const obstacles = [];
        const sectionLen = section.endX - section.startX;
        const numColumns = Math.max(3, Math.floor(sectionLen / 280));
        const colSpacing = sectionLen / (numColumns + 1);
        const gapCenters = [300, 420, 260, 400, 280, 380];
        const gapSize = config.difficulty >= 5 ? 190 : 210;

        for (let i = 0; i < numColumns; i++) {
            const cx = section.startX + colSpacing * (i + 1);
            const gapCenter = gapCenters[i % gapCenters.length];
            const topEnd = gapCenter - gapSize / 2;
            const botStart = gapCenter + gapSize / 2;

            // Ceiling block pillar — spike tip points DOWN into gap
            for (let y = this.ceilingY + 25; y <= topEnd - 50; y += 50) {
                obstacles.push({ type: 'block', x: cx, y });
            }
            obstacles.push({ type: 'spike', x: cx, y: topEnd, flipY: true });

            // Floor block pillar — spike tip points UP into gap
            for (let y = this.groundY - 25; y >= botStart + 50; y -= 50) {
                obstacles.push({ type: 'block', x: cx, y });
            }
            obstacles.push({ type: 'spike', x: cx, y: botStart });

            // Floating single-block island with spike on top, positioned in the gap midpoint
            if (i % 2 === 1) {
                const islandY = gapCenter - 20;
                obstacles.push({ type: 'block', x: cx - 25, y: islandY });
                obstacles.push({ type: 'spike', x: cx - 25, y: islandY - 50 });
                obstacles.push({ type: 'spike', x: cx - 25, y: islandY + 50, flipY: true });
            }
        }

        return obstacles;
    }

    // ==================== WAVE SECTION ====================
    // Block pillar walls with a gap — wave flies through diagonally.
    // Blocks form the solid pillar body, spikes tip into the gap opening.
    generateWaveSection(section, config, random) {
        const obstacles = [];
        let currentX = section.startX;
        const baseSpacing = 210 + random() * 30;
        let gapY = 350;

        while (currentX < section.endX) {
            const gapShift = (random() - 0.5) * 180;
            gapY = Math.max(this.playableTop + 110, Math.min(this.playableBottom - 110, gapY + gapShift));
            const gapSize = config.difficulty >= 5 ? 160 : 185;

            const topEnd = gapY - gapSize / 2;
            const botStart = gapY + gapSize / 2;

            // Ceiling block pillar — spike tip points DOWN into gap
            for (let y = this.ceilingY + 25; y <= topEnd - 50; y += 50) {
                obstacles.push({ type: 'block', x: currentX, y });
            }
            obstacles.push({ type: 'spike', x: currentX, y: topEnd, flipY: true });

            // Floor block pillar — spike tip points UP into gap
            for (let y = this.groundY - 25; y >= botStart + 50; y -= 50) {
                obstacles.push({ type: 'block', x: currentX, y });
            }
            obstacles.push({ type: 'spike', x: currentX, y: botStart });

            currentX += baseSpacing + random() * 50;
        }

        return obstacles;
    }

    // ==================== SPIDER SECTION ====================
    // Spider teleports instantly between ground and ceiling
    // Alternate spikes on ground and ceiling so player must teleport
    generateSpiderSection(section, config, random) {
        const obstacles = [];
        let currentX = section.startX;
        const spacing = 300 + random() * 80;
        let spikeOnGround = true;

        while (currentX < section.endX) {
            if (spikeOnGround) {
                // Spikes on ground — player must be on ceiling
                const count = 1 + Math.floor(random() * 2);
                for (let i = 0; i < count; i++) {
                    obstacles.push({
                        type: 'spike',
                        x: currentX + i * 50,
                        y: this.groundY - 57
                    });
                }
            } else {
                // Spikes on ceiling — player must be on ground
                const count = 1 + Math.floor(random() * 2);
                for (let i = 0; i < count; i++) {
                    obstacles.push({
                        type: 'spike',
                        x: currentX + i * 50,
                        y: this.ceilingY + 57,
                        flipY: true
                    });
                }
            }

            spikeOnGround = !spikeOnGround;
            currentX += spacing + random() * 60;
        }

        return obstacles;
    }

    // ==================== ROBOT SECTION ====================
    // Robot has variable jump height (tap = short, hold = tall)
    // Mix of low and high obstacles requiring different jump heights
    generateRobotSection(section, config, random) {
        const obstacles = [];
        let currentX = section.startX;
        const jumpDistance = config.gameSpeed * 0.5;
        const minGap = Math.max(220, jumpDistance * 0.8);

        while (currentX < section.endX) {
            const patternRoll = random();

            if (patternRoll < 0.3) {
                // Low spike — short tap jump
                obstacles.push({ type: 'spike', x: currentX, y: this.groundY - 57 });
            } else if (patternRoll < 0.55) {
                // Tall block — needs full hold jump
                obstacles.push({ type: 'block', x: currentX, y: this.groundY - 75 });
                obstacles.push({ type: 'block', x: currentX, y: this.groundY - 125 });
            } else if (patternRoll < 0.75) {
                // Low block then high spike — tap over block, hold over spike
                obstacles.push({ type: 'block', x: currentX, y: this.groundY - 75 });
                const gap = 250 + random() * 50;
                obstacles.push({ type: 'spike', x: currentX + gap, y: this.groundY - 57 });
                obstacles.push({ type: 'block', x: currentX + gap - 25, y: this.groundY - 120 });
            } else {
                // Stacked blocks (wall) with spike on top — needs precise hold jump
                obstacles.push({ type: 'block', x: currentX, y: this.groundY - 75 });
                obstacles.push({ type: 'spike', x: currentX, y: this.groundY - 132 });
            }

            const gap = minGap + random() * config.gapVariance;
            currentX += gap;
        }

        return obstacles;
    }

    getDifficultyConfig(difficulty) {
        const configs = {
            1: {
                name: "Starter Plains",
                stars: 1,
                levelLength: 3000,
                gameSpeed: 350,
                gapVariance: 120,
                maxConsecutiveSpikes: 1,
                useBlocks: false,
                useDoubleSpikes: false,
                useTripleSpikes: false,
                platformChance: 0,
                gameModePortals: [],
                backgroundColor: 0x1a2a1a,
                groundColor: 0x3a5a3a,
                spikeColor: 0xff6666
            },
            2: {
                name: "Green Hills",
                stars: 1,
                levelLength: 3500,
                gameSpeed: 380,
                gapVariance: 100,
                maxConsecutiveSpikes: 2,
                useBlocks: false,
                useDoubleSpikes: true,
                useTripleSpikes: false,
                platformChance: 0,
                gameModePortals: [],
                backgroundColor: 0x1a2a2a,
                groundColor: 0x3a5a5a,
                spikeColor: 0xff7777
            },
            3: {
                name: "Crystal Caves",
                stars: 2,
                levelLength: 4000,
                gameSpeed: 400,
                gapVariance: 90,
                maxConsecutiveSpikes: 2,
                useBlocks: true,
                useDoubleSpikes: true,
                useTripleSpikes: false,
                platformChance: 0.15,
                gameModePortals: ['SHIP'],
                backgroundColor: 0x1a1a2e,
                groundColor: 0x4a4a6a,
                spikeColor: 0xff4444
            },
            4: {
                name: "Neon City",
                stars: 2,
                levelLength: 4500,
                gameSpeed: 420,
                gapVariance: 80,
                maxConsecutiveSpikes: 2,
                useBlocks: true,
                useDoubleSpikes: true,
                useTripleSpikes: false,
                platformChance: 0.2,
                gameModePortals: ['BALL', 'SHIP'],
                backgroundColor: 0x0a0a1e,
                groundColor: 0x2a2a4a,
                spikeColor: 0xff00ff
            },
            5: {
                name: "Lava Fortress",
                stars: 3,
                levelLength: 5000,
                gameSpeed: 440,
                gapVariance: 70,
                maxConsecutiveSpikes: 3,
                useBlocks: true,
                useDoubleSpikes: true,
                useTripleSpikes: true,
                platformChance: 0.2,
                gameModePortals: ['UFO', 'BALL'],
                backgroundColor: 0x2a0a0a,
                groundColor: 0x4a2a2a,
                spikeColor: 0xff3300
            },
            6: {
                name: "Storm Peaks",
                stars: 3,
                levelLength: 5500,
                gameSpeed: 460,
                gapVariance: 60,
                maxConsecutiveSpikes: 3,
                useBlocks: true,
                useDoubleSpikes: true,
                useTripleSpikes: true,
                platformChance: 0.25,
                gameModePortals: ['WAVE', 'SHIP', 'UFO'],
                backgroundColor: 0x1a1a3a,
                groundColor: 0x3a3a6a,
                spikeColor: 0x66ccff
            },
            7: {
                name: "Shadow Realm",
                stars: 4,
                levelLength: 6000,
                gameSpeed: 480,
                gapVariance: 50,
                maxConsecutiveSpikes: 3,
                useBlocks: true,
                useDoubleSpikes: true,
                useTripleSpikes: true,
                platformChance: 0.3,
                gameModePortals: ['SPIDER', 'WAVE', 'SHIP'],
                backgroundColor: 0x0a0a0a,
                groundColor: 0x2a2a2a,
                spikeColor: 0xaa00ff
            },
            8: {
                name: "Chaos Engine",
                stars: 5,
                levelLength: 6500,
                gameSpeed: 500,
                gapVariance: 45,
                maxConsecutiveSpikes: 4,
                useBlocks: true,
                useDoubleSpikes: true,
                useTripleSpikes: true,
                platformChance: 0.3,
                gameModePortals: ['ROBOT', 'SPIDER', 'WAVE', 'UFO'],
                backgroundColor: 0x1a0a1a,
                groundColor: 0x3a2a3a,
                spikeColor: 0xff0066
            }
        };

        return configs[difficulty] || configs[1];
    }

    getPatternWidth(obstacles) {
        if (obstacles.length === 0) return 0;
        const minX = Math.min(...obstacles.map(o => o.x));
        const maxX = Math.max(...obstacles.map(o => o.x));
        return maxX - minX + 50;
    }

    // Seeded random number generator for reproducible levels
    seededRandom(seed) {
        let state = seed;
        return function() {
            state = (state * 1103515245 + 12345) & 0x7fffffff;
            return state / 0x7fffffff;
        };
    }
}

// Pre-generated level data
export const LEVELS = [
    { difficulty: 1, seed: 12345, unlocked: true },
    { difficulty: 2, seed: 23456, unlocked: true },
    { difficulty: 3, seed: 34567, unlocked: true },
    { difficulty: 4, seed: 45678, unlocked: true },
    { difficulty: 5, seed: 56789, unlocked: true },
    { difficulty: 6, seed: 67890, unlocked: true },
    { difficulty: 7, seed: 78901, unlocked: true },
    { difficulty: 8, seed: 89012, unlocked: true }
];
