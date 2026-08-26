import React, { useState, useEffect } from 'react';

/**
 * Premier League player headshot with a graceful fallback chain.
 *
 * Measured against a 60-player sample of the 2026/27 element list, the PL
 * photo CDN only has an image for about 60% of players — fringe and academy
 * squad members simply aren't shot. Coverage also differs by size: a few
 * players resolve at 110x140 but 403 at 250x250, so the larger size can't be
 * used on its own.
 *
 * Missing images return an S3 `application/xml` 403, which reliably fires the
 * <img> error handler, so we walk: 250x250 (crisp) -> 110x140 (best coverage)
 * -> initials. The previous fallback pointed at a `#user-circle` SVG symbol
 * that was never defined in the document, so those players rendered as an
 * empty circle.
 */

const CDN = 'https://resources.premierleague.com/premierleague/photos/players';

// 110x140 is ~96KB and 250x250 ~317KB, so list contexts start at the smaller
// size — twenty 250x250 headshots would be over 6MB of images for one page.
// Framing differs per asset: the 110x140 crop is a portrait with the head at
// the top, while 250x250/40x40 are square with the head centred. Applying
// `object-top` to a square crop frames the empty space above the head, which
// renders as a blank circle.
const SOURCES = {
    lg: [
        { url: `${CDN}/250x250`, position: 'object-center' },
        { url: `${CDN}/110x140`, position: 'object-top' },
    ],
    md: [
        { url: `${CDN}/110x140`, position: 'object-top' },
    ],
    sm: [
        { url: `${CDN}/40x40`, position: 'object-center' },
        { url: `${CDN}/110x140`, position: 'object-top' },
    ],
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

    // The initials sit underneath rather than replacing the image on error.
    // Roughly 40% of players have no photo and each miss costs a sequential
    // 403, so swapping only after the chain is exhausted leaves a visibly empty
    // circle for a beat; underneath, the photo simply paints over them.
    return (
        <div
            className={`relative flex items-center justify-center overflow-hidden font-semibold select-none ${className} ${tint}`}
            role="img"
            aria-label={name || 'Player'}
        >
            <span className="text-[0.9em] leading-none">{getInitials(name)}</span>
            {source && (
                <img
                    src={`${source.url}/p${code}.png`}
                    alt=""
                    loading="lazy"
                    className={`absolute inset-0 w-full h-full object-cover bg-white ${source.position}`}
                    onError={() => setAttempt((n) => n + 1)}
                />
            )}
        </div>
    );
};

export default PlayerPhoto;
