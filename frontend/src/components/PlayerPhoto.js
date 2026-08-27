import React, { useState, useEffect } from 'react';

/**
 * Premier League player headshot with a graceful fallback chain.
 *
 * There are two photo paths, and the difference matters. The long-standing
 * `premierleague/photos/players/<size>/p<code>.png` has an image for only
 * about 60% of the element list. The path FPL's own player dialog uses,
 * `premierleague25/photos/players/<size>/<code>.png` — season-prefixed, and
 * with no `p` before the code — covers 88% of the same 60-player sample.
 * Chaining both reaches 90%; the rest genuinely have no photo anywhere, which
 * is why the initials fallback is a designed state rather than an error state.
 *
 * Note the prefix is `premierleague25` even during 2026/27 — `premierleague26`
 * currently 502s. If photos start disappearing en masse, try bumping it.
 *
 * Sizes differ per path: the new one serves 40x40, 110x140 and 500x500 but no
 * 250x250. 110x140 is what FPL itself renders and is only ~78KB, so it's the
 * primary everywhere; 500x500 would be 241KB for a 56px circle.
 *
 * Missing images return an S3 `application/xml` 403, which reliably fires the
 * <img> error handler.
 */
const CDN = 'https://resources.premierleague.com';

// 110x140 is ~96KB and 250x250 ~317KB, so list contexts start at the smaller
// size — twenty 250x250 headshots would be over 6MB of images for one page.
// The 110x140 assets are portraits with the head at the top; the square crops
// centre it. Applying `object-top` to a square frames the empty space above
// the head, which renders as a blank circle.
const CURRENT = `${CDN}/premierleague25/photos/players`;
const LEGACY = `${CDN}/premierleague/photos/players`;

const PRIMARY = { url: `${CURRENT}/110x140`, prefix: '', position: 'object-top' };
// Covers the handful of players present only on the retired path.
const FALLBACK = { url: `${LEGACY}/110x140`, prefix: 'p', position: 'object-top' };

const SOURCES = {
    lg: [PRIMARY, FALLBACK],
    md: [PRIMARY, FALLBACK],
    sm: [{ url: `${CURRENT}/40x40`, prefix: '', position: 'object-center' }, PRIMARY],
};

/**
 * Deterministic tint per player so the fallback reads as designed, not broken.
 * The component owns its own background — callers pass size and shape only, so
 * a caller's `bg-*` can't silently flatten every fallback to one colour.
 */
const TINTS = [
    'bg-purple-100 text-purple-700',
    'bg-sky-100 text-sky-700',
    'bg-emerald-100 text-emerald-700',
    'bg-amber-100 text-amber-800',
    'bg-rose-100 text-rose-700',
    'bg-indigo-100 text-indigo-700',
];

const getInitials = (name) => {
    if (!name) return '?';
    const parts = String(name).trim().split(/[\s.'-]+/).filter(Boolean);
    if (!parts.length) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const PlayerPhoto = ({ code, name, size = 'md', className = '' }) => {
    const sources = SOURCES[size] || SOURCES.md;
    const [attempt, setAttempt] = useState(0);

    // A different player in the same slot (e.g. paging a comparison) must retry
    // from the top rather than inherit the previous player's exhausted state.
    useEffect(() => { setAttempt(0); }, [code, size]);

    const source = code ? sources[attempt] : undefined;
    const tint = TINTS[Math.abs(Number(code) || 0) % TINTS.length];

    // Show initials only after the source chain is exhausted. PL headshots are
    // transparent cutouts, so rendering the fallback underneath a successful
    // photo lets faint letters show through shirts and empty space.
    return (
        <div
            // The tint belongs to the initials only. PL headshots are cutouts
            // on transparency, so leaving it on when a photo loads paints the
            // fallback colour in behind the player.
            className={`relative flex items-center justify-center overflow-hidden font-semibold select-none ${className} ${source ? '' : tint}`}
            role="img"
            aria-label={name || 'Player'}
        >
            {!source && <span className="text-[0.9em] leading-none">{getInitials(name)}</span>}
            {source && (
                <img
                    src={`${source.url}/${source.prefix}${code}.png`}
                    alt=""
                    // No loading="lazy": an absolutely positioned image inside
                    // an overflow-hidden parent never enters the loading queue
                    // at all here — every photo sat at complete=false with a
                    // 0-byte resource entry, while a plain new Image() for the
                    // same URL resolved instantly. These are ~78KB each, so
                    // deferring them was never worth much.
                    decoding="async"
                    className={`absolute inset-0 w-full h-full object-cover ${source.position}`}
                    onError={() => setAttempt((n) => n + 1)}
                />
            )}
        </div>
    );
};

export default PlayerPhoto;
