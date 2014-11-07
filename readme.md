# Artisan

Artisan is a framework for development of large-scale (e.g. > 50,000 LOC) Node.js applications. It's inspired in part by [c9/architect](https://github.com/c9/architect), [Angular](https://github.com/angular/angular.js), and the [Laravel framework](https://github.com/laravel/framework/). It emphasizes It features:

 * Dependency injection
 * Good testability - DI, after all
 * Command-based architecture
 * Facades

Currently it is targeted for server-side only.

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
            });
            
            // Load the "submodule" as well.
            app.load('./strings');
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
        
        // You can also "inject" yourself before or after stages.
        cmd.after('user.validate', function (cmd, next) {
            if (iLikeThisPerson(cmd)) {
                next();
            } else {
                res.status(400).json('You need to send me cookies first.');
            }
        });
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
