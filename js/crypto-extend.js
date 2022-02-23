/*
 * Extend WebCrypto
 * Let's add additional algorithms
 *
 * GramThanos
 *
 */

// Wrapper for Public Key Crypto Subtle
(function(){
	// Run only once
	if (window.crypto.subtle._wrapperLoaded) return;
	window.crypto.subtle._wrapperLoaded = true;
	// Store original functions
	let CryptoSubtle = {
		exportKey : window.crypto.subtle.exportKey,
		importKey : window.crypto.subtle.importKey,
		generateKey : window.crypto.subtle.generateKey,
		sign : window.crypto.subtle.sign,
		verify : window.crypto.subtle.verify,
	};

	let tools = {
		// Base64 URL - Uint8Array
		base64urlToUint8Array : function(base64url) {
			return this.base64ToUint8Array(this.base64urlToBase64(base64url));
		},
		uint8ArrayToBase64url : function(array) {
			return this.base64ToBase64url(this.uint8ArrayToBase64(array));
		},
		
		// Base64 - Uint8Array
		base64ToUint8Array : function(base64) {
			var raw = window.atob(base64);
			var rawLength = raw.length;
			var array = new Uint8Array(new ArrayBuffer(rawLength));

			for(var i = 0; i < rawLength; i++) {
				array[i] = raw.charCodeAt(i);
			}
			return array;
		},
		uint8ArrayToBase64 : function(array) {
			var string = String.fromCharCode.apply(null, new Uint8Array(array));
			return this.stringToBase64(string);
		},

		// Base64 URL - Base64
		base64urlToBase64 : function(base64url) {
			var base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
			while(base64.length % 4 != 0){
				base64 += '=';
			}
			return base64;
		},
		base64ToBase64url : function(base64) {
			var base64url = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=*$/, '');
			return base64url;
		},

		// Base64 - String
		base64ToString : function(base64) {
			return window.atob(base64);
		},
		stringToBase64 : function(string) {
			return window.btoa(string);
		}
	};

	// Custom Keys
	function CustomKey(type, algorithm, extractable, usages, data = {}) {
		this.type = 'private';
		this.algorithm = algorithm;
		this.extractable = extractable ? true : false;
		this.usages = usages.concat();
		this._data = data;
	};

	// Overwride functions

	window.crypto.subtle.generateKey = function(algorithm, extractable, keyUsages) {
		// FALCON
		if (algorithm.name == 'FALCON' && window.falcon) {
			return new Promise((resolve, reject) => {
				let n = !isNaN(algorithm.n) ? algorithm.n : 1024;
				// Generate keys
				window.falcon.keypair(n).then((pair) => {
					// Parse keys
					let publicKey = new CustomKey('public', {name : 'FALCON', n : n}, extractable, keyUsages, {p : pair.publicKey});
					let privateKey = new CustomKey('private', {name : 'FALCON', n : n}, extractable, keyUsages, {p : pair.publicKey, d : pair.privateKey});
					// Return
					return resolve({
						publicKey: publicKey,
						privateKey: privateKey
					});
				}).catch((error) => {
					return reject(error);
				});
			});
		}

		return CryptoSubtle.generateKey.apply(this, arguments);
	};

	window.crypto.subtle.exportKey = function(format, key) {
		if (key instanceof CustomKey) {
			return new Promise((resolve, reject) => {
				if (format == 'jwk') {
					if (key.algorithm.name == 'FALCON') {
						let jwk = {
							alg: (key.algorithm.name + key.algorithm.n),
							ext: key.extractable,
							key_ops: key.usages.concat(),
							kty: 'FLCN',
							n: key.n,
							p: tools.uint8ArrayToBase64url(key._data.p)
						};
						if (key.type == 'private') {
							jwk.d = tools.uint8ArrayToBase64url(key._data.d);
						}
						return resolve(jwk);
					}
				}

				return reject('Failed to export key.');
			});
		}

		return CryptoSubtle.exportKey.apply(this, arguments);
	};

	window.crypto.subtle.importKey = function(format, keyData, algorithm, extractable, keyUsages) {
		// FALCON
		if (algorithm.name == 'FALCON') {
			return new Promise((resolve, reject) => {
				if (format == 'jwk') {
					let data = {p : tools.base64urlToUint8Array(keyData.p)};
					if (keyData.d) data.d = tools.base64urlToUint8Array(keyData.d);
					let key = new CustomKey(
						keyData.d ? 'private' : 'public',
						{name : 'FALCON', n : algorithm.n},
						keyData.ext,
						keyData.key_ops.concat(),
						data
					);
					return resolve(key);
				}

				return reject('Failed to import key.');
			});
		}

		return CryptoSubtle.importKey.apply(this, arguments);
	};

	window.crypto.subtle.sign = function(algorithm, key, data) {
		if (key instanceof CustomKey) {
			// FALCON
			if (algorithm.name == 'FALCON' && window.falcon) {
				return new Promise((resolve, reject) => {
					let n = !isNaN(algorithm.n) ? algorithm.n : 1024;
					window.falcon.sign(data, key._data.d, n).then((signature) => {
						// Return
						return resolve(signature);
					}).catch((error) => {
						return reject(error);
					});
				});
			}
		}

		return CryptoSubtle.sign.apply(this, arguments);
	};

	window.crypto.subtle.verify = function(algorithm, key, signature, data) {
		if (key instanceof CustomKey) {
			// FALCON
			if (algorithm.name == 'FALCON' && window.falcon) {
				return new Promise((resolve, reject) => {
					let n = !isNaN(algorithm.n) ? algorithm.n : 1024;
					window.falcon.verify(data, signature, key._data.p, n).then((signature) => {
						return resolve(true);
					}).catch((error) => {
						return reject(false);
					});
				});
			}
		}

		return CryptoSubtle.verify.apply(this, arguments);
	};
})();