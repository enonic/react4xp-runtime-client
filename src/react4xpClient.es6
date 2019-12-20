// LIBRARY_NAME is provided at buildtime by the react constants file via webpack, SERVICE_URL_ROOT may or may not be added globally:
/* global LIBRARY_NAME, SERVICE_URL_ROOT */

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


/** After all the dependency and entry source scripts have been loaded and run, it's time to add a script tag that calls
  * the render method on each entry, and finally runs the callback */
function runEntryCalls(entriesWithTargetIdsAndProps, entryNames, callback) {

    const script = document.createElement("script");
    script.type = "text/javascript";

    let inlineScript = "\n";
    entryNames.forEach(entryName => {
        const trimmedEntryName = (entryName || "").trim();
        if (trimmedEntryName === "") {
            return;
        }

        inlineScript +=
            `${LIBRARY_NAME}.CLIENT.render(${LIBRARY_NAME}['${trimmedEntryName}'], ` +
            `${JSON.stringify(entriesWithTargetIdsAndProps[entryName].targetId)}, ` +
            `${JSON.stringify(entriesWithTargetIdsAndProps[entryName].props)});\n`;
    });

    if (typeof callback === 'function') {
        inlineScript += "(" + callback.toString() + ")();\n";
    }

    script.appendChild(document.createTextNode(inlineScript));
    document.getElementsByTagName("head")[0].appendChild(script);
}



/** Takes an object entriesWithTargetIdsAndProps where the keys are entry names (jsxPath) and the values are
  * objects with a mandatory targetId attribute and an optional props attribute - which is a regular object of any shape.
  * Uses the entry names and the React4xp runtime to figure out urls for all necessary dependencies for rendering all the
  * entries, then loads and runs the dependencies, loads and runs the entry component scripts and finally triggers the
  * rendering of the entries - in the order of the entry name keys in the entriesWithTargetIdsAndProps parameter.
  * @param entriesWithTargetIdsAndProps Mandatory object, { <entryName> -> { targetId: string, props: { ... react props for the entry}}}
  * @param callback Optional function called after the entire call chain.
  * @param serviceUrlRoot Root of the URL to the react4xp and react4xp-dependencies services. E.g. if they have the URLs
  * /_/service/my.app/react4xp/ and /_/service/my.app/react4xp-dependencies/, then serviceRootUrl should be /_/service/my.app (without
  * a trailing slash). Optional, sort of: you can define the constant SERVICE_URL_ROOT in global namespace and skip it. If you don't,
  * it's mandatory. */
