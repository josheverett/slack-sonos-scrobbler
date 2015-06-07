# slack-sonos-scrobbler

Scrobble your local Sonos queue to a Slack channel.

![Example](http://i.imgur.com/bz8dqjQ.png)

## Usage

Create a bot integration and give it a name. I suggest Scrobbler Bot. Be sure
to invite your bot to the channel you want to scrobble to by @mentioning the
bot in that channel.

From a computer on the same network as your Sonos system:

`node index.js --token=$TOKEN --channel=$CHANNEL`

Where `$TOKEN` is the bot's API token, and `$CHANNEL` is the channel you want
to scrobble to.

Scrobbling works by updating the topic of the channel with the artist and track
name of the current song.
