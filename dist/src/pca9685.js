"use strict";
/*
 * src/pca9685.ts
 * https://github.com/101100/pca9685
 *
 * Library for PCA9685 I2C 16-channel PWM/servo driver.
 *
 * Copyright (c) 2015 Jason Heard
 * Licensed under the MIT license.
 */
Object.defineProperty(exports, "__esModule", { value: true });
var debugFactory = require("debug");
var Observable_1 = require("rxjs/Observable");
var Subject_1 = require("rxjs/Subject");
require("rxjs/add/operator/concatMap");
var constants = {
    modeRegister1: 0x00,
    modeRegister1Default: 0x01,
    sleepBit: 0x10,
    restartBit: 0x80,
    modeRegister2: 0x01,
    modeRegister2Default: 0x04,
    channel0OnStepLowByte: 0x06,
    channel0OnStepHighByte: 0x07,
    channel0OffStepLowByte: 0x08,
    channel0OffStepHighByte: 0x09,
    registersPerChannel: 4,
    allChannelsOnStepLowByte: 0xFA,
    allChannelsOnStepHighByte: 0xFB,
    allChannelsOffStepLowByte: 0xFC,
    allChannelsOffStepHighByte: 0xFD,
    channelFullOnOrOff: 0x10,
    preScale: 0xFE,
    stepsPerCycle: 4096,
    defaultAddress: 0x40,
    defaultFrequency: 50,
    baseClockHertz: 25000000
};
function defaultCallback(err) {
    if (err) {
        console.log("Error writing to PCA8685 via I2C", err);
    }
}
var Pca9685Driver = (function () {
    /**
     * Constructs a new PCA9685 driver.
     *
     * @param options
     *     Configuration options for the driver.
     * @param callback
     *     Callback called once the driver has been initialized.
     */
    function Pca9685Driver(options, callback) {
        var _this = this;
        if (typeof options !== "object") {
            throw new Error("options must be an object.");
        }
        if (!options.i2c) {
            throw new Error("options.i2c must be specified.");
        }
        if (typeof callback !== "function") {
            throw new Error("callback must be a function.");
        }
        if (options.debug) {
            debugFactory.enable("pca9685");
        }
        this.i2c = options.i2c;
        this.address = options.address || constants.defaultAddress;
        this.commandSubject = new Subject_1.Subject();
        this.debug = debugFactory("pca9685");
        this.frequency = options.frequency || constants.defaultFrequency;
        var cycleLengthMicroSeconds = 1000000 / this.frequency;
        this.stepLengthMicroSeconds = cycleLengthMicroSeconds / constants.stepsPerCycle;
        this.send = this.send.bind(this);
        var sendOnePacket = function (command, byte, sendCallback) {
            _this.i2c.writeByte(_this.address, command, byte, sendCallback);
        };
        // create a stream that will send each packet group in sequence using the async writeByte command
        this.commandSubject
            .concatMap(function (group) {
            return new Observable_1.Observable(function (subscriber) {
                var nextPacket = 0;
                function sendNextPacket(err) {
                    if (err) {
                        // notify the callback of the error
                        callback(err);
                        // complete the stream so that the next I2C packet group can be sent
                        subscriber.complete();
                    }
                    else if (nextPacket < group.packets.length) {
                        var thisPacket = nextPacket;
                        nextPacket += 1;
                        sendOnePacket(group.packets[thisPacket].command, group.packets[thisPacket].byte, sendNextPacket);
                    }
                    else {
                        // notify the callback with a success (no error parameter)
                        group.callback();
                        // complete the stream so that the next I2C packet group can be sent
                        subscriber.complete();
                    }
                }
                sendNextPacket();
            });
        })
            .subscribe();
        this.debug("Reseting PCA9685");
        // queue initialization packets
        this.send([
            { command: constants.modeRegister1, byte: constants.modeRegister1Default },
            { command: constants.modeRegister2, byte: constants.modeRegister2Default }
        ], function (sendError) {
            if (sendError) {
                callback(sendError);
            }
            else {
                _this.allChannelsOff(function (offError) {
                    if (offError) {
                        callback(offError);
                    }
                    else {
                        _this.setFrequency(_this.frequency, callback);
                    }
                });
            }
        });
    }
    /**
     * Clean up the PCA9685 driver by turning off all channels and preventing future commands.
     */
    Pca9685Driver.prototype.dispose = function () {
        this.allChannelsOff();
        this.commandSubject.complete();
        this.commandSubject.unsubscribe();
    };
    /**
     * Sets the on and off steps for the given channel.
     *
     * @param channel
     *     Output channel to configure.
     * @param onStep
     *     The step number when the channel should turn on.
     * @param offStep
     *     The step number when the channel should turn off.
     * @param callback
     *     Optional callback called once the  on and off steps has been set for the given channel.
     */
    Pca9685Driver.prototype.setPulseRange = function (channel, onStep, offStep, callback) {
        if (typeof channel !== "number" || channel < 0 || channel > 15) {
            throw new Error("channel must be in the range 0 to 15.");
        }
        if (typeof onStep !== "number" || onStep < 0 || onStep > 0xFFF) {
            throw new Error("onStep must be in the range 0 to 4095 (0xFFF).");
        }
        if (typeof offStep !== "number" || offStep < 0 || offStep > 0xFFF) {
            throw new Error("offStep must be in the range 0 to 4095 (0xFFF).");
        }
        this.debug("Setting PWM channel, channel: %d, onStep: %d, offStep: %d", channel, onStep, offStep);
        this.send([
            { command: constants.channel0OnStepLowByte + constants.registersPerChannel * channel, byte: onStep & 0xFF },
            { command: constants.channel0OnStepHighByte + constants.registersPerChannel * channel, byte: (onStep >> 8) & 0x0F },
            { command: constants.channel0OffStepLowByte + constants.registersPerChannel * channel, byte: offStep & 0xFF },
            { command: constants.channel0OffStepHighByte + constants.registersPerChannel * channel, byte: (offStep >> 8) & 0x0F }
        ], callback || defaultCallback);
    };
    /**
     * Sets the pulse length for the given channel.
     *
     * @param channel
     *     Output channel to configure.
     * @param pulseLengthMicroSeconds
     *     The length of the pulse for the given channel in microseconds.
     * @param onStep
     *     Optional The step number when the channel should turn on (defaults
     *     to 0).
     * @param callback
     *     Optional callback called once the pulse length has been set for the given channel.
     */
    Pca9685Driver.prototype.setPulseLength = function (channel, pulseLengthMicroSeconds, onStep, callback) {
        if (onStep === void 0) { onStep = 0; }
        if (typeof channel !== "number" || channel < 0 || channel > 15) {
            throw new Error("Channel must be in the range 0 to 15.");
        }
        if (typeof pulseLengthMicroSeconds !== "number") {
            throw new Error("pulseLengthMicroSeconds must be a number.");
        }
        if (onStep && (typeof onStep !== "number" || onStep < 0 || onStep > 0xFFF)) {
            throw new Error("onStep must be in the range 0 to 4095 (0xFFF).");
        }
        this.debug("Setting PWM channel, channel: %d, pulseLength: %d, onStep: %d", channel, pulseLengthMicroSeconds, onStep);
        if (pulseLengthMicroSeconds <= 0.0) {
            this.channelOff(channel, callback);
            return;
        }
        var pulseLengthInSteps = Math.round(pulseLengthMicroSeconds / this.stepLengthMicroSeconds) - 1;
        if (pulseLengthInSteps > 0xFFF) {
            this.channelOn(channel, callback);
            return;
        }
        var offStep = (onStep + pulseLengthInSteps) % constants.stepsPerCycle;
        this.setPulseRange(channel, onStep, offStep, callback);
    };
    /**
     * Sets the duty cycle for the given channel.
     *
     * @param channel
     *     Output channel to configure.
     * @param dutyCycleDecimalPercentage
     *     The duty cycle for the given channel as a decimal percentage.
     * @param onStep
     *     Optional The step number when the channel should turn on (defaults
     *     to 0).
     * @param callback
     *     Optional callback called once the duty cycle has been set for the given channel.
     */
    Pca9685Driver.prototype.setDutyCycle = function (channel, dutyCycleDecimalPercentage, onStep, callback) {
        if (onStep === void 0) { onStep = 0; }
        if (typeof channel !== "number" || channel < 0 || channel > 15) {
            throw new Error("Channel must be in the range 0 to 15.");
        }
        if (typeof dutyCycleDecimalPercentage !== "number") {
            throw new Error("dutyCycleDecimalPercentage must be a number.");
        }
        if (onStep && (typeof onStep !== "number" || onStep < 0 || onStep > 0xFFF)) {
            throw new Error("onStep must be in the range 0 to 4095 (0xFFF).");
        }
        this.debug("Setting PWM channel, channel: %d, dutyCycle: %d, onStep: %d", channel, dutyCycleDecimalPercentage, onStep);
        if (dutyCycleDecimalPercentage <= 0.0) {
            this.channelOff(channel, callback);
            return;
        }
        else if (dutyCycleDecimalPercentage >= 1.0) {
            this.channelOn(channel, callback);
            return;
        }
        var offStep = (onStep + Math.round(dutyCycleDecimalPercentage * constants.stepsPerCycle) - 1) % constants.stepsPerCycle;
        this.setPulseRange(channel, onStep, offStep, callback);
    };
    /**
     * Turns all channels off.
     *
     * @param callback
     *     Optional callback called once all of the channels have been turned off.
     */
    Pca9685Driver.prototype.allChannelsOff = function (callback) {
        this.debug("Turning off all channels");
        // Setting the high byte of the all channel off step to 0x10 will turn
        // off all channels.
        this.send([{ command: constants.allChannelsOffStepHighByte, byte: constants.channelFullOnOrOff }], callback || defaultCallback);
    };
    /**
     * Turns off the given channel.
     *
     * @param channel
     *     Output channel to turn off.
     * @param callback
     *     Optional callback called once the channel has been turned off.
     */
    Pca9685Driver.prototype.channelOff = function (channel, callback) {
        if (typeof channel !== "number" || channel < 0 || channel > 15) {
            throw new Error("Channel must be in the range 0 to 15.");
        }
        this.debug("Turning off channel: %d", channel);
        // Setting the high byte of the off step to 0x10 will turn off the channel.
        this.send([{ command: constants.channel0OffStepHighByte + constants.registersPerChannel * channel, byte: constants.channelFullOnOrOff }], callback || defaultCallback);
    };
    /**
     * Turns on the given channel.
     *
     * @param channel
     *     Output channel to turn on.
     * @param callback
     *     Optional callback called once the channel has been turned on.
     */
    Pca9685Driver.prototype.channelOn = function (channel, callback) {
        if (typeof channel !== "number" || channel < 0 || channel > 15) {
            throw new Error("Channel must be in the range 0 to 15.");
        }
        this.debug("Turning on channel: %d", channel);
        // Setting the high byte of the on step to 0x10 will turn on the channel
        // as long as the high byte of the off step does not have the bit 0x10 set.
        this.send([
            { command: constants.channel0OnStepHighByte + constants.registersPerChannel * channel, byte: constants.channelFullOnOrOff },
            { command: constants.channel0OffStepHighByte + constants.registersPerChannel * channel, byte: 0 }
        ], callback || defaultCallback);
    };
    /**
     * Queue the given I2C packets to be sent to the PCA9685 over the I2C bus.
     *
     * @param packets
     *     The I2C packets to send.
     * @param callback
     *     Callback called once the packets have been sent or an error occurs.
     */
    Pca9685Driver.prototype.send = function (packets, callback) {
        this.commandSubject.next({ packets: packets, callback: callback });
    };
    /**
     * Set the internal frequency of the PCA9685 to the given value.
     *
     * @param frequency
     *     The new frequency value.
     * @param callback
     *     Callback called once the frequency has been sent or an error occurs.
     */
    Pca9685Driver.prototype.setFrequency = function (frequency, callback) {
        // 25MHz base clock, 12 bit (4096 steps per cycle)
        var prescale = Math.round(constants.baseClockHertz / (constants.stepsPerCycle * frequency)) - 1;
        this.debug("Setting PWM frequency to %d Hz", frequency);
        this.debug("Pre-scale value: %d", prescale);
        this.i2c.readByte(this.address, constants.modeRegister1, Pca9685Driver.createSetFrequencyStep2(this.send, this.debug, prescale, callback));
    };
    Pca9685Driver.createSetFrequencyStep2 = function (sendFunc, debug, prescale, callback) {
        callback = typeof callback === "function" ? callback : function () { return; };
        return function setFrequencyStep2(err, byte) {
            if (err) {
                debug("Error reading mode (to set frequency)", err);
                callback(err);
            }
            var oldmode = byte;
            var newmode = (oldmode & ~constants.restartBit) | constants.sleepBit;
            debug("Setting prescale to: %d", prescale);
            sendFunc([
                { command: constants.modeRegister1, byte: newmode },
                { command: constants.preScale, byte: Math.floor(prescale) },
                { command: constants.modeRegister1, byte: oldmode }
            ], function (sendError) {
                if (sendError) {
                    callback(sendError);
                }
                else {
                    // documentation says that 500 microseconds are required
                    // before restart is sent, so a timeout of 10 milliseconds
                    // should be plenty
                    setTimeout(function () {
                        debug("Restarting controller");
                        sendFunc([{ command: constants.modeRegister1, byte: oldmode | constants.restartBit }], callback);
                    }, 10);
                }
            });
        };
    };
    return Pca9685Driver;
}());
exports.Pca9685Driver = Pca9685Driver;