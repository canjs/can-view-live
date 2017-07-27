/*can-view-live@3.2.0#lib/util/runInOrder*/
module.exports = function makeRunInOrder() {
    var running = 0;
    var tasks = [];
    return function runInOrder(fn) {
        return function () {
            var fnArgs = arguments;
            if (running) {
                tasks.push({
                    fn: fn,
                    args: fnArgs
                });
                return;
            }
            running++;
            fn.apply(null, fnArgs);
            running--;
            while (tasks.length) {
                running++;
                tasks[0].fn.apply(null, tasks[0].args);
                tasks.shift();
                running--;
            }
        };
    };
};