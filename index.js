const CSSBuilder = require('./css-builder');
const JSBuilder = require('./js-builder');
const fs = require('fs').promises;
const path = require('path');

class BuildSystem {
  constructor(config = {}) {
    this.config = {
      // CSS Configuration
      css: {
        inputDir: 'css',
        outputDir: 'dist/css',
        sourceMaps: true,
        autoprefixer: true,
        purgeCSS: false,
        ...config.css
      },
      
      // JavaScript Configuration
      js: {
        inputDir: 'js',
        outputDir: 'dist/js',
        sourceMaps: true,
        minify: true,
        babel: true,
        bundle: false,
        target: 'es5',
        ...config.js
      },

      // Global Configuration
      watch: config.watch || false,
      production: config.production || false,
      clean: config.clean || false,
      parallel: config.parallel !== false,
      ...config
    };

    // Initialize builders
    this.cssBuilder = new CSSBuilder({
      ...this.config.css,
      watch: false // We'll handle watching at the system level
    });

    this.jsBuilder = new JSBuilder({
      ...this.config.js,
      watch: false, // We'll handle watching at the system level
      production: this.config.production
    });
  }

  async clean() {
    if (!this.config.clean) return;

    console.log('🧹 Cleaning build directories...');
    
    try {
      const rimraf = require('rimraf');
      await rimraf(this.config.css.outputDir);
      await rimraf(this.config.js.outputDir);
      console.log('✅ Build directories cleaned successfully!\n');
    } catch (error) {
      console.error('❌ Error cleaning directories:', error.message);
    }
  }

  async buildCSS() {
    console.log('🎨 Building CSS...');
    try {
      await this.cssBuilder.buildAll();
      return true;
    } catch (error) {
      console.error('❌ CSS build failed:', error.message);
      return false;
    }
  }

  async buildJS() {
    console.log('⚡ Building JavaScript...');
    try {
      if (this.config.js.bundle) {
        await this.jsBuilder.bundleApp();
      } else {
        await this.jsBuilder.buildAll();
      }
      return true;
    } catch (error) {
      console.error('❌ JavaScript build failed:', error.message);
      return false;
    }
  }

  async buildAll() {
    console.log('🚀 Starting complete build process...\n');
    const startTime = Date.now();

    // Clean if requested
    await this.clean();

    let cssSuccess = false;
    let jsSuccess = false;

    if (this.config.parallel) {
      // Build CSS and JS in parallel
      console.log('🔄 Running parallel build...\n');
      const [cssResult, jsResult] = await Promise.allSettled([
        this.buildCSS(),
        this.buildJS()
      ]);

      cssSuccess = cssResult.status === 'fulfilled' && cssResult.value;
      jsSuccess = jsResult.status === 'fulfilled' && jsResult.value;
    } else {
      // Build sequentially
      console.log('🔄 Running sequential build...\n');
      cssSuccess = await this.buildCSS();
      jsSuccess = await this.buildJS();
    }

    const endTime = Date.now();
    const totalTime = endTime - startTime;

    // Build summary
    console.log('\n📊 Build Summary:');
    console.log(`   🎨 CSS: ${cssSuccess ? '✅ Success' : '❌ Failed'}`);
    console.log(`   ⚡ JS: ${jsSuccess ? '✅ Success' : '❌ Failed'}`);
    console.log(`   ⏱️  Total time: ${totalTime}ms`);
    console.log(`   🏗️  Mode: ${this.config.parallel ? 'Parallel' : 'Sequential'}`);

    if (cssSuccess && jsSuccess) {
      console.log('\n🎉 Build completed successfully!');
      return true;
    } else {
      console.log('\n💥 Build completed with errors!');
      return false;
    }
  }

