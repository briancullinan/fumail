// JavaScript Document
importScripts('/mail.js');
importScripts('/rollups/sha1.js');
importScripts('/rollups/tripledes.js');

function doWork(data)
{
	
	// get the message from the server
	$.ajax.post({
		url: '/mail.php',
		dataType: 'plain',
		data: {
			user: post.user,
			access: post.access,
			download: true,
			id: post.id
		},
		success: function (data) {
			var result = parseHeaders(data.text),
				tmpBody = result[0],
				tmpHeaders = result[1];
			tmpHeaders['part-id'] = post.headers['part-id'];
			// TODO: determine what happens if there is a large decrypted file, does it try to decrypt it and fail because of lack of access to the decryptWorker() function
			parseMIME(tmpBody, tmpHeaders, function (result) {
				$.send(result);
			});
			$.send({_status: 'done'});
			// merge output and headers
			//var blob = new Blob([decOutput], {type: 'text/plain'});
			//var blobURL = window.URL.createObjectURL(blob);
			//$.send(blobURL);
		}
	});
}
