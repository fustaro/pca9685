"use strict";
/*
 * index.ts
 * https://github.com/101100/pca9685
 *
 * Library for PCA9685 I2C 16-channel PWM/servo driver.
 *
 * Copyright (c) 2015-2016 Jason Heard
 * Licensed under the MIT license.
 */
Object.defineProperty(exports, "__esModule", { value: true });
var pca9685_1 = require("./src/pca9685");
exports.default = pca9685_1.Pca9685Driver;
exports.Pca9685Driver = pca9685_1.Pca9685Driver;