// look at path to load right tab
jQuery(document).ready(function () {

    function checkHash(evt)
    {
        if(jQuery(window.location.hash).length > 0 && jQuery(window.location.hash).is('.dialog'))
        {
            jQuery('.dialog').hide(200);
            jQuery(window.location.hash).show(300);
        }
    }

    $(window).on('hashchange', checkHash);
    // TODO: determine if we should go to #mail because it's set up
    if(window.location.hash == '')
    {
        window.location.hash = 'intro';
    }
    else
        $(window).trigger('hashchange');

});