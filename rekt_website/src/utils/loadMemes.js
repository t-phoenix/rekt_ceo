// Utility to dynamically build categorized meme templates from a Webpack require.context

/**
 * Convert a string to a slug suitable for IDs and URLs.
 * Keeps ASCII letters and numbers; replaces other runs with a single dash.
 */
export function slugify(input) {
  return String(input)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

function titleCaseFromFilename(fileBase) {
  const withSpaces = fileBase.replace(/[_-]+/g, ' ');
  return withSpaces
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

/**
 * Build categorized meme templates from a Webpack require.context
 *
 * @param {__WebpackModuleApi.RequireContext} ctx
 * @returns {Record<string, Array<{ id: string; name: string; src: string }>>}
 */
export function buildFromRequireContext(ctx) {
  const categorized = {};

  const imageRegex = /(png|jpe?g|gif|webp)$/i;

  ctx.keys().forEach((key) => {
    // Expect keys like './<Category>/<FileName>.<ext>'
    if (!imageRegex.test(key)) return;
    if (key.includes('.DS_Store')) return;

    const path = key.replace(/^\.\//, '');
    const segments = path.split('/');
    if (segments.length < 2) return;

    const categoryRaw = segments[0];
    const fileName = segments.slice(1).join('/');
    const fileBase = fileName.replace(/\.[^.]+$/, '');

    const name = titleCaseFromFilename(fileBase);
    const id = `${slugify(categoryRaw)}-${slugify(fileBase)}`;
    const src = ctx(key);

    if (!categorized[categoryRaw]) categorized[categoryRaw] = [];
    categorized[categoryRaw].push({ id, name, src });
  });

  // Sort each category's items by name and remove empties
  Object.keys(categorized).forEach((category) => {
    categorized[category] = categorized[category]
      .filter(Boolean)
      .sort((a, b) => a.name.localeCompare(b.name));
    if (categorized[category].length === 0) {
      delete categorized[category];
    }
  });

  return categorized;
}

