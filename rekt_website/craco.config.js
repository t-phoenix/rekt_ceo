const path = require("path");

const MEME_API_PROXY_TARGET =
  process.env.REACT_APP_MEME_API_URL || "https://rekt-automations.onrender.com";

const BRANDIFY_API_PROXY_TARGET =
  process.env.REACT_APP_BRANDIFY_API_URL || "https://rekt-ceo-brandification.onrender.com";

module.exports = {
    style: {
        postcss: {
            mode: "file",
        },
    },
    devServer: {
        // Local dev: proxy all meme API routes to avoid CORS (especially x402 402 responses)
        proxy: {
            "/meme-api": {
                target: MEME_API_PROXY_TARGET,
                pathRewrite: { "^/meme-api": "" },
                changeOrigin: true,
                secure: true,
            },
            "/brandify-api": {
                target: BRANDIFY_API_PROXY_TARGET,
                pathRewrite: { "^/brandify-api": "" },
                changeOrigin: true,
                secure: true,
            },
        },
    },
    webpack: {
        configure: (webpackConfig) => {
            // Add @ alias for src directory
            webpackConfig.resolve.alias = {
                ...webpackConfig.resolve.alias,
                "@": path.resolve(__dirname, "src"),
            };

            // Find the source-map-loader rule and exclude node_modules
            const sourceMapLoaderRule = webpackConfig.module.rules.find(
                (rule) => rule.enforce === 'pre' && rule.loader && rule.loader.includes('source-map-loader')
            );

            if (sourceMapLoaderRule) {
                // Exclude node_modules from source-map-loader to prevent warnings
                // about missing source files in third-party packages
                sourceMapLoaderRule.exclude = /node_modules/;
            }

            // Fix for TronWeb and other packages using .cjs extension
            webpackConfig.module.rules.push({
                test: /\.cjs$/,
                type: 'javascript/auto'
            });

            // Add Node.js polyfills for Nexus SDK and its dependencies
            webpackConfig.resolve.fallback = {
                ...webpackConfig.resolve.fallback,
                crypto: require.resolve('crypto-browserify'),
                stream: require.resolve('stream-browserify'),
                http: require.resolve('stream-http'),
                https: require.resolve('https-browserify'),
                buffer: require.resolve('buffer/'),
                url: require.resolve('url/'),
                process: require.resolve('process/browser.js'),
                vm: false, // Not needed, set to false
            };

            // Provide process and Buffer globals
            const webpack = require('webpack');
            webpackConfig.plugins.push(
                new webpack.ProvidePlugin({
                    process: 'process/browser.js',
                    Buffer: ['buffer', 'Buffer'],
                })
            );

            // Suppress known-safe third-party warnings (CI/Vercel treats warnings as errors)
            webpackConfig.ignoreWarnings = [
                /Can't resolve '@gemini-wallet\/core'/,
                /Can't resolve 'porto'/,
                /Can't resolve 'porto\/internal'/,
                // ox (viem dep) dynamically imports node:worker_threads for Node-only code paths
                {
                    module: /node_modules[/\\]ox/,
                    message: /Critical dependency: the request of a dependency is an expression/,
                },
            ];

            return webpackConfig;
        },
    },
};
