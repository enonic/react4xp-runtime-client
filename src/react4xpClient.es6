import ReactDOM from 'react-dom';

//import "@babel/polyfill"

// const SERVICE_ROOT_URL and LIBRARY_NAME are provided at buildtime by the react constants file via webpack

/** Adjusted version of https://www.oreilly.com/library/view/high-performance-javascript/9781449382308/ch01.html#I_programlisting1_d1e1051
  * in order to parallelly load internally independent scripts from multiple urls, and only when they've ALL completely loaded
  * and run, run the callback.
  * @param urls Mandatory array (or single string) of urls to load as scripts and run
  * @param callback Optional function to run once all scripts are complete */
function loadScripts(urls, callback) {

    // Prevents a lot of bad input in one line: url is missing, null, an empty or only-spaces string, empty array or array where all the items are strings are with non-space with a single empty or only-spaces string
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

    let scriptsToComplete = urls.length;

    function maybeCallback() {
        scriptsToComplete -= 1;
        if (scriptsToComplete === 0 && typeof callback === 'function') {
            callback();
        }
    }

    try {
        uniqueUrls.forEach(url => {
            try {
                const script = document.createElement("script")
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
                loadScripts(dependencyUrls, () => {
                    loadScripts(entryNames.map(name => `${SERVICE_ROOT_URL}/react4xp/${name}`), () => {
                        entryNames.forEach(entryName => {
                            const trimmedEntryName = (entryName || "").trim();
                            if (trimmedEntryName === "") {
                                return;
                            }

                            const script = document.createElement("script")
                            script.type = "text/javascript";
                            script.src = url;
                            const inlineScript = document.createTextNode(`${LIBRARY_NAME}._CLIENT_.render(${LIBRARY_NAME}['${trimmedEntryName}'], ${JSON.stringify(entriesWithTargetIdsAndProps[entryName].targetId)}, ${JSON.stringify(entriesWithTargetIdsAndProps[entryName].props)})`);
                            script.appendChild(inlineScript);
                            document.getElementsByTagName("head")[0].appendChild(script);
                        });
                    });
                });
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

