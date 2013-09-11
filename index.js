module.exports = process.env.roundabout_COV
  ? require('./lib-cov/roundabout')
  : require('./lib/roundabout');
