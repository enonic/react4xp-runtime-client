// Webpack for transpiling React4xp "frontend core":
// The React4xp (not-third-party) core functionality for running in the client,
// necessary for components to run/render.

const path = require('path');

const Chunks2json = require('chunks-2-json-webpack-plugin');
const webpack = require('webpack');

module.exports = env => {
    const {
        BUILD_R4X, LIBRARY_NAME, BUILD_ENV
    } = require(env.REACT4XP_CONFIG_FILE);

    return {
        mode: BUILD_ENV,

        entry: {
            'react4xpClient': path.join(__dirname, 'react4xpClient.es6')
        },

        output: {
            path: BUILD_R4X,  // <-- Sets the base url for plugins and other target dirs.
            filename: "[name].[contenthash:9].js",
            libraryTarget: 'var', 
            library: [LIBRARY_NAME, '_CLIENT_'],
        },

        resolve: {
            extensions: ['.es6', '.js', '.jsx']
        },
        devtool: (BUILD_ENV === 'production') ? false : 'source-map',
        module: {
            rules: [
                {
                    // Babel for building static assets
                    test: /\.es6$/,
                    exclude: /[\\/]node_modules[\\/]/,
                    loader: 'babel-loader',
                    query: {
                        compact: (BUILD_ENV === 'production'),
                    },
                }
            ]
        },

        externals: {
            "react-dom": "ReactDOM"
        },

        plugins: [
            new Chunks2json({outputDir: BUILD_R4X, filename: 'chunks.client.json'}),
            new webpack.DefinePlugin({
                LIBRARY_NAME: JSON.stringify(LIBRARY_NAME)
            })
        ],

    };
};
