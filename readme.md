# Artisan

Artisan is a framework for development of large-scale (e.g. > 50,000 LOC) Node.js applications. It's inspired in part by [c9/architect](https://github.com/c9/architect), [Angular](https://github.com/angular/angular.js), and the [Laravel framework](https://github.com/laravel/framework/). It emphasizes It features:

 * Dependency injection
 * Good testability - DI, after all
 * Command-based architecture

Currently it is targeted for server-side only.

## Usage

Quick/basic demo:

```js
// Create an application instance.
var app = require('node-artisan')();

// Create some module with no dependencies.
app.module('smallRandom', function () {
    return function () {
        Math.ceil(Math.random() * 10)
    };
});

// Create an anonymous module that depends on another.
var largeRandom = app.module(['smallRandom', function (smallRandom) {
    return function () {
        smallRandom() * 10
    };
}]);

// It can then be used just like any other function!
console.log(largeRandom());
```

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
    |-- package.json
    +-- strings
        |-- index.js
        |-- uuid.js
someModule
    |-- index.js
```

**Index.js**

```js
module.exports = function (app) {
    var modules = app.import(['someModule']);
    
    return {
        // Just requirin stuff, like you normally would...
        small: require('./small')(),
        large: require('./large')(modules.someModule),
        // Load the "strings" submodule, relative to this one.
        strings: app.import(['./strings']);
    }
}
```

Note: when mocking or unmocking dependencies, all modules are "reloaded", so expect that the function you export may be called multiple times.

**Consuming it:** in test.js

```js
// Load it up...
var random = app.import('./random');

console.log(random.small());
```

**Mocks:** You can, of course, mock anything for testing purposes.

```js
app.mock('random', function () {
    return {
        small: function () {
        return 42;
        }
    };
});

console.log(random.small()); // will output 42

// You can reverse the mocks you made by name...
app.unmock('smallRandom'); 
// Or just entirely
app.unmock();
```

#### Commands

This is where things get fun. The [command pattern](http://en.wikipedia.org/wiki/Command_pattern) is really great for promoting loosely coupled systems, and pairs well with Node.js asyncness!

**Instantiation:**

```js
var artisan = require('node-artisan');
// Lets say we have a command to create a user,
// with a name and password
function AddUserCommand (username, password) {
    // Set up our initial data. The command itself may be used to
    // persist data between command stages.
    this.username = username;
    this.password = password;

    // Define the modules we want to hit. These will get
    // the command as their first input argument. It's async!
    // Keys will be called after everything they depend upon
    // are completed.
    this.route = {
        // Validate doesn't need anything to run, it'll go first.
        'user.validate': [], 
        // Hash the password after validation
        'hashPassword': ['user.validate'], 
        // And send the welcome email out at the same time
        'user.welcome': ['user.validate'], 
        // Only after those two are done, add the user.
        'user.insert': ['hashPassword', 'user.welcome']
    }

    _.extend(this, artisan.command);
}

// Bind the user to the command. You can, of course, use $inject
// in the command as well.
app.command('add', AddUserCommand);
```

**Example Usage:**

```js
    register: function (req, res) {
        var cmd = app.command('user.add', req.param('username'), req.param('password'));
        
        // Dispatch returns a Bluebird promise.
        cmd.dispatch()
            .then(function () {
                return res.json(cmd.theUserModel);
            })
            .catch(function (e) {
                return res.status(400).json(e);
            })
    }
```

**Example Handler:**

```js
function userValidate (command, callback) {
    var data = { user: command.username, pass: command.password };
    if (someLibrary.isValid(data)) {
        callback();
    } else {
        callback('Noupe, try again!');
    }
}
```
