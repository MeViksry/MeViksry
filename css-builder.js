const fs = require('fs').promises;
const path = require('path');
const cssnano = require('cssnano');
const postcss = require('postcss');
const autoprefixer = require('autoprefixer');
const purgecss = require('@fullhuman/postcss-purgecss');

class CSSBuilder {
  constructor(config = {}) {
    this.config = {
      inputDir: config.inputDir || 'css',
      outputDir: config.outputDir || 'dist',
      sourceMaps: config.sourceMaps !== false,
      autoprefixer: config.autoprefixer !== false,
      purgeCSS: config.purgeCSS || false,
      watch: config.watch || false,
      ...config
    };

    this.plugins = this.getPlugins();
  }

  getPlugins() {
    const plugins = [];

    // Add autoprefixer if enabled
    if (this.config.autoprefixer) {
      plugins.push(autoprefixer({
        overrideBrowserslist: ['> 1%', 'last 2 versions', 'not dead'],
        ...this.config.autoprefixerOptions
      }));
    }

    // Add PurgeCSS if enabled
    if (this.config.purgeCSS) {
      plugins.push(purgecss({
        content: ['**/*.html', '**/*.js', '**/*.jsx', '**/*.ts', '**/*.tsx'],
        defaultExtractor: content => content.match(/[\w-/:]+(?<!:)/g) || [],
        ...this.config.purgeCSSOptions
      }));
    }

    // Add cssnano for minification
    plugins.push(cssnano({
      preset: ['default', {
        discardComments: { removeAll: true },
        normalizeWhitespace: true,
        ...this.config.cssnanoOptions
      }]
    }));

    return plugins;
  }

  async ensureDirectoryExists(dirPath) {
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
    }
  }

  async processFile(inputFile, outputFile) {
    try {
      console.log(`📦 Processing: ${inputFile}`);
      
      const inputCss = await fs.readFile(inputFile, 'utf8');
      const startTime = Date.now();

      const result = await postcss(this.plugins).process(inputCss, {
        from: inputFile,
        to: outputFile,
        map: this.config.sourceMaps ? {
          inline: false,
          annotation: true
        } : false
      });

      // Ensure output directory exists
      await this.ensureDirectoryExists(path.dirname(outputFile));

      // Write CSS file
      await fs.writeFile(outputFile, result.css);
      
      // Write source map if enabled
      if (result.map && this.config.sourceMaps) {
        await fs.writeFile(`${outputFile}.map`, result.map.toString());
        console.log(`✅ Source map created: ${outputFile}.map`);
      }

      const endTime = Date.now();
      const fileSize = Buffer.byteLength(result.css, 'utf8');
      
      console.log(`✅ ${path.basename(outputFile)} created successfully!`);
      console.log(`   Size: ${(fileSize / 1024).toFixed(2)} KB`);
      console.log(`   Time: ${endTime - startTime}ms\n`);

      return result;
    } catch (error) {
      console.error(`❌ Error processing ${inputFile}:`, error.message);
      throw error;
    }
  }

  async buildFile(fileName) {
    const inputFile = path.join(this.config.inputDir, fileName);
    const outputFileName = fileName.replace('.css', '.min.css');
    const outputFile = path.join(this.config.outputDir, outputFileName);

    try {
      await fs.access(inputFile);
      return await this.processFile(inputFile, outputFile);
    } catch {
      console.warn(`⚠️  File not found: ${inputFile}`);
      return null;
    }
  }

  async buildAll() {
    console.log('🚀 Starting CSS build process...\n');
    const startTime = Date.now();

    try {
      // Ensure input directory exists
      await fs.access(this.config.inputDir);
    } catch {
      console.error(`❌ Input directory not found: ${this.config.inputDir}`);
      return;
    }

    try {
      // Get all CSS files from input directory
      const files = await fs.readdir(this.config.inputDir);
      const cssFiles = files.filter(file => 
        file.endsWith('.css') && !file.endsWith('.min.css')
      );

      if (cssFiles.length === 0) {
        console.warn('⚠️  No CSS files found in input directory');
        return;
      }

      // Process files in parallel for better performance
      const results = await Promise.allSettled(
        cssFiles.map(file => this.buildFile(file))
      );

      // Summary
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      const totalTime = Date.now() - startTime;

      console.log('📊 Build Summary:');
      console.log(`   ✅ Successful: ${successful}`);
      if (failed > 0) console.log(`   ❌ Failed: ${failed}`);
      console.log(`   ⏱️  Total time: ${totalTime}ms`);

    } catch (error) {
      console.error('❌ Build failed:', error.message);
    }
  }

  async watch() {
    if (!this.config.watch) return;

    const chokidar = require('chokidar');
    console.log(`👀 Watching ${this.config.inputDir} for changes...\n`);

    const watcher = chokidar.watch(`${this.config.inputDir}/**/*.css`, {
      ignored: /\.min\.css$/,
      persistent: true
    });

    watcher.on('change', async (filePath) => {
      console.log(`🔄 File changed: ${filePath}`);
      const fileName = path.basename(filePath);
      await this.buildFile(fileName);
    });

    watcher.on('add', async (filePath) => {
      console.log(`➕ New file: ${filePath}`);
      const fileName = path.basename(filePath);
      await this.buildFile(fileName);
    });
  }
}

// Configuration examples
const configs = {
  // Basic configuration
  basic: {
    inputDir: 'css',
    outputDir: 'dist',
    sourceMaps: true
  },

  // Advanced configuration with PurgeCSS
  advanced: {
    inputDir: 'src/css',
    outputDir: 'public/css',
    sourceMaps: true,
    autoprefixer: true,
    purgeCSS: true,
    purgeCSSOptions: {
      content: ['src/**/*.html', 'src/**/*.js'],
      safelist: ['active', 'hidden', /^btn-/]
    }
  },

  // Production configuration
  production: {
    inputDir: 'assets/css',
    outputDir: 'dist/css',
    sourceMaps: false,
    autoprefixer: true,
    purgeCSS: true,
    cssnanoOptions: {
      preset: ['advanced', {
        reduceIdents: false,
        discardUnused: false
      }]
    }
  }
};

// Usage examples
async function main() {
  // Choose configuration
  const config = configs.basic;
  const builder = new CSSBuilder(config);

  // Build specific files
  await builder.buildFile('styles.css');
  await builder.buildFile('vendor.css');

  // Or build all CSS files
  // await builder.buildAll();

  // Enable watch mode for development
  // await builder.watch();
}

// CLI support
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];
  
  const builder = new CSSBuilder({
    watch: args.includes('--watch'),
    sourceMaps: !args.includes('--no-maps'),
    purgeCSS: args.includes('--purge')
  });

  switch (command) {
    case 'build':
      builder.buildAll();
      break;
    case 'watch':
      builder.buildAll().then(() => builder.watch());
      break;
    default:
      console.log('Usage: node css-builder.js [build|watch] [options]');
      console.log('Options:');
      console.log('  --watch      Enable watch mode');
      console.log('  --no-maps    Disable source maps');
      console.log('  --purge      Enable PurgeCSS');
      break;
  }
}

module.exports = CSSBuilder;
