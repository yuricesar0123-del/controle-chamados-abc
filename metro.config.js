const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.transformer.minifierConfig = {
  compress: {
    drop_console: true,
  },
  mangle: {
    toplevel: true,
  },
  keep_classnames: false,
  keep_fnames: false,
};

module.exports = config;
