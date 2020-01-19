<?php
include_once 'config.php';

function sendCommand($sock, $cmd, $gets = true)
{
	$command = $cmd . "\r\n";
	fwrite($sock, $command);

    if(!$gets)
        return;

    $result = '';
    while ($line = fgets($sock)) {
        $result .= $line;
        if(strlen($line) <= 4 || $line[3] == ' ')
            break;
    }
    return $result;
}

if($_SERVER['REQUEST_METHOD'] == 'POST')
{
	header("Cache-Control: no-cache, must-revalidate"); // HTTP/1.1
	header("Expires: Sat, 26 Jul 1997 05:00:00 GMT"); // Date in the past
	header('Content-Type: application/json');
	
	// split user field by the last occurring '@' symbol
	$user = $_POST['user'];
	$account_split = strrpos($user, '@');
	if($account_split === false)
	{
		header('HTTP/1.1 500 Could not read account information');
		exit; // display error and exit
	}
	
	$user_host = array(substr($user, 0, $account_split),
		substr($user, $account_split + 1, strlen($user) - $account_split - 1));
	$host_port = explode(':', $user_host[1]);
	
	// validate the username, except allow an email address
	if(!preg_match('/[a-z0-9!#$%&\'*+\/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&\'*+\/=?^_`{|}~-]+)*(@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)*/i', $user_host[0]))
	{
		header('HTTP/1.1 500 Invalid account username');
		exit; // display error and exit
	}
	
	// validate the host and port
	if(!preg_match('/^(?P<host>[a-z0-9\-._~%]+|\[[a-f0-9:.]+\]|\[v[a-f0-9][a-z0-9\-._~%!$&\'()*+,;=:]+\])(:(?P<port>[0-9]+))?$/', $user_host[1]))
	{
		header('HTTP/1.1 500 Invalid host');
		exit; // display error and exit
	}
	
	// perform first connection attempt
	$sock = fsockopen('tls://' . $host_port[0], (count($host_port) > 1 ? $host_port[1] : '465'), $errno, $errstr, 1);
	if (!$sock)
	{
		// TODO: do DNS lookup for where to post
		$sock = fsockopen('tls://' . 'smtp.' . $host_port[0], (count($host_port) > 1 ? $host_port[1] : '465'), $errno, $errstr, 1);
		if (!$sock)
		{
			header('HTTP/1.1 500 Could not connect to host');
			exit; // display error and exit
		}
	}
    $welcome = fgets($sock);
    if(preg_match('/^\s*[134567890][0-9][0-9]/im', $welcome))
    {
        header('HTTP/1.1 500 Could not connect to host');
        exit; // display error and exit
    }

	$greeting = sendCommand($sock, 'EHLO ' . $host_port[0]);
    // TODO: ignore error handling here?

	// authenticate
	$login = sendCommand($sock, 'AUTH LOGIN');
	$login += sendCommand($sock, base64_encode($user_host[0]));
	$login += sendCommand($sock, $_POST['access']); // already base64 encoded
    if(preg_match('/^\s*[134567890][0-9][0-9]/im', $login))
    {
        // try full e-mail as usename
        $login = sendCommand($sock, 'RESET');
        $login += sendCommand($sock, 'AUTH LOGIN');
        $login += sendCommand($sock, base64_encode($user));
        $login += sendCommand($sock, $_POST['access']); // already base64 encoded
        // TODO: add error handling here
        if(preg_match('/^\s*[134567890][0-9][0-9]/im', $login))
        {
            header('HTTP/1.1 401 Login failed');
            exit; // display error and exit
        }
    }

	if(isset($_POST['mail']))
	{
		// start mail
		$mail = sendCommand($sock, 'MAIL FROM: <' . $_POST['user'] . '>');
        if(preg_match('/^\s*[134567890][0-9][0-9]/im', $mail))
        {
            // TODO: look in to how specific thunderbird is with this, we already know Outlook sucks at this part
            header('HTTP/1.1 500 Failed to post message');
            exit; // display error and exit
        }

        // find all e-mail addresses
        $failed = array();
        if(preg_match_all('/[a-z0-9!#$%&\'*+\/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&\'*+\/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/im', $_POST['to'], $matches))
        {
            foreach($matches[0] as $i => $match)
            {
                $recipient = sendCommand($sock, 'RCPT TO: <' . $match . '>');
                if(preg_match('/^\s*[134567890][0-9][0-9]/im', $recipient))
                {
                    array_push($failed, $match);
                }
            }
        }

		$data = sendCommand($sock, 'DATA');
        if(preg_match('/^\s*[14567890][0-9][0-9]/im', $data))
        {
            header('HTTP/1.1 500 Message sending failed');
            exit; // display error and exit
        }

		$lines = preg_split('/\r*\n/i', $_POST['mail']);
		foreach($lines as $i => $line)
		{
			sendCommand($sock, $line, false);
		}
		$mailed = sendCommand($sock, '.');
        if(preg_match('/^\s*[14567890][0-9][0-9]/im', $mailed))
        {
            header('HTTP/1.1 500 Message sending failed');
            exit; // display error and exit
        }
		$goodbye = sendCommand($sock, 'QUIT');
        // TODO: add error handling here
	}
	
	// last step before exiting
	print json_encode(array(
		'welcome' => $welcome,
		'connect' => $connect,
		'user' => $user_host[0],
		'host' => $host_port[0],
		'greeting' => $greeting,
		'mailed' => $mailed,
		'goodbye' => $goodbye,
        'failed' => $failed
	));
		
	ob_end_flush();
	flush();
	exit;
}


