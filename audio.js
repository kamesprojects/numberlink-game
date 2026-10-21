/**
 * Numberlink Web Audio Procedural Synthesizer
 * Zero external audio files required. Uses Web Audio API oscillator nodes.
 */

class SoundManager {
    constructor() {
        this.ctx = null;
        this.muted = localStorage.getItem('numberlink_muted') === 'true';
        this.volume = 0.4;
        this.pentatonicFrequencies = [
            261.63, // C4
            293.66, // D4
            329.63, // E4
            392.00, // G4
            440.00, // A4
            523.25, // C5
            587.33, // D5
            659.25, // E5
            783.99, // G5
            880.00, // A5
            1046.50 // C6
        ];
    }

    init() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                this.ctx = new AudioContext();
            }
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    toggleMute() {
        this.muted = !this.muted;
        localStorage.setItem('numberlink_muted', this.muted);
        return this.muted;
    }

    isMuted() {
        return this.muted;
    }

    /**
     * Soft pop when dragging across a cell
     */
    playStep(stepIndex = 0) {
        if (this.muted) return;
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        // Slightly ascend pitch with step length (up to 1 octave)
        const baseFreq = 300 + Math.min(stepIndex * 24, 400);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(baseFreq, now);
        osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.7, now + 0.05);

        gain.gain.setValueAtTime(0.12 * this.volume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.06);
    }

    /**
     * Cheerful harmonic chord when a pair of endpoints is connected
     */
    playConnect(pairIndex = 0) {
        if (this.muted) return;
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const rootIndex = (pairIndex * 2) % (this.pentatonicFrequencies.length - 4);
        const chordNotes = [
            this.pentatonicFrequencies[rootIndex],
            this.pentatonicFrequencies[rootIndex + 2],
            this.pentatonicFrequencies[rootIndex + 4]
        ];

        chordNotes.forEach((freq, idx) => {
            const noteStart = now + idx * 0.04;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, noteStart);

            gain.gain.setValueAtTime(0, noteStart);
            gain.gain.linearRampToValueAtTime(0.22 * this.volume, noteStart + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + 0.45);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(noteStart);
            osc.stop(noteStart + 0.5);
        });
    }

    /**
     * Soft descending cut/swoosh when a line is erased or severed
     */
    playCut() {
        if (this.muted) return;
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(260, now);
        osc.frequency.exponentialRampToValueAtTime(110, now + 0.12);

        gain.gain.setValueAtTime(0.08 * this.volume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.13);
    }

    /**
     * Button click / undo sound
     */
    playClick() {
        if (this.muted) return;
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(220, now + 0.04);

        gain.gain.setValueAtTime(0.15 * this.volume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.05);
    }

    /**
     * Triumphant victory fanfare when completing the level
     */
    playVictory() {
        if (this.muted) return;
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const fanfareNotes = [
            { f: 523.25, d: 0.12, t: 0 },       // C5
            { f: 659.25, d: 0.12, t: 0.12 },    // E5
            { f: 783.99, d: 0.12, t: 0.24 },    // G5
            { f: 1046.50, d: 0.45, t: 0.36 }    // C6 (held)
        ];

        fanfareNotes.forEach(note => {
            const start = now + note.t;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(note.f, start);

            gain.gain.setValueAtTime(0, start);
            gain.gain.linearRampToValueAtTime(0.3 * this.volume, start + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.0001, start + note.d);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(start);
            osc.stop(start + note.d + 0.05);
        });
    }
}

// Global instance for browser
window.SoundManager = SoundManager;
