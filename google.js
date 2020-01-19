// JavaScript Document

// TODO: could someone create a function on the page that gets called with the params
var clientId = '61143827920-ok9rpqcq25phtggfrhaogkmlm8sed83d.apps.googleusercontent.com',
    scopes = 'https://mail.google.com/ https://www.google.com/m8/feeds https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/calendar',
    googleContacts = null,
    immediateFailed = false;

// Is there an easier way to do this?
//   jsonp doesn't work because we can't read the hash from the response script
function doGoogleLogin(immediate, state)
{
	if(typeof immediate == 'undefined')
		immediate = false;
	if(typeof state == 'undefined')
		state = 'initialGoogle';
	else
	{
		// set up callback to call getGoogleUser first then call callback
		var callback = state;
		state = 'fumail_' + CryptoJS.lib.WordArray.random(16);
		window[state] = function (params) {
			try {
				// pass in callback to do this after we get user information
                if(typeof params['error'] != 'undefined' &&
                    params['error'] == 'immediateFailed')
                    immediateFailed = true;
                else
                    getGoogleUser(params, callback);
			}
			catch (e)
			{
				if(console)
					console.log(e);
			}
			window[state] = null;
		};
	}

	// request new google token
	// try a get first
	var token_request = 'https://accounts.google.com/o/oauth2/auth' + 
		'?redirect_uri=https://fumail.me' + (immediate ? '/google.php' : '') + 
		'&approval_prompt=auto' +
		'&client_id=' + clientId +
		(immediate ? '&immediate=true' : '') + 
		'&response_type=token' +
		'&state=' + state +
		'&scope=' + scopes +
                        (immediate ? ('&login_hint=' + immediate) : '');
	if(immediate)
	{
		var googleFrame = $('#google-load');
		if(googleFrame.length == 0)
			$('<iframe width="0" height="0" id="#google-load" src="' + token_request + '"></iframe>').appendTo('#login');
		else
			googleFrame.attr('src', token_request);
	}
	else
		window.location = token_request;
};

function getContactsSuccess(data)
{
    var response = data.response || [];
    if(typeof data._next != 'undefined')
    {
        queueWork({
            type: 'google',
            request: data._next,
            result: getContactsSuccess
        })
        return;
    }
	for(var i in response)
	{
		var contacts = $('#contacts'),
			contact = contacts.find('a[href="' + response[i].id + '"]');
		if(contact.length > 0) // TODO: update information here
			continue;
		contact = $('<li><a href="' + response[i].id + '">' + response[i].title + '</a></li>');
        for(var j in response[i].data.contactAddresses)
        {
            var address = response[i].data.contactAddresses[j];
            contact.append('<a href="' + address.href + '">' + address.text + '</a>');
        }
		// sort just the new element
		var hit = false;
		contacts.find('li').each(function () {
			if($(this).text().toLowerCase().localeCompare(contact.text().toLowerCase()) > 0)
			{
				contact.insertBefore($(this));
                contact.find('a').data('data', response[i].data);
				hit = true;
				return false; // jquery break;
			}
		});
		if(!hit)
			contacts.append(contact);
	}
}

function getGoogleUser(params, callback)
{
	// try to request username
	$.get('https://www.googleapis.com/oauth2/v1/userinfo', {
		'alt' : 'json',
		'access_token' : params['access_token']
	}, function (data) {
        if(console)
            console.log(data);
        var account = {
            type: 'google',
            user: data.email,
            access: params['access_token'],
            expires: new Date().getTime() + (parseInt(params['expires_in']) * 1000)
        };

        // do this after user info is loaded
        if(typeof callback == 'string' &&
            typeof window[callback] != 'undefined')
            window[callback].call(this, account);
        else
            callback.call(this, account);
	});
}
