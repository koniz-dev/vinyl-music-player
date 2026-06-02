/**
 * ESM wrapper around the vendored UMD bundle of html-to-image@1.11.13
 * (vendored under MIT — see `js/vendor/html-to-image.umd.js`).
 *
 * The UMD bundle, when loaded outside CommonJS/AMD, assigns the library to
 * `globalThis.htmlToImage`. We side-effect import the UMD file, then re-export
 * its public API as proper ESM bindings.
 */

import './html-to-image.umd.js';

const lib = (typeof globalThis !== 'undefined' ? globalThis : self).htmlToImage;
if (!lib) {
    throw new Error('html-to-image UMD bundle failed to load.');
}

export const { toCanvas, toBlob, toPng, toJpeg, toSvg, toPixelData, getFontEmbedCSS } = lib;
export default lib;
