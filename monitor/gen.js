const {VM} = require('vm2');

var gens = { randInt };

const vm = new VM({
    timeout: 1000,
    sandbox: gens
});

// function concat(context, exprs) {
//     var res = "";
//     for (var i = 0; i < exprs.length; i++) {
//         res += gen(context, exprs[i]);
//     }
//     return res;
// }

function randInt(context, exprs) {
    return Math.round(Math.random() * 1000000);
}

//TODO: add generators 


function gen(context, expr) {
    if (expr.eval) {
        var value = vm.run(expr.eval);
        if (expr.bind) {
            context.vars[expr.bind] = value;
        }
        return value;
    }
    return expr;
    // if (!Array.isArray(exprs)) return exprs;
    // if (!exprs || exprs.length == 0) throw new Error("Cannot generate value");
    // var gen = exprs.shift();
    // if (gen in gens) {
    //     return gens[gen](context, exprs);
    // }
    // throw new Error(`Cannot find generator ${gen}`);
}

module.exports = gen;