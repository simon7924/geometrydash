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
    // Corridors with top and bottom spikes - fly through gaps
    // Ship holds to rise, releases to fall. Create passages at varying heights.
    generateShipSection(section, config, random) {
        const obstacles = [];
        let currentX = section.startX;
        const spacing = 250 + random() * 80; // Distance between corridor walls

        // The ship flies in the open space between ground (650) and ceiling (70)
        // Place spike columns from top and bottom with a gap for the ship to fly through
        while (currentX < section.endX) {
            const gapSize = 180 + random() * 60; // Gap the ship flies through
            const gapCenter = 250 + random() * 250; // Y center of the gap (between 250 and 500)
            const gapTop = gapCenter - gapSize / 2;
            const gapBottom = gapCenter + gapSize / 2;

            // Spikes coming down from ceiling area
            if (gapTop > this.playableTop + 50) {
                // Place 1-2 spikes pointing down from above the gap
                const numTopSpikes = Math.floor((gapTop - this.playableTop) / 60);
                for (let i = 0; i < Math.min(numTopSpikes, 3); i++) {
                    obstacles.push({
                        type: 'spike',
                        x: currentX,
                        y: this.playableTop + i * 55,
                        flipY: true
                    });
                }
            }

            // Spikes coming up from ground area
            if (gapBottom < this.playableBottom - 50) {
                const numBottomSpikes = Math.floor((this.playableBottom - gapBottom) / 60);
                for (let i = 0; i < Math.min(numBottomSpikes, 3); i++) {
                    obstacles.push({
                        type: 'spike',
                        x: currentX,
                        y: this.playableBottom - i * 55
                    });
                }
            }

            currentX += spacing + random() * 100;
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
    // Floating spikes at various heights - tap to boost upward
    // UFO falls with gravity, each tap gives a small upward boost (multi-jump)
    generateUFOSection(section, config, random) {
        const obstacles = [];
        let currentX = section.startX;
        const spacing = 220 + random() * 60;

        while (currentX < section.endX) {
            const patternRoll = random();

            if (patternRoll < 0.35) {
                // Single floating spike at random height
                const spikeY = 200 + random() * 350;
                obstacles.push({ type: 'spike', x: currentX, y: spikeY });
            } else if (patternRoll < 0.65) {
                // Column of spikes with a gap to fly through
                const gapCenter = 250 + random() * 200;
                const gapSize = 160 + random() * 40;

                // Bottom spike(s)
                obstacles.push({
                    type: 'spike',
                    x: currentX,
                    y: gapCenter + gapSize / 2 + 30
                });
                if (gapCenter + gapSize / 2 + 90 < this.playableBottom) {
                    obstacles.push({
                        type: 'spike',
                        x: currentX,
                        y: gapCenter + gapSize / 2 + 85
                    });
                }

                // Top spike(s)
                obstacles.push({
                    type: 'spike',
                    x: currentX,
                    y: gapCenter - gapSize / 2 - 30,
                    flipY: true
                });
                if (gapCenter - gapSize / 2 - 90 > this.playableTop) {
                    obstacles.push({
                        type: 'spike',
                        x: currentX,
                        y: gapCenter - gapSize / 2 - 85,
                        flipY: true
                    });
                }
            } else {
                // Ground spike + ceiling spike offset — fly between them
                obstacles.push({
                    type: 'spike',
                    x: currentX,
                    y: this.groundY - 57
                });
                obstacles.push({
                    type: 'spike',
                    x: currentX + 120,
                    y: this.playableTop + 20,
                    flipY: true
                });
            }

            currentX += spacing + random() * 80;
        }

        return obstacles;
    }

    // ==================== WAVE SECTION ====================
    // Wave moves diagonally: hold = up-right, release = down-right
    // Create block walls with gaps at different heights to weave through
    generateWaveSection(section, config, random) {
        const obstacles = [];
        let currentX = section.startX;
        const spacing = 200 + random() * 40;
        let gapY = 350; // Start in middle

        while (currentX < section.endX) {
            // Move the gap up or down to create a weaving path
            const gapShift = (random() - 0.5) * 200;
            gapY = Math.max(this.playableTop + 100, Math.min(this.playableBottom - 100, gapY + gapShift));
            const gapSize = 150 + random() * 40; // Wave has small hitbox so gap can be tighter

            // Build a column of blocks with a gap
            // Top blocks
            for (let y = this.playableTop; y < gapY - gapSize / 2; y += 55) {
                obstacles.push({
                    type: 'spike',
                    x: currentX,
                    y: y,
                    flipY: true
                });
            }

            // Bottom blocks
            for (let y = gapY + gapSize / 2; y < this.playableBottom; y += 55) {
                obstacles.push({
                    type: 'spike',
                    x: currentX,
                    y: y
                });
            }

            currentX += spacing + random() * 60;
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
