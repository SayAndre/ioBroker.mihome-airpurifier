"use strict";
/*
 * Created with @iobroker/create-adapter v1.23.0
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const utils = require("@iobroker/adapter-core");
const mi_air_purifier_1 = require("./air-purifier/mi-air-purifier");
const mi_air_purifier_constants_1 = require("./air-purifier/mi-air-purifier-constants");
const adapter_states_1 = require("./types/adapter-states");
class MiHomeAirPurifier extends utils.Adapter {
    constructor(options = {}) {
        super(Object.assign(Object.assign({}, options), { name: "mihome-airpurifier" }));
        this.miAirPurifier = new mi_air_purifier_1.MiAirPurifier("", "");
        this.reconnectInterval = 60;
        this.isConnected = false;
        this.on("ready", this.onReady.bind(this));
        this.on("objectChange", this.onObjectChange.bind(this));
        this.on("stateChange", this.onStateChange.bind(this));
        this.on("unload", this.onUnload.bind(this));
    }
    /**
     * Is called when databases are connected and adapter received configuration.
     */
    onReady() {
        return __awaiter(this, void 0, void 0, function* () {
            this.log.info("Started");
            this.miAirPurifier = new mi_air_purifier_1.MiAirPurifier(this.config.ipaddress, this.config.token);
            this.reconnectInterval = this.config.reconnectTime * 1000;
            this.initObjects();
            this.subscribeStates("*");
            this.setupListeners();
            this.connect();
        });
    }
    initObjects() {
        return __awaiter(this, void 0, void 0, function* () {
            const existingStates = Object.keys(yield this.getStatesAsync("*"));
            yield Promise.all(existingStates.map(state => this.delStateAsync(state)));
            yield this.setObjectNotExistsAsync(adapter_states_1.STATE_AIR_PURIFIER_CONTROL + adapter_states_1.STATE_AIR_PURIFIER_POWER, {
                type: "state",
                common: {
                    name: "Power On/Off",
                    type: "boolean",
                    role: "switch.power",
                    read: true,
                    write: true
                },
                native: {}
            });
            yield this.setObjectNotExistsAsync(adapter_states_1.STATE_AIR_PURIFIER_INFORMATION + adapter_states_1.STATE_AIR_PURIFIER_MODE, {
                type: "state",
                common: {
                    name: "Mode",
                    type: "string",
                    role: "text",
                    read: true,
                    write: false,
                    states: {
                        auto: "Auto",
                        night: "Night",
                        manual: "Manual"
                    }
                },
                native: {}
            });
            yield this.setObjectNotExistsAsync(adapter_states_1.STATE_AIR_PURIFIER_CONTROL + adapter_states_1.STATE_AIR_PURIFIER_MODE_NIGHT, {
                type: "state",
                common: {
                    name: "Night Mode",
                    type: "boolean",
                    role: "button.mode.night",
                    read: false,
                    write: true
                },
                native: {}
            });
            yield this.setObjectNotExistsAsync(adapter_states_1.STATE_AIR_PURIFIER_CONTROL + adapter_states_1.STATE_AIR_PURIFIER_MODE_AUTO, {
                type: "state",
                common: {
                    name: "Auto Mode",
                    type: "boolean",
                    role: "button.mode.auto",
                    read: false,
                    write: true
                },
                native: {}
            });
            yield this.setObjectNotExistsAsync(adapter_states_1.STATE_AIR_PURIFIER_CONTROL + adapter_states_1.STATE_AIR_PURIFIER_MODE_MANUAL, {
                type: "state",
                common: {
                    name: "Manual Mode",
                    type: "boolean",
                    role: "button.mode.manual",
                    read: false,
                    write: true
                },
                native: {}
            });
            yield this.setObjectNotExistsAsync(adapter_states_1.STATE_AIR_PURIFIER_CONTROL + adapter_states_1.STATE_AIR_PURIFIER_MANUALLEVEL, {
                type: "state",
                common: {
                    name: "Manual Level",
                    type: "number",
                    role: "level",
                    min: 0,
                    max: 100,
                    unit: "%",
                    read: true,
                    write: true
                },
                native: {}
            });
            yield this.setObjectNotExistsAsync(adapter_states_1.STATE_AIR_PURIFIER_INFORMATION + adapter_states_1.STATE_AIR_PURIFIER_TEMPERATURE, {
                type: "state",
                common: {
                    name: "Temperature",
                    type: "number",
                    role: "value.temperature",
                    unit: "°C",
                    read: true,
                    write: false
                },
                native: {}
            });
            yield this.setObjectNotExistsAsync(adapter_states_1.STATE_AIR_PURIFIER_INFORMATION + adapter_states_1.STATE_AIR_PURIFIER_HUMIDITY, {
                type: "state",
                common: {
                    name: "Relative Humidity",
                    type: "number",
                    role: "value.humidity",
                    unit: "%",
                    read: true,
                    write: false
                },
                native: {}
            });
            yield this.setObjectNotExistsAsync(adapter_states_1.STATE_AIR_PURIFIER_INFORMATION + adapter_states_1.STATE_AIR_PURIFIER_PM25, {
                type: "state",
                common: {
                    name: "Pollution in PM2.5",
                    type: "number",
                    role: "value",
                    read: true,
                    write: false
                },
                native: {}
            });
        });
    }
    connect(command) {
        return __awaiter(this, void 0, void 0, function* () {
            this.log.info("Connecting...");
            yield this.miAirPurifier.connect();
            if (this.reconnectTimeout) {
                clearTimeout(this.reconnectTimeout);
            }
            try {
                const state = yield this.miAirPurifier.connect();
                if (state) {
                    this.log.info("Connected!");
                    this.miAirPurifier.checkInitValues();
                    this.miAirPurifier.subscribeToValues();
                    this.isConnected = true;
                    if (command) {
                        command();
                    }
                }
                else {
                    this.log.error("Wronge device type.");
                }
            }
            catch (err) {
                this.log.info("Error while connecting");
                this.reconnect(false);
            }
        });
    }
    reconnect(withoutTimeout, command) {
        this.isConnected = false;
        if (withoutTimeout) {
            this.log.info("Retry connection");
            if (command) {
                this.connect(command);
            }
            else {
                this.connect();
            }
        }
        else {
            if (this.reconnectInterval > 0) {
                this.log.info(`"Retry in ${this.config.reconnectTime} second(s)`);
                this.reconnectTimeout = setTimeout(() => this.connect(command), this.reconnectInterval);
            }
        }
    }
    setupListeners() {
        this.miAirPurifier.addListener(mi_air_purifier_constants_1.EVENT_AIR_PURIFIER_DEBUG_LOG, (msg) => {
            this.log.debug(msg);
        });
        this.miAirPurifier.addListener(mi_air_purifier_constants_1.EVENT_AIR_PURIFIER_INFO_LOG, (msg) => {
            this.log.info(msg);
        });
        this.miAirPurifier.addListener(mi_air_purifier_constants_1.EVENT_AIR_PURIFIER_ERROR_LOG, (err) => {
            this.log.error(err);
        });
        // Power
        this.miAirPurifier.addListener(mi_air_purifier_constants_1.EVENT_AIR_PURIFIER_POWER, (power) => __awaiter(this, void 0, void 0, function* () {
            this.log.debug(`${mi_air_purifier_constants_1.EVENT_AIR_PURIFIER_POWER}: ${power}`);
            yield this.setStateAsync(adapter_states_1.STATE_AIR_PURIFIER_CONTROL + adapter_states_1.STATE_AIR_PURIFIER_POWER, power, true);
        }));
        // Mode
        this.miAirPurifier.addListener(mi_air_purifier_constants_1.EVENT_AIR_PURIFIER_MODE, (mode) => __awaiter(this, void 0, void 0, function* () {
            this.log.debug(`${mi_air_purifier_constants_1.EVENT_AIR_PURIFIER_MODE}: ${mode}`);
            yield this.setStateAsync(adapter_states_1.STATE_AIR_PURIFIER_INFORMATION + adapter_states_1.STATE_AIR_PURIFIER_MODE, mode, true);
        }));
        // Favorite Level
        this.miAirPurifier.addListener(mi_air_purifier_constants_1.EVENT_AIR_PURIFIER_MANUALLEVEL, (favorite) => __awaiter(this, void 0, void 0, function* () {
            let maxValue = 14;
            if (this.config.air2) {
                maxValue = 16;
            }
            else if (this.config.air2s) {
                maxValue = 14;
            }
            const value = Math.floor((favorite / maxValue) * 100);
            this.log.debug(`${mi_air_purifier_constants_1.EVENT_AIR_PURIFIER_MANUALLEVEL}: ${value}`);
            yield this.setStateAsync(adapter_states_1.STATE_AIR_PURIFIER_CONTROL + adapter_states_1.STATE_AIR_PURIFIER_MANUALLEVEL, value, true);
        }));
        // Temperature
        this.miAirPurifier.addListener(mi_air_purifier_constants_1.EVENT_AIR_PURIFIER_TEMPERATURE, (temp) => __awaiter(this, void 0, void 0, function* () {
            const tempNumber = temp.toString().substring(0, temp.toString().length - 2);
            this.log.debug(`${mi_air_purifier_constants_1.EVENT_AIR_PURIFIER_TEMPERATURE}: ${tempNumber}`);
            yield this.setStateAsync(adapter_states_1.STATE_AIR_PURIFIER_INFORMATION + adapter_states_1.STATE_AIR_PURIFIER_TEMPERATURE, tempNumber, true);
        }));
        // Relative Humidity
        this.miAirPurifier.addListener(mi_air_purifier_constants_1.EVENT_AIR_PURIFIER_HUMIDITY, (rh) => __awaiter(this, void 0, void 0, function* () {
            this.log.debug(`${mi_air_purifier_constants_1.EVENT_AIR_PURIFIER_HUMIDITY}: ${rh}`);
            yield this.setStateAsync(adapter_states_1.STATE_AIR_PURIFIER_INFORMATION + adapter_states_1.STATE_AIR_PURIFIER_HUMIDITY, rh, true);
        }));
        // PM 2.5
        this.miAirPurifier.addListener(mi_air_purifier_constants_1.EVENT_AIR_PURIFIER_PM25, (pm25) => __awaiter(this, void 0, void 0, function* () {
            this.log.debug(`${mi_air_purifier_constants_1.EVENT_AIR_PURIFIER_PM25}: ${pm25}`);
            yield this.setStateAsync(adapter_states_1.STATE_AIR_PURIFIER_INFORMATION + adapter_states_1.STATE_AIR_PURIFIER_PM25, pm25, true);
        }));
    }
    /**
     * Is called when adapter shuts down - callback has to be called under any circumstances!
     */
    onUnload(callback) {
        try {
            this.log.info("cleaned everything up...");
            callback();
        }
        catch (e) {
            callback();
        }
    }
    /**
     * Is called if a subscribed object changes
     */
    onObjectChange(id, obj) {
        if (obj) {
            // The object was changed
            this.log.info(`object ${id} changed: ${JSON.stringify(obj)}`);
        }
        else {
            // The object was deleted
            this.log.info(`object ${id} deleted`);
        }
    }
    /**
     * Is called if a subscribed state changes
     */
    onStateChange(id, state) {
        const namespace = this.namespace + "." + adapter_states_1.STATE_AIR_PURIFIER_CONTROL;
        if (state) {
        }
        if (state && !state.ack) {
            if (this.isConnected) {
                switch (id) {
                    case namespace + adapter_states_1.STATE_AIR_PURIFIER_POWER:
                        this.log.info(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
                        this.setPower(!!state.val);
                        break;
                    case namespace + adapter_states_1.STATE_AIR_PURIFIER_MODE_NIGHT:
                        this.log.info(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
                        this.setMode(adapter_states_1.STATE_AIR_PURIFIER_MODE_NIGHT);
                        break;
                    case namespace + adapter_states_1.STATE_AIR_PURIFIER_MODE_AUTO:
                        this.log.info(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
                        this.setMode(adapter_states_1.STATE_AIR_PURIFIER_MODE_AUTO);
                        break;
                    case namespace + adapter_states_1.STATE_AIR_PURIFIER_MODE_MANUAL:
                        this.log.info(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
                        this.setMode(adapter_states_1.STATE_AIR_PURIFIER_MODE_MANUAL);
                        break;
                    case namespace + adapter_states_1.STATE_AIR_PURIFIER_MANUALLEVEL:
                        this.log.info(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
                        if (typeof state.val === "number") {
                            this.log.info(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
                            this.setManual(state.val);
                        }
                        break;
                }
            }
            else {
                this.log.debug("Not yet connected.");
            }
        }
    }
    setMode(mode, favoriteLevel) {
        return __awaiter(this, void 0, void 0, function* () {
            if (![adapter_states_1.STATE_AIR_PURIFIER_MODE_AUTO, adapter_states_1.STATE_AIR_PURIFIER_MODE_MANUAL, adapter_states_1.STATE_AIR_PURIFIER_MODE_NIGHT].some(possibleMode => possibleMode === mode)) {
                return;
            }
            try {
                yield this.miAirPurifier.setMode(mode);
                yield this.setStateAsync(adapter_states_1.STATE_AIR_PURIFIER_INFORMATION + adapter_states_1.STATE_AIR_PURIFIER_MODE, mode, true);
                yield this.setStateAsync(adapter_states_1.STATE_AIR_PURIFIER_CONTROL + adapter_states_1.STATE_AIR_PURIFIER_POWER, true, true);
                if (favoriteLevel) {
                    yield this.miAirPurifier.setFavoriteLevel(favoriteLevel);
                }
            }
            catch (err) {
                this.reconnect(true, () => this.setMode(mode, favoriteLevel));
                return;
            }
        });
    }
    setPower(power) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield this.miAirPurifier.setPower(power);
                yield this.setStateAsync(adapter_states_1.STATE_AIR_PURIFIER_CONTROL + adapter_states_1.STATE_AIR_PURIFIER_POWER, result, true);
            }
            catch (err) {
                this.reconnect(true, () => this.setPower(power));
            }
        });
    }
    setManual(stateVal) {
        return __awaiter(this, void 0, void 0, function* () {
            const maxValue = this.config.air2 ? 16 : 14;
            const value = Math.ceil((stateVal / 100) * maxValue);
            yield this.setMode(adapter_states_1.STATE_AIR_PURIFIER_MODE_MANUAL, value);
        });
    }
}
if (module.parent) {
    // Export the constructor in compact mode
    module.exports = (options) => new MiHomeAirPurifier(options);
}
else {
    // otherwise start the instance directly
    (() => new MiHomeAirPurifier())();
}