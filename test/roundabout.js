var PassThrough = require('stream').PassThrough;
var transmute = require('transmute');

describe('roundabout', function() {
  describe('with default options', function() {
    it('performs like a passthrough if no streams added', function(done) {
      var stream = roundabout();
      var readable = chai.spy('readable', function() {
        var data = this.read();
        if (!data) return;
        data.should.be.instanceof(Buffer);
        data.should.deep.equal(new Buffer('hello universe', 'utf8'));
      });

      stream.on('readable', readable);
      stream.on('end', function() {
        readable.should.have.been.called();
        done();
      });

      stream.write('hello universe');
      stream.end();
    });

    it('pipes through a single transform stream', function(done) {
      var stream = roundabout();
      var readable = chai.spy('readable', function() {
        var data = this.read();
        if (!data) return;
        data.should.be.instanceof(Buffer);
        data.should.deep.equal(new Buffer('hello universe', 'utf8'));
      });

      var passthrough = chai.spy('passthrough', function(chunk, enc, cb) {
        should.exist(chunk, 'passthrough');
        chunk.should.be.instanceof(Buffer);
        chunk.should.deep.equal(new Buffer('hello universe', 'utf8'));
        cb(null, chunk);
      });

      stream.use(transmute(passthrough));

      stream.on('readable', readable);
      stream.on('end', function() {
        readable.should.have.been.called();
        passthrough.should.have.been.called();
        done();
      });

      stream.write('hello universe');
      stream.end();
    });

    it('pipes through multiple transform streams', function(done) {
      var stream = roundabout();
      var streams = [];

      [ 1, 2, 3, 4, 5 ].forEach(function(n) {
        var passthrough = chai.spy('passthrough ' + n, function(chunk, enc, cb) {
          should.exist(chunk, 'passthrough ' + n);
          chunk.should.be.instanceof(Buffer);
          chunk.should.deep.equal(new Buffer('hello universe', 'utf8'));
          cb(null, chunk);
        });

        var transform = transmute(passthrough);
        streams.push({ spy: passthrough, stream: transform });
        stream.use(transform);
      });

      var readable = chai.spy('readable', function() {
        var data = this.read();
        if (!data) return;
        data.should.be.instanceof(Buffer);
        data.should.deep.equal(new Buffer('hello universe', 'utf8'));
      });

      stream.on('readable', readable);
      stream.on('end', function() {
        streams.forEach(function(s) {
          s.spy.should.have.been.called();
        });
        done();
      });

      stream.write('hello universe');
      stream.end();
    });
  });

  describe('with custom options', function() {
    it('performns like a passthrough if no streams added', function(done) {
      var stream = roundabout({ objectMode: true, highWaterMark: 1 });
      var readable = chai.spy('readable', function() {
        var data = this.read();
        if (!data) return;
        data.should.be.an('object');
        data.should.deep.equal({ hello: 'universe' });
      });

      stream.on('readable', readable);
      stream.on('end', function() {
        readable.should.have.been.called();
        done();
      });

      stream.write({ hello: 'universe' });
      stream.end();
    });

    it('adapts to the first stream added', function() {
      var stream = roundabout();
      var transform = transmute({
          writable: { objectMode: true, highWaterMark: 1 }
        , transform: function() {}
      });

      stream.use(transform);

      stream._writableState.objectMode.should.be.true;
      stream._writableState.highWaterMark.should.equal(1);
      stream._readableState.objectMode.should.be.false;
      stream._readableState.highWaterMark.should.not.equal(1);
    });

    it('adapts to the last stream added', function() {
      var stream = roundabout();
      var transform = transmute({
          readable: { objectMode: true, highWaterMark: 1 }
        , transform: function() {}
      });

      stream.use(transform);

      stream._writableState.objectMode.should.be.false;
      stream._writableState.highWaterMark.should.not.equal(1);
      stream._readableState.objectMode.should.be.true;
      stream._readableState.highWaterMark.should.equal(1);
    });
  });
});
