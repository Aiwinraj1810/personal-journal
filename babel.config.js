module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
    // Bundles Drizzle's generated .sql migration files as inline strings —
    // Metro doesn't understand .sql on its own (see metro.config.js, which
    // adds 'sql' to sourceExts so Metro treats them as source at all).
    plugins: [['inline-import', { extensions: ['.sql'] }]],
  };
};
