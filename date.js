module.exports = {
  GOOD_DAYS: [
    {
      day: 'Thu Aug 03 2017',
      after: '07:00 pm',
      before: '10:00 pm',
      rank: 3, // higher is better
    },
    {
      day: 'Mon Sep 04 2017',
      after: '10:45 am',
      before: '01:00 pm',
      rank: 2,
    },
    {
      day: 'Wed Oct 11 2017',
      after: '07:45 am',
      before: '10:30 am',
      rank: 1,
    },
  ],

  BAD_DAYS: [
    'Wed Jul 26 2017',
    'Fri Jul 28 2017',
    'Fri Aug 04 2017',
    'Sat Aug 05 2017',
    'Sun Aug 06 2017',
    'Mon Aug 07 2017',
    'Tue Aug 08 2017',
    'Fri Aug 11 2017',
    'Mon Aug 14 2017',
    'Wed Aug 16 2017',
    'Tue Aug 22 2017',
    'Sat Aug 26 2017',
    'Sun Aug 27 2017',
    'Fri Sep 01 2017',
    'Sat Sep 02 2017',
    'Sun Sep 03 2017',
  ],

  dateInGoodRange: function (date) {
    return this.getDateRank(date) > 0;
  },

  dateInBadRange: function (date) {
    var _this = this;
    return this.BAD_DAYS.some(function (badDay) {
      return _this.sameDay(date, new Date(badDay));
    });
  },

  sameDay: function (date1, date2) {
    return date1.getDay() === date2.getDay() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getYear() === date2.getYear();
  },

  getDateRank: function (date) {
    var goodDay = this.GOOD_DAYS.filter(function (info) {
      var after = new Date(info.day + ' ' + info.after);
      var before = new Date(info.day + ' ' + info.before);
      return date > after && date < before;
    })[0];
    return goodDay && goodDay.rank || 0;
  },

  betterDate: function (newDate, oldDate) {
    if (this.dateInBadRange(newDate)) {
      return false;
    }
    var newDateRank = this.getDateRank(newDate);
    var oldDateRank = this.getDateRank(oldDate);
    if (newDateRank === oldDateRank) {
      return newDate < oldDate;
    }
    return newDateRank > oldDateRank;
  },

  createDateFromDayAndTime: function (day, time) {
    return new Date(day + ' ' + time.replace(' Available', ''));
  }

};
