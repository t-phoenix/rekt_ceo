module.exports = {
    webpack: {
        configure: (webpackConfig) => {
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

            return webpackConfig;
        },
    },
};
