import * as path from 'path';
import * as Mocha from 'mocha';
import * as glob from 'glob';

/**
 * Lightweight test runner for build validation only
 * Does NOT require VS Code to be running
 * Perfect for pre-commit checks
 */
export function run(): Promise<void> {
    // Create the mocha test
    const mocha = new Mocha({
        ui: 'tdd',
        color: true,
        timeout: 5000,
        reporter: 'spec'
    });

    const testsRoot = path.resolve(__dirname, '..');

    return new Promise((resolve, reject) => {
        // Only run build.test.js for quick validation
        glob('**/build.test.js', { cwd: testsRoot }, (err, files) => {
            if (err) {
                return reject(err);
            }

            if (files.length === 0) {
                console.log('No build tests found');
                return resolve();
            }

            // Add files to the test suite
            files.forEach(f => mocha.addFile(path.resolve(testsRoot, f)));

            try {
                // Run the mocha test
                mocha.run(failures => {
                    if (failures > 0) {
                        reject(new Error(`${failures} tests failed.`));
                    } else {
                        resolve();
                    }
                });
            } catch (err) {
                console.error(err);
                reject(err);
            }
        });
    });
}
