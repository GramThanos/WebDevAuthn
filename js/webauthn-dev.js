/*
 * WebDevAuthn
 * Script: WebAuthn Development
 * 
 * GramThanos
 */

window.WebDevAuthn = window.WebDevAuthn || ((cWindow, credentials, PKCredential) => {
	let WebDevAuthn = {

		// Dev tools URL
		devDomain : 'https://gramthanos.github.io/WebDevAuthn',
		devCreatePath : '/credential-creation.html',
		devGetPath : '/credential-get.html',

		// Initialize
		init : function() {
			// Default values
			this._virtual = false;
			this._development = false;
			this._pauseWithAlert = false;
			this._patchPubCred = false;
			this._debugger = false;
			this._platformAuthenticatorAvailable = false;
			// Instances ID increment
			this.idIncrement = 0;

			// Check script data
			let script = document.currentScript;
			if (script) {
				if (
					script.dataset.devDomain ||
					script.getAttribute('dev-domain')
				) this.devDomain = script.dataset.devDomain || script.getAttribute('dev-domain');
				if (
					(script.dataset.virtual && script.dataset.virtual.toLowerCase() == 'true') ||
					(script.getAttribute('virtual') && script.getAttribute('virtual').toLowerCase() == 'true')
				) this._virtual = true;
				if (
					(script.dataset.development && script.dataset.development.toLowerCase() == 'true') ||
					(script.getAttribute('development') && script.getAttribute('development').toLowerCase() == 'true')
				) this._development = true;
				if (
					(script.dataset.pauseWithAlert && script.dataset.pauseWithAlert.toLowerCase() == 'true') ||
					(script.getAttribute('pause-with-alert') && script.getAttribute('pause-with-alert').toLowerCase() == 'true')
				) this._pauseWithAlert = true;
				if (
					(script.dataset.instanceOfPubKey && script.dataset.instanceOfPubKey.toLowerCase() == 'true') ||
					(script.getAttribute('instance-of-pub-key') && script.getAttribute('instance-of-pub-key').toLowerCase() == 'true')
				) this._patchPubCred = true;
				if (
					(script.dataset.debugger && script.dataset.debugger.toLowerCase() == 'true') ||
					(script.getAttribute('debugger') && script.getAttribute('debugger').toLowerCase() == 'true')
				) this._debugger = true;
				if (
					(script.dataset.platformAuthenticatorAvailable && script.dataset.platformAuthenticatorAvailable.toLowerCase() == 'true') ||
					(script.getAttribute('platform-authenticator-available') && script.getAttribute('platform-authenticator-available').toLowerCase() == 'true')
				) this._platformAuthenticatorAvailable = true;
			}

			//// Print given parameters
			//console.log('Script parameters : ' + JSON.stringify({
			//	'dev-domain' :			this.devDomain,
			//	'virtual' :				this._virtual,
			//	'development' :			this._development,
			//	'pause-with-alert' :	this._pauseWithAlert,
			//	'instance-of-pub-key' :	this._patchPubCred,
			//	'debugger' :	this._debugger,
			//	'platform-authenticator-available' :	this._platformAuthenticatorAvailable,
			//}, null, '\t'));

			// Store WebAuthn references
			this.WebAuthn = {
				'scope' : credentials,
				'create' : credentials.create,
				'get' : credentials.get
			};
			this.PKCredential = {
				'scope' : PKCredential,
				'isUserVerifyingPlatformAuthenticatorAvailable' : PKCredential.isUserVerifyingPlatformAuthenticatorAvailable
			};

			// Override functions
			let self = this;
			credentials.create = function() {if (self._debugger) debugger; return self.create.apply(self, arguments);};
			credentials.get = function() {if (self._debugger) debugger; return self.get.apply(self, arguments);};

			PKCredential.isUserVerifyingPlatformAuthenticatorAvailable = function() {
				if (self._debugger) debugger;
				return self.isUserVerifyingPlatformAuthenticatorAvailable.apply(self, arguments);
			}

			// Listen for messages from other pages
			cWindow.addEventListener('message', (event) => {
				if (event.origin !== new URL(this.devDomain).origin)
					return;
				if (!event.data.hasOwnProperty('id')) {
					return;
				}
				this.handleResponse(event.data);
			}, false);
		},

		handleResponse : function(data) {
			// Find instance
			let instance = false;
			for (var i = this.instances.length - 1; i >= 0; i--) {
				if (this.instances[i].id == data.id) {
					instance = this.instances[i];
				}
			}
			if (!instance) return;
			// Do action
			if (instance.status == 'unassigned') {
				instance.status = 'assigned';
				return;
			}
			if (instance.status == 'assigned') {
				instance.status = 'completed';
				//let credential = this.unserialize(data.credential);
				//credential.getClientExtensionResults = () => {return {}};
				console.log(data);
				let obj = this.unserialize(data.credential);
				obj.patch = this._patchPubCred ? true : false;
				let credential = new (VirtualPublicKeyCredential())(obj);
				// Print data
				console.log('VirtualPublicKeyCredential', credential);
				if (this._pauseWithAlert) {
					return Popup('Click ok to continue ...', 'confirm').then(x => {
						if (this._debugger) debugger;
						if (x) instance.resolve(credential);
						else instance.reject(new Error('WebDevAuthn action canceled.'));
					});
				}
				instance.resolve(credential);
				return;
			}
		},

		connect : function(instance, send=true) {
			let openWin = () => {
				return cWindow.open(
					this.devDomain + (
						instance.authn == 'create' ?
							this.devCreatePath :
							this.devGetPath
					)
				);
			}
			if (!instance.win)
				instance.win = openWin();
			if (!send)
				return;
			// Send info
			let state = instance.status;
			let ms = 500;
			let tries = 0;
			let popups = 0;
			let pending = false;
			let interval = setInterval(() => {
				// If state changed, everything is ok
				if (instance.status != state) {
					clearInterval(interval);
					return;
				}
				// If popup is pending
				if (pending) return;
				// Check if window closed
				if (instance.win.closed) {
					clearInterval(interval);
					//instance.reject(new Error('Failed to open WebDevAuthn.'));
					//instance.reject(new Error('Failed to communicate with WebDevAuthn. Maybe cross website communication is blocked.'));
					let url = this.devDomain + (
						instance.authn == 'create' ?
							this.devCreatePath :
							this.devGetPath
					) + '?data=' + encodeURIComponent(cWindow.btoa(JSON.stringify({
						id: instance.id,
						type: instance.type,
						url: instance.url,
						options: this.serialize(instance.options),
						credential: this.serialize(instance.credential),
						extensions: this.serialize(instance.extensions)
					})));
					Popup('Copy custom analyser URL and paste back response', 'prompt', url, true).then((data) => {
						// Decode data
						try {
							data = JSON.parse(data);
						} catch (e) {
							return;
						}
						instance.status = 'assigned';
						this.handleResponse(data);
					});
					return;
				}
				// Check if waited too long
				tries++;
				if (tries > 15 * (1000/ms) ) {
					clearInterval(interval);
					instance.reject(new Error('Failed to open WebDevAuthn.'));
					return;
				}
				// Send request to handle message
				if (!instance.win) {
					if (popups >= 3) {
						instance.reject(new Error('Failed to open WebDevAuthn.'));
						return;
					}
					popups++;
					pending = true;
					Popup('Unblock window opening and try again!', 'alert').then(() => {
						instance.win = openWin();
						pending = false;
					});
					return;
				}
				instance.win.postMessage({
					id: instance.id,
					type: instance.type,
					url: instance.url,
					options: this.serialize(instance.options),
					credential: this.serialize(instance.credential),
					extensions: this.serialize(instance.extensions)
				}, this.devDomain);
			}, ms);
		},

		instances : [],

		// Substitute WebAuthen functions
		create : function() {
			if (!this._development || arguments.length < 1 || !arguments[0].hasOwnProperty('publicKey')) {
				// Normal Call
				return this.WebAuthn.create.apply(this.WebAuthn.scope, arguments);
			}
			else if (!this._virtual) {
				return new Promise((resolve, reject) => {
					let instance = {
						status : 'unassigned',
						type: 'physical',
						authn: 'create',
						url : cWindow.location.href,
						id : ++this.idIncrement,
						resolve : resolve,
						reject : reject,

						options : arguments[0],
						credential : null
					};
					this.instances.push(instance);
					//this.connect(instance, false);
					//cWindow.focus();
					this.WebAuthn.create.apply(this.WebAuthn.scope, arguments).then((credential) => {
						if (this._debugger) debugger;
						//instance.credential = {
						//	id: credential.id,
						//	rawId: credential.rawId,
						//	response: {
						//		attestationObject: credential.response.attestationObject,
						//		clientDataJSON: credential.response.clientDataJSON
						//	},
						//	type: credential.type
						//};
						instance.credential = credential;
						instance.extensions = credential.getClientExtensionResults();
						this.connect(instance);
						//instance.win.focus();
					}).catch(async (e) => {
						if (this._debugger) debugger;
						if (this._pauseWithAlert) await Popup(e.toString(), 'alert');
						instance.reject(new Error(e.message));
					});
				});
			}
			else {
				return new Promise((resolve, reject) => {
					let instance = {
						status : 'unassigned',
						type: 'virtual',
						authn: 'create',
						url : cWindow.location.href,
						id : ++this.idIncrement,
						resolve : resolve,
						reject : reject,

						options : arguments[0],
						credential : null
					};
					this.instances.push(instance);
					this.connect(instance);
				});
			}
		},
		get : function() {
			if (!this._development || arguments.length < 1 || !arguments[0].hasOwnProperty('publicKey')) {
				// Normal Call
				return this.WebAuthn.get.apply(this.WebAuthn.scope, arguments);
			}
			else if (!this._virtual) {
				return new Promise((resolve, reject) => {
					let instance = {
						status : 'unassigned',
						type: 'physical',
						authn: 'get',
						url : cWindow.location.href,
						id : ++this.idIncrement,
						resolve : resolve,
						reject : reject,

						options : arguments[0],
						credential : null
					};
					this.instances.push(instance);
					//this.connect(instance, false);
					//cWindow.focus();
					this.WebAuthn.get.apply(this.WebAuthn.scope, arguments).then((credential) => {
						if (this._debugger) debugger;
						//instance.credential = {
						//	id: credential.id,
						//	rawId: credential.rawId,
						//	response: {
						//		authenticatorData: credential.response.authenticatorData,
						//		userHandle: credential.response.userHandle,
						//		signature: credential.response.signature,
						//		clientDataJSON: credential.response.clientDataJSON
						//	},
						//	type: credential.type
						//};
						instance.credential = credential;
						instance.extensions = credential.getClientExtensionResults();
						this.connect(instance);
						//instance.win.focus();
					}).catch(async (e) => {
						if (this._debugger) debugger;
						if (this._pauseWithAlert) await Popup(e.toString(), 'alert');
						instance.reject(new Error(e.message));
					});
				});
			}
			else {
				return new Promise((resolve, reject) => {
					let instance = {
						status : 'unassigned',
						type: 'virtual',
						authn: 'get',
						url : cWindow.location.href,
						id : ++this.idIncrement,
						resolve : resolve,
						reject : reject,

						options : arguments[0],
						credential : null
					};
					this.instances.push(instance);
					this.connect(instance);
				});
			}
		},

		isUserVerifyingPlatformAuthenticatorAvailable : function() {
			// If true overwrite
			if (this._platformAuthenticatorAvailable) {
				return new Promise((resolve, reject) => {resolve(true);});
			}
			// Else call original
			return this.PKCredential.isUserVerifyingPlatformAuthenticatorAvailable.apply(this.PKCredential.scope, arguments);
		},

		// Serialize & Unserialize functions below is based on
		// https://gist.github.com/jonathanlurie/04fa6343e64f750d03072ac92584b5df
		serialize : function(obj) {
			let parseObject = function(value) {
				// Parse special arrays
				if (
					value instanceof Int8Array         ||
					value instanceof Uint8Array        ||
					value instanceof Uint8ClampedArray ||
					value instanceof Int16Array        ||
					value instanceof Uint16Array       ||
					value instanceof Int32Array        ||
					value instanceof Uint32Array       ||
					value instanceof Float32Array      ||
					value instanceof Float64Array      ||
					value instanceof ArrayBuffer
				) {
					var replacement = {
						constructor: value.constructor.name,
						data: Array.apply([], value instanceof ArrayBuffer ? new Uint8Array(value) : value),
						flag: 'FLAG_TYPED_ARRAY'
					}
					return replacement;
				}
				// Parse each array object
				else if (value instanceof Array) {
					let o = [];
					for (let i = 0; i < value.length; i++) {
						o.push(parseObject(value[i]));
					}
					return o;
				}
				// Parse objects
				else if (
					typeof value === 'object' && !(
						//typeof value === 'string' ||
						//typeof value === 'number' ||
						value instanceof Array ||
						//typeof value === 'boolean' ||
						value === null
					)
				) {
					let o = {};
					for (let i in value) {
						if (typeof value[i] !== 'function') {
							o[i] = parseObject(value[i]);
						}
					}
					return o;
				}
				return value;
			};
			return JSON.stringify(parseObject(obj));

			//return JSON.stringify(obj, function(key, value) {
			//	if (
			//		value instanceof Int8Array         ||
			//		value instanceof Uint8Array        ||
			//		value instanceof Uint8ClampedArray ||
			//		value instanceof Int16Array        ||
			//		value instanceof Uint16Array       ||
			//		value instanceof Int32Array        ||
			//		value instanceof Uint32Array       ||
			//		value instanceof Float32Array      ||
			//		value instanceof Float64Array      ||
			//		value instanceof ArrayBuffer
			//	) {
			//		var replacement = {
			//			constructor: value.constructor.name,
			//			data: Array.apply([], value instanceof ArrayBuffer ? new Uint8Array(value) : value),
			//			flag: 'FLAG_TYPED_ARRAY'
			//		}
			//		return replacement;
			//	}
			//	return value;
			//});
		},
		unserialize : function(jsonStr) {
			return JSON.parse(jsonStr, function(key, value) {
				try {
					if (value.hasOwnProperty('flag') && value.flag === 'FLAG_TYPED_ARRAY') {
						if (value.constructor === 'ArrayBuffer')
							return new Uint8Array(value.data).buffer;
						return new cWindow[value.constructor](value.data);
					}
				} catch(e) {}
				return value;
			});
		},

		// Options
		virtual : function(boolean) {
			this._virtual = boolean ? true : false;
		},
		development : function(boolean) {
			this._development = boolean ? true : false;
		},
		pauseWithAlert : function(boolean) {
			this._pauseWithAlert = boolean ? true : false;
		},
		instanceOfPubKey : function(boolean) {
			this._patchPubCred = boolean ? true : false;
		},
		debugger : function(boolean) {
			this._debugger = boolean ? true : false;
		},
		platformAuthenticatorAvailable : function(boolean) {
			this._platformAuthenticatorAvailable = boolean ? true : false;
		}
	}

	// Virtual AuthenticatorAssertionResponse
	// Based on: https://developer.mozilla.org/en-US/docs/Web/API/AuthenticatorAssertionResponse
	let VirtualAuthenticatorAssertionResponse = function () {
		return (class extends (class Dummy {}) {
			constructor(obj) {
				// Call dummy parent
				super(obj);
				// Save info
				this.clientDataJSON = obj.clientDataJSON;
				this.authenticatorData = obj.authenticatorData;
				this.signature = obj.signature;
				this.userHandle = obj.userHandle;

				// Patch object ancestors to be instance of AuthenticatorAssertionResponse
				if (obj.patch !== false)
					this['__proto__']['__proto__'] = cWindow.AuthenticatorAssertionResponse.prototype;
			}

			// Expose that this is virtual
			isVirtual() {
				return true;
			}
			get [Symbol.toStringTag]() {
				return 'AuthenticatorAssertionResponse';
			}
		});
	};

	// Virtual AuthenticatorAttestationResponse
	// Based on: https://developer.mozilla.org/en-US/docs/Web/API/AuthenticatorAttestationResponse
	let VirtualAuthenticatorAttestationResponse = function () {
		return (class extends (class Dummy {}) {
			constructor(obj) {
				// Call dummy parent
				super(obj);
				// Save info
				this.clientDataJSON = obj.clientDataJSON;
				this.attestationObject = obj.attestationObject;

				// Patch object ancestors to be instance of AuthenticatorAttestationResponse
				if (obj.patch !== false)
					this['__proto__']['__proto__'] = cWindow.AuthenticatorAttestationResponse.prototype;
			}

			getAuthenticatorData () {
				// ToDo https://www.w3.org/TR/webauthn-2/#iface-authenticatorattestationresponse
				return null;
			}

			getPublicKey () {
				// ToDo https://www.w3.org/TR/webauthn-2/#iface-authenticatorattestationresponse
				return null; 
			}

			getPublicKeyAlgorithm () {
				// ToDo https://www.w3.org/TR/webauthn-2/#iface-authenticatorattestationresponse
				return null;
			}

			getTransports() {
				return [];
			}

			// Expose that this is virtual
			isVirtual() {
				return true;
			}
			get [Symbol.toStringTag]() {
				return 'AuthenticatorAttestationResponse';
			}
		});
	};

	// Virtual PublicKeyCredential
	// Based on: https://developer.mozilla.org/en-US/docs/Web/API/PublicKeyCredential
	let VirtualPublicKeyCredential = function () {
		let priv = Symbol('private');

		return (class extends (class Dummy {}) {
			constructor(obj) {
				// Call dummy parent
				super();
				// Save credentials info
				this.type = 'public-key';
				this.id = obj.id;
				this.rawId = obj.rawId;
				this.response = 
					obj.response && obj.response.authenticatorData ? new (VirtualAuthenticatorAssertionResponse())(obj.response) :
					obj.response && obj.response.attestationObject ? new (VirtualAuthenticatorAttestationResponse())(obj.response) :
					null;
				// Save extensions
				this[priv] = {};
				this[priv].extensions = typeof obj.getClientExtensionResults == 'function' ?
					obj.getClientExtensionResults() :
					obj.getClientExtensionResults || {};

				// Patch object ancestors to be instance of PublicKeyCredential
				if (obj.patch !== false)
					this['__proto__']['__proto__'] = cWindow.PublicKeyCredential.prototype;
			}

			// Extensions not yet implemented
			getClientExtensionResults() {
				return this[priv].extensions;
			}
			// Expose that this is virtual
			isVirtual() {
				return true;
			}
			get [Symbol.toStringTag]() {
				return 'PublicKeyCredential';
			}
		});
	};

	// Fake Custom Popup
	let PopupFallback = function(text, type='alert', defaultText='') {
		return new Promise((resolve, reject) => {
			try {
				let iframe = document.createElement('iframe');
				iframe.style.width = '450px';
				//iframe.style.height = '132px';
				iframe.style.position = 'fixed';
				iframe.style.top = '20px';
				iframe.style.left = '50%';
				iframe.style.marginLeft = '-225px';
				iframe.style.border = '1px solid #cecece';
				iframe.style.backgroundColor = '#ffffff';
				iframe.style.borderRadius = '5px';
				iframe.style.boxShadow = 'rgb(0 0 0 / 33%) 0px 1px 3px';
				iframe.style.zIndex = '999999';
				iframe.style.display = 'block';
				document.body.appendChild(iframe);
				let doc = iframe.contentWindow.document;
				doc.open();
				doc.write(
					'<body>' +
					'<style>' +
						'body {font-family: Tahoma; font-size: 14px; padding: 10px;} ' +
						'#text {margin-top: 10px; font-size: 12px;white-space: pre;} ' +
						'#value-input {width: 100%;border: 1px solid #dadce0;padding: 5px;border-radius: 2px;margin-top: 15px;}' +
						'#buttons {font-size: 12px; text-align: right;margin-top: 20px;} ' +
						'.btn {padding: 8px 8px; background-color: #1a73e8; color: #ffffff;border-radius: 4px; border: 1px solid #4285f4; cursor: pointer; width: 66px; text-align: center;} ' +
						'.btn-invert {background-color: #ffffff; color: #1a73e8; border: 1px solid #dadce0;} ' +
					'</style>' +
					'<div id="wrapper">' +
						'WebDevAuthn Extention says<br>' +
						'<div id="text"></div>' +
						(type == 'prompt' ? '<input id="value-input" type="text" value=""/>' : '') +
						'<div id="buttons">' +
							((type == 'confirm' || type == 'prompt') ?  '<input id="ok-btn" class="btn" type="button" value="OK"/> <input id="cancel-btn" class="btn btn-invert" type="button" value="Cancel"/>' : 
							'<input id="ok-btn" class="btn" type="button" value="OK"/>') +
						'</div>' +
					'</div>' +
					'</body>'
				);

				// Add text
				doc.getElementById('text').textContent = text;

				// Calculate height
				let wrapper = doc.getElementById('wrapper');
				iframe.style.height = (Math.ceil(Math.max(wrapper.clientHeight, wrapper.scrollHeight)) + 38 + 2) + 'px';

				let close = (value) => {
					iframe.style.display = 'none';
					doc.close();
					iframe.parentNode.removeChild(iframe);
					resolve(value);
				};
				if (type == 'confirm') {
					doc.getElementById('ok-btn').focus();
					doc.getElementById('ok-btn').addEventListener('click', () => {close(true);}, false);
					doc.getElementById('cancel-btn').addEventListener('click', () => {close(false);}, false);
				}
				else if (type == 'prompt') {
					let input = doc.getElementById('value-input');
					input.value = defaultText;
					doc.getElementById('value-input').focus();
					doc.getElementById('ok-btn').addEventListener('click', () => {close(input.value);}, false);
					doc.getElementById('cancel-btn').addEventListener('click', () => {close(null);}, false);
				}
				else {
					doc.getElementById('ok-btn').focus();
					doc.getElementById('ok-btn').addEventListener('click', () => {close(undefined);}, false);
				}
			} catch (e) {
				reject(undefined);
			}
		});
	};
	// Handle Popups with fallback to fake popup
	let Popup = function(text, type='alert', defaultText, force = false) {
		let popup = type == 'confirm' ? cWindow.confirm : type == 'prompt' ? cWindow.prompt : cWindow.alert;
		return new Promise((resolve, reject) => {
			try {
				let t = new Date();
				let v = force ? false : defaultText === undefined ? popup('WebDevAuthn:\n' + text) : popup('WebDevAuthn:\n' + text, defaultText);
				if ((new Date() - t) < 100 || force) {
					v = PopupFallback(text, type, defaultText);
				}
				resolve(v);
			} catch (e) {
				reject(null);
			}
		});
	};

	if (!credentials || !PKCredential) {
		console.log('WebDevAuthn: WebAuthn is not availiable in this context.');
	}
	else {
		WebDevAuthn.init();
	}
	return WebDevAuthn;
})(window, window.navigator.credentials, window.PublicKeyCredential);

//window.WebDevAuthn.virtual(true);
//window.WebDevAuthn.development(true);
//window.WebDevAuthn.pauseWithAlert(true);
//window.WebDevAuthn.instanceOfPubKey(true);
//window.WebDevAuthn.debugger(true);
//window.WebDevAuthn.platformAuthenticatorAvailable(true);
