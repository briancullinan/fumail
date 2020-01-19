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
importScripts('/jsonselect.js');
importScripts('/linq/linq.js');
importScripts('/mail.js');
var J = window.JSONSelect;

function doWork(data)
{
    var boundary = '----fumail' + CryptoJS.lib.WordArray.random(16).toString(CryptoJS.enc.Hex),
        envelope,
        $match,
        addresses = [];

    while(($match = matchEmailGlobal.exec(data.recipients)))
    {
        addresses.push($match[0]);
    }
    addresses = Enumerable.From(addresses).Distinct().ToArray();

    if(typeof data.encrypt != 'undefined' && data.encrypt == true)
    {
        $.send({_status: 'Encrypting...'});

        var privateKey,
            recipientKeys = [],
            unknowns = [];

        // find private key for the selected sender
        for(var j in data.privateKeys)
        {
            var key = openpgp.read_privateKey(data.privateKeys[j])[0];
            // can a single key contain multiple user ids?  Maybe we just make a new FuMail key with all their account user Ids in one.
            if(key.userIds[0].text.indexOf(data.from) > -1)
            {
                privateKey = keys[j];
                break;
            }
        }

        // add all the recipients to the encrypted message
        for(var j in addresses)
        {
            var hit = false;
            for(var i in data.publicKeys)
            {
                var privkey = openpgp.read_publicKey(data.publicKeys[i])[0];
                if(privkey.obj.userIds[0].text.indexOf(addresses[j]) > -1)
                {
                    recipientKeys[recipientKeys.length] = privkey.obj;
                    hit = true;
                    break;
                }
            }
            if(!hit)
            {
                unknowns[unknowns.length] = addresses[j];
            }
        }

        if(unknowns.length > 0)
        {
            // TODO: display a message when there are unknown recipients, ask to invite them
            $.send({_error: 'Missing keys', unknowns: unknowns});
            $.send({_status: 'done'});
            return;
        }

        // do the encryption
        var encBoundary = '----fumail' + CryptoJS.lib.WordArray.random(16).toString(CryptoJS.enc.Hex),
            // wrap message in PGP/MIME, do we want to do this or inline?  This may has compatibility issues as not all clients support it
            message = 'Content-Type: multipart/mixed; boundary="' + encBoundary + '"\r\n' +
                '\r\n' +
                '--' + encBoundary + '\r\n' +
                'Content-Type: text/html; charset=ISO-8859-1\r\n' +
                'Content-Transfer-Encoding: quoted-printable\r\n' +
                '\r\n' +
                '<html><body>\r\n' +
                data.message +
                '</body></html>\r\n' +
                '\r\n\r\n' +
                '--' + encBoundary + '--',
            encrypted = openpgp.write_signed_and_encrypted_message(privateKey, recipientKeys, message);

        // create mail message
        envelope = 'From: <' + data.from + '>\r\n' +
            'To: ' + data.recipients + '\r\n' +
            'Subject: ' + data.subject + '\r\n' +
            'MIME-Version: 1.0\r\n' +
            'User-Agent: FuMail version-1.0\r\n' +
            'Content-Type: multipart/encrypted; protocol="application/pgp-encrypted";\r\n' +
            '	boundary="' + boundary + '"\r\n' +
            '\r\n' +
            '--' + boundary + '\r\n' +
            'Content-Type: application/pgp-encrypted\r\n' +
            'Content-Description: PGP/MIME version identification\r\n' +
            '\r\n' +
            'Version: 1\r\n' +
            '\r\n' +
            '--' + boundary + '\r\n' +
            'Content-Type: application/octet-stream; name="encrypted.asc"\r\n' +
            'Content-Description: FuMail.Me encrypted message\r\n' +
            'Content-Disposition: inline; filename="encrypted.asc"\r\n' +
            '\r\n' +
            encrypted + '\r\n' +
            '\r\n' +
            '--' + boundary + '--';
    }
    else
        envelope = 'From: <' + data.from + '>\r\n' +
                   'To: ' + data.recipients + '\r\n' +
                   'Subject: ' + data.subject + '\r\n' +
                   'MIME-Version: 1.0\r\n' +
                   'User-Agent: FuMail version-1.0\r\n' +
                   'Content-Type: multipart/mixed; boundary="' + boundary + '"\r\n' +
                   '\r\n' +
                   '--' + boundary + '\r\n' +
                   'Content-Type: text/html; charset=ISO-8859-1\r\n' +
                   'Content-Transfer-Encoding: quoted-printable\r\n' +
                   '\r\n' +
                   '<html><body>\r\n' +
                   data.message +
                   '</body></html>\r\n' +
                   '\r\n\r\n' +
                   '--' + boundary + '--',

	$.send({_status: 'Sending...'});
	// send message to server for relay
	$.ajax.post({
        url: '/send.php',
        dataType: 'json',
        data: {
            user : data.from,
            to: '<' + addresses.join('>,<') + '>',
            mail: envelope,
            access: data.access,
            type: data.type
        },
        success: function (response) {
            // TODO: handle errors gracefully
            $.send(response);
            $.send({_status: 'done'});
        },
        error: function (response) {
            $.send({_error: response.statusText});
            $.send({_status: 'done'});
        }
    });
}

