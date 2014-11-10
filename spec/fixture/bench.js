var app = require('./index');

var ops = 2 << 19;
var times = [];

for (var k = 3; k > 0; k--) {
    var start = Date.now();
    for (var i = ops; i > 0; i--) {
        app('moduleA.a');
    }

    var time = Date.now() - start;
    times.push(time);
    console.log('Time to run: ' + time + 'ms at ' + Math.round(1000 * ops / time) + ' op/s.');
}

function average(list) {
    var total = 0;
    list.forEach(function (item) {
        total += item;
    });

    return Math.round(total / list.length);
}

console.log('');
console.log('-------------');
console.log('');
var time = average(times);
console.log('Average time to run: ' + time + 'ms');
console.log('Average ops per second: ' + Math.round(1000 * ops / time));
