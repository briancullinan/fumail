<?php
include_once 'config.php';
$GLOBALS['tagI'] = 0;

function getDrafts($folders)
{
    $result = array();
    foreach($folders as $i => $folder)
    {
        if(preg_match('/Drafts/i', $folder['name']))
            array_push($result, $folder['name']);
        elseif(preg_match('/\\Drafts/i', $folder['flags']))
            array_push($result, $folder['name']);
    }
    return array_shift($result);
}

function sendCommand($sock, $cmd)
{
	$tag = 'FU' . ++$GLOBALS['tagI'];
	$command = $tag . ' ' . $cmd . "\r\n";
	//print $command;
	fwrite($sock, $command);
	
	$result = '';
	while ($line = fgets($sock)) {
		if(strpos($cmd, 'XOAUTH2') > -1)
			return $line;
		$result .= $line;
		$line = preg_split('/\s+/', $line, 0, PREG_SPLIT_NO_EMPTY);
		$code = $line[0];
		if (strtoupper($code) == $tag) {
			break;
		}
	}
	return $result;
}

function parseHeaders($content)
{
	$result = array();
	if(preg_match_all('/^([\x21-\x39\x3B-\x7E]+?):(.*)$((\r?\n^[ \t]+[^\s]+.*$)*)/im', $content, $matches))
	{
		foreach($matches[0] as $i => $match)
		{
			$parameters = explode(';', $matches[2][$i]);
			if(strtolower(trim($matches[1][$i])) == 'content-type' ||
				strtolower(trim($matches[1][$i])) == 'content-disposition')
			{
				$result[strtolower(trim($matches[1][$i]))] = trim(array_shift($parameters));
			}
			else
			{
				$result[strtolower(trim($matches[1][$i]))] = trim($matches[2][$i]) . preg_replace('/\r?\n^[ \t]+/im', '', trim($matches[3][$i]));
			}
			foreach($parameters as $j => $param)
			{
				// the part is a key : value
				$kvPair = preg_match('/^\s+([\x21-\x39\x3B-\x7E]+?)=(.*)$/im', $param, $groups);
				if($kvPair)
				{
					if(!isset($result['parameters']))
						$result['parameters'] = array();
					$result['parameters'][strtolower(trim($groups[1]))] = preg_replace('/^"|"$/im', '', trim($groups[2]));
				}
			}
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
    if(isset($_POST['type']) && $_POST['type'] == 'google')
        $host_port = array('gmail.com');
	
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
	
	// check if using a gmail account
	if(isset($_POST['type']) && $_POST['type'] == 'google')
	{
		$auth = sendCommand($sock, 'AUTHENTICATE XOAUTH2 ' . base64_encode('user=' . $user . "\1auth=Bearer " . $_POST['access'] . "\1\1"));
        if(strpos($auth, ' NO ') || strpos($auth, ' BAD '))
		{
			header('HTTP/1.1 401 Login failed');
			exit;
		}
	}
	else
	{
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
	}
	
	// load folder list
	$folders = sendCommand($sock, 'LIST "" "*"');
	if(strpos($folders, ' OK ') === false)
	{
		header('HTTP/1.1 401 Folder list failed');
		exit; // display error and exit
	}
	else
	{
		$list = preg_split('/\r*\n*^\*\s|\r?\n/im', $folders);
		foreach($list as $j => $folder)
		{
			if(!preg_match('/^LIST\s+\((\\\\[a-z]+\s*)*\)\s+"([^"]*)"\s+("?)((INBOX\2*)*(.*))\3\s*$/i', $folder, $groups) ||
				stripslashes($groups[6]) == '')
				unset($list[$j]);
			else
				$list[$j] = array(
					'flags' => $groups[1],
					'delim' => stripslashes($groups[2]),
					'name' => stripslashes($groups[6]),
					'orig' => stripslashes($groups[4])
				);
		}
	}
	$list = array_values($list);

	// switch to the selected path if it is in the list
	if(isset($_POST['path']) && $_POST['path'] != '')
	{
        if($_POST['path'] == '__--compose')
            $_POST['path'] = getDrafts($list);
		foreach($list as $j => $item)
		{
			if($_POST['path'] == $item['name'])
			{
				$mailbox = $item['name'];
				$select = sendCommand($sock, 'SELECT "' . addslashes($item['orig']) . '"');
				$status = sendCommand($sock, 'STATUS "' . addslashes($item['orig']) . '" (MESSAGES RECENT UNSEEN)');
				break;
			}
		}
	}
	
	// default to INBOX
	if(!isset($select))
	{
		$select = sendCommand($sock, 'SELECT "INBOX"');
		$status = sendCommand($sock, 'STATUS "INBOX" (MESSAGES RECENT UNSEEN)');
		$mailbox = '';
	}
	$recent = preg_match('/RECENT\s+([0-9]*)/i', $status, $groups);
	$recent = $groups[1];
	$unseen = preg_match('/UNSEEN\s+([0-9]*)/i', $status, $groups);
	$unseen = $groups[1];
	$messages = preg_match('/MESSAGES\s+([0-9]*)/i', $status, $groups);
	$messages = $groups[1];
	
	// load a single message
	if(isset($_POST['id']) && intval($_POST['id']) != 0)
	{
		$id = intval($_POST['id']);
		$headers_raw = sendCommand($sock, 'FETCH ' . $id . ' (UID FLAGS RFC822.SIZE BODY.PEEK[HEADER])');
		if(preg_match('/^\*\s+(' . $id . ')\s+FETCH\s+\(.*?\{(?P<length>[0-9]+)\}.*$/im', $headers_raw, $groups, PREG_OFFSET_CAPTURE))
		{
			$header = substr($headers_raw, $groups[0][1] + strlen($groups[0][0]), $groups['length'][0]);
			$headers = parseHeaders($header);
			$size = preg_match('/^\*\s+(' . $id . ')\s+FETCH\s+\(.*?RFC822.SIZE\s+([0-9]+).*$/im', $headers_raw, $groups);
			$size = $groups[2];
			$flags = preg_match('/^\*\s+(' . $id . ')\s+FETCH\s+\(.*?FLAGS\s+\(((\\?[a-z]*\s*)*)\).*$/im', $headers_raw, $groups);
			$flags = $groups[2];
			$headers['msgno'] = $id;
			$headers['size'] = $size;
			$headers['flags'] = $flags;
		}
		else
		{
			header('HTTP/1.1 401 Headers fetch failed');
			exit;
		}
		
		// get the body structure and headers for each part
		$fetch_raw = sendCommand($sock, 'FETCH ' . $id . ' (BODY)');
		if(preg_match('/^\*\s+(' . $id . ')\s+FETCH\s+\(BODY\s+\((.*)\)\)/im', $fetch_raw, $groups, PREG_OFFSET_CAPTURE))
		{
			$safety = 100;
			$headers['parts'] = new ArrayObject(array('text' =>
                // check params for multi-level MIME structure
                substr($groups[2][0], 0, 1) == '(' ? $groups[2][0] : ('(' . $groups[2][0] . ')')));
			$headers['bodies'] = new ArrayObject();
			$parts = array();
			$bodies = array();
			array_push($parts, $headers['parts']);
			array_push($bodies, $headers['bodies']);
			do
			{
				$current = array_pop($parts);
				$body = array_pop($bodies);
				preg_match_all('~ \( ( (?>[^()]+) | (?R) )* \) ~x', $current['text'], $matches, PREG_OFFSET_CAPTURE);
				foreach($matches[1] as $i => $part)
				{
					$type = strtolower(trim(trim(trim($part[0]), '"')));
					if($type == 'alternative' ||
						$type == 'mixed' ||
						$type == 'digest' ||
						$type == 'parallel' ||
						$type == 'encrypted' ||
						$type == 'related')
					{
						$current[$i] = new ArrayObject(array(
							'parts' => new ArrayObject(array(
								'text' => substr($matches[0][$i][0], 1, strlen($matches[0][$i][0]) - 2),
								'prefix' => (isset($current['prefix']) ? ($current['prefix'] . '.') : '') . ($i + 1)
							)),
							'bodies' => new ArrayObject(),
							'content-type' => $type,
							));
						array_push($parts, $current[$i]['parts']);
						array_push($bodies, $current[$i]['bodies']);
					}
					else
					{
						if(preg_match('/"(?P<type>[^"]*)"\s+"(?P<subtype>[^"]*)"\s+\((?P<params>[^)]*)\)\s+(?P<bodyid>.*?)\s+(?P<description>.*?)\s+"(?P<encoding>[^"]*)"\s+(?P<length>[0-9]*)/i', $matches[0][$i][0], $partMatches))
						{
							$params = preg_split('/"[ "]*/im', $partMatches['params'], -1, PREG_SPLIT_NO_EMPTY);
							for($j = 0; $j < count($params); $j+=2)
							{
								$params[strtolower(trim($params[$j]))] = $params[$j+1];
								unset($params[$j]);
								unset($params[$j+1]);
							}
							$current[$i] = array(
								'content-type' => strtolower($partMatches['type'] . '/' . $partMatches['subtype']),
								'parameters' => $params,
								'text' => $matches[0][$i][0],
								'content-transfer-encoding' => strtolower($partMatches['encoding']),
								'size' => intval($partMatches['length']),
								'part-id' => (isset($current['prefix']) ? ($current['prefix'] . '.') : '') . ($i + 1),
                                'body-id' => trim(trim(trim($partMatches['bodyid']), "\"<>\r\n\t "))
							);
							
							// get this part if it isn't too long for one request otherwise, the user will have to click download

							if($current[$i]['size'] < 24 * 1024 || (
								isset($_POST['download']) && $_POST['download'] == $current[$i]['part-id']))
							{
								$fetch_raw = sendCommand($sock, 'FETCH ' . $id . ' (BODY[' . $current[$i]['part-id'] . '])');
								if(preg_match('/^\*\s+(' . $id . ')\s+FETCH\s+\(.*?\{(?P<length>[0-9]+)\}/im', $fetch_raw, $groups, PREG_OFFSET_CAPTURE))
								{
									$start = $groups[0][1] + strlen($groups[0][0]) + 2;  // trim the first two characters \r\n
									$body[$i] = utf8_encode(substr($fetch_raw, $start, intval($groups['length'][0])));
								}
							}
						}
						else
							$current[$i] = array('text' => $matches[0][$i][0]);
					}
				}
				// save for popping on to $headers in correct order
				unset($current['text']);
				unset($current['prefix']);
				$safety--;
			} while (count($parts) && $safety);
		}
		else
		{
			header('HTTP/1.1 401 Message structure failed');
			exit;
		}
	}
	// list messages and their headers summary
	else
	{
		// try to sort using sort command
		$sort = sendCommand($sock, 'SORT (REVERSE DATE) US-ASCII ALL');
		$sorted = array();
		$ids = preg_match('/\*\s+SORT\s+/i', $sort, $groups);
		if($ids)
		{
			$sort = substr($sort, strlen($groups[0]));
			$ids = preg_match('/^.*?\s+OK\s+/im', $sort, $groups, PREG_OFFSET_CAPTURE);
			$sorted = preg_split('/\s+/im', substr($sort, 0, $groups[0][1]), 0, PREG_SPLIT_NO_EMPTY);
		}
		else
		{
			$sort = sendCommand($sock, 'SEARCH ALL');
			$ids = preg_match('/\*\s+SEARCH\s+/i', $sort, $groups);
			if($ids)
			{
				$sort = substr($sort, strlen($groups[0]));
				$ids = preg_match('/^.*?\s+OK\s+/im', $sort, $groups, PREG_OFFSET_CAPTURE);
				$sorted = preg_split('/[^0-9]/im', substr($sort, 0, $groups[0][1]), 0, PREG_SPLIT_NO_EMPTY);
				$sorted = array_reverse($sorted);
			}
			else
			{
				header('HTTP/1.1 401 Could not load message list');
				exit;
			}
		}
		// paginate
		// start at zero instead of the usual 1 because we 
		//   are using the sorting above to get the actual ID
		$start = intval($_POST['start']);
		$end = min(array(
			intval($_POST['end']) == 0 ? 100 : intval($_POST['end']),
			count($sorted)
		));
		$ids = implode(',', array_slice($sorted, $start, $end - $start));
		$headers_raw = sendCommand($sock, 'FETCH ' . $ids . ' (UID FLAGS RFC822.SIZE BODY.PEEK[HEADER.FIELDS (FROM TO CC BCC DATE DATE ARRIVED SUBJECT MESSAGE-ID)])');
		$headers = array();
		foreach($sorted as $j => $id)
		{
			//* 5 FETCH (FLAGS (\Seen) UID 1401 BODY[HEADER.FIELDS ("FROM" "TO" "CC" "BCC" "DATE" "DATE" "ARRIVED" "SUBJECT" "MESSAGE-ID")] {180}
			if(preg_match('/^\*\s+(' . $id . ')\s+FETCH\s+\(.*?\{(?P<length>[0-9]+)\}.*$/im', $headers_raw, $groups, PREG_OFFSET_CAPTURE))
			{
				$header = substr($headers_raw, $groups[0][1] + strlen($groups[0][0]), $groups['length'][0]);
				$header = parseHeaders($header);
				$size = preg_match('/^\*\s+(' . $id . ')\s+FETCH\s+\(.*?RFC822.SIZE\s+([0-9]+).*$/im', $headers_raw, $groups);
				$size = $groups[2];
				$flags = preg_match('/^\*\s+(' . $id . ')\s+FETCH\s+\(.*?FLAGS\s+\(((\\\\?[a-z]*\s*)*)\).*$/im', $headers_raw, $groups);
				$flags = $groups[2];
				$headers[] = array(
					'msgno' => $id,
					'from' => $header['from'],
					'subject' => $header['subject'],
					'date' => $header['date'],
					'to' => $header['to'],
					'size' => $size,
					'flags' => $flags
				);
			}
		}
	}
	
	// last step before exiting
	print json_encode(array(
		'welcome' => $welcome,
		'connect' => $connect,
		'user' => $user_host[0],
		'host' => $host_port[0],
		'folders' => $list,
		'headers' => $headers,
		'info' => array(
			'recent' => $recent,
			'unseen' => $unseen,
			'messages' => $messages,
			'mailbox' => $mailbox,
			'start' => $start,
			'end' => $end
		)), JSON_PRETTY_PRINT);
		
	ob_end_flush();
	flush();
	exit;
}

// on a get request, provide this blank template ONLY!, 
//   do not put affecting logic in here, all logic should be in the 
//   javascript block that loads this page
?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
<title></title>
<link rel="stylesheet" type="text/css" href="/style.css"/>
<script type="text/javascript" src="/jquery.js"></script>
<script type="text/javascript">
$(document).ready(function () {
	$('body').empty();
	parent.refreshBody.call($(document).get());
});
</script>
</head>
<body id="attachments">
Loading...
</body>
<html>