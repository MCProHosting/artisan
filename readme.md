# Artisan

Artisan is a framework for development of large-scale (e.g. > 50,000 LOC) Node.js applications. It's inspired in part by [c9/architect](https://github.com/c9/architect), [Angular](https://github.com/angular/angular.js), and the [Laravel framework](https://github.com/laravel/framework/). It emphasizes It features:

 * Dependency injection
 * Awesome testability
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

#### Dependency Injection

Dependency injection is done through modules. This is fairly standard stuff. We focus on preparing functions for injection when they're created, rather than at consumption, so that they may be used in harmony with 3rd party systems.

Note that, in these resolutions, modules need not be registered until they're actually required.

**To make a basic module**:

```js
// Module named "smallRandom" with no dependencies. The result
// calling the module will be provided to others.
app.module('smallRandom', function () {
    return function () {
        return Math.ceil(Math.random() * 10)
    };
});
// Named module, "largeRandom", that consumes smallRandom.
app.module(['smallRandom', function (smallRandom) {
    return function () {
        return smallRandom() * 10
    };
}]);
// Unnamed module, which can only be used as a function in turn.
var getBeers = app.module(['largeRandom', function (largeRandom) {
    return function () {
        console.log('There are ' + largeRandom() + ' bottles of beer on the wall.')
    }
}]);

getBeers();

// Or perhaps more gracefully, we can do it Angular-style
function beerrrs (largeRandom) {
    return function () {
        console.log('There are ' + largeRandom() + ' bottles of beer on the wall.')
    }
}
beerrrs.$inject = ['largeRandom'];

// Create a function which takes our $inject
// and resolves it to a set of modules.
getBeers = app.resolve(beerrrs);
getBeers();
```

**A more object-oriented approach**:

```js
// Define a new class...
function Coder (smallRandom) {
    this.skill = smallRandom();
}
Coder.$inject = ['smallRandom'];

// Find out how many bugs we killed today (dependent on skill).
Coder.prototype.bugsKilled = function (largeRandom) {
    return largeRandom() * this.skill;
};
Coder.prototype.bugsKilled.$inject = ['largeRandom'];

// We can use the resolved Coder just like we normally would.
// It's magic!
module.export = app.resolve(Coder);
```

**Loading whole directories!**:
Directory tree:
```
random
    |-- small.js
    |-- large.js
    +-- strings
        |-- uuid.js
```

And example module, large.js:
```js
module.exports = function (smallRandom) {
    return smallRandom() * 10;
}

module.exports.$inject = ['random.small'];
```

Consuming it:
```js
// Load it up...
app.module('random');

app.module(['random.large', 'random.strings.uuid', function (random, uuid) {
    return function () {
        console.log('User ' + uuid() + ' is ' + random() + 'x as cool as you.');
    }
}]);
```

**Mocks:** You can, of course, mock anything in the IoC for testing purposes.

```js
app.mock('smallRandom', function () {
    return function () {
        return 42;
    }
});

var Coder = require('./coder');
console.log(new Coder.skill); // will output 42

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
app.command('addUser', AddUserCommand);
```

**Example Usage:**

```js
    register: function (req, res) {
        var cmd = app.command('addUser', req.param('username'), req.param('password'));
        
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
function userValidate (someLibrary, command, callback) {
    var data = { user: command.username, pass: command.password}
    if (someLibrary.isValid()) {
        callback();
    } else {
        callback('Noupe, try again!');
    }
}
userValidate.$inject = ['someValidationLibrary'];

app.module('user.validate', userValidate);

```
