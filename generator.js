/**
 * Numberlink / Flow Procedural Level Generator
 * 
 * Uses the Lovász Backbite algorithm on grid graphs to uniformly sample
 * Hamiltonian paths across any W x H grid, and decomposes the path into
 * K disjoint simple paths with guaranteed solvability.
 */

class NumberlinkGenerator {
    /**
     * Pseudo-random number generator (Mulberry32)
     * Ensures deterministic generation given a seed.
     */
    static createPRNG(seed) {
        let a = (seed >>> 0) || 12345;
        return function () {
            let t = (a += 0x6D2B79F5);
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    /**
     * Default pair counts recommended for grid sizes
     */
    static getRecommendedPairs(width, height) {
        const area = width * height;
        if (area <= 25) return 4;        // 5x5
        if (area <= 36) return 5;        // 6x6
        if (area <= 49) return 6;        // 7x7
        if (area <= 64) return 7;        // 8x8
        if (area <= 81) return 8;        // 9x9
        if (area <= 100) return 9;       // 10x10
        if (area <= 121) return 10;      // 11x11
        return Math.min(12, Math.floor(Math.sqrt(area)));
    }

    /**
     * Generates a fully solvable Numberlink puzzle.
     * 
     * @param {number} width - Grid width (4-12)
     * @param {number} height - Grid height (4-12)
     * @param {number} numPairs - Number of pairs (3-12)
     * @param {number|null} seed - Optional seed for deterministic generation
     * @returns {Object} Puzzle specification
     */
    static generate(width, height, numPairs = null, seed = null) {
        if (!numPairs) {
            numPairs = this.getRecommendedPairs(width, height);
        }

        numPairs = Math.max(2, Math.min(12, numPairs));
        const finalSeed = (seed !== null && seed !== undefined)
            ? (typeof seed === 'number' ? seed : this.hashString(String(seed)))
            : Math.floor(Math.random() * 2147483647);

        const rng = this.createPRNG(finalSeed);
        const n = width * height;
        const dirs = [
            { dr: -1, dc: 0 },
            { dr: 1, dc: 0 },
            { dr: 0, dc: -1 },
            { dr: 0, dc: 1 }
        ];

        // Attempt generation with backbite and path decomposition
        for (let restart = 0; restart < 10; restart++) {
            // 1. Initial serpentine Hamiltonian path
            const path = [];
            for (let r = 0; r < height; r++) {
                const cols = [];
                for (let c = 0; c < width; c++) cols.push(c);
                if (r % 2 === 1) cols.reverse();
                for (const c of cols) {
                    path.push({ r, c });
                }
            }

            // Cell index map for fast lookup: (r * width + c) -> position in path
            const pos = new Int32Array(n);
            for (let i = 0; i < n; i++) {
                pos[path[i].r * width + path[i].c] = i;
            }

            // 2. Lovász Backbite Random Walk
            // 50-80 moves per cell ensures thorough mixing
            const steps = Math.max(1000, n * 50);

            for (let s = 0; s < steps; s++) {
                const end = rng() < 0.5 ? 0 : 1;
                if (end === 1) {
                    const u = path[n - 1];
                    const valid = [];
                    for (let d = 0; d < 4; d++) {
                        const nr = u.r + dirs[d].dr;
                        const nc = u.c + dirs[d].dc;
                        if (nr >= 0 && nr < height && nc >= 0 && nc < width) {
                            const idx = pos[nr * width + nc];
                            if (idx < n - 2) valid.push(idx);
                        }
                    }
                    if (valid.length === 0) continue;
                    const i = valid[Math.floor(rng() * valid.length)];
                    // Reverse path[i+1 .. n-1]
                    let l = i + 1, r = n - 1;
                    while (l < r) {
                        const tmp = path[l]; path[l] = path[r]; path[r] = tmp;
                        pos[path[l].r * width + path[l].c] = l;
                        pos[path[r].r * width + path[r].c] = r;
                        l++; r--;
                    }
                    if (l === r) pos[path[l].r * width + path[l].c] = l;
                } else {
                    const u = path[0];
                    const valid = [];
                    for (let d = 0; d < 4; d++) {
                        const nr = u.r + dirs[d].dr;
                        const nc = u.c + dirs[d].dc;
                        if (nr >= 0 && nr < height && nc >= 0 && nc < width) {
                            const idx = pos[nr * width + nc];
                            if (idx > 1) valid.push(idx);
                        }
                    }
                    if (valid.length === 0) continue;
                    const i = valid[Math.floor(rng() * valid.length)];
                    // Reverse path[0 .. i-1]
                    let l = 0, r = i - 1;
                    while (l < r) {
                        const tmp = path[l]; path[l] = path[r]; path[r] = tmp;
                        pos[path[l].r * width + path[l].c] = l;
                        pos[path[r].r * width + path[r].c] = r;
                        l++; r--;
                    }
                    if (l === r) pos[path[l].r * width + path[l].c] = l;
                }
            }

            // 3. Balanced Path Splitting
            // Each path should be at least minLen cells and endpoints should have Manhattan distance >= 2
            const minLen = Math.max(3, Math.floor(n / (numPairs * 2.8)));
            const avgLen = n / numPairs;
            const maxLen = Math.ceil(avgLen * 2.5);
            const minManhattan = 2;

            for (let cutAttempt = 0; cutAttempt < 800; cutAttempt++) {
                const cuts = [];
                let safety = 0;
                while (cuts.length < numPairs - 1 && safety++ < 200) {
                    const c = Math.floor(rng() * (n - 2 * minLen)) + minLen;
                    if (!cuts.includes(c)) cuts.push(c);
                }
                if (cuts.length < numPairs - 1) continue;

                cuts.sort((a, b) => a - b);
                const allCuts = [0, ...cuts, n];

                let valid = true;
                const subpaths = [];

                for (let i = 0; i < allCuts.length - 1; i++) {
                    const len = allCuts[i + 1] - allCuts[i];
                    if (len < minLen || len > maxLen) {
                        valid = false;
                        break;
                    }
                    const sp = path.slice(allCuts[i], allCuts[i + 1]);
                    const dist = Math.abs(sp[0].r - sp[sp.length - 1].r) + Math.abs(sp[0].c - sp[sp.length - 1].c);
                    if (dist < minManhattan) {
                        valid = false;
                        break;
                    }
                    subpaths.push(sp);
                }

                if (valid) {
                    // Successfully generated puzzle!
                    return this.packagePuzzle(width, height, numPairs, finalSeed, subpaths);
                }
            }
        }

        // Fallback: relax constraints slightly if strict balanced cuts didn't finish
        return this.fallbackGenerate(width, height, numPairs, finalSeed);
    }

    /**
     * Fallback generator with relaxed constraints to guarantee 100% success rate
     */
    static fallbackGenerate(width, height, numPairs, seed) {
        const rng = this.createPRNG(seed);
        const n = width * height;
        const path = [];
        for (let r = 0; r < height; r++) {
            const cols = [];
            for (let c = 0; c < width; c++) cols.push(c);
            if (r % 2 === 1) cols.reverse();
            for (const c of cols) path.push({ r, c });
        }

        // Simple partition into numPairs chunks
        const subpaths = [];
        const baseChunk = Math.floor(n / numPairs);
        let rem = n % numPairs;
        let start = 0;
        for (let i = 0; i < numPairs; i++) {
            const size = baseChunk + (rem > 0 ? 1 : 0);
            if (rem > 0) rem--;
            subpaths.push(path.slice(start, start + size));
            start += size;
        }

        return this.packagePuzzle(width, height, numPairs, seed, subpaths);
    }

    /**
     * Packages paths into game-ready structure with endpoints, solution, and metadata
     */
    static packagePuzzle(width, height, numPairs, seed, subpaths) {
        const pairs = [];
        const grid = Array.from({ length: height }, () => Array(width).fill(0));

        subpaths.forEach((p, index) => {
            const id = index + 1; // 1-based number
            const start = { r: p[0].r, c: p[0].c };
            const end = { r: p[p.length - 1].r, c: p[p.length - 1].c };

            grid[start.r][start.c] = id;
            grid[end.r][end.c] = id;

            pairs.push({
                id,
                start,
                end,
                length: p.length,
                solution: p.map(pt => ({ r: pt.r, c: pt.c }))
            });
        });

        return {
            width,
            height,
            numPairs,
            seed,
            grid,          // 2D grid with 0 for empty, id for endpoints
            pairs,         // List of pairs with start, end, and solution path
            totalCells: width * height
        };
    }

    /**
     * Converts a string seed into a 32-bit positive integer
     */
    static hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = (Math.imul(31, hash) + str.charCodeAt(i)) | 0;
        }
        return Math.abs(hash);
    }
}

// Export for Node and browser environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NumberlinkGenerator;
}
