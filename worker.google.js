// get contacts
window = {};
importScripts('/jsonselect.js');
importScripts('/linq/linq.js');
importScripts('/mail.js');
var J = window.JSONSelect;

function sortContacts(a, b)
{
	var aTitle = firstNonEmpty(a),
		bTitle = firstNonEmpty(b);
	return (aTitle || '').toLowerCase().localeCompare((bTitle || '').toLowerCase());
}

function firstNonEmpty(entry)
{
    var result = Enumerable
        .From(J
            .match('.title .text, .gd_name .children .text, .gd_email .address', entry))
        .OrderByDescending(function (x) { return ('' + x).length})
        .OrderByDescending(function (x) {
            if(matchFirstLast.test('' + x))
                return 10 + ('' + x).split(/\s+/igm).length;
            else if (matchEmail.test('' + x))
                return 5;
            return 0;
        });
    return result.Any() ? result.First() : false;
}

function contactSuccess(data, account)
{
    var entries = typeof account.id != 'undefined'
            ? [data]
            : J.match('.entry>*', data).sort(sortContacts),
        results = [];
    for(var i in entries)
    {
        entries[i].joiningCriteria = Enumerable
            .From(J
                .match('.title .text, .gd_name .children .text, .gd_email .address', entries[i]))
            .OrderByDescending(function (x) { return ('' + x).length})
            .OrderByDescending(function (x) {
                if(matchFirstLast.test('' + x))
                    return 10 + ('' + x).split(/\s+/igm).length;
                else if (matchEmail.test('' + x))
                    return 5;
                return 0;
            })
            .ToArray();
        entries[i].contactAddresses = Enumerable
            .From(J.match('.gd_email .address, .gd_phonenumber .text', entries[i]))
            .OrderByDescending(function (x) { return ('' + x).length})
            .OrderByDescending(function (x) {
                if (matchEmail.test('' + x))
                    return 5;
                return 0;
            }).Select(function (x) {return {href: '#' + account.user +
                                           '$__--contact' +
                                           '#' + x,
                                            text: x}; })
            .ToArray();
    }
    for(var i in entries)
    {
        // find matching items
        /*var matches = Enumerable.From(allContacts).Where(function (x) {
            Enumerable.From(x.joiningCriteria).Any(function (y) {
                return Enumerable.From(entries[i].joiningCriteria).Contains(y);
            });
        });*/
        //entries[i]._join = matches.Any() ? matches.First() : false;
        results[results.length] = {
            id: '#' + account.user +
                '$__--contact' +
                '#' + J.match('.id .text', entries[i])[0].split(/\/base\//i)[1],
            title: Enumerable.From(entries[i].joiningCriteria).First(),
            data: entries[i],
            _join: false //matches.Any() ? matches.First() : false
        };
    }

    // send the sorted contacts
    $.send({response: results});
}

function doWork(account)
{
    // get next page of contacts
    $.ajax.post({
        url: '/google.php',
        dataType: 'json',
        data: {
            user : account.user,
            access : account.access,
            start : typeof account.start == 'undefined' ? 0 : account.start,
            id: account.id
        }, success: function (data) {
            contactSuccess(data, account)
            var next = J.match('.link .attributes:has(.rel:val("next")) .href', data)[0];
            if(next)
            {
                var startMatch = new RegExp(/start-index=([0-9]+)/igm),
                    start = startMatch.exec(next);
                // get next page of contacts
                $.send({_next: {
                    user: account.user,
                    access: account.access,
                    start: parseInt(start[1])
                }});
            }
            $.send({_status: 'done'});
        }
    });
}
