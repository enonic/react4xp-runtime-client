// Webpack for transpiling React4xp "frontend core":
// The React4xp (not-third-party) core functionality for running in the client,
// necessary for components to run/render.

const path = require('path');

const Chunks2json = require('chunks-2-json-webpack-plugin');
const webpack = require('webpack');

const stripSlashesFromEnd = (path) => {
    while (path.endsWith("\\") || path.endsWith('/')) {
        path = path.substring(0, path.length - 1);
    }
    return path;
};

module.exports = env => {
    env = env || {};

    const overridden = (Object.keys(env).length !== 1 && Object.keys(env)[0] !== "REACT4XP_CONFIG_FILE");
    if  (overridden) {
        console.log(__filename, "overrides: " + JSON.stringify(env, null, 2));
    }

    // Gets the following constants from the config file UNLESS they are overridden by an env parameter, which takes priority:
    const {
        BUILD_R4X, LIBRARY_NAME, BUILD_ENV, CHUNK_CONTENTHASH, CLIENT_CHUNKS_FILENAME, SERVICE_ROOT_URL,

    } = Object.assign(
        {},
        env,
        env.REACT4XP_CONFIG_FILE ?
            require(env.REACT4XP_CONFIG_FILE) :
            {}
    );

    if  (overridden) {
        console.log(__filename, "overridden config: " + JSON.stringify({
            BUILD_R4X, LIBRARY_NAME, BUILD_ENV, CHUNK_CONTENTHASH, CLIENT_CHUNKS_FILENAME, SERVICE_ROOT_URL,
        }, null, 2));
    }

    // Decides whether or not to hash filenames of common-component chunk files, and the length of the hash
    const chunkFileName = (!CHUNK_CONTENTHASH) ?
        "[name].js" :
        isNaN(CHUNK_CONTENTHASH) ?
            CHUNK_CONTENTHASH :
            `[name].[contenthash:${parseInt(CHUNK_CONTENTHASH)}].js`;

    return {
        mode: BUILD_ENV,

        entry: {
            'react4xpClient': path.join(__dirname, 'react4xpClient.es6')
        },

        output: {
            path: BUILD_R4X,  // <-- Sets the base url for plugins and other target dirs.
            filename: chunkFileName,
            libraryTarget: 'var', 
            library: [LIBRARY_NAME, 'CLIENT'],
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
            new Chunks2json({outputDir: BUILD_R4X, filename: CLIENT_CHUNKS_FILENAME}),
            new webpack.DefinePlugin({
                LIBRARY_NAME: JSON.stringify(LIBRARY_NAME),
                SERVICE_ROOT_URL: JSON.stringify(stripSlashesFromEnd(SERVICE_ROOT_URL))
            })
        ],
    };
};
