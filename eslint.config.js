"use strict";

const js = require("@eslint/js");

module.exports = [
  js.configs.recommended,
  {
    files: ["app.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "script",
      globals: {
        SERVER_TOUR_DATA: "readonly",
        document: "readonly",
        window: "readonly",
        console: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        requestAnimationFrame: "readonly",
      },
    },
  },
  {
    files: ["data.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "script",
    },
  },
  {
    files: ["eslint.config.js"],
    languageOptions: {
      globals: {
        require: "readonly",
        module: "readonly",
      },
    },
  },
  require("eslint-config-prettier"),
];
