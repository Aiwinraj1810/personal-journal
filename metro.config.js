const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Lets Metro treat Drizzle's generated .sql migration files as source so
// babel-plugin-inline-import (see babel.config.js) can inline them as strings.
config.resolver.sourceExts.push('sql');
// expo-sqlite's web implementation loads a wasm SQLite build — only relevant
// if this app is ever run with `expo start --web` (it's primarily a native
// mobile app per AGENTS.md), but this keeps that bundling path from erroring.
config.resolver.assetExts.push('wasm');

module.exports = withNativeWind(config, { input: './src/global.css' });
