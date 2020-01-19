// JavaScript Document

var dialog = null,
    show_count = 100, // TODO: setting within browser for paging
    dialogPath = null;
if(console)
    jQuery.error = console.error;

// Use a closure so injection scripts cant get to these important variables, does this actually work?
// TODO: functions that take a callback and handle account information could expose closure to injection attacks
(function () {
	var accounts = null,
		master = null,
		privateKeys = null,
        publicKeys = [],
		workQueue = [],
		loadingStatus = {},
		queueInterval = null,
		composeInterval = null,
        hive = [],
        active = [];

    function workerSuccess(data, request)
    {
        try {
            // check for errors
            if(typeof data._status != 'undefined' &&
                data._status == 'starting')
            {
                if(typeof request.loading == 'string')
                {
                    if(typeof loadingStatus[request.loading] == 'undefined')
                        loadingStatus[request.loading] = 1;
                    else
                        loadingStatus[request.loading] += 1;
                    loadingAnimation($(request.loading));
                }
                else if (typeof request.loading  == 'object')
                {
                    for(var j in request.loading)
                    {
                        if(typeof loadingStatus[request.loading[j]] == 'undefined')
                            loadingStatus[request.loading[j]] = 1;
                        else
                            loadingStatus[request.loading[j]] += 1;
                        loadingAnimation($(request.loading[j]));
                    }
                }
            }
            else if(typeof data._status != 'undefined' &&
                data._status == 'done')
            {
                if(console)
                    console.log('{' + data.WORKER_ID + '}' + data._status);
                if(typeof request.loading == 'string')
                {
                    loadingStatus[request.loading] -= 1;
                    if(loadingStatus[request.loading] == 0)
                    {
                        $(request.loading + ' .loading').stop().remove();
                    }
                }
                else if (typeof request.loading == 'object')
                {
                    for(var i in request.loading)
                    {
                        loadingStatus[request.loading[i]] -= 1;
                        if(loadingStatus[request.loading[i]] == 0)
                        {
                            $(request.loading[i] + ' .loading').stop().remove();
                        }
                    }
                }
                var worker = this;
                setTimeout(function (worker) {
                    hive.push(worker);
                }, 100, worker);
            }
            else if(typeof data._status != 'undefined')
            {
                if(console)
                    console.log('{' + data.WORKER_ID + '}' + data._status);
            }
            else
            {
                request.result.call(window, data);
            }
        }
        catch (e)
        {
            if(console)
            {
                console.log(request);
                console.log(data);
                console.log(e);
            }
        }
    }

	function processQueue()
	{
        try
        {
            var requests = workQueue;
    // TODO: some sort of prioritization here, if needed
            workQueue = [];
            if(requests.length == 0)
                return;

            var worker;
            while(requests.length > 0 && (worker = hive.pop()))
            {
                active.push(worker);
                worker.request = requests.pop();
                $(worker).send({type: worker.request.type, request: worker.request.request});
            }
            if(requests.length == 0)
                return;

            $.Hive.create({
                worker: '/worker.js',
                count: requests.length,
                receive: function (data) {
                    workerSuccess.call(this, data, this.request);
                },
                created: function ($hive) {
                    var worker;
                    while (worker = $hive.pop())
                    {
                        active.push(worker);
                        worker.request = requests.pop();
                        $(worker).send({type: worker.request.type, request: worker.request.request});
                    }
                }
            });
        }
        catch (e)
        {
            if(console)
                console.log(e);
        }
	}
	
	function queueWork(item)
	{
		workQueue.push(item);
	}
	window['queueWork'] = queueWork;
	
	function encryptAccounts()
	{
		if(master != null)
		{
			var serialized = JSON.stringify(accounts),
			    result = CryptoJS.TripleDES.encrypt(serialized, master);
			localStorage['accounts'] = result.toString();
		}
		else
			localStorage['accounts'] = JSON.stringify(accounts);
		
		if(master != null)
		{
			// encrypt private keys
			serialized = JSON.stringify(privateKeys);
			result = CryptoJS.TripleDES.encrypt(serialized, master);
			encrypted = result.toString();
			localStorage['keys'] = encrypted;
		}
		else
			localStorage['keys'] = JSON.stringify(privateKeys);
	}
	
	function decryptAccounts()
	{
		var encrypted = localStorage['accounts'];
		if(typeof encrypted != 'undefined')
		{
			try {
				accounts = JSON.parse(encrypted);
			}
			catch (e) {
				try
				{
					var result = CryptoJS.TripleDES.decrypt(encrypted, master);
					var decrypted = result.toString(CryptoJS.enc.Latin1);
					accounts = JSON.parse(decrypted);
				}
				catch(e2)
				{
					// TODO:  failed to decrypt, do something here
					accounts = [];
				}
			}
		}
		else
			accounts = [];
		
		// decrypt keys too
		encrypted = localStorage['keys'];
		if(typeof encrypted != 'undefined')
		{
			try {
				privateKeys = JSON.parse(encrypted);
			}
			catch (e) {
				try
				{
					result = CryptoJS.TripleDES.decrypt(encrypted, master);
					decrypted = result.toString(CryptoJS.enc.Latin1);
					privateKeys = JSON.parse(decrypted);
				}
				catch(e2)
				{
					// TODO:  failed to decrypt, do something here
					privateKeys = [];
				}
			}
		}
		else
			privateKeys = [];
	}
	
	function getAccessCode(user, callback)
	{
		for(var i in accounts)
		{
			if(accounts[i].user == user)
			{
				if (accounts[i].type == 'google' &&
					typeof accounts[i].expires != 'undefined' &&
					// check if a renewal is necessary
                    accounts[i].expires < new Date().getTime())
				{
					doGoogleLogin(accounts[i].user /* immediately */, function (account) {
						accounts[i].user = account.user;
						accounts[i].access = account.access;
						accounts[i].expires = account.expires
                        accounts[i].type = 'google'
						encryptAccounts();
						callback.call(this, account.access, user, account.type);
					});
					return; // the callback will call this again instead
				}
				
				callback.call(this, accounts[i].pass || accounts[i].access, user, accounts[i].type);
				break;
			}
		}
	}
	
	function decryptWorker(request, resulted)
	{
		// TODO: nothing can scrape a web Worker right?
		request['keys'] = privateKeys;
		queueWork({type: 'decrypt', request: request, result: resulted});
	}
	window['decryptWorker'] = decryptWorker;
	
	function checkHash()
	{
		if(window.location.hash == dialog)
			return;
			
		dialog = window.location.hash;
		var user = decodeURIComponent((dialog.split('#')[1] || '').split('$')[0]),
			path = decodeURIComponent((dialog.split('#')[1] || '').split('$')[1] || ''),
			id = dialog.split('#')[2],
			folder,
			message = null,
			fString = '#' + encodeURIComponent(user) +
				(path != '' && path != '__--compose' &&
                    path != '__--contact' ? ('$' + encodeURIComponent(path)) : '');

        if(dialog == '#clear-all-accounts')
        {
            accounts = [];
            encryptAccounts();
            $('#folders > *, #contact > *').remove();
        }

		// try to match has to known dialog
		if(dialog == '' || dialog == '#intro' || dialog == '#how' ||
			dialog == '#login' || dialog == '#keys')
		{
            $('.dialog, .message, #paging').hide();
            if(dialog != '')
    			$(dialog).show();
            else
            {
                if(accounts.length > 0)
                    dialog = '#' + encodeURIComponent(accounts[0].user);
                else
                    dialog = '#intro';
                if(window.location.replace)
                    window.location.replace(dialog);
                else
                    window.location.hash = dialog;
            }
			$('body').removeClass('menu');
            $('#results').remove();
            $('#search input').val('');
            if(dialog != '')
    			return;
		}
		
		// load mailboxes seperately
		for(var i in accounts)
		{
            var root = $('#folders a[href="#' + encodeURIComponent(accounts[i].user) + '"]').parent(),
                isNew = root.length == 0;
            (function (isNew, root, selected, path)
            {
                // make current folder request
                if(isNew || selected)
                {
                    getAccessCode(accounts[i].user, function (access, user, type) {
                        queueWork({
                            type: 'mail',
                            request: {
                                user: user,
                                path: selected && path != '__--compose' &&
                                    path != '__--contact' ? path : '',
                                access:access,
                                type: type
                            },
                            result: function (result) {
                                var fString = root.find('a').attr('href') + (selected && path != '' && path != '__--compose' && path != '__--contact' ? ('$' + encodeURIComponent(path)) : '')
                                mailSuccess(result, root, fString);
                            },
                            loading: ['#menubar', '#folders a[href="' + (selected ? fString : ('#' + encodeURIComponent(user))) + '"]']
                        });
                        if(type == 'google' && isNew)
                            queueWork({
                                type: 'google',
                                request: {user: user, access: access},
                                result: getContactsSuccess});
                    });
                }
                // if the user is equal to what we typed in in the address bar, then also load the path
            })(isNew, loadAccount(accounts[i].user), user == accounts[i].user && dialogPath != fString, path);
		}
        dialogPath = fString;

        $('.dialog').hide();
        $('#paging').show();
        $('#results').remove();
        $('#search input').val('');
		// do the visual part of the folder loading
		if((folder = $('#folders a[href="' + fString + '"]')).length > 0)
		{
			if(folder.parent().find('> ul > li').length == 0 &&
				typeof id == 'undefined')
            {
				$('body').removeClass('menu');
                $('#results').remove();
                $('#search input').val('');
            }

			// only do this if it is not selected, maybe just the message id changed, handled below
			if(!folder.is('.selected'))
			{
				var last = $('#folders .selected').removeClass('selected');
				if(!folder.parents('ul').is(last.find('~ ul')))
					last.find('~ ul').removeClass('expand');
				folder.addClass('selected');
				folder.scrollintoview();
			}
			
			// select the headers in the list
			if(typeof id != 'undefined' && 
				(message = $('a[href="' + fString + '#' + id + '"]')).length > 0)
			{
				// is the link referring to an exact message
				message.removeClass('unseen').addClass('selected');
				message.scrollintoview();
			}
		}
		
		// we may be loading a message
		// let the server notify us if no message exists
		//   validation of hash is done server side
		if(typeof id != 'undefined')
		{
            var mString = '#' + encodeURIComponent(user) +
                (path != null && path != '' ? ('$' + encodeURIComponent(path)) : '') +
                '#' + encodeURIComponent(id);
			$('.message').show();
            $('#mail').hide();
			$('body').removeClass('menu');

			// check if the message is already open, just switch to it
			if((message = $('.message a[href="' + mString + '"]')).length > 0)
			{
				var msg = message.parents('.message');
				msg.detach().appendTo($('#content'));
				if(msg.is('.compose') || msg.is('.contact'))
					$('#paging').hide();
			}
			
			// load compose mail from localStorage
			else if (path == '__--compose')
			{
				$('#paging').hide();
                (function (compose)
                {
                    getAccessCode(user, function (access, user, type) {
                        queueWork({
                            type: 'mail',
                            request: {user: user, path: path, access: access, id: id, type: type},
                            result: function (result)
                            {
                                composeSuccess(result, compose);
                            }
                        });
                    });
                })(loadComposition(user, id));
			}

            // view a contact
            else if (path == '__--contact')
            {
                $('#paging').hide();
                var contact;
                if((contact = $('#contacts a[href="' + mString + '"]')).length > 0)
                    loadContact(user, id, contact.data('contact'), mString);
                else
                    (function (contact)
                    {
                        getAccessCode(user, function (access, user) {
                            queueWork({
                                type: 'google',
                                request: {user: user, access: access, id: id},
                                result: function (result) {
                                    contact.find('> .body pre').text(JSON.stringify(result.response[0].data, undefined, 4));
                                    contact.find('> .title b').text(result.response[0].title);
                                }
                            });
                        });
                    })(loadContact(user, id, [], mString));
            }

			// load the message from the associated account
			else
                (function(mString)
                {
                    getAccessCode(user, function (access, user, type) {
                        queueWork({
                            type: 'mail',
                            request: {user:user, path: path, id: id, access:access, type: type},
                            result: function (result) {
                                messageSuccess(result, mString);
                            },
                            loading: '#menubar'
                        });
                    });
                })(mString);
		}
		else
        {
			$('.message').hide();
            $('#mail').show();
            $('#paging').show();
        }
	}
	
	function populateAccounts(j)
	{
		for(var i in accounts)
			j.append('<option value="' + encodeURIComponent(accounts[i].user) + '">' + escapeHtml(accounts[i].user) + '</option>');
	}
	window['populateAccounts'] = populateAccounts;
	
	function sendMessage(recipients, from, message, subject, which, encrypt, sign)
	{
        var compose = $(this),
            response = compose.find('> .response'),
            recipient = compose.find('.recipients');

        if(matchEmailGlobal.exec(recipients) == null)
        {
            var recipientBubble = {title: 'No recipients found, please enter an e-mail address to send to.'};
            showBubble.call(recipient, recipientBubble);
            recipient.bind('keypress keyup keydown drop cut copy paste DOMCharacterDataModified DOMSubtreeModified', function () {
                recipientBubble.bubble.remove();
            });
            recipient.focus();
            return;
        }
        compose.addClass('sending');

        // TODO: fix plain text by iterating dom
		var request = {
			publicKeys: publicKeys,
			privateKey: privateKeys,
			message: message,
			subject: subject,
			from: from,
			recipients: recipients,
            encrypt: encrypt,
            sign: sign
		};

		getAccessCode(from, function (access, user) {
            request.access = access;
            queueWork({
                type: 'send',
                request: request,
                result: function (result) {
                    if(typeof result._error != 'undefined')
                    {
                        if(result._error == 'Missing keys')
                        {
                            response.html('<p>Could not find public keys for some recipients, would you like to:<br />' +
                                          '<a href="#send-unencrypted" class="little-btn">Send unencrypted</a>' +
                                          ' or <a href="#start-exchange" class="little-btn">Ask for their key</a></p>');
                            response.find('a[href="#send-unencrypted"]').click(function (evt) {
                                evt.preventDefault();
                                recipient.val(result.unknowns);
                                compose.removeClass('sending');
                                compose.find('a[href="#encrypt"]').removeClass('checked');
                            });
                            response.find('a[href="#start-exchange"]').click(function (evt) {
                                evt.preventDefault();
                                response.html('<p>Enter a question only you and your friend know the answer to (optional):<br />' +
                                              '<input name="question" type="text" /><br />' +
                                              'Enter a pass-phrase, key words will be highlighted:<br />' +
                                              '<input name="passphrase" type="text" /></p>');
                            });
                        }
//                        if(result._error == )
                    }
                    else if (typeof result.failed != 'undefined')
                    {

                    }
                },
                loading: '.compose a[href="' + which + '"]'
            });
        });
	}
	window['sendMessage'] = sendMessage;
	
	function addAccount(account)
	{
		var hit = false;
		for(var i in accounts)
		{
			if(accounts[i].user == account.user)
			{
				accounts[i].pass = account.pass;
                accounts[i].access = account.access;
                accounts[i].expires = account.expires;
                accounts[i].type = account.type;
				hit = true;
			}
		}
		if(!hit)
			accounts[accounts.length] = account;
		// store the accounts
		encryptAccounts();
	}

    function setBindings(scope)
	{
		if(scope == null)
			scope = $('body')
		
		scope.find('a[href="#folders"]').click(function (evt) {
			evt.preventDefault();
			$('#folders .selected').scrollintoview();
		});
		
		scope.find('a[href="#login-google"]').click(function (evt) {
			evt.preventDefault();
			doGoogleLogin();
		});
		
		scope.find('a[href="#keys"]').click(function () {
			// TODO: remove this, only offer a download uri, can that be called by a javascript and exploited?
			for(var i in accounts)
			{
				var fString = accounts[i].user;
				
				// only add account keys once
				if($('#keys .keys a[href="#' + fString + '"]').length > 0)
					continue;
				
				var email = $('<li><a href="#' + fString + '">' + fString + '</a></li>');
				email = email.appendTo($('#keys .keys ul'))
							 .find('a');
				email.click(function (evt) {
					evt.preventDefault();
					var fString = $(this).attr('href').substring(1);
					// do visual selection stuff
					$('#keys .selected').removeClass('selected');
					$(this).addClass('selected');
					
					// clear currently displayed key
					$('#key').val('');
					
					// find key in keyring that matches the email address
					// TODO: connect this to some backup or management server
					var keys = privateKeys,
						result = '';
					for(var i in keys)
					{
						var key = openpgp.read_privateKey(keys[i])[0];
						// can a single key contain multiple user ids?  Maybe we just make a new FuMail key with all their account user Ids in one.
						if(key.userIds[0].text.indexOf(fString) > -1)
						{
							result += (result != '' ? '\r\n' : '') + keys[i];
							break;
						}
					}
					
					keys = openpgp.keyring.publicKeys;
					for(var j in keys)
					{
						// can a single key contain multiple user ids?  Maybe we just make a new FuMail key with all their account user Ids in one.
						if(keys[j].obj.userIds[0].text.indexOf(fString) > -1)
						{
							result += (result != '' ? '\r\n' : '') + keys[j].armored;
							break;
						}
					}
					
					// if there are no keys, offer create button
					if(result == '')
					{
						$('#keys th:nth-child(2), #keys td:nth-child(2)').hide();
						$('#keys th:nth-child(3), #keys td:nth-child(3)').show();
					}
					else
					{
						$('#key').val(result);
						$('#keys th:nth-child(2), #keys td:nth-child(2)').show();
						$('#keys th:nth-child(3), #keys td:nth-child(3)').hide();
					}
				});
			
				// synchronize public keys for trusted users
			}
		});
		
		scope.find('a[href="#create-key"]').click(function (evt) {
			evt.preventDefault();
			var fString = $('#keys .selected').attr('href').substring(1),
				//salt = openpgp_crypto_getRandomBytes(8),
				request = { // TODO: make options on the #keys page out of these
					size: 2048,
					name: '<' + fString + '>'
					//pass: master,
				},
				keyResponse = function (data) {
					if(typeof data.privateKeyArmored != 'undefined')
					{
						privateKeys[privateKeys.length] = data.privateKeyArmored;
						// import result in to local keyring
						encryptAccounts();

						// if the same userId is still selected, show the key text
						if($('#keys .selected').attr('href') == '#' + fString)
						{
							$('#key').val(data.publicKeyArmored + data.privateKeyArmored);
							$('#keys th:nth-child(2), #keys td:nth-child(2)').show();
							$('#keys th:nth-child(3), #keys td:nth-child(3)').hide();
						}
					}
				};
			
			queueWork({type: 'generate', request: request, result: keyResponse, loading: '#keys'})
		});
		
		scope.find('a[href="#login"]').click(function (evt) {
			// list google accounts on login page
			var aLink = null;
			for(var i in accounts)
			{
				if($('#login a[href="#' + accounts[i].user + '"]').length != 0)
					continue;
				
				if(accounts[i].type == 'google')
					$('#accounts').append('<p><a href="#' + accounts[i].user + '" class="little-btn google">g</a>signed in as ' + accounts[i].user + '</p>');
				else
					$('#accounts').append('<p><a href="#' + accounts[i].user + '" class="little-btn imap">imap</a>signed in as ' + accounts[i].user + '</p>');
			}
		});
		
		scope.find('a[href="#write"]').click(function (evt) {
			evt.preventDefault();
            // TODO: get user account from hash
            loadComposition();
		});
		
		scope.find('a[href="#login-other"]').click(function (evt) {
			evt.preventDefault();

            if($('#other-entry:hidden').length > 0 ||
               $('#pass').val().trim() == '' ||
               $('#email').val().trim() == '')
            {
                $('#other-entry:hidden').show(400);
                if($('#email').val().trim() == '')
                    $('#email').focus();
                else if($('#pass').val().trim() == '')
                    $('#pass').focus();
                return;
            }

			// encode as base64 and send to proxy
			//   TODO: can this be done in javascript and there is no need for a proxy?
			var $base64 = CryptoJS.enc.Latin1.parse($('#pass').val()).toString(CryptoJS.enc.Base64),
				email = $('#email').val();
			$.post('/login.php', {
				user:email,
				access:$base64
			}, function (data) {
				// save in accounts
				var account = {user: email, pass: $base64, type: 'other'};
				addAccount(account);
				
				// load the new mailbox
				window.location.hash = '#' + account.user;
			})
			.fail(function (data) {
				master = null;
                // TODO: display error message
				
			});
		});
	}
	
    function firstLoad()
    {
        jQuery.fx.interval = 100;
		queueInterval = setInterval(processQueue, 100);
		
		// initialize everything using functions from mail.js
		$(window).on('hashchange', checkHash);
		
		decryptAccounts(); // decrypt local account information
		
		var params = {}, 
			queryString = window.location.hash.substring(1),
			regex = /([^&=]+)=([^&]*)/g, m;
		while (m = regex.exec(queryString)) {
			params[decodeURIComponent(m[1])] = decodeURIComponent(m[2]);
		}
		
		if(typeof params['state'] != 'undefined' &&
			params['state'] == 'initialGoogle')
			getGoogleUser(params, function (account) {
				addAccount(account);
				window.location.hash = '#' + account.user;
			});

		if(accounts.length == 0)
			window.location.hash = '#intro';
		
		// fire hash changed at least once
		$(window).trigger('hashchange');
					
		setBindings();

        var searchBubble = {title: "Press ENTER for full search."},
            menuBubble = {title: "Click HERE for menu."};

        $('#search input').val('').watermark('Search      ');
        $('#search input').bind('keypress keyup keydown drop cut copy paste DOMCharacterDataModified DOMSubtreeModified', function () {
            var search = $(this).val().trim(),
                results = $('#results'),
                matches = new RegExp(search, 'igm');
            if(search == '')
                $('#results').remove();
            if(results.length == 0)
                results = $('<ul id="results"></ul>').insertAfter($('#search'));
            else
                results.find('>*').remove();
            $('#nav a').each(function () {
                if(matches.test($(this).text()))
                {
                    $(this).clone().html($(this).text()
                        .replace(matches, function (match) { return '<span class=\"highlight\">' + match + '</span>'; }))
                        .appendTo($('<li></li>').appendTo(results));
                }
            });
        }).focus(function () {
            showBubble.call($(this), searchBubble);
            setTimeout(function () {
                if(searchBubble.bubble)
                    searchBubble.bubble.remove();
            }, 3000);
        });

		$('a[href="#menu"]').click(function (evt) {
			evt.preventDefault();
            // save scroll location so we can return sometimes
            var body = $('body'),
                nav = $('#nav');
            if(body.is('.menu'))
            {
                nav.css('margin-top:-' + body.scrollTop());
                body.removeClass('menu');
            }
            else
            {
                // TODO: store menu scroll
                body.addClass('menu');
            }
		});

        setTimeout(function () {
            showBubble.call($('#menubar h1'), menuBubble);
            setTimeout(function () {
                if(menuBubble.bubble)
                    menuBubble.bubble.remove();
            }, 3000);
        }, 1000);

        // drag and drop area
        $('body').on('dragenter', function () {
            $('body').addClass('drag');
        }).on('dragleave', function () {
            $('body').removeClass('drag');
        }).on('drop', function(e) {
            // this.className = '';
            e.preventDefault();

            var files = e.dataTransfer.files;
            for (var i = 0; i < files.length; i++) {
                handleFileDrop(files[i]);
            }
        });
    }
	$(document).ready(function () {
		firstLoad();
	});

    $(window).unload(function () {
        clearInterval(queueInterval);
        clearInterval(composeInterval);

        for(var i in active)
            active[i].terminate();
        for(var j in hive)
            hive[j].terminate();
    })
})();

