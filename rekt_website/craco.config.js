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

            return webpackConfig;
        },
    },
};
