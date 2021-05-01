// const { JSHandle, ElementHandle } = require("puppeteer");
var checks = { str, num, eq, check, lt, gt, le, exists };

for (var i = 0; i <= 10; i++) {
    let indx = i;
    checks["$" + indx] = async function (context, selection, args) {        
        return selection[indx];
    }
}

async function str(context, selection, args) {
    //TODO: based on element type: DOM, jHandle - here should be different processing 

    var arg = args && args[0];
    if (arg.constructor &&  arg.constructor.name == "JSHandle") {
        var res = await context.page.evaluate((el) => {
            return el.toString();
        }, arg) 
        return res;
    }
    else if (arg.constructor && arg.constructor.name == "ElementHandle") { //DOM element 
        var res = await context.page.evaluate((el) => {
            return el.textContent;
        }, arg) 
        return res;
    }
    else if (arg instanceof HTTPResponse) {
        return arg.text();
    }
    return (arg || "").toString(); 
}

async function num(context, selection, args) {
    return parseFloat(await str(context, selection, args));
}

async function eq(context, selection, exprs) {
    if (!exprs || exprs.length != 2) throw new Error("eq check requires two arguments")
    var res0 = await check(context, selection, exprs[0]);
    var res1 = await check(context, selection, exprs[1]);
    return res0 == res1; //TODO: case of comparison of JSON objects - more generic comparison in necessary
}

async function binNumFunc(f, context, selection, exprs) {
    if (!exprs || exprs.length != 2) throw new Error("eq check requires two arguments")
    var res0 = await check(context, selection, exprs[0]);
    var res1 = await check(context, selection, exprs[1]);
    if (isNaN(res0)) throw new Error(`lt first argument is not a number: ${res0}`); //TODO: trim res0 and res1
    if (isNaN(res1)) throw new Error(`lt second argument is not a number ${res1}`);
    return f(res0, res1); 
}

async function lt(context, selection, exprs) {
    return await binNumFunc((r1, r2) => r1 < r2, context, selection, exprs);
}

async function gt(context, selection, exprs) {
    return await binNumFunc((r1, r2) => r1 > r2, context, selection, exprs);
}

async function le(context, selection, exprs) {
    return await binNumFunc((r1, r2) => r1 <= r2, context, selection, exprs);
}

async function exists(context, selection, exprs) {
    if (!exprs || exprs.length != 1) throw new Error("eexists check requires one argument")
    var res0 = await check(context, selection, exprs[0]);
    if (typeof res0 === 'undefined') return false; 
    return true;
}
//etc TODO: think of js expression for validation but in restrained context

async function check(context, selection, exprs) {
    if (!exprs || exprs.length == 0) throw new Error(`Check expression was not specified`);
    var expr = exprs.shift();
    if (expr in checks) {
        var f = checks[expr];
        return await f(context, selection, exprs)
    }
    else if (!isNaN(expr)) return expr;
    else if (typeof expr == "string") return expr;
    throw new Error(`Unknown check expression: ${expr}`)
}

module.exports = checks;