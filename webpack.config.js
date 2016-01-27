const webpack = require('webpack');

module.exports = {
    entry: {
        index: './lib/Autocomplete.js'
    },
    output: {
        path: `${__dirname}/build`,
        filename: 'index.js',
        libraryTarget: 'commonjs2'
    },
    externals: {
      'react': 'react',
      'react-dom': 'react-dom'
    },
    module: {
        loaders: [{
          test: /\.js$/,
          loader: 'babel',
          exclude: /node_modules/
        }]
    }
};
