<?php include_once 'config.php'; ?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <meta name="viewport" content="target-densitydpi=device-dpi, initial-scale=1.0, user-scalable=no" />
    <title>Welcome to FUMAIL</title>
    <script type="text/javascript" src="/rollups/sha1.js"></script>
    <script type="text/javascript" src="/rollups/tripledes.js"></script>
    <script type="text/javascript" src="/jquery.js"></script>
    <script type="text/javascript" src="/jquery.hive.js"></script>
    <script type="text/javascript" src="/jquery.scrollintoview.js"></script>
    <script type="text/javascript" src="/jquery.watermark.min.js"></script>
    <script type="text/javascript" src="/jquery-te-1.4.0.js"></script>
    <script type="text/javascript" src="/jquery.scoped.js"></script>
    <script type="text/javascript" src="/jquery.sticky.js"></script>
    <script type="text/javascript" src="/jquery-ui.autocomplete.js"></script>
    <script type="text/javascript" src="/google.js"></script>
    <script type="text/javascript" src="/jsonselect.js"></script>
    <script type="text/javascript" src="/linq/linq.js"></script>
    <script type="text/javascript" src="/linq/jquery.linq.js"></script>
    <script type="text/javascript" src="/mail.js"></script>
    <script type="text/javascript" src="/nav.js"></script>
    <link rel="stylesheet" type="text/css" href="/style.css"/>
    <link rel="stylesheet" type="text/css" href="/media.css"/>
</head>

<body>
<div id="nav">
    <div id="search"><input name="search" type="text" /></div>
    <ul id="menu">
        <li><a href="#mail"><span>Mail</span></a></li>
        <li><a href="#folders"><span>Folders</span></a></li>
        <li><a href="#contacts"><span>Contacts</span></a></li>
        <li><a href="#write"><span class="pen">Write</span></a></li>
        <li><a href="#login"><span class="settings">Sign in</span></a></li>
        <li><a href="#keys"><span class="key">Keys</span></a></li>
        <li><a href="#how">Learn more<span class="how">?</span></a></li>
    </ul>
    <ul id="folders"></ul>
    <ul id="contacts"></ul>
</div>
<div id="content">
    <div id="menubar">
        <h1><a href="#menu">FuMail</a></h1>
    </div>
    <?php include 'intro.php'; ?>
    <?php include 'how.php'; ?>
    <?php include 'login.php'; ?>
    <?php include 'keys.php'; ?>
    <div id="paging">
        <span id="count"></span>
        <a href="#back" class="little-btn"><span class="back"></span></a><a href="#next" class="little-btn"><span class="next"></span></a>
    </div>
    <div id="mail" class="dialog"></div>
</div>
<div id="templates">
    <div class="message">
        <a class="little-btn" href="#close-message"><span class="close"></span></a>
        <a class="title" href="{link}"><b>{from}</b>{subject}</a>
        <div class="actions"><a class="little-btn" href="#forward"><span class="forward"></span></a>
             <a class="little-btn" href="#reply-all"><span class="reply-all"></span></a>
             <a class="little-btn" href="#reply"><span class="reply"></span></a></div>
        <div class="headers"><span><b>From:</b>{fromfull}</span>
                    <span><b>Date:</b>{date}</span>
                    <span><b>To:</b>{to}</span>
                    <a href="#all_headers">Show all headers</a>
                    <span>{subject}</span></div>
        <div class="attachments"></div>
        <div class="body"></div>
    </div>
    <div class="message compose">
        <a class="little-btn" href="#close-message"><span class="close"></span></a>
        <a class="title" href="{link}"><b>{to}</b>{subject}</a>
        <div class="actions"><a class="little-btn" href="#attach"><span class="attach"></span></a>
            <a class="little-btn" href="#format"><span class="format"></span></a>
            <a class="little-btn" href="#send"><span class="send">Send</span></a></div>
        <div class="fields">
            <a class="little-btn checked" href="#sign"><span class="pen">Sign</span></a>
            <a class="little-btn checked" href="#encrypt"><span class="key">Encrypt</span></a>
            <div class="from"><select></select></div>
            <div><input class="recipients" type="email" />
            <input class="subject" type="text" /></div></div>
        <textarea>{message}</textarea>
        <div class="response"></div>
        <a class="little-btn" href="#cancel-send"><span class="send">Cancel send</span></a>
    </div>
    <div class="message contact">
        <a class="little-btn" href="#close-message"><span class="close"></span></a>
        <a class="title" href="{link}"><b>{title}</b></a>
        <div class="body"><pre>{contact}</pre></div>
    </div>
</div>
</body>
</html>