
// WebAuthn Local Credentials ID Manage
(function() {
	var tbody = document.getElementById('localstorage-keys');
	let selection = document.getElementById('localstorage-keys-hosts-list');
	var reload = function() {
		var credentials = window.credStorage.getAll();
		if (credentials.length == 0) {
			tbody.innerHTML = '<tr><td>There are not credentials saved.</td></tr>';
			return;
		}

		let domains = [];
		let defaultSelection = '* All Hostnames *';
		let filter = selection.value == defaultSelection ? '' : selection.value;

		tbody.innerHTML = '';
		for (let i = 0; i < credentials.length; i++) {
			
			// Populate list of domains
			let hostname = new URL(credentials[i].origin).hostname;
			if (domains.indexOf(hostname) == -1) {
				domains.push(hostname);
			}

			// Apply filter
			if (filter.length > 0 && hostname != filter) {
				continue;
			}

			let tr = document.createElement('tr');
			tr.dataset.keyid = credentials[i].id;

			let index = document.createElement('td');
			index.textContent = (i + 1);
			tr.appendChild(index);

			let wrapper = document.createElement('td');
			wrapper.style.fontFamily = 'monospace';
			wrapper.style.fontSize = '16px';

			let user_handle = document.createElement('span');
			user_handle.style.fontSize = '0.7em';
			user_handle.textContent = 'User Handle:';
			wrapper.appendChild(user_handle);
			wrapper.appendChild(document.createTextNode(' '));
			user_handle = document.createElement('span');
			user_handle.className = 'badge bg-primary text-light';
			try {
				let txt = 'String{ ' + atob(credentials[i].user_handle) + ' }';
				user_handle.textContent = txt;
				// Hide if not redable chars or outside ascii
				if (!(/^[ -~]*$/.test(txt))) {
					user_handle.style.display = 'none'
				}

			} catch(e){
				user_handle.textContent = '';
				user_handle.style.display = 'none';
			}
			wrapper.appendChild(user_handle);
			wrapper.appendChild(document.createTextNode(' '));
			user_handle = document.createElement('span');
			user_handle.className = 'badge bg-warning text-light';
			user_handle.textContent = 'BASE64{ ' + credentials[i].user_handle + ' }';
			wrapper.appendChild(user_handle);
			wrapper.appendChild(document.createElement('br'));

			let keyid = document.createElement('span');
			keyid.style.fontSize = '0.7em';
			keyid.textContent = 'KeyID:';
			wrapper.appendChild(keyid);
			wrapper.appendChild(document.createTextNode(' '));
			keyid = document.createElement('span');
			keyid.style.color = '#a4a4a4';
			keyid.style.wordBreak = 'break-all';
			keyid.style.fontSize = '12px';
			keyid.textContent = credentials[i].id;
			wrapper.appendChild(keyid);
			wrapper.appendChild(document.createElement('br'));

			let origin = document.createElement('span');
			origin.style.fontSize = '0.7em';
			origin.textContent = 'Origin:';
			wrapper.appendChild(origin);
			wrapper.appendChild(document.createTextNode(' '));
			origin = document.createElement('span');
			origin.className = 'badge bg-secondary text-light';
			origin.textContent = credentials[i].origin;
			wrapper.appendChild(origin);
			wrapper.appendChild(document.createElement('br'));

			let created = document.createElement('span');
			created.style.fontSize = '0.7em';
			created.textContent = 'Date Created:';
			wrapper.appendChild(created);
			wrapper.appendChild(document.createTextNode(' '));
			created = document.createElement('span');
			created.className = 'badge bg-secondary text-light';
			created.textContent = new Date(credentials[i].created).toISOString();
			wrapper.appendChild(created);
			wrapper.appendChild(document.createElement('br'));

			let type = document.createElement('span');
			type.style.fontSize = '0.7em';
			type.textContent = 'Authenticator Type:';
			wrapper.appendChild(type);
			wrapper.appendChild(document.createTextNode(' '));
			type = document.createElement('span');
			type.className = 'badge bg-light';
			type.textContent = credentials[i].type;
			wrapper.appendChild(type);
			wrapper.appendChild(document.createElement('br'));

			// Authenticator Storage
			let data = window.authenticatorStorage.getById(credentials[i].id);
			if (data) {
				//Resident Key aka Discoverable credential
				let modality = document.createElement('span');
				modality.style.fontSize = '0.7em';
				modality.textContent = 'Storage modality:';
				wrapper.appendChild(modality);
				wrapper.appendChild(document.createTextNode(' '));
				modality = document.createElement('span');
				modality.className = 'badge bg-secondary text-light';
				modality.textContent = (data.keyid != data.wrappedKey) ? 'server-side (inside credential ID)' : 'client-side (Resident Key aka Discoverable credential)';
				wrapper.appendChild(modality);
				wrapper.appendChild(document.createElement('br'));
			}

			tr.appendChild(wrapper);

			let actions = document.createElement('td');
			actions.style.width = '96px';
			let del = document.createElement('button');
			del.className = 'btn btn-sm btn-danger';
			del.textContent = 'remove';
			del.addEventListener('click', function() {
				window.credStorage.remove(this.parentNode.parentNode.dataset.keyid);
				reload();
			});
			actions.appendChild(del);
			if (window.authnTools.base64urlToUint8Array(credentials[i].id).length > 32) {
				let decrypt = document.createElement('button');
				decrypt.style.marginTop = '5px';
				decrypt.className = 'btn btn-sm btn-secondary';
				decrypt.textContent = 'UnWrap';
				decrypt.addEventListener('click', function() {
					window.tryToDecodeWrappedKey(credentials[i].id, null);
				});
				actions.appendChild(decrypt);
			}
			tr.appendChild(actions);
			tbody.appendChild(tr);
		}
		
		// Populate hosts list
		selection.innerHTML = '';
		domains.sort();
		domains.unshift(defaultSelection);
		domains.forEach(x => {
			let option = document.createElement('option');
			option.value = x;
			option.textContent = x;
			option.selected = (x == filter ? true : false);
			selection.appendChild(option);
		});
	}
	reload();
	document.getElementById('localstorage-keys-reload').addEventListener('click', () => {reload();});
	selection.addEventListener('change', () => {reload();});
})();

