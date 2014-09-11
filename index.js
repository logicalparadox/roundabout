/*!
 * Roundabout
 * Copyright(c) 2013 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

/*!
 * Module dependencies
 */

var debug = require('sherlock')('roundabout');
var Duplex = require('stream').Duplex;
var inherits = require('util').inherits;
var params = require('params');
var PassThrough = require('stream').PassThrough;

/*!
 * Memoize
 */

var extend = params.extend;
var getOpts = params.include('objectMode', 'highWaterMark');

/*!
 * Primary exports
 */

module.exports = Roundabout;

/**
 * Roundabout streams start as passthrough streams
 * with the options given. Every subsequent streams
 * added will alter the readable and writable state
 * of the roundabout stream and the internal passthrough
 * streams.
 *
 * @param {Object} Duplex options
 * @return {Roundabout)
 */

function Roundabout(opts) {
  if (!(this instanceof Roundabout)) return new Roundabout(opts);
  Duplex.call(this, opts);

  // roundabout proxy state
  var state = {};
  state.streams = [];
  state.finished = false;
  state.input = new PassThrough();
  state.output = new PassThrough();
  state.input.pipe(state.output);

  // set state
  this._roundaboutState = state;

  // adapt options
  setInputState(this, this);
  setOutputState(this, this);

  var self = this;
  this.on('finish', function() {
    var ws = this._writableState;
    var input = this._roundaboutState.input;
    var iws = input._writableState;
    if (!ws.buffer.length && !iws.buffer.length && !iws.ending) {
      debug('(finish) input.end()');
      input.end();
    }
  });

  // nudge reader
  state.output.on('readable', function() {
    debug('(output) readable: emit _nudge');
    self.emit('_nudge');
  });

  // listen for output end
  state.output.on('end', function() {
    debug('(output) end: emit _nudge');
    state.finished = true;
    self.emit('_nudge');
  });
}

/*!
 * Inherits from Duplex
 */

inherits(Roundabout, Duplex);

/**
 * #### .use(stream)
 *
 * Add a stream to the end of the internal transform stack.
 * A roundabout stream will adjust its `objectMode`
 * and `highWaterMark` settings such that the first
 * stream added sets the writable options and the last
 * stream added sets the readable options.
 *
 * @param {Duplex|Transform} stream
 * @return this
 * @api public
 */

Roundabout.prototype.use = function(dest) {
  var state = this._roundaboutState;
  var input = state.input;
  var output = state.output;
  var streams = state.streams;

  // if first stream undo passthrough
  if (0 === streams.length) {
    input.unpipe(output);
    input.pipe(dest).pipe(output);
    streams.push(dest);
    setInputState(this, dest);

  // else repipe last streams
  } else {
    var i = streams.length - 1;
    streams[i].unpipe(output);
    streams[i].pipe(dest).pipe(output);
    streams.push(dest);
  }

  // handle new state
  setOutputState(this, dest);
  return this;
};

/*!
 * Implement Duplex `_write`. Write incoming data
 * to input stream and push end if the roundabout
 * instance has ended.
 *
 * @param {Mixed} chunk
 * @param {String} encoding
 * @param {Function} callback
 * @api private
 */

Roundabout.prototype._write = function(chunk, enc, cb) {
  var input = this._roundaboutState.input;
  var iws = input._writableState;
  var ws = this._writableState;

  // write to input and wait for flush
  input.write(chunk, enc, function() {
    if (ws.ended && ws.buffer.length === 0 && !iws.ending) {
      debug('(_write) input.end()');
      input.end();
    }

    cb();
  });
};

/*!
 * Implement Duplex `_read`. Push data from output
 * to self and determine if the roundabout instance
 * has ended.
 *
 * @param {Number} n bytes to read
 * @api private
 */

Roundabout.prototype._read = function(n) {
  var state = this._roundaboutState;
  var output = state.output;

  // consistent reading
  function read(data) {
    data = data || output.read();

    if (data) {
      debug('(read) this.push(data)');
      this.push(data);
    }

    if (!data && output._readableState.ended) {
      debug('(read) this.push(null)');
      this.push(null);
    }
  }

  // check for data
  var data = output.read();

  // decide how to proceed
  if (data) {
    debug('(_read) read(data)');
    read.call(this, data);
  } else if (!data && state.finished) {
    debug('(_read) this.push(null)');
    this.push(null);
  } else {
    debug('(_read) add listener: _nudge');
    this.once('_nudge', read);
  }
};

/*!
 * Get input options from first stream added
 * and apply to the input stream and the
 * `_writableState` of a given roundabout instance.
 *
 * @param {Roundabout} self
 * @param {Stream} source
 * @api private
 */

function setInputState(self, source) {
  var opts = getOpts(source._writableState);
  var mine = self._writableState;
  var readable = self._roundaboutState.input._readableState;
  var writable = self._roundaboutState.input._writableState;
  debug('(setInputState) %j', opts);
  extend(mine, opts);
  extend(readable, opts);
  extend(writable, opts);
}

/*!
 * Get output options from latest stream added
 * and apply to the output stream and the
 * `_readableState` of a given roundabout instance.
 *
 * @param {Roundabout} self
 * @param {Stream} source
 * @api private
 */

function setOutputState(self, source) {
  var opts = getOpts(source._readableState);
  var mine = self._readableState;
  var readable = self._roundaboutState.output._readableState;
  var writable = self._roundaboutState.output._writableState;
  debug('(setOutputState) %j', opts);
  extend(mine, opts);
  extend(readable, opts);
  extend(writable, opts);
}
