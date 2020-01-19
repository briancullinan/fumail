<?php

function sanitizeName($name) {
    return strtolower(preg_replace('/[^a-z0-9_-]/im', '_', $name));
}

function xmlObjToArr($obj) {
	$namespace = $obj->getDocNamespaces(true);
	$namespace[NULL] = NULL;
   
	$children = array();
	$attributes = array();
	$name = strtolower((string)$obj->getName());
   
	$text = trim((string)$obj);
	if( strlen($text) <= 0 ) {
		$text = NULL;
	}
   
	// get info for all namespaces
	if(is_object($obj)) {
		foreach( $namespace as $ns=>$nsUrl ) {
			// atributes
			$objAttributes = $obj->attributes($ns, true);
			foreach( $objAttributes as $attributeName => $attributeValue ) {
				$attribName = strtolower(trim((string)$attributeName));
				$attribVal = trim((string)$attributeValue);
				if (!empty($ns)) {
					$attribName = $ns . '_' . $attribName;
				}
				$attributes[$attribName] = $attribVal;
			}
		   
			// children
			$objChildren = $obj->children($ns, true);
			foreach( $objChildren as $childName=>$child ) {
				$childName = strtolower((string)$childName);
				if( !empty($ns) ) {
					$childName = $ns.'_'.$childName;
				}
				$children[$childName][] = xmlObjToArr($child);
			}
		}
	}
   
	return array(
		'name'=>$name,
		'text'=>$text,
		'attributes'=>$attributes,
		'children'=>$children
	);
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
	
	$start = intval($_POST['start']);
// TODO: is there a vulnerability here with returning content not from google's server, can id and access functions be polluted?
    // display single contact
    if(isset($_POST['id']))
        $conn = 'https://www.google.com/m8/feeds/contacts/' . $user . '/full/' . $_POST['id'] . '?v=3.0&access_token=' . $_POST['access'];
    else
    	$conn = 'https://www.google.com/m8/feeds/contacts/' . $user . '/full?v=3.0' . ($start > 0 ? ('&start-index=' . $start) : '') . '&max-results=25&access_token=' . $_POST['access'];
	$ch = curl_init($conn);
	curl_setopt($ch, CURLOPT_PORT , 443);
	curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
	curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
	curl_setopt($ch, CURLOPT_HEADER, false);
	curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
	curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
	
	$output = curl_exec($ch);
	if(curl_errno($ch))
		print curl_error($ch);

	curl_close($ch);   
	
	$xml = new SimpleXMLElement($output);
	$all = xmlObjToArr($xml);
	print json_encode($all, JSON_PRETTY_PRINT);
	exit;
}


?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
</head>
<body>
<script type="text/javascript">

	// check for a code, if there is one, add the account to the accounts list
	var params = {}, 
		queryString = window.location.hash.substring(1),
		regex = /([^&=]+)=([^&]*)/g, m;
	while (m = regex.exec(queryString)) {
		params[decodeURIComponent(m[1])] = decodeURIComponent(m[2]);
	}
	
	if(typeof params['state'] != 'undefined')
		window.parent[params['state']].call(this, params);
	// TODO: insert error handling here, maybe just call some google.js function

</script>
</body>
</html>