// WebAuthn Virtual Authenticator Key Info Manage
(function() {
	var tbody = document.getElementById('localstorage-authenticator-keys');
	let selection = document.getElementById('localstorage-authenticator-keys-hosts-list');
	var reload = function() {
		var credentials = window.authenticatorStorage.getAll();
		if (credentials.length == 0) {
			tbody.innerHTML = '<tr><td>There are not credentials saved.</td></tr>';
			return;
		}

		let domains = [];
		let defaultSelection = '* All Hostnames *';
		let filter = selection.value == defaultSelection ? '' : selection.value;

		tbody.innerHTML = '';
		for (let i = 0; i < credentials.length; i++) {
			
			// Populate list of domains
			let hostname = credentials[i].host;
			if (domains.indexOf(hostname) == -1) {
				domains.push(hostname);
			}

			// Apply filter
			if (filter.length > 0 && hostname != filter) {
				continue;
			}

			let tr = document.createElement('tr');
			tr.dataset.keyid = credentials[i].keyid;

			let index = document.createElement('td');
			index.textContent = (i + 1);
			tr.appendChild(index);

			let wrapper = document.createElement('td');
			wrapper.style.fontFamily = 'monospace';
			wrapper.style.fontSize = '16px';

			let keyid = document.createElement('span');
			keyid.style.fontSize = '0.7em';
			keyid.textContent = 'KeyID:';
			wrapper.appendChild(keyid);
			wrapper.appendChild(document.createTextNode(' '));
			keyid = document.createElement('span');
			keyid.style.color = '#a4a4a4';
			keyid.style.wordBreak = 'break-all';
			keyid.style.fontSize = '12px';
			keyid.className = 'badge bg-primary text-light';
			keyid.textContent = credentials[i].keyid;
			wrapper.appendChild(keyid);
			wrapper.appendChild(document.createElement('br'));

			let masterKeySalt = document.createElement('span');
			masterKeySalt.style.fontSize = '0.7em';
			masterKeySalt.textContent = 'MasterKey Salt:';
			wrapper.appendChild(masterKeySalt);
			wrapper.appendChild(document.createTextNode(' '));
			masterKeySalt = document.createElement('span');
			masterKeySalt.style.color = '#a4a4a4';
			masterKeySalt.style.wordBreak = 'break-all';
			masterKeySalt.style.fontSize = '12px';
			masterKeySalt.className = 'badge bg-light';
			masterKeySalt.textContent = credentials[i].masterKeySalt;
			wrapper.appendChild(masterKeySalt);
			wrapper.appendChild(document.createElement('br'));

			let wrappedKey = document.createElement('span');
			wrappedKey.style.fontSize = '0.7em';
			wrappedKey.textContent = 'Wrapped Key:';
			wrapper.appendChild(wrappedKey);
			wrapper.appendChild(document.createTextNode(' '));
			wrappedKey = document.createElement('span');
			wrappedKey.style.color = '#a4a4a4';
			wrappedKey.style.wordBreak = 'break-all';
			wrappedKey.style.fontSize = '12px';
			wrappedKey.textContent = credentials[i].wrappedKey;
			wrapper.appendChild(wrappedKey);
			wrapper.appendChild(document.createElement('br'));

			let host = document.createElement('span');
			host.style.fontSize = '0.7em';
			host.textContent = 'Host:';
			wrapper.appendChild(host);
			wrapper.appendChild(document.createTextNode(' '));
			host = document.createElement('span');
			host.className = 'badge bg-secondary text-light';
			host.textContent = credentials[i].host;
			wrapper.appendChild(host);
			wrapper.appendChild(document.createElement('br'));

			tr.appendChild(wrapper);

			let actions = document.createElement('td');
			actions.style.width = '96px';
			let del = document.createElement('button');
			del.className = 'btn btn-sm btn-danger';
			del.textContent = 'remove';
			del.addEventListener('click', function() {
				window.authenticatorStorage.remove(this.parentNode.parentNode.dataset.keyid);
				reload();
			});
			actions.appendChild(del);
			if (window.authnTools.base64urlToUint8Array(credentials[i].wrappedKey).length > 32) {
				let decrypt = document.createElement('button');
				decrypt.style.marginTop = '5px';
				decrypt.className = 'btn btn-sm btn-secondary';
				decrypt.textContent = 'UnWrap';
				decrypt.addEventListener('click', function() {
					window.tryToDecodeWrappedKey(credentials[i].wrappedKey, credentials[i].masterKeySalt);
				});
				actions.appendChild(decrypt);
			}
			tr.appendChild(actions);
			tbody.appendChild(tr);
		}
		
		// Populate hosts list
		selection.innerHTML = '';
		domains.sort();
		domains.unshift(defaultSelection);
		domains.forEach(x => {
			let option = document.createElement('option');
			option.value = x;
			option.textContent = x;
			option.selected = (x == filter ? true : false);
			selection.appendChild(option);
		});
	}
	reload();
	document.getElementById('localstorage-authenticator-keys-reload').addEventListener('click', () => {reload();});
	selection.addEventListener('change', () => {reload();});
})();


