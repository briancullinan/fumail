<?php
$GLOBALS['tagI'] = 0;
function sendCommand($cmd, $gets = true)
{
	$tag = 'FU' . ++$GLOBALS['tagI'];
	$command = $cmd . "\r\n";
	print 'sending: ' . $command . "\r\n";
	fwrite($GLOBALS['sock'], $command);
	
	if($gets)
	{
		$line = fgets($GLOBALS['sock'], 1024);
		return $line;
	}
}
	
//$sock = fsockopen('ssl://imap.gmail.com', 993, $errno, $errstr, 30);
//$sock = fsockopen('ssl://bjcullinan.com', 993, $errno, $errstr, 30);

/*if (!$sock) {
	echo '$errstr ($errno)<br />\n';
} else {
	if (!stream_set_timeout($sock, 1)) die("Could not set timeout");
	
	echo fgets($sock);

//	print sendCommand('LOGIN "bjcullinan@gmail.com" "' . addslashes('%rm0#B&Z59$*LOr7') . '"');
	print sendCommand('LOGIN "bjcullinan" "' . addslashes('this computer is 1337') . '"');
	
	print sendCommand('LIST "" "*"');
	
	print sendCommand('STATUS "INBOX" (MESSAGES RECENT UNSEEN)');
	
	print sendCommand('SELECT "INBOX"');
	
	print sendCommand('SORT (REVERSE DATE) US-ASCII ALL');
	
	print sendCommand('SEARCH ALL');
	
	$ids = implode(',', array(1, 5, 9));
	print sendCommand('FETCH ' . $ids . ' (FLAGS UID BODY.PEEK[HEADER.FIELDS (FROM TO CC BCC DATE DATE ARRIVED SUBJECT MESSAGE-ID)])');
}
*/
/*
$connect = '{gmail-imap.l.google.com:993/imap/ssl/novalidate-cert}';	
$stream = imap_open($connect, 'bjcullinan@gmail.com', '%rm0#B&Z59$*LOr7') or die("can't connect: " . imap_last_error());

$list = array_map('stripslashes', array_values(imap_list($stream, $connect, '*')));
print_r($list);

$info = imap_mailboxmsginfo($stream);
print_r($info);
*/

$sock = fsockopen('tls://bjcullinan.com', 465, $errno, $errstr, 30);
if (!$sock) {
	echo '$errstr ($errno)<br />\n';
} else {
	
	print fgets($sock);
	
	print sendCommand('HELO bjcullinan.com');
	
	print sendCommand('AUTH LOGIN');

	print sendCommand(base64_encode('bjcullinan'));
	
	print sendCommand(base64_encode('this computer is 1337'));
	//print sendCommand(base64_encode('%rm0#B&Z59$*LOr7'));
	//print sendCommand('HELO bjcullinan.com');
	
	print sendCommand('MAIL From: <bjcullinan@bjcullinan.com>');
	
	print sendCommand('RCPT To: <bjcullinan@gmail.com>');
	
	print sendCommand('DATA');
	
	print sendCommand('From: "Brian Cullinan" <bjcullinan@bjcullinan.com>', false);
	
	print sendCommand('To: bjcullinan@gmail.com', false);
	
	print sendCommand('Subject: this is a test', false);
	
	print sendCommand("\r\n", false);
	
	print sendCommand('This is a test', false);
	
	print sendCommand("\r\n.");
	
	print sendCommand('QUIT');
	//print sendCommand('AUTH LOGIN');
}





