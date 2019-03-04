// Wrapper for 
import ReactDOM from 'react-dom';


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
    return (typeof Component === 'function') ? Component(props) : Component;
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
