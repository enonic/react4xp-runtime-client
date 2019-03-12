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
...where `env.REACT4XP_CONFIG_FILE` is a [Webpack environment variable](https://webpack.js.org/guides/environment-variables) that points to a mandatory JSON config file (`react4xpConfig.json`) with [shared React4xp constants](https://www.npmjs.com/package/react4xp-buildconstants).

The config JSON file is expected to have the following of the attributes from _react4xp-buildconstants_:
  - `BUILD_R4X`
  - `LIBRARY_NAME`
  - `CHUNK_CONTENTHASH` 
  - `CLIENT_CHUNKS_FILENAME`

Each of these can also be submitted to `webpack.config.js` with their own `--env.*` parameter in the command line, overriding the value from the config file. If all of them are covered, the config file reference is not needed.

## Output

Builds two files to the output folder (location is defined by the `BUILD_R4X` constant), tailored for running React4xp components in a browser. Requires `react-dom` ([ReactDOM](https://reactjs.org/docs/react-dom.html)) as an [external runtime dependency](https://webpack.js.org/configuration/externals/):

The first, `react4xpClient.<HASH>.js`, is the compiled code to run in the browser. The content hash in the file name is used by the React4xp runtime to ensure [effective HTTP client caching](https://developers.google.com/web/fundamentals/performance/optimizing-content-efficiency/http-caching) of this file when it's fetched through the React4xp service.

The second, `chunks.client.js` (filename actually defined by the constant `CLIENT_CHUNKS_FILENAME`) is used by React4xp to handle the dynamic hash and look up the actual file name.

`react4xpClient.<HASH>.js` makes or adds to the global runtime object `React4xp` (or whatever the constant `LIBRARY_NAME` is set to be), and exposes under it two methods:

  - `React4xp._CLIENT_.render(Component, targetId [, props])`: corresponds to `ReactDOM.render`. 
  - `React4xp._CLIENT_.hydrate(Component, targetId [, props])`: corresponds to `ReactDOM.hydrate`.

Both of them have the parameter signature:

  - `targetId`: the unique ID of an HTML container element, into which the component will be rendered.
  - `props`: optional object with top-level props that will be sent into the component. React4xp relies on serialization of this object, so functions can't be passed in this way.
  - `Component`: a React4xp Entry component or any ReactDOM renderable. If it's a function, the wrapper will try to turn it into a ReactDOM component by running `Component(props)`. React4xp entries are exposed as functions this way. 
    - Note that a fallback has been added so that if an entry component has been compiled into a `.default` sub-attribute, the client can access the component both with and without the `default` field: if `React4xp._CLIENT_.render(Component.default, ...` is strictly correct, `React4xp._CLIENT_.render(Component, ...` will also work.
    - Also note that usually, [react4xp-build-components](https://www.npmjs.com/package/react4xp-build-components) compiles entry components into the library, accessible through `React4xp` (or more precisely: what the `LIBRARY_NAME` constant has named it). That means the actual calls clientside normally look more like this: 
    
```javascript
React4xp._CLIENT_.render(React4xp.Hello, 'targetContainer', {helloTarget: 'world'});
``` 

In this example LIBRARY_NAME is `React4xp` and the component is called `Hello` ([built](https://www.npmjs.com/package/react4xp-build-components) from `Hello.jsx`), and being rendered into a DOM element with the ID `targetContainer`, with `{helloTarget: 'world'}` as React props.
