<?php
include_once 'config.php';
$GLOBALS['tagI'] = 0;
function sendCommand($sock, $cmd)
{
	$tag = 'FU' . ++$GLOBALS['tagI'];
	$command = $tag . ' ' . $cmd . "\r\n";
	//print $command;
	fwrite($sock, $command);
	
	$result = '';
	while ($line = fgets($sock)) {
		$result .= $line;
		$line = preg_split('/\s+/', $line, 0, PREG_SPLIT_NO_EMPTY);
		$code = $line[0];
		if (strtoupper($code) == $tag) {
			break;
		}
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
	$sock = fsockopen('ssl://' . $host_port[0], count($host_port) > 1 ? $host_port[1] : '993', $errno, $errstr, 1);
	if (!$sock)
	{
		// TODO: try a different port
		$sock = fsockopen('ssl://' . 'imap.' . $host_port[0], (count($host_port) > 1 ? $host_port[1] : '993'), $errno, $errstr, 1);
		if (!$sock)
		{
			header('HTTP/1.1 500 Could not connect to host');
			exit; // display error and exit
		}
	}
	$welcome = fgets($sock);
	
	// authenticate
	$auth = sendCommand($sock, 'LOGIN "' . addslashes($user_host[0]) . '" "' . addslashes(base64_decode($_POST['access'])) . '"');
	// check for failure
	if(strpos($auth, ' NO ') || strpos($auth, ' BAD '))
	{
		// try full e-mail as usename
		$auth = sendCommand($sock, 'LOGIN "' . addslashes($user) . '" "' . addslashes(base64_decode($_POST['access'])) . '"');
		if(strpos($auth, ' NO ') || strpos($auth, ' BAD '))
		{
			header('HTTP/1.1 401 Login failed');
			exit; // display error and exit
		
		}
	}

	// last step before exiting
	print json_encode(array(
		'welcome' => $welcome,
		'connect' => $connect,
		'user' => $user_host[0],
		'host' => $host_port[0]), JSON_PRETTY_PRINT);
		
	ob_end_flush();
	flush();
	exit;

}

?>
<div class="dialog" id="login">
	<div id="accounts"><p>Sign in with an existing e-mail account, our servers act like a simple relay to your e-mail. <a href="#how">Learn more</a> about this process.</p></div>
    <ul id="login-types">
        <li><a href="#login-google"><span class="google"></span>Sign in with Google/GMail</a></li>
        <li><a href="#login-yahoo">Sign in with Yahoo!<span> coming soon!</span></a></li>
        <li><a href="#login-facebook">Sign in with Facebook<span> coming soon!</span></a></li>
        <li><a href="#login-twitter">Sign in with Twitter<span> coming soon!</span></a></li>
        <li><a href="#login-linkedin">Sign in with LinkedIn<span> coming soon!</span></a></li>
        <li><a href="#login-other">Sign in with IMAP</a>
	        <div id="other-entry"><p><span>Email address</span><input name="email" type="text" id="email" /></p>
            	 <p><span>Password</span><input name="password" type="password" id="pass" /></p></div></li>
    </ul>
</div>
