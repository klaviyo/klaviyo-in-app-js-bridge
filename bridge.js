/**
 * WARNING: This JS file will be used in older versions of iOS and Android webviews,
 * Please check MDN for feature support, and when in doubt, fall back on ECMAScript 5.
 *
 * Some common utilities that may be UNSAFE:
 *  - Optional chaining
 *  - Spread operator
 *
 * However! not everything in ECMA Script 6 is verboten, for example the following should be safe:
 *  - const keyword
 *  - Arrow functions
 *
 * Inject this script file from native code into the head of the HTML document.
 * Format string like this, where strWrapperScript is the contents of this file
 * and strJsonOpts is the json-encoded handoff parameters detailed below
 * Always be careful to put quotes around your string arguments! *
 *
 *    "(" + strWrapperScript + ")('" + strJsonOpts + "');"
 *
 * @param strJsonOpts - JSON encoded handoff dictionary containing:
 *    messageHandlerName: String - name of the native message handler
 *    defaultAction: String - default action keyword for data posted from JS -> Native
 */
function initKlaviyoBridge(strJsonOpts) {
    /**
     * Default options, overridden by anything passed in to init function
     */
    const defaultOpts = {
        // Name of the message handler that native is listening on
        messageHandlerName: "KlaviyoMessageHandler",

        // Default keyword for JS -> Native messaging
        defaultMessageAction: 'message',

        // Url to klaviyo.js
        klaviyoJsUrl: 'https://static.klaviyo.com/onsite/js/klaviyo.js',

        // Company ID (public API Key)
        companyId: null,

        // Option to pipe JS console output to message handler
        linkConsoles: false,
    }

    // Instantiate the bridge object
    const klaviyoBridge = new Bridge(JSON.parse(strJsonOpts))

    // Makes the bridge object available as a global variable
    window['KlaviyoBridge'] = klaviyoBridge

    if (/complete|interactive|loaded/.test(document.readyState)) {
        // In case the document has finished parsing, document's readyState will
        // be one of "complete", "interactive" or (non-standard) "loaded".
        klaviyoBridge.initializeInAppForms()
    } else {
        // The document is not ready yet, so wait for the DOMContentLoaded event
        // https://developer.mozilla.org/en-US/docs/Web/API/Document/DOMContentLoaded_event
        document.addEventListener('DOMContentLoaded', function () {
            klaviyoBridge.initializeInAppForms()
        }, false);
    }

    /**
     * Bridge object to handle communication between JavaScript and Native
     *
     * @param opts
     * @constructor
     */
    function Bridge(opts) {
        // Merge default and passed in options
        opts = Object.assign(defaultOpts, opts);

        if (opts.linkConsoles) {
            linkConsoleToMessageHandler()
        }

        return {
            opts: opts,

            initializeInAppForms: function initializeInAppForms() {
                const self = this
                loadKlaviyoJs(opts.klaviyoJsUrl, opts.companyId)

                // Once klaviyo.js has loaded, this event is broadcast on the window
                window.addEventListener(
                    'inAppFormsInitMessage',
                    function (event) {
                        self.initializeMessageBus(event)
                        self.postMessage("documentReady", {})
                    },
                    {once: true}
                );
            },

            initializeMessageBus: function initializeMessageBus(event) {
                const supportedEventTypes = event.detail.eventTypes;
                const messageBus = event.detail.messageBus

                console.log('Supporting message types:', supportedEventTypes);

                supportedEventTypes.forEach(function (eventType) {
                    console.log('Registering listener for eventType: ', eventType);
                    messageBus.addEventListener(eventType.toString(), function (e) {
                        klaviyoBridge.postMessage(e.type, e.detail);
                    });
                });
            },

            /**
             * Detect native message handler and return
             */
            getMessageHandler: function getMessageHandler() {
                const name = this.opts.messageHandlerName
                if (window['webkit'] && !!window['webkit']['messageHandlers'][name]) {
                    return window['webkit']['messageHandlers'][name];
                } else if (!!window[name]) {
                    return window[name];
                }
                throw new Error("Message handler '" + name + "' not found!")
            },

            /**
             * Method to post string message to native layer
             *
             * Native layer should implement a common interface
             * for reacting to messages of particular type
             *
             * @param type {String}
             * @param data {Object}
             */
            postMessage: function postMessage(type, data) {
                try {
                    const messageHandler = this.getMessageHandler()
                    const message = JSON.stringify({
                        type: type || this.opts.defaultMessageAction,
                        data: data || {}
                    })
                    messageHandler.postMessage(message);
                } catch (e) {
                    unlinkConsole()
                    console.error(e)
                }
            },
        }
    }

    /**
     * Load klaviyo.js by appending script tag to doc
     *
     * @param url
     * @param companyId
     */
    function loadKlaviyoJs(url, companyId) {
        const scriptElement = document.createElement("script");
        scriptElement.type = "text/javascript";
        scriptElement.src = url + "?company_id=" + companyId;
        document.head.append(scriptElement);
    }

    function onElementAvailable(selector, callback) {
        const observer = new MutationObserver(mutations => {
            if (document.querySelector(selector)) {
                observer.disconnect();
                callback();
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    function onElementRemoved(selector, callback) {
        const observer = new MutationObserver(mutations => {
            if (!document.querySelector(selector)) {
                observer.disconnect();
                callback();
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    const consoleMethods = ["log", "debug", "info", "warn", "error"];

    /**
     * Pipe all console output to native layer through message handler
     */
    function linkConsoleToMessageHandler() {
        consoleMethods.forEach(function (method) {
            console["_" + method] = console[method]

            console[method] = function () {
                let args = Array.prototype.slice.call(arguments, 0),
                    message;

                try {
                    message = JSON.stringify(args);
                } catch (e) {
                    message = "Couldn't serialize message";
                }

                klaviyoBridge.postMessage("console", {
                    level: method,
                    message: message
                });

                return console["_" + method].apply(console, arguments);
            };
        });
    }

    /**
     * Undo console linkage (e.g. if message handler is broken
     */
    function unlinkConsole() {
        consoleMethods.forEach(function (method) {
            if (console["_" + method]) {
                console[method] = console["_" + method]
                delete console["_" + method]
            }
        })
    }
}
