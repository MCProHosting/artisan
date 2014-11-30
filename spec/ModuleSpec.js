describe('The module system', function () {
    var app = require('./fixture/index');

    beforeEach(function () {
        app.reset();
    });

    it('should not load modules unless eager', function () {
        // no eager loading
        expect(app.isLoaded('moduleA')).toBe(false);
        // eager loading
        expect(app.isLoaded('moduleB')).toBe(true);
        // submodule should not be loaded, and not throw an error
        expect(app.isLoaded('moduleA.subModule')).toBe(false);
    });

    it('should load modules when necessary', function () {
        app('moduleA.a');

        // should now be loaded
        expect(app.isLoaded('moduleA')).toBe(true);
        // sub should still not be loaded
        expect(app.isLoaded('moduleA.subModule')).toBe(false);

        app('moduleA.subModule.a');

        // sub should now be loaded
        expect(app.isLoaded('moduleA.subModule')).toBe(true);
    });

    it('should correctly reset itself', function () {
        app('moduleA.a');
        app.reset();
        expect(app.isLoaded('moduleA')).toBe(false);
    });

    it('should resolve modules correctly', function () {
        expect(app('moduleA.a')).toBe('moduleA.a loaded');
        expect(app('moduleA.b')).toBe('moduleA.b loaded with moduleA.a loaded');
        expect(app('moduleA.c')).toBe('moduleA.c loaded with moduleA.b loaded with moduleA.a loaded');
    });

    it('should mock unloaded modules', function () {
        app.mock('moduleA.a', function () { return 'mockd!'; });
        expect(app('moduleA.b')).toBe('moduleA.b loaded with mockd!');
    });

    it('should mock loaded modules', function () {
        expect(app('moduleA.b')).toBe('moduleA.b loaded with moduleA.a loaded');
        app.mock('moduleA.a', function () { return 'mockd!'; });
        expect(app('moduleA.b')).toBe('moduleA.b loaded with mockd!');
    });

    it('should literal mock unloaded modules', function () {
        expect(app('moduleA.b', {
            'moduleA.a': 'mockd!'
        })).toBe('moduleA.b loaded with mockd!');
    });


    it('should literal mock loaded modules', function () {
        expect(app('moduleA.b')).toBe('moduleA.b loaded with moduleA.a loaded');
        expect(app('moduleA.b', {
            'moduleA.a': 'mockd!'
        })).toBe('moduleA.b loaded with mockd!');
    });

    it('should unmock unloaded correctly', function () {
        app.mock('moduleA.a', function () { return 'mockd!'; });
        app.unmock();
        expect(app('moduleA.b')).toBe('moduleA.b loaded with moduleA.a loaded');
    });

    it('should unmock loaded correctly', function () {
        expect(app('moduleA.b')).toBe('moduleA.b loaded with moduleA.a loaded');
        app.mock('moduleA.a', function () { return 'mockd!'; });
        app.unmock();
        expect(app('moduleA.b')).toBe('moduleA.b loaded with moduleA.a loaded');
    });

    it('should also unmock during reset', function () {
        app.mock('moduleA.a', function () { return 'mockd!'; });
        app.reset();
        expect(app('moduleA.b')).toBe('moduleA.b loaded with moduleA.a loaded');
    });
});
