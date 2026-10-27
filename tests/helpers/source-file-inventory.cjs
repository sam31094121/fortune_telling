const fs = require('node:fs');
const path = require('node:path');

// Source-only inventory works in both Git checkouts and release archives. It
// includes new, unstaged source files instead of silently omitting them.
const OUTPUT_DIRS = new Set(['node_modules', '.git', '.tmp', 'dist', 'build', 'out', 'coverage', 'backup', 'backups']);
function listSourceFiles(roots, extensions, cwd = process.cwd()) {
  const files = [];
  const walk = (relative) => {
    for (const entry of fs.readdirSync(path.join(cwd, relative), { withFileTypes: true })) {
      const file = `${relative}/${entry.name}`;
      if (entry.isDirectory()) {
        if (!OUTPUT_DIRS.has(entry.name) && !entry.name.startsWith('.next')) walk(file);
      } else if (extensions.test(entry.name)) {
        if (entry.isSymbolicLink()) throw new Error(`Source inventory cannot validate a linked file: ${file}`);
        if (entry.isFile()) files.push(file);
      }
    }
  };
  for (const root of roots) walk(root);
  return files.sort();
}
module.exports = { listSourceFiles };
