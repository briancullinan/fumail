// JavaScript Document
var matchEmail = new RegExp(/[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/i),
    matchEmailGlobal = new RegExp(/[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/igm),
    matchFirstLast = new RegExp(/[A-Z][a-z]*(\s+[A-Z][a-z]*)+/igm);

// used for working on decrypting messages in the background
var J = window.JSONSelect,
    lastHue = 0;
// add escape function
RegExp.escape = function(s) {
    return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')
};

function getDrafts(folders)
{
    var result = Enumerable.From(J
        .match('.folders > *:has(.name:contains("Drafts")) > .name, .folders > *:has(.flags:contains("\\Drafts")) > .name', folders));
    return result.Any() ? result.First() : null;
}

function hex2a(hex) 
{
    var str = '';
    for (var i = 0; i < hex.length; i += 2)
        str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
    return str;
}

function HSVtoRGB(h, s, v) {
    var r, g, b, i, f, p, q, t;
    if (h && s === undefined && v === undefined) {
        s = h.s, v = h.v, h = h.h;
    }
    i = Math.floor(h * 6);
    f = h * 6 - i;
    p = v * (1 - s);
    q = v * (1 - f * s);
    t = v * (1 - (1 - f) * s);
    switch (i % 6) {
        case 0: r = v, g = t, b = p; break;
        case 1: r = q, g = v, b = p; break;
        case 2: r = p, g = v, b = t; break;
        case 3: r = p, g = q, b = v; break;
        case 4: r = t, g = p, b = v; break;
        case 5: r = v, g = p, b = q; break;
    }
    return {
        r: Math.floor(r * 255),
        g: Math.floor(g * 255),
        b: Math.floor(b * 255)
    };
}

function getBlockquoteBorder()
{
    var color = Math.floor((Math.random()*225)+30);
    lastHue = (lastHue + color) % 256;
    var rgb = HSVtoRGB(lastHue/256, 200/256, 128/256),
        hex = rgb.r.toString(16) +
              rgb.g.toString(16) +
              rgb.b.toString(16);
    return 'border-left:3px solid #' + hex + ';border-bottom:1px solid #' + hex + ';';
}

function trimAttributes(tag, allowedAttrs) {
	var tag = tag.replace(/[\r\n]+(?=[^<>]*>)/igm, ' '), // this removes all line breaks inside HTML tags
		matches = new RegExp(/\s+([a-z]+)=("|')?([^>]*?)(\2|$|>)/igm),
		result = tag.match(/<\/?([a-z][a-z0-9]*)/igm)[0],
		tagName = new RegExp(/<\/?([a-z][a-z0-9]*)/igm).exec(tag)[1],
		ending = result.indexOf('/') > -1,
		$match = null,
		width = 0,
		last_width = this.last_width;
	while(($match = matches.exec(tag)))
	{
		if(allowedAttrs.indexOf($match[1].toLowerCase()) > -1 &&
			!(/(.*?javascript:.*)+/igm).test($match[0]) &&
			// strip out data: URI
			!(/(.*?data:.*)+/igm).test($match[0]))
		{
			// TODO: are images removed if it doesn't have a proper closing tag?  are they displayed instead?
			// strip out url and javascript
			var moreStripped = $match[0];
			if($match[1].toLowerCase() != 'href') // allow url in a href
				moreStripped = moreStripped.replace(/(url\()*s?(https?|ftps?|file):\/\/[-A-Z0-9+&@#\/%?=~_|$!:,.;]*[A-Z0-9+&@#\/%=~_|$]\)*/igm, '');
			moreStripped = moreStripped.replace(/>/igm, '').trim();
			result += ' ' + moreStripped;
		}
		else
			result += ' removed-' + $match[1];
	}
	if(tagName == 'a' && !ending)
		return result + ' target="_blank">';
    else if(tagName == 'style' && !ending)
        return result + ' scoped="scoped">';
    else if(tagName == 'blockquote' && !ending)
    {
        return result + ' style="' + getBlockquoteBorder() + '">';
    }
	else
		return result + '>';
}

var sanitizeLevel1 = {
	'p' : ['style', 'class'],
	'div' : ['align', 'style', 'class', 'bgcolor'],
	'table' : ['style', 'width', 'bgcolor', 'border', 'cellpadding', 'cellspacing', 'align', 'class'],
	'tr' : ['style', 'height', 'valign', 'class'],
	'td' : ['align', 'style', 'width', 'bgcolor', 'border', 'colspan', 'rowspan', 'valign', 'height', 'class'],
	'th' : ['style', 'class'],
	'tbody' : ['style', 'class'],
	'thead' : ['style', 'class'],
	'font': ['color', 'style', 'face', 'size', 'class'],
	'strong': ['style', 'class'],
	'b': ['style', 'class'],
	'i': ['style', 'class'],
	'span' : ['style', 'class'],
	'a' : ['href', 'style', 'class'],
	'em' : ['style', 'class'],
	'br' : ['style', 'class'],
	'tab' : ['style', 'class'],
	'h1' : ['style', 'class'],
	'h2' : ['style', 'class'],
	'h3' : ['style', 'class'],
	'h4' : ['style', 'class'],
	'h5' : ['style', 'class'],
	'hr' : ['style', 'class'],
	'blockquote' : ['class', 'type', 'cite'],
	'pre' : ['style', 'class'],
    'ol' : ['style', 'class'],
    'ul' : ['style', 'class'],
    'li' : ['style', 'class'],
	'title' : [],
    'style' : [], // scoped will be added to style elements below
    'cite' : []},
    sanitizeLevel2 = {'blockquote':[],'b':[],'strong':[],'a':['href'],'p':[],'br':[],'i':[],'u':[]};

function sanitizeBody(content, allowed)
{
	var whitelist = allowed || sanitizeLevel1;
    content = content.replace(/<!--[\s\S]*?-->/igm, '')
        .replace(/<!DOCTYPE[\s\S]*?>/igm, '')
		.replace(/<\?xml[\s\S]*?>/igm, '');
	// get a list of existing tags
	var tags = [],
		matches = new RegExp(/<\/?([a-z][a-z0-9]*)[^<>]*>/igm),
		output = '',
		last = null,
		$match = null,
		data = {last_width: null};
	while(($match = matches.exec(content)))
	{
		// exclude 'safe' matches
		var allowedAttrs = whitelist[$match[1].toLowerCase()],
            ending = $match[0].indexOf('/') > -1;
		if(allowedAttrs)
		{
            // everything up to the match is ok
            if(last == null || (last[1].toLocaleLowerCase() != 'script' && last[1].toLocaleLowerCase() != 'object' && last[1].toLocaleLowerCase() != 'style'))
                output += escapeHtml(content.substring(last == null ? 0 : (last.index + last[0].length), $match.index));
			var trimmedAttrs = trimAttributes.call(data, $match[0], allowedAttrs);
			// just replace the invalid attributes
			output += trimmedAttrs;
		}
		else
		{
			tags.push(matches[0]);
			output += escapeHtml(content.substring(last == null ? 0 : (last.index + last[0].length), $match.index));
			// skip appending tag
		}
		last = $match;
	}
	if(last == null)
        return escapeHtml(content);
	return output;
}

function parseQuotedPrintable(content)
{
	var output = content.replace(/=\s*\r*\n/igm, '')
						.replace(/_/igm, ' ')
						.replace(/^- -/igm, '-')
						.replace(/\n- -/g, "\n-")
						.replace(/\r- -/g, "\r-"),
		matches = new RegExp(/=([0-9a-fA-F]{2})/igm),
		result = output;
	while($match = matches.exec(output))
		result = result.replace(new RegExp($match[0], 'igm'), hex2a($match[1]));
	return result;
}

function parseBase64(output)
{
	output = output.replace(/(\&nbsp;|\t| )*$\r?\n(\&nbsp;|\t| )*/igm, '');
	output = CryptoJS.enc.Base64.parse(output).toString(CryptoJS.enc.Latin1);
	return output;
}

//this is already done by php, just have to match boundaries
function parseHeaders(content)
{
	var matches = new RegExp(/^([\x21-\x39\x3B-\x7E]+?):(.*)$((\r?\n^[ \t]+[^\s]+.*$)*)/igm),
		headend = new RegExp(/^[\s]*$\r?\n^$/im).exec(content),
		output = content,
		headers = {},
		last = null,
		$match = null;
		
	while($match = matches.exec(content))
	{
		if(headend == null || $match.index + $match[0].length > headend.index)
			break;
		else
			output = content.substring($match.index + $match[0].length)
							.replace(/^\s*/, '');
		
		// split ';' only applies to some headers, just do it to the ones we need like content-type
		if($match[1].trim().toLowerCase() == 'content-type' ||
			$match[1].trim().toLowerCase() == 'content-disposition')
			headers[$match[1].trim().toLowerCase()] = $match[2].split(';')[0].trim();
		else
			headers[$match[1].trim().toLowerCase()] = $match[2].trim()+$match[3].trim().replace(/\r?\n^[ \t]+/igm, '');
		var parameters = $match[0].split(';');
		for(var i in parameters)
		{
			if(i == 0)
			{
				continue;
			}
			// the part is a key : value
			else
			{
				var kvPair = new RegExp(/^\s+([\x21-\x39\x3B-\x7E]+?)=(.*)$/igm).exec(parameters[i]);
				if(kvPair != null && kvPair.length > 1)
				{
					if(typeof headers['parameters'] == 'undefined')
						headers['parameters'] = {};
					headers['parameters'][kvPair[1].trim().toLowerCase()] = kvPair[2].trim().replace(/^"|"$/igm, '');
				}
			}
		}
			
		last = $match;
	}
	
	// if there is another boundary parse those too
	// creates a structure like:
	//   content-type : text/plain,
	//   boundary : ---_243012948209dslkjasf9,
	//   ---_243012948209dslkjasf9 : [
	//     content-type : text/html,
	//     encoding : utf-8
	//   ]
	return [output, headers];
}

function escapeHtml(text) {
	var result = text == null ? '' : text
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;');
	return result;
}

function parseInlineEncoding(output)
{
	var matches = new RegExp(/=\?([^\?]+)\?(Q|B)\?([\s\S]+?)\?=/igm),
		$match = null,
		result = '';
	while (($match = matches.exec(output)))
	{
		try
		{
			var tmpOutput = $match[3];
            $match[2] = $match[2].toUpperCase();
			if($match[2] == 'B')
				tmpOutput = tmpOutput.replace(/(\&nbsp;|\t| )*$\r?\n(\&nbsp;|\t| )*/igm, '');
			// get encoding
			if($match[2] == 'B' && $match[1] == 'iso-8859-1')
				tmpOutput = CryptoJS.enc.Base64.parse(tmpOutput).toString(CryptoJS.enc.Latin1);
			else if ($match[2] == 'B' && $match[1] == 'utf-8')
				tmpOutput = CryptoJS.enc.Base64.parse(tmpOutput).toString(CryptoJS.enc.Utf8);
			else if ($match[2] == 'Q' && $match[1] == 'iso-8859-1')
				tmpOutput = parseQuotedPrintable(tmpOutput);
			else if ($match[2] == 'Q' && $match[1] == 'utf-8')
				tmpOutput = CryptoJS.enc.Latin1.parse(parseQuotedPrintable(tmpOutput))
															.toString(CryptoJS.enc.Utf8);
			else if ($match[2] == 'Q')
				tmpOutput = parseQuotedPrintable(tmpOutput);
			else if ($match[2] == 'B')
				tmpOutput = CryptoJS.enc.Base64.parse(tmpOutput).toString(CryptoJS.enc.Latin1);
			result += tmpOutput;
		}
		catch (e)
		{
			var tmpOutput = $match[3];
			if($match[2] == 'B')
				tmpOutput = tmpOutput.replace(/(\&nbsp;|\t| )*$\r?\n(\&nbsp;|\t| )*/igm, '');
			// get encoding
			if ($match[2] == 'Q')
				tmpOutput = parseQuotedPrintable(tmpOutput);
			else if ($match[2] == 'B')
				tmpOutput = CryptoJS.enc.Base64.parse(tmpOutput).toString(CryptoJS.enc.Latin1);
			result += tmpOutput;
		}
	}
	if(result == '')
		result = output;
	return result;
}

function parseMIME(content, headers, resulted)
{
	if(typeof headers == 'function')
		resulted = headers;
	if(typeof headers != 'object')
	{
		var result = parseHeaders(content);
		content = result[0];
		headers = result[1];
	}
	var output = content; // used for conversion
	
	// convert encoding
	if(typeof headers['content-transfer-encoding'] != 'undefined' &&
		headers['content-transfer-encoding'] == 'quoted-printable')
		output = parseQuotedPrintable(output);
		
	else if(typeof headers['content-transfer-encoding'] != 'undefined' &&
		headers['content-transfer-encoding'] == 'base64')
	{
		// clean up a little before
		output = parseBase64(output);
	}
		
	
	if(typeof headers['parameters'] != 'undefined' &&
		typeof headers['parameters']['boundary'] != 'undefined' &&
		typeof headers.bodies == 'undefined')
	{
		headers.bodies = [];
		// get the text between boundaries
		var matchBody = new RegExp(
			'^\s*(--)*' + RegExp.escape(headers['parameters']['boundary']) + '(--)*\s*$', 'igm'),
			last = null;
			
		// loop through parts and extract content
		while($match = matchBody.exec(content))
			if(last == null)
				last = $match;
			else
			{
				var tmpBody = content.substring(last.index + last[0].length, $match.index)
									 .replace(/^\s*/i, '');  // replace any leading whitespace
				if(typeof headers.parts == 'undefined')
					headers.parts = [];

				var subresult = parseHeaders(tmpBody),
					tmpBody = subresult[0],
					tmpHeaders = subresult[1];
				headers.parts[headers.bodies.length] = tmpHeaders;
				headers.bodies[headers.bodies.length] = tmpBody;
			
				last = $match;
			}
	}
	
	if(typeof headers.parts != 'undefined' && 
		typeof headers.parts[0] != 'undefined')
	{
		var boundary = typeof headers['parameters'] != 'undefined' &&
						typeof headers['parameters']['boundary'] != 'undefined'
							? headers['parameters']['boundary'] 
							: '';
		// parse messages recursively
		for(var i in headers.parts)
		{
			var multipartResult = function (data) {
				if(headers['content-type'] == 'multipart/encrypted')
				{
					for(var j in data)
					{
						var subresult = parseHeaders(data[j].body),
							decContent = subresult[0],
							decHeaders = subresult[1];
						if(typeof data[j].headers['verified'] != 'undefined')
							decHeaders['verified'] = data[j].headers['verified'];
						if(typeof data[j].headers['decrypt'] != 'undefined')
							decHeaders['decrypt'] = data[j].headers['decrypt'];
						for(var h in headers.parts[i])
							if(typeof decHeaders[h] == 'undefined')
								decHeaders[h] = headers.parts[i][h];
						parseMIME(decContent, decHeaders, resulted);
					}
				}
				else
					resulted(data);
			};
			if(typeof headers.bodies[i] == 'undefined')
				headers.bodies[i] = '';
			parseMIME(headers.bodies[i], headers.parts[i], multipartResult);
		}
		return; // only look for pgp below in child parts
	}
		
	// check for PGP encryption
	// DO NOT ESCAPE CONTENT TYPE BEFORE THIS because it could ruin signature verification
	var pgp = new RegExp(/-----BEGIN PGP.*?$([\s\S]*?)-----END PGP.*-*/igm).exec(output);
	if(pgp)
	{
		// remove any extra whitespaces
		var message = pgp[0].replace(/(\&nbsp;|\t| )*$\r?\n(\&nbsp;|\t| )*/igm, '\r\n');
		if(typeof headers['content-type'] != 'undefined' &&
			headers['content-type'] == 'text/html')
			message = sanitizeBody(message, []).replace(/\s$\r?\n/igm, '\r\n'); // this removes all html tags from inline pgp
		
		// start a worker to handle processing
		var reqHeaders = {};
		for(var i in headers)
			reqHeaders[i] = headers[i];
		var request = {
			'message' : message,
			// only used when message is not pgp/mime
			'headers' : reqHeaders,
			'prefix' : output.substring(0, pgp.index),
			'postfix' : output.substring(pgp.index + pgp[0].length, output.length)
		};
		
// TODO: determine what happens if there is a large decrypted file, does it try to decrypt it and fail because of lack of access to the decryptWorker() function
		decryptWorker(request, resulted);
		
		// mark the message as encrypted
		headers['encrypted'] = true;
	}

	resulted([{body: output, headers: headers}]);
}

function sanitizeName(name)
{
	return name.replace(/[^a-z0-9_-]/igm, '_').toLowerCase();
}



