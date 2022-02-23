// Check WebAuthn support and display message
(function(){
	// Get Elements
	var wrapper = document.getElementById("webauthn-support");
	if (!wrapper) throw "Error: #webauthn-support element was not found";
	var message = wrapper.getElementsByClassName("alert")[0];
	// Check support
	var supported = !(typeof window.navigator.credentials == 'undefined');
	// Show message
	message.innerHTML = supported ?
		'<i class="far fa-laugh-beam"></i> WebAuthn is supported by your browser.' :
		'<i class="far fa-frown-open"></i> WebAuthn is not supported by your browser.';
	message.className = 'alert alert-' + (supported ? 'success' : 'danger');
	if (!supported && wrapper.style.display == 'none') {
		wrapper.style.display = 'block';
	}
})();
