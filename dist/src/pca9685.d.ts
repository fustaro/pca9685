import { I2CBus } from "i2c-bus";
import "rxjs/operators/concatMap";
export interface Pca9685Options {
    /** An open I2CBus object to be used to communicate with the PCA9685 driver. */
    i2c: I2CBus;
    /**
     * The I2C address of the PCA9685 driver.
     *
     * If not specified, the default address of 0x40 will be used.
     *
     * @default 0x40
     */
    address?: number;
    /** If truthy, will configure debugging messages to be printed to the console. */
    debug?: boolean;
    /**
     * The frequency that should be used for the PCA9685 driver.
     *
     * If not specified, the default frequency of 50 Hz will be used.
     *
     * @default 50
     */
    frequency?: number;
}
export declare class Pca9685Driver {
    /**
     * Constructs a new PCA9685 driver.
     *
     * @param options
     *     Configuration options for the driver.
     * @param callback
     *     Callback called once the driver has been initialized.
     */
    constructor(options: Pca9685Options, callback: (error: any) => any);
    /**
     * Clean up the PCA9685 driver by turning off all channels and preventing future commands.
     */
    dispose(): void;
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
    setPulseRange(channel: number, onStep: number, offStep: number, callback?: (error: any) => any): void;
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
    setPulseLength(channel: number, pulseLengthMicroSeconds: number, onStep?: number, callback?: (error: any) => any): void;
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
    setDutyCycle(channel: number, dutyCycleDecimalPercentage: number, onStep?: number, callback?: (error: any) => any): void;
    /**
     * Turns all channels off.
     *
     * @param callback
     *     Optional callback called once all of the channels have been turned off.
     */
    allChannelsOff(callback?: (error: any) => any): void;
    /**
     * Turns off the given channel.
     *
     * @param channel
     *     Output channel to turn off.
     * @param callback
     *     Optional callback called once the channel has been turned off.
     */
    channelOff(channel: number, callback?: (error: any) => any): void;
    /**
     * Turns on the given channel.
     *
     * @param channel
     *     Output channel to turn on.
     * @param callback
     *     Optional callback called once the channel has been turned on.
     */
    channelOn(channel: number, callback?: (error: any) => any): void;
    /**
     * Queue the given I2C packets to be sent to the PCA9685 over the I2C bus.
     *
     * @param packets
     *     The I2C packets to send.
     * @param callback
     *     Callback called once the packets have been sent or an error occurs.
     */
    private send;
    /**
     * Set the internal frequency of the PCA9685 to the given value.
     *
     * @param frequency
     *     The new frequency value.
     * @param callback
     *     Callback called once the frequency has been sent or an error occurs.
     */
    private setFrequency;
    private static createSetFrequencyStep2;
    private address;
    private commandSubject;
    private debug;
    private frequency;
    private i2c;
    private stepLengthMicroSeconds;
}
