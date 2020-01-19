<?php
/*if(strpos($_SERVER['HTTP_ACCEPT_ENCODING'], 'gzip') > -1)
	ob_start('ob_gzhandler');
else*/
	ob_start();

define('SALT', '%bhLNRXv&caEHIxY7Qs7quizfk%vQtFp');
try
{
	$link = new PDO('mysql:dbname=fumail;host=localhost;charset=utf8', 'fumail', 'fupassword');
	
	$link->setAttribute(PDO::ATTR_EMULATE_PREPARES, false);
	$link->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
}
catch (Exception $e)
{
	header('HTTP/1.1 500 Could not connect to database');
	print($e);
}
