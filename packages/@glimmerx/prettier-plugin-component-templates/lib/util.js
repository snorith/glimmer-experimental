function esTree(options) {
  // Find the built-in estree printer from loaded plugins
  for (const plugin of options.plugins) {
    if (plugin.printers?.estree) {
      return plugin.printers.estree;
    }
  }
  console.error(
    'ERROR: Could not find estree printer. Plugins:',
    options.plugins?.map((p) => Object.keys(p.printers || {}))
  );
  throw new Error('Could not find estree printer');
}

module.exports = {
  esTree,
};
