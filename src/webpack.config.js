// Webpack for transpiling React4xp "frontend core":
// The React4xp (not-third-party) core functionality for running in the client,
// necessary for components to run/render.

const path = require('path');

const Chunks2json = require('chunks-2-json-webpack-plugin');
const webpack = require('webpack');

module.exports = env => {
    env = env || {};

    const overridden = (Object.keys(env).length !== 1 && Object.keys(env)[0] !== "REACT4XP_CONFIG_FILE");
    if  (overridden) {
        console.log(__filename, "overrides: " + JSON.stringify(env, null, 2));
    }

    // Gets the following constants from the config file UNLESS they are overridden by an env parameter, which takes priority:
    const {
        BUILD_R4X, LIBRARY_NAME, BUILD_ENV, CHUNK_CONTENTHASH, CLIENT_CHUNKS_FILENAME,

    } = Object.assign(
        {},
        env,
        env.REACT4XP_CONFIG_FILE ?
            require(path.join(process.cwd(), env.REACT4XP_CONFIG_FILE)) :
            {}
    );

    if  (overridden) {
        console.log(__filename, "overridden config: " + JSON.stringify({
            BUILD_R4X, LIBRARY_NAME, BUILD_ENV, CHUNK_CONTENTHASH, CLIENT_CHUNKS_FILENAME,
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
            'react4xpClient': path.join(__dirname, 'react4xpClient.es6'),
        },

        output: {
            path: BUILD_R4X,  // <-- Sets the base url for plugins and other target dirs.
            filename: chunkFileName,
            libraryTarget: 'var', 
            library: [LIBRARY_NAME, 'CLIENT'],
        },

        resolve: {
            extensions: ['.es6', '.js', '.jsx'],
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
                        presets: [
                            "@babel/preset-react",
                            "@babel/preset-env"
                        ],
                        plugins: [
                            "@babel/plugin-transform-arrow-functions",
                            "@babel/plugin-proposal-object-rest-spread"
                        ]
                    },
                },
            ],
        },

        externals: {
            "react-dom": "ReactDOM",
        },

        plugins: [
            new Chunks2json({outputDir: BUILD_R4X, filename: CLIENT_CHUNKS_FILENAME}),
            new webpack.DefinePlugin({
                LIBRARY_NAME: JSON.stringify(LIBRARY_NAME),
                DEVMODE_WARN_AGAINST_CLIENTRENDERED_REGIONS: BUILD_ENV === 'production' ?
                    '' :
                    '\nregionPathsPostfilled.push(component.path);\nif (!regionsRemaining[regionName] && regionPathsPostfilled.length) {\n\tconsole.warn(`React4xp postfilled ${regionPathsPostfilled.length} component(s) because a region-containing React4xp entry was client-side rendered from an XP controller. Path(s): ${JSON.stringify(regionPathsPostfilled.join(", "))}.\\n\\nNOTE: This version of React4xp and/or XP don\'t support XP components that need page contributions inside client-rendered Regions. This includes React4xp entries in parts, etc. For now, avoid using React4xp client-side-rendering for entries with Regions, or avoid inserting XP components that need page contributions to work into those Regions.\\n\\nSee: https://github.com/enonic/lib-react4xp/issues/38`);\n}'
            }),
        ],
    };
};