export function renderWithDependencies(entriesWithTargetIdsAndProps, callback, serviceUrlRoot) {
    const entries = Object.keys(entriesWithTargetIdsAndProps) || [];

    const entryNames = entries
        .map(name => ((name || "") + "").trim())
        .filter(name => name !== "");

    if (entryNames.length > 0) {
        if (!serviceUrlRoot) {
            if (typeof SERVICE_URL_ROOT === 'undefined') {
                throw Error("Missing service URL root. Include it as a last argument " +
                    "or set a global variable constant SERVICE_URL_ROOT before calling renderWithDependencies.");
            }
            serviceUrlRoot = SERVICE_URL_ROOT;
        }

        fetch(`${serviceUrlRoot}/react4xp-dependencies?${entryNames.join("&")}`)
            .then(data => {
                return data.json();
            })
            .then(dependencyUrls => {
                loadScripts(
                    dependencyUrls,
                    () => loadScripts(
                        entryNames.map(name => `${serviceUrlRoot}/react4xp/${name}`),
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


const postFillBody = (component, json, region, regionName, regionsBuffer, regionsRemaining) => {
    if (json.body) {
        // TODO: Error if no body?
        const compTag = `<!--# COMPONENT ${component.path} -->`.replace(/\//g, '\/');

        regionsBuffer[regionName] = regionsBuffer[regionName].replace(new RegExp(compTag), json.body);

        if (regionsRemaining[regionName] === 0) {
            region.innerHTML = regionsBuffer[regionName];
        }
    }
};


const makeChild = pgContrib => {
    if (!pgContrib) {
        return null;
    }
    const html = Array.isArray(pgContrib) ?
        pgContrib.join('\n') :
        pgContrib;
    if (typeof html !== 'string') {
        throw Error(`Expected string array or string. React4xp cant't produce page contribution element from ${JSON.stringify(pgContrib)}`)
    }

    var div = document.createElement('div');
    div.innerHTML = html;
    return div.childNodes;
};

const getTargetElement = tag => {
    const elements = document.getElementsByTagName(tag);
    if (elements.length > 1) {
        throw Error(`Expected there to be only one <${tag}> element in the document. There are in fact ${elements.length}.`);
    }
    if (elements.length < 1 || !elements[0]) {
        throw Error(`Couldn't find a <${tag}> element in the document.`);
    }
    return elements[0];
};

const append = (newElements, targetElement) => {
    if (newElements) {
        for (let i = 0; i < newElements.length; i++) {
            targetElement.appendChild(newElements[i]);
        }
    }
};

const prepend = (newElements, targetElement) => {
    if (newElements) {
        const first = targetElement.firstChild;
        for (let i = 0; i < newElements.length; i++) {
            if (first) {
                targetElement.insertBefore(newElements[i], first);
            } else {
                targetElement.appendChild(newElements[i]);
            }
        }
    }
};

const PAGECONTRIBUTION_FUNCS = {
    headBegin: (child) => prepend(child, getTargetElement('head')),
    headEnd: (child) => append(child, getTargetElement('head')),
    bodyBegin: (child) => prepend(child, getTargetElement('body')),
    bodyEnd: (child) => append(child, getTargetElement('body')),
};

const postFillPageContributions = (json) => {
    if (json.pageContributions) {
        ['headBegin', 'headEnd', 'bodyBegin', 'bodyEnd'].forEach(pgKey => {
            const insertHtml = json.pageContributions[pgKey];
            if (insertHtml) {
                PAGECONTRIBUTION_FUNCS[pgKey](makeChild(insertHtml));
            }
        })
    }
};


const postFillRegions = (props) => {

    // If hasRegions, render iterates regions and their components, makes a call to lib-react4xp-service react4xp-component for each, looks for body and pageContributions. If body exists, replaces the corresponding tag with body. Runs pageContributions.
        const regionsBuffer = {};
        const regionsRemaining = {};
        Object.keys(props.regionsData || {}).forEach( regionName => {
            const components = props.regionsData[regionName].components || [];
            const region = document.querySelectorAll(`[data-portal-region='${regionName}']`)[0];

            //console.log(`\nregion '${regionName}':`, region);
            // TODO: check for length !== 1
            regionsBuffer[regionName] = region.innerHTML;
            regionsRemaining[regionName] = components.length;
            //console.log("regionHTML:", regionsBuffer[regionName]);

            components.forEach( component => {
                const [app, compName] = ((component.descriptor || '') + '').split(':');
                if (!app || !compName) {
                    throw Error("Missing or malformed descriptor - React4xp expected a .descriptor attribute like '<enonicXpAppName>:<componentName>, and therefore couldn't properly client-side-render this component: ", component);
                }

                const params = new URLSearchParams();
                params.append('compName', compName);
                params.append('config', JSON.stringify(component.config));
                params.append('type', component.type);
                const url = `/_/service/${app}/react4xp-component?${params.toString()}`;

                fetch(
                    url,
                    {
                        method: 'GET'
                    })
                    .then(data => {
                        return data.json();
                    })
                    .then(json => {
                        // console.log("Got some JSON:", json);

                        regionsRemaining[regionName] -= 1;
                        postFillBody(component, json, region, regionName, regionsBuffer, regionsRemaining);
                        postFillPageContributions(json);
                    })
                    .catch(error => {
                        console.error(error);
                    });
            });

        });
}

export function render(Component, targetId, props, isPage, hasRegions) {
    const container = getContainer(targetId);
    const renderable = getRenderable(Component, props);
    ReactDOM.render(renderable, container);

    if (hasRegions) {
        postFillRegions(props);
    }

}

export function hydrate(Component, targetId, props, isPage, hasRegions) {
    const container = getContainer(targetId);
    const renderable = getRenderable(Component, props);
    ReactDOM.hydrate(renderable, container);
}
