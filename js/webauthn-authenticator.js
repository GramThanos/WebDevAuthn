/*
 * WebDevAuthn
 * Fast Identity Online Development
 *
 * Script: WebAuthn Authenticator
 *
 * GramThanos
 *
 */

// Virtual/Software FIDO2/WebAuthn Authenticator Device
// Able to register and authenticate with a server as a WebAuthn device
window.AuthnDevice = (function (localURL) {

	// Initialize authenticator attributes
	var AuthnDevice = function() {
		this.credential_id = null;
		this.public_key = null;
		this.private_key = null;
		this.aaguid = null;
		this.rp_id = null;
		this.user_handle = null;
		this.sign_count = -1;
		this.cose_key = null;
		this.localUrl = null;
		this.createdAt = null;
		this.storage = [];
		this.handleStorage = false;
		this.askmasterkey = false;

		// AAGUID based on ASCII chars (only for testing)
		let guid = 'virtual-authn-v1'; // 16 chars
		guid = window.authnTools.stringToBase64url(guid);
		let aaguid = window.authnTools.base64urlToUint8Array(guid);

		//// AAGUID based on GUID string
		//let guid = '76697274-7561-6c2d-6175-74686e2d7631';
		//let aaguid = window.authnTools.hexToUint8Array(guid.replace(/-/g,''));

		// Save authenticators aaguid
		this.aaguid = aaguid;

		// Counter timer
		this.counterIncreaseEveryMs = 250;

		// Testing parameters
		this.testing = {
			freezeSigCounter : false,
			freezeUserVerificationFlag : false,
			relayPartyID : false,
			origin : false,
			userHandle : false,
			algorithm : false,
			forceResidentKey : false,
			aaguid : false
		};

		// Default master key and salt
		let default_masterkey = 'GramThanos @ UNIPI - Virtual Authenticator';
		let default_salt = (() => {
			let salt = new Uint8Array(16);
			for (let i = 16 - 1; i >= 0; i--) salt[i] = i;
			return salt.buffer;
		})();
		// This key is used to wrap the authenticator's data and store them at a server
		this.setMasterKey(default_masterkey, default_salt);
	};

	// Set testing parameter
	// e.g. authenticator.doTesting('freezeSigCounter', 1); // Freeze authenticator signing counter to 1
	// e.g. authenticator.doTesting('freezeUserVerificationFlag', 1); // Set UV value to 1
	// e.g. authenticator.doTesting('relayPartyID', 'example.com'); // Relay Party ID
	// e.g. authenticator.doTesting('origin', 'https://example.com'); // Origin
	// e.g. authenticator.doTesting('userHandle', window.btoa('gramthanos@gmail.com')); // User Handle (in base64)
	// e.g. authenticator.doTesting('userHandle', Uint8Array.from('gramthanos@gmail.com', c=>c.charCodeAt(0))); // User Handle (in Uint8Array)
	// e.g. authenticator.doTesting('algorithm', -7); // Signature Algorithm (ECDSA w/ SHA-256)
	// e.g. authenticator.doTesting('forceResidentKey', true); // Generate only resident keys
	// e.g. authenticator.doTesting('aaguid', ''); // Set another AAGUID
	AuthnDevice.prototype.doTesting = function(id, value) {
		if (!this.testing.hasOwnProperty(id)) return;
		console.log('Setting testing value "' + id + '" to ' + JSON.stringify(value) + '');
		this.testing[id] = value;
	};

	// Set an other master key
	AuthnDevice.prototype.setMasterKey = function(masterkey, salt = null, iterations = 100000) {
		this.masterkey = masterkey;
		if (salt) this.masterkeysalt = salt;
		this.derivedKey = null;
		this.masterkeyIterations = iterations;
	};
	// Clear master key
	AuthnDevice.prototype.clearMasterKey = function() {
		this.masterkey = null;
	};
	// Always Ask Master Key
	AuthnDevice.prototype.alwaysAskMasterKey = function(value) {
		if (value === false) {
			this.askmasterkey = false;
		}
		else {
			this.askmasterkey = true;
			this.clearMasterKey();
		}
	};


	// Set the relay party URL if not by the options
	AuthnDevice.prototype.setLocalUrl = function(url) {
		this.localUrl = url;
	};

	AuthnDevice.prototype._updateCounter = function() {
		if (this.counterIncreaseEveryMs > 0) {
			// Math.floor((new Date('01/01/2156').getTime() - new Date('01/01/2020').getTime())/1000) < 4294967295
			// Increase every 1000ms ~= 136 years - 2156
			// Increase every  500ms ~=  68 years - 2088
			// Increase every  250ms ~=  34 years - 2054
			// Increase every  100ms ~=  13 years - 2033
			this.sign_count = Math.floor((new Date().getTime() - this.createdAt) / this.counterIncreaseEveryMs) + 1;
		}
		else {
			this.sign_count++;
		}
	};

	AuthnDevice.prototype._getSignCount = function() {
		// Testing: Freeze Signing Counter
		if (Number.isInteger(this.testing.freezeSigCounter))
			return this.testing.freezeSigCounter;
		// Return counter
		return this.sign_count;
	};

	AuthnDevice.prototype._getAAGUID = function() {
		// Testing: custom aaguid
		if (this.testing.aaguid) {
			if (typeof this.testing.aaguid === 'string') {
				let guid = this.testing.aaguid;
				// AAGUID based on ASCII chars (only for testing)
				if (guid.length == 16) {
					return window.authnTools.base64urlToUint8Array(
						window.authnTools.stringToBase64url(guid)
					);
				}
				// AAGUID based on GUID string
				else if (guid.match(/^[0-9a-f\-]+$/i) && guid.replace(/-/g,'').length === 32) {
					return window.authnTools.hexToUint8Array(guid.replace(/-/g,''));
				}
			}
		}
		// Return aaguid
		return this.aaguid;
	};

	AuthnDevice.prototype._getDerivedKey = async function() {
		if (!this.derivedKey) {
			// If no master key
			if (!this.masterkey) {
				this.masterkey = prompt('Please enter your password to use the virtual authenticator', '');
				if (!this.masterkey || this.masterkey.length < 1)
					throw new Error('No password given');
			}
			// Import given master key
			let masterkey = await window.crypto.subtle.importKey(
				'raw',
				new TextEncoder().encode(this.masterkey),
				'PBKDF2',
				false,
				['deriveBits', 'deriveKey']
			);
			// Clear saved master key
			this.masterkey = null;
			// Derive key from master key
			this.derivedKey = await window.crypto.subtle.deriveKey(
				{
					'name': 'PBKDF2',
					salt: this.masterkeysalt,
					'iterations': this.masterkeyIterations,
					'hash': 'SHA-256'
				},
				masterkey,
				{
					'name': 'AES-GCM',
					'length': 256
				},
				true,
				['encrypt', 'decrypt']
			);
		}
		return this.derivedKey;
	};

	// The provided info will be encrypted using the master key and the 
	AuthnDevice.prototype._generateKeyId = async function() {
		// Prepare data for encryption
		let data = {
			v : 1,                                                         // Version
			r : this.rp_id,                                                // Replay Party ID
			u : window.authnTools.uint8ArrayToBase64url(this.user_handle), // User handle
			c : this.createdAt.toString(36)                                // Creation Date
		};
		data = await Algorithms.CryptoKeyWrap(this.private_key, data);
		data = JSON.stringify(data);
		// Parse data to bytes (ensure that all data are bytes)
		data = data.replace(/[\u007F-\uFFFF]/g, function(chr) {
			return "\\u" + ("0000" + chr.charCodeAt(0).toString(16)).substr(-4)
		});
		data = new Uint8Array(data.split('').map(function (c) {return c.charCodeAt (0);}));
		// Prepare an IV
		let iv = window.crypto.getRandomValues(new Uint8Array(12));
		((s) => {s=window.atob(s+'+');for (let i = 0; i < s.length; i++) iv[i] = s[i].charCodeAt(0)})('GramThanos'); // TODO: This is not needed :P, it can be removed
		// You are going to use AES authenticated encryption
		let key = await this._getDerivedKey();
		let cipher = await window.crypto.subtle.encrypt({name: 'AES-GCM', iv: iv}, key, data);
		// Combine IV and CipherText
		let r = new Uint8Array(iv.byteLength + cipher.byteLength);
		r.set(new Uint8Array(iv), 0);
		r.set(new Uint8Array(cipher), iv.byteLength);

		this.credential_id = r.buffer;
	};

	AuthnDevice.prototype._retrieveFromKeyId = async function(keyid) {
		let data = null;
		// Retrieve iv
		let cipher = new Uint8Array(keyid);
		let iv = cipher.slice(0, 12).buffer;
		// Decode AES
		let key = await this._getDerivedKey();
		try {
			let message = await window.crypto.subtle.decrypt({name: 'AES-GCM', iv: iv}, key, cipher.slice(12, cipher.length).buffer);
			// Parse bytes to JSON
			message = Array.from(new Uint8Array(message)).map(function (c) {return String.fromCharCode(c);}).join('');
			data = JSON.parse(message);
		} catch (e) {
			console.log(e);
			return false;
		}
		// Check if values do not exist
		if (
			!data.hasOwnProperty('v') ||
			!data.hasOwnProperty('r') ||
			!data.hasOwnProperty('u') ||
			!data.hasOwnProperty('k') ||
			!data.hasOwnProperty('a') ||
			!data.hasOwnProperty('c') ||
			data.v > 1
		) return false;
		// Relay Party should be the same
		if (data.r !== this.rp_id)
			return false;
		// Import key
		let key_pair = await Algorithms.CryptoKeyUnWrap(data);
		if (!key_pair) return false;
		this.private_key = key_pair.private_key;
		this.public_key = key_pair.public_key;
		// Save the keyid
		this.credential_id = keyid;
		// Save User handle
		this.user_handle = window.authnTools.base64urlToUint8Array(data.u);

		// Testing: User Handle
		if (this.testing.userHandle) {
			if (this.testing.userHandle instanceof ArrayBuffer) {
				this.user_handle = this.testing.userHandle;
			}
			else if (typeof this.testing.userHandle === 'string') {
				this.user_handle = window.authnTools.base64urlToUint8Array(this.testing.userHandle);
			}
		}

		// Save created time
		this.createdAt = parseInt(data.c,36);
		// Key retrieved
		return true;
	}

	AuthnDevice.prototype._generateCOSEKey = async function() {
		// Prepare COSE
		this.cose_key = await Algorithms.CryptoKey2COSEKey(this.public_key);
	};


	AuthnDevice.prototype._cred_init = async function(rp_id, user_handle = null, key_id = null, alg = null) {
		// Set Relay Party ID
		this.rp_id = rp_id;
		// Set User Handle
		this.user_handle = user_handle;

		// If no Key ID was given
		if (key_id === null) {
			// Generate credentials
			let key_pair = await Algorithms.GenerateCryptoKey(alg);
			this.public_key = key_pair.public_key;
			this.private_key = key_pair.private_key;
			// Set creation time
			this.createdAt = new Date().getTime();
			// Update counter
			this._updateCounter();
			// Generate Key Id that can be used to initialize the authenticator
			await this._generateKeyId();
		}

		// If key was given
		else {
			// Try to initialize authenticator from keyid
			let valid = await this._retrieveFromKeyId(key_id);
			//console.log('Is valid key', valid, key_id);
			if (!valid) return false;
			// Update counter
			this._updateCounter();
		}

		// Generate COSE key format
		await this._generateCOSEKey();
		// Update counter
		this._updateCounter();
		return true;

		//this.credential_id = new Uint8Array(32);
		//window.crypto.getRandomValues(this.credential_id);
	};

	AuthnDevice.prototype._saveResidentKey = async function(host) {
		// Get wrapped key and generate hash as id
		let wrappedKey = this.credential_id;
		// Resident keys use a has of the credential id as a credential id
		this.credential_id = await window.crypto.subtle.digest('SHA-256', this.credential_id);
		// Save key info
		if (this.handleStorage) this.storage = this.handleStorage();
		this.storage.push({
			host : host,
			keyid : window.authnTools.uint8ArrayToBase64url(new Uint8Array(this.credential_id)),
			masterKeySalt : window.authnTools.uint8ArrayToBase64url(this.masterkeysalt),
			wrappedKey : window.authnTools.uint8ArrayToBase64url(new Uint8Array(wrappedKey))
		});
		if (this.handleStorage) this.handleStorage(this.storage);
	};

	AuthnDevice.prototype._cred_init_with_ResidentKey = async function(rp_id, user_handle = null, key_id = null) {
		if (this.handleStorage) this.storage = this.handleStorage();
		// Search storage
		//console.log('Storage', this.storage);
		for (let i = this.storage.length - 1; i >= 0; i--) {
			//console.log('Checking', this.storage[i].host, rp_id, this.storage[i].keyid, key_id);
			// If key found in storage
			if (this.storage[i].host === rp_id && (key_id === null || this.storage[i].keyid === key_id)) {
				let credentials = this.storage[i];
				//console.log('Webpage match', credentials);
				let wrappedKey = window.authnTools.base64urlToUint8Array(credentials.wrappedKey);
				// Restore key salt
				this.masterkeysalt = window.authnTools.base64urlToUint8Array(credentials.masterKeySalt);
				// Init credentials
				let r = await this._cred_init(rp_id, user_handle, wrappedKey);
				// Resident keys use a different credential id than the original credential id
				if (r) {
					if (key_id === null) {
						//key_id = window.authnTools.base64urlToUint8Array(credentials.keyid);
						key_id = new Uint8Array(await window.crypto.subtle.digest('SHA-256', wrappedKey));
					}
					this.credential_id = key_id;
				}
				return r;
			}
		}
		return false;
	};

	AuthnDevice.prototype._concatUint8Arrays = function() {
		let list = [... arguments];
		let bytes = 0;
		for (let i = 0; i < list.length; i++) {
			bytes += list[i].length;
		}
		let array = new Uint8Array(bytes);
		for (let i = list.length - 1; i >= 0; i--) {
			bytes -= list[i].length;
			array.set(list[i], bytes);
		}
		return array;
	};

	AuthnDevice.prototype._flags = function(flags) {
		// Bit 0: User Present (UP) result.
		// Bit 1: Reserved for future use (RFU1).
		// Bit 2: User Verified (UV) result.
		// Bit 3: Reserved for future use (RFU2).
		// Bit 4: Reserved for future use (RFU2).
		// Bit 5: Reserved for future use (RFU2).
		// Bit 6: Attested credential data included (AT).
		// Bit 7: Extension data included (ED).

		// Testing: Freeze User Verification
		if (Number.isInteger(this.testing.freezeUserVerificationFlag)) {
			flags['uv'] = this.testing.freezeUserVerificationFlag > 0 ? true : false;
		}
		
		let bits = [0,0,0,0,0,0,0,0];
		if (flags.hasOwnProperty('up') && flags['up']) bits[0] = 1;
		if (flags.hasOwnProperty('uv') && flags['uv']) bits[2] = 1;
		if (flags.hasOwnProperty('at') && flags['at']) bits[6] = 1;
		if (flags.hasOwnProperty('ed') && flags['ed']) bits[7] = 1;

		// Convert to string and reverse order
		bits = bits.map(x => x + '').reduce((x, y) => y + x, '');

		return parseInt(bits, 2);
	};

	AuthnDevice.prototype.create = async function(options, _origin) {
		// Check input
		if (!options || !options.publicKey) {
			throw new Error('Invalid options were given');
		}
		// Check if challenge exists
		if (!options.publicKey.challenge) {
			throw new Error('No challenge was given');
		}

		let pubKeyCredParams = options.publicKey.pubKeyCredParams;
		// Testing: Algorithm
		if (Number.isInteger(this.testing.algorithm)) {
			pubKeyCredParams = [{alg : this.testing.algorithm, type : 'public-key'}];
		}

		// Check credentials algorithm
		let algs = Algorithms.Supported(pubKeyCredParams);
		if (algs.length < 1) throw new Error('Requested pubKeyCredParams does not contain supported type');
		let keyPairAlg = algs[0].alg;
		
		// Check if required Resident Key aka Discoverable credential
		let requestResidentKey = (options.publicKey.authenticatorSelection && options.publicKey.authenticatorSelection.requireResidentKey === true);
		if (this.testing.forceResidentKey) requestResidentKey = true;

		// Calcualte RP ID and origin's effective domain
		let origin = (() => {
			if (_origin)
				try { return new URL(_origin).origin; } catch (e) {};
			if (this.localUrl)
				try { return new URL(this.localUrl).origin; } catch (e) {};
			if (options.publicKey && options.publicKey.rp && options.publicKey.rp.id)
				try { return new URL('https://' + options.publicKey.rp.id).origin; } catch (e) {};
			return new URL(localURL).origin;
		})();
		
		// Testing: Origin
		if (this.testing.origin) {
			origin = new URL(this.testing.origin).origin;
		}

		let rpid = (() => {
			if (options.publicKey && options.publicKey.rp && options.publicKey.rp.id)
				try { return new URL('https://' + options.publicKey.rp.id).hostname; } catch (e) {};
			if (this.localUrl)
				try { return new URL(this.localUrl).hostname; } catch (e) {};
			return new URL(origin).hostname;
		})();
		
		// Testing: Relay Party ID
		if (this.testing.relayPartyID) {
			rpid = new URL('https://' + this.testing.relayPartyID).hostname;
		}
		
		// Prepare new key
		await this._cred_init(rpid, options.publicKey.user.id, null, keyPairAlg);
		// Save resident key
		if (requestResidentKey) await this._saveResidentKey(rpid);

		// Get credential id
		let credential_id = new Uint8Array(this.credential_id);

		// Generate response
		let client_data = {
			'type': 'webauthn.create',
			'challenge': window.authnTools.uint8ArrayToBase64url(options.publicKey.challenge),
			'origin': origin,
			'crossOrigin': false,
			'virtual_authenticator' : 'GramThanos & University of Piraeus'
		}
		console.log(client_data);
		client_data = JSON.stringify(client_data);
		client_data = new TextEncoder().encode(client_data);

		// hash the message
		let rp_id_hash = new Uint8Array(await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(this.rp_id)));
		let flags = new Uint8Array([this._flags({uv : true, up : true, at : true})]);
		let sign_count = window.authnTools.intToUint8Array(this._getSignCount(), 4, true);
		let credential_id_length = window.authnTools.intToUint8Array(credential_id.length, 2, true);
		let cose_key = new Uint8Array(window.CBOR.encode(this.cose_key));
		let authData = this._concatUint8Arrays(rp_id_hash, flags, sign_count, this._getAAGUID(), credential_id_length, credential_id, cose_key);

		// Attestation object
		let attestation_object = {
			'fmt': 'none',
			'attStmt': {},
			'authData': authData
		};

		// Generate surrogate basic attestation
		if (options.publicKey.attestation && (options.publicKey.attestation == 'indirect' || options.publicKey.attestation == 'direct')) {
			// Generate signature
			let client_data_hash = new Uint8Array(await crypto.subtle.digest('SHA-256', client_data));
			let signatureData = this._concatUint8Arrays(authData, client_data_hash);
			let signature = await Algorithms.Sign(this.private_key, signatureData);

			//let signature = await crypto.subtle.sign({name: 'ECDSA', hash: 'SHA-256'}, this.private_key, signatureData);
			// Convert signature
			//signature = [... ans1.parseSignatureECDSA(signature)];

			attestation_object.fmt = 'packed';
			attestation_object.attStmt = {
				'alg' : Algorithms.CryptoKey2Code(this.private_key),
				'sig' : signature
			};

			// If direct generate certificate
			if (options.publicKey.attestation == 'direct') {

				// CA private key
				let caPrivateKey = {
					"crv":"P-256",
					"d":"wNArRI8X1g4-atojTyJM-Q40bqTInVEH2ajIwFC0cV8",
					"ext":true,
					"key_ops":["sign"],
					"kty":"EC",
					"x":"T88rAHd-XlvAV_mNmq0R-yQfQs0TVPyMK-lNhE6psnQ",
					"y":"Qbmy_EVaC6FQWmpYqZyVuMzNymji6o2vXOOX2bMjPmI"
				}
				caPrivateKey = await window.crypto.subtle.importKey("jwk", caPrivateKey, {name: 'ECDSA', namedCurve: 'P-256'}, true, ['sign']);

				// Generate Certificate
				let cert = await ans1.generateCertificate({
					indentifier : 424242424242,
					// Issued by
					issuedBy : {
						countryName : 'GR', // Subject-C: ISO 3166 code specifying the country where the Authenticator vendor is incorporated
						organizationName : 'UNIPI SSL', // Subject-O: Legal name of the Authenticator vendor
						commonName : 'UNIPI FIDO2 Virtual Authenticator CA', // Subject-CN: A string of the vendor’s choosing
					},
					// Issued to
					issuedTo : {
						countryName : 'GR', // Subject-C: ISO 3166 code specifying the country where the Authenticator vendor is incorporated
						organizationName : 'UNIPI SSL', // Subject-O: Legal name of the Authenticator vendor
						organizationalUnitName : 'Authenticator Attestation', // Subject-OU: Literal string "Authenticator Attestation"
						commonName : 'UNIPI FIDO2 Virtual Authenticator', // Subject-CN: A string of the vendor’s choosing
					},

					// AAGUID
					aaguid : this._getAAGUID(),

				}, this.public_key, caPrivateKey);

				// Add certificate on responce
				attestation_object.attStmt.x5c = [cert];
			}
		}

		// Clear master key if not needed
		if (this.askmasterkey) this.clearMasterKey();

		// Return Credentials
		return new (VirtualPublicKeyCredential())({
			'id': window.authnTools.uint8ArrayToBase64url(credential_id),
			'rawId': credential_id.buffer.slice(0),
			'response': {
				'attestationObject': window.CBOR.encode(attestation_object),
				'clientDataJSON': client_data.buffer
			},
			'type': 'public-key',

			// Extensions
			'getClientExtensionResults' : {}
		});
	};

	AuthnDevice.prototype.get = async function(options, _origin) {
		// Check input
		if (!options || !options.publicKey) {
			throw new Error('Invalid options were given');
		}
		// Check if challenge exists
		if (!options.publicKey.challenge) {
			throw new Error('No challenge was given');
		}

		// Calcualte RP ID and origin's effective domain
		let origin = (() => {
			if (_origin)
				try { return new URL(_origin).origin; } catch (e) {};
			if (this.localUrl)
				try { return new URL(this.localUrl).origin; } catch (e) {};
			if (options.publicKey && options.publicKey.rpId)
				try { return new URL('https://' + options.publicKey.rpId).origin; } catch (e) {};
			return new URL(localURL).origin;
		})();
		
		// Testing: Origin
		if (this.testing.origin) {
			origin = new URL(this.testing.origin).origin;
		}

		let rpid = (() => {
			if (options.publicKey && options.publicKey.rpId)
				try { return new URL('https://' + options.publicKey.rpId).hostname; } catch (e) {};
			if (this.localUrl)
				try { return new URL(this.localUrl).hostname; } catch (e) {};
			return new URL(origin).hostname;
		})();
		
		// Testing: Relay Party ID
		if (this.testing.relayPartyID) {
			rpid = new URL('https://' + this.testing.relayPartyID).hostname;
		}

		// Check allowCredentials credentials
		if (! await (async (params) => {
			// If given keys
			if (params && params.length > 0) {
				// Check the given credentials
				for (let i = params.length - 1; i >= 0; i--) {
					if (
						params[i].type == 'public-key' &&
						params[i].id &&
						await this._cred_init(rpid, null, params[i].id)
					)
						return true;
				}
				// Check the resident credentials by id
				for (let i = params.length - 1; i >= 0; i--) {
					if (
						params[i].type == 'public-key' &&
						params[i].id &&
						await this._cred_init_with_ResidentKey(rpid, null, params[i].id)
					)
						return true;
				}
			}
			// Check resident key
			if (await this._cred_init_with_ResidentKey(rpid))
				return true;
			return false;
		}) (options.publicKey.allowCredentials)) {
			throw new Error('No authenticator found for the requested allowCredentials');
		}

		// Get credentials
		let credential_id = new Uint8Array(this.credential_id);

		// Generate Authenticator Data
		let rp_id_hash = new Uint8Array(await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(this.rp_id)));
		let flags = new Uint8Array([this._flags({uv : true, up : true})]);
		let sign_count = window.authnTools.intToUint8Array(this._getSignCount(), 4, true);
		let authData = this._concatUint8Arrays(rp_id_hash, flags, sign_count);

		// Testing: Relay Party ID
		if (this.testing.relayPartyID) {
			origin = new URL('https://' + this.testing.relayPartyID).origin;
			//options.publicKey.rpId = this.testing.relayPartyID;
		}

		// Generate Client Data
		let client_data = {
			'type': 'webauthn.get',
			'challenge': window.authnTools.uint8ArrayToBase64url(options.publicKey.challenge),
			'origin': origin,
			'crossOrigin' : false,
			'virtual_authenticator' : 'GramThanos & University of Piraeus'
		}
		client_data = JSON.stringify(client_data);
		client_data = new TextEncoder().encode(client_data);

		// Generate signature
		let client_data_hash = new Uint8Array(await crypto.subtle.digest('SHA-256', client_data));
		let signatureData = this._concatUint8Arrays(authData, client_data_hash);
		let signature = await Algorithms.Sign(this.private_key, signatureData);
		//let signature = await crypto.subtle.sign({name: 'ECDSA', hash: 'SHA-256'}, this.private_key, signatureData);
		// Convert signature
		//signature = ans1.parseSignatureECDSA(signature);

		// Clear master key if not needed
		if (this.askmasterkey) this.clearMasterKey();

		// Return Credentials
		return new (VirtualPublicKeyCredential())({
			'id': window.authnTools.uint8ArrayToBase64url(credential_id),
			'rawId': credential_id.buffer.slice(0),
			'response': {
				'authenticatorData': authData.buffer,
				'userHandle' : this.user_handle.buffer,
				'signature' : signature.buffer,
				'clientDataJSON': client_data.buffer,
			},
			'type': 'public-key',

			// Extensions
			'getClientExtensionResults' : {}
		});
	};

	// Algorithm
	let Algorithms = {
		CryptoKey2Code : function(key) {
			if (key.algorithm.name == 'ECDSA') {
				if (key.algorithm.namedCurve == 'P-256') return -7;  // (-7) ECDSA w/ SHA-256
				if (key.algorithm.namedCurve == 'P-384') return -35; // (-35) ECDSA w/ SHA-384
				if (key.algorithm.namedCurve == 'P-521') return -36; // (-36) ECDSA w/ SHA-512
				return null;
			}
			if (key.algorithm.name == 'RSA-PSS' && key.algorithm.hash) {
				if (key.algorithm.hash.name == 'SHA-256') return -37; // (-37) RSASSA-PSS w/ SHA-256
				if (key.algorithm.hash.name == 'SHA-384') return -38; // (-38) RSASSA-PSS w/ SHA-384
				if (key.algorithm.hash.name == 'SHA-512') return -39; // (-39) RSASSA-PSS w/ SHA-512
				return null;
			}
			if (key.algorithm.name == 'RSASSA-PKCS1-v1_5' && key.algorithm.hash) {
				if (key.algorithm.hash.name == 'SHA-1') return -65535; // (-65535) RSASSA-PKCS1-v1_5 using SHA-1
				if (key.algorithm.hash.name == 'SHA-256') return -257; // (-257) RSASSA-PKCS1-v1_5 using SHA-256
				if (key.algorithm.hash.name == 'SHA-384') return -258; // (-258) RSASSA-PKCS1-v1_5 using SHA-384
				if (key.algorithm.hash.name == 'SHA-512') return -259; // (-259) RSASSA-PKCS1-v1_5 using SHA-512
				return null;
			}
			if (key.algorithm.name == 'FALCON' && key.algorithm.n) {
				if (key.algorithm.n == 256) return -66777; // (-66777) FALCON 256 bit
				if (key.algorithm.n == 512) return -66778; // (-66778) FALCON 512 bit
				if (key.algorithm.n == 1024) return -66779; // (-66779) FALCON 1024 bit
				return null;
			}

			throw new Error('Unknown key was given.');
		},
		Code2CryptoKeyType : function(code) {
			if (isNaN(code) && code.algorithm) return code.algorithm;
			
			if (code == -7) return {name: 'ECDSA', namedCurve: 'P-256'};
			if (code == -35) return {name: 'ECDSA', namedCurve: 'P-384'};
			if (code == -36) return {name: 'ECDSA', namedCurve: 'P-521'};

			if (code == -37) return {name: 'RSA-PSS', modulusLength: 2048, publicExponent: new Uint8Array([0x01, 0x00, 0x01]), hash: {name: 'SHA-256'}};
			if (code == -38) return {name: 'RSA-PSS', modulusLength: 2048, publicExponent: new Uint8Array([0x01, 0x00, 0x01]), hash: {name: 'SHA-384'}};
			if (code == -39) return {name: 'RSA-PSS', modulusLength: 2048, publicExponent: new Uint8Array([0x01, 0x00, 0x01]), hash: {name: 'SHA-512'}};

			if (code == -65535) return {name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([0x01, 0x00, 0x01]), hash: {name: 'SHA-1'}};
			if (code == -257) return {name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([0x01, 0x00, 0x01]), hash: {name: 'SHA-256'}};
			if (code == -258) return {name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([0x01, 0x00, 0x01]), hash: {name: 'SHA-384'}};
			if (code == -259) return {name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([0x01, 0x00, 0x01]), hash: {name: 'SHA-512'}};
			
			if (code == -66777) return {name: 'FALCON', n: 256};
			if (code == -66778) return {name: 'FALCON', n: 512};
			if (code == -66779) return {name: 'FALCON', n: 1024};

			return null;
		},
		CryptoKeyWrap : async function(key, data = {}) {
			// Get algorithm
			let alg = this.CryptoKey2Code(key);
			data.a = alg;
			// Export key
			let jwkPrivateKey = await crypto.subtle.exportKey('jwk', key);

			if (
				alg == -7 ||	// (-7) ECDSA w/ SHA-256
				alg == -35 ||	// (-35) ECDSA w/ SHA-384
				alg == -36		// (-36) ECDSA w/ SHA-512
			) 
				data.k = {
					d : jwkPrivateKey.d,
					x : jwkPrivateKey.x,
					y : jwkPrivateKey.y
				};

			else if (
				alg == -37 ||	// (-37) RSASSA-PSS w/ SHA-256
				alg == -38 ||	// (-38) RSASSA-PSS w/ SHA-384
				alg == -39		// (-39) RSASSA-PSS w/ SHA-512
			)
				data.k = {
					d : jwkPrivateKey.d,
					dp : jwkPrivateKey.dp,
					dq : jwkPrivateKey.dq,
					e : jwkPrivateKey.e,
					n : jwkPrivateKey.n,
					p : jwkPrivateKey.p,
					q : jwkPrivateKey.q,
					qi : jwkPrivateKey.qi
				};

			else if (
				alg == -65535 ||	// (-65535) RSASSA-PKCS1-v1_5 using SHA-1
				alg == -257 ||		// (-257) RSASSA-PKCS1-v1_5 using SHA-256
				alg == -258 ||		// (-258) RSASSA-PKCS1-v1_5 using SHA-384
				alg == -259			// (-259) RSASSA-PKCS1-v1_5 using SHA-512
			)
				data.k = {
					d : jwkPrivateKey.d,
					dp : jwkPrivateKey.dp,
					dq : jwkPrivateKey.dq,
					e : jwkPrivateKey.e,
					n : jwkPrivateKey.n,
					p : jwkPrivateKey.p,
					q : jwkPrivateKey.q,
					qi : jwkPrivateKey.qi
				};

			else if (
				alg == -66777 ||	// (-66777) FALCON 256 bit
				alg == -66778 ||	// (-66778) FALCON 512 bit
				alg == -66779		// (-66779) FALCON 1024 bit
			) 
				data.k = {
					d : jwkPrivateKey.d,
					p : jwkPrivateKey.p
				};

			// Error
			else throw new Error('Key wrapping failed, unknown private key type.');

			return data;
		},
		CryptoKeyUnWrap : async function(data) {
			let type = this.Code2CryptoKeyType(data.a);

			if (type.name == 'ECDSA') {
				// Key missing values
				data.k.crv = type.namedCurve;
				data.k.ext = true;
				data.k.kty = 'EC';
				// Import as private key
				data.k.key_ops = ['sign'];
				let private_key = await crypto.subtle.importKey('jwk', data.k, type, true, ['sign']);
				// Import as public key
				data.k.key_ops = ['verify'];
				delete data.k.d;
				let public_key = await crypto.subtle.importKey('jwk', data.k, type, true, ['verify']);
				// Return data
				return {private_key, public_key};
			}
			if (type.name == 'RSA-PSS') {
				// Key missing values
				data.k.alg = type.hash.name.replace('SHA-', 'PS');
				data.k.ext = true;
				data.k.kty = 'RSA';
				// Import as private key
				data.k.key_ops = ['sign'];
				let private_key = await crypto.subtle.importKey('jwk', data.k, type, true, ['sign']);
				// Import as public key
				data.k.key_ops = ['verify'];
				delete data.k.d;
				delete data.k.dp;
				delete data.k.dq;
				delete data.k.p;
				delete data.k.q;
				delete data.k.qi;
				let public_key = await crypto.subtle.importKey('jwk', data.k, type, true, ['verify']);
				// Return data
				return {private_key, public_key};
			}
			if (type.name == 'RSASSA-PKCS1-v1_5') {
				// Key missing values
				data.k.alg = type.hash.name.replace('SHA-', 'RS');
				data.k.ext = true;
				data.k.kty = 'RSA';
				// Import as private key
				data.k.key_ops = ['sign'];
				let private_key = await crypto.subtle.importKey('jwk', data.k, type, true, ['sign']);
				// Import as public key
				data.k.key_ops = ['verify'];
				delete data.k.d;
				delete data.k.dp;
				delete data.k.dq;
				delete data.k.p;
				delete data.k.q;
				delete data.k.qi;
				let public_key = await crypto.subtle.importKey('jwk', data.k, type, true, ['verify']);
				// Return data
				return {private_key, public_key};
			}
			if (type.name == 'FALCON') {
				// Key missing values
				data.k.ext = true;
				data.k.kty = 'FLCN';
				// Import as private key
				data.k.key_ops = ['sign'];
				let private_key = await crypto.subtle.importKey('jwk', data.k, type, true, ['sign']);
				// Import as public key
				data.k.key_ops = ['verify'];
				delete data.k.d;
				let public_key = await crypto.subtle.importKey('jwk', data.k, type, true, ['verify']);
				// Return data
				return {private_key, public_key};
			}
			
			return false;
		},

		CryptoKey2COSEKey : async function(key) {
			// Get algorithm
			let alg = this.CryptoKey2Code(key);
			let type = this.Code2CryptoKeyType(alg);
			if (!alg || !type) throw new Error('Key to COSE convertion failed, unknown public key type.');
			// Export public key
			let jwkPublicKey = await crypto.subtle.exportKey('jwk', key);

			// Prepare COSE
			let cose_key = new Map();
			
			if (type.name == 'ECDSA') {
				cose_key.set( 1, 2);
				cose_key.set( 3, alg);
				cose_key.set(-1, 1);
				cose_key.set(-2, window.authnTools.base64urlToUint8Array(jwkPublicKey.x));
				cose_key.set(-3, window.authnTools.base64urlToUint8Array(jwkPublicKey.y));
			}
			else if (type.name == 'RSA-PSS') {
				cose_key.set( 1, 3);
				cose_key.set( 3, alg);
				cose_key.set(-1, window.authnTools.base64urlToUint8Array(jwkPublicKey.n));
				cose_key.set(-2, window.authnTools.base64urlToUint8Array(jwkPublicKey.e));
			}
			else if (type.name == 'RSASSA-PKCS1-v1_5') {
				cose_key.set( 1, 3);
				cose_key.set( 3, alg);
				cose_key.set(-1, window.authnTools.base64urlToUint8Array(jwkPublicKey.n));
				cose_key.set(-2, window.authnTools.base64urlToUint8Array(jwkPublicKey.e));
			}
			else if (type.name == 'FALCON') {
				cose_key.set( 1, 10);
				cose_key.set( 3, alg);
				cose_key.set(-1, 1);
				cose_key.set(-2, window.authnTools.base64urlToUint8Array(jwkPublicKey.p));
			}

			return cose_key;
		},

		GenerateCryptoKey : async function(alg) {
			let type = this.Code2CryptoKeyType(alg);
			let pair = await crypto.subtle.generateKey(type, true, ['sign', 'verify']);
			return {
				public_key : pair.publicKey,
				private_key : pair.privateKey
			};
		},

		Supported : function(params) {
			let algs = [
				 -7, -35, -36, // ECDSA
				-37, -38, -39, // RSA-PSS
				-65535, -257, -258, -259, // RSASSA-PKCS1-v1_5
				-66777, -66778, -66779 // FALCON custom
			];
			return params.filter(param => (param.type == 'public-key' && algs.includes(param.alg)));
		},

		Sign : async function(private_key, data) {
			let type = private_key.algorithm;

			if (type.name == 'ECDSA') {
				let signature = await crypto.subtle.sign({name: 'ECDSA', hash: 'SHA-256'}, private_key, data);
				signature = ans1.parseSignatureECDSA(signature);
				return signature; 
			}
			else if (type.name == 'RSA-PSS') {
				// ToDo Check
				let signature = await crypto.subtle.sign({name: 'RSA-PSS', saltLength: 128}, private_key, data);
				return new Uint8Array(signature); 
			}
			else if (type.name == 'RSASSA-PKCS1-v1_5') {
				// ToDo Check
				let signature = await crypto.subtle.sign({name: 'RSASSA-PKCS1-v1_5'}, private_key, data);
				return new Uint8Array(signature); 
			}
			else if (type.name == 'FALCON') {
				// ToDo Check
				let signature = await crypto.subtle.sign({name: 'FALCON', n: type.n}, private_key, data);
				return new Uint8Array(signature); 
			}

			throw new Error('Signature generation failed, unknown public key type.');
		}
	};

	// ASN.1 / DER
	let ans1 = {
		// Tag length integer encoding
		intToLength : function(n) {
			// http://luca.ntop.org/Teaching/Appunti/asn1.html
			// If simple form, just return
			if (n < 128) return [n];

			// Initial array of bytes
			let value = [];
			// Convert number to hex
			n = n.toString(16);
			// Pad hex with zero if needed
			if (n.length % 2 != 0) n = '0' + n;
			// Split stream to bytes
			n = n.match(/.{1,2}/g);

			// Convert hex strings to bytes and add them on array
			for (let i = 0; i < n.length; i++) {
				value.push(parseInt(n[i], 16));
			}

			// First byte has it's first bit to 1 and then the number of bytes following
			value.unshift(128 + value.length);
			return value;
		},

		// Concatenete 2 Uint8Arrays
		concatUint8Array : function(a, b) {
			var c = new Uint8Array(a.length + b.length);
			c.set(a);
			c.set(b, a.length);
			return c;
		},

		tagDER : function(type, value) {
			if (typeof type === 'string') {
				switch(type) {
					case 'OBJECT-IDENTIFIER': type = 0x06; break;
					case 'BIT-STRING': type = 0x03; break;
					case 'OCTET-STRING': type = 0x04; break;
					default: new Error('Unknown type "' + type + '"');
				}
			}
			return this.concatUint8Array(
				new Uint8Array([type, ... this.intToLength(value.length)]),
				value
			);
		},

		// Parse javascript object to ANS.1/DER
		objectToDER : function(obj) {
			// Byte arrays are keept as it is
			if (obj instanceof Uint8Array) {
				return obj;
			}

			// Arrays are converted to SEQUENCEs
			else if (obj instanceof Array) {
				let value = new Uint8Array([]);
				// Convert each item and concat them
				for (let i = 0; i < obj.length; i++) {
					value = this.concatUint8Array(value, this.objectToDER(obj[i]));
				}
				return this.tagDER(0x30, value);
			}

			// Sets are converted to SETs
			else if (obj instanceof Set) {
				let value = new Uint8Array([]);
				// Convert each item and concat them
				obj.forEach(item => {
					value = this.concatUint8Array(value, this.objectToDER(item));
				});
				return this.tagDER(0x31, value);
			}

			// Strings are used from multiple types in the form of `TYPE{VALUE}`
			else if (typeof obj === 'string') {

				// OBJECT IDENTIFIER
				if (obj.match(/^OBJECT-IDENTIFIER{[0-9\.]+}$/i)) {
					// https://stackoverflow.com/questions/5929050/how-does-asn-1-encode-an-object-identifier
					obj = obj.substring(18, obj.length - 1).split('.');
					let prefix = parseInt(obj.shift(), 10) * 40 + parseInt(obj.shift(), 10);
					let value = [];
					obj.forEach(n => {
						n = parseInt(n, 10).toString(2);
						while (n.length % 7 != 0) n = '0' + n;
						n = n.match(/.{1,7}/g);
						for (let i = 0; i < n.length; i++) {
							value.push(parseInt((i < n.length - 1 ? '1' : '0') + n[i], 2));
						}
					});
					value.unshift(prefix);
					value.unshift(... this.intToLength(value.length));
					value.unshift(0x06);

					return new Uint8Array(value);
				}

				else if (obj.match(/^BIT-STRING-HEX{[0-9A-F ]+}$/i)) {
					obj = obj.substring(15, obj.length - 1).replace(/\s+/g,'');
					if (obj.length % 2 !== 0) obj += '0' + obj;

					let value = [];
					obj = obj.match(/.{1,2}/g);
					for (let i = 0; i < obj.length; i++) {
						value.push(parseInt(obj[i], 16));
					}

					value.unshift(... this.intToLength(value.length));
					value.unshift(0x03);

					return new Uint8Array(value);
				}

				else if (obj.match(/^BIT-STRING-BIN{[0-1 ]+}$/i)) {
					obj = obj.substring(15, obj.length - 1).replace(/\s+/g,'');
					while (obj.length % 8 !== 0) obj += '0' + obj;

					let value = [];
					obj = obj.match(/.{1,8}/g);
					for (let i = 0; i < obj.length; i++) {
						value.push(parseInt(obj[i], 2));
					}

					value.unshift(... this.intToLength(value.length));
					value.unshift(0x03);

					return new Uint8Array(value);
				}

				else if (obj.match(/^OCTET-STRING{.+}$/i)) {
					obj = obj.substring(13, obj.length - 1);
					let value = obj.split('').map(function (c) {return c.charCodeAt (0);});
					value.unshift(0x04, ... this.intToLength(value.length));
					return new Uint8Array(value);
				}

				else if (obj.match(/^OCTET-STRING-HEX{[0-9A-F ]+}$/i)) {
					obj = obj.substring(17, obj.length - 1).replace(/\s+/g,'');
					if (obj.length % 2 !== 0) obj += '0' + obj;

					let value = [];
					obj = obj.match(/.{1,2}/g);
					for (let i = 0; i < obj.length; i++) {
						value.push(parseInt(obj[i], 16));
					}

					value.unshift(0x04, ... this.intToLength(value.length));
					return new Uint8Array(value);
				}

				else if (obj.match(/^UTF8{.+}$/i)) {
					obj = obj.substring(5, obj.length - 1);
					let value = obj.split('').map(function (c) {return c.charCodeAt (0);});
					value.unshift(0x0C, ... this.intToLength(value.length));
					return new Uint8Array(value);
				}

				else {
					let value = obj.split('').map(function (c) {return c.charCodeAt (0);});
					value.unshift(0x13, ... this.intToLength(value.length));
					return new Uint8Array(value);
				}
			}

			// Integer numbers encoding
			else if (typeof obj === 'number' && Number.isInteger(obj)) {
				number = obj.toString(16);
				if (number.length % 2 != 0) number = '0' + number;
				var value = [];
				for (var i = 0, len = number.length; i < len; i += 2) {
					value.push(parseInt(number.substring(i, i + 2), 16));
				}
				return this.concatUint8Array(new Uint8Array([0x02, ... this.intToLength(value.length)]), value);
			}

			// Null value encoding
			else if (obj === null) {
				return new Uint8Array([0x05, 0x00]);
			}

			// Date convert to UTCTime or GeneralizedTime
			// https://www.obj-sys.com/asn1tutorial/node14.html
			else if (obj instanceof Date) {
				let value = obj.toISOString().replace(/(\-|:|T|\.000)/g,'');
				value = value.split('').map(function (c) {return c.charCodeAt (0);});

				// If year starts with 20
				if (value[0] === '2' && value[1] === '0') {
					// Remove 20
					value.shift()
					value.shift()
					// Add UTCTime code
					value.unshift(0x17, ... this.intToLength(value.length));
				}
				else {
					// Add GeneralizedTime code
					value.unshift(0x18, ... this.intToLength(value.length));
				}
				return new Uint8Array(value);
			}

			// Boolean value encoding
			else if (typeof obj === 'boolean') {
				if (obj) return new Uint8Array([0x01, 0x01, 0xFF]);
				else return new Uint8Array([0x01, 0x01, 0x00]); // I haven't checked if this is correct
			}

			// Custom code object
			else if (obj instanceof Object && obj.hasOwnProperty('tag') && obj.hasOwnProperty('val')) {
				let value = this.objectToDER(obj.val);
				return this.tagDER(obj.tag, value);
			}

			// Anything else is unknown
			//console.log('unknown value', obj);
			//return new Uint8Array([]);
			console.log(obj);
			throw new Error('Unknown value. Failed to encode it.');
		},

		// ECDSA signature P1363 To ANS.1/DER
		parseSignatureECDSA : function(signature) {
			// Based on code from https://stackoverflow.com/a/53999909
			
			// Example WebCrypto Signatures - P1363/Raw format: r|s
			// 33e88305ee03ab8c3ff422b4a9c966e259c28042f6837caaa1dc6c1d9a77d1a47403f2410550fabf50ab6689cf613e01e601b9231d01a8853defff830d4266d3
			// 5fe33598dce02dffc853c5f1b2a7317d1070971f8fd6fe3770ad862021ed2edc597ac2fe73ec96b4c68923c523b334ba50288f7e9f75ede1f61d28cb28a82e3f
			// cf6f5c0310d0d71e794e047552d25c9ef0b12199503e12730039b384ba73f5df5c86a32be1134b941451eea8e89ad22cba8d2acf0bba44185c47ccacfeed5aa2
			
			// WebAuthn Signature - : ANS1/DER/RFC3279 format: 0x30|len(rest-of-payload)|0x02|len(r)|r|0x02|len(s)|s
			// Example signature from KeyID USB Key
			//"30 44 02 20 54076e6a4205e506c56530187be5afa5c2beb975810e86e43c1411ad42c1c45d   02 20 338369ccd67857b11405f3ecf15983fcf94edf111e141b182f9754628db1f8a6"
			// Example from https://crypto.stackexchange.com/questions/57731/ecdsa-signature-rs-to-asn1-der-encoding-question
			//"30 45 02 21 00B2B31575F8536B284410D01217F688BE3A9FAF4BA0BA3A9093F983E40D630EC7 02 20 22A7A25B01403CFF0D00B3B853D230F8E96FF832B15D4CCC75203CB65896A2D5"
			
			// Convert signature to hex string
			signature = new Uint8Array(signature);
			let signHex = Array.prototype.map.call(signature, function(x) {
				return ('00' + x.toString(16)).slice(-2);
			}).join('');

			// Extract R and S
			let r = signHex.substring(0, signHex.length/2);
			let s = signHex.substring(signHex.length/2);

			// Remove trailing zero bytes from R and S
			while (r.indexOf('00') === 0) r = r.substring(2);
			while (s.indexOf('00') === 0) s = s.substring(2);

			// First byte of R and S should be zero (positive integers) (0x01111111 = 127)
			if (parseInt(r.substring(0, 2), 16) > 127) r = '00' + r;
			if (parseInt(s.substring(0, 2), 16) > 127) s = '00' + s;

			// Hex string length as hex sting
			let length = (hex) => {
				return ('00' + (hex.length / 2).toString(16)).slice(-2).toString();
			}

			// Construct DER
			let payload = '02' + length(r) + r + '02' + length(s) + s;
			let der = '30' + length(payload) + payload;

			// Convert to ArrayBuffer
			let signatureDER = new Uint8Array(Array.from(der.match(/.{2}/g)).map((h) => {return parseInt(h,16);}));

			// Parse hex to ArrayBuffer
			return signatureDER;
		},

		// Generate a certificate for authenticator
		generateCertificate : async function(info, publicKey, caPrivateKey) {
			//if (!caPrivateKey || !caPrivateKey.algorithm || caPrivateKey.algorithm.name !== 'RSASSA-PKCS1-v1_5') {
			//	throw new Error('Only RSASSA-PKCS1-v1_5 keys are supported as a CA');
			//}
			if (!caPrivateKey || !caPrivateKey.algorithm || caPrivateKey.algorithm.name !== 'ECDSA') {
				throw new Error('Only ECDSA keys are supported as a CA');
			}

			// Generate TBS Certificate
			let tbs = this.objectToDER([
				// Version
				{tag : 0xA0, val : 0x02},
				info.indentifier,	// Indentifier

				//['OBJECT-IDENTIFIER{1.2.840.113549.1.1.11}'], // sha256WithRSAEncryption
				['OBJECT-IDENTIFIER{1.2.840.10045.4.3.2}'], // ecdsaWithSHA256

				// Issuer Field
				[
					// countryName
					new Set([['OBJECT-IDENTIFIER{2.5.4.6}', info.issuedBy.countryName]]),
					// organizationName
					new Set([['OBJECT-IDENTIFIER{2.5.4.10}', 'UTF8{' + info.issuedBy.organizationName + '}']]),
					// commonName
					new Set([['OBJECT-IDENTIFIER{2.5.4.3}', info.issuedBy.commonName]])
				],
				// Dates
				[
					new Date('2021-01-01 00:00:00 GMT+0200'),
					new Date('2121-01-01 00:00:00 GMT+0200')
				],
				// Subject field
				[
					// countryName
					new Set([['OBJECT-IDENTIFIER{2.5.4.6}', info.issuedTo.countryName]]),
					// organizationName
					new Set([['OBJECT-IDENTIFIER{2.5.4.10}', 'UTF8{' + info.issuedTo.organizationName + '}']]),
					// organizationalUnitName
					new Set([['OBJECT-IDENTIFIER{2.5.4.11}', 'UTF8{' + info.issuedTo.organizationalUnitName + '}']]),
					// commonName
					new Set([['OBJECT-IDENTIFIER{2.5.4.3}', 'UTF8{' + info.issuedTo.commonName + '}']])
				],
				
				// Public Key in SubjectPublicKeyInfo format
				//[
				//	[
				//		'OBJECT-IDENTIFIER{1.2.840.10045.2.1}', // ecPublicKey
				//		'OBJECT-IDENTIFIER{1.2.840.10045.3.1.7}' // prime256v1
				//	],
				//	'BIT-STRING-HEX{xx xx xx xx}'
				//],
				new Uint8Array(await crypto.subtle.exportKey('spki', publicKey)),

				{
					tag : 0xA3,
					val : [
						[ // If the related attestation root certificate is used for multiple authenticator models
							'OBJECT-IDENTIFIER{1.3.6.1.4.1.45724.1.1.4}', // id-fido-gen-ce-aaguid
							//'OCTET-STRING-HEX{04 10 14 9A 20 21 8E F6 41 33 96 B8 81 F8 D5 B7 F1 F5}', // AAGUID
							this.tagDER('OCTET-STRING', this.tagDER('OCTET-STRING', info.aaguid))
						],
						[ // Transport extension fidoU2FTransports
							'OBJECT-IDENTIFIER{1.3.6.1.4.1.45724.2.1.1}',
							'OCTET-STRING-HEX{03 02 05 20}' // USB-internal
						],
						[ // Basic Constraints
							'OBJECT-IDENTIFIER{2.5.29.19}',
							true,
							'OCTET-STRING-HEX{30 00}'
						]
					]
				}
			]);

			// Sign TBS
			// https://security.stackexchange.com/questions/142635/how-is-a-digital-signature-of-a-x-509-generated
			
			//let signature = new Uint8Array(await crypto.subtle.sign(caPrivateKey.algorithm, caPrivateKey, tbs));
			//console.log(caPrivateKey.algorithm);
			let signature = new Uint8Array(await crypto.subtle.sign({name: 'ECDSA', hash: 'SHA-256'}, caPrivateKey, tbs));

			//console.log('signature', signature, signature.length);

			// Generate certificate
			let certificate = this.objectToDER([
				tbs,

				//// sha256WithRSAEncryption
				//['OBJECT-IDENTIFIER{1.2.840.113549.1.1.11}', null],
				//this.tagDER('BIT-STRING', signature)

				// ecdsaWithSHA256
				['OBJECT-IDENTIFIER{1.2.840.10045.4.3.2}'],
				this.tagDER('BIT-STRING', this.concatUint8Array(new Uint8Array([0x00]), this.parseSignatureECDSA(signature)))
			]);

			//return this.tagDER('BIT-STRING', signature);
			return certificate;
		}
	};


	// Virtual AuthenticatorAssertionResponse
	// Based on: https://developer.mozilla.org/en-US/docs/Web/API/AuthenticatorAssertionResponse
	var VirtualAuthenticatorAssertionResponse = function () {
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
					this['__proto__']['__proto__'] = window.AuthenticatorAssertionResponse.prototype;
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
	var VirtualAuthenticatorAttestationResponse = function () {
		return (class extends (class Dummy {}) {
			constructor(obj) {
				// Call dummy parent
				super(obj);
				// Save info
				this.clientDataJSON = obj.clientDataJSON;
				this.attestationObject = obj.attestationObject;

				// Patch object ancestors to be instance of AuthenticatorAttestationResponse
				if (obj.patch !== false)
					this['__proto__']['__proto__'] = window.AuthenticatorAttestationResponse.prototype;
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
	var VirtualPublicKeyCredential = function () {
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
				this[priv].extensions = typeof obj.getClientExtensionResults == 'function' ? obj.getClientExtensionResults() : obj.getClientExtensionResults || {};

				// Patch object ancestors to be instance of PublicKeyCredential
				if (obj.patch !== false)
					this['__proto__']['__proto__'] = window.PublicKeyCredential.prototype;
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

	AuthnDevice.VirtualClasses = {
		VirtualAuthenticatorAssertionResponse : VirtualAuthenticatorAssertionResponse,
		VirtualAuthenticatorAttestationResponse : VirtualAuthenticatorAttestationResponse,
		VirtualPublicKeyCredential : VirtualPublicKeyCredential
	};
	AuthnDevice.tools = {
		Algorithms : Algorithms,
		ans1 : ans1
	};

	return AuthnDevice;
})(window.location.href);


window.VirtualAuthn = window.VirtualAuthn || ((credentials, AuthnDevice) => {
	let VirtualAuthn = {
		name : 'VirtualAuthn',

		init : function() {
			this.virtual = false;
			this.device = new AuthnDevice();
			this.device.handleStorage = (data = false) => {
				if (data) {
					window.localStorage.setItem(this.name + '-storage', JSON.stringify(data));
				}
				else {
					return JSON.parse(window.localStorage.getItem(this.name + '-storage') || '[]');
				}
			}

			// If authenticator should ask for master key
			let ask4key = window.localStorage.getItem(this.name + '-always-ask-for-masterkey');
			if (ask4key && ask4key == 'yes') {
				this.device.alwaysAskMasterKey(true);
			}
			// Else use custom key or load default
			else {
				// Load MasterKey if it is changed
				let masterkey = window.localStorage.getItem(this.name + '-masterkey');
				//console.log('masterkey', masterkey);
				if (masterkey) this.device.setMasterKey(masterkey);
				//this.device.clearMasterKey();
			}

			this.restore_session();
			this.override_api();
			this.init_interface();
		},

		restore_session : function() {
			// Get status
			let status = window.localStorage.getItem(this.name + '-status');
			if (!status) status = 'disabled';
			// Apply
			if (status === 'enabled') this.goVirtual();
			else this.goPhysical();
		},

		override_api : function() {
			// Clone functions
			this.original_create = credentials.create;
			//credentials.original_create = credentials.create;
			this.original_get = credentials.get;
			//credentials.original_get = credentials.get;

			// Override functions
			credentials.create = function() {
				return (VirtualAuthn.virtual ? VirtualAuthn.virtual_create : VirtualAuthn.original_create).apply(this, arguments);
			}
			credentials.get = function() {
				return (VirtualAuthn.virtual ? VirtualAuthn.virtual_get : VirtualAuthn.original_get).apply(this, arguments);
			}
		},

		init_interface : function() {
			// Check for toggle interface
			this.checkbox = document.getElementById('virtual-authenticator-checkbox');
			// If such a UI exists
			if (this.checkbox) {
				// Update UI state
				this.checkbox.checked = this.virtual ? true : false;
				// Detect interaction
				this.checkbox.addEventListener('change', () => {
					if (this.checkbox.checked) {
						this.goVirtual();
					} else {
						this.goPhysical();
					}
				})
			}
		},

		virtual_create : function() {
			return VirtualAuthn.device.create.apply(VirtualAuthn.device, arguments);
		},
		virtual_get : function() {
			return VirtualAuthn.device.get.apply(VirtualAuthn.device, arguments);
		},

		setUrl : function(url) {
			this.device.setLocalUrl(url);
		},

		goVirtual : function() {
			this.virtual = true;
			window.localStorage.setItem(this.name + '-status', 'enabled');
			if (this.checkbox) this.checkbox.checked = true;
		},
		goPhysical : function() {
			this.virtual = false;
			window.localStorage.setItem(this.name + '-status', 'disabled');
			if (this.checkbox) this.checkbox.checked = false;
		},

		isVirtual : function() {
			return this.virtual ? true : false;
		},
		isPhysical : function() {
			return !this.virtual ? true : false;
		},

		doTesting : function(id, value) {
			return this.device.doTesting(id, value);
		}
	}
	VirtualAuthn.init();
	return VirtualAuthn;
})(window.navigator.credentials, window.AuthnDevice);
