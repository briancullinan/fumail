// a web worker for generating public and private key pairs

function showMessages(text)
{
	result = '' + text;
	if(typeof text == 'object')
		for(var prop in text)
			result += prop + ' = ' + text[prop]
	$.send({_status: result});
}

// redo all this because openpgpjs made it suck, and depend on window.crypto
//   TODO: what a half ass implementation, window.crypto should have a fallback
function generateKey(keyType, numBits, passphrase, s2kHash, symmetricEncryptionAlgorithm)
{
	if(typeof BigInteger.prototype.toMPI == 'undefined')
		BigInteger.prototype.toMPI = bnToMPI;

	var privKeyPacket;
	var publicKeyPacket;
	var d = new Date();
	d = d.getTime()/1000;
	var timePacket = String.fromCharCode(Math.floor(d/0x1000000%0x100)) + String.fromCharCode(Math.floor(d/0x10000%0x100)) + String.fromCharCode(Math.floor(d/0x100%0x100)) + String.fromCharCode(Math.floor(d%0x100));
	switch(keyType){
	case 1:
	    var key = new (new RSA()).keyObject();
		RSAGenerate.call(key, numBits, "10001");
	    privKeyPacket = new openpgp_packet_keymaterial().write_private_key(keyType, key, passphrase, s2kHash, symmetricEncryptionAlgorithm, timePacket);
	    publicKeyPacket =  new openpgp_packet_keymaterial().write_public_key(keyType, key, timePacket);
	    break;
	default:
		util.print_error("Unknown keytype "+keyType)
	}
	return {privateKey: privKeyPacket, publicKey: publicKeyPacket};
}


// we have to redo all this because openpgpjs removed some damn fallback to window.crypto
/**
 * generates a new key pair for openpgp. Beta stage. Currently only 
 * supports RSA keys, and no subkeys.
 * @param {Integer} keyType to indicate what type of key to make. 
 * RSA is 1. Follows algorithms outlined in OpenPGP.
 * @param {Integer} numBits number of bits for the key creation. (should 
 * be 1024+, generally)
 * @param {String} userId assumes already in form of "User Name 
 * <username@email.com>"
 * @param {String} passphrase The passphrase used to encrypt the resulting private key
 * @return {Object} {privateKey: [openpgp_msg_privatekey], 
 * privateKeyArmored: [string], publicKeyArmored: [string]}
 */
function generate_key_pair(keyType, numBits, userId, passphrase){
	$.send({_status: 'creating user id'});
	var userIdPacket = new openpgp_packet_userid();
	var userIdString = userIdPacket.write_packet(userId);
	
	$.send({_status: 'generating new key'});
	var keyPair = generateKey(keyType,numBits, passphrase, openpgp.config.config.prefer_hash_algorithm, 3);
	var privKeyString = keyPair.privateKey;
	var privKeyPacket = new openpgp_packet_keymaterial().read_priv_key(privKeyString.string,3,privKeyString.string.length);
	if(!privKeyPacket.decryptSecretMPIs(passphrase))
		util.print_error('Issue creating key. Unable to read resulting private key');
	var privKey = new openpgp_msg_privatekey();
	privKey.privateKeyPacket = privKeyPacket;
	privKey.getPreferredSignatureHashAlgorithm = function(){return openpgp.config.config.prefer_hash_algorithm};//need to override this to solve catch 22 to generate signature. 8 is value for SHA256
	
	var publicKeyString = privKey.privateKeyPacket.publicKey.data;
	var hashData = String.fromCharCode(0x99)+ String.fromCharCode(((publicKeyString.length) >> 8) & 0xFF) 
		+ String.fromCharCode((publicKeyString.length) & 0xFF) +publicKeyString+String.fromCharCode(0xB4) +
		String.fromCharCode((userId.length) >> 24) +String.fromCharCode(((userId.length) >> 16) & 0xFF) 
		+ String.fromCharCode(((userId.length) >> 8) & 0xFF) + String.fromCharCode((userId.length) & 0xFF) + userId
	var signature = new openpgp_packet_signature();
	signature = signature.write_message_signature(16,hashData, privKey);
	var publicArmored = openpgp_encoding_armor(4, keyPair.publicKey.string + userIdString + signature.openpgp );

	var privArmored = openpgp_encoding_armor(5,privKeyString.string+userIdString+signature.openpgp);
	
	return {privateKey : privKey, privateKeyArmored: privArmored, publicKeyArmored: publicArmored}
}

// openPGP uses this for some reason, there's NO DOM!
$.text = function (data) {
	return {html: function ()
		{
			return data;
		}
	}
};

// fix for openpgp errors
window = {
	// Can't use local storage in Web Worker, we have to import them
	localStorage: {
		getItem: function (name) { 
			return typeof localStorage[name] == 'undefined' 
				? null 
				: localStorage[name]; },
		setItem: function (name, value) { localStorage[name] = value; }
	}
};

var localStorage = {};

importScripts('/rollups/sha1.js');
importScripts('/rollups/tripledes.js');
importScripts('/openpgp.js');
openpgp.init();
importScripts('/wu/jsbn.js');
importScripts('/wu/jsbn2.js');
importScripts('/wu/prng4.js');
importScripts('/wu/rng.js');
importScripts('/wu/rsa.js');
importScripts('/wu/rsa2.js');

function doWork(data)
{
	// fullfill request from hive
	$.send({_status: 'Generating key'});
	// generate RSA, 1024, Name <email>, passphrase
	// TODO: openpgpjs has a bug with using a password, 
	//   it is probably a misunderstanding with how the salt is used
	var result = generate_key_pair(1, data.size, data.name, null);
	$.send({privateKeyArmored: result.privateKeyArmored, publicKeyArmored: result.publicKeyArmored});
	$.send({_status: 'done'});
}

