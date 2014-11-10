# Artisan

[![Build Status](https://travis-ci.org/MCProHosting/artisan.svg)](https://travis-ci.org/MCProHosting/artisan)

Artisan is a framework for development of large-scale (e.g. > 50,000 LOC) Node.js applications. It's inspired in part by [c9/architect](https://github.com/c9/architect), [Angular](https://github.com/angular/angular.js), and the [Laravel framework](https://github.com/laravel/framework/). It features:

 * Dependency injection
 * Good testability - DI, after all
 * more to come?

Currently it is targeted for server-side only, and is quite performant. After the intial module loading (which should happen once on application boot), it can run about 3.4 million resolutions per second on my Macbook Air and scales in O(1) time:

```
$ node bench.js
Time to run: 35ms at 29959314 op/s.
Time to run: 29ms at 36157793 op/s.
Time to run: 30ms at 34952533 op/s.

-------------

Average time to run: 31ms
Average ops per second: 33825032
```

## Usage


#### Bootstrapping

You need to define an application to while you'll bind modules and commands. This is done like so:

```js
var app = require('node-artisan')();
```

#### Dependency Injection (sorta)

Dependency injection-ish is done through modules. Why no real DI? Well, Javascript doesn't have type hinting, so true DI is a messy business, at best.

Note that, in these resolutions, modules need not be registered until they're actually required.

**Directory tree:** Index.js is always the "main" package.

```
test.js
random
    |-- small.js
    |-- large.js
    |-- index.js
    +-- strings
        |-- index.js
        |-- uuid.js
someModule
    |-- index.js
```

**random/index.js**

The index acts as a service provider, binding items to the application as we need them.

```js
module.exports = function (app) {

    return {
        // register the services this provider, in the application
        register: function (app) {
            // Define some service it provides
            app.module('small', function () {
                return require('./small');
            });
            // Define a service that depends on another service.
            app.module('large', ['someModule.service', function (m) {
                return require('./large')(m);
            }]);

            // Load all subdirectories of this as well.
            app.load('./');
        },
        // Whether the modules this providers should be loaded when we need
        // them, or right from the get-go.
        eager: false,
        // The name of the service provider determines how its
        // services will be access. For instance, we can now
        // access `random.small` - it's nested.
        name: "random"
    };
}
```

Note: when mocking or unmocking dependencies, all modules are "reloaded", so expect that the function you export may be called multiple times.

**Consuming it:** in test.js

```js
app.register('./');
// Load it up - you can resolve anything just by calling app()
var random = app('random.small');

console.log(random());
```

**Mocks:** You can, of course, mock anything for testing purposes.

```js
app.mock('random.small', function () {
    return function () {
        return 42;
    };
});

var random = app('random.small');
console.log(random()); // will output 42

// You can reverse the mocks you made by name...
app.unmock('random.small');
// Or just entirely
app.unmock();
```

#### Perform
