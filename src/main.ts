/*
 * Created with @iobroker/create-adapter v1.23.0
 */

import * as utils from "@iobroker/adapter-core";
import { MiAirPurifier } from "./air-purifier/mi-air-purifier";
import { EVENT_AIR_PURIFIER_DEBUG_LOG, EVENT_AIR_PURIFIER_INFO_LOG, EVENT_AIR_PURIFIER_ERROR_LOG, EVENT_AIR_PURIFIER_POWER, EVENT_AIR_PURIFIER_MODE, EVENT_AIR_PURIFIER_MANUALLEVEL, EVENT_AIR_PURIFIER_TEMPERATURE, EVENT_AIR_PURIFIER_HUMIDITY, EVENT_AIR_PURIFIER_PM25 } from "./air-purifier/mi-air-purifier-constants";
import { STATE_AIR_PURIFIER_CONTROL, STATE_AIR_PURIFIER_POWER, STATE_AIR_PURIFIER_INFORMATION, STATE_AIR_PURIFIER_MODE, STATE_AIR_PURIFIER_MODE_NIGHT, STATE_AIR_PURIFIER_MODE_AUTO, STATE_AIR_PURIFIER_MODE_MANUAL, STATE_AIR_PURIFIER_MANUALLEVEL, STATE_AIR_PURIFIER_TEMPERATURE, STATE_AIR_PURIFIER_HUMIDITY, STATE_AIR_PURIFIER_PM25 } from "./types/adapter-states";

declare global {
	// eslint-disable-next-line @typescript-eslint/no-namespace
	namespace ioBroker {
		interface AdapterConfig {
			token: string;
			ipaddress: string;
			reconnectTime: number;
			air2: boolean;
			air2s: boolean;
		}
	}
}


class MiHomeAirPurifier extends utils.Adapter {
	miAirPurifier: MiAirPurifier = new MiAirPurifier("", "");
	reconnectInterval = 60;
	reconnectTimeout: ReturnType<typeof setTimeout> | undefined;
	isConnected = false;

	public constructor(options: Partial<ioBroker.AdapterOptions> = {}) {
		super({
			...options as any,
			name: "mihome-airpurifier",
		});
		
		this.on("ready", this.onReady.bind(this));
		this.on("objectChange", this.onObjectChange.bind(this));
		this.on("stateChange", this.onStateChange.bind(this));
		this.on("unload", this.onUnload.bind(this));
	}

	/**
	 * Is called when databases are connected and adapter received configuration.
	 */
	private async onReady(): Promise<void> {
		this.log.info("Started");

		this.miAirPurifier = new MiAirPurifier(this.config.ipaddress, this.config.token);
		this.reconnectInterval = this.config.reconnectTime * 1000;

		this.initObjects();
		this.subscribeStates("*");
		this.setupListeners();
		this.connect();
	}

