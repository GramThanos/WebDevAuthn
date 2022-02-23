// WebAuthn Create

var $ = window.jQuery;

window.authnGet = {

	// Global options variable
	// Shared between functions
	options : null,

	// First step
	generateOptions : function() {
		// Show message
		this.optionsTextContent('Generating options ...');

		var val, count, opt;
		// Initialize options object
		this.options = {publicKey: {}};

		val = $('#credential-get-rpid').val();
		if (val) {
			this.options.publicKey.rpId = val;
		}

		this.options.publicKey.challenge = $('#credential-get-challenge').val()
		if (this.options.publicKey.challenge.match(/^\[.+\]$/)) {
			this.options.publicKey.challenge = window.authnTools.auto(JSON.parse(this.options.publicKey.challenge));
			this.options.publicKey.challenge = window.authnTools.auto(this.options.publicKey.challenge);
		} else {
			this.options.publicKey.challenge = window.authnTools.base64ToBase64url(this.options.publicKey.challenge);
		}

		this.options.publicKey.allowCredentials = [];
		$('.credential-get-publickeycredentialdescriptor-input').each((index, input) => {
			val = $(input).val();
			if (val.length <= 0) return;
			opt = {type: "public-key", id: window.authnTools.auto(val)};
			// If transports
			val = $($('.credential-get-publickeycredentialdescriptor-select')[index]).val();
			index = val.indexOf('');
			if (index !== -1) val.splice(index, 1);
			if (val.length > 0) {
				opt.transports = val;
			}
			this.options.publicKey.allowCredentials.push(opt);
		});

		val = $('#credential-get-timeout').val();
		if (val.length != 0) {
			this.options.publicKey.timeout = parseInt(val, 10);
		}

		val = $('#credential-get-userVerification').val();
		if (val.length != 0) {
			this.options.publicKey.userVerification = val;
		}

		opt = {};
		count = 0;
		val = $('#credential-get-extensions-appid').val();
		if (val.length != 0) {
			count++;
			opt.appid = val;
		}
		val = $('#credential-get-extensions-txAuthSimple').val();
		if (val.length != 0) {
			count++;
			opt.txAuthSimple = val;
		}
		val = [
			$('#credential-get-extensions-txAuthGeneric-contentType').val(),
			$('#credential-get-extensions-txAuthGeneric-content').val()
		];
		if (val[0].length != 0 && val[1].length != 0) {
			count++;
			opt.txAuthGeneric = {
				contentType : val[0],
				content : val[1]
			};
		}
		val = $('#credential-get-extensions-uvi').val();
		if (val.length != 0) {
			count++;
			opt.uvi = true;
		}
		val = $('#credential-get-extensions-loc').val();
		if (val.length != 0) {
			count++;
			opt.loc = true;
		}
		val = $('#credential-get-extensions-uvm').val();
		if (val.length != 0) {
			count++;
			opt.uvm = true;
		}
		if (count > 0) {
			this.options.publicKey.extensions = opt;
		}

		// Show in console
		console.log('[Generate Options]', this.options);

		// Clear response
		this.responseTextContent('Response not yet generated.');
		// Check options
		this.renderNotes();
		// Show on UI
		this.renderOptions();
		// Show message
		window.jsNotify.success('Options generated!', {time2live : 2*1000});
	},

	getCredentials : function() {
		// More info in console
		console.log('[Get Credentials > Options]', this.options);
		// Clear response
		this.responseTextContent('Getting Credentials ...');
		// Start WebAuthn credentials get
		navigator.credentials.get(this.options).then((credential) => {
			// Save the credentials get
			this.credential = credential;
			// Print returned key
			console.log('[Get Credentials > PublicKeyCredential]', credential);
			// Analyze the credentials
			this.analyzeCredentials(credential);
			// Show Response
			this.renderCredentials();
			// Show message
			window.jsNotify.success('Credentials retrieved!', {time2live : 2*1000});
		}).catch((e) => {
			// Show error
			console.log('Error', e);
			if (typeof e === 'string') {
				window.jsNotify.danger(e);
				this.responseTextContent(e);
			}
			else if (typeof e.message === 'string') {
				window.jsNotify.danger(e.message);
				this.responseTextContent(e.message);
			}
			if (typeof e.stack === 'string') {
				window.jsNotify.danger(e.stack.replace(/\n/g, "<br>"));
			}
		});
	},

	analyzeCredentials : function(credential) {
		// Decode clientDataJSON
		var clientData = this.analyzeClientDataJSON(credential.response.clientDataJSON);
		this.clientData = clientData;

		// Decode authenticator data
		var authenticatorData = this.analyzeAuthenticatorData(credential.response.authenticatorData);
		this.authenticatorData = authenticatorData;

		// verify signature (async)
		this.verifySignature(credential.response.signature, authenticatorData);

		// Get Extension information
		var extensions = (authenticatorData.attestedCredentialData && authenticatorData.attestedCredentialData.extensions) ? authenticatorData.attestedCredentialData.extensions : credential.getClientExtensionResults();
		this.extensions = extensions;
		
		// Show in console
		console.log('[Get Client Extension Results]', this.extensions);
	},

	analyzeClientDataJSON : function(clientDataJSON) {
		// decode the clientDataJSON into a utf-8 string
		var utf8Decoder = new TextDecoder('utf-8');
		var decodedClientData = utf8Decoder.decode(clientDataJSON);
		// Show in console
		console.log('[Analyze Client Data JSON]', clientDataJSON, decodedClientData);
		// parse the string as an object
		return JSON.parse(decodedClientData);
	},

	analyzeAuthenticatorData : function(authData) {
		if (!(authData instanceof Uint8Array) && (authData instanceof ArrayBuffer)) {
			authData = new Uint8Array(authData);
		}
		var bufferSize = (authData.byteLength | authData.length);
		var authenticatorData = {};
		authenticatorData.rpIdHash = window.authnTools.auto(authData.slice(0, 32));
		authenticatorData.flags = window.authnTools.uint8ArrayToInt(authData.slice(32, 32+1)).toString(2);
		authenticatorData.signCount = window.authnTools.uint8ArrayToInt(authData.slice(32+1, 32+1+4));
		if (bufferSize >= 32+1+4+16) {
			// AttestedCredentialData
			authenticatorData.attestedCredentialData = {};
			authenticatorData.attestedCredentialData.aaguid = window.authnTools.auto(authData.slice(32+1+4, 32+1+4+16));
			authenticatorData.attestedCredentialData.credentialIdLength = window.authnTools.uint8ArrayToInt(authData.slice(32+1+4+16, 32+1+4+16+2));
			var length = authenticatorData.attestedCredentialData.credentialIdLength;
			authenticatorData.attestedCredentialData.credentialId = window.authnTools.auto(authData.slice(32+1+4+16+2, 32+1+4+16+2+length));
			
			var lastCBORObjects = window.CBOR.multiDecode(authData.slice(32+1+4+16+2+length, authData.length).buffer);
			authenticatorData.attestedCredentialData.credentialPublicKey = lastCBORObjects[0];
			if (lastCBORObjects.length > 1) authenticatorData.attestedCredentialData.extensions = lastCBORObjects[1];

			var pubkey = authenticatorData.attestedCredentialData.credentialPublicKey;
			for (let i in pubkey) {
				if (pubkey.hasOwnProperty(i) && pubkey[i] instanceof Uint8Array) {
					pubkey[i] = window.authnTools.auto(pubkey[i]);
				}
			}
		}
		
		// Show in console
		console.log('[Analyze Authenticator Data]', authData, authenticatorData);

		return authenticatorData;
	},

	// Under construction
	verifySignature : function(signature, authenticatorData) {
		console.log(authenticatorData);
		if (!authenticatorData.attestedCredentialData) return;
		let publicKey = authenticatorData.attestedCredentialData.credentialPublicKey;
		console.log('publicKey', publicKey);
		publicKey = crypto.subtle.importKey('jwk', {
			crv: "P-256",
			//d: "TwmDP7lirvbtBR8zWAz0aK00o5-WPAGyqoY9ervGVGU",
			ext: true,
			key_ops: ["sign"],
			kty: "EC",
			x: publicKey[-2],
			y: publicKey[-3],
		}, {name: 'ECDSA', namedCurve: 'P-256'}, true, []);
		publicKey.then(x => {
			console.log('publicKey', x);
			//this.isValidSignature = isValidSignature;
		})
	},

	checkOptions : function() {
		let observations = [];

		// Check for unknown attributes
		let checkUnknownKeys = (path, obj, known) => {
			// Check for unknown keys
			for (let key in obj) {
				if (obj.hasOwnProperty(key) && !known.includes(key)) {
					observations.push({message: 'unknown attribute "' + path + '.' + key + '"', type: 'warning'});
				}
			}
		};
		// Check if BufferSource
		let isBufferSource = (value) => {
			return (
				value instanceof Int8Array ||
				value instanceof Uint8Array ||
				value instanceof Uint8ClampedArray ||
				value instanceof Int16Array ||
				value instanceof Uint16Array ||
				value instanceof Int32Array ||
				value instanceof Uint32Array ||
				value instanceof Float32Array ||
				value instanceof Float64Array ||
				value instanceof DataView ||
				value instanceof ArrayBuffer
			);
		}
		// Check if DOMString
		let isDOMString = (value) => {
			return (typeof value === 'string');
		}
		// Check if USVString
		let isUSVString = (value) => {
			return (typeof value === 'string');
		}
		// Check if unsigned long 
		let isUnsignedLong  = (value) => {
			return (Number.isInteger(value) && value >= 0);
		}
		// Check if long 
		let isLong  = (value) => {
			return Number.isInteger(value);
		}
		// Check if sequence
		let isSequence = (value) => {
			return Array.isArray(value);
		}
		// Chekc if boolean
		let isBoolean = (value) => {
			return (value === true || value === false);
		}

		// required
		if (!this.options.hasOwnProperty('publicKey')) {
			observations.push({message: '"publicKey" was not found.', type: 'danger'});
			return observations;
		}

		// required
		if (!this.options.publicKey.hasOwnProperty('challenge')) {
			observations.push({message: '"publicKey.challenge" was not found.', type: 'danger'});
		}
		else {
			// datatype
			if (!isBufferSource(this.options.publicKey.challenge)) {
				observations.push({message: '"publicKey.challenge" does not have a BufferSource type value.', type: 'danger'});
			}
			else if (this.options.publicKey.challenge.byteLength < 16) {
				observations.push({message: '"publicKey.challenge" size is less than 16 bytes', type: 'danger'});
			}
		}

		(() => {
			// Calculate recommended values for timeout
			let userVerification = this.options.publicKey.hasOwnProperty('userVerification') ? this.options.publicKey.userVerification : 'preferred';
			let recomended = (userVerification == 'discouraged') ? {
					range : [0.5 * 60 * 1000, 3 * 60 * 1000],
					default : 2 * 60 * 1000
				} : {
					range : [0.5 * 60 * 1000, 10 * 60 * 1000],
					default : 5 * 60 * 1000
				};

			if (this.options.publicKey.hasOwnProperty('timeout')) {
				// should be unsigned long
				if (!isUnsignedLong(this.options.publicKey.timeout)) {
					observations.push({message: '"publicKey.timeout" does not have an unsigned long type value.', type: 'warning'});
				}
				
				// Try to parse it as int
				let timeout = parseInt(this.options.publicKey.timeout, 10);
				if (isNaN(timeout)) {
					observations.push({message: 'Failed to parse "publicKey.timeout" as integer.', type: 'danger'});
				}
				else {
				
					// if it is too short
					if (timeout < 5 * 1000) {
						observations.push({message: '"publicKey.timeout" value seem to be too short.', type: 'warning'});
					}

					// Check if it is outside the recomended values
					if (timeout < recomended.range[0] || timeout > recomended.range[1]) {
						observations.push({message: '"publicKey.timeout" value is not between the recommended values of ' + recomended.range[0] + ' and ' + recomended.range[1] + '.', type: 'warning'});
					}

				}
			}
			else {
				observations.push({message: 'The recommended default browser value for "publicKey.timeout" is ' + recomended.default + '.', type: 'info'});
				observations.push({message: 'The recommended default server value for "publicKey.timeout" is between ' + recomended.range[0] + ' and ' + recomended.range[1] + '.', type: 'info'});
			}
		})();

		if (this.options.publicKey.hasOwnProperty('rpId')) {
			if (!isUSVString(this.options.publicKey.rpId)) {
				observations.push({message: '"publicKey.rpId" does not have a DOMString type value.', type: 'danger'});
			}
		}

		// default value
		if (!this.options.publicKey.hasOwnProperty('allowCredentials')) {
			observations.push({message: '"publicKey.allowCredentials" was not set, default value is [].', type: 'info'});
		}
		else {
			for (let i = 0; i < this.options.publicKey.allowCredentials.length; i++) {
				// required
				if (!this.options.publicKey.allowCredentials[i].hasOwnProperty('type')) {
					observations.push({message: '"publicKey.allowCredentials[' + i + '].type" was not found.', type: 'danger'});
				}
				else if (!isDOMString(this.options.publicKey.allowCredentials[i].type)) {
					observations.push({message: '"publicKey.allowCredentials[' + i + '].type" does not have a DOMString type value.', type: 'danger'});
				}
				else if (!['public-key'].includes(this.options.publicKey.allowCredentials[i].type)) {
					observations.push({message: '"publicKey.allowCredentials[' + i + '].type" is set to an unknown value "' + this.options.publicKey.allowCredentials[i].type + '".', type: 'danger'});
				}

				// required
				if (!this.options.publicKey.allowCredentials[i].hasOwnProperty('id')) {
					observations.push({message: '"publicKey.allowCredentials[' + i + '].id" was not found.', type: 'danger'});
				}
				else if (!isBufferSource(this.options.publicKey.allowCredentials[i].id)) {
					observations.push({message: '"publicKey.allowCredentials[' + i + '].id" does not have a BufferSource type value.', type: 'danger'});
				}
				else if (this.options.publicKey.allowCredentials[i].id.byteLength < 16) {
					observations.push({message: '"publicKey.allowCredentials[' + i + '].id" size is less than 16 bytes', type: 'danger'});
				}

				if (this.options.publicKey.allowCredentials[i].hasOwnProperty('transports')) {
					if (!isSequence(this.options.publicKey.allowCredentials[i].transports)) {
						observations.push({message: '"publicKey.allowCredentials[' + i + '].transports" does not have a sequence type value.', type: 'danger'});
					}
					else {
						let count = 0;
						for (let j = 0; j < this.options.publicKey.allowCredentials[i].transports.length; j++) {
							if (!isDOMString(this.options.publicKey.allowCredentials[i].transports[j])) {
								observations.push({message: '"publicKey.allowCredentials[' + i + '].transports[' + j + ']" does not have a DOMString type value.', type: 'danger'});
							}
							else if (!['usb', 'nfc', 'ble', 'internal'].includes(this.options.publicKey.allowCredentials[i].transports[j])) {
								observations.push({message: '"publicKey.allowCredentials[' + i + '].transports[' + j + ']" is set to an unknown value "' + this.options.publicKey.allowCredentials[i].transports[j] + '".', type: 'danger'});
							}
							else {
								count ++;
							}
						}
						if (count <= 0) {
							observations.push({message: '"publicKey.allowCredentials[' + i + '].transports" does not contain any valid transport value.', type: 'danger'});
						}
					}
				}
			}
		}

		if (this.options.publicKey.hasOwnProperty('userVerification')) {
			if (!isDOMString(this.options.publicKey.userVerification)) {
				observations.push({message: '"publicKey.userVerification" does not have a DOMString type value.', type: 'danger'});
			}
			else if (!['required', 'preferred', 'discouraged'].includes(this.options.publicKey.userVerification)) {
				observations.push({message: '"publicKey.userVerification" is set to an unknown value.', type: 'danger'});
			}
		}
		else {
			observations.push({message: '"publicKey.userVerification" was not set, default value is "preferred".', type: 'info'});
		}

		// Advice to avoid attacks
		if (
			!this.options.publicKey.hasOwnProperty('userVerification') ||
			this.options.publicKey.userVerification !== 'required'
		) {
			observations.push({message: '"publicKey.userVerification" is adviced to be set to "required".', type: 'warning'});
		}

		if (this.options.publicKey.hasOwnProperty('extensions')) {
			for (let extension in this.options.publicKey.extensions) {
				if (this.options.publicKey.extensions.hasOwnProperty(extension)) {

					if (extension === 'appid') {
						if (!isUSVString(this.options.publicKey.extensions[extension])) {
							observations.push({message: '"publicKey.extensions.appid" does not have a USVString type value.', type: 'danger'});
						}
					}
					else if (extension === 'uvm') {
						if (!isBoolean(this.options.publicKey.extensions[extension])) {
							observations.push({message: '"publicKey.extensions.uvm" does not have a boolean type value.', type: 'danger'});
						}
					}
					else if (extension === 'largeBlob') {
						// ToDo
						observations.push({message: '"largeBlob" extension ignored.', type: 'info'});
					}

					else {
						observations.push({message: 'unknown extension "' + extension + '".', type: 'warning'});
					}

				}
			}
		}

		// Check for unknown keys
		for (let key in this.options.publicKey) {
			if (this.options.publicKey.hasOwnProperty(key) && !['challenge', 'timeout', 'rpId', 'allowCredentials', 'userVerification', 'extensions'].includes(key)) {
				observations.push({message: 'unknown attribute "publicKey.' + key + '"', type: 'warning'});
			}
		}

		return observations;
	},

	renderNotes : function() {
		let wrapper = document.getElementById('credential-get-options-notes');
		wrapper.textContent = '';

		this.observations = this.checkOptions();

		document.getElementById('credential-get-options-notes-notification').textContent = this.observations.length;

		this.observations.forEach(o => {
			let row = document.createElement('div');
			let span = document.createElement('span');
			span.className = 'badge rounded-pill bg-' + o.type;
			span.textContent = o.type.toUpperCase();
			row.appendChild(span);
			row.appendChild(document.createTextNode(' '));
			let msg = document.createElement('pre');
			msg.style.display = 'inline';
			msg.textContent = o.message;
			row.appendChild(msg);
			wrapper.appendChild(row);
		});
	},

	renderOptions : function() {
		var options;
		var rawWrapper = document.getElementById('credential-get-options-raw');
		var dynamicWrapper = document.getElementById('credential-get-options-dynamic');

		options = window._.cloneDeep(this.options);
		if (options.publicKey.hasOwnProperty('rpid'))
			options.publicKey.rpid = window.authnTools.auto(options.publicKey.rpid);
		let len = options.publicKey.challenge.length;
		options.publicKey.challenge = window.authnTools.auto(options.publicKey.challenge);
		var info = this.identifyBuffers(options.publicKey.allowCredentials);
		var code = '' +
			'// Get Credentials\n' +
			'navigator.credentials.get(' + 
			JSON.stringify(options, null, 4)
				.replace(new RegExp('("challenge":\\s*)"(' + options.publicKey.challenge + ')"(,?)'), '$1fb64("$2")$3 // Uint8Array(' + len + ')')
				+	
				').then((credentials) => {\n' +
				'    console.log(credentials);\n' +
				'});\n' +
				'\n' +
				'function fb64(x) { // Base64 to Uint8Array\n' +
				'    return Uint8Array.from(atob(x.replace(/-/g, \'+\').replace(/_/g, \'/\')), c => c.charCodeAt(0));\n' +
				'};';
		code = this.swapIdentifiedBuffers(code, info, {'Uint8Array':'fb64("{{value}}")'});
		rawWrapper.innerHTML = code;

		options = window._.cloneDeep(this.options);
		dynamicWrapper.innerHTML = '';
		var tree = window.jsonTree.create(this.options, dynamicWrapper);
		tree.expand();
	},

	renderCredentials : function() {
		var credential;
		// Get Wrappers
		var rawWrapper = document.getElementById('credential-get-response-raw');
		var decodedWrapper = document.getElementById('credential-get-response-decoded');
		var extensionsWrapper = document.getElementById('credential-get-response-ext');

		// Prepare credential object
		var $credential = {};
		for (let item in this.credential) {
			if (typeof this.credential[item] != 'function') {
				$credential[item] = this.credential[item];
			}
		}
		$credential.response = {};
		for (let item in this.credential.response) {
			if (typeof this.credential.response[item] != 'function') {
				$credential.response[item] = this.credential.response[item];
			}
		}
		
		var info;

		// Render raw response
		credential = window._.cloneDeep($credential);
		credential.rawId = window.authnTools.auto(credential.rawId);
		info = this.identifyBuffers(credential.response);
		console.log('[Render Credential Raw]', credential);
		var code = '' +
			JSON.stringify(credential, null, 4)
				.replace(new RegExp('("rawId":\\s*)"(' + credential.rawId + ')"(,?)'), '$1$2$3 // ArrayBuffer(' + window.authnTools.auto(credential.rawId).length + ')');
		code = this.swapIdentifiedBuffers(code, info);
		rawWrapper.innerHTML = code;

		// Render decoded
		credential = window._.cloneDeep($credential);
		credential.rawId = window.authnTools.auto(credential.rawId);
		credential.response.authenticatorData = window._.cloneDeep(this.authenticatorData);
		credential.response.clientDataJSON = window._.cloneDeep(this.clientData);
		info = this.identifyBuffers({
			rpIdHash : credential.response.authenticatorData.rpIdHash,
			signature : credential.response.signature,
			userHandle : credential.response.userHandle
		});
		credential.response.signature = window.authnTools.auto(credential.response.signature);
		credential.response.userHandle = credential.response.userHandle ? window.authnTools.auto(credential.response.userHandle) : credential.response.userHandle;
		console.log('[Render Credential Decoded]', credential);
		
		code = '' +
			JSON.stringify(credential, null, 4)
				.replace(new RegExp('("rawId":\\s*)"(' + credential.rawId + ')"(,?)'), '$1$2$3 // ArrayBuffer(' + window.authnTools.auto(credential.rawId).length + ')')
				.replace(/"flags": "([01]+)"/, '"flags": 0x$1');
		code = this.swapIdentifiedBuffers(code, info);
		decodedWrapper.innerHTML = code;

		// Show extensions
		extensionsWrapper.innerHTML = JSON.stringify(this.extensions, null, 4);
	},

	optionsTextContent : function(text) {
		document.getElementById('credential-get-options-raw').textContent = text;
		document.getElementById('credential-get-options-dynamic').textContent = text;
		document.getElementById('credential-get-options-notes').textContent = text;
		document.getElementById('credential-get-options-notes-notification').textContent = 0;
	},

	responseTextContent : function(text) {
		document.getElementById('credential-get-response-raw').textContent = text;
		document.getElementById('credential-get-response-decoded').textContent = text;
		document.getElementById('credential-get-response-ext').textContent = text;
	},

	identifyBuffers : function(input) {
		var info = [];
		var check = [input];
		while (check.length) {
			let obj = check.shift();
			for (let item in obj) {
				if (obj.hasOwnProperty(item)) {
					if (obj[item] instanceof Uint8Array || obj[item] instanceof ArrayBuffer) {
						let v = window.authnTools.auto(obj[item]);
						info.push({item : obj[item], name: item, type: (obj[item] instanceof Uint8Array ? 'Uint8Array' : 'ArrayBuffer'), value: v, len: (obj[item].length || obj[item].byteLength)});
						obj[item] = v;
					}
					else if (obj[item] instanceof Array) {
						for (let i = 0; i < obj[item].length; i++) {
							if (obj[item][i] instanceof Uint8Array || obj[item][i] instanceof ArrayBuffer) {
								let v = window.authnTools.auto(obj[item][i]);
								info.push({item : obj[item][i], name: null, type: (obj[item][i] instanceof Uint8Array ? 'Uint8Array' : 'ArrayBuffer'), value: v, len: (obj[item][i].length || obj[item][i].byteLength)});
								obj[item][i] = v;
							}
						}
					}
					else if (typeof obj[item] == 'object') {
						check.push(obj[item]);
					}
				}
			}
		}
		return info;
	},

	swapIdentifiedBuffers : function(code, info) {
		while (info.length) {
			let item = info.shift();
			if (item.name == null)
				code = code.replace(new RegExp('"(' + item.value + ')"(,?)'), '$1$2 // ' + item.type + '(' + item.len + ')');
			else
				code = code.replace(new RegExp('("' + item.name + '":\\s*)"(' + item.value + ')"(,?)'), '$1$2$3 // ' + item.type + '(' + item.len + ')');
		}
		return code;
	},

	initCredentials : function() {
		var credentials = window.credStorage.getAll().sort((a, b) => (b.created - a.created));
		// If key exists
		for (let i = 0; i <= 5 - 1 && i < credentials.length; i++) {
			this.newCredentials(credentials[i].id);
		}

		// Add button functionality
		$('#credential-get-publickeycredentialdescriptor-add').click(() => {
			let i = document.getElementsByClassName('credential-get-publickeycredentialdescriptor-select').length;
			if (credentials.length < i) {
				this.newCredentials(credentials[i]);
			}
			else {
				this.newCredentials();
			}
		});
	},

	newCredentials : function(creds = '') {
		// New Credentials html
		let newCredentials = $(
			'<div class="form-group sub-group">' +
			'	<button type="button" class="btn btn-outline-danger btn-sm">&times;</button>' +
			'	<label>publickeycredentialdescriptor.id</label>' +
			'	<input type="text" class="form-control credential-get-publickeycredentialdescriptor-input" value="">' +
			'' +
			'	<label>publickeycredentialdescriptor.transports</label>' +
			'	<select class="custom-select credential-get-publickeycredentialdescriptor-select" multiple>' +
			'		<option value="" selected="selected">Don\'t set</option>' +
			'		<option value="usb">usb</option>' +
			'		<option value="nfc">nfc</option>' +
			'		<option value="ble">ble</option>' +
			'		<option value="internal">internal</option>' +
			'	</select>' +
			'</div>'
		);
		// Delete button functionality
		newCredentials.find('.btn:eq(0)').click(() => {
			newCredentials.remove();
		});
		// Populate selection
		newCredentials.find('input:eq(0)').val(creds);
		// Add on page
		$('#credential-get-publickeycredentialdescriptor-wrapper').append(newCredentials);
	}
}

