# react4xp-runtime-client

**React4xp helper: Webpack setup for building React4xp's client-side wrapper for `ReactDOM.render` and `.hydrate`.**


## Installation

```bash
npm add --save-dev react4xp-runtime-client
```

## Usage

Calling in the installed location, run from the project root folder:

```bash
webpack --config node_modules/react4xp-runtime-client/webpack.config.js --env.REACT4XP_CONFIG_FILE=path/to/react4xpConfig.json
```
...where react4xpConfig is a mandatory JSON file with [common React4xp constants](https://www.npmjs.com/package/react4xp-buildconstants).

## Output

Builds two files to the output folder (location is defined by the `BUILD_R4X` constant), tailored for running React4xp components in a browser. Requires `react-dom` ([ReactDOM](https://reactjs.org/docs/react-dom.html)) as an [external runtime dependency](https://webpack.js.org/configuration/externals/):

The first, `react4xpClient.<HASH>.js`, is the compiled code to run in the browser. The content hash in the file name is used by the React4xp runtime to ensure [effective HTTP client caching](https://developers.google.com/web/fundamentals/performance/optimizing-content-efficiency/http-caching) of this file when it's fetched through the React4xp service.

The second, `chunks.client.js`, is used by React4xp to handle the dynamic hash and look up the actual file name.

`react4xpClient.<HASH>.js` makes or adds to the global runtime object `React4xp` (or whatever the constant `LIBRARY_NAME` is set to be), and exposes under it two methods:

  - `React4xp._CLIENT_.render(Component, targetId [, props])`: corresponds to `ReactDOM.render`. 
  - `React4xp._CLIENT_.hydrate(Component, targetId [, props])`: corresponds to `ReactDOM.hydrate`.

Both of them have the parameter signature:

  - `Component`: a React4xp Entry component or any ReactDOM renderable. If it's a function, the wrapper will try to turn it into a ReactDOM component by running `Component(props)`. React4xp entries are exposed as functions this way.
  - `targetId`: the unique ID of an HTML container element, into which the component will be rendered.
  - `props`: optional object with top-level props that will be sent into the component. React4xp relies on serialization of this object, so functions can't be passed in this way.