// Decode Keys
(function() {
	let lockDecrypt = false;
	window.tryToDecodeWrappedKey = async function(keyid, salt) {
		if (lockDecrypt) return;
		lockDecrypt = true;

		// Show modal
		$('#decryptWrappedKey').modal('show');
		document.getElementById('decryptWrappedKeyView-raw').getElementsByTagName('pre')[0].textContent = 'Decrypting ...';
		document.getElementById('decryptWrappedKeyView-decoded').getElementsByTagName('pre')[0].textContent = 'Decrypting ...';

		let passes = ['GramThanos @ UNIPI - Virtual Authenticator', window.localStorage.getItem('VirtualAuthn-masterkey')];

		//decodeStorage(keyid).then(x => console.log(x)).catch(x => console.log('error',x))
		try {
			while (true) {
				let pass = (passes.length > 0) ? passes.shift() : null;
				let data = await decodeWrappedKey(keyid, pass, salt);
				document.getElementById('decryptWrappedKeyView-raw').getElementsByTagName('pre')[0].textContent = JSON.stringify(data.raw, null, 4);
				document.getElementById('decryptWrappedKeyView-decoded').getElementsByTagName('pre')[0].textContent = JSON.stringify({
					credential_id : window.authnTools.uint8ArrayToBase64url(data.decoded.credential_id),
					user_handle : window.authnTools.uint8ArrayToBase64url(data.decoded.user_handle),
					private_key : await window.crypto.subtle.exportKey('jwk', data.decoded.private_key),
					public_key : await window.crypto.subtle.exportKey('jwk', data.decoded.public_key),
					createdAt: new Date(data.decoded.createdAt).toUTCString()
				}, null, 4);
				lockDecrypt = false;
				return;
			}
		} catch (e) {
			$('#decryptWrappedKey').modal('hide');
			lockDecrypt = false;
		}
	};
	let decodeWrappedKey = async function(keyid, masterkey = 'GramThanos @ UNIPI - Virtual Authenticator', salt = null, iterations = 100000) {
		if (salt) {
			salt = window.authnTools.base64urlToUint8Array(salt);
		}
		else {
			salt = (() => {
				let salt = new Uint8Array(16);
				for (let i = 16 - 1; i >= 0; i--) salt[i] = i;
				return salt.buffer;
			})();
		}

		keyid = window.authnTools.base64urlToUint8Array(keyid);

		// If no master key
		if (!masterkey) {
			masterkey = prompt('Please enter your password to decript', '');
			if (!masterkey || masterkey.length < 1)
				throw new Error('No password given');
		}
		// Import given master key
		masterkey = await window.crypto.subtle.importKey(
			'raw',
			new TextEncoder().encode(masterkey),
			'PBKDF2',
			false,
			['deriveBits', 'deriveKey']
		);
		// Derive key from master key
		derivedKey = await window.crypto.subtle.deriveKey(
			{
				'name': 'PBKDF2',
				salt: salt,
				'iterations': iterations,
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

		let raw = null;
		// Retrieve iv
		let cipher = new Uint8Array(keyid);
		// Decode AES
		try {
			let message = await window.crypto.subtle.decrypt(
				{
					name: 'AES-GCM',
					iv: cipher.slice(0, 12).buffer
				},
				derivedKey,
				cipher.slice(12, cipher.length).buffer
			);
			// Parse bytes to JSON
			message = Array.from(new Uint8Array(message)).map(function (c) {return String.fromCharCode(c);}).join('');
			raw = JSON.parse(message);
		} catch (e) {
			console.log(e);
			return false;
		}
		// Check if values do not exist
		if (
			!raw.hasOwnProperty('v') ||
			!raw.hasOwnProperty('r') ||
			!raw.hasOwnProperty('u') ||
			!raw.hasOwnProperty('k') ||
			!raw.hasOwnProperty('a') ||
			!raw.hasOwnProperty('c') ||
			raw.v > 1
		) return false;

		// Decoded
		let data = {};

		// Import key
		let key_pair = await window.AuthnDevice.tools.Algorithms.CryptoKeyUnWrap(raw);
		if (!key_pair) return false;
		data.private_key = key_pair.private_key;
		data.public_key = key_pair.public_key;
		// Save the keyid
		data.credential_id = keyid;
		// Save User handle
		data.user_handle = window.authnTools.base64urlToUint8Array(raw.u);
		// Save created time
		data.createdAt = parseInt(raw.c,36);

		// Key retrieved
		return {
			raw : raw,
			decoded : data
		};
	};

})();


// Handle master key
(function() {
	let name = 'VirtualAuthn';
	// Get key
	let value = window.localStorage.getItem(name + '-masterkey');
	if (value && value.length > 0) document.getElementById('localstorage-authenticator-masterkey').value = value;
	// On update
	document.getElementById('localstorage-authenticator-masterkey').addEventListener('change', function() {
		// If empty key, reset to default
		if (!this.value.length) {
			window.localStorage.removeItem(name + '-masterkey');
			window.jsNotify.danger('MasterKey was reset.', {time2live : 5*1000});
		}
		// Update key
		else {
			window.localStorage.setItem(name + '-masterkey', this.value);
			window.jsNotify.success('MasterKey was Updated!', {time2live : 5*1000});
		}
	});
	
	document.getElementById('localstorage-authenticator-always-ask-for-masterkey').addEventListener('change', function() {
		// If not checked, master key will not be asked every time
		if (!this.checked) {
			window.localStorage.removeItem(name + '-always-ask-for-masterkey');
			window.jsNotify.danger('MasterKey will not be asked.', {time2live : 5*1000});
		}
		// Update key
		else {
			window.localStorage.setItem(name + '-always-ask-for-masterkey', 'yes');
			window.jsNotify.success('MasterKey will be asked every time.', {time2live : 5*1000});
		}
	});
	document.getElementById('localstorage-authenticator-always-ask-for-masterkey').checked = window.localStorage.getItem(name + '-always-ask-for-masterkey') == 'yes';

	let visibility = false;
	document.getElementById('localstorage-authenticator-masterkey-visible').addEventListener('click', function() {
		visibility = !visibility;
		if (visibility) {
			document.getElementById('localstorage-authenticator-masterkey-visible').className = 'fas fa-eye';
			document.getElementById('localstorage-authenticator-masterkey').setAttribute('type', 'text');
		}
		else {
			document.getElementById('localstorage-authenticator-masterkey-visible').className = 'fas fa-eye-slash';
			document.getElementById('localstorage-authenticator-masterkey').setAttribute('type', 'password');
		}
	});
})();

// Handle errors
window.addEventListener('error', (e) => {
	window.jsNotify.danger(e.message);
}, false);
