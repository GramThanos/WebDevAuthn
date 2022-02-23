// Show browser info
(function() {
	// Parse User Agent string
	var info = new window.UAParser();
	info = info.getResult();

	// Display information
	document.getElementById('ua-browser-name').textContent = info.browser.name;
	document.getElementById('ua-browser-version').textContent = info.browser.version;
	document.getElementById('ua-os-name').textContent = info.os.name;
	document.getElementById('ua-os-version').textContent = info.os.version;
})();

// Handle errors
window.addEventListener('error', (e) => {
	window.jsNotify.danger(e.message);
}, false);
