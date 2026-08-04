/**
 * The three art directions the hero can be shown in, for client review.
 *
 *  · blueprint — the original wireframe world: white page, ink edges, no site.
 *  · model     — the architectural scale model: faceted planting, smooth white
 *                massing, a monochrome palette. Deliberately reads as a maquette
 *                rather than a photograph.
 *  · realistic — the same site built to true metric dimensions and detailed to
 *                the standard of the station model itself.
 *
 * Kept in its own module because both the hero shell and the renderer need it,
 * and importing the renderer into the shell just for a type would pull the whole
 * three.js chunk into the initial bundle.
 */
export type HeroStyle = 'blueprint' | 'model' | 'realistic'
