const fs = require('fs');
const path = require('path');
const tailwind = require('./node_modules/tailwindcss/dist/lib.js');
const postcss = require('postcss');
const tailwindPlugin = require('@tailwindcss/postcss');
const autoprefixer = require('autoprefixer');

const input = path.resolve('src/styles.css');
const outputDir = path.resolve('dist');
const output = path.join(outputDir, 'styles.css');

async function build() {
  try {
    const css = fs.readFileSync(input, 'utf8');

    // Use Tailwind's compile API from the local package
    const result = await tailwind.compile({
      css,
      cwd: process.cwd(),
      config: path.resolve('tailwind.config.cjs'),
    });

    console.log('compile result shape:', Object.keys(result || {}));

    // Try common locations for returned CSS
    let outCss = result && (result.css || result.code || result?.output?.css);

    // If compile returned an object with build/buildSourceMap functions, try calling them.
    if (!outCss && result && typeof result.build === 'function') {
      try {
        // Some internal build functions expect no args and return an object with css/code
        const built = await result.build();
        console.log('build() returned keys:', Object.keys(built || {}));
        outCss = built && (built.css || built.code || built?.output?.css || built?.stylesheet);
      } catch (e) {
        console.warn('Calling result.build() failed, trying buildSourceMap...', e && e.message);
      }
    }

    if (!outCss && result && typeof result.buildSourceMap === 'function') {
      try {
        const built = await result.buildSourceMap();
        console.log('buildSourceMap() returned keys:', Object.keys(built || {}));
        outCss = built && (built.css || built.code || built?.output?.css || built?.stylesheet || (built?.result && (built.result.css || built.result.code)));
      } catch (e) {
        console.warn('Calling result.buildSourceMap() failed:', e && e.message);
      }
    }

    // Fallback: try compileAst if present on the package itself
    if (!outCss && typeof tailwind.compileAst === 'function') {
      try {
        const astResult = await tailwind.compileAst({ css, cwd: process.cwd(), config: path.resolve('tailwind.config.cjs') });
        console.log('compileAst result shape:', Object.keys(astResult || {}));
        // Some compileAst implementations return an object containing build()/toResult() etc.
        if (astResult && typeof astResult.build === 'function') {
          const built = await astResult.build();
          outCss = built && (built.css || built.code || built?.output?.css || built?.stylesheet);
        } else if (astResult && (astResult.css || astResult.code || astResult?.output?.css)) {
          outCss = astResult.css || astResult.code || astResult.output.css;
        }
      } catch (e) {
        console.warn('compileAst attempt failed:', e && e.message);
      }
    }

    // If we still don't have CSS, or the returned CSS still contains @tailwind directives,
    // run PostCSS with the tailwindcss plugin as a fallback to expand the directives.
    const needsPostcss = !outCss || (typeof outCss === 'string' && outCss.includes('@tailwind'));
    if (needsPostcss) {
      console.log('Falling back to PostCSS + tailwindcss plugin to produce final CSS...');
      try {
        const postcssResult = await postcss([
          // Let the @tailwindcss/postcss plugin resolve the config from the working directory.
          tailwindPlugin(),
          autoprefixer,
        ]).process(outCss || css, { from: input, to: output });
        outCss = postcssResult.css;
      } catch (e) {
        console.error('PostCSS fallback failed:', e && e.stack ? e.stack : e);
        process.exit(1);
      }
    }

    if (!outCss) {
      console.error('Tailwind compile did not return CSS. Full result (trimmed):', Object.keys(result || {}).length ? result : result);
      process.exit(1);
    }

    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(output, outCss);
    console.log('Built', output);
  } catch (err) {
    console.error(err && err.stack ? err.stack : err);
    process.exit(1);
  }
}

if (require.main === module) build();

module.exports = build;