function refreshBody(result, message)
{
	// TODO:  implement levels of trust for content
	// only make view/display decisions here, nothing to do with data structure
	
	for(var i in result)
	{
		var headers = result[i]['headers'],
			// add parts to message
			part = message.find('.part[class*="part_' + sanitizeName(headers['part-id']) + '"]');
			
		if(part.length == 0)
			part = $('<div class="part part_{part-id} {encrypted} {decrypted} {verified}"></div>'
                         .replace(/\{encrypted\}/igm, typeof headers['encrypted'] != 'undefined' ? 'encrypted' : '')
                         .replace(/\{decrypted\}/igm, typeof headers['decrypted'] != 'undefined' ? 'decrypted' : '')
                         .replace(/\{verified\}/igm, typeof headers['verified'] != 'undefined' ? 'verified' : '')
         				 .replace(/\{part-id\}/igm, sanitizeName(headers['part-id'])))
				.appendTo(message.find('> .body'));
		if(typeof headers['content-type'] != 'undefined')
			part.addClass(sanitizeName(headers['content-type']));
		
		if(typeof headers['content-type'] != 'undefined' &&
			headers['content-type'] == 'application/octet-stream')
		{
			// create a link to blob to download file
		}
		if(result[i]['headers']['content-type'] == 'pgp/mime')
		{
			// notify users that they have received and encrypted message
		}
        if(typeof headers['parameters'] != 'undefined' &&
            typeof headers['parameters']['charset'] != 'undefined' &&
            headers['parameters']['charset'] == 'utf-8')
            result[i].body = CryptoJS.enc.Latin1.parse(result[i].body).toString(CryptoJS.enc.Utf8);
		if(typeof headers['content-type'] != 'undefined' &&
			headers['content-type'] == 'text/plain')
		{
			// html encode
			var output = sanitizeBody('<div>' + plainToHtml(result[i].body) + '</div>', sanitizeLevel2);
			// wrap in a pre tag
            $('<a href="#text_plain">PLAIN</a>').appendTo(message.find('.attachments')).click(function (evt) {
                evt.preventDefault();
                message.find('.part').hide();
                message.find('.part.' + $(this).attr('href').substring(1)).show();
            });
			part.html(output);
            part.find('a[href*="mailto:"]').click(function (evt) {
                evt.preventDefault();
                loadComposition(null, null, '', $(this).attr('href').replace(/mailto:/igm, ''), '');
            });
		}
		if(typeof headers['content-type'] != 'undefined' &&
			headers['content-type'] == 'text/html')
		{
			// assume html and just wrap in a div
			var output2 = sanitizeBody(result[i].body);
            $('<a href="#text_html">HTML</a>').appendTo(message.find('.attachments')).click(function (evt) {
                evt.preventDefault();
                message.find('.part').hide();
                message.find('.part.' + $(this).attr('href').substring(1)).show();
            });
			part.html(output2);
            $.scoped()
		}
		if(typeof headers['parameters'] != 'undefined' && (
			typeof headers['parameters']['name'] != 'undefined' ||
			typeof headers['parameters']['attachment'] != 'undefined' ||
			typeof headers['parameters']['filename'] != 'undefined'))
		{
			// add to DOM as attachment
			var filename = headers['parameters']['name'] || headers['parameters']['attachment'] || 
						   headers['parameters']['filename'];
			// display a save link to file
			var attachment = message.find('.attachments .' + sanitizeName(filename));
			if(attachment.length == 0)
                attachment = $('<div class="' + sanitizeName(filename) + '"><a href="#part_' + sanitizeName(headers['part-id']) + '">download</a>' + filename + '</div>')
                    .appendTo(message.find('.attachments'));
		}
		
		// add encrypted loading symbol
        /* what is the purpose of this? && (
        headers['content-type'] != 'text/plain' ||
        headers['content-type'] != 'text/html') */
        if(message.find('.decrypting').length == 0 &&
            message.find('.encrypted').length > message.find('.decrypted, .verified').length)
            $('<div class="decrypting">decrypting...</div>').prependTo(message.find('.attachments'));
        else
            message.find('.decrypting').remove();

		// add symbols for parts of message
		if(typeof headers['verified'] != 'undefined' &&
			headers['verified'] == false)
		{
			if(message.find('.verify-failed').length == 0)
				$('<div class="verify-failed">Signature varification failed.</div>').appendTo(message)
		}
		
		// add decryption failed message here, just like above
		if(typeof headers['decrypt'] != 'undefined' &&
			headers['decrypt'] == false)
		{
			if(message.find('.decryption-failed').length == 0)
				$('<div class="decryption-failed">Decryption failed.</div>').appendTo(message)
		}
		
		// select the best view based on trust level

	}
	
}

