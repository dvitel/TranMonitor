const sel = require("./selectors");
const u = require("./utils");
const check = require("./check");
const gen = require("./gen")

async function goto (context, step) {
    try {
        await context.page.goto(step.url, { timeout: context.allocTime(step.timeout || 10000),  waitUntil: "load" }); 
    } catch (e) {
        throw new u.PolicyError(`Cannot reach ${step.url} in time`, step, null);
    }
    await u.sleep(context.allocTime(step.cooldown || 100));
}

async function click (context, step) {
    let element = await sel.select(context, step.selector || {}); 
        //default puppetter click uses window.querySelector - css. 
        //<a href="/New">New item</a> - css3 does not have :contains 
    if (element == null) throw new u.PolicyError(`Cannot find element for click`, step, null);
    try {
        await element.click();
        await u.sleep(context.allocTime(step.cooldown || 100));
    } catch (e) {
        throw new u.PolicyError(`Cannot click element`, step, null);
    }
}

async function input (context, step) {
    let element = await sel.select(context, step.selector || {});
    if (element == null) throw new u.PolicyError(`Cannot find element for input`, step, null);
    try {
        //here we check if text should be generated 
        var text = gen(context, step.text);
        await element.type(text);
        await u.sleep(context.allocTime(step.cooldown || 100));
    } catch (e) {
        throw new u.PolicyError(`Cannot input into element`, step, null);
    }
}

async function hover (context, step) {
    let element = await sel.select(context, step.selector || {});
    if (element == null) throw new u.PolicyError(`Cannot find hovered element`, step, null);
    try {
        await element.hover();
        await u.sleep(context.allocTime(step.cooldown || 100));
    } catch (e) {
        throw new u.PolicyError(`Cannot hover over element`, step, null);
    }
}

async function focus (context, step) {
    let element = await sel.select(context, step.selector || {});
    if (element == null) throw new u.PolicyError(`Cannot find element for focus`, step, null);
    try {
        await element.focus();
        await u.sleep(context.allocTime(step.cooldown || 100));
    } catch (e) {
        throw new u.PolicyError(`Cannot focus on element`, step, null);
    }
}

async function select (context, step) {
    let element = await sel.select(context, step.selector || {});
    if (element == null) throw new u.PolicyError(`Cannot find element for select`, step, null);
    //TODO: selection of option values
    try {
        var values = step.value;
        if (!Array.isArray(step.value)) {
            values = [step.value];
        }
        await element.select(...values);
        await u.sleep(context.allocTime(step.cooldown || 100));
    } catch (e) {
        throw new u.PolicyError(`Cannot select element`, step, null);
    }
}

//NOTE: listen for js function will 
//TODO
// async function listen (context, step) {		
//     if (step.selector.type == "javascript") { //currently we support only js and event here, but DOM waits are also possible 
//         //this step injects into page JS the function that collects events 
//         let jsObj = await sel.select(context, step.selector || {});
//         if (jsObj == null) throw new u.PolicyError(`Cannot find element to proxy: ${step.selector}`, step, null);
//         var 
//         context.page.evaluate((jsObj) => {
//             if (jsObj)
//         }, jsObj);
//     }
//     throw new u.PolicyError(`Cannot listen to selector ${step.selector}`);
// }

//we look where to jump only in main sequence and current fallback sequence
//TODO: have stack of sequenes and look inside this stack 
async function jmp (context, step) {
    if (!step.name) throw new u.PolicyError(`Step name for jump was not provided`, step, null);
    let curSeq = context.trans.pop();
    let stepIdOfCurTran = curSeq.findIndex(s => s.name == step.name);
    if (stepIdOfCurTran >= 0) {
        await tran(context, {tran:curSeq, startAt: stepIdOfCurTran});
        return; 
    }    
    if (context.trans.length > 0) {
        let mainSeq = context.trans.pop();

        let stepIdOfMainTran = mainSeq.findIndex(s => s.name == step.name);
        if (stepIdOfMainTran >= 0) {            
            await tran(context, {tran:mainSeq, startAt: stepIdOfMainTran });
            return;
        }
    }
    throw new u.PolicyError(`Step with name ${step.name} cannot be reached`, step, null);
}

//accepts reference in main sequence only (prev stacked  sequences)
async function retry (context, step) {
    if (!step.name) throw new u.PolicyError(`Step name for retry was not provided`, step, null);
    if (context.trans.length < 2) throw new u.PolicyError(`Retry should be used in fallback sequence`, step, null);
    context.stats.retries[step] = (context.stats.retries[step] || 0) + 1;
    if (context.stats.retries[step] > (step.maxTries || 1)) {
        throw new u.PolicyError(`Max retries count ${step.maxTries}`, step, null)
    }
    let curSeq = context.trans.pop();
    let mainSeq = context.trans.pop();

    let stepIdOfMainTran = mainSeq.findIndex(s => s.name == step.name);
    if (stepIdOfMainTran >= 0) {            
        await tran(context, {tran:mainSeq, startAt: stepIdOfMainTran });
        return;
    }
    throw new u.PolicyError(`Step with name ${step.name} cannot be reached`, step, null);
}

//policy.checker is an array [ func, arg, arg .... ] where arg could be another func 
//supported set of functions are defined in check.js
async function validate(context, step) {
    let policies = step.policy || [];
    for (var i = 0; i < policies.length; i++) { //policy is selector with checker, policy without represents check for existance 
        let policy = policies[i];
        try {
            var elements = await sel.select(context, policy.selector);
            if (!elements) elements = [];
            if (!Array.isArray(elements)) elements = [elements];
            var res = await check(context, elements, policy.check);
            if (!res) throw new u.PolicyError(`Policy was violated`, step, policy);
        } catch (e) {
            throw new u.PolicyError(`Policy check failed: ${e.message}`, step, policy);
        }
    }
}

async function query(context, step) { //just executes selector - simple validation
    let element = await sel.select(context, step.selector || {});
    if (element == null) throw new u.PolicyError(`Query returned no result`, step, null); 
}

const steps = { goto, click, input, select, hover, focus, tran, jmp, retry, validate, query };

//this is subsequence of steps - execution of main, fallback or named sequence
async function tran(context, {tran, startAt = 0}) { //step.tran contains sequence of steps
    context.trans.push(tran);
    var transaction = tran.slice(startAt);
    while (transaction.length > 0) {
        var step = transaction.shift(); //take step of tran sequence
        if (step.type in steps) {
            const stepFunc = steps[step.type];
            try {
                await stepFunc(context, step);
                context.stats.doneSteps.push({step, timestamp: Date.now()});
            } catch (e) {
                if (e instanceof u.PolicyError) {
                    if (e.policy && e.policy.fallback) {
                        await tran(context, {tran: e.policy.fallback});
                        return;
                    }
                    if (e.step && e.step.fallback) {
                        await tran(context, {tran: e.step.fallback});
                        return;
                    }
                }
                throw e;
            }
        } else {
            throw new Error(`Unsupported step type: ${step.type}`);
        }
    }
}

module.exports = steps;