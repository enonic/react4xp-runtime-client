import ReactDOM from 'react-dom';

import "@babel/polyfill"


// https://www.oreilly.com/library/view/high-performance-javascript/9781449382308/ch01.html#dynamic_script_elements
const loadDependencyUrl = (url) => {
    var script = document.createElement("script");
    script.type = "text/javascript";
    script.src = url;
    document.getElementsByTagName("head")[0].appendChild(script);
};

// TODO: Polyfill fetch? Fetch with timeout? What about promises (Bluebird)?

export function loadDependenciesAsync(entryNames, rootUrl, callback) {
    entryNames = entryNames || [];
    if (typeof entryNames === 'string') {
        entryNames = [entryNames]
    }
    entryNames = entryNames
        .map(name => ((name || "") + "").trim())
        .filter(name => name !== "");

    if (entryNames.length > 0) {
        fetch(`${rootUrl}/react4xp-dependencies?${entryNames.join("&")}`)
            .then(data => {
                return data.json();
            })
            .then(dependencyUrls => {
                [
                    ...dependencyUrls,
                    ...entryNames.map( name => `${rootUrl}/react4xp/${name}`)
                ].forEach(
                    url => loadDependencyUrl(url)
                );
            })
            .then(()=>{
                if (typeof callback === 'function') {
                    callback();
                }
            })
            .catch(error => {
                console.log(error);
            });
    }
};


const getContainer = (targetId) => {
    let container = null;
    try {
        if (!targetId) {
            throw Error(`${LIBRARY_NAME}._CLIENT_ can't mount component into target container: missing targetId`);
        }
        container = document.getElementById(targetId);

    } catch (e) { console.error(e); }

    if (!container) {
        throw Error(`${LIBRARY_NAME}._CLIENT_ can't mount component into target container: no DOM element with ID '${targetId}'`);
    }

    return container;
};


const getRenderable = (Component, props) => {
    return (typeof Component === 'function') ?
        Component(props) :
        (typeof Component !== 'object') ?
            Component :
            (typeof Component.default === 'function') ?
                Component.default(props) :
                Component.default;
};



export function render(Component, targetId, props) {
    const container = getContainer(targetId);
    const renderable = getRenderable(Component, props);
    ReactDOM.render(renderable, container);
};

export function hydrate(Component, targetId, props) {
    const container = getContainer(targetId);
    const renderable = getRenderable(Component, props);
    ReactDOM.hydrate(renderable, container);
};

