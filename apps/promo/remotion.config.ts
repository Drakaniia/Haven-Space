/**
 * Note: When using the Node.JS APIs, the config file
 * doesn't apply. Instead, pass options directly to the APIs.
 *
 * All configuration options: https://remotion.dev/docs/config
 */

import { Config } from "@remotion/cli/config";

Config.setRspack(true);
Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
Config.setDefaultPremountInSeconds(2);

// Captions are read straight from docs/promo-voiceover.md, so they can't drift from the voiceover.
Config.overrideBundlerConfig((config) => ({
  ...config,
  module: {
    ...config.module,
    rules: [...(config.module?.rules ?? []), { test: /\.md$/, type: "asset/source" }],
  },
}));
