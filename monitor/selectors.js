const jp = require("jsonpath");
const u = require("./utils");
const xpath = require("xpath");
const xmlParser = require("xmldom").DOMParser;
// const puppeteer = require("puppeteer");

async function css (context, selector) {
    //we do not use queryObjects - because it is limited css selectors 
    //NOTE: this is logic for css selectors
    try {
        const jsHandle = await context.page.evaluateHandle((query) => window._$_(query)[0], selector.query)
        // var selectedElementsArr = await selectedElements.jsonValue();
        if (jsHandle && jsHandle.asElement) {
            var selectedElement = jsHandle.asElement();
            if (!selectedElement || !(selectedElement.constructor.name == "ElementHandle")) return null;
            return selectedElement;
        }
    } catch (e) {
        //return null;        
    }
    return null;
} 

//query is an array (ex. ['store', 'book', 0, 'author']) to specify property/function in js state
async function javascript (context, selector) {
    const jsHandle = await context.page.evaluateHandle((query) => {
        var cur = window; 
        while (query.length > 0) {
            let prop = query.shift();
            cur = cur[prop];
            if (!cur) return null;
        }
        return cur;
    }, selector.query);
    //TODO: check for nulls;
    return jsHandle;
}

async function vars (context, selector) {
    return context.vars[selector.query] || null; //query here is just name of var - but jpath is also expected 
}

async function jsonpath (context, selector) {
    return jp.query(context.vars, selector.query);
}

async function http (context, selector) {
    var foundReq = context.http.find(r => (r.method() == selector.method) && (r.url == selector.url));
    if (foundReq) {
        var resp = foundReq.response();
        if (resp) {
            var headers = resp.headers();
            var contentType = headers["Content-Type"];
            if (contentType == "application/json") {
                var respBody = await resp.json();
                return jp.query(respBody, selector.query);
            } else if (contentType == "text/xml") {
                var respBody = await resp.text();
                var doc = new xmlParser().parseFromString(respBody);
                return xpath.select(selector.query, doc);
            } else if (contentType == "text/plain") {
                //regex
                //NOTE: query type should be defined in selector
                //TODO: error handling
            }
        }
    }
}

var selectors = { css, vars, jsonpath, http, javascript };

async function select(context, selector) {
	if (selector.type in selectors) {
        const selectorFunc = selectors[selector.type];
        if (selector.vars) {
            Object.keys(selector.vars).forEach(v => {
                let variable = selector.vars[v];
                let varValue = context.vars[variable].toString(); //TODO
                selector.query = selector.query.replace(v, varValue)
            });
        }
		let element = await selectorFunc(context, selector);
		if (element == null) {
            return null; //throw new u.PolicyError(`Cannot find element: ${selector}`, context.step, null);			
		}
		if (selector.bind) {
			context.vars[selector.bind] = element;
		}
		return element;
	} else {
        // throw new u.PolicyError(`Unknown selector type: ${selector}`, context.step, null);
        return null;
	}
}

module.exports.select = select;