// Handle button clicks
$('#credential-get-generate').click(() => {
	window.authnGet.generateOptions();
});
$('#credential-get-create').click(() => {
	window.authnGet.getCredentials();
});

// Get saved credentials
window.authnGet.initCredentials();

// Testing mode
(function() {
	// Enable-Disable options
	document.getElementById('virtual-testing-checkbox').addEventListener('change', function() {
		document.getElementById('virtual-testing-options').style.display = this.checked ? 'block' : 'none';
	});

	document.getElementById('testing-freezeSigCounter-checkbox').addEventListener('change', function() {
		window.VirtualAuthn.doTesting('freezeSigCounter',
			this.checked ?
				parseInt(document.getElementById('testing-freezeSigCounter-value').value, 10) :
				false
		);
	});
	document.getElementById('testing-freezeUserVerificationFlag-checkbox').addEventListener('change', function() {
		window.VirtualAuthn.doTesting('freezeUserVerificationFlag',
			this.checked ?
				(document.getElementById('testing-freezeUserVerificationFlag-value').value === 'true' ? 1 : 0) :
				false
		);
	});
	document.getElementById('testing-relayPartyID-checkbox').addEventListener('change', function() {
		window.VirtualAuthn.doTesting('relayPartyID',
			this.checked ?
				document.getElementById('testing-relayPartyID-value').value :
				false
		);
	});
	document.getElementById('testing-origin-checkbox').addEventListener('change', function() {
		window.VirtualAuthn.doTesting('origin',
			this.checked ?
				document.getElementById('testing-origin-value').value :
				false
		);
	});
	document.getElementById('testing-userHandle-checkbox').addEventListener('change', function() {
		window.VirtualAuthn.doTesting('userHandle',
			this.checked ?
				document.getElementById('testing-userHandle-value').value :
				false
		);
	});
})();