  async watch() {
    if (!this.config.watch) return;

    const chokidar = require('chokidar');
    console.log('👀 Starting watch mode...\n');

    // Initial build
    await this.buildAll();

    // CSS watcher
    const cssWatcher = chokidar.watch(`${this.config.css.inputDir}/**/*.css`, {
      ignored: /\.min\.css$/,
      persistent: true
    });

    cssWatcher.on('change', async (filePath) => {
      console.log(`🎨 CSS file changed: ${filePath}`);
      await this.buildCSS();
    });

    // JS watcher
    const jsWatcher = chokidar.watch(`${this.config.js.inputDir}/**/*.js`, {
      ignored: /\.min\.js$/,
      persistent: true
    });

    jsWatcher.on('change', async (filePath) => {
      console.log(`⚡ JS file changed: ${filePath}`);
      await this.buildJS();
    });

    console.log('👀 Watching for file changes... (Press Ctrl+C to stop)');

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n🛑 Stopping watch mode...');
      cssWatcher.close();
      jsWatcher.close();
      process.exit(0);
    });
  }

  async getProjectStats() {
    const stats = {
      css: { files: 0, totalSize: 0 },
      js: { files: 0, totalSize: 0 }
    };

    try {
      // CSS stats
      const cssFiles = await fs.readdir(this.config.css.outputDir);
      for (const file of cssFiles.filter(f => f.endsWith('.css'))) {
        const filePath = path.join(this.config.css.outputDir, file);
        const stat = await fs.stat(filePath);
        stats.css.files++;
        stats.css.totalSize += stat.size;
      }

      // JS stats
      const jsFiles = await fs.readdir(this.config.js.outputDir);
      for (const file of jsFiles.filter(f => f.endsWith('.js'))) {
        const filePath = path.join(this.config.js.outputDir, file);
        const stat = await fs.stat(filePath);
        stats.js.files++;
        stats.js.totalSize += stat.size;
      }
    } catch (error) {
      // Directories might not exist yet
    }

    return stats;
  }

  async showStats() {
    const stats = await this.getProjectStats();
    
    console.log('📈 Project Statistics:');
    console.log(`   🎨 CSS Files: ${stats.css.files} (${(stats.css.totalSize / 1024).toFixed(2)} KB)`);
    console.log(`   ⚡ JS Files: ${stats.js.files} (${(stats.js.totalSize / 1024).toFixed(2)} KB)`);
    console.log(`   📦 Total Size: ${((stats.css.totalSize + stats.js.totalSize) / 1024).toFixed(2)} KB`);
  }
}

// Configuration presets
const presets = {
  development: {
    production: false,
    parallel: true,
    clean: false,
    css: {
      sourceMaps: true,
      purgeCSS: false
    },
    js: {
      sourceMaps: true,
      minify: false,
      target: 'modern'
    }
  },

  production: {
    production: true,
    parallel: true,
    clean: true,
    css: {
      sourceMaps: false,
      purgeCSS: true
    },
    js: {
      sourceMaps: true,
      minify: true,
      bundle: true,
      target: 'es5'
    }
  },

  modern: {
    production: true,
    parallel: true,
    css: {
      sourceMaps: false,
      purgeCSS: true
    },
    js: {
      sourceMaps: false,
      minify: true,
      bundle: true,
      target: 'modern',
      format: 'es'
    }
  }
};

// CLI support
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];
  
  // Determine preset
  let preset = 'development';
  if (args.includes('--production')) preset = 'production';
  if (args.includes('--modern')) preset = 'modern';

  const config = {
    ...presets[preset],
    watch: args.includes('--watch'),
    clean: args.includes('--clean'),
    parallel: !args.includes('--sequential')
  };

  const buildSystem = new BuildSystem(config);

  switch (command) {
    case 'build':
      buildSystem.buildAll();
      break;
    case 'watch':
      buildSystem.watch();
      break;
    case 'clean':
      buildSystem.clean();
      break;
    case 'stats':
      buildSystem.showStats();
      break;
    case 'css':
      buildSystem.buildCSS();
      break;
    case 'js':
      buildSystem.buildJS();
      break;
    default:
      console.log('🛠️  Advanced Build System');
      console.log('Usage: node index.js [command] [options]');
      console.log('');
      console.log('Commands:');
      console.log('  build     Build CSS and JavaScript');
      console.log('  watch     Build and watch for changes');
      console.log('  clean     Clean build directories');
      console.log('  stats     Show build statistics');
      console.log('  css       Build CSS only');
      console.log('  js        Build JavaScript only');
      console.log('');
      console.log('Options:');
      console.log('  --production   Production build');
      console.log('  --modern       Modern browser build');
      console.log('  --watch        Watch for changes');
      console.log('  --clean        Clean before build');
      console.log('  --sequential   Sequential build (not parallel)');
      break;
  }
}

module.exports = { BuildSystem, CSSBuilder, JSBuilder };