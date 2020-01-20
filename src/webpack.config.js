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
                    '\nregionPathsPostfilled.push(component.path);\nif (!regionsRemaining[regionName] && regionPathsPostfilled.length) {\n\tconsole.warn(`React4xp postfilled ${regionPathsPostfilled.length} component(s). This is an attempted fallback, compensating for when React4xp is client-side-rendering an XP page/layout that contains regions. In this case, the components in the regions need to be filled in by the server in a second rendering step. NOTE: Currently, this extra step will only get the HTML of the component. If the component has pageContributions, these will be omitted. Recommended: avoid using React4xp client-side-rendering for a region container (i.e. page/layout) where the region(s) has component(s) that need pageContributions to work. Component path(s): ${JSON.stringify(regionPathsPostfilled)}`);\n}'
            }),
        ],
    };
};
