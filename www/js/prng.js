// Deterministic PRNG: FNV-1a string hash feeding a mulberry32 generator.
// Moved out of js/leaderboard-bots.js (which used it to seed each bot's
// per-period, per-player "personality" so the same player/period/board
// always gets the same trailing rivals) so js/duel-deck.js can seed a
// duel's deck the same way — same generator, unrelated purpose.
//
// module.exports tail is for Node only (scripts/duels/deck.test.js,
// scripts/push/duels.js); the browser bundle just gets two more top-level
// functions in the concatenated script, same as every other module here.

function fnv1aHash(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
}

function mulberry32(seed) {
    let a = seed >>> 0;
    return function() {
        a |= 0; a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { fnv1aHash, mulberry32 };
}
