const fs = require('fs');
const { resolve } = require('path');
const readline = require('readline');
const { Stream } = require('stream');

let debug = process.argv.includes("--debug");
console.logd = function () {
	if (debug) {
		console.log.apply(console, arguments);
	}
};

String.prototype.escapeSpecialChars = function () {
    return this.replace(/\\n/g, "\\n")
        .replace(/\\'/g, "\\'")
        .replace(/\\"/g, '\\"')
        .replace(/\\&/g, "\\&")
        .replace(/\\r/g, "\\r")
        .replace(/\\t/g, "\\t")
        .replace(/\\b/g, "\\b")
        .replace(/\\f/g, "\\f");
};

//----------------------------------------------------------------

class TimeoutError extends Error {
    constructor(opt_error) {
        super(opt_error);
    }
}

class StartupError extends Error {
    constructor(msg) {
        super(msg);
    }
}

class RethrownError extends Error {
    constructor(msg, original) {
        super(msg);
        this.original = original;
    }
}

class PolicyError extends Error {
    constructor(msg, step, policy) {
        super(msg);
        this.step = step;
        this.policy = policy;
    }
}

class InputError extends Error {
    constructor(opt_error, line) {
        super(opt_error);
        this.line = line;
    }
}

function readFile(file) {
	return new Promise((resolve, reject) => 
		fs.readFile(__dirname + file, 'utf8', (err, data) => !err ? resolve(data) : reject(err)));
}
//----------------------------------------------------------------

function sleep(ms) {
    return new Promise((resolve, reject) => setTimeout(resolve, ms));
}
//----------------------------------------------------------------

function timeout(ms) {
    return new Promise((resolve, reject) => setTimeout(reject, ms, new timeoutError("Timeout")));
}
//----------------------------------------------------------------

function trackTime(timeoutMs) {
    let begin = Date.now();
	return function leftTime(wantTime) {
        var leftMs = timeoutMs - (Date.now() - begin);
        if (leftMs < 0) leftMs = 0;
        return (wantTime < leftMs) ? wantTime : leftMs;
    }
}

function timed(ms, otherPromise) {
	return Promise.race([ timeout(ms), otherPromise() ])
}

async function catchThrow(f, error) {
    try {
        await f; 
    } catch (e) {
        return error || e.message;
    }
}

async function rethrow(f, error) {
    try {
        if (f instanceof Function)
            f = f(); //assume no args is needed
        if (f instanceof Promise)
            var res = await f; 
        else 
            var res = f;
        return res;
    } catch (e) {
        if (typeof error == "string") error = new RethrownError(error, e);
        throw (error || e);
    }
}


function noThrow(fn, context, ...args) {
    try {
        return fn.apply(context, args);
    }
    catch(e) {
    }
}

function createStreamJsonReadliner(stream) {
    let awaitors = [];
    let results = [];
    if (!stream.reader) { //attached instance of readline
        stream.reader = readline.createInterface({
            input: stream
        }).on('line', async line => {
            try {
                console.logd(`Received line: ${line}`);
                let options = JSON.parse(line);
                if (awaitors.length > 0) {
                    let {resolve} = awaitors.shift();
                    resolve(options);
                } else {
                    results.push(options);
                }
            } catch (e) {
                let res = InputError(e.message, line);
                if (awaitors.length > 0) {
                    let {reject} = awaitors.shift();
                    reject(res);
                } else {
                    results.push(res);
                }
            }
        });        
    }
    return function readJsonLine() {
        return Promise((resolve, reject) => {
            if (results.length > 0) {
                let res = results.shift();
                if (res instanceof Error) reject(res);
                else resolve(res);
            } else 
                awaitors.push({resolve, reject});
        });
    }

}

module.exports.TimeoutError = TimeoutError; 
module.exports.RethrownError = RethrownError;
module.exports.PolicyError = PolicyError;
module.exports.StartupError = StartupError;

module.exports.sleep = sleep;
module.exports.readFile = readFile;
module.exports.timeout = timeout;
module.exports.trackTime = trackTime;
module.exports.timed = timed;
module.exports.rethrow = rethrow;
module.exports.catchThrow = catchThrow;
module.exports.noThrow = noThrow;
module.exports.createStreamJsonReadliner = createStreamJsonReadliner;