
importScripts('/jquery.hive.pollen.js');

$(function (data) {
	$.send({_status: 'starting'});
	try
	{
		if(data.type == 'decrypt' ||
			data.type == 'download' || 
			data.type == 'google' ||
			data.type == 'send' || 
			data.type == 'generate' ||
			data.type == 'mail')
		{
			importScripts('/worker.' + data.type + '.js');
			$.send({_status: 'Done importing'});
			doWork(data.request);
		}
	}
	catch (e)
	{
		$.send({_status: '' + e + e.stack});
		$.send({_status: 'done'});
	}
	
});
