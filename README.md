# react4xp-runtime-client

**React4xp helper: Webpack setup for building React4xp's wrapper for client-side rendering, hydrating and dependency loading.**

Runs in the browser, communicates with Enonic XP to render React4xp components and dependencies, all fetched through React4xp services. These services are bundled in the [lib-react4xp library](https://github.com/enonic/lib-react4xp), which uses _this_ package to build its out-of-the-box client. This means you don't need to use this package unless you're customizing your setup.

## Installation

```bash
npm add --save-dev react4xp-runtime-client
```

## Usage

Calling in the installed location, run from the project root folder:

```bash
webpack --config node_modules/react4xp-runtime-client/webpack.config.js --env.REACT4XP_CONFIG_FILE=path/to/react4xpConfig.json
```
...where `env.REACT4XP_CONFIG_FILE` is a [Webpack environment variable](https://webpack.js.org/guides/environment-variables) that points to a JSON config file (in this case `react4xpConfig.json`) with [shared React4xp constants in the pattern of react4xp-buildconstants](https://www.npmjs.com/package/react4xp-buildconstants), especially these attributes:
  - `BUILD_R4X`
  - `LIBRARY_NAME`
  - `CHUNK_CONTENTHASH` 
  - `CLIENT_CHUNKS_FILENAME`
  

Each of these can also be submitted to `webpack.config.js` with their own `--env.*` parameter in the command line, overriding the value from the config file. If all of them are covered, the config file reference is not needed to build the client.

## Output

Builds two files to the output folder (location is defined by the `BUILD_R4X` constant), tailored for running React4xp components in a browser. Requires `react-dom` ([ReactDOM](https://reactjs.org/docs/react-dom.html)) as an [external runtime dependency](https://webpack.js.org/configuration/externals/):

The first, `react4xpClient.<HASH>.js`, is compiled code to run in the browser. The content hash in the file name is used by the React4xp runtime to ensure [effective HTTP client caching](https://developers.google.com/web/fundamentals/performance/optimizing-content-efficiency/http-caching) of this file when it's fetched through the React4xp service.

The second, `chunks.client.js` (filename actually defined by the constant `CLIENT_CHUNKS_FILENAME`) is used by React4xp to handle the dynamic hash and look up the actual file name.

### Usage from the client

Running `react4xpClient.<HASH>.js` in a browser adds the object `React4xp` (or whatever the constant `LIBRARY_NAME` is set to be) to the global runtime namespace. It exposes three methods under the CLIENT attribute:

  - `React4xp.CLIENT.render(Component, targetId [, props])`: corresponds to `ReactDOM.render`
  - `React4xp.CLIENT.hydrate(Component, targetId [, props])`: corresponds to `ReactDOM.hydrate`
  - `React4xp.CLIENT.renderWithDependencies(componentsTargetsAndProps [, callback [, serviceUrlRoot]])`

The first two methods are 'pure' renderers. This means that in addition to this client script, you need to supply and run scripts for React and ReactDOM (which may be bundled into [React4xp externals](https://www.npmjs.com/package/react4xp-runtime-externals)) - and **scripts for the entries as well as all their chunks**, before calling `render` or `hydrate`. Using React4xp from XP components will automate this for you.

However, you can also use React4xp components in a standalone html page, having only React/ReactDOM (or React4xp externals) and this client loaded in the browser: use `renderWithDependencies` as below.



#### Using `render` and `hydrate`
   
They have a `Component, targetId, [, props]` signature:
  - `targetId`: the unique ID of an HTML container element, into which the component will be rendered. Obviously, this must exist in the DOM when running.
  - `props`: optional object with top-level props that will be sent into the component. React4xp relies on serialization of this object, so functions can't be passed in this way.
  - `Component`: a React4xp Entry component or any ReactDOM renderable. If it's a function, the wrapper will try to turn it into a ReactDOM component by running `Component(props)`. React4xp entries are exposed as functions this way. 
    - A fallback has been added so that if an entry component has been compiled into a `.default` sub-attribute, the client can access the component both with and without the `default` field: if `React4xp.CLIENT.render(Component.default, ...` is strictly correct, `React4xp.CLIENT.render(Component, ...` will also work.
    - Also note that usually, [react4xp-build-components](https://www.npmjs.com/package/react4xp-build-components) compiles entry components into the same `React4xp` library object (if `LIBRARY_NAME` is "React4xp"). 
    
That means the component in the actual calls clientside normally look similar to this: 
    
```html
<div id="targetContainer"></div>
<script>
	React4xp.CLIENT.render(React4xp.Hello, 'targetContainer', {helloTarget: 'world'});
</script>
``` 

In this example LIBRARY_NAME is `React4xp` and the already-fetched-and-run component is called `Hello` ([built](https://www.npmjs.com/package/react4xp-build-components) from `Hello.jsx`), and being rendered into a DOM element with the ID `targetContainer`, with `{helloTarget: 'world'}` as React props.


#### Using `renderWithDependencies`

This will contact the React4xp service, determine what the entries' chunk dependencies are, download and run those in parallel, then download and run the entry scripts, then run `render` on each of the entries - all the time preventing duplicate downloads.

Signature:
  - `componentsTargetsAndProps`: mandatory object where each entry is similar to the `Component, targetId, [, props]` signature mentioned above: the key strings are names ([jsxPaths](https://www.npmjs.com/package/react4xp-build-components#using-the-entries)) of React4xp components that are available from the React4xp service. The values are objects that have a mandatory `targetId` string and an optional `props` object.
  - `callback`: optional function that is run after running `render`. 
  - `serviceUrlRoot`: root of the URL to the react4xp and react4xp-dependencies services. E.g. if they have the URLs `/_/service/my.app/react4xp/` and `/_/service/my.app/react4xp-dependencies/`, then `serviceRootUrl` should be `/_/service/my.app` (without a trailing slash). This is sort of optional: you can define a constant `SERVICE_URL_ROOT` in global namespace before running this method without the final argument. If you don't, it's a mandatory argument. 
