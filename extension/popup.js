/*
 * WebDevAuthn
 * Script: WebAuthn Development
 * 
 * GramThanos
 */

let options = [
	'option@virtual',
	'option@development',
	'option@pause-with-alert',
	'option@instance-of-pub-key',
	'option@debugger',
	'option@platform-authenticator-available'
];

// Load items form addon storage
chrome.storage.local.get(options, function(items){
	// For each option
	options.forEach(option => {
		// Load defaul value
		document.getElementById(option).checked = items[option] ? true : false;
	});

	// Remove no animations class
	setTimeout(() => {
		document.getElementsByClassName('sliders-no-animations')[0].classList.remove('sliders-no-animations');
	}, 400);
});

// For each option
options.forEach(option => {
	// Add toggle listener
	document.getElementById(option).addEventListener('change', function() {
		// On toggle save option on/off
		let obj = {};
		obj[option] = this.checked;
		chrome.storage.local.set(obj, () => {});
	}, false);
});
