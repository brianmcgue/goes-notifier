var config = require('./config');
var dateFunctions = require('./date');
var casper = require('casper').create();
var fs = require('fs');
var path = require('path');

var currentAppointmentPath = '/path/to/goes-notifier/current_appointment.json';
var fileData = fs.read(currentAppointmentPath);
var appointmentData = JSON.parse(fileData);

var url = 'https://goes-app.cbp.dhs.gov/goes/jsp/login.jsp';
var username = config.username;
var password = config.password;
var airport = config.airport;
var accountSid = config.twilio.accountSid;
var serviceSid = config.twilio.serviceSid;
var authToken = config.twilio.authToken;
var toNumber = config.twilio.toNumber;
var fromNumber = config.twilio.fromNumber;
var twilioLinked = (
  accountSid &&
  serviceSid &&
  authToken &&
  toNumber &&
  fromNumber
);
var providedDay;
var availableTimes;
var betterTime;
var betterAppointment;
var notify;

function getCurrentAppointment() {
  return new Date(appointmentData.currentAppointment);
}

function recordNewAppointment(newDay) {
  var previousAppointment = getCurrentAppointment();
  var newAppointmentData = {
    currentAppointment: newDay,
    previousAppointment: previousAppointment,
    allPreviousAppointments: appointmentData.allPreviousAppointments.concat(previousAppointment)
  };
  fs.write(currentAppointmentPath, JSON.stringify(newAppointmentData), 'w');
}

function notifyTwilio(newAppointment) {
  this.open(
    'https://' + accountSid + ':' + authToken + '@' +
    'api.twilio.com/2010-04-01/Accounts/' + accountSid + '/Messages',
    {
      method: 'post',
      data: {
        To: toNumber,
        From: fromNumber,
        Body: 'New appointment slot open: ' + newAppointment,
        MessagingServiceSid: serviceSid,
      },
    }
  ).then(function() {
    require('utils').dump(this.getPageContent());
  });
}

function CasperException(message, stack) {
  this.name = 'CasperException';
  this.message = message;
  this.stack = stack;
}

casper.on('error', function(msg, backtrace) {
  this.echo('Exception: ' + msg + backtrace);
  this.capture('./out/error.png');
  throw new CasperException(msg, backtrace);
});

casper.on('remote.message', function(msg) {
  this.echo('remote console.log:' + msg);
});

casper.start(url);

casper.then(function() {
  this.echo('Landed on page: ' + this.getTitle());
});

casper.then(function() {
  this.echo('Clicking on login button...');
  this.wait(1000, function () {
    this.fillSelectors('form[action="/goes/security_check"]', {
      'input[name="j_username"]': username,
      'input[name="j_password"]': password,
    }, true);
  });
});

casper.then(function() {
  this.echo('Waiting for checkbox...');
  this.waitForSelector('#checkMe');
});

casper.then(function() {
  this.echo('Checkbox found. Clicking on checkbox...');
  this.click('#checkMe');
});

casper.then(function() {
  this.echo('Waiting on manage appointments button...');
  this.waitForSelector('input[name="manageAptm"]');
});

casper.then(function() {
  this.echo('Appointments button found. Clicking on button...');
  this.click('input[name="manageAptm"]');
});

casper.then(function() {
  this.echo('Waiting on reschedule appointment button...');
  this.waitForSelector('input[name="reschedule"]');
});

casper.then(function() {
  this.echo('Reschedule button found. Clicking on button...');
  this.click('input[name="reschedule"]');
});

casper.then(function() {
  this.echo('Waiting on airport table...');
  this.waitForSelector('.sectionheader');
});

casper.then(function() {
  this.echo('Airport table found, selecting next...');
  this.click('input[value="' + airport + '"]');
  this.click('input[name="next"]');
});

casper.then(function() {
  this.echo('Waiting on calendar to render...');
  this.waitForSelector('.date');
});

casper.then(function() {
  this.echo('Calendar found. Parsing date...');
  var day = this.getHTML('.date td');
  var monthYear = this.getHTML('.date tr:last-child div');
  providedDay = day + ' ' + monthYear; // global
});

casper.then(function() {
  this.echo('Date found: ' + providedDay);
  availableTimes = this.getElementsAttribute('.entry', 'title');
});

casper.then(function () {
  var currentAppointment = getCurrentAppointment();
  this.echo('Current appointment: ' + currentAppointment);
  betterTime = availableTimes.filter(function (time) {
    var potentialDay = dateFunctions.createDateFromDayAndTime(providedDay, time);
    return dateFunctions.betterDate(potentialDay, currentAppointment);
  })[0];
});

casper.then(function () {
  if (betterTime) {
    this.echo('Choosing the better available time: ' + betterTime);
    this.click('.entry[title="' + betterTime + '"]');
  } else {
    this.echo('No better time available, exiting...')
  }
});

casper.then(function () {
  if (betterTime) {
    this.echo('Filling in reason for new appointment');
    this.fillSelectors('form[name="ConfirmationForm"]', { '#comments': 'Better timing' });
    this.click('input[name="Confirm"]');
  }
});

casper.then(function() {
  if (betterTime) {
    this.echo('Waiting for confirmation...');
    this.capture('final.png')
    this.waitForSelector('.sectionheader');
  }
});

casper.then(function() {
  if (betterTime && this.getHTML('.sectionheader') === 'Interview Scheduled ') {
    betterAppointment = dateFunctions.createDateFromDayAndTime(providedDay, betterTime);
    this.echo('Better appointment slot available: ' + betterAppointment);
    recordNewAppointment(betterAppointment);
    this.echo('Interview Scheduled');
    notify = true;
  }
});

casper.then(function() {
  if (twilioLinked && notify) {
    notifyTwilio.bind(this)(betterAppointment);
  }
});

casper.run(function() {
  this.echo('Done');
  this.exit();
});
