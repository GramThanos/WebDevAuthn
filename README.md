# WebDevAuthn
A tool to test &amp; analyze FIDO2/WebAuthn requests and responses

 - WebDevAuthn Web Tool: https://gramthanos.github.io/WebDevAuthn/
 - Chrome Extension: https://chrome.google.com/webstore/detail/webdevauthn/aofdjdfdpmfeohecddhgdjfnigggddpd

___

### Description

WebDevAuthn is a web tool to test & analyze FIDO2/WebAuthn requests and responses. The web application can work as a playground, letting developers experiment and understannd with the WebAuthn internals, while also allowing the testing and experimentation of FIDO2 authenticator devices.

Furthermore, developers may use this tool's injector (in the form of embedded code or an extension) to hijack WebAuthn calls and analyse them. The tool also features an advance virtual authenticator, able to emulate WebAuthn responces.

Analyser Features:
- Capture WebAuthn requests
- Analyse WebAuthn options (show info, warnings & errors)
- Unpack/Decode WebAuthn authenticator responses
- Virtual Authenticator Device (for custom responses)

Virtual Authenticator Device:
- OS independent
- Supports packed attestation
- Supports wrapped keys to credentials id
- Access to the private key of the generated credentials
- Testing mode to assess implementations
- Multiple supported algorithms

___


### Contact me

Contact me to leave me your feedback or to express your thoughts.

You can [open an issue](https://github.com/GramThanos/WebDevAuthn/issues) or [send me a mail](mailto:gramthanos@gmail.com)

___


### About

This web application was developed as part of my thesis for the postgraduate programme "Digital Systems Security"

University of Piraeus, Department of Digital Systems, Digital Systems Security

Copyright (c) 2022 Grammatopoulos Athanasios-Vasileios

___

[![GramThanos](https://avatars2.githubusercontent.com/u/14858959?s=42&v=4)](https://github.com/GramThanos)
