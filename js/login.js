jQuery(document).ready(function () {

    jQuery('body').on('click', 'a[href="#login-other"]', function (evt) {
        evt.preventDefault();

        var entry = jQuery('#other-entry:hidden');
        if(entry.length > 0)
        {
            entry.show(400);
            return;
        }

        var email = jQuery('#email');
        if(email.val().trim() == '' ||
            !(/^(?:[a-z0-9!#$%&'*+\/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+\/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)$/i).test(email.val().trim()))
        {
            email.focus();
            return;
        }

        var pass = jQuery('#pass');
        if(pass.val().trim() == '')
        {
            pass.focus();
            return;
        }

        // encode as base64 and send to proxy
        // try to connect to server from email
        var userServerSplit = email.val().split(/@/),
            user = userServerSplit[0],
            hostPort = userServerSplit[1],
            hostPortSplit = hostPort.split(/:/),
            host = hostPortSplit[0],
            port = typeof hostPortSplit[1] != 'undefined' ? hostPortSplit[1] : 993;

        // Write your code in the same way as for native WebSocket:
        var ws = new WebSocket('ws://' + host + ':' + port);
        ws.onopen = function() {
            console.log('connected');
            ws.send("HELO");  // Sends a message.
        };
        ws.onmessage = function(e) {
            // Receives a message.
            console.log(e.data);
        };
        ws.onclose = function() {
            console.log("closed");
        };

        //var account = {user: email, pass: $base64, type: 'other'};
        //addAccount(account);

    });

});