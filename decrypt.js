// functions needed in both worker.decrypt.js and mail.js
// TODO: DO NOT USE OPENPGP.JS KEYRING!!!!  
//   If someone were to gain XSS access to this application, 
//   they could use window.openpgp.keyring.privateKeys to STEAL PRIVATE KEYS!

function showMessages(text)
{
	result = '' + text;
	if(typeof text == 'object')
		for(var prop in text)
			result += prop + ' = ' + text[prop]
	//if(console)
	//	console.log(text);
	if($.send)
		$.send(result);
}

// 
function decryptMIME(data) {
	//decMessage = openpgp.read_message(data.message);
	/*
	This is all done by OpenPGP.js correctly, but we need it in order to fix the next part,
	Signature verification doesn't work between Thunderbird and OpenPGP.js
	*/
	var matches = new RegExp(/-----BEGIN PGP.*$\r?\n|\r?\n-----END PGP.*$/igm),
		parts = data.message.split(matches),
		type = openpgp_encoding_get_type(data.message.match(matches)[0]),
		result = type != 2
			? parseHeaders(parts[1])
			: parseHeaders(parts[2]),
		base64 = result[0], 
		headers = result[1],
		signed = type == 2 
			? parseHeaders(parts[1]) 
			: [null, null],
		$body = signed[0], 
		sigtype = signed[1],
		input = {
			algorithm: sigtype,
			text: $body,
			openpgp: parseBase64(base64.split(/^=/igm)[0].trim()),
			type: type,
			checksum: base64.split(/^=/igm)[1].trim()
		},
		checksum = verifyCheckSum(input.openpgp, input.checksum),
		decMessage = openpgp.read_messages_dearmored(input);
	if(decMessage == null || typeof decMessage[0] == 'undefined' || !checksum)
	{
		$.send({_status: 'message read failed'});
		return;
	}

	if(typeof decMessage[0].sessionKeys != 'undefined')
	{
		var keypair = determineKeyPair(decMessage[0], data.keys),
			key = keypair[0], 
			session = keypair[1];
		
		if(key == null || session == null)
		{
			$.send({_status: 'could not find decryption key'});
			data.headers['decrypted'] = false; // true if succeeded
			$.send([{body: decMessage[0].text, headers: data.headers}]);
			return;
		}
		
		var decrypted = decMessage[0].decrypt(key, session),
			decHeaders = null;
		
		// decryption has failed
		data.headers['decrypted'] = (decrypted != null); // true if succeeded
		if(decrypted == null)
		{
			$.send([{body: decMessage[0].text, headers: data.headers}]);
		}
		
		else
		{
			decrypted = data.prefix + decrypted + data.postfix;
			parseMIME(decrypted, data.headers, $.send);
		}
	}
	else
	{
      //signedText = signedText.replace(/^- -/, "-");
      //signedText = signedText.replace(/\n- -/g, "\n-");
      //signedText = signedText.replace(/\r- -/g, "\r-");
		// This is where OpenPGP.js fails
		var verified = decMessage[0].verifySignature();
		data.headers['verified'] = verified;
		$.send([{body: decMessage[0].text, headers: data.headers}]);
	}
}

function determineKeyPair(decMessage, keys)
{
	var keymat = null,
		sesskey = null;
	// import keys for further use
	for(var ki in keys)
	{
		openpgp.keyring.importPrivateKey(keys[ki]);
	}
	
	for(var ki in openpgp.keyring.privateKeys)
	{
		var privKey = openpgp.keyring.privateKeys[ki];
		for (var i = 0; i< decMessage.sessionKeys.length; i++) 
		{
			if (privKey.obj.getKeyId() == decMessage.sessionKeys[i].keyId.bytes) {
				keymat = { key: privKey.obj, keymaterial: privKey.obj.privateKeyPacket};
				sesskey = decMessage.sessionKeys[i];
				break;
			}
			for (var j = 0; j < privKey.obj.subKeys.length; j++) {
				if (privKey.obj.subKeys[j].publicKey.getKeyId() == decMessage.sessionKeys[i].keyId.bytes) {
					keymat = { key: privKey.obj, keymaterial: privKey.obj.subKeys[j]};
					sesskey = decMessage.sessionKeys[i];
					break;
				}
			}
		}
	}
	if (keymat != null && !keymat.keymaterial.decryptSecretMPIs('')) 
	{
		throw "Passphrase for secrect key was incorrect!";
	}

	return [keymat, sesskey];
}
