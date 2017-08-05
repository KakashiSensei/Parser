var path = require("path");
var webpack = require("webpack");

module.exports = {
    entry: [path.resolve(__dirname, "src/index.ts")],
    output: {
        path: path.resolve(__dirname, '_bundles'),
        filename: '[name].js',
        libraryTarget: 'umd',
        library: 'wl-parser',
        umdNamedDefine: true
    },
    resolve: {
        // Add `.ts` and `.tsx` as a resolvable extension.
        extensions: ['.ts', '.tsx', '.js'] // note if using webpack 1 you'd also need a '' in the array as well
    },
    devtool: 'cheap-module-eval-source-map',
    plugins: [
        new webpack.optimize.UglifyJsPlugin({
            minimize: true,
            sourceMap: true,
            include: /\.min\.js$/,
        }),
        new webpack.ProvidePlugin({
            Promise: "imports-loader?this=>global!exports-loader?global.Promise!bluebird",
            fetch: "imports-loader?this=>global!exports-loader?global.fetch!whatwg-fetch"
        }),
    ],
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                include: [
                    path.resolve(__dirname, "src")
                ],
                exclude: /node_modules/,
                loader: 'awesome-typescript-loader'
            }
        ]
    }
}