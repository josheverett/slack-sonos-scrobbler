var _ = require('underscore'),
    colors = require('colors'),
    Promise = require('bluebird'),
    request = require('request'),
    sonos = require('sonos'),

    argv = require('minimist')(process.argv.slice(2), {
      default: {
        apiUrl: 'https://slack.com/api',
        pollInterval: 1000
      }
    }),

    info, success, error,
    currentTrack;

Promise.promisifyAll(sonos.Sonos.prototype);

function log (color /*, ...args */) {
  var args = _.tail(arguments),
      colored = _.map(args, function (arg) {
        return _.isString(arg) ? arg[color] : arg;
      });

  console.log.apply(console, colored);
}

info = log.bind(this, 'blue');
success = log.bind(this, 'green');
error = log.bind(this, 'red');

function scrobble (track) {
  getChannelId(argv.channel)
    .then(function (channelId) {
      return apiRequest('channels.setTopic', {
        channel: channelId,
        topic: track.artist + ' - ' + track.title
      });
    })
    .catch(error);
}

function apiRequest (resource, args) {
  return new Promise(function (resolve, reject) {
    args.token = argv.token;

    request.post({
      url: argv.apiUrl + '/' + resource,
      form: args
    }, function (err, resp, body) {
      if (err) {
        return reject(err);
      }

      try {
        body = JSON.parse(body);
      } catch (e) {
        return reject(e);
      }

      if (body.error) {
        return reject(body.error);
      }

      resolve(body);
    });
  });
}

function getChannelId (channelName) {
  channelName = channelName.match(/^#/) ? channelName.slice(1) : channelName;

  return apiRequest('channels.list', { exclude_archived: 1 })
    .then(function (resp) {
      return _.findWhere(resp.channels, { name: channelName }).id;
    });
}

// This sonos node lib does not handle multiple devices very well.
function getMasterDevice () {
  info('Searching for your Sonos system...');

  return new Promise(function (resolve, reject) {
    sonos.search(function (device) {
      device.currentTrackAsync()
        .then(function (track) {
          if (!isNaN(track.duration)) {
            success('Master device found.');
            resolve(device);
          }
        })
        .catch(reject);
    });
  });
}

function checkCurrentTrack (device) {
  device.currentTrackAsync()
    .then(function (track) {
      if (!track) {
        return error('Could not find current track!');
      }

      if (currentTrack && track.title === currentTrack.title) {
        return;
      }

      success('New track!', track.title);
      currentTrack = track;
      scrobble(track);
    });
}

function startTrackPoller (device) {
  var boundCheckCurrentTrack = checkCurrentTrack.bind(null, device);

  info('Starting track poller...');

  boundCheckCurrentTrack();
  setInterval(boundCheckCurrentTrack, argv.pollInterval);
}

getMasterDevice()
.then(startTrackPoller)
.catch(function (e) {
  error('Ah crap something broke:');
  throw e;
});

// For sending test scrobbles.
if (argv.debug) {
  scrobble(argv);
}
