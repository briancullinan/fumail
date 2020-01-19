<?php include_once 'config.php'; ?>
<div class="dialog" id="how">
<p>Thanks to advances in web technology, new HTML 5 standards specify how data can be stored in a web browser.  This gives our browsers a whole new field of exciting applications.  In particular an application for creating secure, ecrypted email.</p>
<p>Log in with an existing e-mail account.  We dont care what the e-mail account is, all we care is that your login is successful.  Our servers act as a proxy to your e-mail account.  We don't store any private information.</p>
<p>A certificate public/private key pair is created.  The private key is stored in a local store inside your web browser.  We recommend YOU back up your private keys and keep it safe, just like a wallet or ID.</p>
<p>Your public key is uploaded and stored on our server, for contact management purposes.</p>
<h3>When you write an email:</h3>
<p>When you write a new email all participants in the email are analyzed to determine a security level.  If no secure relationship has been established, you will be notified immediately.</p>
<p>If you prefer to send the email anyways, without any encryption, the participant is checked for Secure Post.  Secure Post is a standard which allows SMTP (out-going mail) to be encrypted over SSL.  This prevents a man in the middle attack between our servers and the receiving end.  If no Secure Post can be detected, you will be notified immediately.</p>
<p>If a secure relationship has been set up with a contact, the email is encrypted with their public key (stored on our server, or stored in your local store).  The email is encrypted in your browser; that is no readable information is ever sent to our servers.  The encrypted package is uploaded, the recipients of the email and the subject are added to the envelope and the email is sent with full PGP encryption support.</p>
<h3>How to set up a secure relationship:</h3>
<p>Setting up a secure relationship is simple, and can be done in various ways.  Public keys can be exchanged at any time, over any medium.  They can always be added to the contact manager; as long as you trust the person it came from.</p>
<p>The difficulty of public key exchange is knowing that the public key came from the right person.</p>
<p>Using our key exchange process is easy.  Enter an easy to remember password, then tell your friend the password over another medium (such as phone, Facebook, or instant message).  When your friend enters the password on their end, the public keys are exchanged.</p>
<h3>Setting up FUMAIL on multiple devices is easy:</h3>
<p>Just copy your web-browsers local store, or backup your private key and transfer it to your other device.</p>
<p>If you have FuMail open on both devices, simply enter the synchronization key.  Your private information will be encrypted and temporarily uploaded so that your device can download it on the other end.</p>
<h3>Copying public keys is easy:</h3>
<p>Backup your public key store, or use our contact manager to keep track of public keys.</p>
<h3>Revoking your public key:</h3>
<p>If your public key is lost or stolen (for example, you accidently send it to a spammer), you may revoke your public key.  Our servers will notify your friends that your public key has been revoked.  You will be notified any time you get an email encrypted with your expired public keys.</p>
<p>When you create a new public key, you can re-establish your trusted connection with whichever friends you like.</p>
<h3>What if you lose or forget your password?</h3>
<p>If your private key falls in to the wrong hands, someone could send messages pretending to be you.  Simply revoke your key and all users with your last key will be warned that your key has changed.</p>
<p>If you lose your private key, your emails can be recovered from your local store.  There is no way for you to recover emails from our servers without your private key.  Your private key is very important, and it is your responsibility to keep it safe.</p>
<h3>If you don’t read my email, how do I search?</h3>
<p>When the email reaches your web-browser on your local computer, our offline mail client searches for unique strings and subjects inside the email.  These key words can be many or few based on your preference.  Search tags can be added by you at any time to an email.  These tags are hashed and uploaded to our servers where they are stored for later use.</p>
<p>When you perform a search, we add in all the synonyms of words you used, hash the words, then search our database of hashes for the search term.  You can always search your local storage for the search term, in addition to the search hashes.</p>
<h2>NO SPAM, NO ADVERTISEMENTS,<br /> COMPLETELY SECURE END-TO-END</h2>
<p>Features are split in to two categories of privacy and security shown below:</p>
<table class="fancy">
<thead>
<tr>
<th>Feature</th>
<th>Trust Us a Little Bit</th>
<th>Trust No-one</th>
</tr>
</thead>
<tbody>
<tr>
<td>Storing your private key</td>
<td colspan="2">That is entirely your responsibility.  Our servers NEVER see your private key.</td>
</tr>
<tr>
<td>Storing your friends public keys</td>
<td>Using our contact manager.  Public keys are intended to be public, if someone mistakenly gets ahold of it, it isn't the end of the world.</td>
<td>Using your private key store.  Your local store can hold a few keys, keys can always be backed-up, restored, and reloaded, when you go to send emails.</td>
</tr>
</tbody>
<tr>
<td>Backing up keys and recovery</td>
<td colspan="2">Whether the key is stored in our contact manager or your private keys and friend’s keys are stored in your local store, you ALWAYS have the option to backup.  The keys are nicely packaged in to a zip file and can be saved anywhere you like.</td>
</tr>
<tr>
<td>Search my emails</td>
<td>The subject line can always be searched.  In addition, you can set up terms for each email which can be searched later.</td>
<td rowspan="2">Searching your local store is always an option; emails must be downloaded locally for this.</td>
</tr>
<tr>
<td>Advanced search</td>
<td></td>
</tr>
<tr>
<td>I forget my password</td>
<td></td>
<td></td>
</tr>
<tr>
<td>Client access</td>
<td colspan="2">You can always use Outlook or Thunderbird.  Outlook uses S/MIME, with the small difference that you trust our service as the certificate authority.<br />
For unencrypted email you can use your Secure Post and Secure IMAP server to access your email.</td>
</tr>
<tr>
<td>Running your own server</td>
<td colspan="2">We will use Secure Post whenever possible to deliver email.  If you prefer to use your own email server, you are welcome to do so.  Our web-based software is completely free; you can download and serve the pages just like you would a website.  We use zero obfuscation and we have nothing to hide.</td>
</tr>
</table>
</div>