// Handle errors
window.addEventListener('error', (e) => {
	// Show error
	console.log('Error', e);
	if (typeof e === 'string') {
		window.jsNotify.danger(e);
	}
	else if (typeof e.message === 'string') {
		window.jsNotify.danger(e.message);
	}
	if (typeof e.stack === 'string') {
		window.jsNotify.danger(e.stack.replace(/\n/g, "<br>"));
	}
}, false);

// Enable cross window and domain communication
(function() {

	// Show send result button
	let button = document.getElementById('credential-get-send');
	button.addEventListener('click', ()=> {
		if (!window.authnGet.credential)
			return;
		if (window.authnGet.crossSiteReponse)
			window.authnGet.crossSiteReponse();
		button.setAttribute('disabled', 'disabled');
	}, false);

	// Authentication Requests
	let externalRequestsHandler = function(origin, data, callback) {
		console.log('External Request', data, origin);
		// Set URL
		if (origin) window.VirtualAuthn.setUrl(origin);

		// Toggle virtual/physical
		if (data.type == 'virtual') {
			window.VirtualAuthn.goVirtual();
		}
		else if (data.type == 'physical') {
			window.VirtualAuthn.goPhysical();
		}

		// Parse data
		if (data.options) data.options = window.authnTools.unserialize(data.options);
		if (data.credential) data.credential = window.authnTools.unserialize(data.credential);
		if (data.extensions) data.extensions = window.authnTools.unserialize(data.extensions);
		button.parentNode.parentNode.style.display = 'block';

		// If options
		if (data.options) {
			window.authnGet.options = data.options;
			// Check options
			window.authnGet.renderNotes();
			// Show on UI
			window.authnGet.renderOptions();
			// Show message
			window.jsNotify.success('Options retrieved!', {time2live : 5*1000});
		}
		if (data.credential) {
			let credential = data.credential;
			let extensions = data.extensions || {};
			credential.getClientExtensionResults = () => {return extensions};
			credential = new (window.AuthnDevice.VirtualClasses.VirtualPublicKeyCredential())(credential);
			// Save the credentials generated
			window.authnGet.credential = credential;
			// Print returned key
			console.log('[Get Credentials > PublicKeyCredential]', credential);
			// Analyze the credentials
			window.authnGet.analyzeCredentials(credential);
			// Show Response
			window.authnGet.renderCredentials();
			// Show message
			window.jsNotify.success('Credentials generated!', {time2live : 5*1000});
		}

		window.authnGet.crossSiteReponse = () => {
			callback({
				id: data.id,
				options: window.authnTools.serialize(window.authnGet.options),
				credential: window.authnTools.serialize(window.authnGet.credential)
			});
		};

		// Hide unused GUI
		let interface = document.getElementsByClassName('gui-custom-options');
		for (var i = interface.length - 1; i >= 0; i--) {
			interface[i].style.display = 'none';
		}
	};


	// Handle external requests for authentications through URL requests
	window.addEventListener('load', () => {
		// Load data from URL
		let data = new URL(window.location.href).searchParams.get('data');
		if (!data) return;
		// Decode data
		try {
			data = window.atob(data);
			data = JSON.parse(data);
		} catch (e) {
			Popup('Failed: ' + e.toString());
			return;
		}

		let responseCallback = (response) => {
			// Show message
			window.jsNotify.success('Credentials returned!', {time2live : 5*1000});
			console.log(response);
			console.log(JSON.stringify(response));
			// Show data
			let data = JSON.stringify(response);
			Popup('Copy-Paste the results back to other input:', 'prompt', data, true);
		};

		externalRequestsHandler(null, data, responseCallback);
	}, false);
	document.getElementById('credential-get-load-from-code').addEventListener('click', () => {
		Popup('Paste the code to load:', 'prompt', '', true).then((data) => {
			if (!data) return;
			// If URL was given
			if ((/^https?:\/\//i).test(data)) data = new URL(data).searchParams.get('data');
			try {
				// Decode data
				data = window.atob(data);
				data = JSON.parse(data);
			} catch (e) {
				Popup('Failed: ' + e.toString());
				return;
			}

			let responseCallback = (response) => {
				// Show message
				window.jsNotify.success('Credentials returned!', {time2live : 5*1000});
				console.log(response);
				console.log(JSON.stringify(response));
				// Show data
				let data = JSON.stringify(response);
				Popup('Copy-Paste the results back to other input:', 'prompt', data, true);
			};

			externalRequestsHandler(null, data, responseCallback);
		});
	}, false);

	if (!window.opener)
		return;

	// Handle requests for authentications through message posting
	window.addEventListener('message', (event) => {
		// Send response
		window.opener.postMessage({
			id: event.data.id,
			message: 'Request received!'
		}, event.origin);

		let responseCallback = (response) => {
			// Send credential
			window.opener.postMessage(response, event.origin);
			// Show message
			window.jsNotify.success('Credentials returned!', {time2live : 5*1000});
		};

		externalRequestsHandler(event.origin, event.data, responseCallback);
	}, false);
})();
