import ReactDOM from 'react-dom';

import "@babel/polyfill"

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


//TODO: check out if this builds and @babel/polyfill works. If so, use the polyfilled async/await to fetch from service{app.name/}dependencies, and insert that retrieved string of HTML scripts into the page.
THIS NEEDS TO HAPPEN: DEPENDENCY TRACKING! https://github.com/FormidableLabs/webpack-stats-plugin

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
