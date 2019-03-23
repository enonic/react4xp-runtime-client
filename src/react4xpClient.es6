// SERVICE_ROOT_URL and LIBRARY_NAME are provided at buildtime by the react constants file via webpack:
/* global LIBRARY_NAME, SERVICE_ROOT_URL */

import ReactDOM from 'react-dom';

/** Adjusted version of https://www.oreilly.com/library/view/high-performance-javascript/9781449382308/ch01.html#I_programlisting1_d1e1051
  * in order to parallelly load internally independent scripts from multiple urls, and only when they've ALL completely loaded
  * and run, run the callback.
  * @param urls Mandatory array (or single string) of urls to load as scripts and run
  * @param callback Optional function to run once all scripts are complete */
function loadScripts(urls, callback) {

    let scriptsToComplete = 0;
    function maybeCallback() {
        scriptsToComplete -= 1;
        if (scriptsToComplete < 1 && typeof callback === 'function') {
            callback();
        }
    }

    if (Array.isArray(urls) && urls.length === 0) {
        maybeCallback();
        return;
    }

    // Prevents a lot of bad input in one check (after handling an empty url array above): prevents it if url is missing,
    // null, an empty or only-spaces string, or an array where none of the items contain characters other than spaces
    if (((urls || "") + "").replace(/,/g, '').trim() === "") {
        console.error("Aborting: malformed 'urls' argument (all empty): " + JSON.stringify(urls));
        return;
    }

    if (typeof urls === "string") {
        urls = [urls];
    }

    // Trim each url, and remove the duplicates and empty items
    urls = urls.map(url => (url || "").trim());
    urls = urls.filter( (url, index) =>
        url !== "" &&
        urls.indexOf(url) === index
    );

    scriptsToComplete = urls.length;


    try {
        urls.forEach(url => {
            try {
                const script = document.createElement("script");
                script.type = "text/javascript";

                if (script.readyState) {  //IE
                    script.onreadystatechange = () => {
                        if (script.readyState == "loaded" || script.readyState == "complete") {
                            script.onreadystatechange = null;
                            maybeCallback();
                        }
                    };
                } else {  //Others
                    script.onload = maybeCallback;
                }

                script.src = url;
                document.getElementsByTagName("head")[0].appendChild(script);

            } catch (e) {
                throw Error("Error occurred while trying to load script from url [ " + url + " ]: " + e.message);
            }
        });

    } catch (e) {
        console.error("Aborted - " + e.message);
    }
}


/** After all the dependency and entry source scripts have been loaded and run, it's time to call the render method on
  * each entry. When those calls are finished, run the callback */
function runEntryCalls(entriesWithTargetIdsAndProps, entryNames, callback) {
    let scriptsToComplete = entryNames.length;
    function maybeCallback() {
        scriptsToComplete -= 1;
        if (scriptsToComplete < 1 && typeof callback === 'function') {
            callback();
        }
    }

    entryNames.forEach(entryName => {
        const trimmedEntryName = (entryName || "").trim();
        if (trimmedEntryName === "") {
            return;
        }

        const script = document.createElement("script");
        script.type = "text/javascript";
        const inlineScript = document.createTextNode(
            `${LIBRARY_NAME}.CLIENT.render(${LIBRARY_NAME}['${trimmedEntryName}'], ` +
            `${JSON.stringify(entriesWithTargetIdsAndProps[entryName].targetId)}, ` +
            `${JSON.stringify(entriesWithTargetIdsAndProps[entryName].props)})`);

        if (script.readyState) {  //IE
            script.onreadystatechange = () => {
                if (script.readyState == "loaded" || script.readyState == "complete") {
                    script.onreadystatechange = null;
                    maybeCallback();
                }
            };
        } else {  //Others
            script.onload = maybeCallback;
        }

        script.appendChild(inlineScript);
        document.getElementsByTagName("head")[0].appendChild(script);
    });
}


/** Takes an object entriesWithTargetIdsAndProps where the keys are entry names (jsxPath) and the values are
  * objects with a mandatory targetId attribute and an optional props attribute - which is a regular object of any shape.
  * Uses the entry names and the React4xp runtime to figure out urls for all necessary dependencies for rendering all the
  * entries, then loads and runs the dependencies, loads and runs the entry component scripts and finally triggers the
  * rendering of the entries - in the order of the entry name keys in the entriesWithTargetIdsAndProps parameter.
  * @param entriesWithTargetIdsAndProps Mandatory object, { <entryName> -> { targetId: string, props: { ... react props for the entry}}}
  * @param callback Optional function called after (and blocked by) the entire call chain. */
export function renderWithDependencies(entriesWithTargetIdsAndProps, callback) {
    const entries = Object.keys(entriesWithTargetIdsAndProps) || [];

    const entryNames = entries
        .map(name => ((name || "") + "").trim())
        .filter(name => name !== "");

    if (entryNames.length > 0) {
        fetch(`${SERVICE_ROOT_URL}/react4xp-dependencies?${entryNames.join("&")}`)
            .then(data => {
                return data.json();
            })
            .then(dependencyUrls => {
                loadScripts(
                    dependencyUrls,
                    () => loadScripts(
                        entryNames.map(name => `${SERVICE_ROOT_URL}/react4xp/${name}`),
                        () => runEntryCalls(entriesWithTargetIdsAndProps, entryNames, callback),
                    )
                );
            })
            .catch(error => {
                console.log(error);
            });
    }
}


const getContainer = (targetId) => {
    let container = null;
    try {
        if (!targetId) {
            throw Error(`${LIBRARY_NAME}.CLIENT can't mount component into target container: missing targetId`);
        }
        container = document.getElementById(targetId);

    } catch (e) { console.error(e); }

    if (!container) {
        throw Error(`${LIBRARY_NAME}.CLIENT can't mount component into target container: no DOM element with ID '${targetId}'`);
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
}

export function hydrate(Component, targetId, props) {
    const container = getContainer(targetId);
    const renderable = getRenderable(Component, props);
    ReactDOM.hydrate(renderable, container);
}