function plainToHtml(bodyText)
{
    var safety = 10;
    do
    {
        var hit = false;
        bodyText = bodyText.replace(/(^>.*$\r*\n*)+/igm, function ($0, $1, offset, orig) {
            if($0.trim() == '')
                return orig;
            hit = true;
            return '<blockquote>' + $0.replace(/^>/igm, '') + '</blockquote>\r\n';
        });
        safety -= 1;
    } while (hit && safety > 0);
    var append = '';
    bodyText = bodyText.replace(/\r*\n\s*\r*\n\s*\r*\n/igm, '\r\n\r\n')
        .replace(/(^[\s\*>]*(from|date|cc|sent|to|subject):[\s\S]*?\r*\n){2}(^[\s\*>]*(from|date|cc|sent|to|subject):[\s\S]*?\r*\n)*/igm, function ($0, $1, $2, $3, $4, offset, orig) {
                                    append += '</blockquote><br />';
                                    var first = 0;
                                    return '<blockquote>' + $0
                                        .replace(/^[\s\*>]*(from|date|cc|sent|to|subject):[\s\*>]*/igm, function ($0, $1) {
                                            return (first++ == 0 ? '' : '\r\n' ) + '<b>' + $1 + ':</b>';
                                        });
                                })
//        .replace(/^([\s>]*)On.*wrote[\s\S]*?(\s+.*){2}/igm, function ($0) {
//                                    append += '</blockquote><br />'
//                                    return '<blockquote>\r\n' + $0
//                                        .replace(/^[\s]*/ig, '');
//                                })
        .replace(/\*(.*?)\*/igm, function ($0, $1) {
                                    return '<b>' + $1 + '</b>';
                                })
        .replace(/(http|s?ftp)s?:\/\/[-A-Z0-9+&@#\/%?=~_|$!:,.;]*[A-Z0-9+&@#\/%=~_|$]/igm,
                                function (str) {
                                    return '<a href="' + str + '" target="_blank">' + str + '</a>';
                                })
        .replace(matchEmail, function ($0) {
                                    return '<a href="mailto:' + $0 + '">' + $0 + '</a>';
                                });
    return bodyText.replace(/\r*\n/igm, '<br />') + append;
}

function refreshDraft(result, compose)
{
    // TODO:  implement levels of trust for content
    // only make view/display decisions here, nothing to do with data structure
    result.forEach(function (value, i, array) {
        var headers = value['headers'];

        if(typeof headers['content-type'] != 'undefined' &&
           headers['content-type'] == 'text/plain')
        {
            // assume html and just wrap in a div
// TODO: is jqte sanitizing at all?
            compose.find('textarea').jqteVal(value.body);
        }
        if(typeof headers['content-type'] != 'undefined' &&
           headers['content-type'] == 'text/html')
        {
            // assume html and just wrap in a div
            compose.find('textarea').jqteVal(value.body);
        }
    });
}

function loadingAnimation(that)
{
	if(typeof that != 'undefined' && that.length > 0 && that.find('.loading').length == 0)
	{
		return loadingAnimation.call($('<span class="loading">&nbsp;</span>').appendTo(that), that);
	}
	else if ($(this).is('.loading'))
    {
        var width = $(this).parent().outerWidth(true);
		return $(this).css('width', 0).css('left', 0)
			.animate({width: width}, 2000, 'swing', function () {
                var width = $(this).parent().outerWidth(true);
				$(this).css('width', width).css('left', 0)
                    .animate({left: width, width: 0}, 2000, 'swing', loadingAnimation);
			});
    }
	else if(typeof that != 'undefined')
		return that.find('.loading');
}

function closeMessage(evt)
{
	evt.preventDefault();
	var that = $(this),
		message = that.parents('.message'),
		fString = that.parents('tr').find('th:nth-child(2) a').attr('href'),
		prev = message.prev('#content .message');
	message.remove();
	$('#mail a[href="' + fString + '"]').removeClass('selected');
	if(prev.length == 0)
	    // if the user closes the first message skip to the last message
		prev = $('#content .message').last();

	// if we closed the last message, select the current folder
	if(prev.length == 0)
        window.location.hash = $('#folders .selected').first().attr('href');

	// if we haven't closed all the message, select the next one in order
	else if(decodeURIComponent(window.location.hash) == decodeURIComponent(fString))
		window.location.hash = prev.find('.title').attr('href');
}

function composeSuccess(result, compose)
{
    var to = parseInlineEncoding(result.headers.to || '').trim(),
        recipients = parseInlineEncoding(result.headers.to || '').split(/\s*;\s*|\s*,\s*|\s+/igm);
    // fill in composition
    if(($match = new RegExp(/^\s*("?)(.*)\1\s+<.*>\s*$/).exec(to)))
        to = $match[2].trim();
    compose.find('tr:first-child th:nth-child(2) a').html('<span>' + escapeHtml(to != '' ? to : 'New message') + '</span>' +
                                                          escapeHtml(parseInlineEncoding(result.headers.subject || '')));
    for(var i in recipients)
    {
        var match;
        if((match = matchEmail.exec(recipients)))
        {
            var contact = $('#contacts a:contains("' + match[0] + '")').parents('li'),
                title = contact.find('a').first().text();

        }
    }
    compose.find('input.recipients').val(recipients);
    compose.find('input.subject').val(parseInlineEncoding(result.headers.subject || ''));

    // parse all the attached parts in the draft
    parseMIME('', result.headers, function (result) {
        refreshDraft(result, compose);
    });
}

function messageSuccess(result, mString)
{
    var path = result.info.mailbox,
        fromorig = parseInlineEncoding(result.headers.from),
        from = fromorig,
        date = escapeHtml(parseInlineEncoding(result.headers.date)),
        to = escapeHtml(parseInlineEncoding(result.headers.to)),
        subject = parseInlineEncoding(result.headers.subject),
        allHeaders = null,
        template = $('#templates .message:not(.compose, .contact)').clone(),
        $match;

    // remove extra information on from
    if(($match = new RegExp(/^\s*("?)(.*)\1\s+<.*>\s*$/).exec(from)))
        from = $match[2].trim();
    var message = template.html(template.html().replace(/\{from\}/ig, escapeHtml(from))
                                    .replace(/\{fromfull\}/ig, escapeHtml(fromorig))
                                    .replace(/\{subject\}/ig, escapeHtml(subject))
                                    .replace(/\{date\}/ig, date)
                                    .replace(/\{to\}/ig, to)
                                    .replace(/\{link\}/ig, mString));
    message.appendTo($('#content'));
    message.find('a[href="#close-message"]').click(closeMessage);
    message.find('a[href="#reply"]').parent().parent().hover(function () {
        $(this).addClass('hover');
    }, function () {
        $(this).removeClass('hover');
    });
    message.find('a[href="#all_headers"]').click(function (evt) {
        evt.preventDefault();
        if(allHeaders == null)
        {
            allHeaders = [];
            var sorter = [];
            for(var i in result.headers)
            {
                if(typeof result.headers[i] != 'string' || i == 'from' || i == 'date' || i == 'to')
                    continue;
                sorter[sorter.length] = i;
            }
            sorter.sort(function (a, b) {
                return a.toLowerCase().localeCompare(b.toLowerCase());
            });
            for(var j in sorter)
            {
                var key = sorter[j].replace(/(^|-)[a-z]/igm, function ($0) {
                    return $0.toUpperCase();
                });
                allHeaders[allHeaders.length] = $('<span><b>' + escapeHtml(parseInlineEncoding(key)) +
                                                  '</b>' + escapeHtml(parseInlineEncoding(result.headers[sorter[j]])) +
                                                  '</span>').appendTo(message.find('.headers'))[0];
            }
        }
        else
            $(allHeaders).toggle();
    });
    message.find('a[href="#reply"]').click(function (evt) {
        evt.preventDefault();
        var html = message.find('.part:not(:hidden)').first().html(),
            bodyText = '<p> <br /></p><blockquote style="' + getBlockquoteBorder() + '">' +
                       '<b>From: </b>{from}<br /><b>Sent: </b>{sent}<br /><b>To: </b>{to}<br /><b>Subject: </b>{subject}<br /><br />{html}</blockquote>'
                .replace(/\{from\}/igm, escapeHtml(fromorig))
                .replace(/\{sent\}/igm, date)
                .replace(/\{to\}/igm, to)
                .replace(/\{subject\}/igm, escapeHtml(subject))
                .replace(/\{html\}/igm, html);
        loadComposition(null, null, sanitizeBody(bodyText, sanitizeLevel2), fromorig, 'RE: ' + subject);
    });
    // clean up the email data
    /*if(result.headers.size >= 4 * 1024 * 1024)
     {
     // the message is large, download with a worker
     getAccessCode(result.user + '@' + result.host, function (access) {
     var request = {
     user:result.user + '@' + result.host,
     path: path,
     access: access,
     id : result.headers.msgno,
     headers : {
     'part-id' : mString
     }
     };
     queueWork({type: 'download', request: request, result: refreshBody});
     });

     }
     else*/

    parseMIME('', result.headers, function (result) {
        refreshBody(result, message);
    });

}

// called whenever the page is first loaded and we need to
//   list the mail folders and headers for the selected folder
function mailSuccess(result, root, fString)
{
	var folders = $('#folders');

	// reload the folders from account
	if(typeof result.folders != 'undefined' && result.folders != null)
    {
        root.data('folders', result.folders);
		loadFolders(root, result.folders);
    }
	
	var fLink = $('#folders a[href="' + fString + '"]');
	if(fLink.length > 0)
	{
		fLink.text(fLink.text().replace(/\s+\([0-9]*\)\s*$/i, '') + ' (' + result.info.unseen + ')');
	}

    // if we just loaded the currently selected folder
    var dialog = window.location.hash,
        user = decodeURIComponent((dialog.split('#')[1] || '').split('$')[0]),
        path = decodeURIComponent((dialog.split('#')[1] || '').split('$')[1] || ''),
        sString = '#' + encodeURIComponent(user) + (path != '' && path != '__--compose' &&
                                                    path != '__--contact' ? ('$' + encodeURIComponent(path)) : ''),
        selected = $('#folders a[href="' + sString + '"]');
    // load the headers in to the message list,
	//   only when the headers are of the mailbox we selected
	//   like the scenario when we load all the folder first time the page loads
	//   or when the user selects a different folder while its loading
	if(selected.length > 0)
	{
		selected.addClass('selected').parents('ul').addClass('expand');
		if(sString == fString)
		{
			// set up paging
			$('#count').html('<b>' + (1+result.info.start) + '-' + result.info.end + '</b> of <b>' + result.info.messages + '</b>');
			loadHeaders(result, fString, result.headers);
		}
	}
}

function loadFolders(root, folders)
{
	folders.sort(function (a, b) {
		return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
	});

    for(var i in folders)
	{
		// split by dot to create folder trees
		var subfolders = folders[i].name.split(folders[i].delim),
			current = root.children('ul'),
            currentString = root.find('a').attr('href') + '$';

		// loop through each sub folder adding as we go
		for(var j in subfolders)
		{
            currentString += encodeURIComponent((j > 0 ? folders[i].delim : '') + subfolders[j]);
			var temp = current.find('> li > a[href="' + currentString + '"]').parent();
			if(temp.length == 0)
			{
				temp = $('<li><a href="' + currentString + '">' + subfolders[j] + '</a><ul></ul></li>')
				.appendTo(current);
				temp.find('> a')
				.click(function () {
					$(this).siblings('ul').toggleClass('expand');
				});
			}
			current = temp.children('ul');
		}
	}
}

function loadHeaders(result, fString, headers)
{
	$('#mail a').remove();
	
	for(var header in headers)
	{
		if(!headers[header]) // skip messages that disappeared
			continue;
		if(typeof headers[header] == 'object')
		{
			var obj = headers[header],
                // this is the path directly to the message,
                mString = fString + '#' + encodeURIComponent(obj.msgno),
				selected = $('.message a[href="' + mString + '"]').length > 0;
			
			if(obj.from == null)
				obj.from = '';
			else
				obj.from = parseInlineEncoding(obj.from);
			// remove extra information on from
			if(($match = new RegExp(/^\s*("?)(.*)\1\s+<.*>\s*$/).exec(obj.from)))
				obj.from = $match[2].trim();
			
			if(obj.subject == null)
				obj.subject = '';
			else
				obj.subject = parseInlineEncoding(obj.subject);
			
			var newRow = $('<a href="' + mString + '" class="' + (selected ? 'selected' : '') + '"><span>&nbsp;</span>' +
				'<span>' + escapeHtml(obj.from) + '</span>' +
				'<span>' + escapeHtml(obj.subject) + '</span>' +
				'<span>' + obj.date + '</span></a>').appendTo($('#mail'));
			
			if(!(/\\seen/i).test(obj.flags))
				newRow.addClass('unseen');
		}
	}
}

function loadContact(user, id, contact, mString)
{
    var template = $('#templates .message.contact').clone();
    var newMessage = template.html(template.html()
                           .replace(/\{link\}/ig, mString)
                           .replace(/\{title\}/ig, contact.length > 0 ? contact.text() : '')
                           .replace(/\{contact\}/ig, contact.length > 0 ? JSON.stringify(contact.data('data'), undefined, 4) : ''));
    newMessage.appendTo($('#content'));
    newMessage.find('a[href="#close-message"]').click(closeMessage);
    return newMessage;
}

function loadAccount(user)
{
    var root = $('#folders a[href="#' + encodeURIComponent(user) + '"]').parent(),
        folders = $('#folders');
    if(root.length == 0)
    {
        root = $('<li><a href="#' +  encodeURIComponent(user) + '">' + escapeHtml(user) + '</a><ul class="expand"></ul></li>')
            .appendTo(folders);
        root.find('> a')
            .click(function () {
                // uncomment to allow accountRoot to be minimized
                //$(this).siblings('ul').toggleClass('expand');
            });

    }
    return root;
}

function getNextId(user)
{
    var id = 1,
        mString;
    while($('.message a[href="' + (mString = '#' + encodeURIComponent(user) +
                                             '$__--compose' +
                                             '#new' + id) + '"]').length > 0)
        id+=1;
    return mString;
}

function loadComposition(user, id, replyText, recipients, subject)
{
    if(user == null || user == '')
    // get user from last message
        user = decodeURIComponent($('#content .mesage:last-of-type:not(:hidden) tr:first-child th:nth-child(2) a').attr('href') || '');
    if(user == '')
    // get user from current hash
        user = decodeURIComponent((window.location.hash.split('#')[1] || '').split('$')[0]);
    var template = $('#templates .message.compose').clone(),
        mString = id == null ? getNextId(user) : ('#' + encodeURIComponent(user) + '$__--compose#' + encodeURIComponent(id)),
        compose = template.html(template.html()
            .replace(/\{link\}/ig, mString)
            .replace(/\{to\}/ig, 'New message')
            .replace(/\{subject\}/ig, '')
            .replace(/\{message\}/ig, ''));
    compose.appendTo($('#content'));
	populateAccounts(compose.find('.from select'));  // call a different scope to add users
    if(user == '')
        compose.find('.from select').val(encodeURIComponent(compose.find('.from option:first-child').attr('value')));
    else
        compose.find('.from select').val(encodeURIComponent(user));
    compose.find('.recipients').watermark('To      ').val(recipients || '');
    compose.find('.recipients')
    // don't navigate away from the field on tab when selecting an item
        .bind( "keydown", function( event ) {
            if ( event.keyCode === $.ui.keyCode.TAB &&
                $( this ).data( "ui-autocomplete" ).menu.active ) {
                event.preventDefault();
            }
        })
        .autocomplete({
            appendTo: compose.find('.recipients').parent(),
            minLength: 0,
            source: function( request, response ) {
                // delegate back to autocomplete, but extract the last term
                var contacts = [],
                    term = request.term.split( /,\s*/ ).pop().toLocaleLowerCase(),
                    matches = new RegExp(RegExp.escape(term), 'igm');
                if(term == '')
                    return [];
                // TODO: something more efficient than reiterating
                $('#contacts a').each(function () {
                    var that = $(this),
                        text = that.text().toLocaleLowerCase(),
                        cLink = that.parents('li'),
                        cString = cLink.find('a').first().attr('href');
                    if(text.contains(term) && !Enumerable.From(contacts).Any(function (x) {
                        return x.cLink == cLink[0];
                    }))
                        contacts.push({
                                          cString: cString,
                                          cLink: cLink[0],
                                          matches: matches,
                                          value: '"{0}" <{1}>'
                                              .replace(/\{0\}/igm, cLink.find('a').first().text())
                                              .replace(/\{1\}/igm, cLink.find('a').toEnumerable().FirstOrDefault(function (x) {
                                                  return matchEmail.test(x.text());
                                              }).text())});
                    if(contacts.length == 20)
                        return false;
                });
                response( contacts );
            },
            focus: function() {
                // prevent value inserted on focus
                return false;
            },
            select: function( event, ui ) {
                var terms = $(this).val().split( /,\s*/ );
                // remove the current input
                terms.pop();
                // add the selected item
                terms.push( ui.item.value );
                // add placeholder to get the comma-and-space at the end
                terms.push( '' );
                $(this).val(terms.join( ', ' ));
                return false;
            }
        })
        .data('ui-autocomplete')._renderItem = function( ul, item ) {
            //var result = $('#contacts a[href="' + item.cString + '"]]').clone();
            var result = $('<li></li>').appendTo(ul);
            $(item.cLink).find('a').each(function (i) {
                var newLink;
                if(i == 0)
                    newLink = $('<a href="' + $(this).attr('href') + '">' + $(this).text().replace(item.matches, function (match) {
                        return '<span class=\"highlight\">' + match + '</span>';
                    }) + '</a>').appendTo(result);
                else
                    newLink = $('<span class="item item_' + i + '">' + $(this).text().replace(item.matches, function (match) {
                        return '<span class=\"highlight\">' + match + '</span>';
                    }) + '</span>').appendTo(result.find('a'));
                newLink.click(function (evt) {evt.preventDefault();});
            });
            return result;
        };
    compose.find('.subject').watermark('Subject      ').val(subject || '');
    compose.find('textarea').jqte({placeholder: 'Message     ', change: function () {
        // TODO: autosave and change href
        //setTimeout()
    }}).jqteVal((replyText || '\r\n').replace(/\r*\n/igm, '<br />'));
    compose.find('a[href="#close-message"]').click(closeMessage);
    compose.find('a[href="#format"]').click(function (evt) {
        evt.preventDefault();
        $(this).toggleClass('checked');
        var jqte = $(this).parents('.compose').find('.jqte');
        jqte.toggleClass('checked');
        jqte.focus();

    });
    compose.find('.jqte_toolbar').sticky({topSpacing: $('#menubar').outerHeight()});
    compose.find('.jqte_linkform').sticky({topSpacing: $('#menubar').outerHeight() + compose.find('.jqte_toolbar').outerHeight()});
    compose.find('a[href="#attach"]').click(function (evt) {
		evt.preventDefault();
	});
    compose.find('a[href="#send"]').click(function (evt) {
		evt.preventDefault();
		var compose = $(this).parents('.compose');
		sendMessage.call(compose[0],
                         compose.find('.recipients').val(),
                         decodeURIComponent(compose.find('select').val()),
                         compose.find('textarea').val(),
                         compose.find('.subject').val(),
                         mString,
                         compose.find('a[href="#encrypt"]').is('.checked'),
                         compose.find('a[href="#sign"]').is('.checked'));
	}) ;
    compose.find('a[href="#encrypt"], a[href="#sign"]').click(function (evt) {
		evt.preventDefault();
		$(this).toggleClass('checked');
	});
    window.location.hash = mString;
    return compose;
}

function showBubble(vars)
{
    vars.css = 'jqte';
    if(vars.title)
    {
        if(vars.bubble)
            vars.bubble.remove();

        // create the title bubble
        vars.bubble = $('<div class="'+vars.css+'_title"><div class="'+vars.css+'_titleArrow"><div class="'+vars.css+'_titleArrowIcon"></div></div><div class="'+vars.css+'_titleText">'+vars.title+'</div></div>').insertAfter($(this));

        var thisArrow = vars.bubble.find('.'+vars.css+'_titleArrowIcon');
        var thisPosition = $(this).position();
        var thisAlignX = thisPosition.left + $(this).outerWidth() - (vars.bubble.outerWidth()/2) - ($(this).outerWidth()/2);
        var thisAlignY = (thisPosition.top + $(this).outerHeight() + 5);

        // show the title bubble and set to its position
        vars.bubble.delay(400).css({'top':thisAlignY, 'left':thisAlignX}).fadeIn(200);
    }
}

