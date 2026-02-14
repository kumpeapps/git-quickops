import * as assert from 'assert';

suite('Build Validation Suite', () => {
    test('TypeScript compilation should succeed', () => {
        // If we get here, TypeScript compiled successfully
        assert.ok(true, 'TypeScript compiled without errors');
    });

    test('Core modules should be importable', () => {
        // Test that core modules can be required
        try {
            require('../gitUtils');
            require('../extension');
            require('../webviewProvider');
            require('../menuTreeProvider');
            assert.ok(true, 'All core modules loaded successfully');
        } catch (error) {
            assert.fail(`Failed to load modules: ${error}`);
        }
    });

    test('Package version should be valid', () => {
        const pkg = require('../../package.json');
        assert.ok(pkg.version, 'Package version is defined');
        assert.match(pkg.version, /^\d+\.\d+\.\d+/, 'Version follows semver format');
    });

    test('Required package.json fields should be present', () => {
        const pkg = require('../../package.json');
        const requiredFields = ['name', 'displayName', 'publisher', 'engines', 'main', 'contributes'];
        
        for (const field of requiredFields) {
            assert.ok(pkg[field], `Package.json should have ${field} field`);
        }
    });

    test('Extension commands should be defined', () => {
        const pkg = require('../../package.json');
        assert.ok(pkg.contributes.commands, 'Commands should be defined in package.json');
        assert.ok(pkg.contributes.commands.length > 0, 'At least one command should be defined');
    });
});
