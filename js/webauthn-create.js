// WebAuthn Create

var $ = window.jQuery;

window.authnCreate = {

	// Global options variable
	// Shared between functions
	options : null,

	// First step
	generateOptions : function() {
		// Show message
		this.optionsTextContent('Generating options ...');

		var val;
		// Initialize options object
		this.options = {publicKey: {}};

		this.options.publicKey.rp = {};
		this.options.publicKey.rp.name = $('#credential-creation-rp-name').val();
		val = $('#credential-creation-rp-id').val();
		if (val) {
			this.options.publicKey.rp.id = val;
		}

		this.options.publicKey.user = {};
		this.options.publicKey.user.name = $('#credential-creation-user-name').val();
		this.options.publicKey.user.displayName = $('#credential-creation-user-displayName').val();
		val = $('#credential-creation-user-id').val();
		if (val.match(/^\[.+\]$/)) {
			this.options.publicKey.user.id = window.authnTools.auto(JSON.parse(val));
			this.options.publicKey.user.id = window.authnTools.auto(this.options.publicKey.user.id);
		} else {
			this.options.publicKey.user.id = window.authnTools.auto(val);
		}

		this.options.publicKey.challenge = $('#credential-creation-challenge').val()
		if (this.options.publicKey.challenge.match(/^\[.+\]$/)) {
			this.options.publicKey.challenge = window.authnTools.auto(JSON.parse(this.options.publicKey.challenge));
			this.options.publicKey.challenge = window.authnTools.auto(this.options.publicKey.challenge);
		} else {
			this.options.publicKey.challenge = window.authnTools.base64ToBase64url(this.options.publicKey.challenge);
		}


		this.options.publicKey.pubKeyCredParams = [];
		$('.credential-creation-pubKeyCredParams-select').each((index, algorithm) => {
			this.options.publicKey.pubKeyCredParams.push({type: "public-key", alg: JSON.parse($(algorithm).val())});
		});

		let count, opt;
		val = $('#credential-creation-timeout').val();
		if (val.length != 0) {
			this.options.publicKey.timeout = parseInt(val, 10);
		}

		opt = {};
		count = 0;
		val = $('#credential-creation-authenticatorSelection-authenticatorAttachment').val();
		if (val.length != 0) {
			count++;
			opt.authenticatorAttachment = val;
		}
		val = $('#credential-creation-authenticatorSelection-requireResidentKey').val();
		if (val.length != 0) {
			count++;
			opt.requireResidentKey = JSON.parse(val);
		}
		val = $('#credential-creation-authenticatorSelection-userVerification').val();
		if (val.length != 0) {
			count++;
			opt.userVerification = val;
		}
		if (count > 0) {
			this.options.publicKey.authenticatorSelection = opt;
		}

		val = $('#credential-creation-attestation').val();
		if (val.length != 0) {
			this.options.publicKey.attestation = val;
		}

		opt = {};
		count = 0;
		val = $('#credential-creation-extensions-authnSel').val();
		if (val.length != 0) {
			count++;
			opt.authnSel = val;
		}
		val = $('#credential-creation-extensions-exts').val();
		if (val.length != 0) {
			count++;
			opt.exts = true;
		}
		val = $('#credential-creation-extensions-uvi').val();
		if (val.length != 0) {
			count++;
			opt.uvi = true;
		}
		val = $('#credential-creation-extensions-loc').val();
		if (val.length != 0) {
			count++;
			opt.loc = true;
		}
		val = $('#credential-creation-extensions-uvm').val();
		if (val.length != 0) {
			count++;
			opt.uvm = true;
		}
		val = [
			$('#credential-creation-extensions-biometricPerfBounds-far').val(),
			$('#credential-creation-extensions-biometricPerfBounds-frr').val()
		];
		if (val[0].length != 0 && val[1].length != 0 && !isNaN(parseFloat(val[0])) && !isNaN(parseFloat(val[1]))) {
			count++;
			opt.biometricPerfBounds = {
				FAR: parseFloat(val[0]),
				FRR: parseFloat(val[1])
			};
		}
		if (count > 0) {
			this.options.publicKey.extensions = opt;
		}

		// Show in console
		console.log('[Generate Options]', this.options);

		// Clear response
		this.responseTextContent('Response not yet generated.');
		// Check options
		this.prepareNotes();
		// Show on UI
		this.renderOptions();
		this.analyseOptions();
		// Render Notes
		this.renderNotes();
		// Show message
		window.jsNotify.success('Options generated!', {time2live : 2*1000});
	},

	createCredentials : function() {
		// More info in console
		console.log('[Create Credentials > Options]', this.options);
		// Clear response
		this.responseTextContent('Creating Credentials ...');
		// Get user id
		let userid = (
			this.options.hasOwnProperty('publicKey') &&
			this.options.publicKey.hasOwnProperty('user') &&
			this.options.publicKey.user.hasOwnProperty('id')
		) ? this.options.publicKey.user.id : null;
		// Start WebAuthn credentials creation
		navigator.credentials.create(this.options).then((credential) => {
			// Save the credentials generated
			this.credential = credential;
			// Print returned key
			console.log('[Create Credentials > PublicKeyCredential]', credential);
			// Analyze the credentials
			this.analyzeCredentials(credential);
			// Show Response
			this.renderCredentials();
			// Show message
			window.jsNotify.success('Credentials generated!', {time2live : 2*1000});
			// Store Credential
			if (this.storeCredentials) {
				window.credStorage.add(
					credential.id,
					window.authnTools.auto(userid),
					this.clientData.origin,
					credential.isVirtual && credential.isVirtual() ? 'virtual' : 'fmt-' + this.attestationObject.fmt
				);
			}
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

		// Decode attestationObject
		var attestationObject = this.analyzeAttestationObject(credential.response.attestationObject);
		this.attestationObject = attestationObject;

		// Parse attestation
		var attestation = this.analyzeAttestation(attestationObject);
		this.attestation = attestation;

		// Decode authenticator data
		var authenticatorData = this.analyzeAuthenticatorData(attestationObject.authData);
		this.authenticatorData = authenticatorData;

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

	analyzeAttestationObject : function(attestationObject) {
		return window.CBOR.decode(attestationObject);
	},

	analyzeAuthenticatorData : function(authData) {
		// Unpack authenticator data
		// https://www.w3.org/TR/webauthn/#authenticator-data
		var authenticatorData = {};
		authenticatorData.rpIdHash = window.authnTools.auto(authData.slice(0, 32));
		authenticatorData.flags = window.authnTools.uint8ArrayToInt(authData.slice(32, 32+1)).toString(2);
		authenticatorData.signCount = window.authnTools.uint8ArrayToInt(authData.slice(32+1, 32+1+4));
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

		// Show in console
		console.log('[Analyze Authenticator Data]', authData, authenticatorData);

		return authenticatorData;
	},

	analyzeAttestation : function(attestationObject) {
		// https://www.iana.org/assignments/webauthn

		// Prepare info
		var info =  {
			id : attestationObject.fmt,
			name : 'Unknown Format',
			description : 'No description.',
			format : false,
			message : 'Failed to identify attestation format.'
		};

		// Detect format
		switch(attestationObject.fmt) {
			case 'none':
				info.name = 'No Attestation';
				info.description = 'No attestation object was returned.';
				info.format = false;
				info.message = 'Nothing to decode.';
				break;

			case 'packed':
				info.name = 'Packed Attestation Statement Format';
				info.description = 'The "packed" attestation statement format is a WebAuthn-optimized format for attestation. It uses a very compact but still extensible encoding method. This format is implementable by authenticators with limited resources (e.g., secure elements).';
				info.format = this.analyzeAttestation_packed(attestationObject);
				info.message = info.format ? 'Decoded successfully.' : 'Decoding failed.';
				break;

			case 'tpm':
				info.name = 'TPM Attestation Statement Format';
				info.description = 'The TPM attestation statement format returns an attestation statement in the same format as the packed attestation statement format, although the rawData and signature fields are computed differently.';
				info.format = this.analyzeAttestation_tpm(attestationObject);
				info.message = info.format ? 'Decoded successfully.' : 'Decoding failed.';
				break;

			case 'android-key':
				info.name = 'Android Key Attestation Statement Format';
				info.description = 'Platform-provided authenticators based on versions "N", and later, may provide this proprietary "hardware attestation" statement.';
				info.format = false;
				info.message = 'This format decoding is not implemented.';
				break;

			case 'android-safetynet':
				info.name = 'Android SafetyNet Attestation Statement Format';
				info.description = 'Android-based, platform-provided authenticators MAY produce an attestation statement based on the Android SafetyNet API.';
				info.format = false;
				info.message = 'This format decoding is not implemented.';
				break;

			case 'fido-u2f':
				info.name = 'FIDO U2F Attestation Statement Format';
				info.description = 'Used with FIDO U2F authenticators';
				info.format = this.analyzeAttestation_fidou2f(attestationObject);
				info.message = info.format ? 'Decoded successfully.' : 'Decoding failed.';
				break;
		}

		// Show in console
		console.log('[Analyze Attestation]', attestationObject, info.format);

		return info;
	},

	analyzeAttestation_packed : function(attestationObject) {
		// Format 1 - Certificate
		if (
			attestationObject.hasOwnProperty('attStmt') &&
			attestationObject.attStmt.hasOwnProperty('alg') &&
			attestationObject.attStmt.hasOwnProperty('sig') &&
			attestationObject.attStmt.hasOwnProperty('x5c')
		) {
			// Get Algorithm
			let alg = attestationObject.attStmt.alg.toString();
			alg = window.authnTools.ianaAlgorithms.hasOwnProperty(alg) ? '(' + alg + ') ' + window.authnTools.ianaAlgorithms[alg] : 'Unknown (' + alg + ')';
			// Return data
			return {
				fmt : attestationObject.fmt,
				attStmt : {
					alg : alg,
					sig : attestationObject.attStmt.sig,
					x5c : attestationObject.attStmt.x5c
				}
			};
		}

		// Format 2 - ECDAA KeyID
		if (
			attestationObject.hasOwnProperty('attStmt') &&
			attestationObject.attStmt.hasOwnProperty('alg') &&
			attestationObject.attStmt.hasOwnProperty('sig') &&
			attestationObject.attStmt.hasOwnProperty('ecdaaKeyId')
		) {
			// Get Algorithm
			let alg = attestationObject.attStmt.alg.toString();
			alg = window.authnTools.ianaAlgorithms.hasOwnProperty(alg) ? '(' + alg + ') ' + window.authnTools.ianaAlgorithms[alg] : 'Unknown (' + alg + ')';
			// Return data
			return {
				fmt : attestationObject.fmt,
				attStmt : {
					alg : alg,
					sig : attestationObject.attStmt.sig,
					ecdaaKeyId : attestationObject.attStmt.ecdaaKeyId
				}
			};
		}

		// Format 3 - Self Signed
		if (
			attestationObject.hasOwnProperty('attStmt') &&
			attestationObject.attStmt.hasOwnProperty('alg') &&
			attestationObject.attStmt.hasOwnProperty('sig')
		) {
			// Get Algorithm
			let alg = attestationObject.attStmt.alg.toString();
			alg = window.authnTools.ianaAlgorithms.hasOwnProperty(alg) ? '(' + alg + ') ' + window.authnTools.ianaAlgorithms[alg] : 'Unknown (' + alg + ')';
			// Return data
			return {
				fmt : attestationObject.fmt,
				attStmt : {
					alg : alg,
					sig : attestationObject.attStmt.sig
				}
			};
		}

		return false;
	},

	analyzeAttestation_fidou2f : function(attestationObject) {
		// Format 1
		if (
			attestationObject.hasOwnProperty('attStmt') &&
			attestationObject.attStmt.hasOwnProperty('sig') &&
			attestationObject.attStmt.hasOwnProperty('x5c')
		) {
			// Algorithm always -7
			let alg = (-7).toString();
			alg = window.authnTools.ianaAlgorithms.hasOwnProperty(alg) ? '(' + alg + ') ' + window.authnTools.ianaAlgorithms[alg] : 'Unknown (' + alg + ')';
			// Return data
			return {
				fmt : attestationObject.fmt,
				attStmt : {
					alg : alg,
					sig : attestationObject.attStmt.sig,
					x5c : attestationObject.attStmt.x5c
				}
			};
		}

		return false;
	},

	analyzeAttestation_tpm : function(attestationObject) {
		// Format 1
		if (
			attestationObject.hasOwnProperty('attStmt') &&
			attestationObject.attStmt.hasOwnProperty('alg') &&
			attestationObject.attStmt.hasOwnProperty('sig') &&
			attestationObject.attStmt.hasOwnProperty('ver') &&
			attestationObject.attStmt.hasOwnProperty('x5c')
		) {
			// Get Algorithm
			let alg = attestationObject.attStmt.alg.toString();
			alg = window.authnTools.ianaAlgorithms.hasOwnProperty(alg) ? '(' + alg + ') ' + window.authnTools.ianaAlgorithms[alg] : 'Unknown (' + alg + ')';
			// Return data
			return {
				fmt : attestationObject.fmt,
				attStmt : {
					alg : alg,
					sig : attestationObject.attStmt.sig,
					ver : attestationObject.attStmt.ver,
					x5c : attestationObject.attStmt.x5c
				}
			};
		}

		return false;
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
		if (!this.options.publicKey.hasOwnProperty('rp')) {
			observations.push({message: '"publicKey.rp" was not found.', type: 'danger'});
		}
		else {
			// required
			if (!this.options.publicKey.rp.hasOwnProperty('name')) {
				observations.push({message: '"publicKey.rp.name" was not found.', type: 'danger'});
			}
			else if (!isDOMString(this.options.publicKey.rp.name)) {
				observations.push({message: '"publicKey.rp.name" does not have a DOMString type value.', type: 'danger'});
			}
			// default value
			if (!this.options.publicKey.rp.hasOwnProperty('id')) {
				observations.push({message: '"publicKey.rp.id" was not set, website origin will be used', type: 'info'});
			}
			else if (!isDOMString(this.options.publicKey.rp.id)) {
				observations.push({message: '"publicKey.rp.id" does not have a DOMString type value.', type: 'danger'});
			}
			checkUnknownKeys('publicKey.rp', this.options.publicKey.rp, ['name', 'id']);
		}

		// required
		if (!this.options.publicKey.hasOwnProperty('user')) {
			observations.push({message: '"publicKey.user" was not found.', type: 'danger'});
		}
		else {
			// required
			if (!this.options.publicKey.user.hasOwnProperty('name')) {
				observations.push({message: '"publicKey.user.name" was not found.', type: 'danger'});
			}
			else if (!isDOMString(this.options.publicKey.user.name)) {
				observations.push({message: '"publicKey.user.name" does not have a DOMString type value.', type: 'danger'});
			}
			// required
			if (!this.options.publicKey.user.hasOwnProperty('id')) {
				observations.push({message: '"publicKey.user.id" was not found.', type: 'danger'});
			}
			else if (!isBufferSource(this.options.publicKey.user.id)) {
				observations.push({message: '"publicKey.user.id" does not have a BufferSource type value.', type: 'danger'});
			}
			else {
				if (this.options.publicKey.user.byteLength < 1 || this.options.publicKey.user.byteLength > 64) {
					observations.push({message: '"publicKey.user.id" (user handle) is not between 1 and 64 bytes.', type: 'danger'});
					//user handle be 64 random bytes
				}
				if (this.options.publicKey.user.byteLength < 64) {
					observations.push({message: '"publicKey.user.id" (user handle) is less than the recommended 64 random bytes.', type: 'warning'});
					//user handle be 64 random bytes
				}
			}
			
			// required
			if (!this.options.publicKey.user.hasOwnProperty('displayName')) {
				observations.push({message: '"publicKey.user.displayName" was not found.', type: 'danger'});
			}
			else if (!isDOMString(this.options.publicKey.user.displayName)) {
				observations.push({message: '"publicKey.user.displayName" does not have a DOMString type value.', type: 'danger'});
			}
			checkUnknownKeys('publicKey.user', this.options.publicKey.user, ['name', 'id', 'displayName']);
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

		// required
		if (!this.options.publicKey.hasOwnProperty('pubKeyCredParams')) {
			observations.push({message: '"publicKey.pubKeyCredParams" was not found.', type: 'danger'});
			observations.push({message: 'Since "publicKey.pubKeyCredParams" was not found, the browser will use ES256 (-7) and RS256 (-257)', type: 'info'});
		}
		else if (!isSequence(this.options.publicKey.pubKeyCredParams)) {
			observations.push({message: '"publicKey.pubKeyCredParams" does not have a sequence type value.', type: 'danger'});
		}
		else {
			for (let i = 0; i < this.options.publicKey.pubKeyCredParams.length; i++) {
				if (!this.options.publicKey.pubKeyCredParams[i].hasOwnProperty('type')) {
					observations.push({message: '"publicKey.pubKeyCredParams[' + i + '].type" was not found.', type: 'danger'});
				}
				else if (!isDOMString(this.options.publicKey.pubKeyCredParams[i].type)) {
					observations.push({message: '"publicKey.pubKeyCredParams[' + i + '].type" does not have a DOMString type value.', type: 'danger'});
				}
				else if (!['public-key'].includes(this.options.publicKey.pubKeyCredParams[i].type)) {
					observations.push({message: '"publicKey.pubKeyCredParams[' + i + '].type" is set to an unknown value.', type: 'danger'});
				}

				if (!this.options.publicKey.pubKeyCredParams[i].hasOwnProperty('alg')) {
					observations.push({message: '"publicKey.pubKeyCredParams[' + i + '].alg" was not found.', type: 'danger'});
				}
				else if (!isLong(this.options.publicKey.pubKeyCredParams[i].alg)) {
					observations.push({message: '"publicKey.pubKeyCredParams[' + i + '].alg" does not have a long type value.', type: 'danger'});
				}
				else {
					let alg = this.options.publicKey.pubKeyCredParams[i].alg;
					// COSEAlgorithmIdentifier
					// https://www.iana.org/assignments/cose/cose.xhtml#algorithms
					
					// Reverved Values
					// Reserved	0
					if (alg == 0) {
						observations.push({message: '"publicKey.pubKeyCredParams[' + i + '].alg" COSEAlgorithmIdentifier "' + alg + '" is Reverved.', type: 'danger'});
					}

					// Unassigned Values
					// Unassigned	     8 to    9
					// Unassigned	    16 to   23
					// Unassigned	    27 to   29
					// Unassigned	    -2 to   -1
					// Unassigned	    -9
					// Unassigned	   -24 to  -19
					// Unassigned	  -256 to  -48
					// Unassigned	-65534 to -261
					// Unassigned	-65536
					else if (
						(alg >= 8 && alg <= 9) ||
						(alg >= 16 && alg <= 23) ||
						(alg >= 27 && alg <= 29) ||
						(alg >= -2 && alg <= -1) ||
						(alg == -9 ) ||
						(alg >= -24 && alg <= -19) ||
						(alg >= -256 && alg <= -48) ||
						(alg >= -65534 && alg <= -261) ||
						(alg == -65536)
					) {
						observations.push({message: '"publicKey.pubKeyCredParams[' + i + '].alg" COSEAlgorithmIdentifier "' + alg + '" is Unassigned.', type: 'danger'});
					}

					// Reserved for Private Use
					// Reserved for Private Use	less than -65536
					else if (alg < -65536) {
						observations.push({message: '"publicKey.pubKeyCredParams[' + i + '].alg" COSEAlgorithmIdentifier "' + alg + '" is Reserved for Private.', type: 'warning'});
					}

					// Deprecated
					// RS1	-65535
					else if (alg == -65535) {
						observations.push({message: '"publicKey.pubKeyCredParams[' + i + '].alg" COSEAlgorithmIdentifier "' + alg + '" is Deprecated.', type: 'danger'});
					}

					// Not recomended
					// WalnutDSA	-260
					// RS512	-259
					// RS384	-258
					// RS256	-257
					// ES256K	-47
					else if (
						alg == -260 ||
						alg == -259 ||
						alg == -258 ||
						alg == -257 ||
						alg == -47
					) {
						observations.push({message: '"publicKey.pubKeyCredParams[' + i + '].alg" COSEAlgorithmIdentifier "' + alg + '" is Not Recommended.', type: 'warning'});
					}

					// Public Key algorithms
					if (![
						-65535,	// RS1	-65535
						-260,	// WalnutDSA	-260
						-259,	// RS512	-259
						-258,	// RS384	-258
						-257,	// RS256	-257
						-47,	// ES256K	-47
						-46,	// HSS-LMS	-46
						-42,	// RSAES-OAEP w/ SHA-512	-42
						-41,	// RSAES-OAEP w/ SHA-256	-41
						-40,	// RSAES-OAEP w/ RFC 8017 default parameters	-40
						-39,	// PS512	-39
						-38,	// PS384	-38
						-37,	// PS256	-37
						-36,	// ES512	-36
						-35,	// ES384	-35
						-8,		// EdDSA	-8
						-7,		// ES256	-7
					].includes(alg)) {
						observations.push({message: '"publicKey.pubKeyCredParams[' + i + '].alg" COSEAlgorithmIdentifier "' + alg + '" is not a known Public-Key algorithm.', type: 'danger'});
					}
				}

				checkUnknownKeys('publicKey.pubKeyCredParams[' + i + ']', this.options.publicKey.pubKeyCredParams[i], ['type', 'alg']);
			}

			// if no algorithms
			if (this.options.publicKey.pubKeyCredParams.length == 0) {
				observations.push({message: 'Since "publicKey.pubKeyCredParams" is empty, the browser will use ES256 (-7) and RS256 (-257)', type: 'info'});
			}
			else {
				// Check if algorithms are sorted based on their security
				let getSecurityInfo = (value) => {
					for (let i = window.authnTools.ianaAlgorithmsSecurity.length - 1; i >= 0; i--) {
						if (window.authnTools.ianaAlgorithmsSecurity[i].code == value) {
							return window.authnTools.ianaAlgorithmsSecurity[i];
						}
					}
					//return {code: value, name: 'Unknown', description: '', priority: 0, recommended: false};
					return null;
				}
				// Retrieve info for each algorithm
				let info = this.options.publicKey.pubKeyCredParams.map(info => getSecurityInfo(info.alg));
				info = info.filter(info => (info && info.recommended));
				// Check
				let isOrderCorrect = (() => {
					for (let i = 1; i < info.length; i++) {
						if (info[i].priority > info[i - 1].priority) {
							return false;
						}
					}
					return true;
				})();
				
				if (!isOrderCorrect) {
					observations.push({message: 'The "publicKey.pubKeyCredParams" algorithms are not ordered based on their security.', type: 'warning'});
					// Print correct order
					let suggestion = [... info].sort((a, b) => {return b.priority - a.priority}).map(info => ('\t{"type": "public-key", "alg": ' + info.code + '}, // ' + info.name + ' - ' + info.description)).join('\n');
					observations.push({message: 'Suggested order for the "publicKey.pubKeyCredParams" algorithms (removed unknown or not recommended):\n' + suggestion, type: 'info'});
				}
			}
		}

		(() => {
			// Calculate recommended values for timeout
			let userVerification = this.options.publicKey.hasOwnProperty('authenticatorSelection') && this.options.publicKey.authenticatorSelection.hasOwnProperty('userVerification') ? this.options.publicKey.authenticatorSelection.userVerification : 'preferred';
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

		// default value
		if (!this.options.publicKey.hasOwnProperty('excludeCredentials')) {
			observations.push({message: '"publicKey.excludeCredentials" was not set, default value is [].', type: 'info'});
		}
		else {
			for (let i = 0; i < this.options.publicKey.excludeCredentials.length; i++) {
				// required
				if (!this.options.publicKey.excludeCredentials[i].hasOwnProperty('type')) {
					observations.push({message: '"publicKey.excludeCredentials[' + i + '].type" was not found.', type: 'danger'});
				}
				else if (!isDOMString(this.options.publicKey.excludeCredentials[i].type)) {
					observations.push({message: '"publicKey.excludeCredentials[' + i + '].type" does not have a DOMString type value.', type: 'danger'});
				}
				else if (!['public-key'].includes(this.options.publicKey.excludeCredentials[i].type)) {
					observations.push({message: '"publicKey.excludeCredentials[' + i + '].type" is set to an unknown value "' + this.options.publicKey.excludeCredentials[i].type + '".', type: 'danger'});
				}

				// required
				if (!this.options.publicKey.excludeCredentials[i].hasOwnProperty('id')) {
					observations.push({message: '"publicKey.excludeCredentials[' + i + '].id" was not found.', type: 'danger'});
				}
				else if (!isBufferSource(this.options.publicKey.excludeCredentials[i].id)) {
					observations.push({message: '"publicKey.excludeCredentials[' + i + '].id" does not have a BufferSource type value.', type: 'danger'});
				}
				else if (this.options.publicKey.excludeCredentials[i].id.byteLength < 16) {
					observations.push({message: '"publicKey.excludeCredentials[' + i + '].id" size is less than 16 bytes', type: 'danger'});
				}

				if (this.options.publicKey.excludeCredentials[i].hasOwnProperty('transports')) {
					if (!isSequence(this.options.publicKey.excludeCredentials[i].transports)) {
						observations.push({message: '"publicKey.excludeCredentials[' + i + '].transports" does not have a sequence type value.', type: 'danger'});
					}
					else {
						let count = 0;
						for (let j = 0; j < this.options.publicKey.excludeCredentials[i].transports.length; j++) {
							if (!isDOMString(this.options.publicKey.excludeCredentials[i].transports[j])) {
								observations.push({message: '"publicKey.excludeCredentials[' + i + '].transports[' + j + ']" does not have a DOMString type value.', type: 'danger'});
							}
							else if (!['usb', 'nfc', 'ble', 'internal'].includes(this.options.publicKey.excludeCredentials[i].transports[j])) {
								observations.push({message: '"publicKey.excludeCredentials[' + i + '].transports[' + j + ']" is set to an unknown value "' + this.options.publicKey.excludeCredentials[i].transports[j] + '".', type: 'danger'});
							}
							else {
								count ++;
							}
						}
						if (count <= 0) {
							observations.push({message: '"publicKey.excludeCredentials[' + i + '].transports" does not contain any valid transport value.', type: 'danger'});
						}
					}
				}
			}
		}

		if (this.options.publicKey.hasOwnProperty('authenticatorSelection')) {
			if (this.options.publicKey.authenticatorSelection.hasOwnProperty('authenticatorAttachment')) {
				if (!isDOMString(this.options.publicKey.authenticatorSelection.authenticatorAttachment)) {
					observations.push({message: '"publicKey.authenticatorSelection.authenticatorAttachment" does not have a DOMString type value.', type: 'danger'});
				}
				else if (!['platform', 'cross-platform'].includes(this.options.publicKey.authenticatorSelection.authenticatorAttachment)) {
					observations.push({message: '"publicKey.authenticatorSelection.authenticatorAttachment" is set to an unknown value.', type: 'danger'});
				}
			}

			if (this.options.publicKey.authenticatorSelection.hasOwnProperty('residentKey')) {
				if (!isDOMString(this.options.publicKey.authenticatorSelection.residentKey)) {
					observations.push({message: '"publicKey.authenticatorSelection.residentKey" does not have a DOMString type value.', type: 'danger'});
				}
				else if (!['discouraged', 'preferred', 'required'].includes(this.options.publicKey.authenticatorSelection.residentKey)) {
					observations.push({message: '"publicKey.authenticatorSelection.residentKey" is set to an unknown value.', type: 'danger'});
				}
			}

			if (this.options.publicKey.authenticatorSelection.hasOwnProperty('requireResidentKey')) {
				observations.push({message: '"publicKey.authenticatorSelection.requireResidentKey" is retained for backwards compatibility with WebAuthn Level 1.', type: 'info'});
				if (!isBoolean(this.options.publicKey.authenticatorSelection.requireResidentKey)) {
					observations.push({message: '"publicKey.authenticatorSelection.requireResidentKey" does not have a boolean type value.', type: 'danger'});
				}
				else if (
					this.options.publicKey.authenticatorSelection.requireResidentKey === true && 
					this.options.publicKey.authenticatorSelection.hasOwnProperty('residentKey') &&
					this.options.publicKey.authenticatorSelection.residentKey !== 'required'
				) {
					observations.push({message: '"publicKey.authenticatorSelection.requireResidentKey" should be true if, and only if, "publicKey.authenticatorSelection.residentKey" is set to "required".', type: 'danger'});
				}
			}
			else if (!this.options.publicKey.authenticatorSelection.hasOwnProperty('residentKey')) {
				observations.push({message: '"publicKey.authenticatorSelection.requireResidentKey" was not set, default value is false.', type: 'info'});
			}

			if (this.options.publicKey.authenticatorSelection.hasOwnProperty('userVerification')) {
				if (!isDOMString(this.options.publicKey.authenticatorSelection.userVerification)) {
					observations.push({message: '"publicKey.authenticatorSelection.userVerification" does not have a DOMString type value.', type: 'danger'});
				}
				else if (!['required', 'preferred', 'discouraged'].includes(this.options.publicKey.authenticatorSelection.userVerification)) {
					observations.push({message: '"publicKey.authenticatorSelection.userVerification" is set to an unknown value.', type: 'danger'});
				}
			}
			else {
				observations.push({message: '"publicKey.authenticatorSelection.userVerification" was not set, default value is "preferred".', type: 'info'});
			}

			checkUnknownKeys('publicKey.authenticatorSelection', this.options.publicKey.authenticatorSelection, ['authenticatorAttachment', 'residentKey', 'requireResidentKey', 'userVerification']);
		}

		// Advice to avoid attacks
		if (
			!this.options.publicKey.hasOwnProperty('authenticatorSelection') ||
			!this.options.publicKey.authenticatorSelection.hasOwnProperty('userVerification') ||
			this.options.publicKey.authenticatorSelection.userVerification !== 'required'
		) {
			observations.push({message: '"publicKey.authenticatorSelection.userVerification" is adviced to be set to "required".', type: 'warning'});
		}

		// default value
		if (!this.options.publicKey.hasOwnProperty('attestation')) {
			observations.push({message: '"publicKey.attestation" was not set, default value is "none".', type: 'info'});
		}
		else {
			if (!isDOMString(this.options.publicKey.attestation)) {
				observations.push({message: '"publicKey.attestation" does not have a DOMString type value.', type: 'danger'});
			}
			else if (!['none', 'indirect', 'direct', 'enterprise'].includes(this.options.publicKey.attestation)) {
				observations.push({message: '"publicKey.attestation" is set to an unknown value.', type: 'danger'});
			}
		}

		if (this.options.publicKey.hasOwnProperty('extensions')) {
			for (let extension in this.options.publicKey.extensions) {
				if (this.options.publicKey.extensions.hasOwnProperty(extension)) {

					if (extension === 'appidExclude') {
						if (!isUSVString(this.options.publicKey.extensions[extension])) {
							observations.push({message: '"publicKey.extensions.appidExclude" does not have a USVString type value.', type: 'danger'});
						}
					}
					else if (extension === 'uvm') {
						if (!isBoolean(this.options.publicKey.extensions[extension])) {
							observations.push({message: '"publicKey.extensions.uvm" does not have a boolean type value.', type: 'danger'});
						}
					}
					else if (extension === 'credProps') {
						if (!isBoolean(this.options.publicKey.extensions[extension])) {
							observations.push({message: '"publicKey.extensions.credProps" does not have a boolean type value.', type: 'danger'});
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
			if (this.options.publicKey.hasOwnProperty(key) && !['rp', 'user', 'challenge', 'pubKeyCredParams', 'timeout', 'excludeCredentials', 'authenticatorSelection', 'attestation', 'extensions'].includes(key)) {
				observations.push({message: 'unknown attribute "publicKey.' + key + '"', type: 'warning'});
			}
		}

		return observations;
	},

	prepareNotes : function() {
		this.observations = this.checkOptions();
	},

	renderNotes : function() {
		let wrapper = document.getElementById('credential-creation-options-notes');
		wrapper.textContent = '';

		document.getElementById('credential-creation-options-notes-notification').textContent = this.observations.length;

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
		var rawWrapper = document.getElementById('credential-creation-options-raw');
		var dynamicWrapper = document.getElementById('credential-creation-options-dynamic');
		// ToDo excludeCredentials
		options = window._.cloneDeep(this.options);
		options.publicKey.user.id = window.authnTools.auto(options.publicKey.user.id);
		options.publicKey.challenge = window.authnTools.auto(options.publicKey.challenge);
		var info;
		if (options.publicKey.excludeCredentials) info = this.identifyBuffers(options.publicKey.excludeCredentials);
		var code = '' +
			'// Create Credentials\n' +
			'navigator.credentials.create(' + 
			JSON.stringify(options, null, 4)
				.replace(/\n {12}\s*(\d+)/g, '$1')
				.replace(/\n {8}\s*\]/g, ']')
				// Replace user id
				.replace(new RegExp('("id":\\s*)"(' + options.publicKey.user.id + ')"(,?)'), '$1fb64("$2")$3 // Uint8Array')
				.replace(new RegExp('("challenge":\\s*)"(' + options.publicKey.challenge + ')"(,?)'), '$1fb64("$2")$3 // Uint8Array')
				// To convert base64 to Uint8Array.from(atob('AAECAwQFBgcICQoLDA0ODxARFRYXGBobHB0eHw'), c => c.charCodeAt(0))
				.replace(/{\s*"type": "public-key",\s*"alg": "?-*\d+"?\s*},?/g, (text) => {
					var match = text.match(/{\s*"type": "public-key",\s*"alg": ("?-*\d+"?)\s*}(,?)/i);
					if (!match) return text;
					var alg = parseInt(match[1].match(/-*\d+/i)[0], 10);
					text = '{"type": "public-key", "alg": ' + match[1] + '}' + match[2];
					if (window.authnTools.ianaAlgorithms.hasOwnProperty(alg)) {
						return text + " // " + window.authnTools.ianaAlgorithms[alg] + (match[2] == ''? '\n        ' : '');
					}
					return text;
				}) +
				').then((credentials) => {\n' +
				'    console.log(credentials);\n' +
				'});\n' +
				'\n' +
				'function fb64(x) { // Base64 to Uint8Array\n' +
				'    return Uint8Array.from(atob(x.replace(/-/g, \'+\').replace(/_/g, \'/\')), c => c.charCodeAt(0));\n' +
				'};';
		if (options.publicKey.excludeCredentials) code = this.swapIdentifiedBuffers(code, info, {'Uint8Array':'fb64("{{value}}")'});
		rawWrapper.innerHTML = code;

		options = window._.cloneDeep(this.options);
		dynamicWrapper.innerHTML = '';
		var tree = window.jsonTree.create(this.options, dynamicWrapper);
		tree.expand();
	},

	analyseOptions : function() {
		var wrapper = document.getElementById('credential-creation-options-additional');
		wrapper.innerHTML = '';

		var i, h, div, span, table, tablewrapper, tr, td, a, tests, rate;

		// Analyse Challenge
		var challengeValue = new Uint8Array(this.options.publicKey.challenge);
		var challenge = {
			string : window.authnTools.base64urlToString(window.authnTools.uint8ArrayToBase64url(challengeValue)),
			base64 : window.authnTools.uint8ArrayToBase64url(challengeValue),
			uint8Array : challengeValue,
			hex : window.authnTools.uint8ArrayToHex(challengeValue).replace(/../g, (x) => (x + ' ')).trim(),
			binary : [... challengeValue].map(x => x.toString(2).padStart(8, '0'))
		};
		var isASCIIOnly = (/^[\x20-\x7E]+$/).test(challenge.string.trim());

		div = document.createElement('div');
		div.style.color = '#000000';
		div.style.marginBottom = '15px';
		
		h = document.createElement('h4');
		h.textContent = 'Challenge';
		div.appendChild(h);

		tablewrapper = document.createElement('div');
		tablewrapper.className = 'table-responsive';
		table = document.createElement('table');
		table.className = 'table table-bordered';
		table.style.background = '#f5f5f5';

		tr = document.createElement('tr');
		td = document.createElement('td');
		td.textContent = 'Length';
		tr.appendChild(td);
		td = document.createElement('td');
		span = document.createElement('span');
		span.className = 'badge bg-primary text-light badges-code-wrap';
		span.textContent = challenge.uint8Array.length + ' bytes';
		td.appendChild(span);
		td.appendChild(document.createTextNode(' / '));
		span = document.createElement('span');
		span.className = 'badge bg-primary text-light badges-code-wrap';
		span.textContent = (challenge.uint8Array.length * 8) + ' bits';
		td.appendChild(span);
		if (isASCIIOnly) {
			td.appendChild(document.createTextNode(' (if ASCII only '));
			span = document.createElement('span');
			span.className = 'badge bg-primary text-light badges-code-wrap';
			span.textContent = Math.ceil((challenge.uint8Array.length * Math.ceil(Math.log2(0x7E - 0x20))) / 8) + ' bytes';
			td.appendChild(span);
			td.appendChild(document.createTextNode(' / '));
			span = document.createElement('span');
			span.className = 'badge bg-primary text-light badges-code-wrap';
			span.textContent = (challenge.uint8Array.length * Math.ceil(Math.log2(0x7E - 0x20))) + ' bits';
			td.appendChild(span);
			td.appendChild(document.createTextNode(' )'));
		}
		tr.appendChild(td);
		table.appendChild(tr);

		tr = document.createElement('tr');
		td = document.createElement('td');
		td.textContent = 'String';
		tr.appendChild(td);
		td = document.createElement('td');
		span = document.createElement('span');
		span.className = 'badge bg-primary text-light badges-code-wrap';
		span.textContent = challenge.string;
		td.appendChild(span);

		
		// Check if not ASCII
		// https://stackoverflow.com/questions/14313183/javascript-regex-how-do-i-check-if-the-string-is-ascii-only
		td.appendChild(document.createTextNode(' '));
		span = document.createElement('span');
		span.className = 'badge bg-info text-light';
		span.textContent = isASCIIOnly ? 'ASCII' : 'Not-ASCII';
		td.appendChild(span);


		tr.appendChild(td);
		table.appendChild(tr);

		tr = document.createElement('tr');
		td = document.createElement('td');
		td.textContent = 'Base 64';
		tr.appendChild(td);
		td = document.createElement('td');
		span = document.createElement('span');
		span.className = 'badge bg-primary text-light badges-code-wrap';
		span.textContent = challenge.base64;
		td.appendChild(span);
		tr.appendChild(td);
		table.appendChild(tr);

		tr = document.createElement('tr');
		td = document.createElement('td');
		td.textContent = 'Uint8 Array';
		tr.appendChild(td);
		td = document.createElement('td');
		span = document.createElement('span');
		span.className = 'badge bg-primary text-light badges-code-wrap';
		span.textContent = JSON.stringify([... challenge.uint8Array]).replace(/,/g, ', ');
		td.appendChild(span);
		tr.appendChild(td);
		table.appendChild(tr);

		tr = document.createElement('tr');
		td = document.createElement('td');
		td.textContent = 'Hex';
		tr.appendChild(td);
		td = document.createElement('td');
		span = document.createElement('span');
		span.className = 'badge bg-primary text-light badges-code-wrap';
		span.textContent = challenge.hex;
		td.appendChild(span);
		tr.appendChild(td);
		table.appendChild(tr);

		tr = document.createElement('tr');
		td = document.createElement('td');
		td.textContent = 'Binary';
		tr.appendChild(td);
		td = document.createElement('td');
		i = 0;
		challenge.binary.forEach(bin => {
			i++
			span = document.createElement('span');
			span.className = 'badge bg-primary text-light badges-code-wrap';
			span.textContent = bin;
			td.appendChild(span);
			td.appendChild(document.createTextNode(' '));
			if (i%8 == 0) td.appendChild(document.createElement('br'));
		});
		tr.appendChild(td);
		table.appendChild(tr);

		tr = document.createElement('tr');
		td = document.createElement('td');
		td.textContent = 'Randomness';
		tr.appendChild(td);
		td = document.createElement('td');
		tests = this.randomness_tests([...challenge.binary.join('')].map(x => parseInt(x,10)));
		rate = tests.summary.tests > 0 ? tests.summary.success / tests.summary.tests : 0;
		span = document.createElement('span');
		span.className = 'badge ' + (rate > 0.25 ? 'bg-success' : rate > 0.50 ? 'bg-warning' : 'bg-danger') + ' text-light badges-code-wrap';
		span.textContent = 'passed ' + tests.summary.success + ' out of ' + tests.summary.tests + ' tests';
		td.appendChild(span);
		td.appendChild(document.createTextNode(' '));
		a = document.createElement('a');
		a.href = 'https://mzsoltmolnar.github.io/random-bitstream-tester/';
		a.textContent = '(based on Zsolt Molnár\'s code)';
		a.style.fontSize = '0.8em';
		a.style.color = '#000000';
		a.setAttribute('target', '_blank');
		td.appendChild(a);

		if (isASCIIOnly) {
			td.appendChild(document.createElement('br'));
			tests = this.randomness_tests([...challenge.binary.map(x => x.match(/^0(\d+)$/)[1]).join('')].map(x => parseInt(x,10)));
			rate = tests.summary.tests > 0 ? tests.summary.success / tests.summary.tests : 0;
			span = document.createElement('span');
			span.className = 'badge ' + (rate > 0.25 ? 'bg-success' : rate > 0.50 ? 'bg-warning' : 'bg-danger') + ' text-light badges-code-wrap';
			span.textContent = 'passed ' + tests.summary.success + ' out of ' + tests.summary.tests + ' tests';
			td.appendChild(span);
			td.appendChild(document.createTextNode(' '));
			a = document.createElement('small');
			a.textContent = 'if ASCII only';
			a.style.fontSize = '0.8em';
			td.appendChild(a);
		}

		tr.appendChild(td);
		table.appendChild(tr);
		if (rate < 0.25)
			this.observations.push({message: 'Challenge bitstream failed many random tests', type: 'danger'});
		else if (rate < 0.50)
			this.observations.push({message: 'Challenge bitstream failed some random tests', type: 'warning'});


		tablewrapper.appendChild(table);
		div.appendChild(tablewrapper);
		wrapper.appendChild(div);


		// Analyse User ID
		var useridValue = new Uint8Array(this.options.publicKey.user.id);
		var userid = {
			string : window.authnTools.base64urlToString(window.authnTools.uint8ArrayToBase64url(useridValue)),
			base64 : window.authnTools.uint8ArrayToBase64url(useridValue),
			uint8Array : useridValue,
			hex : window.authnTools.uint8ArrayToHex(useridValue).replace(/../g, (x) => (x + ' ')).trim(),
			binary : [... useridValue].map(x => x.toString(2).padStart(8, '0'))
		};
		var isASCIIOnly = (/^[\x20-\x7E]+$/).test(userid.string.trim());

		div = document.createElement('div');
		div.style.color = '#000000';
		div.style.marginBottom = '15px';
		
		h = document.createElement('h4');
		h.textContent = 'User ID';
		div.appendChild(h);

		tablewrapper = document.createElement('div');
		tablewrapper.className = 'table-responsive';
		table = document.createElement('table');
		table.className = 'table table-bordered';
		table.style.background = '#f5f5f5';

		tr = document.createElement('tr');
		td = document.createElement('td');
		td.textContent = 'Length';
		tr.appendChild(td);
		td = document.createElement('td');
		span = document.createElement('span');
		span.className = 'badge bg-primary text-light badges-code-wrap';
		span.textContent = userid.uint8Array.length + ' bytes';
		td.appendChild(span);
		td.appendChild(document.createTextNode(' / '));
		span = document.createElement('span');
		span.className = 'badge bg-primary text-light badges-code-wrap';
		span.textContent = (userid.uint8Array.length * 8) + ' bits';
		td.appendChild(span);
		if (isASCIIOnly) {
			td.appendChild(document.createTextNode(' (if ASCII only '));
			span = document.createElement('span');
			span.className = 'badge bg-primary text-light badges-code-wrap';
			span.textContent = Math.ceil((userid.uint8Array.length * Math.ceil(Math.log2(0x7E - 0x20))) / 8) + ' bytes';
			td.appendChild(span);
			td.appendChild(document.createTextNode(' / '));
			span = document.createElement('span');
			span.className = 'badge bg-primary text-light badges-code-wrap';
			span.textContent = (userid.uint8Array.length * Math.ceil(Math.log2(0x7E - 0x20))) + ' bits';
			td.appendChild(span);
			td.appendChild(document.createTextNode(' )'));
		}
		tr.appendChild(td);
		table.appendChild(tr);

		tr = document.createElement('tr');
		td = document.createElement('td');
		td.textContent = 'String';
		tr.appendChild(td);
		td = document.createElement('td');
		span = document.createElement('span');
		span.className = 'badge bg-primary text-light badges-code-wrap';
		span.textContent = userid.string;
		td.appendChild(span);

		// Check if not ASCII
		// https://stackoverflow.com/questions/14313183/javascript-regex-how-do-i-check-if-the-string-is-ascii-only
		td.appendChild(document.createTextNode(' '));
		span = document.createElement('span');
		span.className = 'badge bg-info text-light';
		span.textContent = (/^[\x20-\x7E]+$/).test(userid.string.trim()) ? 'ASCII' : 'Not-ASCII';
		td.appendChild(span);

		// Check if email
		// https://stackoverflow.com/questions/201323/how-can-i-validate-an-email-address-using-a-regular-expression
		if (userid.string.trim().match(/(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9]))\.){3}(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9])|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/i)) {
			td.appendChild(document.createTextNode(' '));
			span = document.createElement('span');
			span.className = 'badge bg-danger text-light';
			span.textContent = 'Email';
			td.appendChild(span);
			this.observations.push({message: 'User ID may be an email thus personal data may be leaked', type: 'warning'});
		}
		// Check if GUID
		if (userid.string.match(/(\{){0,1}[0-9a-fA-F]{8}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{12}(\}){0,1}/i)) {
			td.appendChild(document.createTextNode(' '));
			span = document.createElement('span');
			span.className = 'badge bg-info text-light';
			span.textContent = 'GUID';
			td.appendChild(span);
		}
		// Check posible name
		// https://stackoverflow.com/questions/7653942/find-names-with-regular-expression
		if ((/[A-Z]([a-z]+|\.)(?:\s+[A-Z]([a-z]+|\.))*(?:\s+[a-z][a-z\-]+){0,2}\s+[A-Z]([a-z]+|\.)/).test(userid.string)) {
			td.appendChild(document.createTextNode(' '));
			span = document.createElement('span');
			span.className = 'badge bg-danger text-light';
			span.textContent = 'Posible name';
			td.appendChild(span);
			this.observations.push({message: 'User ID may be a name thus personal data may be leaked', type: 'warning'});
		}
		// Check posible tel number
		// https://stackoverflow.com/questions/16699007/regular-expression-to-match-standard-10-digit-phone-number
		if ((/^\s*(?:\+?(\d{1,3}))?[-. (]*(\d{3})[-. )]*(\d{3})[-. ]*(\d{4})(?: *x(\d+))?\s*$/).test(userid.string)) {
			td.appendChild(document.createTextNode(' '));
			span = document.createElement('span');
			span.className = 'badge bg-danger text-light';
			span.textContent = 'Posible telephone';
			td.appendChild(span);
			this.observations.push({message: 'User ID may be a telephone thus personal data may be leaked', type: 'warning'});
		}


		tr.appendChild(td);
		table.appendChild(tr);

		tr = document.createElement('tr');
		td = document.createElement('td');
		td.textContent = 'Base 64';
		tr.appendChild(td);
		td = document.createElement('td');
		span = document.createElement('span');
		span.className = 'badge bg-primary text-light badges-code-wrap';
		span.textContent = userid.base64;
		td.appendChild(span);
		tr.appendChild(td);
		table.appendChild(tr);

		tr = document.createElement('tr');
		td = document.createElement('td');
		td.textContent = 'Uint8 Array';
		tr.appendChild(td);
		td = document.createElement('td');
		span = document.createElement('span');
		span.className = 'badge bg-primary text-light badges-code-wrap';
		span.textContent = JSON.stringify([... userid.uint8Array]).replace(/,/g, ', ');
		td.appendChild(span);
		tr.appendChild(td);
		table.appendChild(tr);

		tr = document.createElement('tr');
		td = document.createElement('td');
		td.textContent = 'Hex';
		tr.appendChild(td);
		td = document.createElement('td');
		span = document.createElement('span');
		span.className = 'badge bg-primary text-light badges-code-wrap';
		span.textContent = userid.hex;
		td.appendChild(span);
		tr.appendChild(td);
		table.appendChild(tr);

		tr = document.createElement('tr');
		td = document.createElement('td');
		td.textContent = 'Binary';
		tr.appendChild(td);
		td = document.createElement('td');
		i = 0;
		userid.binary.forEach(bin => {
			i++;
			span = document.createElement('span');
			span.className = 'badge bg-primary text-light badges-code-wrap';
			span.textContent = bin;
			td.appendChild(span);
			td.appendChild(document.createTextNode(' '));
			if (i%8 == 0) td.appendChild(document.createElement('br'));
		});
		tr.appendChild(td);
		table.appendChild(tr);

		tr = document.createElement('tr');
		td = document.createElement('td');
		td.textContent = 'Randomness';
		tr.appendChild(td);
		td = document.createElement('td');
		tests = this.randomness_tests([...userid.binary.join('')].map(x => parseInt(x,10)));
		rate = tests.summary.tests > 0 ? tests.summary.success / tests.summary.tests : 0;
		span = document.createElement('span');
		span.className = 'badge ' + (rate > 0.25 ? 'bg-success' : rate > 0.50 ? 'bg-warning' : 'bg-danger') + ' text-light badges-code-wrap';
		span.textContent = 'passed ' + tests.summary.success + ' out of ' + tests.summary.tests + ' tests';
		td.appendChild(span);
		td.appendChild(document.createTextNode(' '));
		a = document.createElement('a');
		a.href = 'https://mzsoltmolnar.github.io/random-bitstream-tester/';
		a.textContent = '(based on Zsolt Molnár\'s code)';
		a.style.fontSize = '0.8em';
		a.style.color = '#000000';
		a.setAttribute('target', '_blank');
		td.appendChild(a);

		if (isASCIIOnly) {
			td.appendChild(document.createElement('br'));
			tests = this.randomness_tests([...userid.binary.map(x => x.match(/^0(\d+)$/)[1]).join('')].map(x => parseInt(x,10)));
			rate = tests.summary.tests > 0 ? tests.summary.success / tests.summary.tests : 0;
			span = document.createElement('span');
			span.className = 'badge ' + (rate > 0.25 ? 'bg-success' : rate > 0.50 ? 'bg-warning' : 'bg-danger') + ' text-light badges-code-wrap';
			span.textContent = 'passed ' + tests.summary.success + ' out of ' + tests.summary.tests + ' tests';
			td.appendChild(span);
			td.appendChild(document.createTextNode(' '));
			a = document.createElement('small');
			a.textContent = 'if ASCII only';
			a.style.fontSize = '0.8em';
			td.appendChild(a);
		}

		tr.appendChild(td);
		table.appendChild(tr);
		
		tablewrapper.appendChild(table);
		div.appendChild(tablewrapper);
		wrapper.appendChild(div);
	},

	randomness_tests : function(bitstream) {
		if (!RandomTests) return null;

		//console.log('bitstream', bitstream);
		let randTest = new RandomTests(bitstream);
		let threshold = 0.01;
		let stopIfFailed = false;
		let isOneTestFailed = false;

		let results = {};

		let test;
		test = randTest.frequencyTest();
		results.frequencyTest = test.isError ? 'error' : (test.pValue >= threshold && test.pValue <= 1) ? 'success' : 'failed';
		test = randTest.frequencyTestBlock();
		results.frequencyTestBlock = test.isError ? 'error' : (test.pValue >= threshold && test.pValue <= 1) ? 'success' : 'failed';
		test = randTest.runsTest();
		results.runsTest = test.isError ? 'error' : (test.pValue >= threshold && test.pValue <= 1) ? 'success' : 'failed';
		test = randTest.longestRunOfOnesTest();
		results.longestRunOfOnesTest = test.isError ? 'error' : (test.pValue >= threshold && test.pValue <= 1) ? 'success' : 'failed';
		test = randTest.binaryMatrixRankTest();
		results.binaryMatrixRankTest = test.isError ? 'error' : (test.pValue >= threshold && test.pValue <= 1) ? 'success' : 'failed';
		test = randTest.nonOverlappingTemplateMatchingsTest();
		results.nonOverlappingTemplateMatchingsTest = test.isError ? 'error' : (test.pValue >= threshold && test.pValue <= 1) ? 'success' : 'failed';
		test = randTest.overlappingTemplateMatchingTest();
		results.overlappingTemplateMatchingTest = test.isError ? 'error' : (test.pValue >= threshold && test.pValue <= 1) ? 'success' : 'failed';
		test = randTest.universalMaurerTest();
		results.universalMaurerTest = test.isError ? 'error' : (test.pValue >= threshold && test.pValue <= 1) ? 'success' : 'failed';
		test = randTest.linearComplexityTest();
		results.linearComplexityTest = test.isError ? 'error' : (test.pValue >= threshold && test.pValue <= 1) ? 'success' : 'failed';
		test = randTest.serialTest();
		results.serialTest = test.isError ? 'error' : (test.pValue >= threshold && test.pValue <= 1) ? 'success' : 'failed';
		test = randTest.approximateEntropyTest();
		results.approximateEntropyTest = test.isError ? 'error' : (test.pValue >= threshold && test.pValue <= 1) ? 'success' : 'failed';
		test = randTest.cumulativeSumsTest();
		results.cumulativeSumsTest = test.isError ? 'error' : (test.pValue >= threshold && test.pValue <= 1) ? 'success' : 'failed';
		test = randTest.randomExcursionsTest();
		results.randomExcursionsTest = test.isError ? 'error' : (test.pValue >= threshold && test.pValue <= 1) ? 'success' : 'failed';
		test = randTest.randomExcursionsVariantTest();
		results.randomExcursionsVariantTest = test.isError ? 'error' : (test.pValue >= threshold && test.pValue <= 1) ? 'success' : 'failed';

		let summary = {
			success : 0,
			failed : 0,
			tests : 0
		};

		for (let i in results) {
			if (results.hasOwnProperty(i) && results[i] != 'error') {
				summary.tests ++;
				summary.success += results[i] == 'success' ? 1 : 0;
				summary.failed += results[i] == 'failed' ? 1 : 0;
			}
		}

		results.summary = summary;

		return results;
	},

	renderCredentials : function() {
		var credential;
		// Get Wrappers
		var rawWrapper = document.getElementById('credential-creation-response-raw');
		var decodedWrapper = document.getElementById('credential-creation-response-decoded');
		var attestationWrapper = document.getElementById('credential-creation-response-decoded-attestation');
		var certificateDownload = document.getElementById('credential-creation-response-certificate-download');
		var extensionsWrapper = document.getElementById('credential-creation-response-ext');

		// Prepare credential object
		var $credential = {};
		for (let item in this.credential) {
			try {
				if (typeof this.credential[item] != 'function') {
					$credential[item] = this.credential[item];
				}
			} catch (e) {
				console.log('Failed to read item from credentials', item, this.credential);
			}
		}
		$credential.response = {};
		for (let item in this.credential.response) {
			if (typeof this.credential.response[item] != 'function') {
				$credential.response[item] = this.credential.response[item];
			}
		}

		// Render raw response
		credential = window._.cloneDeep($credential);
		credential.rawId = window.authnTools.auto(credential.rawId);
		credential.response.attestationObject = window.authnTools.auto(credential.response.attestationObject);
		credential.response.clientDataJSON = window.authnTools.auto(credential.response.clientDataJSON);
		console.log('[Render Credential Raw]', credential);
		rawWrapper.innerHTML = '' +
			JSON.stringify(credential, null, 4)
				.replace(new RegExp('("rawId":\\s*)"(' + credential.rawId + ')"(,?)'), '$1$2$3 // ArrayBuffer(' + window.authnTools.auto(credential.rawId).length + ')')
				.replace(new RegExp('("attestationObject":\\s*)"(' + credential.response.attestationObject + ')"(,?)'), '$1$2$3 // ArrayBuffer(' + window.authnTools.auto(credential.response.attestationObject).length + ')')
				.replace(new RegExp('("clientDataJSON":\\s*)"(' + credential.response.clientDataJSON + ')"(,?)'), '$1$2$3 // ArrayBuffer(' + window.authnTools.auto(credential.response.clientDataJSON).length + ')')

		// Render decoded
		credential = window._.cloneDeep($credential);
		credential.rawId = window.authnTools.auto(credential.rawId);
		credential.response.attestationObject = window._.cloneDeep(this.attestationObject);
		var authDataEncoded = {
			value: window.authnTools.auto(credential.response.attestationObject.authData),
			length: credential.response.attestationObject.authData.length
		};
		credential.response.attestationObject.authData = window._.cloneDeep(this.authenticatorData);
		var clientDataJSONEncoded = {
			value: window.authnTools.auto(credential.response.clientDataJSON),
			length: credential.response.clientDataJSON.length
		};
		credential.response.clientDataJSON = window._.cloneDeep(this.clientData);
		
		var info = this.identifyBuffers(credential.response.attestationObject.attStmt);
		console.log('[Render Credential Decoded]', credential);
		var code = '' +
			JSON.stringify(credential, null, 4)
				.replace(new RegExp('("rawId":\\s*)"(' + credential.rawId + ')"(,?)'), '$1$2$3 // ArrayBuffer(' + window.authnTools.auto(credential.rawId).length + ')')
				.replace(/"authData": {/, '"authData": { // ' + authDataEncoded.value + ' // ArrayBuffer(' + authDataEncoded.length + ')')
				.replace(/"clientDataJSON": {/, '"clientDataJSON": { // ' + clientDataJSONEncoded.value + ' // ArrayBuffer(' + clientDataJSONEncoded.length + ')')
				.replace(/"flags": "([01]+)"/, '"flags": 0x$1');
		code = this.swapIdentifiedBuffers(code, info);
		decodedWrapper.innerHTML = code;


		// Show attestation format info
		var attestationFormat =  window._.cloneDeep(this.attestation.format);
		info = this.identifyBuffers(attestationFormat);
		console.log('[Attestation Format Decoded]', this.attestation);
		code = '' +
			'/* ' + '\n' +
			' * ' + this.attestation.name + '\n' +
			' * ' + this.attestation.description + '\n' +
			' * ' + '' + '\n' +
			' * ' + this.attestation.message + '\n' +
			' */' + '\n' + '\n' +
			JSON.stringify(attestationFormat, null, 4);
		code = this.swapIdentifiedBuffers(code, info);
		attestationWrapper.innerHTML = code;
		
		if (attestationFormat && attestationFormat.attStmt && attestationFormat.attStmt.x5c) {
			let pem = '';
			for (let i = 0; i < attestationFormat.attStmt.x5c.length; i++) {
				pem += '-----BEGIN CERTIFICATE-----' + '\n' + window.authnTools.base64urlToBase64(attestationFormat.attStmt.x5c[i]).match(/.{1,64}/g).join('\n') + '\n' + '-----END CERTIFICATE-----'  + '\n';
			}
			certificateDownload.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(pem))
			certificateDownload.setAttribute('download', 'authenticator_attestation.crt');
			certificateDownload.style.display = 'inline';
		}
		else {
			certificateDownload.style.display = 'none';
		}

		// Show extensions
		extensionsWrapper.innerHTML = JSON.stringify(this.extensions, null, 4);
	},

	optionsTextContent : function(text) {
		document.getElementById('credential-creation-options-raw').textContent = text;
		document.getElementById('credential-creation-options-dynamic').textContent = text;
		document.getElementById('credential-creation-options-notes').textContent = text;
		document.getElementById('credential-creation-options-notes-notification').textContent = 0;
	},

	responseTextContent : function(text) {
		document.getElementById('credential-creation-response-raw').textContent = text;
		document.getElementById('credential-creation-response-decoded').textContent = text;
		document.getElementById('credential-creation-response-decoded-attestation').textContent = text;
		document.getElementById('credential-creation-response-certificate-download').style.display = 'none';
		document.getElementById('credential-creation-response-ext').textContent = text;
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

	initIanaAlgorithms : function() {
		// Add some algorithms
		(["-7", "-37", "-257"]).forEach((x) => {
			this.newAlgorithm(x);
		});

		// Add button functionality
		$('#credential-creation-pubKeyCredParams-add').click(() => {
			this.newAlgorithm();
		});
	},

	newAlgorithm : function(selectedAlgorithm = '-7') {
		// New Algorithm html
		let newAlgorithm = $(
			'<div class="form-group sub-group">' +
			'	<button type="button" class="btn btn-outline-danger btn-sm">&times;</button>' +
			'	<label>pubKeyCredParams</label>' +
			'	<select class="form-control credential-creation-pubKeyCredParams-select"></select>' +
			'</div>'
		);
		// Delete button functionality
		newAlgorithm.find('.btn:eq(0)').click(() => {
			newAlgorithm.remove();
		});
		// Populate selection
		let select = newAlgorithm.find('select:eq(0)');
		let algorithms = window.authnTools.ianaAlgorithms;
		for (let alg in algorithms) {
			if (algorithms.hasOwnProperty(alg)) {
				let opt = $('<option />').attr('value', alg).text('(' + alg + ') ' + algorithms[alg]);
				if (alg == selectedAlgorithm) opt.attr("selected", true);
				select.append(opt);
			}
		}
		// Add on page
		$('#credential-creation-pubKeyCredParams-wrapper').append(newAlgorithm);
	}
}


// Handle button clicks
$('#credential-creation-generate').click(() => {
	window.authnCreate.generateOptions();
});
$('#credential-creation-create').click(() => {
	window.authnCreate.createCredentials();
});

// Initialize inputs
window.authnCreate.initIanaAlgorithms();

// Store keys checkbox
(function() {
	let checkbox = document.getElementById('store-credentials-checkbox');
	window.authnCreate.storeCredentials = true;
	// If such a UI exists
	if (checkbox) {
		window.authnCreate.storeCredentials = !(window.localStorage.getItem('store-credentials-status') === 'disabled');
		// Update UI state
		checkbox.checked = window.authnCreate.storeCredentials ? true : false;
		// Detect interaction
		checkbox.addEventListener('change', () => {
			window.authnCreate.storeCredentials = checkbox.checked;
			window.localStorage.setItem('store-credentials-status', checkbox.checked ? 'enabled' : 'disabled');
		})
	}
})();

// Testing mode
(function() {
	// Enable-Disable options
	document.getElementById('virtual-testing-checkbox').addEventListener('change', function() {
		document.getElementById('virtual-testing-options').style.display = this.checked ? 'block' : 'none';
	});
	
	(function(id) {
		let toggle = document.getElementById('testing-' + id + '-checkbox');
		let input = document.getElementById('testing-' + id + '-value');
		toggle.addEventListener('change', function() {window.VirtualAuthn.doTesting(id, toggle.checked ? (input.value === 'true' ? 1 : 0) : false);});
		input.addEventListener('change', function() {if (toggle.checked) window.VirtualAuthn.doTesting(id, (input.value === 'true' ? 1 : 0));});
	})('freezeUserVerificationFlag');
	
	(function(id) {
		let toggle = document.getElementById('testing-' + id + '-checkbox');
		let input = document.getElementById('testing-' + id + '-value');
		toggle.addEventListener('change', function() {window.VirtualAuthn.doTesting(id, toggle.checked ? input.value : false);});
		input.addEventListener('change', function() {if (toggle.checked) window.VirtualAuthn.doTesting(id, input.value);});
	})('relayPartyID');
	
	(function(id) {
		let toggle = document.getElementById('testing-' + id + '-checkbox');
		let input = document.getElementById('testing-' + id + '-value');
		toggle.addEventListener('change', function() {window.VirtualAuthn.doTesting(id, toggle.checked ? input.value : false);});
		input.addEventListener('change', function() {if (toggle.checked) window.VirtualAuthn.doTesting(id, input.value);});
	})('origin');

	(function(id) {
		let toggle = document.getElementById('testing-' + id + '-checkbox');
		let input = document.getElementById('testing-' + id + '-value');
		toggle.addEventListener('change', function() {window.VirtualAuthn.doTesting(id, toggle.checked ? parseInt(input.value, 10) : false);});
		input.addEventListener('change', function() {if (toggle.checked) window.VirtualAuthn.doTesting(id, parseInt(input.value, 10));});
	})('algorithm');

	(function(id) {
		let toggle = document.getElementById('testing-' + id + '-checkbox');
		let input = document.getElementById('testing-' + id + '-value');
		toggle.addEventListener('change', function() {window.VirtualAuthn.doTesting(id, toggle.checked ? input.value : false);});
		input.addEventListener('change', function() {if (toggle.checked) window.VirtualAuthn.doTesting(id, input.value);});
	})('aaguid');

	(function(id) {
		let toggle = document.getElementById('testing-' + id + '-checkbox');
		toggle.addEventListener('change', function() {window.VirtualAuthn.doTesting(id, toggle.checked ? true : false);});
	})('forceResidentKey');
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
	let button = document.getElementById('credential-creation-send');
	button.addEventListener('click', ()=> {
		if (!window.authnCreate.credential)
			return;
		if (window.authnCreate.crossSiteReponse)
			window.authnCreate.crossSiteReponse();
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
			window.authnCreate.options = data.options;
			// Check options
			window.authnCreate.prepareNotes();
			// Show on UI
			window.authnCreate.renderOptions();
			window.authnCreate.analyseOptions();
			// Render Notes
			window.authnCreate.renderNotes();
			// Show message
			window.jsNotify.success('Options retrieved!', {time2live : 5*1000});
		}
		if (data.credential) {
			let credential = data.credential;
			let extensions = data.extensions || {};
			credential.getClientExtensionResults = () => {return extensions};
			credential = new (window.AuthnDevice.VirtualClasses.VirtualPublicKeyCredential())(credential);
			// Save the credentials generated
			window.authnCreate.credential = credential;
			// Print returned key
			console.log('[Create Credentials > PublicKeyCredential]', credential);
			// Analyze the credentials
			window.authnCreate.analyzeCredentials(credential);
			// Show Response
			window.authnCreate.renderCredentials();
			// Show message
			window.jsNotify.success('Credentials generated!', {time2live : 5*1000});
		}

		window.authnCreate.crossSiteReponse = () => {
			callback({
				id: data.id,
				options: window.authnTools.serialize(window.authnCreate.options),
				credential: window.authnTools.serialize(window.authnCreate.credential)
			});
		};

		// Hide unused GUI
		let interface = document.getElementsByClassName('gui-custom-options');
		for (var i = interface.length - 1; i >= 0; i--) {
			interface[i].style.display = 'none';
		}
	};


	// Handle external requests for credentials creation through URL requests
	window.addEventListener('load', () => {
		// Load data from URL
		let data = new URL(window.location.href).searchParams.get('data');
		if (!data) return;
		// Decode data
		data = window.atob(data);
		try {
			data = JSON.parse(data);
		} catch (e) {
			return;
		}

		let responseCallback = (response) => {
			// Show message
			window.jsNotify.success('Credentials created!', {time2live : 5*1000});
			console.log(response);
			console.log(JSON.stringify(response));
			// Show data
			let data = JSON.stringify(response);
			Popup('Copy-Paste the results back to other input:', 'prompt', data, true);
		};

		externalRequestsHandler(null, data, responseCallback);
	}, false);

	if (!window.opener)
		return;

	// Handle external requests for authentications through message posting
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
