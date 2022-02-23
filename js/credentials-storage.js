// Save, Retrieve and Manage credentials on LocalStorage

window.credStorage = {
	load : function() {
		// Load from LocalStorage
		let credentials = window.localStorage.getItem('credentials');
		if (!credentials) credentials = '[]';
		credentials = JSON.parse(credentials);
		// Check
		this.credentials = [];
		for (let i = 0; i < credentials.length; i++) {
			if (credentials[i]) {
				this.credentials.push({
					id : credentials[i].id,
					created : credentials[i].created,
					user_handle : credentials[i].user_handle,
					origin : credentials[i].origin,
					type : credentials[i].type
				});
			}
		}
	},

	save : function() {
		window.localStorage.setItem('credentials', JSON.stringify(this.credentials));
	},

	getAll : function(origin = null, attribute) {
		this.load();
		let credentials = [];
		// Filter credentials
		if (!origin) {
			credentials = this.credentials;
		}
		else {
			for (let i = 0; i < this.credentials.length; i++) {
				if (this.credentials[i].origin == origin) {
					credentials.push(this.credentials[i]);
				}
			}
		}
		// Sort by created date
		credentials = credentials.sort((a, b) => {
			if ( a.created < b.created ) return -1;
			if ( a.created > b.created ) return 1;
			return 0;
		})
		// Return credentials
		if (attribute) {
			return credentials.map((key) => {return key[attribute]});
		}
		return credentials;
	},

	getById : function(id, attribute) {
		this.load();
		let key = null;
		for (let i = this.credentials.length - 1; i >= 0; i--) {
			if (this.credentials[i].id == id) {
				key = this.credentials[i];
				break;
			}
		}
		if (!key) return null;
		if (!attribute) {
			return key[attribute];
		}
		return key;
	},

	add : function(keyid, user_handle, origin, type, created = new Date().getTime()) {
		this.load();
		this.credentials.push({
			id : keyid,
			created : created,
			user_handle : user_handle,
			origin : origin,
			type : type
		});
		this.save();
	},

	remove : function(keyid) {
		this.load();
		let found = false;
		for (let i = this.credentials.length - 1; i >= 0; i--) {
			if (this.credentials[i].id == keyid) {
				this.credentials.splice(i, 1);
				found = true;
				break;
			}
		}
		if (found)
			this.save();
	}
};

window.authenticatorStorage = {
	load : function() {
		// Load from LocalStorage
		let credentials = window.localStorage.getItem('VirtualAuthn-storage');
		if (!credentials) credentials = '[]';
		credentials = JSON.parse(credentials);
		// Check
		this.credentials = [];
		for (let i = 0; i < credentials.length; i++) {
			if (credentials[i]) {
				this.credentials.push({
					host : credentials[i].host,
					keyid : credentials[i].keyid,
					masterKeySalt : credentials[i].masterKeySalt,
					wrappedKey : credentials[i].wrappedKey
				});
			}
		}
	},

	save : function() {
		window.localStorage.setItem('VirtualAuthn-storage', JSON.stringify(this.credentials));
	},

	getAll : function(host = null, attribute) {
		this.load();
		let credentials = [];
		// Filter credentials
		if (!host) {
			credentials = this.credentials;
		}
		else {
			for (let i = 0; i < this.credentials.length; i++) {
				if (this.credentials[i].host == host) {
					credentials.push(this.credentials[i]);
				}
			}
		}
		// Sort by host
		credentials = credentials.sort((a, b) => {
			if ( a.host < b.host ) return -1;
			if ( a.host > b.host ) return 1;
			return 0;
		})
		// Return credentials
		if (attribute) {
			return credentials.map((key) => {return key[attribute]});
		}
		return credentials;
	},

	getById : function(keyid, attribute) {
		this.load();
		let key = null;
		for (let i = this.credentials.length - 1; i >= 0; i--) {
			if (this.credentials[i].keyid == keyid) {
				key = this.credentials[i];
				break;
			}
		}
		if (!key) return null;
		if (!attribute) {
			return key[attribute];
		}
		return key;
	},

	remove : function(keyid) {
		this.load();
		let found = false;
		for (let i = this.credentials.length - 1; i >= 0; i--) {
			if (this.credentials[i].keyid == keyid) {
				this.credentials.splice(i, 1);
				found = true;
				break;
			}
		}
		if (found)
			this.save();
	}
};

