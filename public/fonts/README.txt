TT Hooves heading font — drop the licensed files here.

The site's @font-face (in src/index.css) looks for these exact filenames in
this folder (served at /fonts/...):

  TTHoves-Regular.woff2   (preferred)
  TTHoves-Regular.woff    (optional fallback)
  TTHoves-Regular.ttf     (optional fallback)

Only one is required; woff2 is best for the web. If your license gives you an
.otf/.ttf, convert to .woff2 (e.g. https://transfonts.org or fonttools) or just
drop the .ttf and rename it TTHoves-Regular.ttf.

Until a file is present here, headings fall back to Helvetica/Arial.
TT Hooves is a commercial TypeType font and cannot be bundled without a license.
