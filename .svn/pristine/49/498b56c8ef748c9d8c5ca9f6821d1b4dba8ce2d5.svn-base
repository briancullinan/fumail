// a web worker for decrypting and encrypting in the
//   background so as not to interupt the user interface
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
importScripts('/mail.js');
importScripts('/decrypt.js');

// fullfill request from hive
function doWork(data)
{
	$.send({_status: 'Decrypt mime'});
	decryptMIME(data);
}