	private async initObjects(): Promise<void> {
		const existingStates = Object.keys(await this.getStatesAsync("*"));
		await Promise.all(existingStates.map(state => this.delStateAsync(state)));
		await this.setObjectNotExistsAsync(STATE_AIR_PURIFIER_CONTROL + STATE_AIR_PURIFIER_POWER, {
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
	  	await this.setObjectNotExistsAsync(STATE_AIR_PURIFIER_INFORMATION + STATE_AIR_PURIFIER_MODE, {
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
	  	await this.setObjectNotExistsAsync(STATE_AIR_PURIFIER_CONTROL + STATE_AIR_PURIFIER_MODE_NIGHT, {
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
	  	await this.setObjectNotExistsAsync(STATE_AIR_PURIFIER_CONTROL + STATE_AIR_PURIFIER_MODE_AUTO, {
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
		 await this.setObjectNotExistsAsync(STATE_AIR_PURIFIER_CONTROL + STATE_AIR_PURIFIER_MODE_MANUAL, {
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
	  	await this.setObjectNotExistsAsync(STATE_AIR_PURIFIER_CONTROL + STATE_AIR_PURIFIER_MANUALLEVEL, {
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
	  	await this.setObjectNotExistsAsync(
			STATE_AIR_PURIFIER_INFORMATION + STATE_AIR_PURIFIER_TEMPERATURE, {
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
			},
	  	);
	  	await this.setObjectNotExistsAsync(STATE_AIR_PURIFIER_INFORMATION + STATE_AIR_PURIFIER_HUMIDITY, {
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
	  	await this.setObjectNotExistsAsync(STATE_AIR_PURIFIER_INFORMATION + STATE_AIR_PURIFIER_PM25, {
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
	}

	private async connect(command?: any): Promise<void> {
		this.log.info("Connecting...");
		await this.miAirPurifier.connect()

		if (this.reconnectTimeout) {
			clearTimeout(this.reconnectTimeout);
		}

		try {
			const state = await this.miAirPurifier.connect()
			if (state) {
				this.log.info("Connected!");
				this.miAirPurifier.checkInitValues();
				this.miAirPurifier.subscribeToValues();
				this.isConnected = true;
				if (command) {
					command();
				}
			} else {
				this.log.error("Wronge device type.");
			}
		} catch (err) {
			this.log.info("Error while connecting");
			this.reconnect(false);
		}
	}

	private reconnect(withoutTimeout: boolean, command?: any): void {
		this.isConnected = false;
		if (withoutTimeout) {
			this.log.info("Retry connection");
			if (command)  {
				this.connect(command);
			} else {
				this.connect();
			}
		} else {
			if (this.reconnectInterval > 0) {
				this.log.info(`"Retry in ${this.config.reconnectTime} second(s)`);
				this.reconnectTimeout = setTimeout(() => this.connect(command), this.reconnectInterval);
			}
		}
	}

	private setupListeners(): void {
		this.miAirPurifier.addListener(EVENT_AIR_PURIFIER_DEBUG_LOG, (msg: string) => {
			this.log.debug(msg);
		})
		this.miAirPurifier.addListener(EVENT_AIR_PURIFIER_INFO_LOG, (msg: string) => {
			this.log.info(msg);
		})
		this.miAirPurifier.addListener(EVENT_AIR_PURIFIER_ERROR_LOG, (err: string) => {
			this.log.error(err);
		})

		// Power
		this.miAirPurifier.addListener(EVENT_AIR_PURIFIER_POWER, async (power: any) => {
			this.log.debug(`${EVENT_AIR_PURIFIER_POWER}: ${power}`);
			await this.setStateAsync(STATE_AIR_PURIFIER_CONTROL + STATE_AIR_PURIFIER_POWER, power, true);
		});

		// Mode
		this.miAirPurifier.addListener(EVENT_AIR_PURIFIER_MODE, async (mode: any) => {
			this.log.debug(`${EVENT_AIR_PURIFIER_MODE}: ${mode}`);
			await this.setStateAsync(STATE_AIR_PURIFIER_INFORMATION + STATE_AIR_PURIFIER_MODE , mode, true);
		});

		// Favorite Level
		this.miAirPurifier.addListener(EVENT_AIR_PURIFIER_MANUALLEVEL, async (favorite: any) => {
			let maxValue = 14;
			if (this.config.air2) {
				maxValue = 16;
			} else if (this.config.air2s) {
				maxValue = 14;
			}
		  	const value = Math.floor((favorite / maxValue) * 100);
		  	this.log.debug(`${EVENT_AIR_PURIFIER_MANUALLEVEL}: ${value}`);
		  	await this.setStateAsync(STATE_AIR_PURIFIER_CONTROL + STATE_AIR_PURIFIER_MANUALLEVEL, value, true);
		});

		// Temperature
		this.miAirPurifier.addListener(EVENT_AIR_PURIFIER_TEMPERATURE, async (temp: any) => {
			const tempNumber = temp.toString().substring(0, temp.toString().length - 2);
			this.log.debug(`${EVENT_AIR_PURIFIER_TEMPERATURE}: ${tempNumber}`);
			await this.setStateAsync(STATE_AIR_PURIFIER_INFORMATION + STATE_AIR_PURIFIER_TEMPERATURE, tempNumber, true);
		});

		// Relative Humidity
		this.miAirPurifier.addListener(EVENT_AIR_PURIFIER_HUMIDITY, async (rh: any)  =>{
		  	this.log.debug(`${EVENT_AIR_PURIFIER_HUMIDITY}: ${rh}`);
			await this.setStateAsync(STATE_AIR_PURIFIER_INFORMATION + STATE_AIR_PURIFIER_HUMIDITY, rh, true);
		});
		// PM 2.5
		this.miAirPurifier.addListener(EVENT_AIR_PURIFIER_PM25, async (pm25: any) => {
		  	this.log.debug(`${EVENT_AIR_PURIFIER_PM25}: ${pm25}`);
		 	await this.setStateAsync(STATE_AIR_PURIFIER_INFORMATION + STATE_AIR_PURIFIER_PM25, pm25, true);
		});
	  }

	/**
	 * Is called when adapter shuts down - callback has to be called under any circumstances!
	 */
	private onUnload(callback: () => void): void {
		try {
			this.log.info("cleaned everything up...");
			callback();
		} catch (e) {
			callback();
		}
	}

	/**
	 * Is called if a subscribed object changes
	 */
	private onObjectChange(id: string, obj: ioBroker.Object | null | undefined): void {
		if (obj) {
			// The object was changed
			this.log.info(`object ${id} changed: ${JSON.stringify(obj)}`);
		} else {
			// The object was deleted
			this.log.info(`object ${id} deleted`);
		}
	}

	/**
	 * Is called if a subscribed state changes
	 */
	private onStateChange(id: string, state: ioBroker.State | null | undefined): void {
		const namespace = this.namespace + "." + STATE_AIR_PURIFIER_CONTROL;
		
		if (state) {
		}
  
		if (state && !state.ack) {
		  	if (this.isConnected) {
				switch (id) {
					case namespace + STATE_AIR_PURIFIER_POWER:
						this.log.info(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
						this.setPower(!!state.val)
						break;
					case namespace + STATE_AIR_PURIFIER_MODE_NIGHT:
						this.log.info(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
						this.setMode(STATE_AIR_PURIFIER_MODE_NIGHT)
						break;
					case namespace + STATE_AIR_PURIFIER_MODE_AUTO:
						this.log.info(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
						this.setMode(STATE_AIR_PURIFIER_MODE_AUTO)
						break;
					case namespace + STATE_AIR_PURIFIER_MODE_MANUAL:
						this.log.info(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
						this.setMode(STATE_AIR_PURIFIER_MODE_MANUAL)
						break;
					case namespace + STATE_AIR_PURIFIER_MANUALLEVEL:
						this.log.info(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
						if (typeof state.val === "number") {
							this.log.info(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
							this.setManual(state.val)
						}
						break;
				}
			} else {
				this.log.debug("Not yet connected.");
			}
		}
	}
	
	async setMode(mode: string, favoriteLevel?: number): Promise<void> {
		if (![STATE_AIR_PURIFIER_MODE_AUTO, STATE_AIR_PURIFIER_MODE_MANUAL, STATE_AIR_PURIFIER_MODE_NIGHT].some(possibleMode => possibleMode === mode)) {
			return;
		}
		try {
			await this.miAirPurifier.setMode(mode)
			await this.setStateAsync(STATE_AIR_PURIFIER_INFORMATION + STATE_AIR_PURIFIER_MODE , mode, true);
			await this.setStateAsync(STATE_AIR_PURIFIER_CONTROL + STATE_AIR_PURIFIER_POWER, true, true);
			
			if (favoriteLevel) {
				await this.miAirPurifier.setFavoriteLevel(favoriteLevel);
			}
		} catch(err) {
			this.reconnect(true, () => this.setMode(mode, favoriteLevel))
			return;
		}
	}
  
	async setPower(power: boolean): Promise<void> {
		try {
			const result = await this.miAirPurifier.setPower(power)
			await this.setStateAsync(STATE_AIR_PURIFIER_CONTROL + STATE_AIR_PURIFIER_POWER, result, true);
		} catch (err) {
			this.reconnect(true, () => this.setPower(power));
		}
	}
  
	async setManual(stateVal: number): Promise<void> {
		const maxValue = this.config.air2 ? 16 : 14;
		const value = Math.ceil((stateVal / 100) * maxValue);

		await this.setMode(STATE_AIR_PURIFIER_MODE_MANUAL, value);
	}

}

if (module.parent) {
	// Export the constructor in compact mode
	module.exports = (options: Partial<ioBroker.AdapterOptions> | undefined) => new MiHomeAirPurifier(options);
} else {
	// otherwise start the instance directly
	(() => new MiHomeAirPurifier())();
}