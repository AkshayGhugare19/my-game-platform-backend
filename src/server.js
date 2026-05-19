// Production entry shim.
//
// Render's Start Command is `node src/server.js`. The real server is
// TypeScript (src/server.ts), compiled by `npm run build` into dist/.
// This file just loads that compiled output so the deploy works without
// changing Render's start command.
//
// Local dev still uses `npm run dev` (ts-node-dev on src/server.ts) and
// does not touch this file. tsc ignores .js (allowJs is off), so this
// shim is never compiled into dist/ and never overwrites dist/server.js.
require("../dist/server.js");
