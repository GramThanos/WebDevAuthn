(function () {
	'use strict';
	let analyser = {
		domain : 'https://gramthanos.github.io/WebDevAuthn',
		createPath : '/credential-creation.html',
		getPath : '/credential-get.html'
	}

	// If this is analyser page
	if (window.location.host === analyser.domain) return;

	let Browser = chrome || browser;
	let ready = false;
	let loaded = false;
	let options = false;

	let getBoolean = function(item) {
		return options[item] ? true : false;
	}

	let fireLoad = function() {
		if(loaded) return;
		ready = true;
		if(!options) return;
		loaded = true;
		// If turned off disable
		if (!getBoolean('option@development')) return;
		
		// Prepare script
		let script = document.createElement('script');
		script.setAttribute('type', 'text/javascript');
		script.setAttribute('src', Browser.runtime.getURL('webauthn-dev.js'));
		// Parameters
		script.setAttribute('dev-domain',						analyser.domain);
		script.setAttribute('development',						getBoolean('option@development'));
		script.setAttribute('virtual',							getBoolean('option@virtual'));
		script.setAttribute('pause-with-alert', 				getBoolean('option@pause-with-alert'));
		script.setAttribute('instance-of-pub-key',				getBoolean('option@instance-of-pub-key'));
		script.setAttribute('debugger',							getBoolean('option@debugger'));
		script.setAttribute('platform-authenticator-available',	getBoolean('option@platform-authenticator-available'));
		// Insert on page
		document.head.appendChild(script);
	};

	// Load storage options
	Browser.storage.local.get([
		'option@virtual',
		'option@development',
		'option@pause-with-alert',
		'option@instance-of-pub-key',
		'option@debugger',
		'option@platform-authenticator-available'
	], function(items){
		options = items;
		if(!ready) fireLoad();
	});

	// Script injector loader
	if (document.readyState == 'interactive' || document.readyState == 'complete') {
		fireLoad();
	} else {
		window.addEventListener('DOMContentLoaded', fireLoad, true);
		window.addEventListener('load', fireLoad, true);

		let o = new MutationObserver(() => {
			if (document.head) {
				o.disconnect();
				fireLoad();
			}
		});
		o.observe(document, {childList: true});
	}

}());
