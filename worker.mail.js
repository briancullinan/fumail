window = {};
importScripts('/jsonselect.js');
importScripts('/mail.js');

function doWork(data)
{
	$.ajax.post({
		url: '/mail.php', 
		dataType: 'json',
		data: {
			user: data.user,
			path: data.path,
			id: data.id,
			access: data.access,
            type: data.type
		},
		success:function (response) {
			$.send(response);
			$.send({_status: 'done'});
		},
		error:function (response) {
            $.send({_error: response.statusText});
			$.send({_status: 'done'});
		}
	});
}

