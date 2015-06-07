var _ = require('underscore'),
    colors = require('colors'),
    Promise = require('bluebird'),
    sonos = require('sonos'),

    argv = require('minimist')(process.argv.slice(2), {
      default: {
        apiUrl: 'https://slack.com/api/',
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
  request.post({
    url: argv.apiUrl + '/channels.setTopic',
    form: {
      token: argv.token,
      channel: channel.match(/^#/) ? channel : '#' + channel,
      topic: track.artist + ' - ' + track.title
    }
  }, function (err) {
    err && error(err);
  });
}

// This sonos node lib does not handle multiple devices very well.
function getMasterDevice () {
  info('Searching for your Sonos system...');

  return new Promise(function (resolve, reject) {
    sonos.search(function (device) {
      device.deviceDescriptionAsync
        .then(device.currentTrackAsync)
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

function checkCurrentTrack () {
  return getMasterDevice()
    .then(function (device) {
      return device.currentTrackAsync();
    })
    .then(function (track) {
      if (!track) {
        return error('Could not find current track!');
      }

      if (currentTrack && track.title === currentTrack.title) {
        return;
      }

      info('New track!', track.title);
      currentTrack = track;
      scrobble(track);
    });
}

function startTrackPoller () {
  info('Starting track poller...');

  checkCurrentTrack();
  setInterval(checkCurrentTrack, argv.pollInterval);
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
