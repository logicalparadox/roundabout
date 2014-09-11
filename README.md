# roundabout [![Build Status](https://travis-ci.org/logicalparadox/roundabout.png?branch=master)](https://travis-ci.org/logicalparadox/roundabout)

> Stack several transform streams behind a single stream for reusable piping magic.

#### Installation

`roundabout` is available on [npm](http://npmjs.org).

    npm install roundabout

## Usage

A Roundabout stream is technically a Duplex stream but behaves like Transform stream. When any number of 
transform/duplex streams are added to the stack, data written to the roundabout instance will pipe
through all streams in the stack and emerge on the roundabout's readable side of things. This makes 
multi-pipe streams modular and reusable.

#### Features

- behaves like `PassThrough` until streams are added to the stack.
- adaptive `objectMode` and `highWaterMark` ensure public stream matches readable/writable states.
  - first stream in stack will adjust public stream's `_writableState` to match.
  - last stream will adjust `_readableState`
- roundabout streams can be used by other roundabout streams: STREAMCEPTION!

#### Example

In the following example we setup a psuedo-csv parser. The interesting behavior of this
example is that the configuration for the readable state of our csv-parser stream will change
depending on which transform stream is last added to the stack.

```js
/*!
 * module dependencies
 */

var fs = require('fs');
var roundabout = require('roundabout');

/**
 * @param {Array} headers
 * @param {Boolean} stringify (default false)
 * @return {Roundabout} "transform" stream
 */

function csvToJson(headers, stringify) {
  var res = roundabout();

  // objectMode: false => objectMode: true
  // first used: res writable objectMode = false, res readable objectMode = true
  res.use(splitRows); 

  // objectMode: true (res readable unchanged)
  res.use(splitCols); 

  // objectMode: true (res readable unchanged)
  res.use(associateHeaders(headers));

  if (stringify) {
    // objectMode: true => objectMode: false
    // if used, will change res readable objectMode to false
    res.use(stringifyJson);
  }

  return res;
}

/*!
 * setup stream instances
 */

var csv = csvToJson([ 'first', 'last' ], true);
var input = fs.createReadStream('names.csv');
var output = fs.createWriteStream('names.json');

/*!
 * plumbing
 */

input.pipe(csv).pipe(output);
```

#### License

(The MIT License)

Copyright (c) 2013-2014 Jake Luer <jake@alogicalparadox.com> (http://alogicalparadox.com)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
