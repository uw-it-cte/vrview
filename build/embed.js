(function(){function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s}return e})()({1:[function(_dereq_,module,exports){
(function (process){
/**
 * Tween.js - Licensed under the MIT license
 * https://github.com/tweenjs/tween.js
 * ----------------------------------------------
 *
 * See https://github.com/tweenjs/tween.js/graphs/contributors for the full list of contributors.
 * Thank you all, you're awesome!
 */


var _Group = function () {
	this._tweens = {};
	this._tweensAddedDuringUpdate = {};
};

_Group.prototype = {
	getAll: function () {

		return Object.keys(this._tweens).map(function (tweenId) {
			return this._tweens[tweenId];
		}.bind(this));

	},

	removeAll: function () {

		this._tweens = {};

	},

	add: function (tween) {

		this._tweens[tween.getId()] = tween;
		this._tweensAddedDuringUpdate[tween.getId()] = tween;

	},

	remove: function (tween) {

		delete this._tweens[tween.getId()];
		delete this._tweensAddedDuringUpdate[tween.getId()];

	},

	update: function (time, preserve) {

		var tweenIds = Object.keys(this._tweens);

		if (tweenIds.length === 0) {
			return false;
		}

		time = time !== undefined ? time : TWEEN.now();

		// Tweens are updated in "batches". If you add a new tween during an update, then the
		// new tween will be updated in the next batch.
		// If you remove a tween during an update, it will normally still be updated. However,
		// if the removed tween was added during the current batch, then it will not be updated.
		while (tweenIds.length > 0) {
			this._tweensAddedDuringUpdate = {};

			for (var i = 0; i < tweenIds.length; i++) {

				if (this._tweens[tweenIds[i]].update(time) === false) {
					this._tweens[tweenIds[i]]._isPlaying = false;

					if (!preserve) {
						delete this._tweens[tweenIds[i]];
					}
				}
			}

			tweenIds = Object.keys(this._tweensAddedDuringUpdate);
		}

		return true;

	}
};

var TWEEN = new _Group();

TWEEN.Group = _Group;
TWEEN._nextId = 0;
TWEEN.nextId = function () {
	return TWEEN._nextId++;
};


// Include a performance.now polyfill.
// In node.js, use process.hrtime.
if (typeof (window) === 'undefined' && typeof (process) !== 'undefined') {
	TWEEN.now = function () {
		var time = process.hrtime();

		// Convert [seconds, nanoseconds] to milliseconds.
		return time[0] * 1000 + time[1] / 1000000;
	};
}
// In a browser, use window.performance.now if it is available.
else if (typeof (window) !== 'undefined' &&
         window.performance !== undefined &&
		 window.performance.now !== undefined) {
	// This must be bound, because directly assigning this function
	// leads to an invocation exception in Chrome.
	TWEEN.now = window.performance.now.bind(window.performance);
}
// Use Date.now if it is available.
else if (Date.now !== undefined) {
	TWEEN.now = Date.now;
}
// Otherwise, use 'new Date().getTime()'.
else {
	TWEEN.now = function () {
		return new Date().getTime();
	};
}


TWEEN.Tween = function (object, group) {
	this._object = object;
	this._valuesStart = {};
	this._valuesEnd = {};
	this._valuesStartRepeat = {};
	this._duration = 1000;
	this._repeat = 0;
	this._repeatDelayTime = undefined;
	this._yoyo = false;
	this._isPlaying = false;
	this._reversed = false;
	this._delayTime = 0;
	this._startTime = null;
	this._easingFunction = TWEEN.Easing.Linear.None;
	this._interpolationFunction = TWEEN.Interpolation.Linear;
	this._chainedTweens = [];
	this._onStartCallback = null;
	this._onStartCallbackFired = false;
	this._onUpdateCallback = null;
	this._onCompleteCallback = null;
	this._onStopCallback = null;
	this._group = group || TWEEN;
	this._id = TWEEN.nextId();

};

TWEEN.Tween.prototype = {
	getId: function getId() {
		return this._id;
	},

	isPlaying: function isPlaying() {
		return this._isPlaying;
	},

	to: function to(properties, duration) {

		this._valuesEnd = properties;

		if (duration !== undefined) {
			this._duration = duration;
		}

		return this;

	},

	start: function start(time) {

		this._group.add(this);

		this._isPlaying = true;

		this._onStartCallbackFired = false;

		this._startTime = time !== undefined ? time : TWEEN.now();
		this._startTime += this._delayTime;

		for (var property in this._valuesEnd) {

			// Check if an Array was provided as property value
			if (this._valuesEnd[property] instanceof Array) {

				if (this._valuesEnd[property].length === 0) {
					continue;
				}

				// Create a local copy of the Array with the start value at the front
				this._valuesEnd[property] = [this._object[property]].concat(this._valuesEnd[property]);

			}

			// If `to()` specifies a property that doesn't exist in the source object,
			// we should not set that property in the object
			if (this._object[property] === undefined) {
				continue;
			}

			// Save the starting value.
			this._valuesStart[property] = this._object[property];

			if ((this._valuesStart[property] instanceof Array) === false) {
				this._valuesStart[property] *= 1.0; // Ensures we're using numbers, not strings
			}

			this._valuesStartRepeat[property] = this._valuesStart[property] || 0;

		}

		return this;

	},

	stop: function stop() {

		if (!this._isPlaying) {
			return this;
		}

		this._group.remove(this);
		this._isPlaying = false;

		if (this._onStopCallback !== null) {
			this._onStopCallback.call(this._object, this._object);
		}

		this.stopChainedTweens();
		return this;

	},

	end: function end() {

		this.update(this._startTime + this._duration);
		return this;

	},

	stopChainedTweens: function stopChainedTweens() {

		for (var i = 0, numChainedTweens = this._chainedTweens.length; i < numChainedTweens; i++) {
			this._chainedTweens[i].stop();
		}

	},

	delay: function delay(amount) {

		this._delayTime = amount;
		return this;

	},

	repeat: function repeat(times) {

		this._repeat = times;
		return this;

	},

	repeatDelay: function repeatDelay(amount) {

		this._repeatDelayTime = amount;
		return this;

	},

	yoyo: function yoyo(yoyo) {

		this._yoyo = yoyo;
		return this;

	},

	easing: function easing(easing) {

		this._easingFunction = easing;
		return this;

	},

	interpolation: function interpolation(interpolation) {

		this._interpolationFunction = interpolation;
		return this;

	},

	chain: function chain() {

		this._chainedTweens = arguments;
		return this;

	},

	onStart: function onStart(callback) {

		this._onStartCallback = callback;
		return this;

	},

	onUpdate: function onUpdate(callback) {

		this._onUpdateCallback = callback;
		return this;

	},

	onComplete: function onComplete(callback) {

		this._onCompleteCallback = callback;
		return this;

	},

	onStop: function onStop(callback) {

		this._onStopCallback = callback;
		return this;

	},

	update: function update(time) {

		var property;
		var elapsed;
		var value;

		if (time < this._startTime) {
			return true;
		}

		if (this._onStartCallbackFired === false) {

			if (this._onStartCallback !== null) {
				this._onStartCallback.call(this._object, this._object);
			}

			this._onStartCallbackFired = true;
		}

		elapsed = (time - this._startTime) / this._duration;
		elapsed = elapsed > 1 ? 1 : elapsed;

		value = this._easingFunction(elapsed);

		for (property in this._valuesEnd) {

			// Don't update properties that do not exist in the source object
			if (this._valuesStart[property] === undefined) {
				continue;
			}

			var start = this._valuesStart[property] || 0;
			var end = this._valuesEnd[property];

			if (end instanceof Array) {

				this._object[property] = this._interpolationFunction(end, value);

			} else {

				// Parses relative end values with start as base (e.g.: +10, -3)
				if (typeof (end) === 'string') {

					if (end.charAt(0) === '+' || end.charAt(0) === '-') {
						end = start + parseFloat(end);
					} else {
						end = parseFloat(end);
					}
				}

				// Protect against non numeric properties.
				if (typeof (end) === 'number') {
					this._object[property] = start + (end - start) * value;
				}

			}

		}

		if (this._onUpdateCallback !== null) {
			this._onUpdateCallback.call(this._object, value);
		}

		if (elapsed === 1) {

			if (this._repeat > 0) {

				if (isFinite(this._repeat)) {
					this._repeat--;
				}

				// Reassign starting values, restart by making startTime = now
				for (property in this._valuesStartRepeat) {

					if (typeof (this._valuesEnd[property]) === 'string') {
						this._valuesStartRepeat[property] = this._valuesStartRepeat[property] + parseFloat(this._valuesEnd[property]);
					}

					if (this._yoyo) {
						var tmp = this._valuesStartRepeat[property];

						this._valuesStartRepeat[property] = this._valuesEnd[property];
						this._valuesEnd[property] = tmp;
					}

					this._valuesStart[property] = this._valuesStartRepeat[property];

				}

				if (this._yoyo) {
					this._reversed = !this._reversed;
				}

				if (this._repeatDelayTime !== undefined) {
					this._startTime = time + this._repeatDelayTime;
				} else {
					this._startTime = time + this._delayTime;
				}

				return true;

			} else {

				if (this._onCompleteCallback !== null) {

					this._onCompleteCallback.call(this._object, this._object);
				}

				for (var i = 0, numChainedTweens = this._chainedTweens.length; i < numChainedTweens; i++) {
					// Make the chained tweens start exactly at the time they should,
					// even if the `update()` method was called way past the duration of the tween
					this._chainedTweens[i].start(this._startTime + this._duration);
				}

				return false;

			}

		}

		return true;

	}
};


TWEEN.Easing = {

	Linear: {

		None: function (k) {

			return k;

		}

	},

	Quadratic: {

		In: function (k) {

			return k * k;

		},

		Out: function (k) {

			return k * (2 - k);

		},

		InOut: function (k) {

			if ((k *= 2) < 1) {
				return 0.5 * k * k;
			}

			return - 0.5 * (--k * (k - 2) - 1);

		}

	},

	Cubic: {

		In: function (k) {

			return k * k * k;

		},

		Out: function (k) {

			return --k * k * k + 1;

		},

		InOut: function (k) {

			if ((k *= 2) < 1) {
				return 0.5 * k * k * k;
			}

			return 0.5 * ((k -= 2) * k * k + 2);

		}

	},

	Quartic: {

		In: function (k) {

			return k * k * k * k;

		},

		Out: function (k) {

			return 1 - (--k * k * k * k);

		},

		InOut: function (k) {

			if ((k *= 2) < 1) {
				return 0.5 * k * k * k * k;
			}

			return - 0.5 * ((k -= 2) * k * k * k - 2);

		}

	},

	Quintic: {

		In: function (k) {

			return k * k * k * k * k;

		},

		Out: function (k) {

			return --k * k * k * k * k + 1;

		},

		InOut: function (k) {

			if ((k *= 2) < 1) {
				return 0.5 * k * k * k * k * k;
			}

			return 0.5 * ((k -= 2) * k * k * k * k + 2);

		}

	},

	Sinusoidal: {

		In: function (k) {

			return 1 - Math.cos(k * Math.PI / 2);

		},

		Out: function (k) {

			return Math.sin(k * Math.PI / 2);

		},

		InOut: function (k) {

			return 0.5 * (1 - Math.cos(Math.PI * k));

		}

	},

	Exponential: {

		In: function (k) {

			return k === 0 ? 0 : Math.pow(1024, k - 1);

		},

		Out: function (k) {

			return k === 1 ? 1 : 1 - Math.pow(2, - 10 * k);

		},

		InOut: function (k) {

			if (k === 0) {
				return 0;
			}

			if (k === 1) {
				return 1;
			}

			if ((k *= 2) < 1) {
				return 0.5 * Math.pow(1024, k - 1);
			}

			return 0.5 * (- Math.pow(2, - 10 * (k - 1)) + 2);

		}

	},

	Circular: {

		In: function (k) {

			return 1 - Math.sqrt(1 - k * k);

		},

		Out: function (k) {

			return Math.sqrt(1 - (--k * k));

		},

		InOut: function (k) {

			if ((k *= 2) < 1) {
				return - 0.5 * (Math.sqrt(1 - k * k) - 1);
			}

			return 0.5 * (Math.sqrt(1 - (k -= 2) * k) + 1);

		}

	},

	Elastic: {

		In: function (k) {

			if (k === 0) {
				return 0;
			}

			if (k === 1) {
				return 1;
			}

			return -Math.pow(2, 10 * (k - 1)) * Math.sin((k - 1.1) * 5 * Math.PI);

		},

		Out: function (k) {

			if (k === 0) {
				return 0;
			}

			if (k === 1) {
				return 1;
			}

			return Math.pow(2, -10 * k) * Math.sin((k - 0.1) * 5 * Math.PI) + 1;

		},

		InOut: function (k) {

			if (k === 0) {
				return 0;
			}

			if (k === 1) {
				return 1;
			}

			k *= 2;

			if (k < 1) {
				return -0.5 * Math.pow(2, 10 * (k - 1)) * Math.sin((k - 1.1) * 5 * Math.PI);
			}

			return 0.5 * Math.pow(2, -10 * (k - 1)) * Math.sin((k - 1.1) * 5 * Math.PI) + 1;

		}

	},

	Back: {

		In: function (k) {

			var s = 1.70158;

			return k * k * ((s + 1) * k - s);

		},

		Out: function (k) {

			var s = 1.70158;

			return --k * k * ((s + 1) * k + s) + 1;

		},

		InOut: function (k) {

			var s = 1.70158 * 1.525;

			if ((k *= 2) < 1) {
				return 0.5 * (k * k * ((s + 1) * k - s));
			}

			return 0.5 * ((k -= 2) * k * ((s + 1) * k + s) + 2);

		}

	},

	Bounce: {

		In: function (k) {

			return 1 - TWEEN.Easing.Bounce.Out(1 - k);

		},

		Out: function (k) {

			if (k < (1 / 2.75)) {
				return 7.5625 * k * k;
			} else if (k < (2 / 2.75)) {
				return 7.5625 * (k -= (1.5 / 2.75)) * k + 0.75;
			} else if (k < (2.5 / 2.75)) {
				return 7.5625 * (k -= (2.25 / 2.75)) * k + 0.9375;
			} else {
				return 7.5625 * (k -= (2.625 / 2.75)) * k + 0.984375;
			}

		},

		InOut: function (k) {

			if (k < 0.5) {
				return TWEEN.Easing.Bounce.In(k * 2) * 0.5;
			}

			return TWEEN.Easing.Bounce.Out(k * 2 - 1) * 0.5 + 0.5;

		}

	}

};

TWEEN.Interpolation = {

	Linear: function (v, k) {

		var m = v.length - 1;
		var f = m * k;
		var i = Math.floor(f);
		var fn = TWEEN.Interpolation.Utils.Linear;

		if (k < 0) {
			return fn(v[0], v[1], f);
		}

		if (k > 1) {
			return fn(v[m], v[m - 1], m - f);
		}

		return fn(v[i], v[i + 1 > m ? m : i + 1], f - i);

	},

	Bezier: function (v, k) {

		var b = 0;
		var n = v.length - 1;
		var pw = Math.pow;
		var bn = TWEEN.Interpolation.Utils.Bernstein;

		for (var i = 0; i <= n; i++) {
			b += pw(1 - k, n - i) * pw(k, i) * v[i] * bn(n, i);
		}

		return b;

	},

	CatmullRom: function (v, k) {

		var m = v.length - 1;
		var f = m * k;
		var i = Math.floor(f);
		var fn = TWEEN.Interpolation.Utils.CatmullRom;

		if (v[0] === v[m]) {

			if (k < 0) {
				i = Math.floor(f = m * (1 + k));
			}

			return fn(v[(i - 1 + m) % m], v[i], v[(i + 1) % m], v[(i + 2) % m], f - i);

		} else {

			if (k < 0) {
				return v[0] - (fn(v[0], v[0], v[1], v[1], -f) - v[0]);
			}

			if (k > 1) {
				return v[m] - (fn(v[m], v[m], v[m - 1], v[m - 1], f - m) - v[m]);
			}

			return fn(v[i ? i - 1 : 0], v[i], v[m < i + 1 ? m : i + 1], v[m < i + 2 ? m : i + 2], f - i);

		}

	},

	Utils: {

		Linear: function (p0, p1, t) {

			return (p1 - p0) * t + p0;

		},

		Bernstein: function (n, i) {

			var fc = TWEEN.Interpolation.Utils.Factorial;

			return fc(n) / fc(i) / fc(n - i);

		},

		Factorial: (function () {

			var a = [1];

			return function (n) {

				var s = 1;

				if (a[n]) {
					return a[n];
				}

				for (var i = n; i > 1; i--) {
					s *= i;
				}

				a[n] = s;
				return s;

			};

		})(),

		CatmullRom: function (p0, p1, p2, p3, t) {

			var v0 = (p2 - p0) * 0.5;
			var v1 = (p3 - p1) * 0.5;
			var t2 = t * t;
			var t3 = t * t2;

			return (2 * p1 - 2 * p2 + v0 + v1) * t3 + (- 3 * p1 + 3 * p2 - 2 * v0 - v1) * t2 + v0 * t + p1;

		}

	}

};

// UMD (Universal Module Definition)
(function (root) {

	if (typeof define === 'function' && define.amd) {

		// AMD
		define([], function () {
			return TWEEN;
		});

	} else if (typeof module !== 'undefined' && typeof exports === 'object') {

		// Node.js
		module.exports = TWEEN;

	} else if (root !== undefined) {

		// Global variable
		root.TWEEN = TWEEN;

	}

})(this);

}).call(this,_dereq_('_process'))
},{"_process":4}],2:[function(_dereq_,module,exports){
(function (process,global){
/*!
 * @overview es6-promise - a tiny implementation of Promises/A+.
 * @copyright Copyright (c) 2014 Yehuda Katz, Tom Dale, Stefan Penner and contributors (Conversion to ES6 API by Jake Archibald)
 * @license   Licensed under MIT license
 *            See https://raw.githubusercontent.com/stefanpenner/es6-promise/master/LICENSE
 * @version   3.3.1
 */

(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
    typeof define === 'function' && define.amd ? define(factory) :
    (global.ES6Promise = factory());
}(this, (function () { 'use strict';

function objectOrFunction(x) {
  return typeof x === 'function' || typeof x === 'object' && x !== null;
}

function isFunction(x) {
  return typeof x === 'function';
}

var _isArray = undefined;
if (!Array.isArray) {
  _isArray = function (x) {
    return Object.prototype.toString.call(x) === '[object Array]';
  };
} else {
  _isArray = Array.isArray;
}

var isArray = _isArray;

var len = 0;
var vertxNext = undefined;
var customSchedulerFn = undefined;

var asap = function asap(callback, arg) {
  queue[len] = callback;
  queue[len + 1] = arg;
  len += 2;
  if (len === 2) {
    // If len is 2, that means that we need to schedule an async flush.
    // If additional callbacks are queued before the queue is flushed, they
    // will be processed by this flush that we are scheduling.
    if (customSchedulerFn) {
      customSchedulerFn(flush);
    } else {
      scheduleFlush();
    }
  }
};

function setScheduler(scheduleFn) {
  customSchedulerFn = scheduleFn;
}

function setAsap(asapFn) {
  asap = asapFn;
}

var browserWindow = typeof window !== 'undefined' ? window : undefined;
var browserGlobal = browserWindow || {};
var BrowserMutationObserver = browserGlobal.MutationObserver || browserGlobal.WebKitMutationObserver;
var isNode = typeof self === 'undefined' && typeof process !== 'undefined' && ({}).toString.call(process) === '[object process]';

// test for web worker but not in IE10
var isWorker = typeof Uint8ClampedArray !== 'undefined' && typeof importScripts !== 'undefined' && typeof MessageChannel !== 'undefined';

// node
function useNextTick() {
  // node version 0.10.x displays a deprecation warning when nextTick is used recursively
  // see https://github.com/cujojs/when/issues/410 for details
  return function () {
    return process.nextTick(flush);
  };
}

// vertx
function useVertxTimer() {
  return function () {
    vertxNext(flush);
  };
}

function useMutationObserver() {
  var iterations = 0;
  var observer = new BrowserMutationObserver(flush);
  var node = document.createTextNode('');
  observer.observe(node, { characterData: true });

  return function () {
    node.data = iterations = ++iterations % 2;
  };
}

// web worker
function useMessageChannel() {
  var channel = new MessageChannel();
  channel.port1.onmessage = flush;
  return function () {
    return channel.port2.postMessage(0);
  };
}

function useSetTimeout() {
  // Store setTimeout reference so es6-promise will be unaffected by
  // other code modifying setTimeout (like sinon.useFakeTimers())
  var globalSetTimeout = setTimeout;
  return function () {
    return globalSetTimeout(flush, 1);
  };
}

var queue = new Array(1000);
function flush() {
  for (var i = 0; i < len; i += 2) {
    var callback = queue[i];
    var arg = queue[i + 1];

    callback(arg);

    queue[i] = undefined;
    queue[i + 1] = undefined;
  }

  len = 0;
}

function attemptVertx() {
  try {
    var r = _dereq_;
    var vertx = r('vertx');
    vertxNext = vertx.runOnLoop || vertx.runOnContext;
    return useVertxTimer();
  } catch (e) {
    return useSetTimeout();
  }
}

var scheduleFlush = undefined;
// Decide what async method to use to triggering processing of queued callbacks:
if (isNode) {
  scheduleFlush = useNextTick();
} else if (BrowserMutationObserver) {
  scheduleFlush = useMutationObserver();
} else if (isWorker) {
  scheduleFlush = useMessageChannel();
} else if (browserWindow === undefined && typeof _dereq_ === 'function') {
  scheduleFlush = attemptVertx();
} else {
  scheduleFlush = useSetTimeout();
}

function then(onFulfillment, onRejection) {
  var _arguments = arguments;

  var parent = this;

  var child = new this.constructor(noop);

  if (child[PROMISE_ID] === undefined) {
    makePromise(child);
  }

  var _state = parent._state;

  if (_state) {
    (function () {
      var callback = _arguments[_state - 1];
      asap(function () {
        return invokeCallback(_state, child, callback, parent._result);
      });
    })();
  } else {
    subscribe(parent, child, onFulfillment, onRejection);
  }

  return child;
}

/**
  `Promise.resolve` returns a promise that will become resolved with the
  passed `value`. It is shorthand for the following:

  ```javascript
  let promise = new Promise(function(resolve, reject){
    resolve(1);
  });

  promise.then(function(value){
    // value === 1
  });
  ```

  Instead of writing the above, your code now simply becomes the following:

  ```javascript
  let promise = Promise.resolve(1);

  promise.then(function(value){
    // value === 1
  });
  ```

  @method resolve
  @static
  @param {Any} value value that the returned promise will be resolved with
  Useful for tooling.
  @return {Promise} a promise that will become fulfilled with the given
  `value`
*/
function resolve(object) {
  /*jshint validthis:true */
  var Constructor = this;

  if (object && typeof object === 'object' && object.constructor === Constructor) {
    return object;
  }

  var promise = new Constructor(noop);
  _resolve(promise, object);
  return promise;
}

var PROMISE_ID = Math.random().toString(36).substring(16);

function noop() {}

var PENDING = void 0;
var FULFILLED = 1;
var REJECTED = 2;

var GET_THEN_ERROR = new ErrorObject();

function selfFulfillment() {
  return new TypeError("You cannot resolve a promise with itself");
}

function cannotReturnOwn() {
  return new TypeError('A promises callback cannot return that same promise.');
}

function getThen(promise) {
  try {
    return promise.then;
  } catch (error) {
    GET_THEN_ERROR.error = error;
    return GET_THEN_ERROR;
  }
}

function tryThen(then, value, fulfillmentHandler, rejectionHandler) {
  try {
    then.call(value, fulfillmentHandler, rejectionHandler);
  } catch (e) {
    return e;
  }
}

function handleForeignThenable(promise, thenable, then) {
  asap(function (promise) {
    var sealed = false;
    var error = tryThen(then, thenable, function (value) {
      if (sealed) {
        return;
      }
      sealed = true;
      if (thenable !== value) {
        _resolve(promise, value);
      } else {
        fulfill(promise, value);
      }
    }, function (reason) {
      if (sealed) {
        return;
      }
      sealed = true;

      _reject(promise, reason);
    }, 'Settle: ' + (promise._label || ' unknown promise'));

    if (!sealed && error) {
      sealed = true;
      _reject(promise, error);
    }
  }, promise);
}

function handleOwnThenable(promise, thenable) {
  if (thenable._state === FULFILLED) {
    fulfill(promise, thenable._result);
  } else if (thenable._state === REJECTED) {
    _reject(promise, thenable._result);
  } else {
    subscribe(thenable, undefined, function (value) {
      return _resolve(promise, value);
    }, function (reason) {
      return _reject(promise, reason);
    });
  }
}

function handleMaybeThenable(promise, maybeThenable, then$$) {
  if (maybeThenable.constructor === promise.constructor && then$$ === then && maybeThenable.constructor.resolve === resolve) {
    handleOwnThenable(promise, maybeThenable);
  } else {
    if (then$$ === GET_THEN_ERROR) {
      _reject(promise, GET_THEN_ERROR.error);
    } else if (then$$ === undefined) {
      fulfill(promise, maybeThenable);
    } else if (isFunction(then$$)) {
      handleForeignThenable(promise, maybeThenable, then$$);
    } else {
      fulfill(promise, maybeThenable);
    }
  }
}

function _resolve(promise, value) {
  if (promise === value) {
    _reject(promise, selfFulfillment());
  } else if (objectOrFunction(value)) {
    handleMaybeThenable(promise, value, getThen(value));
  } else {
    fulfill(promise, value);
  }
}

function publishRejection(promise) {
  if (promise._onerror) {
    promise._onerror(promise._result);
  }

  publish(promise);
}

function fulfill(promise, value) {
  if (promise._state !== PENDING) {
    return;
  }

  promise._result = value;
  promise._state = FULFILLED;

  if (promise._subscribers.length !== 0) {
    asap(publish, promise);
  }
}

function _reject(promise, reason) {
  if (promise._state !== PENDING) {
    return;
  }
  promise._state = REJECTED;
  promise._result = reason;

  asap(publishRejection, promise);
}

function subscribe(parent, child, onFulfillment, onRejection) {
  var _subscribers = parent._subscribers;
  var length = _subscribers.length;

  parent._onerror = null;

  _subscribers[length] = child;
  _subscribers[length + FULFILLED] = onFulfillment;
  _subscribers[length + REJECTED] = onRejection;

  if (length === 0 && parent._state) {
    asap(publish, parent);
  }
}

function publish(promise) {
  var subscribers = promise._subscribers;
  var settled = promise._state;

  if (subscribers.length === 0) {
    return;
  }

  var child = undefined,
      callback = undefined,
      detail = promise._result;

  for (var i = 0; i < subscribers.length; i += 3) {
    child = subscribers[i];
    callback = subscribers[i + settled];

    if (child) {
      invokeCallback(settled, child, callback, detail);
    } else {
      callback(detail);
    }
  }

  promise._subscribers.length = 0;
}

function ErrorObject() {
  this.error = null;
}

var TRY_CATCH_ERROR = new ErrorObject();

function tryCatch(callback, detail) {
  try {
    return callback(detail);
  } catch (e) {
    TRY_CATCH_ERROR.error = e;
    return TRY_CATCH_ERROR;
  }
}

function invokeCallback(settled, promise, callback, detail) {
  var hasCallback = isFunction(callback),
      value = undefined,
      error = undefined,
      succeeded = undefined,
      failed = undefined;

  if (hasCallback) {
    value = tryCatch(callback, detail);

    if (value === TRY_CATCH_ERROR) {
      failed = true;
      error = value.error;
      value = null;
    } else {
      succeeded = true;
    }

    if (promise === value) {
      _reject(promise, cannotReturnOwn());
      return;
    }
  } else {
    value = detail;
    succeeded = true;
  }

  if (promise._state !== PENDING) {
    // noop
  } else if (hasCallback && succeeded) {
      _resolve(promise, value);
    } else if (failed) {
      _reject(promise, error);
    } else if (settled === FULFILLED) {
      fulfill(promise, value);
    } else if (settled === REJECTED) {
      _reject(promise, value);
    }
}

function initializePromise(promise, resolver) {
  try {
    resolver(function resolvePromise(value) {
      _resolve(promise, value);
    }, function rejectPromise(reason) {
      _reject(promise, reason);
    });
  } catch (e) {
    _reject(promise, e);
  }
}

var id = 0;
function nextId() {
  return id++;
}

function makePromise(promise) {
  promise[PROMISE_ID] = id++;
  promise._state = undefined;
  promise._result = undefined;
  promise._subscribers = [];
}

function Enumerator(Constructor, input) {
  this._instanceConstructor = Constructor;
  this.promise = new Constructor(noop);

  if (!this.promise[PROMISE_ID]) {
    makePromise(this.promise);
  }

  if (isArray(input)) {
    this._input = input;
    this.length = input.length;
    this._remaining = input.length;

    this._result = new Array(this.length);

    if (this.length === 0) {
      fulfill(this.promise, this._result);
    } else {
      this.length = this.length || 0;
      this._enumerate();
      if (this._remaining === 0) {
        fulfill(this.promise, this._result);
      }
    }
  } else {
    _reject(this.promise, validationError());
  }
}

function validationError() {
  return new Error('Array Methods must be provided an Array');
};

Enumerator.prototype._enumerate = function () {
  var length = this.length;
  var _input = this._input;

  for (var i = 0; this._state === PENDING && i < length; i++) {
    this._eachEntry(_input[i], i);
  }
};

Enumerator.prototype._eachEntry = function (entry, i) {
  var c = this._instanceConstructor;
  var resolve$$ = c.resolve;

  if (resolve$$ === resolve) {
    var _then = getThen(entry);

    if (_then === then && entry._state !== PENDING) {
      this._settledAt(entry._state, i, entry._result);
    } else if (typeof _then !== 'function') {
      this._remaining--;
      this._result[i] = entry;
    } else if (c === Promise) {
      var promise = new c(noop);
      handleMaybeThenable(promise, entry, _then);
      this._willSettleAt(promise, i);
    } else {
      this._willSettleAt(new c(function (resolve$$) {
        return resolve$$(entry);
      }), i);
    }
  } else {
    this._willSettleAt(resolve$$(entry), i);
  }
};

Enumerator.prototype._settledAt = function (state, i, value) {
  var promise = this.promise;

  if (promise._state === PENDING) {
    this._remaining--;

    if (state === REJECTED) {
      _reject(promise, value);
    } else {
      this._result[i] = value;
    }
  }

  if (this._remaining === 0) {
    fulfill(promise, this._result);
  }
};

Enumerator.prototype._willSettleAt = function (promise, i) {
  var enumerator = this;

  subscribe(promise, undefined, function (value) {
    return enumerator._settledAt(FULFILLED, i, value);
  }, function (reason) {
    return enumerator._settledAt(REJECTED, i, reason);
  });
};

/**
  `Promise.all` accepts an array of promises, and returns a new promise which
  is fulfilled with an array of fulfillment values for the passed promises, or
  rejected with the reason of the first passed promise to be rejected. It casts all
  elements of the passed iterable to promises as it runs this algorithm.

  Example:

  ```javascript
  let promise1 = resolve(1);
  let promise2 = resolve(2);
  let promise3 = resolve(3);
  let promises = [ promise1, promise2, promise3 ];

  Promise.all(promises).then(function(array){
    // The array here would be [ 1, 2, 3 ];
  });
  ```

  If any of the `promises` given to `all` are rejected, the first promise
  that is rejected will be given as an argument to the returned promises's
  rejection handler. For example:

  Example:

  ```javascript
  let promise1 = resolve(1);
  let promise2 = reject(new Error("2"));
  let promise3 = reject(new Error("3"));
  let promises = [ promise1, promise2, promise3 ];

  Promise.all(promises).then(function(array){
    // Code here never runs because there are rejected promises!
  }, function(error) {
    // error.message === "2"
  });
  ```

  @method all
  @static
  @param {Array} entries array of promises
  @param {String} label optional string for labeling the promise.
  Useful for tooling.
  @return {Promise} promise that is fulfilled when all `promises` have been
  fulfilled, or rejected if any of them become rejected.
  @static
*/
function all(entries) {
  return new Enumerator(this, entries).promise;
}

/**
  `Promise.race` returns a new promise which is settled in the same way as the
  first passed promise to settle.

  Example:

  ```javascript
  let promise1 = new Promise(function(resolve, reject){
    setTimeout(function(){
      resolve('promise 1');
    }, 200);
  });

  let promise2 = new Promise(function(resolve, reject){
    setTimeout(function(){
      resolve('promise 2');
    }, 100);
  });

  Promise.race([promise1, promise2]).then(function(result){
    // result === 'promise 2' because it was resolved before promise1
    // was resolved.
  });
  ```

  `Promise.race` is deterministic in that only the state of the first
  settled promise matters. For example, even if other promises given to the
  `promises` array argument are resolved, but the first settled promise has
  become rejected before the other promises became fulfilled, the returned
  promise will become rejected:

  ```javascript
  let promise1 = new Promise(function(resolve, reject){
    setTimeout(function(){
      resolve('promise 1');
    }, 200);
  });

  let promise2 = new Promise(function(resolve, reject){
    setTimeout(function(){
      reject(new Error('promise 2'));
    }, 100);
  });

  Promise.race([promise1, promise2]).then(function(result){
    // Code here never runs
  }, function(reason){
    // reason.message === 'promise 2' because promise 2 became rejected before
    // promise 1 became fulfilled
  });
  ```

  An example real-world use case is implementing timeouts:

  ```javascript
  Promise.race([ajax('foo.json'), timeout(5000)])
  ```

  @method race
  @static
  @param {Array} promises array of promises to observe
  Useful for tooling.
  @return {Promise} a promise which settles in the same way as the first passed
  promise to settle.
*/
function race(entries) {
  /*jshint validthis:true */
  var Constructor = this;

  if (!isArray(entries)) {
    return new Constructor(function (_, reject) {
      return reject(new TypeError('You must pass an array to race.'));
    });
  } else {
    return new Constructor(function (resolve, reject) {
      var length = entries.length;
      for (var i = 0; i < length; i++) {
        Constructor.resolve(entries[i]).then(resolve, reject);
      }
    });
  }
}

/**
  `Promise.reject` returns a promise rejected with the passed `reason`.
  It is shorthand for the following:

  ```javascript
  let promise = new Promise(function(resolve, reject){
    reject(new Error('WHOOPS'));
  });

  promise.then(function(value){
    // Code here doesn't run because the promise is rejected!
  }, function(reason){
    // reason.message === 'WHOOPS'
  });
  ```

  Instead of writing the above, your code now simply becomes the following:

  ```javascript
  let promise = Promise.reject(new Error('WHOOPS'));

  promise.then(function(value){
    // Code here doesn't run because the promise is rejected!
  }, function(reason){
    // reason.message === 'WHOOPS'
  });
  ```

  @method reject
  @static
  @param {Any} reason value that the returned promise will be rejected with.
  Useful for tooling.
  @return {Promise} a promise rejected with the given `reason`.
*/
function reject(reason) {
  /*jshint validthis:true */
  var Constructor = this;
  var promise = new Constructor(noop);
  _reject(promise, reason);
  return promise;
}

function needsResolver() {
  throw new TypeError('You must pass a resolver function as the first argument to the promise constructor');
}

function needsNew() {
  throw new TypeError("Failed to construct 'Promise': Please use the 'new' operator, this object constructor cannot be called as a function.");
}

/**
  Promise objects represent the eventual result of an asynchronous operation. The
  primary way of interacting with a promise is through its `then` method, which
  registers callbacks to receive either a promise's eventual value or the reason
  why the promise cannot be fulfilled.

  Terminology
  -----------

  - `promise` is an object or function with a `then` method whose behavior conforms to this specification.
  - `thenable` is an object or function that defines a `then` method.
  - `value` is any legal JavaScript value (including undefined, a thenable, or a promise).
  - `exception` is a value that is thrown using the throw statement.
  - `reason` is a value that indicates why a promise was rejected.
  - `settled` the final resting state of a promise, fulfilled or rejected.

  A promise can be in one of three states: pending, fulfilled, or rejected.

  Promises that are fulfilled have a fulfillment value and are in the fulfilled
  state.  Promises that are rejected have a rejection reason and are in the
  rejected state.  A fulfillment value is never a thenable.

  Promises can also be said to *resolve* a value.  If this value is also a
  promise, then the original promise's settled state will match the value's
  settled state.  So a promise that *resolves* a promise that rejects will
  itself reject, and a promise that *resolves* a promise that fulfills will
  itself fulfill.


  Basic Usage:
  ------------

  ```js
  let promise = new Promise(function(resolve, reject) {
    // on success
    resolve(value);

    // on failure
    reject(reason);
  });

  promise.then(function(value) {
    // on fulfillment
  }, function(reason) {
    // on rejection
  });
  ```

  Advanced Usage:
  ---------------

  Promises shine when abstracting away asynchronous interactions such as
  `XMLHttpRequest`s.

  ```js
  function getJSON(url) {
    return new Promise(function(resolve, reject){
      let xhr = new XMLHttpRequest();

      xhr.open('GET', url);
      xhr.onreadystatechange = handler;
      xhr.responseType = 'json';
      xhr.setRequestHeader('Accept', 'application/json');
      xhr.send();

      function handler() {
        if (this.readyState === this.DONE) {
          if (this.status === 200) {
            resolve(this.response);
          } else {
            reject(new Error('getJSON: `' + url + '` failed with status: [' + this.status + ']'));
          }
        }
      };
    });
  }

  getJSON('/posts.json').then(function(json) {
    // on fulfillment
  }, function(reason) {
    // on rejection
  });
  ```

  Unlike callbacks, promises are great composable primitives.

  ```js
  Promise.all([
    getJSON('/posts'),
    getJSON('/comments')
  ]).then(function(values){
    values[0] // => postsJSON
    values[1] // => commentsJSON

    return values;
  });
  ```

  @class Promise
  @param {function} resolver
  Useful for tooling.
  @constructor
*/
function Promise(resolver) {
  this[PROMISE_ID] = nextId();
  this._result = this._state = undefined;
  this._subscribers = [];

  if (noop !== resolver) {
    typeof resolver !== 'function' && needsResolver();
    this instanceof Promise ? initializePromise(this, resolver) : needsNew();
  }
}

Promise.all = all;
Promise.race = race;
Promise.resolve = resolve;
Promise.reject = reject;
Promise._setScheduler = setScheduler;
Promise._setAsap = setAsap;
Promise._asap = asap;

Promise.prototype = {
  constructor: Promise,

  /**
    The primary way of interacting with a promise is through its `then` method,
    which registers callbacks to receive either a promise's eventual value or the
    reason why the promise cannot be fulfilled.
  
    ```js
    findUser().then(function(user){
      // user is available
    }, function(reason){
      // user is unavailable, and you are given the reason why
    });
    ```
  
    Chaining
    --------
  
    The return value of `then` is itself a promise.  This second, 'downstream'
    promise is resolved with the return value of the first promise's fulfillment
    or rejection handler, or rejected if the handler throws an exception.
  
    ```js
    findUser().then(function (user) {
      return user.name;
    }, function (reason) {
      return 'default name';
    }).then(function (userName) {
      // If `findUser` fulfilled, `userName` will be the user's name, otherwise it
      // will be `'default name'`
    });
  
    findUser().then(function (user) {
      throw new Error('Found user, but still unhappy');
    }, function (reason) {
      throw new Error('`findUser` rejected and we're unhappy');
    }).then(function (value) {
      // never reached
    }, function (reason) {
      // if `findUser` fulfilled, `reason` will be 'Found user, but still unhappy'.
      // If `findUser` rejected, `reason` will be '`findUser` rejected and we're unhappy'.
    });
    ```
    If the downstream promise does not specify a rejection handler, rejection reasons will be propagated further downstream.
  
    ```js
    findUser().then(function (user) {
      throw new PedagogicalException('Upstream error');
    }).then(function (value) {
      // never reached
    }).then(function (value) {
      // never reached
    }, function (reason) {
      // The `PedgagocialException` is propagated all the way down to here
    });
    ```
  
    Assimilation
    ------------
  
    Sometimes the value you want to propagate to a downstream promise can only be
    retrieved asynchronously. This can be achieved by returning a promise in the
    fulfillment or rejection handler. The downstream promise will then be pending
    until the returned promise is settled. This is called *assimilation*.
  
    ```js
    findUser().then(function (user) {
      return findCommentsByAuthor(user);
    }).then(function (comments) {
      // The user's comments are now available
    });
    ```
  
    If the assimliated promise rejects, then the downstream promise will also reject.
  
    ```js
    findUser().then(function (user) {
      return findCommentsByAuthor(user);
    }).then(function (comments) {
      // If `findCommentsByAuthor` fulfills, we'll have the value here
    }, function (reason) {
      // If `findCommentsByAuthor` rejects, we'll have the reason here
    });
    ```
  
    Simple Example
    --------------
  
    Synchronous Example
  
    ```javascript
    let result;
  
    try {
      result = findResult();
      // success
    } catch(reason) {
      // failure
    }
    ```
  
    Errback Example
  
    ```js
    findResult(function(result, err){
      if (err) {
        // failure
      } else {
        // success
      }
    });
    ```
  
    Promise Example;
  
    ```javascript
    findResult().then(function(result){
      // success
    }, function(reason){
      // failure
    });
    ```
  
    Advanced Example
    --------------
  
    Synchronous Example
  
    ```javascript
    let author, books;
  
    try {
      author = findAuthor();
      books  = findBooksByAuthor(author);
      // success
    } catch(reason) {
      // failure
    }
    ```
  
    Errback Example
  
    ```js
  
    function foundBooks(books) {
  
    }
  
    function failure(reason) {
  
    }
  
    findAuthor(function(author, err){
      if (err) {
        failure(err);
        // failure
      } else {
        try {
          findBoooksByAuthor(author, function(books, err) {
            if (err) {
              failure(err);
            } else {
              try {
                foundBooks(books);
              } catch(reason) {
                failure(reason);
              }
            }
          });
        } catch(error) {
          failure(err);
        }
        // success
      }
    });
    ```
  
    Promise Example;
  
    ```javascript
    findAuthor().
      then(findBooksByAuthor).
      then(function(books){
        // found books
    }).catch(function(reason){
      // something went wrong
    });
    ```
  
    @method then
    @param {Function} onFulfilled
    @param {Function} onRejected
    Useful for tooling.
    @return {Promise}
  */
  then: then,

  /**
    `catch` is simply sugar for `then(undefined, onRejection)` which makes it the same
    as the catch block of a try/catch statement.
  
    ```js
    function findAuthor(){
      throw new Error('couldn't find that author');
    }
  
    // synchronous
    try {
      findAuthor();
    } catch(reason) {
      // something went wrong
    }
  
    // async with promises
    findAuthor().catch(function(reason){
      // something went wrong
    });
    ```
  
    @method catch
    @param {Function} onRejection
    Useful for tooling.
    @return {Promise}
  */
  'catch': function _catch(onRejection) {
    return this.then(null, onRejection);
  }
};

function polyfill() {
    var local = undefined;

    if (typeof global !== 'undefined') {
        local = global;
    } else if (typeof self !== 'undefined') {
        local = self;
    } else {
        try {
            local = Function('return this')();
        } catch (e) {
            throw new Error('polyfill failed because global object is unavailable in this environment');
        }
    }

    var P = local.Promise;

    if (P) {
        var promiseToString = null;
        try {
            promiseToString = Object.prototype.toString.call(P.resolve());
        } catch (e) {
            // silently ignored
        }

        if (promiseToString === '[object Promise]' && !P.cast) {
            return;
        }
    }

    local.Promise = Promise;
}

polyfill();
// Strange compat..
Promise.polyfill = polyfill;
Promise.Promise = Promise;

return Promise;

})));

}).call(this,_dereq_('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"_process":4}],3:[function(_dereq_,module,exports){
'use strict';

var has = Object.prototype.hasOwnProperty;

//
// We store our EE objects in a plain object whose properties are event names.
// If `Object.create(null)` is not supported we prefix the event names with a
// `~` to make sure that the built-in object properties are not overridden or
// used as an attack vector.
// We also assume that `Object.create(null)` is available when the event name
// is an ES6 Symbol.
//
var prefix = typeof Object.create !== 'function' ? '~' : false;

/**
 * Representation of a single EventEmitter function.
 *
 * @param {Function} fn Event handler to be called.
 * @param {Mixed} context Context for function execution.
 * @param {Boolean} [once=false] Only emit once
 * @api private
 */
function EE(fn, context, once) {
  this.fn = fn;
  this.context = context;
  this.once = once || false;
}

/**
 * Minimal EventEmitter interface that is molded against the Node.js
 * EventEmitter interface.
 *
 * @constructor
 * @api public
 */
function EventEmitter() { /* Nothing to set */ }

/**
 * Hold the assigned EventEmitters by name.
 *
 * @type {Object}
 * @private
 */
EventEmitter.prototype._events = undefined;

/**
 * Return an array listing the events for which the emitter has registered
 * listeners.
 *
 * @returns {Array}
 * @api public
 */
EventEmitter.prototype.eventNames = function eventNames() {
  var events = this._events
    , names = []
    , name;

  if (!events) return names;

  for (name in events) {
    if (has.call(events, name)) names.push(prefix ? name.slice(1) : name);
  }

  if (Object.getOwnPropertySymbols) {
    return names.concat(Object.getOwnPropertySymbols(events));
  }

  return names;
};

/**
 * Return a list of assigned event listeners.
 *
 * @param {String} event The events that should be listed.
 * @param {Boolean} exists We only need to know if there are listeners.
 * @returns {Array|Boolean}
 * @api public
 */
EventEmitter.prototype.listeners = function listeners(event, exists) {
  var evt = prefix ? prefix + event : event
    , available = this._events && this._events[evt];

  if (exists) return !!available;
  if (!available) return [];
  if (available.fn) return [available.fn];

  for (var i = 0, l = available.length, ee = new Array(l); i < l; i++) {
    ee[i] = available[i].fn;
  }

  return ee;
};

/**
 * Emit an event to all registered event listeners.
 *
 * @param {String} event The name of the event.
 * @returns {Boolean} Indication if we've emitted an event.
 * @api public
 */
EventEmitter.prototype.emit = function emit(event, a1, a2, a3, a4, a5) {
  var evt = prefix ? prefix + event : event;

  if (!this._events || !this._events[evt]) return false;

  var listeners = this._events[evt]
    , len = arguments.length
    , args
    , i;

  if ('function' === typeof listeners.fn) {
    if (listeners.once) this.removeListener(event, listeners.fn, undefined, true);

    switch (len) {
      case 1: return listeners.fn.call(listeners.context), true;
      case 2: return listeners.fn.call(listeners.context, a1), true;
      case 3: return listeners.fn.call(listeners.context, a1, a2), true;
      case 4: return listeners.fn.call(listeners.context, a1, a2, a3), true;
      case 5: return listeners.fn.call(listeners.context, a1, a2, a3, a4), true;
      case 6: return listeners.fn.call(listeners.context, a1, a2, a3, a4, a5), true;
    }

    for (i = 1, args = new Array(len -1); i < len; i++) {
      args[i - 1] = arguments[i];
    }

    listeners.fn.apply(listeners.context, args);
  } else {
    var length = listeners.length
      , j;

    for (i = 0; i < length; i++) {
      if (listeners[i].once) this.removeListener(event, listeners[i].fn, undefined, true);

      switch (len) {
        case 1: listeners[i].fn.call(listeners[i].context); break;
        case 2: listeners[i].fn.call(listeners[i].context, a1); break;
        case 3: listeners[i].fn.call(listeners[i].context, a1, a2); break;
        default:
          if (!args) for (j = 1, args = new Array(len -1); j < len; j++) {
            args[j - 1] = arguments[j];
          }

          listeners[i].fn.apply(listeners[i].context, args);
      }
    }
  }

  return true;
};

/**
 * Register a new EventListener for the given event.
 *
 * @param {String} event Name of the event.
 * @param {Function} fn Callback function.
 * @param {Mixed} [context=this] The context of the function.
 * @api public
 */
EventEmitter.prototype.on = function on(event, fn, context) {
  var listener = new EE(fn, context || this)
    , evt = prefix ? prefix + event : event;

  if (!this._events) this._events = prefix ? {} : Object.create(null);
  if (!this._events[evt]) this._events[evt] = listener;
  else {
    if (!this._events[evt].fn) this._events[evt].push(listener);
    else this._events[evt] = [
      this._events[evt], listener
    ];
  }

  return this;
};

/**
 * Add an EventListener that's only called once.
 *
 * @param {String} event Name of the event.
 * @param {Function} fn Callback function.
 * @param {Mixed} [context=this] The context of the function.
 * @api public
 */
EventEmitter.prototype.once = function once(event, fn, context) {
  var listener = new EE(fn, context || this, true)
    , evt = prefix ? prefix + event : event;

  if (!this._events) this._events = prefix ? {} : Object.create(null);
  if (!this._events[evt]) this._events[evt] = listener;
  else {
    if (!this._events[evt].fn) this._events[evt].push(listener);
    else this._events[evt] = [
      this._events[evt], listener
    ];
  }

  return this;
};

/**
 * Remove event listeners.
 *
 * @param {String} event The event we want to remove.
 * @param {Function} fn The listener that we need to find.
 * @param {Mixed} context Only remove listeners matching this context.
 * @param {Boolean} once Only remove once listeners.
 * @api public
 */
EventEmitter.prototype.removeListener = function removeListener(event, fn, context, once) {
  var evt = prefix ? prefix + event : event;

  if (!this._events || !this._events[evt]) return this;

  var listeners = this._events[evt]
    , events = [];

  if (fn) {
    if (listeners.fn) {
      if (
           listeners.fn !== fn
        || (once && !listeners.once)
        || (context && listeners.context !== context)
      ) {
        events.push(listeners);
      }
    } else {
      for (var i = 0, length = listeners.length; i < length; i++) {
        if (
             listeners[i].fn !== fn
          || (once && !listeners[i].once)
          || (context && listeners[i].context !== context)
        ) {
          events.push(listeners[i]);
        }
      }
    }
  }

  //
  // Reset the array, or remove it completely if we have no more listeners.
  //
  if (events.length) {
    this._events[evt] = events.length === 1 ? events[0] : events;
  } else {
    delete this._events[evt];
  }

  return this;
};

/**
 * Remove all listeners or only the listeners for the specified event.
 *
 * @param {String} event The event want to remove all listeners for.
 * @api public
 */
EventEmitter.prototype.removeAllListeners = function removeAllListeners(event) {
  if (!this._events) return this;

  if (event) delete this._events[prefix ? prefix + event : event];
  else this._events = prefix ? {} : Object.create(null);

  return this;
};

//
// Alias methods names because people roll like that.
//
EventEmitter.prototype.off = EventEmitter.prototype.removeListener;
EventEmitter.prototype.addListener = EventEmitter.prototype.on;

//
// This function doesn't apply anymore.
//
EventEmitter.prototype.setMaxListeners = function setMaxListeners() {
  return this;
};

//
// Expose the prefix.
//
EventEmitter.prefixed = prefix;

//
// Expose the module.
//
if ('undefined' !== typeof module) {
  module.exports = EventEmitter;
}

},{}],4:[function(_dereq_,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],5:[function(_dereq_,module,exports){
(function (global){
(function(){var g={};
(function(window){var m,aa="function"==typeof Object.defineProperties?Object.defineProperty:function(a,b,c){a!=Array.prototype&&a!=Object.prototype&&(a[b]=c.value)},ba="undefined"!=typeof window&&window===this?this:"undefined"!=typeof global&&null!=global?global:this;function ca(){ca=function(){};ba.Symbol||(ba.Symbol=da)}var da=function(){var a=0;return function(b){return"jscomp_symbol_"+(b||"")+a++}}();
function ea(){ca();var a=ba.Symbol.iterator;a||(a=ba.Symbol.iterator=ba.Symbol("iterator"));"function"!=typeof Array.prototype[a]&&aa(Array.prototype,a,{configurable:!0,writable:!0,value:function(){return fa(this)}});ea=function(){}}function fa(a){var b=0;return ha(function(){return b<a.length?{done:!1,value:a[b++]}:{done:!0}})}function ha(a){ea();a={next:a};a[ba.Symbol.iterator]=function(){return this};return a}function ia(a){ea();var b=a[Symbol.iterator];return b?b.call(a):fa(a)}
function ja(a,b){if(b){for(var c=ba,d=a.split("."),e=0;e<d.length-1;e++){var f=d[e];f in c||(c[f]={});c=c[f]}d=d[d.length-1];e=c[d];f=b(e);f!=e&&null!=f&&aa(c,d,{configurable:!0,writable:!0,value:f})}}
ja("Promise",function(a){function b(a){this.W=0;this.f=void 0;this.a=[];var b=this.c();try{a(b.resolve,b.reject)}catch(k){b.reject(k)}}function c(){this.a=null}function d(a){return a instanceof b?a:new b(function(b){b(a)})}if(a)return a;c.prototype.b=function(a){null==this.a&&(this.a=[],this.f());this.a.push(a)};c.prototype.f=function(){var a=this;this.c(function(){a.h()})};var e=ba.setTimeout;c.prototype.c=function(a){e(a,0)};c.prototype.h=function(){for(;this.a&&this.a.length;){var a=this.a;this.a=
[];for(var b=0;b<a.length;++b){var c=a[b];delete a[b];try{c()}catch(l){this.g(l)}}}this.a=null};c.prototype.g=function(a){this.c(function(){throw a;})};b.prototype.c=function(){function a(a){return function(d){c||(c=!0,a.call(b,d))}}var b=this,c=!1;return{resolve:a(this.l),reject:a(this.b)}};b.prototype.l=function(a){if(a===this)this.b(new TypeError("A Promise cannot resolve to itself"));else if(a instanceof b)this.m(a);else{a:switch(typeof a){case "object":var c=null!=a;break a;case "function":c=
!0;break a;default:c=!1}c?this.j(a):this.g(a)}};b.prototype.j=function(a){var b=void 0;try{b=a.then}catch(k){this.b(k);return}"function"==typeof b?this.o(b,a):this.g(a)};b.prototype.b=function(a){this.h(2,a)};b.prototype.g=function(a){this.h(1,a)};b.prototype.h=function(a,b){if(0!=this.W)throw Error("Cannot settle("+a+", "+b|"): Promise already settled in state"+this.W);this.W=a;this.f=b;this.i()};b.prototype.i=function(){if(null!=this.a){for(var a=this.a,b=0;b<a.length;++b)a[b].call(),a[b]=null;
this.a=null}};var f=new c;b.prototype.m=function(a){var b=this.c();a.nb(b.resolve,b.reject)};b.prototype.o=function(a,b){var c=this.c();try{a.call(b,c.resolve,c.reject)}catch(l){c.reject(l)}};b.prototype.then=function(a,c){function d(a,b){return"function"==typeof a?function(b){try{e(a(b))}catch(w){f(w)}}:b}var e,f,g=new b(function(a,b){e=a;f=b});this.nb(d(a,e),d(c,f));return g};b.prototype["catch"]=function(a){return this.then(void 0,a)};b.prototype.nb=function(a,b){function c(){switch(d.W){case 1:a(d.f);
break;case 2:b(d.f);break;default:throw Error("Unexpected state: "+d.W);}}var d=this;null==this.a?f.b(c):this.a.push(function(){f.b(c)})};b.resolve=d;b.reject=function(a){return new b(function(b,c){c(a)})};b.race=function(a){return new b(function(b,c){for(var e=ia(a),f=e.next();!f.done;f=e.next())d(f.value).nb(b,c)})};b.all=function(a){var c=ia(a),e=c.next();return e.done?d([]):new b(function(a,b){function f(b){return function(c){g[b]=c;h--;0==h&&a(g)}}var g=[],h=0;do g.push(void 0),h++,d(e.value).nb(f(g.length-
1),b),e=c.next();while(!e.done)})};return b});ja("Array.prototype.find",function(a){return a?a:function(a,c){a:{var b=this;b instanceof String&&(b=String(b));for(var e=b.length,f=0;f<e;f++){var g=b[f];if(a.call(c,g,f,b)){b=g;break a}}b=void 0}return b}});var ka=this;ka.Ze=!0;function n(a,b){var c=a.split("."),d=ka;c[0]in d||!d.execScript||d.execScript("var "+c[0]);for(var e;c.length&&(e=c.shift());)c.length||void 0===b?d[e]?d=d[e]:d=d[e]={}:d[e]=b}
function la(a,b){function c(){}c.prototype=b.prototype;a.ef=b.prototype;a.prototype=new c;a.prototype.constructor=a;a.cf=function(a,c,f){return b.prototype[c].apply(a,Array.prototype.slice.call(arguments,2))}};/*

 Copyright 2016 Google Inc.

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
*/
function ma(a){this.c=Math.exp(Math.log(.5)/a);this.b=this.a=0}function na(a,b,c){var d=Math.pow(a.c,b);c=c*(1-d)+d*a.a;isNaN(c)||(a.a=c,a.b+=b)}function oa(a){return a.a/(1-Math.pow(a.c,a.b))};function pa(){this.b=new ma(2);this.c=new ma(5);this.a=0}pa.prototype.getBandwidthEstimate=function(a){return 128E3>this.a?a:Math.min(oa(this.b),oa(this.c))};function qa(){}function ra(){}window.console&&window.console.log.bind&&(qa=console.warn.bind(console));function p(a,b,c,d){this.severity=a;this.category=b;this.code=c;this.data=Array.prototype.slice.call(arguments,3);this.handled=!1}n("shaka.util.Error",p);p.prototype.toString=function(){return"shaka.util.Error "+JSON.stringify(this,null,"  ")};p.Severity={RECOVERABLE:1,CRITICAL:2};p.Category={NETWORK:1,TEXT:2,MEDIA:3,MANIFEST:4,STREAMING:5,DRM:6,PLAYER:7,CAST:8,STORAGE:9};
p.Code={UNSUPPORTED_SCHEME:1E3,BAD_HTTP_STATUS:1001,HTTP_ERROR:1002,TIMEOUT:1003,MALFORMED_DATA_URI:1004,UNKNOWN_DATA_URI_ENCODING:1005,REQUEST_FILTER_ERROR:1006,RESPONSE_FILTER_ERROR:1007,INVALID_TEXT_HEADER:2E3,INVALID_TEXT_CUE:2001,UNABLE_TO_DETECT_ENCODING:2003,BAD_ENCODING:2004,INVALID_XML:2005,INVALID_MP4_TTML:2007,INVALID_MP4_VTT:2008,UNABLE_TO_EXTRACT_CUE_START_TIME:2009,BUFFER_READ_OUT_OF_BOUNDS:3E3,JS_INTEGER_OVERFLOW:3001,EBML_OVERFLOW:3002,EBML_BAD_FLOATING_POINT_SIZE:3003,MP4_SIDX_WRONG_BOX_TYPE:3004,
MP4_SIDX_INVALID_TIMESCALE:3005,MP4_SIDX_TYPE_NOT_SUPPORTED:3006,WEBM_CUES_ELEMENT_MISSING:3007,WEBM_EBML_HEADER_ELEMENT_MISSING:3008,WEBM_SEGMENT_ELEMENT_MISSING:3009,WEBM_INFO_ELEMENT_MISSING:3010,WEBM_DURATION_ELEMENT_MISSING:3011,WEBM_CUE_TRACK_POSITIONS_ELEMENT_MISSING:3012,WEBM_CUE_TIME_ELEMENT_MISSING:3013,MEDIA_SOURCE_OPERATION_FAILED:3014,MEDIA_SOURCE_OPERATION_THREW:3015,VIDEO_ERROR:3016,QUOTA_EXCEEDED_ERROR:3017,UNABLE_TO_GUESS_MANIFEST_TYPE:4E3,DASH_INVALID_XML:4001,DASH_NO_SEGMENT_INFO:4002,
DASH_EMPTY_ADAPTATION_SET:4003,DASH_EMPTY_PERIOD:4004,DASH_WEBM_MISSING_INIT:4005,DASH_UNSUPPORTED_CONTAINER:4006,DASH_PSSH_BAD_ENCODING:4007,DASH_NO_COMMON_KEY_SYSTEM:4008,DASH_MULTIPLE_KEY_IDS_NOT_SUPPORTED:4009,DASH_CONFLICTING_KEY_IDS:4010,UNPLAYABLE_PERIOD:4011,RESTRICTIONS_CANNOT_BE_MET:4012,NO_PERIODS:4014,HLS_PLAYLIST_HEADER_MISSING:4015,INVALID_HLS_TAG:4016,HLS_INVALID_PLAYLIST_HIERARCHY:4017,DASH_DUPLICATE_REPRESENTATION_ID:4018,HLS_MULTIPLE_MEDIA_INIT_SECTIONS_FOUND:4020,HLS_COULD_NOT_GUESS_MIME_TYPE:4021,
HLS_MASTER_PLAYLIST_NOT_PROVIDED:4022,HLS_REQUIRED_ATTRIBUTE_MISSING:4023,HLS_REQUIRED_TAG_MISSING:4024,HLS_COULD_NOT_GUESS_CODECS:4025,HLS_KEYFORMATS_NOT_SUPPORTED:4026,DASH_UNSUPPORTED_XLINK_ACTUATE:4027,DASH_XLINK_DEPTH_LIMIT:4028,HLS_COULD_NOT_PARSE_SEGMENT_START_TIME:4030,INVALID_STREAMS_CHOSEN:5005,NO_RECOGNIZED_KEY_SYSTEMS:6E3,REQUESTED_KEY_SYSTEM_CONFIG_UNAVAILABLE:6001,FAILED_TO_CREATE_CDM:6002,FAILED_TO_ATTACH_TO_VIDEO:6003,INVALID_SERVER_CERTIFICATE:6004,FAILED_TO_CREATE_SESSION:6005,FAILED_TO_GENERATE_LICENSE_REQUEST:6006,
LICENSE_REQUEST_FAILED:6007,LICENSE_RESPONSE_REJECTED:6008,ENCRYPTED_CONTENT_WITHOUT_DRM_INFO:6010,NO_LICENSE_SERVER_GIVEN:6012,OFFLINE_SESSION_REMOVED:6013,EXPIRED:6014,LOAD_INTERRUPTED:7E3,CAST_API_UNAVAILABLE:8E3,NO_CAST_RECEIVERS:8001,ALREADY_CASTING:8002,UNEXPECTED_CAST_ERROR:8003,CAST_CANCELED_BY_USER:8004,CAST_CONNECTION_TIMED_OUT:8005,CAST_RECEIVER_APP_UNAVAILABLE:8006,STORAGE_NOT_SUPPORTED:9E3,INDEXED_DB_ERROR:9001,OPERATION_ABORTED:9002,REQUESTED_ITEM_NOT_FOUND:9003,MALFORMED_OFFLINE_URI:9004,
CANNOT_STORE_LIVE_OFFLINE:9005,STORE_ALREADY_IN_PROGRESS:9006,NO_INIT_DATA_FOR_OFFLINE:9007,LOCAL_PLAYER_INSTANCE_REQUIRED:9008,CONTENT_UNSUPPORTED_BY_BROWSER:9009,UNSUPPORTED_UPGRADE_REQUEST:9010};var sa=/^(?:([^:/?#.]+):)?(?:\/\/(?:([^/?#]*)@)?([^/#?]*?)(?::([0-9]+))?(?=[/#?]|$))?([^?#]+)?(?:\?([^#]*))?(?:#(.*))?$/;function ta(a){var b;a instanceof ta?(ua(this,a.fa),this.Ba=a.Ba,this.ja=a.ja,va(this,a.Ka),this.aa=a.aa,wa(this,xa(a.a)),this.va=a.va):a&&(b=String(a).match(sa))?(ua(this,b[1]||"",!0),this.Ba=ya(b[2]||""),this.ja=ya(b[3]||"",!0),va(this,b[4]),this.aa=ya(b[5]||"",!0),wa(this,b[6]||"",!0),this.va=ya(b[7]||"")):this.a=new za(null)}m=ta.prototype;m.fa="";m.Ba="";m.ja="";m.Ka=null;m.aa="";m.va="";
m.toString=function(){var a=[],b=this.fa;b&&a.push(Aa(b,Ba,!0),":");if(b=this.ja){a.push("//");var c=this.Ba;c&&a.push(Aa(c,Ba,!0),"@");a.push(encodeURIComponent(b).replace(/%25([0-9a-fA-F]{2})/g,"%$1"));b=this.Ka;null!=b&&a.push(":",String(b))}if(b=this.aa)this.ja&&"/"!=b.charAt(0)&&a.push("/"),a.push(Aa(b,"/"==b.charAt(0)?Ca:Da,!0));(b=this.a.toString())&&a.push("?",b);(b=this.va)&&a.push("#",Aa(b,Ea));return a.join("")};
m.resolve=function(a){var b=new ta(this);"data"===b.fa&&(b=new ta);var c=!!a.fa;c?ua(b,a.fa):c=!!a.Ba;c?b.Ba=a.Ba:c=!!a.ja;c?b.ja=a.ja:c=null!=a.Ka;var d=a.aa;if(c)va(b,a.Ka);else if(c=!!a.aa){if("/"!=d.charAt(0))if(this.ja&&!this.aa)d="/"+d;else{var e=b.aa.lastIndexOf("/");-1!=e&&(d=b.aa.substr(0,e+1)+d)}if(".."==d||"."==d)d="";else if(-1!=d.indexOf("./")||-1!=d.indexOf("/.")){e=0==d.lastIndexOf("/",0);d=d.split("/");for(var f=[],g=0;g<d.length;){var h=d[g++];"."==h?e&&g==d.length&&f.push(""):".."==
h?((1<f.length||1==f.length&&""!=f[0])&&f.pop(),e&&g==d.length&&f.push("")):(f.push(h),e=!0)}d=f.join("/")}}c?b.aa=d:c=""!==a.a.toString();c?wa(b,xa(a.a)):c=!!a.va;c&&(b.va=a.va);return b};function ua(a,b,c){a.fa=c?ya(b,!0):b;a.fa&&(a.fa=a.fa.replace(/:$/,""))}function va(a,b){if(b){b=Number(b);if(isNaN(b)||0>b)throw Error("Bad port number "+b);a.Ka=b}else a.Ka=null}function wa(a,b,c){b instanceof za?a.a=b:(c||(b=Aa(b,Fa)),a.a=new za(b))}
function ya(a,b){return a?b?decodeURI(a):decodeURIComponent(a):""}function Aa(a,b,c){return"string"==typeof a?(a=encodeURI(a).replace(b,Ga),c&&(a=a.replace(/%25([0-9a-fA-F]{2})/g,"%$1")),a):null}function Ga(a){a=a.charCodeAt(0);return"%"+(a>>4&15).toString(16)+(a&15).toString(16)}var Ba=/[#\/\?@]/g,Da=/[#\?:]/g,Ca=/[#\?]/g,Fa=/[#\?@]/g,Ea=/#/g;function za(a){this.b=a||null}za.prototype.a=null;za.prototype.c=null;
za.prototype.add=function(a,b){if(!this.a&&(this.a={},this.c=0,this.b))for(var c=this.b.split("&"),d=0;d<c.length;d++){var e=c[d].indexOf("="),f=null;if(0<=e){var g=c[d].substring(0,e);f=c[d].substring(e+1)}else g=c[d];g=decodeURIComponent(g.replace(/\+/g," "));f=f||"";this.add(g,decodeURIComponent(f.replace(/\+/g," ")))}this.b=null;(c=this.a.hasOwnProperty(a)&&this.a[a])||(this.a[a]=c=[]);c.push(b);this.c++;return this};
za.prototype.toString=function(){if(this.b)return this.b;if(!this.a)return"";var a=[],b;for(b in this.a)for(var c=encodeURIComponent(b),d=this.a[b],e=0;e<d.length;e++){var f=c;""!==d[e]&&(f+="="+encodeURIComponent(d[e]));a.push(f)}return this.b=a.join("&")};function xa(a){var b=new za;b.b=a.b;if(a.a){var c={},d;for(d in a.a)c[d]=a.a[d].concat();b.a=c;b.c=a.c}return b};function u(){var a,b,c=new Promise(function(c,e){a=c;b=e});c.resolve=a;c.reject=b;return c}u.prototype.resolve=function(){};u.prototype.reject=function(){};function Ha(a,b,c){var d=Ia();this.j=null==a.maxAttempts?d.maxAttempts:a.maxAttempts;this.f=null==a.baseDelay?d.baseDelay:a.baseDelay;this.i=null==a.fuzzFactor?d.fuzzFactor:a.fuzzFactor;this.h=null==a.backoffFactor?d.backoffFactor:a.backoffFactor;this.a=0;this.b=this.f;this.c=b||!1;this.g=c||null;this.c&&(this.a=1)}function Ja(a){if(a.a>=a.j)if(a.c)a.a=1,a.b=a.f;else return Promise.reject();var b=new u;a.a?(Ka(a,b.resolve,a.b*(1+(2*Math.random()-1)*a.i)),a.b*=a.h):b.resolve();a.a++;return b}
function Ia(){return{maxAttempts:2,baseDelay:1E3,backoffFactor:2,fuzzFactor:.5,timeout:0}}function Ka(a,b,c){if(a.g)if(a.g()||0==c)b();else{var d=Math.min(200,c);La(function(){Ka(this,b,c-d)}.bind(a),d)}else La(b,c)}function La(a,b){window.setTimeout(a,b)};function Ma(a,b,c,d,e){var f=e in d,g;for(g in b){var h=e+"."+g,k=f?d[e]:c[g];if(f||g in a)void 0===b[g]?void 0===k||f?delete a[g]:a[g]=k:k.constructor==Object&&b[g]&&b[g].constructor==Object?(a[g]||(a[g]=k),Ma(a[g],b[g],k,d,h)):typeof b[g]==typeof k&&null!=b[g]&&b[g].constructor==k.constructor&&(a[g]=b[g])}}
function Na(a){function b(a){switch(typeof a){case "undefined":case "boolean":case "number":case "string":case "symbol":case "function":return a;default:if(!a)return a;if(0<=c.indexOf(a))return null;var d=a.constructor==Array;if(a.constructor!=Object&&!d)return null;c.push(a);var f=d?[]:{},g;for(g in a)f[g]=b(a[g]);d&&(f.length=a.length);return f}}var c=[];return b(a)};function Oa(a,b){return a.reduce(function(a,b,e){return b["catch"](a.bind(null,e))}.bind(null,b),Promise.reject())}function Pa(a,b){return a.concat(b)}function Qa(){}function Ra(a){return null!=a}function Sa(a,b,c){return c.indexOf(a)==b};function x(a){this.f=!1;this.a=[];this.b=[];this.c=[];this.g=a||null}n("shaka.net.NetworkingEngine",x);x.RequestType={MANIFEST:0,SEGMENT:1,LICENSE:2,APP:3};x.PluginPriority={$e:1,bf:2,Xe:3};var Ta={};function Ua(a,b,c){c=c||3;var d=Ta[a];if(!d||c>=d.ke)Ta[a]={ke:c,ie:b}}x.registerScheme=Ua;x.unregisterScheme=function(a){delete Ta[a]};x.prototype.me=function(a){this.b.push(a)};x.prototype.registerRequestFilter=x.prototype.me;x.prototype.Qe=function(a){var b=this.b;a=b.indexOf(a);0<=a&&b.splice(a,1)};
x.prototype.unregisterRequestFilter=x.prototype.Qe;x.prototype.cd=function(){this.b=[]};x.prototype.clearAllRequestFilters=x.prototype.cd;x.prototype.ne=function(a){this.c.push(a)};x.prototype.registerResponseFilter=x.prototype.ne;x.prototype.Re=function(a){var b=this.c;a=b.indexOf(a);0<=a&&b.splice(a,1)};x.prototype.unregisterResponseFilter=x.prototype.Re;x.prototype.dd=function(){this.c=[]};x.prototype.clearAllResponseFilters=x.prototype.dd;
function Va(a,b){return{uris:a,method:"GET",body:null,headers:{},allowCrossSiteCredentials:!1,retryParameters:b}}x.prototype.destroy=function(){this.f=!0;this.b=[];this.c=[];for(var a=[],b=0;b<this.a.length;++b)a.push(this.a[b]["catch"](Qa));return Promise.all(a)};x.prototype.destroy=x.prototype.destroy;
x.prototype.request=function(a,b,c){var d=c||function(){return!1};if(this.f)return Promise.reject();b.method=b.method||"GET";b.headers=b.headers||{};b.retryParameters=b.retryParameters?Na(b.retryParameters):Ia();b.uris=Na(b.uris);var e=Date.now(),f=Promise.resolve();this.b.forEach(function(c){f=f.then(c.bind(null,a,b))});f=f["catch"](function(a){throw new p(2,1,1006,a);});f=f.then(function(){var f=Date.now()-e,h=new Ha(b.retryParameters,!1,c);return Ja(h).then(function(){return Wa(this,a,b,h,0,f,
d)}.bind(this))}.bind(this));this.a.push(f);return f.then(function(b){0<=this.a.indexOf(f)&&this.a.splice(this.a.indexOf(f),1);this.g&&!b.fromCache&&1==a&&this.g(b.timeMs,b.data.byteLength);return b}.bind(this))["catch"](function(a){a&&(a.severity=2);0<=this.a.indexOf(f)&&this.a.splice(this.a.indexOf(f),1);return Promise.reject(a)}.bind(this))};x.prototype.request=x.prototype.request;
function Wa(a,b,c,d,e,f,g){if(a.f||g())return Promise.reject();var h=new ta(c.uris[e]),k=h.fa;k||(k=location.protocol,k=k.slice(0,-1),ua(h,k),c.uris[e]=h.toString());k=(k=Ta[k])?k.ie:null;if(!k)return Promise.reject(new p(2,1,1E3,h));var l=Date.now();return k(c.uris[e],c,b).then(function(a){void 0==a.timeMs&&(a.timeMs=Date.now()-l);var c=Date.now(),d=Promise.resolve();this.c.forEach(function(c){d=d.then(function(){return Promise.resolve(c(b,a))}.bind(this))}.bind(this));d=d["catch"](function(a){var b=
2;a instanceof p&&(b=a.severity);throw new p(b,1,1007,a);});return d.then(function(){a.timeMs+=Date.now()-c;a.timeMs+=f;return a})}.bind(a))["catch"](function(a){if(a&&1==a.severity)return e=(e+1)%c.uris.length,g()?Promise.reject():Ja(d).then(function(){return Wa(this,b,c,d,e,f,g)}.bind(this),function(){throw a;});throw a;}.bind(a))};function Xa(a,b){for(var c=[],d=0;d<a.length;++d){for(var e=!1,f=0;f<c.length&&!(e=b?b(a[d],c[f]):a[d]===c[f]);++f);e||c.push(a[d])}return c}function Ya(a,b,c){for(var d=0;d<a.length;++d)if(c(a[d],b))return d;return-1}function Za(a,b){var c=a.indexOf(b);-1<c&&a.splice(c,1)}function $a(a,b){var c=0;a.forEach(function(a){c+=b(a)?1:0});return c};function ab(){this.a={}}ab.prototype.push=function(a,b){this.a.hasOwnProperty(a)?this.a[a].push(b):this.a[a]=[b]};ab.prototype.get=function(a){return(a=this.a[a])?a.slice():null};ab.prototype.remove=function(a,b){var c=this.a[a];if(c)for(var d=0;d<c.length;++d)c[d]==b&&(c.splice(d,1),--d)};function bb(){this.a=new ab}bb.prototype.destroy=function(){cb(this);this.a=null;return Promise.resolve()};function z(a,b,c,d){a.a&&(b=new db(b,c,d),a.a.push(c,b))}function eb(a,b,c,d){z(a,b,c,function(a){this.ia(b,c);d(a)}.bind(a))}bb.prototype.ia=function(a,b){if(this.a)for(var c=this.a.get(b)||[],d=0;d<c.length;++d){var e=c[d];e.target==a&&(e.ia(),this.a.remove(b,e))}};function cb(a){if(a.a){var b=a.a,c=[],d;for(d in b.a)c.push.apply(c,b.a[d]);for(b=0;b<c.length;++b)c[b].ia();a.a.a={}}}
function db(a,b,c){this.target=a;this.type=b;this.a=c;this.target.addEventListener(b,c,!1)}db.prototype.ia=function(){this.target.removeEventListener(this.type,this.a,!1);this.a=this.target=null};function A(a,b){var c=b||{},d;for(d in c)this[d]=c[d];this.defaultPrevented=this.cancelable=this.bubbles=!1;this.timeStamp=window.performance&&window.performance.now?window.performance.now():Date.now();this.type=a;this.isTrusted=!1;this.target=this.currentTarget=null;this.a=!1}A.prototype.preventDefault=function(){this.cancelable&&(this.defaultPrevented=!0)};A.prototype.stopImmediatePropagation=function(){this.a=!0};A.prototype.stopPropagation=function(){};function B(a,b){if(0==b.length)return a;var c=b.map(function(a){return new ta(a)});return a.map(function(a){return new ta(a)}).map(function(a){return c.map(a.resolve.bind(a))}).reduce(Pa,[]).map(function(a){return a.toString()})}function fb(a,b){return{keySystem:a,licenseServerUri:"",distinctiveIdentifierRequired:!1,persistentStateRequired:!1,audioRobustness:"",videoRobustness:"",serverCertificate:null,initData:b||[],keyIds:[]}}var gb=1/15;function hb(a){return!a||0==Object.keys(a).length}function ib(a){return Object.keys(a).map(function(b){return a[b]})}function jb(a,b){return Object.keys(a).every(function(c){return b(c,a[c])})}function kb(a,b){Object.keys(a).forEach(function(c){b(c,a[c])})};function lb(a,b){var c=a;b&&(c+='; codecs="'+b+'"');return c}var mb={codecs:"codecs",frameRate:"framerate",bandwidth:"bitrate",width:"width",height:"height",channelsCount:"channels"};function C(a){if(!a)return"";a=new Uint8Array(a);239==a[0]&&187==a[1]&&191==a[2]&&(a=a.subarray(3));a=escape(nb(a));try{return decodeURIComponent(a)}catch(b){throw new p(2,2,2004);}}n("shaka.util.StringUtils.fromUTF8",C);
function ob(a,b,c){if(!a)return"";if(!c&&0!=a.byteLength%2)throw new p(2,2,2004);if(a instanceof ArrayBuffer)var d=a;else c=new Uint8Array(a.byteLength),c.set(new Uint8Array(a)),d=c.buffer;a=Math.floor(a.byteLength/2);c=new Uint16Array(a);d=new DataView(d);for(var e=0;e<a;e++)c[e]=d.getUint16(2*e,b);return nb(c)}n("shaka.util.StringUtils.fromUTF16",ob);
function pb(a){var b=new Uint8Array(a);if(239==b[0]&&187==b[1]&&191==b[2])return C(b);if(254==b[0]&&255==b[1])return ob(b.subarray(2),!1);if(255==b[0]&&254==b[1])return ob(b.subarray(2),!0);var c=function(a,b){return a.byteLength<=b||32<=a[b]&&126>=a[b]}.bind(null,b);if(0==b[0]&&0==b[2])return ob(a,!1);if(0==b[1]&&0==b[3])return ob(a,!0);if(c(0)&&c(1)&&c(2)&&c(3))return C(a);throw new p(2,2,2003);}n("shaka.util.StringUtils.fromBytesAutoDetect",pb);
function qb(a){a=encodeURIComponent(a);a=unescape(a);for(var b=new Uint8Array(a.length),c=0;c<a.length;++c)b[c]=a.charCodeAt(c);return b.buffer}n("shaka.util.StringUtils.toUTF8",qb);function nb(a){for(var b="",c=0;c<a.length;c+=16E3)b+=String.fromCharCode.apply(null,a.subarray(c,c+16E3));return b};function rb(a){this.a=null;this.b=function(){this.a=null;a()}.bind(this)}rb.prototype.cancel=function(){null!=this.a&&(clearTimeout(this.a),this.a=null)};function sb(a,b){a.cancel();a.a=setTimeout(a.b,1E3*b)}function tb(a,b){a.cancel();var c=function(){this.b();this.a=setTimeout(c,1E3*b)}.bind(a);a.a=setTimeout(c,1E3*b)};function ub(a,b){var c=void 0==b?!0:b,d=window.btoa(String.fromCharCode.apply(null,a)).replace(/\+/g,"-").replace(/\//g,"_");return c?d:d.replace(/=*$/,"")}n("shaka.util.Uint8ArrayUtils.toBase64",ub);function vb(a){a=window.atob(a.replace(/-/g,"+").replace(/_/g,"/"));for(var b=new Uint8Array(a.length),c=0;c<a.length;++c)b[c]=a.charCodeAt(c);return b}n("shaka.util.Uint8ArrayUtils.fromBase64",vb);
function wb(a){for(var b=new Uint8Array(a.length/2),c=0;c<a.length;c+=2)b[c/2]=window.parseInt(a.substr(c,2),16);return b}n("shaka.util.Uint8ArrayUtils.fromHex",wb);function xb(a){for(var b="",c=0;c<a.length;++c){var d=a[c].toString(16);1==d.length&&(d="0"+d);b+=d}return b}n("shaka.util.Uint8ArrayUtils.toHex",xb);function yb(a,b){if(!a&&!b)return!0;if(!a||!b||a.length!=b.length)return!1;for(var c=0;c<a.length;++c)if(a[c]!=b[c])return!1;return!0}n("shaka.util.Uint8ArrayUtils.equal",yb);
function zb(a){for(var b=0,c=0;c<arguments.length;++c)b+=arguments[c].length;b=new Uint8Array(b);var d=0;for(c=0;c<arguments.length;++c)b.set(arguments[c],d),d+=arguments[c].length;return b}n("shaka.util.Uint8ArrayUtils.concat",zb);function Ab(a){this.o=a;this.l=this.j=this.u=null;this.K=!1;this.b=null;this.g=new bb;this.a=[];this.m=[];this.i=new u;this.f=null;this.h=function(b){this.i.reject(b);a.onError(b)}.bind(this);this.A={};this.D=new rb(this.le.bind(this));this.Y=this.c=!1;this.J=[];this.X=!1;this.v=new rb(this.je.bind(this));tb(this.v,1);this.i["catch"](function(){})}m=Ab.prototype;
m.destroy=function(){this.c=!0;var a=[];this.a.forEach(function(b){b=b.ga.close()["catch"](Qa);var c=new Promise(function(a){setTimeout(a,1E3)});a.push(Promise.race([b,c]))});this.i.reject();this.g&&a.push(this.g.destroy());this.l&&a.push(this.l.setMediaKeys(null)["catch"](Qa));this.v&&(this.v.cancel(),this.v=null);this.D&&(this.D.cancel(),this.D=null);this.g=this.l=this.j=this.u=this.b=null;this.a=[];this.m=[];this.o=this.h=this.f=null;return Promise.all(a)};m.configure=function(a){this.f=a};
m.init=function(a,b){var c={},d=[];this.Y=b;this.m=a.offlineSessionIds;Bb(this,a,b||0<a.offlineSessionIds.length,c,d);return d.length?Cb(this,c,d):(this.K=!0,Promise.resolve())};
function Db(a,b){if(!a.j)return eb(a.g,b,"encrypted",function(){this.h(new p(2,6,6010))}.bind(a)),Promise.resolve();a.l=b;eb(a.g,a.l,"play",a.Pd.bind(a));var c=a.l.setMediaKeys(a.j);c=c["catch"](function(a){return Promise.reject(new p(2,6,6003,a.message))});var d=null;a.b.serverCertificate&&a.b.serverCertificate.length&&(d=a.j.setServerCertificate(a.b.serverCertificate).then(function(){})["catch"](function(a){return Promise.reject(new p(2,6,6004,a.message))}));return Promise.all([c,d]).then(function(){if(this.c)return Promise.reject();
Eb(this);this.b.initData.length||this.m.length||z(this.g,this.l,"encrypted",this.Ed.bind(this))}.bind(a))["catch"](function(a){return this.c?Promise.resolve():Promise.reject(a)}.bind(a))}function Fb(a,b){return Promise.all(b.map(function(a){return Gb(this,a).then(function(a){if(a){for(var b=new u,c=0;c<this.a.length;c++)if(this.a[c].ga==a){this.a[c].oa=b;break}return Promise.all([a.remove(),b])}}.bind(this))}.bind(a)))}
function Eb(a){var b=a.b?a.b.initData:[];b.forEach(function(a){Hb(this,a.initDataType,a.initData)}.bind(a));a.m.forEach(function(a){Gb(this,a)}.bind(a));b.length||a.m.length||a.i.resolve();return a.i}m.keySystem=function(){return this.b?this.b.keySystem:""};function Ib(a){return a.a.map(function(a){return a.ga.sessionId})}m.qb=function(){var a=this.a.map(function(a){a=a.ga.expiration;return isNaN(a)?Infinity:a});return Math.min.apply(Math,a)};
function Bb(a,b,c,d,e){var f=Jb(a),g=Kb(a,b);b.periods.forEach(function(a){a.variants.forEach(function(a){f&&(a.drmInfos=[f]);g&&(a.drmInfos=g);a.drmInfos.forEach(function(b){Lb(this,b);window.cast&&window.cast.__platform__&&"com.microsoft.playready"==b.keySystem&&(b.keySystem="com.chromecast.playready");var f=d[b.keySystem];f||(f={audioCapabilities:[],videoCapabilities:[],distinctiveIdentifier:"optional",persistentState:c?"required":"optional",sessionTypes:[c?"persistent-license":"temporary"],label:b.keySystem,
drmInfos:[]},d[b.keySystem]=f,e.push(b.keySystem));f.drmInfos.push(b);b.distinctiveIdentifierRequired&&(f.distinctiveIdentifier="required");b.persistentStateRequired&&(f.persistentState="required");var g=[];a.video&&g.push(a.video);a.audio&&g.push(a.audio);g.forEach(function(a){("video"==a.type?f.videoCapabilities:f.audioCapabilities).push({robustness:("video"==a.type?b.videoRobustness:b.audioRobustness)||"",contentType:lb(a.mimeType,a.codecs)})}.bind(this))}.bind(this))}.bind(this))}.bind(a))}
function Cb(a,b,c){if(1==c.length&&""==c[0])return Promise.reject(new p(2,6,6E3));var d=new u,e=d;[!0,!1].forEach(function(a){c.forEach(function(c){var d=b[c];d.drmInfos.some(function(a){return!!a.licenseServerUri})==a&&(0==d.audioCapabilities.length&&delete d.audioCapabilities,0==d.videoCapabilities.length&&delete d.videoCapabilities,e=e["catch"](function(){return this.c?Promise.reject():navigator.requestMediaKeySystemAccess(c,[d])}.bind(this)))}.bind(this))}.bind(a));e=e["catch"](function(){return Promise.reject(new p(2,
6,6001))});e=e.then(function(a){if(this.c)return Promise.reject();var c=0<=navigator.userAgent.indexOf("Edge/"),d=a.getConfiguration();this.u=(d.audioCapabilities||[]).concat(d.videoCapabilities||[]).map(function(a){return a.contentType});c&&(this.u=null);c=b[a.keySystem];Mb(this,a.keySystem,c,c.drmInfos);return this.b.licenseServerUri?a.createMediaKeys():Promise.reject(new p(2,6,6012))}.bind(a)).then(function(a){if(this.c)return Promise.reject();this.j=a;this.K=!0}.bind(a))["catch"](function(a){if(this.c)return Promise.resolve();
this.u=this.b=null;return a instanceof p?Promise.reject(a):Promise.reject(new p(2,6,6002,a.message))}.bind(a));d.reject();return e}
function Lb(a,b){var c=b.keySystem;if(c){if(!b.licenseServerUri){var d=a.f.servers[c];d&&(b.licenseServerUri=d)}b.keyIds||(b.keyIds=[]);if(c=a.f.advanced[c])b.distinctiveIdentifierRequired||(b.distinctiveIdentifierRequired=c.distinctiveIdentifierRequired),b.persistentStateRequired||(b.persistentStateRequired=c.persistentStateRequired),b.videoRobustness||(b.videoRobustness=c.videoRobustness),b.audioRobustness||(b.audioRobustness=c.audioRobustness),b.serverCertificate||(b.serverCertificate=c.serverCertificate)}}
function Jb(a){if(hb(a.f.clearKeys))return null;var b=[],c=[],d;for(d in a.f.clearKeys){var e=a.f.clearKeys[d],f=wb(d);e=wb(e);f={kty:"oct",kid:ub(f,!1),k:ub(e,!1)};b.push(f);c.push(f.kid)}a=JSON.stringify({keys:b});c=JSON.stringify({kids:c});c=[{initData:new Uint8Array(qb(c)),initDataType:"keyids"}];return{keySystem:"org.w3.clearkey",licenseServerUri:"data:application/json;base64,"+window.btoa(a),distinctiveIdentifierRequired:!1,persistentStateRequired:!1,audioRobustness:"",videoRobustness:"",serverCertificate:null,
initData:c,keyIds:[]}}function Kb(a,b){var c=a.f,d=Object.keys(c.servers);return!d.length||b.periods.some(function(a){return a.variants.some(function(a){return a.drmInfos.length})})?null:d.map(function(a){return{keySystem:a,licenseServerUri:c.servers[a],distinctiveIdentifierRequired:!1,persistentStateRequired:!1,audioRobustness:"",videoRobustness:"",serverCertificate:null,initData:[],keyIds:[]}})}
function Mb(a,b,c,d){var e=[],f=[],g=[],h=[];Nb(d,e,f,g,h);a.b={keySystem:b,licenseServerUri:e[0],distinctiveIdentifierRequired:"required"==c.distinctiveIdentifier,persistentStateRequired:"required"==c.persistentState,audioRobustness:c.audioCapabilities?c.audioCapabilities[0].robustness:"",videoRobustness:c.videoCapabilities?c.videoCapabilities[0].robustness:"",serverCertificate:f[0],initData:g,keyIds:h}}
function Nb(a,b,c,d,e){function f(a,b){return a.keyId&&a.keyId==b.keyId?!0:a.initDataType==b.initDataType&&yb(a.initData,b.initData)}a.forEach(function(a){-1==b.indexOf(a.licenseServerUri)&&b.push(a.licenseServerUri);a.serverCertificate&&-1==Ya(c,a.serverCertificate,yb)&&c.push(a.serverCertificate);a.initData&&a.initData.forEach(function(a){-1==Ya(d,a,f)&&d.push(a)});if(a.keyIds)for(var g=0;g<a.keyIds.length;++g)-1==e.indexOf(a.keyIds[g])&&e.push(a.keyIds[g])})}
m.Ed=function(a){for(var b=new Uint8Array(a.initData),c=0;c<this.a.length;++c)if(yb(b,this.a[c].initData))return;Hb(this,a.initDataType,b)};
function Gb(a,b){try{var c=a.j.createSession("persistent-license")}catch(f){var d=new p(2,6,6005,f.message);a.h(d);return Promise.reject(d)}z(a.g,c,"message",a.Dc.bind(a));z(a.g,c,"keystatuseschange",a.xc.bind(a));var e={initData:null,ga:c,loaded:!1,Qb:Infinity,oa:null};a.a.push(e);return c.load(b).then(function(a){if(!this.c){if(a)return e.loaded=!0,this.a.every(function(a){return a.loaded})&&this.i.resolve(),c;this.a.splice(this.a.indexOf(e),1);this.h(new p(2,6,6013))}}.bind(a),function(a){this.c||
(this.a.splice(this.a.indexOf(e),1),this.h(new p(2,6,6005,a.message)))}.bind(a))}
function Hb(a,b,c){try{var d=a.Y?a.j.createSession("persistent-license"):a.j.createSession()}catch(e){a.h(new p(2,6,6005,e.message));return}z(a.g,d,"message",a.Dc.bind(a));z(a.g,d,"keystatuseschange",a.xc.bind(a));a.a.push({initData:c,ga:d,loaded:!1,Qb:Infinity,oa:null});d.generateRequest(b,c.buffer)["catch"](function(a){if(!this.c){for(var b=0;b<this.a.length;++b)if(this.a[b].ga==d){this.a.splice(b,1);break}this.h(new p(2,6,6006,a.message))}}.bind(a))}
m.Dc=function(a){this.f.delayLicenseRequestUntilPlayed&&this.l.paused&&!this.X?this.J.push(a):Ob(this,a)};
function Ob(a,b){for(var c=b.target,d,e=0;e<a.a.length;e++)if(a.a[e].ga==c){d=a.a[e];break}e=Va([a.b.licenseServerUri],a.f.retryParameters);e.body=b.message;e.method="POST";"com.microsoft.playready"!=a.b.keySystem&&"com.chromecast.playready"!=a.b.keySystem||Pb(e);a.o.Va.request(2,e).then(function(a){return this.c?Promise.reject():c.update(a.data).then(function(){this.o.onEvent(new A("drmsessionupdate"));d&&(d.oa&&d.oa.resolve(),setTimeout(function(){d.loaded=!0;this.a.every(function(a){return a.loaded})&&
this.i.resolve()}.bind(this),5E3))}.bind(this))}.bind(a),function(a){if(this.c)return Promise.resolve();a=new p(2,6,6007,a);this.h(a);d&&d.oa&&d.oa.reject(a)}.bind(a))["catch"](function(a){if(this.c)return Promise.resolve();a=new p(2,6,6008,a.message);this.h(a);d&&d.oa&&d.oa.reject(a)}.bind(a))}
function Pb(a){var b=ob(a.body,!0,!0);if(-1==b.indexOf("PlayReadyKeyMessage"))a.headers["Content-Type"]="text/xml; charset=utf-8";else{b=(new DOMParser).parseFromString(b,"application/xml");for(var c=b.getElementsByTagName("HttpHeader"),d=0;d<c.length;++d)a.headers[c[d].querySelector("name").textContent]=c[d].querySelector("value").textContent;a.body=vb(b.querySelector("Challenge").textContent).buffer}}
m.xc=function(a){a=a.target;var b;for(b=0;b<this.a.length&&this.a[b].ga!=a;++b);if(b!=this.a.length){var c=!1;a.keyStatuses.forEach(function(a,d){if("string"==typeof d){var e=d;d=a;a=e}if("com.microsoft.playready"==this.b.keySystem&&16==d.byteLength){e=new DataView(d);var f=e.getUint32(0,!0),k=e.getUint16(4,!0),l=e.getUint16(6,!0);e.setUint32(0,f,!1);e.setUint16(4,k,!1);e.setUint16(6,l,!1)}"com.microsoft.playready"==this.b.keySystem&&"status-pending"==a&&(a="usable");"status-pending"!=a&&(this.a[b].loaded=
!0,this.a.every(function(a){return a.loaded})&&this.i.resolve());"expired"==a&&(c=!0);e=xb(new Uint8Array(d));this.A[e]=a}.bind(this));var d=a.expiration-Date.now();(0>d||c&&1E3>d)&&!this.a[b].oa&&(this.a.splice(b,1),a.close());sb(this.D,.5)}};m.le=function(){function a(a,c){return"expired"==c}!hb(this.A)&&jb(this.A,a)&&this.h(new p(2,6,6014));this.o.Rb(this.A)};
function Qb(){var a=[],b=[{contentType:'video/mp4; codecs="avc1.42E01E"'},{contentType:'video/webm; codecs="vp8"'}],c=[{videoCapabilities:b,persistentState:"required",sessionTypes:["persistent-license"]},{videoCapabilities:b}],d={};"org.w3.clearkey com.widevine.alpha com.microsoft.playready com.apple.fps.2_0 com.apple.fps.1_0 com.apple.fps com.adobe.primetime".split(" ").forEach(function(b){var e=navigator.requestMediaKeySystemAccess(b,c).then(function(a){var c=a.getConfiguration().sessionTypes;c=
c?0<=c.indexOf("persistent-license"):!1;0<=navigator.userAgent.indexOf("Tizen 3")&&(c=!1);d[b]={persistentState:c};return a.createMediaKeys()})["catch"](function(){d[b]=null});a.push(e)});return Promise.all(a).then(function(){return d})}m.Pd=function(){for(var a=0;a<this.J.length;a++)Ob(this,this.J[a]);this.X=!0;this.J=[]};function Rb(a,b){var c=a.keySystem();return 0==b.drmInfos.length||b.drmInfos.some(function(a){return a.keySystem==c})}
function Sb(a,b){if(!a.length)return b;if(!b.length)return a;for(var c=[],d=0;d<a.length;d++)for(var e=0;e<b.length;e++)if(a[d].keySystem==b[e].keySystem){var f=a[d];e=b[e];var g=[];g=g.concat(f.initData||[]);g=g.concat(e.initData||[]);var h=[];h=h.concat(f.keyIds);h=h.concat(e.keyIds);c.push({keySystem:f.keySystem,licenseServerUri:f.licenseServerUri||e.licenseServerUri,distinctiveIdentifierRequired:f.distinctiveIdentifierRequired||e.distinctiveIdentifierRequired,persistentStateRequired:f.persistentStateRequired||
e.persistentStateRequired,videoRobustness:f.videoRobustness||e.videoRobustness,audioRobustness:f.audioRobustness||e.audioRobustness,serverCertificate:f.serverCertificate||e.serverCertificate,initData:g,keyIds:h});break}return c}m.je=function(){this.a.forEach(function(a){var b=a.Qb,c=a.ga.expiration;isNaN(c)&&(c=Infinity);c!=b&&(this.o.onExpirationUpdated(a.ga.sessionId,c),a.Qb=c)}.bind(this))};function Tb(a){return!a||1==a.length&&1E-6>a.end(0)-a.start(0)?null:a.length?a.end(a.length-1):null}function Ub(a,b){return!a||!a.length||1==a.length&&1E-6>a.end(0)-a.start(0)?!1:b>=a.start(0)&&b<=a.end(a.length-1)}function Vb(a,b){if(!a||!a.length||1==a.length&&1E-6>a.end(0)-a.start(0))return 0;for(var c=0,d=a.length-1;0<=d&&a.end(d)>b;--d)c+=a.end(d)-Math.max(a.start(d),b);return c}function Wb(a){if(!a)return[];for(var b=[],c=0;c<a.length;c++)b.push({start:a.start(c),end:a.end(c)});return b};function Xb(){this.a=new muxjs.mp4.Transmuxer({keepOriginalTimestamps:!0});this.b=null;this.c=[];this.a.on("data",this.g.bind(this));this.a.on("done",this.f.bind(this))}Xb.prototype.destroy=function(){this.a.dispose();this.a=null;return Promise.resolve()};
function Yb(a,b){var c=b.replace("mp2t","mp4");"audio"==a&&(c=c.replace("video","audio"));var d=/avc1\.(66|77|100)\.(\d+)/.exec(c);if(d){var e="avc1.",f=d[1],g=Number(d[2]);e=("66"==f?e+"4200":"77"==f?e+"4d00":e+"6400")+(g>>4).toString(16);e+=(g&15).toString(16);c=c.replace(d[0],e)}return c}function Zb(a,b){a.b=new u;a.c=[];var c=new Uint8Array(b);a.a.push(c);a.a.flush();return a.b}
Xb.prototype.g=function(a){var b=new Uint8Array(a.data.byteLength+a.initSegment.byteLength);b.set(a.initSegment,0);b.set(a.data,a.initSegment.byteLength);this.c.push(b)};Xb.prototype.f=function(){var a=zb.apply(null,this.c);this.b.resolve(a)};function $b(a){this.c=null;this.f=a;this.h=this.i=0;this.g=Infinity;this.b=this.a=null}var D={};n("shaka.text.TextEngine.registerParser",function(a,b){D[a]=b});n("shaka.text.TextEngine.unregisterParser",function(a){delete D[a]});$b.prototype.destroy=function(){this.f=this.c=null;return Promise.resolve()};$b.prototype.Ae=function(a){this.f=a};$b.prototype.setDisplayer=$b.prototype.Ae;
$b.prototype.Ib=function(a){var b={periodStart:0,segmentStart:null,segmentEnd:0};try{return this.c.parseMedia(new Uint8Array(a),b)[0].startTime}catch(c){throw new p(2,2,2009,c);}};
function ac(a,b,c,d){return Promise.resolve().then(function(){if(this.c&&this.f)if(null==c||null==d)this.c.parseInit(new Uint8Array(b));else{var a={periodStart:this.i,segmentStart:c,segmentEnd:d};a=this.c.parseMedia(new Uint8Array(b),a).filter(function(a){return a.startTime>=this.h&&a.startTime<this.g}.bind(this));this.f.append(a);null==this.a&&(this.a=Math.max(c,this.h));this.b=Math.min(d,this.g)}}.bind(a))}
$b.prototype.remove=function(a,b){return Promise.resolve().then(function(){!this.f||!this.f.remove(a,b)||null==this.a||b<=this.a||a>=this.b||(a<=this.a&&b>=this.b?this.a=this.b=null:a<=this.a&&b<this.b?this.a=b:a>this.a&&b>=this.b&&(this.b=a))}.bind(this))};function bc(a,b,c){this.g=a;this.f=b;this.l=c;this.b={};this.a=null;this.c={};this.i=new bb;this.j=!1;this.h={}}
function cc(){var a={};'video/mp4; codecs="avc1.42E01E",video/mp4; codecs="avc3.42E01E",video/mp4; codecs="hev1.1.6.L93.90",video/mp4; codecs="hvc1.1.6.L93.90",video/mp4; codecs="hev1.2.4.L153.B0"; eotf="smpte2084",video/mp4; codecs="hvc1.2.4.L153.B0"; eotf="smpte2084",video/mp4; codecs="vp9",video/mp4; codecs="vp09.00.10.08",audio/mp4; codecs="mp4a.40.2",audio/mp4; codecs="ac-3",audio/mp4; codecs="ec-3",audio/mp4; codecs="opus",audio/mp4; codecs="flac",video/webm; codecs="vp8",video/webm; codecs="vp9",video/webm; codecs="av1",audio/webm; codecs="vorbis",audio/webm; codecs="opus",video/mp2t; codecs="avc1.42E01E",video/mp2t; codecs="avc3.42E01E",video/mp2t; codecs="hvc1.1.6.L93.90",video/mp2t; codecs="mp4a.40.2",video/mp2t; codecs="ac-3",video/mp2t; codecs="ec-3",text/vtt,application/mp4; codecs="wvtt",application/ttml+xml,application/mp4; codecs="stpp"'.split(",").forEach(function(b){a[b]=!!D[b]||
MediaSource.isTypeSupported(b);var c=b.split(";")[0];a[c]=a[c]||a[b]});return a}m=bc.prototype;m.destroy=function(){this.j=!0;var a=[],b;for(b in this.c){var c=this.c[b],d=c[0];this.c[b]=c.slice(0,1);d&&a.push(d.p["catch"](Qa));for(d=1;d<c.length;++d)c[d].p["catch"](Qa),c[d].p.reject()}this.a&&a.push(this.a.destroy());for(b in this.h)a.push(this.h[b].destroy());return Promise.all(a).then(function(){this.i.destroy();this.l=this.a=this.f=this.g=this.i=null;this.b={};this.h={};this.c={}}.bind(this))};
m.init=function(a){for(var b in a){var c=a[b];c=lb(c.mimeType,c.codecs);"text"==b?dc(this,c):(!MediaSource.isTypeSupported(c)&&window.muxjs&&"mp2t"==c.split(";")[0].split("/")[1]&&MediaSource.isTypeSupported(Yb(b,c))&&(this.h[b]=new Xb,c=Yb(b,c)),c=this.f.addSourceBuffer(c),z(this.i,c,"error",this.Me.bind(this,b)),z(this.i,c,"updateend",this.Ia.bind(this,b)),this.b[b]=c,this.c[b]=[])}};function dc(a,b){a.a||(a.a=new $b(a.l));a.a.c=new D[b]}
function ec(a,b){if("text"==b)var c=a.a.a;else c=fc(a,b),c=!c||1==c.length&&1E-6>c.end(0)-c.start(0)?null:1==c.length&&0>c.start(0)?0:c.length?c.start(0):null;return c}m.Db=function(){var a=this.a&&null!=this.a.a?[{start:this.a.a,end:this.a.b}]:[];return{total:Wb(this.g.buffered),audio:Wb(fc(this,"audio")),video:Wb(fc(this,"video")),text:a}};function fc(a,b){try{return a.b[b].buffered}catch(c){return null}}
function gc(a,b,c,d,e){return"text"==b?ac(a.a,c,d,e):a.h[b]?Zb(a.h[b],c).then(function(a){return hc(this,b,this.Sc.bind(this,b,a.buffer))}.bind(a)):hc(a,b,a.Sc.bind(a,b,c))}m.remove=function(a,b,c){return"text"==a?this.a.remove(b,c):hc(this,a,this.Tc.bind(this,a,b,c))};function ic(a,b){return"text"==b?a.a.remove(0,Infinity):hc(a,b,a.Tc.bind(a,b,0,a.f.duration))}
function jc(a,b,c,d,e){return"text"==b?(a.a.i=c,a=a.a,a.h=d,a.g=e,Promise.resolve()):Promise.all([hc(a,b,a.Zc.bind(a,b)),hc(a,b,a.Ce.bind(a,b,c)),hc(a,b,a.ze.bind(a,b,d,e))])}m.endOfStream=function(a){return kc(this,function(){a?this.f.endOfStream(a):this.f.endOfStream()}.bind(this))};m.ha=function(a){return kc(this,function(){this.f.duration=a}.bind(this))};m.T=function(){return this.f.duration};m.Sc=function(a,b){this.b[a].appendBuffer(b)};
m.Tc=function(a,b,c){c<=b?this.Ia(a):this.b[a].remove(b,c)};m.Zc=function(a){var b=this.b[a].appendWindowStart,c=this.b[a].appendWindowEnd;this.b[a].abort();this.b[a].appendWindowStart=b;this.b[a].appendWindowEnd=c;this.Ia(a)};m.hd=function(a){this.g.currentTime-=.001;this.Ia(a)};m.Ce=function(a,b){this.b[a].timestampOffset=b;this.Ia(a)};m.ze=function(a,b,c){this.b[a].appendWindowStart=0;this.b[a].appendWindowEnd=c;this.b[a].appendWindowStart=b;this.Ia(a)};
m.Me=function(a){this.c[a][0].p.reject(new p(2,3,3014,this.g.error?this.g.error.code:0))};m.Ia=function(a){var b=this.c[a][0];b&&(b.p.resolve(),lc(this,a))};function hc(a,b,c){if(a.j)return Promise.reject();c={start:c,p:new u};a.c[b].push(c);if(1==a.c[b].length)try{c.start()}catch(d){"QuotaExceededError"==d.name?c.p.reject(new p(2,3,3017,b)):c.p.reject(new p(2,3,3015,d)),lc(a,b)}return c.p}
function kc(a,b){if(a.j)return Promise.reject();var c=[],d;for(d in a.b){var e=new u,f={start:function(a){a.resolve()}.bind(null,e),p:e};a.c[d].push(f);c.push(e);1==a.c[d].length&&f.start()}return Promise.all(c).then(function(){var a;try{b()}catch(k){var c=Promise.reject(new p(2,3,3015,k))}for(a in this.b)lc(this,a);return c}.bind(a),function(){return Promise.reject()}.bind(a))}function lc(a,b){a.c[b].shift();var c=a.c[b][0];if(c)try{c.start()}catch(d){c.p.reject(new p(2,3,3015,d)),lc(a,b)}};function mc(a,b,c){return c==b||a>=nc&&c==b.split("-")[0]||a>=oc&&c.split("-")[0]==b.split("-")[0]?!0:!1}var nc=1,oc=2;function pc(a){a=a.toLowerCase().split("-");var b=qc[a[0]];b&&(a[0]=b);return a.join("-")}
var qc={aar:"aa",abk:"ab",afr:"af",aka:"ak",alb:"sq",amh:"am",ara:"ar",arg:"an",arm:"hy",asm:"as",ava:"av",ave:"ae",aym:"ay",aze:"az",bak:"ba",bam:"bm",baq:"eu",bel:"be",ben:"bn",bih:"bh",bis:"bi",bod:"bo",bos:"bs",bre:"br",bul:"bg",bur:"my",cat:"ca",ces:"cs",cha:"ch",che:"ce",chi:"zh",chu:"cu",chv:"cv",cor:"kw",cos:"co",cre:"cr",cym:"cy",cze:"cs",dan:"da",deu:"de",div:"dv",dut:"nl",dzo:"dz",ell:"el",eng:"en",epo:"eo",est:"et",eus:"eu",ewe:"ee",fao:"fo",fas:"fa",fij:"fj",fin:"fi",fra:"fr",fre:"fr",
fry:"fy",ful:"ff",geo:"ka",ger:"de",gla:"gd",gle:"ga",glg:"gl",glv:"gv",gre:"el",grn:"gn",guj:"gu",hat:"ht",hau:"ha",heb:"he",her:"hz",hin:"hi",hmo:"ho",hrv:"hr",hun:"hu",hye:"hy",ibo:"ig",ice:"is",ido:"io",iii:"ii",iku:"iu",ile:"ie",ina:"ia",ind:"id",ipk:"ik",isl:"is",ita:"it",jav:"jv",jpn:"ja",kal:"kl",kan:"kn",kas:"ks",kat:"ka",kau:"kr",kaz:"kk",khm:"km",kik:"ki",kin:"rw",kir:"ky",kom:"kv",kon:"kg",kor:"ko",kua:"kj",kur:"ku",lao:"lo",lat:"la",lav:"lv",lim:"li",lin:"ln",lit:"lt",ltz:"lb",lub:"lu",
lug:"lg",mac:"mk",mah:"mh",mal:"ml",mao:"mi",mar:"mr",may:"ms",mkd:"mk",mlg:"mg",mlt:"mt",mon:"mn",mri:"mi",msa:"ms",mya:"my",nau:"na",nav:"nv",nbl:"nr",nde:"nd",ndo:"ng",nep:"ne",nld:"nl",nno:"nn",nob:"nb",nor:"no",nya:"ny",oci:"oc",oji:"oj",ori:"or",orm:"om",oss:"os",pan:"pa",per:"fa",pli:"pi",pol:"pl",por:"pt",pus:"ps",que:"qu",roh:"rm",ron:"ro",rum:"ro",run:"rn",rus:"ru",sag:"sg",san:"sa",sin:"si",slk:"sk",slo:"sk",slv:"sl",sme:"se",smo:"sm",sna:"sn",snd:"sd",som:"so",sot:"st",spa:"es",sqi:"sq",
srd:"sc",srp:"sr",ssw:"ss",sun:"su",swa:"sw",swe:"sv",tah:"ty",tam:"ta",tat:"tt",tel:"te",tgk:"tg",tgl:"tl",tha:"th",tib:"bo",tir:"ti",ton:"to",tsn:"tn",tso:"ts",tuk:"tk",tur:"tr",twi:"tw",uig:"ug",ukr:"uk",urd:"ur",uzb:"uz",ven:"ve",vie:"vi",vol:"vo",wel:"cy",wln:"wa",wol:"wo",xho:"xh",yid:"yi",yor:"yo",zha:"za",zho:"zh",zul:"zu"};function rc(a,b,c){var d=a.video;return d&&(d.width<b.minWidth||d.width>b.maxWidth||d.width>c.width||d.height<b.minHeight||d.height>b.maxHeight||d.height>c.height||d.width*d.height<b.minPixels||d.width*d.height>b.maxPixels)||a.bandwidth<b.minBandwidth||a.bandwidth>b.maxBandwidth?!1:!0}function sc(a,b,c){var d=!1;a.variants.forEach(function(a){var e=a.allowedByApplication;a.allowedByApplication=rc(a,b,c);e!=a.allowedByApplication&&(d=!0)});return d}
function tc(a,b,c,d){d.variants=d.variants.filter(function(d){return a&&a.K&&!Rb(a,d)?!1:uc(d.audio,a,b)&&uc(d.video,a,c)});d.textStreams=d.textStreams.filter(function(a){return!!D[lb(a.mimeType,a.codecs)]})}
function uc(a,b,c){if(!a)return!0;var d=null;b&&b.K&&(d=b.u);b=lb(a.mimeType,a.codecs);var e=lb(a.mimeType,a.codecs),f=a.mimeType,g;for(g in mb){var h=a[g],k=mb[g];h&&(f+="; "+k+'="'+h+'"')}return!(D[e]||MediaSource.isTypeSupported(f)||window.muxjs&&"mp2t"==e.split(";")[0].split("/")[1]&&MediaSource.isTypeSupported(Yb(a.type,e)))||d&&a.encrypted&&0>d.indexOf(b)||c&&(a.mimeType!=c.mimeType||a.codecs.split(".")[0]!=c.codecs.split(".")[0])?!1:!0}
function vc(a){var b=a.audio,c=a.video,d=b?b.codecs:null,e=c?c.codecs:null,f=[];e&&f.push(e);d&&f.push(d);var g=[];c&&g.push(c.mimeType);b&&g.push(b.mimeType);g=g[0]||null;var h=[];b&&h.push(b.kind);c&&h.push(c.kind);h=h[0]||null;var k=[];b&&k.push.apply(k,b.roles);c&&k.push.apply(k,c.roles);k=Xa(k);a={id:a.id,active:!1,type:"variant",bandwidth:a.bandwidth,language:a.language,label:null,kind:h,width:null,height:null,frameRate:null,mimeType:g,codecs:f.join(", "),audioCodec:d,videoCodec:e,primary:a.primary,
roles:k,videoId:null,audioId:null,channelsCount:null,audioBandwidth:null,videoBandwidth:null};c&&(a.videoId=c.id,a.width=c.width||null,a.height=c.height||null,a.frameRate=c.frameRate||null,a.videoBandwidth=c.bandwidth||null);b&&(a.audioId=b.id,a.channelsCount=b.channelsCount,a.audioBandwidth=b.bandwidth||null,a.label=b.label);return a}
function wc(a){return{id:a.id,active:!1,type:"text",bandwidth:0,language:a.language,label:a.label,kind:a.kind||null,width:null,height:null,frameRate:null,mimeType:a.mimeType,codecs:a.codecs||null,audioCodec:null,videoCodec:null,primary:a.primary,roles:a.roles,videoId:null,audioId:null,channelsCount:null,audioBandwidth:null,videoBandwidth:null}}function xc(a){var b=[],c=yc(a.variants);a=a.textStreams;c.forEach(function(a){b.push(vc(a))});a.forEach(function(a){b.push(wc(a))});return b}
function zc(a,b,c){return yc(a.variants).map(function(a){var d=vc(a);a.video&&a.audio?d.active=c==a.video.id&&b==a.audio.id:a.video?d.active=c==a.video.id:a.audio&&(d.active=b==a.audio.id);return d})}function Ac(a,b){return a.textStreams.map(function(a){var c=wc(a);c.active=b==a.id;return c})}function Bc(a,b){for(var c=0;c<a.variants.length;c++)if(a.variants[c].id==b.id)return a.variants[c];return null}
function Cc(a,b){for(var c=0;c<a.textStreams.length;c++)if(a.textStreams[c].id==b.id)return a.textStreams[c];return null}function Dc(a){return a.allowedByApplication&&a.allowedByKeySystem}function yc(a){return a.filter(function(a){return Dc(a)})}
function Ec(a,b,c,d){var e=yc(a),f=e;a=e.filter(function(a){return a.primary});a.length&&(f=a);var g=f.length?f[0].language:"";f=f.filter(function(a){return a.language==g});if(b){var h=pc(b);[oc,nc,0].forEach(function(a){var b=!1;e.forEach(function(c){h=pc(h);var e=pc(c.language);mc(a,h,e)&&(b?f.push(c):(f=[c],b=!0),d&&(d.audio=!0))})})}if(c&&(b=Fc(f,c),b.length))return b;b=f.map(function(a){return(a.audio?a.audio.roles:[]).concat(a.video?a.video.roles:[])}).reduce(Pa,[]);return b.length?Fc(f,b[0]):
f}function Gc(a,b,c,d){var e=a,f=a.filter(function(a){return a.primary});f.length&&(e=f);var g=e.length?e[0].language:"";e=e.filter(function(a){return a.language==g});if(b){var h=pc(b);[oc,nc,0].forEach(function(b){var c=!1;a.forEach(function(a){var f=pc(a.language);mc(b,h,f)&&(c?e.push(a):(e=[a],c=!0),d&&(d.text=!0))})})}b=c?Hc(e,c):e.filter(function(a){return 0==a.roles.length});if(b.length)return b;b=e.map(function(a){return a.roles}).reduce(Pa,[]);return b.length?Hc(e,b[0]):e}
function Fc(a,b){return a.filter(function(a){return a.audio&&0<=a.audio.roles.indexOf(b)||a.video&&0<=a.video.roles.indexOf(b)})}function Hc(a,b){return a.filter(function(a){return 0<=a.roles.indexOf(b)})}function Ic(a,b,c){for(var d=0;d<c.length;d++)if(c[d].audio==a&&c[d].video==b)return c[d];return null}function Jc(a,b,c){function d(a,b){return null==a?null==b:b.id==a}for(var e=0;e<c.length;e++)if(d(a,c[e].audio)&&d(b,c[e].video))return c[e];return null}
function Kc(a,b){for(var c=a.periods.length-1;0<c;--c)if(b+gb>=a.periods[c].startTime)return c;return 0}function Lc(a,b){for(var c=0;c<a.periods.length;++c){var d=a.periods[c];if("text"==b.type)for(var e=0;e<d.textStreams.length;++e){if(d.textStreams[e]==b)return c}else for(e=0;e<d.variants.length;++e){var f=d.variants[e];if(f.audio==b||f.video==b||f.video&&f.video.trickModeVideo==b)return c}}return-1};function E(){this.h=null;this.c=!1;this.b=new pa;this.g=[];this.i=!1;this.a=this.f=null}n("shaka.abr.SimpleAbrManager",E);E.prototype.stop=function(){this.h=null;this.c=!1;this.g=[];this.f=null};E.prototype.stop=E.prototype.stop;E.prototype.init=function(a){this.h=a};E.prototype.init=E.prototype.init;
E.prototype.chooseVariant=function(){var a=Mc(this.a.restrictions,this.g),b=this.b.getBandwidthEstimate(this.a.defaultBandwidthEstimate);if(this.g.length&&!a.length)throw new p(2,4,4012);for(var c=a[0]||null,d=0;d<a.length;++d){var e=a[d],f=(a[d+1]||{bandwidth:Infinity}).bandwidth/this.a.bandwidthUpgradeTarget;b>=e.bandwidth/this.a.bandwidthDowngradeTarget&&b<=f&&(c=e)}this.f=Date.now();return c};E.prototype.chooseVariant=E.prototype.chooseVariant;E.prototype.enable=function(){this.c=!0};
E.prototype.enable=E.prototype.enable;E.prototype.disable=function(){this.c=!1};E.prototype.disable=E.prototype.disable;E.prototype.segmentDownloaded=function(a,b){var c=this.b;if(!(16E3>b)){var d=8E3*b/a,e=a/1E3;c.a+=b;na(c.b,e,d);na(c.c,e,d)}if(null!=this.f&&this.c)a:{if(!this.i){if(!(128E3<=this.b.a))break a;this.i=!0}else if(Date.now()-this.f<1E3*this.a.switchInterval)break a;c=this.chooseVariant();this.b.getBandwidthEstimate(this.a.defaultBandwidthEstimate);this.h(c)}};
E.prototype.segmentDownloaded=E.prototype.segmentDownloaded;E.prototype.getBandwidthEstimate=function(){return this.b.getBandwidthEstimate(this.a.defaultBandwidthEstimate)};E.prototype.getBandwidthEstimate=E.prototype.getBandwidthEstimate;E.prototype.setVariants=function(a){this.g=a};E.prototype.setVariants=E.prototype.setVariants;E.prototype.configure=function(a){this.a=a};E.prototype.configure=E.prototype.configure;
function Mc(a,b){return b.filter(function(b){return rc(b,a,{width:Infinity,height:Infinity})}).sort(function(a,b){return a.bandwidth-b.bandwidth})};var Nc="ended play playing pause pausing ratechange seeked seeking timeupdate volumechange".split(" "),Oc="buffered currentTime duration ended loop muted paused playbackRate seeking videoHeight videoWidth volume".split(" "),Pc=["loop","playbackRate"],Qc=["pause","play"],Rc="adaptation buffering emsg error loading streaming texttrackvisibility timelineregionadded timelineregionenter timelineregionexit trackschanged unloading".split(" "),Sc={drmInfo:20,getAudioLanguages:2,getAudioLanguagesAndRoles:2,
getBufferedInfo:2,getConfiguration:2,getExpiration:2,getManifestUri:2,getPlaybackRate:2,getTextLanguages:2,getTextLanguagesAndRoles:2,getTextTracks:2,getStats:5,getVariantTracks:2,isAudioOnly:10,isBuffering:1,isInProgress:1,isLive:10,isTextTrackVisible:1,keySystem:10,seekRange:1},Tc={getPlayheadTimeAsDate:1,getPresentationStartTimeAsDate:20},Uc=[["getConfiguration","configure"]],Vc=[["isTextTrackVisible","setTextTrackVisibility"]],$c="addTextTrack cancelTrickPlay configure resetConfiguration retryStreaming selectAudioLanguage selectTextLanguage selectTextTrack selectVariantTrack setTextTrackVisibility trickPlay".split(" "),
ad=["load","unload"];function bd(a){return JSON.stringify(a,function(a,c){if("function"!=typeof c){if(c instanceof Event||c instanceof A){var b={},e;for(e in c){var f=c[e];f&&"object"==typeof f?"detail"==e&&(b[e]=f):e in Event||(b[e]=f)}return b}if(c instanceof TimeRanges)for(b={__type__:"TimeRanges",length:c.length,start:[],end:[]},e=0;e<c.length;++e)b.start.push(c.start(e)),b.end.push(c.end(e));else b="number"==typeof c?isNaN(c)?"NaN":isFinite(c)?c:0>c?"-Infinity":"Infinity":c;return b}})}
function cd(a){return JSON.parse(a,function(a,c){return"NaN"==c?NaN:"-Infinity"==c?-Infinity:"Infinity"==c?Infinity:c&&"object"==typeof c&&"TimeRanges"==c.__type__?dd(c):c})}function dd(a){return{length:a.length,start:function(b){return a.start[b]},end:function(b){return a.end[b]}}};function ed(a,b,c,d,e,f){this.J=a;this.g=b;this.K=c;this.j=!1;this.A=d;this.D=e;this.u=f;this.b=this.h=!1;this.v="";this.i=null;this.l=this.vc.bind(this);this.m=this.Ld.bind(this);this.a={video:{},player:{}};this.o=0;this.c={};this.f=null}var fd=!1,F=null;m=ed.prototype;m.destroy=function(){gd(this);F&&hd(this);this.D=this.A=this.g=null;this.b=this.h=!1;this.m=this.l=this.f=this.c=this.a=this.i=null;return Promise.resolve()};m.$=function(){return this.b};m.Wb=function(){return this.v};
m.init=function(){if(window.chrome&&chrome.cast&&chrome.cast.isAvailable){delete window.__onGCastApiAvailable;this.h=!0;this.g();var a=new chrome.cast.SessionRequest(this.J);a=new chrome.cast.ApiConfig(a,this.wc.bind(this),this.Rd.bind(this),"origin_scoped");chrome.cast.initialize(a,function(){},function(){});fd&&setTimeout(this.g.bind(this),20);(a=F)&&a.status!=chrome.cast.SessionStatus.STOPPED?this.wc(a):F=null}else window.__onGCastApiAvailable=function(a){a&&this.init()}.bind(this)};
m.Zb=function(a){this.i=a;this.b&&id({type:"appData",appData:this.i})};m.cast=function(a){if(!this.h)return Promise.reject(new p(1,8,8E3));if(!fd)return Promise.reject(new p(1,8,8001));if(this.b)return Promise.reject(new p(1,8,8002));this.f=new u;chrome.cast.requestSession(this.Tb.bind(this,a),this.uc.bind(this));return this.f};m.pb=function(){this.b&&(gd(this),F&&(hd(this),F.stop(function(){},function(){}),F=null))};
m.get=function(a,b){if("video"==a){if(0<=Qc.indexOf(b))return this.Ic.bind(this,a,b)}else if("player"==a){if(Tc[b]&&!this.get("player","isLive")())return function(){};if(0<=$c.indexOf(b))return this.Ic.bind(this,a,b);if(0<=ad.indexOf(b))return this.pe.bind(this,a,b);if(Sc[b])return this.Fc.bind(this,a,b)}return this.Fc(a,b)};m.set=function(a,b,c){this.a[a][b]=c;id({type:"set",targetName:a,property:b,value:c})};
m.Tb=function(a,b){F=b;b.addUpdateListener(this.l);b.addMessageListener("urn:x-cast:com.google.shaka.v2",this.m);this.vc();id({type:"init",initState:a,appData:this.i});this.f.resolve()};m.uc=function(a){var b=8003;switch(a.code){case "cancel":b=8004;break;case "timeout":b=8005;break;case "receiver_unavailable":b=8006}this.f.reject(new p(2,8,b,a))};m.Fc=function(a,b){return this.a[a][b]};m.Ic=function(a,b){id({type:"call",targetName:a,methodName:b,args:Array.prototype.slice.call(arguments,2)})};
m.pe=function(a,b){var c=Array.prototype.slice.call(arguments,2),d=new u,e=this.o.toString();this.o++;this.c[e]=d;id({type:"asyncCall",targetName:a,methodName:b,args:c,id:e});return d};m.wc=function(a){var b=this.u();this.f=new u;this.j=!0;this.Tb(b,a)};m.Rd=function(a){fd="available"==a;this.g()};function hd(a){var b=F;b.removeUpdateListener(a.l);b.removeMessageListener("urn:x-cast:com.google.shaka.v2",a.m)}
m.vc=function(){var a=F?"connected"==F.status:!1;if(this.b&&!a){this.D();for(var b in this.a)this.a[b]={};gd(this)}this.v=(this.b=a)?F.receiver.friendlyName:"";this.g()};function gd(a){for(var b in a.c){var c=a.c[b];delete a.c[b];c.reject(new p(1,7,7E3))}}
m.Ld=function(a,b){var c=cd(b);switch(c.type){case "event":var d=c.targetName,e=c.event;this.A(d,new A(e.type,e));break;case "update":e=c.update;for(d in e){c=this.a[d]||{};for(var f in e[d])c[f]=e[d][f]}this.j&&(this.K(),this.j=!1);break;case "asyncComplete":if(d=c.id,f=c.error,c=this.c[d],delete this.c[d],c)if(f){d=new p(f.severity,f.category,f.code);for(e in f)d[e]=f[e];c.reject(d)}else c.resolve()}};function id(a){a=bd(a);F.sendMessage("urn:x-cast:com.google.shaka.v2",a,function(){},ra)};function G(){this.yb=new ab;this.fb=this}G.prototype.addEventListener=function(a,b){this.yb.push(a,b)};G.prototype.removeEventListener=function(a,b){this.yb.remove(a,b)};G.prototype.dispatchEvent=function(a){for(var b=this.yb.get(a.type)||[],c=0;c<b.length;++c){a.target=this.fb;a.currentTarget=this.fb;var d=b[c];try{d.handleEvent?d.handleEvent(a):d.call(this,a)}catch(e){}if(a.a)break}return a.defaultPrevented};function H(a,b,c){G.call(this);this.c=a;this.b=b;this.i=this.g=this.f=this.j=this.h=null;this.a=new ed(c,this.He.bind(this),this.Ie.bind(this),this.Je.bind(this),this.Ke.bind(this),this.nc.bind(this));jd(this)}la(H,G);n("shaka.cast.CastProxy",H);H.prototype.destroy=function(a){a&&this.a&&this.a.pb();a=[this.i?this.i.destroy():null,this.b?this.b.destroy():null,this.a?this.a.destroy():null];this.a=this.i=this.j=this.h=this.b=this.c=null;return Promise.all(a)};H.prototype.destroy=H.prototype.destroy;
H.prototype.xd=function(){return this.h};H.prototype.getVideo=H.prototype.xd;H.prototype.od=function(){return this.j};H.prototype.getPlayer=H.prototype.od;H.prototype.$c=function(){return this.a?this.a.h&&fd:!1};H.prototype.canCast=H.prototype.$c;H.prototype.$=function(){return this.a?this.a.$():!1};H.prototype.isCasting=H.prototype.$;H.prototype.Wb=function(){return this.a?this.a.Wb():""};H.prototype.receiverName=H.prototype.Wb;H.prototype.cast=function(){var a=this.nc();return this.a.cast(a).then(function(){return this.b.wb()}.bind(this))};
H.prototype.cast=H.prototype.cast;H.prototype.Zb=function(a){this.a.Zb(a)};H.prototype.setAppData=H.prototype.Zb;H.prototype.Oe=function(){var a=this.a;if(a.b){var b=a.u();chrome.cast.requestSession(a.Tb.bind(a,b),a.uc.bind(a))}};H.prototype.suggestDisconnect=H.prototype.Oe;H.prototype.pb=function(){this.a.pb()};H.prototype.forceDisconnect=H.prototype.pb;
function jd(a){a.a.init();a.i=new bb;Nc.forEach(function(a){z(this.i,this.c,a,this.Ve.bind(this))}.bind(a));Rc.forEach(function(a){z(this.i,this.b,a,this.he.bind(this))}.bind(a));a.h={};for(var b in a.c)Object.defineProperty(a.h,b,{configurable:!1,enumerable:!0,get:a.Ue.bind(a,b),set:a.We.bind(a,b)});a.j={};for(b in a.b)Object.defineProperty(a.j,b,{configurable:!1,enumerable:!0,get:a.ge.bind(a,b)});a.f=new G;a.f.fb=a.h;a.g=new G;a.g.fb=a.j}m=H.prototype;
m.nc=function(){var a={video:{},player:{},playerAfterLoad:{},manifest:this.b.Fb(),startTime:null};this.c.pause();Pc.forEach(function(b){a.video[b]=this.c[b]}.bind(this));this.c.ended||(a.startTime=this.c.currentTime);Uc.forEach(function(b){var c=b[1];b=this.b[b[0]]();a.player[c]=b}.bind(this));Vc.forEach(function(b){var c=b[1];b=this.b[b[0]]();a.playerAfterLoad[c]=b}.bind(this));return a};m.He=function(){this.dispatchEvent(new A("caststatuschanged"))};
m.Ie=function(){this.f.dispatchEvent(new A(this.h.paused?"pause":"play"))};
m.Ke=function(){Uc.forEach(function(a){var b=a[1];a=this.a.get("player",a[0])();this.b[b](a)}.bind(this));var a=this.a.get("player","getManifestUri")(),b=this.a.get("video","ended"),c=Promise.resolve(),d=this.c.autoplay,e=null;b||(e=this.a.get("video","currentTime"));a&&(this.c.autoplay=!1,c=this.b.load(a,e),c["catch"](function(a){this.b.dispatchEvent(new A("error",{detail:a}))}.bind(this)));var f={};Pc.forEach(function(a){f[a]=this.a.get("video",a)}.bind(this));c.then(function(){Pc.forEach(function(a){this.c[a]=
f[a]}.bind(this));Vc.forEach(function(a){var b=a[1];a=this.a.get("player",a[0])();this.b[b](a)}.bind(this));this.c.autoplay=d;a&&this.c.play()}.bind(this))};
m.Ue=function(a){if("addEventListener"==a)return this.f.addEventListener.bind(this.f);if("removeEventListener"==a)return this.f.removeEventListener.bind(this.f);if(this.a.$()&&0==Object.keys(this.a.a.video).length){var b=this.c[a];if("function"!=typeof b)return b}return this.a.$()?this.a.get("video",a):(b=this.c[a],"function"==typeof b&&(b=b.bind(this.c)),b)};m.We=function(a,b){this.a.$()?this.a.set("video",a,b):this.c[a]=b};m.Ve=function(a){this.a.$()||this.f.dispatchEvent(new A(a.type,a))};
m.ge=function(a){return"addEventListener"==a?this.g.addEventListener.bind(this.g):"removeEventListener"==a?this.g.removeEventListener.bind(this.g):"getMediaElement"==a?function(){return this.h}.bind(this):"getNetworkingEngine"==a?this.b.oc.bind(this.b):"getManifest"==a?this.a.$()?function(){return null}:this.b.Ea.bind(this.b):this.a.$()&&0==Object.keys(this.a.a.video).length&&Sc[a]||!this.a.$()?(a=this.b[a],a.bind(this.b)):this.a.get("player",a)};m.he=function(a){this.a.$()||this.g.dispatchEvent(a)};
m.Je=function(a,b){this.a.$()&&("video"==a?this.f.dispatchEvent(b):"player"==a&&this.g.dispatchEvent(b))};function I(a,b,c,d){G.call(this);this.a=a;this.b=b;this.o={video:a,player:b};this.u=c||function(){};this.v=d||function(a){return a};this.m=!1;this.g=!0;this.f=0;this.l=!1;this.i=!0;this.j=this.h=this.c=null;kd(this)}la(I,G);n("shaka.cast.CastReceiver",I);I.prototype.isConnected=function(){return this.m};I.prototype.isConnected=I.prototype.isConnected;I.prototype.zd=function(){return this.g};I.prototype.isIdle=I.prototype.zd;
I.prototype.destroy=function(){var a=this.b?this.b.destroy():Promise.resolve();null!=this.j&&window.clearTimeout(this.j);this.u=this.o=this.b=this.a=null;this.m=!1;this.g=!0;this.j=this.h=this.c=null;return a.then(function(){cast.receiver.CastReceiverManager.getInstance().stop()})};I.prototype.destroy=I.prototype.destroy;
function kd(a){var b=cast.receiver.CastReceiverManager.getInstance();b.onSenderConnected=a.Cc.bind(a);b.onSenderDisconnected=a.Cc.bind(a);b.onSystemVolumeChanged=a.gd.bind(a);a.h=b.getCastMessageBus("urn:x-cast:com.google.cast.media");a.h.onMessage=a.Gd.bind(a);a.c=b.getCastMessageBus("urn:x-cast:com.google.shaka.v2");a.c.onMessage=a.Ud.bind(a);b.start();Nc.forEach(function(a){this.a.addEventListener(a,this.Gc.bind(this,"video"))}.bind(a));Rc.forEach(function(a){this.b.addEventListener(a,this.Gc.bind(this,
"player"))}.bind(a));cast.__platform__&&cast.__platform__.canDisplayType('video/mp4; codecs="avc1.640028"; width=3840; height=2160')?a.b.$b(3840,2160):a.b.$b(1920,1080);a.a.addEventListener("loadeddata",function(){this.l=!0}.bind(a));a.b.addEventListener("loading",function(){this.g=!1;ld(this)}.bind(a));a.a.addEventListener("playing",function(){this.g=!1;ld(this)}.bind(a));a.a.addEventListener("pause",function(){ld(this)}.bind(a));a.b.addEventListener("unloading",function(){this.g=!0;ld(this)}.bind(a));
a.a.addEventListener("ended",function(){window.setTimeout(function(){this.a&&this.a.ended&&(this.g=!0,ld(this))}.bind(this),5E3)}.bind(a))}m=I.prototype;m.Cc=function(){this.f=0;this.i=!0;this.m=0!=cast.receiver.CastReceiverManager.getInstance().getSenders().length;ld(this)};function ld(a){Promise.resolve().then(function(){this.dispatchEvent(new A("caststatuschanged"));md(this)||nd(this,0)}.bind(a))}
function od(a,b,c){for(var d in b.player)a.b[d](b.player[d]);a.u(c);c=Promise.resolve();var e=a.a.autoplay;b.manifest&&(a.a.autoplay=!1,c=a.b.load(b.manifest,b.startTime),c["catch"](function(a){this.b.dispatchEvent(new A("error",{detail:a}))}.bind(a)));c.then(function(){for(var a in b.video){var c=b.video[a];this.a[a]=c}for(a in b.playerAfterLoad)c=b.playerAfterLoad[a],this.b[a](c);this.a.autoplay=e;b.manifest&&(this.a.play(),nd(this,0))}.bind(a))}
m.Gc=function(a,b){this.b&&(this.Ub(),pd(this,{type:"event",targetName:a,event:b},this.c))};
m.Ub=function(){null!=this.j&&window.clearTimeout(this.j);this.j=window.setTimeout(this.Ub.bind(this),500);var a={video:{},player:{}};Oc.forEach(function(b){a.video[b]=this.a[b]}.bind(this));if(this.b.P())for(var b in Tc){var c=Tc[b];0==this.f%c&&(a.player[b]=this.b[b]())}for(b in Sc)c=Sc[b],0==this.f%c&&(a.player[b]=this.b[b]());if(b=cast.receiver.CastReceiverManager.getInstance().getSystemVolume())a.video.volume=b.level,a.video.muted=b.muted;this.l&&(this.f+=1);pd(this,{type:"update",update:a},
this.c);md(this)};function md(a){return a.i&&(a.a.duration||a.b.P())?(qd(a),a.i=!1,!0):!1}function qd(a){var b={contentId:a.b.Fb(),streamType:a.b.P()?"LIVE":"BUFFERED",duration:a.a.duration,contentType:""};nd(a,0,b)}m.gd=function(){var a=cast.receiver.CastReceiverManager.getInstance().getSystemVolume();a&&pd(this,{type:"update",update:{video:{volume:a.level,muted:a.muted}}},this.c);pd(this,{type:"event",targetName:"video",event:{type:"volumechange"}},this.c)};
m.Ud=function(a){var b=cd(a.data);switch(b.type){case "init":this.f=0;this.l=!1;this.i=!0;od(this,b.initState,b.appData);this.Ub();break;case "appData":this.u(b.appData);break;case "set":var c=b.targetName,d=b.property,e=b.value;if("video"==c)if(b=cast.receiver.CastReceiverManager.getInstance(),"volume"==d){b.setSystemVolumeLevel(e);break}else if("muted"==d){b.setSystemVolumeMuted(e);break}this.o[c][d]=e;break;case "call":c=b.targetName;d=b.methodName;e=b.args;var f=this.o[c];f[d].apply(f,e);break;
case "asyncCall":c=b.targetName,d=b.methodName,"player"==c&&"load"==d&&(this.f=0,this.l=!1),e=b.args,b=b.id,a=a.senderId,f=this.o[c],e=f[d].apply(f,e),"player"==c&&"load"==d&&(e=e.then(function(){this.i=!0}.bind(this))),e.then(this.Nc.bind(this,a,b,null),this.Nc.bind(this,a,b))}};
m.Gd=function(a){var b=cd(a.data);switch(b.type){case "PLAY":this.a.play();nd(this,0);break;case "PAUSE":this.a.pause();nd(this,0);break;case "SEEK":a=b.currentTime;var c=b.resumeState;null!=a&&(this.a.currentTime=Number(a));c&&"PLAYBACK_START"==c?(this.a.play(),nd(this,0)):c&&"PLAYBACK_PAUSE"==c&&(this.a.pause(),nd(this,0));break;case "STOP":this.b.wb().then(function(){nd(this,0)}.bind(this));break;case "GET_STATUS":nd(this,Number(b.requestId));break;case "VOLUME":c=b.volume;a=c.level;c=c.muted;
var d=this.a.volume,e=this.a.muted;null!=a&&(this.a.volume=Number(a));null!=c&&(this.a.muted=c);d==this.a.volume&&e==this.a.muted||nd(this,0);break;case "LOAD":this.f=0;this.i=this.l=!1;c=b.media.contentId;a=b.currentTime;c=this.v(c);this.a.autoplay=!0;this.b.load(c,a).then(function(){qd(this)}.bind(this))["catch"](function(a){var c="LOAD_FAILED";7==a.category&&7E3==a.code&&(c="LOAD_CANCELLED");pd(this,{requestId:Number(b.requestId),type:c},this.h)}.bind(this));break;default:pd(this,{requestId:Number(b.requestId),
type:"INVALID_REQUEST",reason:"INVALID_COMMAND"},this.h)}};m.Nc=function(a,b,c){pd(this,{type:"asyncComplete",id:b,error:c},this.c,a)};function pd(a,b,c,d){a.m&&(a=bd(b),d?c.getCastChannel(d).send(a):c.broadcast(a))}
function nd(a,b,c){var d=a.a.playbackRate;var e=rd;e=a.g?e.IDLE:a.b.rc()?e.Uc:a.a.paused?e.Wc:e.Xc;d={mediaSessionId:0,playbackRate:d,playerState:e,currentTime:a.a.currentTime,supportedMediaCommands:15,volume:{level:a.a.volume,muted:a.a.muted}};c&&(d.media=c);pd(a,{requestId:b,type:"MEDIA_STATUS",status:[d]},a.h)}var rd={IDLE:"IDLE",Xc:"PLAYING",Uc:"BUFFERING",Wc:"PAUSED"};function sd(a,b){var c=J(a,b);return 1!=c.length?null:c[0]}function J(a,b){return Array.prototype.filter.call(a.childNodes,function(a){return a.tagName==b})}function td(a){var b=a.firstChild;return b&&b.nodeType==Node.TEXT_NODE?a.textContent.trim():null}function K(a,b,c,d){var e=null;a=a.getAttribute(b);null!=a&&(e=c(a));return null==e?void 0!=d?d:null:e}function ud(a){if(!a)return null;/^\d+-\d+-\d+T\d+:\d+:\d+(\.\d+)?$/.test(a)&&(a+="Z");a=Date.parse(a);return isNaN(a)?null:Math.floor(a/1E3)}
function vd(a){if(!a)return null;a=/^P(?:([0-9]*)Y)?(?:([0-9]*)M)?(?:([0-9]*)D)?(?:T(?:([0-9]*)H)?(?:([0-9]*)M)?(?:([0-9.]*)S)?)?$/.exec(a);if(!a)return null;a=31536E3*Number(a[1]||null)+2592E3*Number(a[2]||null)+86400*Number(a[3]||null)+3600*Number(a[4]||null)+60*Number(a[5]||null)+Number(a[6]||null);return isFinite(a)?a:null}function wd(a){var b=/([0-9]+)-([0-9]+)/.exec(a);if(!b)return null;a=Number(b[1]);if(!isFinite(a))return null;b=Number(b[2]);return isFinite(b)?{start:a,end:b}:null}
function xd(a){a=Number(a);return 0===a%1?a:null}function yd(a){a=Number(a);return 0===a%1&&0<a?a:null}function zd(a){a=Number(a);return 0===a%1&&0<=a?a:null}function Ad(a){var b;a=(b=a.match(/^(\d+)\/(\d+)$/))?Number(b[1]/b[2]):Number(a);return isNaN(a)?null:a};var Bd={"urn:uuid:1077efec-c0b2-4d02-ace3-3c1e52e2fb4b":"org.w3.clearkey","urn:uuid:edef8ba9-79d6-4ace-a3c8-27dcd51d21ed":"com.widevine.alpha","urn:uuid:9a04f079-9840-4286-ab92-e65be0885f95":"com.microsoft.playready","urn:uuid:f239e769-efa3-4850-9c16-a903c6932efb":"com.adobe.primetime"};
function Cd(a,b,c){a=Dd(a);var d=null,e=[],f=[],g=a.map(function(a){return a.keyId}).filter(Ra);if(g.length&&1<g.filter(Sa).length)throw new p(2,4,4010);c||(f=a.filter(function(a){return"urn:mpeg:dash:mp4protection:2011"==a.Mc?(d=a.init||d,!1):!0}),f.length&&(e=Ed(d,b,f),0==e.length&&(e=[fb("",d)])));!a.length||!c&&f.length||(e=ib(Bd).map(function(a){return fb(a,d)}));var h=g[0]||null;h&&e.forEach(function(a){a.initData.forEach(function(a){a.keyId=h})});return{jc:h,df:d,drmInfos:e,mc:!0}}
function Fd(a,b,c,d){var e=Cd(a,b,d);if(c.mc){a=1==c.drmInfos.length&&!c.drmInfos[0].keySystem;b=0==e.drmInfos.length;if(0==c.drmInfos.length||a&&!b)c.drmInfos=e.drmInfos;c.mc=!1}else if(0<e.drmInfos.length&&(c.drmInfos=c.drmInfos.filter(function(a){return e.drmInfos.some(function(b){return b.keySystem==a.keySystem})}),0==c.drmInfos.length))throw new p(2,4,4008);return e.jc||c.jc}function Ed(a,b,c){return c.map(function(c){var d=Bd[c.Mc];return d?[fb(d,c.init||a)]:b(c.node)||[]}).reduce(Pa,[])}
function Dd(a){return a.map(function(a){var b=a.getAttribute("schemeIdUri"),d=a.getAttribute("cenc:default_KID"),e=J(a,"cenc:pssh").map(td);if(!b)return null;b=b.toLowerCase();if(d&&(d=d.replace(/-/g,"").toLowerCase(),0<=d.indexOf(" ")))throw new p(2,4,4009);var f=[];try{f=e.map(function(a){return{initDataType:"cenc",initData:vb(a),keyId:null}})}catch(g){throw new p(2,4,4007);}return{node:a,Mc:b,keyId:d,init:0<f.length?f:null}}).filter(Ra)};function Gd(a,b,c,d,e){null!=e&&(e=Math.round(e));var f={RepresentationID:b,Number:c,Bandwidth:d,Time:e};return a.replace(/\$(RepresentationID|Number|Bandwidth|Time)?(?:%0([0-9]+)d)?\$/g,function(a,b,c){if("$$"==a)return"$";var d=f[b];if(null==d)return a;"RepresentationID"==b&&c&&(c=void 0);a=d.toString();c=window.parseInt(c,10)||1;return Array(Math.max(0,c-a.length)+1).join("0")+a})}
function Hd(a,b){var c=Id(a,b,"timescale"),d=1;c&&(d=yd(c)||1);c=Id(a,b,"duration");(c=yd(c||""))&&(c/=d);var e=Id(a,b,"startNumber"),f=Number(Id(a,b,"presentationTimeOffset"))||0,g=zd(e||"");if(null==e||null==g)g=1;var h=Jd(a,b,"SegmentTimeline");e=null;if(h){e=d;var k=a.M.duration||Infinity;h=J(h,"S");for(var l=[],q=0,v=0;v<h.length;++v){var r=h[v],t=K(r,"t",zd),y=K(r,"d",zd);r=K(r,"r",xd);null!=t&&(t-=f);if(!y)break;t=null!=t?t:q;r=r||0;if(0>r)if(v+1<h.length){r=K(h[v+1],"t",zd);if(null==r)break;
else if(t>=r)break;r=Math.ceil((r-t)/y)-1}else{if(Infinity==k)break;else if(t/e>=k)break;r=Math.ceil((k*e-t)/y)-1}0<l.length&&t!=q&&(l[l.length-1].end=t/e);for(var w=0;w<=r;++w)q=t+y,l.push({start:t/e,end:q/e,Se:t}),t=q}e=l}return{timescale:d,R:c,Aa:g,V:f/d||0,fc:f,I:e}}function Id(a,b,c){return[b(a.w),b(a.S),b(a.ba)].filter(Ra).map(function(a){return a.getAttribute(c)}).reduce(function(a,b){return a||b})}
function Jd(a,b,c){return[b(a.w),b(a.S),b(a.ba)].filter(Ra).map(function(a){return sd(a,c)}).reduce(function(a,b){return a||b})}function Kd(a,b){var c=new DOMParser;try{var d=C(a);var e=c.parseFromString(d,"text/xml")}catch(g){}if(e&&e.documentElement.tagName==b)var f=e.documentElement;return f&&0<f.getElementsByTagName("parsererror").length?null:f}
function Ld(a,b,c,d,e,f){for(var g=a.getAttribute("xlink:href"),h=a.getAttribute("xlink:actuate")||"onRequest",k=0;k<a.attributes.length;k++){var l=a.attributes[k].nodeName;-1!=l.indexOf("xlink:")&&(a.removeAttribute(l),--k)}if(5<=f)return Promise.reject(new p(2,4,4028));if("onLoad"!=h)return Promise.reject(new p(2,4,4027));var q=B([d],[g]);return e.request(0,Va(q,b)).then(function(d){d=Kd(d.data,a.tagName);if(!d)return Promise.reject(new p(2,4,4001,g));for(;a.childNodes.length;)a.removeChild(a.childNodes[0]);
for(;d.childNodes.length;){var h=d.childNodes[0];d.removeChild(h);a.appendChild(h)}for(h=0;h<d.attributes.length;h++){var k=d.attributes[h].nodeName,l=d.getAttribute(k);a.setAttribute(k,l)}return Md(a,b,c,q[0],e,f+1)}.bind(a))}
function Md(a,b,c,d,e,f){f=f||0;if(a.getAttribute("xlink:href")){var g=Ld(a,b,c,d,e,f);c&&(g=g["catch"](function(){return Md(a,b,c,d,e,f)}));return g}for(g=0;g<a.childNodes.length;g++){var h=a.childNodes[g];h instanceof Element&&"urn:mpeg:dash:resolve-to-zero:2013"==h.getAttribute("xlink:href")&&(a.removeChild(h),--g)}var k=[];for(g=0;g<a.childNodes.length;g++)h=a.childNodes[g],h.nodeType==Node.ELEMENT_NODE&&(h=Md(h,b,c,d,e,f),k.push(h));return Promise.all(k).then(function(){return a})};function L(a,b,c){this.a=a;this.O=b;this.F=c}n("shaka.media.InitSegmentReference",L);L.prototype.Bb=function(){return this.a()};L.prototype.createUris=L.prototype.Bb;L.prototype.Hb=function(){return this.O};L.prototype.getStartByte=L.prototype.Hb;L.prototype.Eb=function(){return this.F};L.prototype.getEndByte=L.prototype.Eb;function M(a,b,c,d,e,f){this.position=a;this.startTime=b;this.endTime=c;this.a=d;this.O=e;this.F=f}n("shaka.media.SegmentReference",M);M.prototype.U=function(){return this.position};
M.prototype.getPosition=M.prototype.U;M.prototype.Ib=function(){return this.startTime};M.prototype.getStartTime=M.prototype.Ib;M.prototype.ld=function(){return this.endTime};M.prototype.getEndTime=M.prototype.ld;M.prototype.Bb=function(){return this.a()};M.prototype.createUris=M.prototype.Bb;M.prototype.Hb=function(){return this.O};M.prototype.getStartByte=M.prototype.Hb;M.prototype.Eb=function(){return this.F};M.prototype.getEndByte=M.prototype.Eb;function N(a,b){this.H=a;this.b=b==Nd;this.a=0}n("shaka.util.DataViewReader",N);var Nd=1;N.Endianness={Ye:0,af:Nd};N.prototype.ea=function(){return this.a<this.H.byteLength};N.prototype.hasMoreData=N.prototype.ea;N.prototype.U=function(){return this.a};N.prototype.getPosition=N.prototype.U;N.prototype.md=function(){return this.H.byteLength};N.prototype.getLength=N.prototype.md;N.prototype.ca=function(){try{var a=this.H.getUint8(this.a)}catch(b){Od()}this.a+=1;return a};N.prototype.readUint8=N.prototype.ca;
N.prototype.Xa=function(){try{var a=this.H.getUint16(this.a,this.b)}catch(b){Od()}this.a+=2;return a};N.prototype.readUint16=N.prototype.Xa;N.prototype.C=function(){try{var a=this.H.getUint32(this.a,this.b)}catch(b){Od()}this.a+=4;return a};N.prototype.readUint32=N.prototype.C;N.prototype.Hc=function(){try{var a=this.H.getInt32(this.a,this.b)}catch(b){Od()}this.a+=4;return a};N.prototype.readInt32=N.prototype.Hc;
N.prototype.Ma=function(){try{if(this.b){var a=this.H.getUint32(this.a,!0);var b=this.H.getUint32(this.a+4,!0)}else b=this.H.getUint32(this.a,!1),a=this.H.getUint32(this.a+4,!1)}catch(c){Od()}if(2097151<b)throw new p(2,3,3001);this.a+=8;return b*Math.pow(2,32)+a};N.prototype.readUint64=N.prototype.Ma;N.prototype.La=function(a){this.a+a>this.H.byteLength&&Od();var b=new Uint8Array(this.H.buffer,this.H.byteOffset+this.a,a);this.a+=a;return new Uint8Array(b)};N.prototype.readBytes=N.prototype.La;
N.prototype.G=function(a){this.a+a>this.H.byteLength&&Od();this.a+=a};N.prototype.skip=N.prototype.G;N.prototype.Lc=function(a){this.a<a&&Od();this.a-=a};N.prototype.rewind=N.prototype.Lc;N.prototype.seek=function(a){(0>a||a>this.H.byteLength)&&Od();this.a=a};N.prototype.seek=N.prototype.seek;N.prototype.Vb=function(){for(var a=this.a;this.ea()&&0!=this.H.getUint8(this.a);)this.a+=1;a=new Uint8Array(this.H.buffer,this.H.byteOffset+a,this.a-a);this.a+=1;return C(a)};
N.prototype.readTerminatedString=N.prototype.Vb;function Od(){throw new p(2,3,3E3);};function O(){this.c=[];this.b=[];this.a=!1}n("shaka.util.Mp4Parser",O);O.prototype.B=function(a,b){var c=Pd(a);this.c[c]=0;this.b[c]=b;return this};O.prototype.box=O.prototype.B;O.prototype.Z=function(a,b){var c=Pd(a);this.c[c]=1;this.b[c]=b;return this};O.prototype.fullBox=O.prototype.Z;O.prototype.stop=function(){this.a=!0};O.prototype.stop=O.prototype.stop;
O.prototype.parse=function(a,b){var c=new Uint8Array(a);c=new N(new DataView(c.buffer,c.byteOffset,c.byteLength),0);for(this.a=!1;c.ea()&&!this.a;)this.ub(0,c,b)};O.prototype.parse=O.prototype.parse;
O.prototype.ub=function(a,b,c){var d=b.U(),e=b.C(),f=b.C();switch(e){case 0:e=b.H.byteLength-d;break;case 1:e=b.Ma()}var g=this.b[f];if(g){var h=null,k=null;1==this.c[f]&&(k=b.C(),h=k>>>24,k&=16777215);f=d+e;c&&f>b.H.byteLength&&(f=b.H.byteLength);f-=b.U();b=0<f?b.La(f):new Uint8Array(0);b=new N(new DataView(b.buffer,b.byteOffset,b.byteLength),0);g({ma:this,Ec:c||!1,version:h,flags:k,s:b,size:e,start:d+a})}else b.G(d+e-b.U())};O.prototype.parseNext=O.prototype.ub;
function P(a){for(;a.s.ea()&&!a.ma.a;)a.ma.ub(a.start,a.s,a.Ec)}O.children=P;function Qd(a){for(var b=a.s.C();0<b&&!a.ma.a;--b)a.ma.ub(a.start,a.s,a.Ec)}O.sampleDescription=Qd;function Rd(a){return function(b){a(b.s.La(b.s.H.byteLength-b.s.U()))}}O.allData=Rd;function Pd(a){for(var b=0,c=0;c<a.length;c++)b=b<<8|a.charCodeAt(c);return b};function Sd(a,b,c,d){var e,f=(new O).Z("sidx",function(a){e=Td(b,d,c,a)});a&&f.parse(a);if(e)return e;throw new p(2,3,3004);}
function Td(a,b,c,d){var e=[];d.s.G(4);var f=d.s.C();if(0==f)throw new p(2,3,3005);if(0==d.version){var g=d.s.C();var h=d.s.C()}else g=d.s.Ma(),h=d.s.Ma();d.s.G(2);var k=d.s.Xa();a=a+d.size+h;for(h=0;h<k;h++){var l=d.s.C(),q=(l&2147483648)>>>31;l&=2147483647;var v=d.s.C();d.s.G(4);if(1==q)throw new p(2,3,3006);e.push(new M(e.length,g/f-b,(g+v)/f-b,function(){return c},a,a+l-1));g+=v;a+=l}d.ma.stop();return e};function Q(a){this.a=a}n("shaka.media.SegmentIndex",Q);Q.prototype.destroy=function(){this.a=null;return Promise.resolve()};Q.prototype.destroy=Q.prototype.destroy;Q.prototype.find=function(a){for(var b=this.a.length-1;0<=b;--b){var c=this.a[b];if(a>=c.startTime&&a<c.endTime)return c.position}return this.a.length&&a<this.a[0].startTime?this.a[0].position:null};Q.prototype.find=Q.prototype.find;
Q.prototype.get=function(a){if(0==this.a.length)return null;a-=this.a[0].position;return 0>a||a>=this.a.length?null:this.a[a]};Q.prototype.get=Q.prototype.get;Q.prototype.offset=function(a){for(var b=0;b<this.a.length;++b)this.a[b].startTime+=a,this.a[b].endTime+=a};Q.prototype.offset=Q.prototype.offset;
Q.prototype.Nb=function(a){for(var b=[],c=0,d=0;c<this.a.length&&d<a.length;){var e=this.a[c],f=a[d];e.startTime<f.startTime?(b.push(e),c++):(e.startTime>f.startTime?0==c&&b.push(f):(.1<Math.abs(e.endTime-f.endTime)?(f=new M(e.position,f.startTime,f.endTime,f.a,f.O,f.F),b.push(f)):b.push(e),c++),d++)}for(;c<this.a.length;)b.push(this.a[c++]);if(b.length)for(c=b[b.length-1].position+1;d<a.length;)f=a[d++],f=new M(c++,f.startTime,f.endTime,f.a,f.O,f.F),b.push(f);else b=a;this.a=b};
Q.prototype.merge=Q.prototype.Nb;Q.prototype.Cb=function(a){for(var b=0;b<this.a.length&&!(this.a[b].endTime>a);++b);this.a.splice(0,b)};Q.prototype.evict=Q.prototype.Cb;
function Ud(a,b){for(;a.a.length;){var c=a.a[a.a.length-1];if(c.startTime>=b)a.a.pop();else break}for(;a.a.length;)if(c=a.a[0],0>=c.endTime)a.a.shift();else break;0!=a.a.length&&(c=a.a[0],c.startTime<gb&&(a.a[0]=new M(c.position,0,c.endTime,c.a,c.O,c.F)),c=a.a[a.a.length-1],a.a[a.a.length-1]=new M(c.position,c.startTime,b,c.a,c.O,c.F))};function Vd(a){this.b=a;this.a=new N(a,0);Wd||(Wd=[new Uint8Array([255]),new Uint8Array([127,255]),new Uint8Array([63,255,255]),new Uint8Array([31,255,255,255]),new Uint8Array([15,255,255,255,255]),new Uint8Array([7,255,255,255,255,255]),new Uint8Array([3,255,255,255,255,255,255]),new Uint8Array([1,255,255,255,255,255,255,255])])}var Wd;Vd.prototype.ea=function(){return this.a.ea()};
function Xd(a){var b=Yd(a);if(7<b.length)throw new p(2,3,3002);for(var c=0,d=0;d<b.length;d++)c=256*c+b[d];b=c;c=Yd(a);a:{for(d=0;d<Wd.length;d++)if(yb(c,Wd[d])){d=!0;break a}d=!1}if(d)c=a.b.byteLength-a.a.U();else{if(8==c.length&&c[1]&224)throw new p(2,3,3001);d=c[0]&(1<<8-c.length)-1;for(var e=1;e<c.length;e++)d=256*d+c[e];c=d}c=a.a.U()+c<=a.b.byteLength?c:a.b.byteLength-a.a.U();d=new DataView(a.b.buffer,a.b.byteOffset+a.a.U(),c);a.a.G(c);return new Zd(b,d)}
function Yd(a){var b=a.a.ca(),c;for(c=1;8>=c&&!(b&1<<8-c);c++);if(8<c)throw new p(2,3,3002);var d=new Uint8Array(c);d[0]=b;for(b=1;b<c;b++)d[b]=a.a.ca();return d}function Zd(a,b){this.id=a;this.a=b}function $d(a){if(8<a.a.byteLength)throw new p(2,3,3002);if(8==a.a.byteLength&&a.a.getUint8(0)&224)throw new p(2,3,3001);for(var b=0,c=0;c<a.a.byteLength;c++){var d=a.a.getUint8(c);b=256*b+d}return b};function ae(){}
ae.prototype.parse=function(a,b,c,d){var e;b=new Vd(new DataView(b));if(440786851!=Xd(b).id)throw new p(2,3,3008);var f=Xd(b);if(408125543!=f.id)throw new p(2,3,3009);b=f.a.byteOffset;f=new Vd(f.a);for(e=null;f.ea();){var g=Xd(f);if(357149030==g.id){e=g;break}}if(!e)throw new p(2,3,3010);f=new Vd(e.a);e=1E6;for(g=null;f.ea();){var h=Xd(f);if(2807729==h.id)e=$d(h);else if(17545==h.id)if(g=h,4==g.a.byteLength)g=g.a.getFloat32(0);else if(8==g.a.byteLength)g=g.a.getFloat64(0);else throw new p(2,3,3003);
}if(null==g)throw new p(2,3,3011);f=e/1E9;e=g*f;a=Xd(new Vd(new DataView(a)));if(475249515!=a.id)throw new p(2,3,3007);return be(a,b,f,e,c,d)};function be(a,b,c,d,e,f){function g(){return e}var h=[];a=new Vd(a.a);for(var k=null,l=null;a.ea();){var q=Xd(a);if(187==q.id){var v=ce(q);v&&(q=c*v.Te,v=b+v.oe,null!=k&&h.push(new M(h.length,k-f,q-f,g,l,v-1)),k=q,l=v)}}null!=k&&h.push(new M(h.length,k-f,d-f,g,l,null));return h}
function ce(a){var b=new Vd(a.a);a=Xd(b);if(179!=a.id)throw new p(2,3,3013);a=$d(a);b=Xd(b);if(183!=b.id)throw new p(2,3,3012);b=new Vd(b.a);for(var c=0;b.ea();){var d=Xd(b);if(241==d.id){c=$d(d);break}}return{Te:a,oe:c}};function de(a,b){var c=Jd(a,b,"Initialization");if(!c)return null;var d=a.w.da,e=c.getAttribute("sourceURL");e&&(d=B(a.w.da,[e]));e=0;var f=null;if(c=K(c,"range",wd))e=c.start,f=c.end;return new L(function(){return d},e,f)}
function ee(a,b){var c=Number(Id(a,fe,"presentationTimeOffset"))||0,d=Id(a,fe,"timescale"),e=1;d&&(e=yd(d)||1);c=c/e||0;d=de(a,fe);var f=a.w.contentType;e=a.w.mimeType.split("/")[1];if("text"!=f&&"mp4"!=e&&"webm"!=e)throw new p(2,4,4006);if("webm"==e&&!d)throw new p(2,4,4005);f=Jd(a,fe,"RepresentationIndex");var g=Id(a,fe,"indexRange"),h=a.w.da;g=wd(g||"");if(f){var k=f.getAttribute("sourceURL");k&&(h=B(a.w.da,[k]));g=K(f,"range",wd,g)}if(!g)throw new p(2,4,4002);e=ge(a,b,d,h,g.start,g.end,e,c);return{createSegmentIndex:e.createSegmentIndex,
findSegmentPosition:e.findSegmentPosition,getSegmentReference:e.getSegmentReference,initSegmentReference:d,V:c}}
function ge(a,b,c,d,e,f,g,h){var k=a.presentationTimeline,l=!a.Da||!a.M.Jb,q=a.M.start,v=a.M.duration,r=b,t=null;return{createSegmentIndex:function(){var a=[r(d,e,f),"webm"==g?r(c.a(),c.O,c.F):null];r=null;return Promise.all(a).then(function(a){var b=a[0];a=a[1]||null;b="mp4"==g?Sd(b,e,d,h):(new ae).parse(b,a,d,h);k.Wa(q,b);t=new Q(b);l&&Ud(t,v)})},findSegmentPosition:function(a){return t.find(a)},getSegmentReference:function(a){return t.get(a)}}}function fe(a){return a.Ya};function he(a,b){var c=de(a,ie);var d=je(a);var e=Hd(a,ie),f=e.Aa;0==f&&(f=1);var g=0;e.R?g=e.R*(f-1):e.I&&0<e.I.length&&(g=e.I[0].start);d={R:e.R,startTime:g,Aa:f,V:e.V,I:e.I,Ha:d};if(!d.R&&!d.I&&1<d.Ha.length)throw new p(2,4,4002);if(!d.R&&!a.M.duration&&!d.I&&1==d.Ha.length)throw new p(2,4,4002);if(d.I&&0==d.I.length)throw new p(2,4,4002);f=e=null;a.ba.id&&a.w.id&&(f=a.ba.id+","+a.w.id,e=b[f]);g=ke(a.M.duration,d.Aa,a.w.da,d);e?(e.Nb(g),f=a.presentationTimeline.ka(),e.Cb(f-a.M.start)):(a.presentationTimeline.Wa(a.M.start,
g),e=new Q(g),f&&a.Da&&(b[f]=e));a.Da&&a.M.Jb||Ud(e,a.M.duration);return{createSegmentIndex:Promise.resolve.bind(Promise),findSegmentPosition:e.find.bind(e),getSegmentReference:e.get.bind(e),initSegmentReference:c,V:d.V}}function ie(a){return a.ra}
function ke(a,b,c,d){var e=d.Ha.length;d.I&&d.I.length!=d.Ha.length&&(e=Math.min(d.I.length,d.Ha.length));for(var f=[],g=d.startTime,h=0;h<e;h++){var k=d.Ha[h],l=B(c,[k.Bd]);var q=null!=d.R?g+d.R:d.I?d.I[h].end:g+a;f.push(new M(h+b,g,q,function(a){return a}.bind(null,l),k.start,k.end));g=q}return f}
function je(a){return[a.w.ra,a.S.ra,a.ba.ra].filter(Ra).map(function(a){return J(a,"SegmentURL")}).reduce(function(a,c){return 0<a.length?a:c}).map(function(b){b.getAttribute("indexRange")&&!a.qc&&(a.qc=!0);var c=b.getAttribute("media");b=K(b,"mediaRange",wd,{start:0,end:null});return{Bd:c,start:b.start,end:b.end}})};function le(a,b,c,d){var e=me(a);var f=Hd(a,ne);var g=Id(a,ne,"media"),h=Id(a,ne,"index");f={R:f.R,timescale:f.timescale,Aa:f.Aa,V:f.V,fc:f.fc,I:f.I,Mb:g,Ua:h};g=0+(f.Ua?1:0);g+=f.I?1:0;g+=f.R?1:0;if(0==g)throw new p(2,4,4002);1!=g&&(f.Ua&&(f.I=null),f.R=null);if(!f.Ua&&!f.Mb)throw new p(2,4,4002);if(f.Ua){c=a.w.mimeType.split("/")[1];if("mp4"!=c&&"webm"!=c)throw new p(2,4,4006);if("webm"==c&&!e)throw new p(2,4,4005);d=Gd(f.Ua,a.w.id,null,a.bandwidth||null,null);d=B(a.w.da,[d]);a=ge(a,b,e,d,0,null,
c,f.V)}else f.R?(d||a.presentationTimeline.tb(f.R),a=oe(a,f)):(d=b=null,a.ba.id&&a.w.id&&(d=a.ba.id+","+a.w.id,b=c[d]),g=pe(a,f),b?(b.Nb(g),c=a.presentationTimeline.ka(),b.Cb(c-a.M.start)):(a.presentationTimeline.Wa(a.M.start,g),b=new Q(g),d&&a.Da&&(c[d]=b)),a.Da&&a.M.Jb||Ud(b,a.M.duration),a={createSegmentIndex:Promise.resolve.bind(Promise),findSegmentPosition:b.find.bind(b),getSegmentReference:b.get.bind(b)});return{createSegmentIndex:a.createSegmentIndex,findSegmentPosition:a.findSegmentPosition,
getSegmentReference:a.getSegmentReference,initSegmentReference:e,V:f.V}}function ne(a){return a.$a}
function oe(a,b){var c=a.M.duration,d=b.R,e=b.Aa,f=b.timescale,g=b.V,h=b.Mb,k=a.bandwidth||null,l=a.w.id,q=a.w.da;return{createSegmentIndex:Promise.resolve.bind(Promise),findSegmentPosition:function(a){return 0>a||c&&a>=c?null:Math.floor((a+g)/d)},getSegmentReference:function(a){var b=a*d-g,v=b+d;c&&(v=Math.min(v,c));return 0>v||c&&b>=c?null:new M(a,b,v,function(){var c=Gd(h,l,a+e,k,b*f);return B(q,[c])},0,null)}}}
function pe(a,b){for(var c=[],d=0;d<b.I.length;d++){var e=d+b.Aa;c.push(new M(e,b.I[d].start,b.I[d].end,function(a,b,c,d,e,q){a=Gd(a,b,e,c,q);return B(d,[a]).map(function(a){return a.toString()})}.bind(null,b.Mb,a.w.id,a.bandwidth||null,a.w.da,e,b.I[d].Se+b.fc),0,null))}return c}function me(a){var b=Id(a,ne,"initialization");if(!b)return null;var c=a.w.id,d=a.bandwidth||null,e=a.w.da;return new L(function(){var a=Gd(b,c,null,d,null);return B(e,[a])},0,null)};var qe={},re={};n("shaka.media.ManifestParser.registerParserByExtension",function(a,b){re[a]=b});n("shaka.media.ManifestParser.registerParserByMime",function(a,b){qe[a]=b});function se(){var a={},b;for(b in qe)a[b]=!0;for(b in re)a[b]=!0;["application/dash+xml","application/x-mpegurl","application/vnd.apple.mpegurl","application/vnd.ms-sstr+xml"].forEach(function(b){a[b]=!!qe[b]});["mpd","m3u8","ism"].forEach(function(b){a[b]=!!re[b]});return a}
function te(a,b,c,d){var e=d;e||(d=(new ta(a)).aa.split("/").pop().split("."),1<d.length&&(d=d.pop().toLowerCase(),e=re[d]));if(e)return Promise.resolve(e);c=Va([a],c);c.method="HEAD";return b.request(0,c).then(function(b){(b=b.headers["content-type"])&&(b=b.toLowerCase());return(e=qe[b])?e:Promise.reject(new p(2,4,4E3,a))},function(a){a.severity=2;return Promise.reject(a)})};function R(a,b){this.c=a;this.j=b;this.f=this.a=Infinity;this.b=1;this.i=0;this.h=!0;this.g=0}n("shaka.media.PresentationTimeline",R);R.prototype.T=function(){return this.a};R.prototype.getDuration=R.prototype.T;R.prototype.ha=function(a){this.a=a};R.prototype.setDuration=R.prototype.ha;R.prototype.qd=function(){return this.c};R.prototype.getPresentationStartTime=R.prototype.qd;R.prototype.Pc=function(a){this.i=a};R.prototype.setClockOffset=R.prototype.Pc;R.prototype.vb=function(a){this.h=a};
R.prototype.setStatic=R.prototype.vb;R.prototype.sd=function(){return this.f};R.prototype.getSegmentAvailabilityDuration=R.prototype.sd;R.prototype.ac=function(a){this.f=a};R.prototype.setSegmentAvailabilityDuration=R.prototype.ac;R.prototype.Qc=function(a){this.j=a};R.prototype.setDelay=R.prototype.Qc;R.prototype.Wa=function(a,b){0!=b.length&&(this.b=b.reduce(function(a,b){return Math.max(a,b.endTime-b.startTime)},this.b))};R.prototype.notifySegments=R.prototype.Wa;
R.prototype.tb=function(a){this.b=Math.max(this.b,a)};R.prototype.notifyMaxSegmentDuration=R.prototype.tb;R.prototype.P=function(){return Infinity==this.a&&!this.h};R.prototype.isLive=R.prototype.P;R.prototype.xa=function(){return Infinity!=this.a&&!this.h};R.prototype.isInProgress=R.prototype.xa;R.prototype.ka=function(){return this.Fa(0)};R.prototype.getSegmentAvailabilityStart=R.prototype.ka;
R.prototype.Fa=function(a){if(Infinity==this.f)return this.g;var b=this.wa();return Math.max(this.g,Math.min(b-this.f+a,b))};R.prototype.getSafeAvailabilityStart=R.prototype.Fa;R.prototype.Oc=function(a){this.g=a};R.prototype.setAvailabilityStart=R.prototype.Oc;R.prototype.wa=function(){return this.P()||this.xa()?Math.min(Math.max(0,(Date.now()+this.i)/1E3-this.b-this.c),this.a):this.a};R.prototype.getSegmentAvailabilityEnd=R.prototype.wa;
R.prototype.rb=function(){var a=this.P()||this.xa()?this.j:0;return Math.max(0,this.wa()-a)};R.prototype.getSeekRangeEnd=R.prototype.rb;function ue(){this.a=this.b=null;this.g=[];this.c=null;this.i=[];this.h=1;this.j={};this.l=0;this.f=null}n("shaka.dash.DashParser",ue);m=ue.prototype;m.configure=function(a){this.b=a};m.start=function(a,b){this.g=[a];this.a=b;return ve(this).then(function(){this.a&&we(this,0);return this.c}.bind(this))};m.stop=function(){this.b=this.a=null;this.g=[];this.c=null;this.i=[];this.j={};null!=this.f&&(window.clearTimeout(this.f),this.f=null);return Promise.resolve()};m.update=function(){ve(this)["catch"](function(a){if(this.a)this.a.onError(a)}.bind(this))};
m.onExpirationUpdated=function(){};function ve(a){return a.a.networkingEngine.request(0,Va(a.g,a.b.retryParameters),function(){return!this.a}.bind(a)).then(function(a){if(this.a)return xe(this,a.data,a.uri)}.bind(a))}function xe(a,b,c){b=Kd(b,"MPD");if(!b)throw new p(2,4,4001,c);return Md(b,a.b.retryParameters,a.b.dash.xlinkFailGracefully,c,a.a.networkingEngine).then(function(a){return ye(this,a,c)}.bind(a))}
function ye(a,b,c){c=[c];var d=J(b,"Location").map(td).filter(Ra);0<d.length&&(c=a.g=d);d=J(b,"BaseURL").map(td);c=B(c,d);var e=K(b,"minBufferTime",vd);a.l=K(b,"minimumUpdatePeriod",vd,-1);var f=K(b,"availabilityStartTime",ud);d=K(b,"timeShiftBufferDepth",vd);var g=K(b,"suggestedPresentationDelay",vd),h=K(b,"maxSegmentDuration",vd),k=b.getAttribute("type")||"static";if(a.c)var l=a.c.presentationTimeline;else{var q=Math.max(a.b.dash.defaultPresentationDelay,1.5*e);l=new R(f,null!=g?g:q)}f=ze(a,{Da:"static"!=
k,presentationTimeline:l,ba:null,M:null,S:null,w:null,bandwidth:0,qc:!1},c,b);g=f.duration;var v=f.periods;l.vb("static"==k);"static"!=k&&f.kc||l.ha(g||Infinity);l.ac(null!=d?d:Infinity);l.tb(h||1);if(a.c)return Promise.resolve();b=J(b,"UTCTiming");d=l.P();return Ae(a,c,b,d).then(function(a){this.a&&(l.Pc(a),this.c={presentationTimeline:l,periods:v,offlineSessionIds:[],minBufferTime:e||0})}.bind(a))}
function ze(a,b,c,d){var e=K(d,"mediaPresentationDuration",vd),f=[],g=0;d=J(d,"Period");for(var h=0;h<d.length;h++){var k=d[h];g=K(k,"start",vd,g);var l=K(k,"duration",vd),q=null;if(h!=d.length-1){var v=K(d[h+1],"start",vd);null!=v&&(q=v-g)}else null!=e&&(q=e-g);null==q&&(q=l);k=Be(a,b,c,{start:g,duration:q,node:k,Jb:null==q||h==d.length-1});f.push(k);l=b.ba.id;-1==a.i.indexOf(l)&&(a.i.push(l),a.c&&(a.a.filterNewPeriod(k),a.c.periods.push(k)));if(null==q){g=null;break}g+=q}null==a.c&&a.a.filterAllPeriods(f);
return null!=e?{periods:f,duration:e,kc:!1}:{periods:f,duration:g,kc:!0}}
function Be(a,b,c,d){b.ba=Ce(d.node,null,c);b.M=d;b.ba.id||(b.ba.id="__shaka_period_"+d.start);J(d.node,"EventStream").forEach(a.ee.bind(a,d.start,d.duration));c=J(d.node,"AdaptationSet").map(a.ce.bind(a,b)).filter(Ra);var e=c.map(function(a){return a.qe}).reduce(Pa,[]),f=e.filter(Sa);if(b.Da&&e.length!=f.length)throw new p(2,4,4018);var g=c.filter(function(a){return!a.ec});c.filter(function(a){return a.ec}).forEach(function(a){var b=a.streams[0],c=a.ec;g.forEach(function(a){a.id==c&&a.streams.forEach(function(a){a.trickModeVideo=
b})})});e=De(g,"video");f=De(g,"audio");if(!e.length&&!f.length)throw new p(2,4,4004);f.length||(f=[null]);e.length||(e=[null]);b=[];for(c=0;c<f.length;c++)for(var h=0;h<e.length;h++)Ee(a,f[c],e[h],b);a=De(g,"text");e=[];for(c=0;c<a.length;c++)e.push.apply(e,a[c].streams);return{startTime:d.start,textStreams:e,variants:b}}function De(a,b){return a.filter(function(a){return a.contentType==b})}
function Ee(a,b,c,d){if(b||c)if(b&&c){var e=b.drmInfos;var f=c.drmInfos;if(e.length&&f.length?0<Sb(e,f).length:1){var g=Sb(b.drmInfos,c.drmInfos);for(e=0;e<b.streams.length;e++)for(var h=0;h<c.streams.length;h++)f=(c.streams[h].bandwidth||0)+(b.streams[e].bandwidth||0),f={id:a.h++,language:b.language,primary:b.Lb||c.Lb,audio:b.streams[e],video:c.streams[h],bandwidth:f,drmInfos:g,allowedByApplication:!0,allowedByKeySystem:!0},d.push(f)}}else for(g=b||c,e=0;e<g.streams.length;e++)f=g.streams[e].bandwidth||
0,f={id:a.h++,language:g.language||"und",primary:g.Lb,audio:b?g.streams[e]:null,video:c?g.streams[e]:null,bandwidth:f,drmInfos:g.drmInfos,allowedByApplication:!0,allowedByKeySystem:!0},d.push(f)}
m.ce=function(a,b){a.S=Ce(b,a.ba,null);var c=!1,d=J(b,"Role"),e=d.map(function(a){return a.getAttribute("value")}).filter(Ra),f=void 0;"text"==a.S.contentType&&(f="subtitle");for(var g=0;g<d.length;g++){var h=d[g].getAttribute("schemeIdUri");if(null==h||"urn:mpeg:dash:role:2011"==h)switch(h=d[g].getAttribute("value"),h){case "main":c=!0;break;case "caption":case "subtitle":f=h}}var k=null,l=!1;J(b,"EssentialProperty").forEach(function(a){"http://dashif.org/guidelines/trickmode"==a.getAttribute("schemeIdUri")?
k=a.getAttribute("value"):l=!0});if(l)return null;d=J(b,"ContentProtection");var q=Cd(d,this.b.dash.customScheme,this.b.dash.ignoreDrmInfo);d=pc(b.getAttribute("lang")||"und");h=b.getAttribute("label");g=J(b,"Representation");e=g.map(this.fe.bind(this,a,q,f,d,h,c,e)).filter(function(a){return!!a});if(0==e.length)throw new p(2,4,4003);a.S.contentType&&"application"!=a.S.contentType||(a.S.contentType=Fe(e[0].mimeType,e[0].codecs),e.forEach(function(b){b.type=a.S.contentType}));e.forEach(function(a){q.drmInfos.forEach(function(b){a.keyId&&
b.keyIds.push(a.keyId)})});f=g.map(function(a){return a.getAttribute("id")}).filter(Ra);return{id:a.S.id||"__fake__"+this.h++,contentType:a.S.contentType,language:d,Lb:c,streams:e,drmInfos:q.drmInfos,ec:k,qe:f}};
m.fe=function(a,b,c,d,e,f,g,h){a.w=Ce(h,a.S,null);if(!Ge(a.w))return null;a.bandwidth=K(h,"bandwidth",yd)||0;var k=this.re.bind(this);if(a.w.Ya)k=ee(a,k);else if(a.w.ra)k=he(a,this.j);else if(a.w.$a)k=le(a,k,this.j,!!this.c);else{var l=a.w.da,q=a.M.duration||0;k={createSegmentIndex:Promise.resolve.bind(Promise),findSegmentPosition:function(a){return 0<=a&&a<q?1:null},getSegmentReference:function(a){return 1!=a?null:new M(1,0,q,function(){return l},0,null)},initSegmentReference:null,V:0}}h=J(h,"ContentProtection");
h=Fd(h,this.b.dash.customScheme,b,this.b.dash.ignoreDrmInfo);return{id:this.h++,createSegmentIndex:k.createSegmentIndex,findSegmentPosition:k.findSegmentPosition,getSegmentReference:k.getSegmentReference,initSegmentReference:k.initSegmentReference,presentationTimeOffset:k.V,mimeType:a.w.mimeType,codecs:a.w.codecs,frameRate:a.w.frameRate,bandwidth:a.bandwidth,width:a.w.width,height:a.w.height,kind:c,encrypted:0<b.drmInfos.length,keyId:h,language:d,label:e,type:a.S.contentType,primary:f,trickModeVideo:null,
containsEmsgBoxes:a.w.containsEmsgBoxes,roles:g,channelsCount:a.w.Pb}};m.Le=function(){this.f=null;var a=Date.now();ve(this).then(function(){this.a&&we(this,(Date.now()-a)/1E3)}.bind(this))["catch"](function(a){this.a&&(a.severity=1,this.a.onError(a),we(this,0))}.bind(this))};function we(a,b){0>a.l||(a.f=window.setTimeout(a.Le.bind(a),1E3*Math.max(Math.max(3,a.l)-b,0)))}
function Ce(a,b,c){b=b||{contentType:"",mimeType:"",codecs:"",containsEmsgBoxes:!1,frameRate:void 0,Pb:null};c=c||b.da;var d=J(a,"BaseURL").map(td),e=a.getAttribute("contentType")||b.contentType,f=a.getAttribute("mimeType")||b.mimeType,g=a.getAttribute("codecs")||b.codecs,h=K(a,"frameRate",Ad)||b.frameRate,k=!!J(a,"InbandEventStream").length,l=J(a,"AudioChannelConfiguration");l=He(l)||b.Pb;e||(e=Fe(f,g));return{da:B(c,d),Ya:sd(a,"SegmentBase")||b.Ya,ra:sd(a,"SegmentList")||b.ra,$a:sd(a,"SegmentTemplate")||
b.$a,width:K(a,"width",zd)||b.width,height:K(a,"height",zd)||b.height,contentType:e,mimeType:f,codecs:g,frameRate:h,containsEmsgBoxes:k||b.containsEmsgBoxes,id:a.getAttribute("id"),Pb:l}}
function He(a){for(var b=0;b<a.length;++b){var c=a[b],d=c.getAttribute("schemeIdUri");if(d&&(c=c.getAttribute("value")))switch(d){case "urn:mpeg:dash:outputChannelPositionList:2012":return c.trim().split(/ +/).length;case "urn:mpeg:dash:23003:3:audio_channel_configuration:2011":case "urn:dts:dash:audio_channel_configuration:2012":d=parseInt(c,10);if(!d)continue;return d;case "tag:dolby.com,2014:dash:audio_channel_configuration:2011":case "urn:dolby:dash:audio_channel_configuration:2011":if(d=parseInt(c,
16)){for(a=0;d;)d&1&&++a,d>>=1;return a}}}return null}function Ge(a){var b=0+(a.Ya?1:0);b+=a.ra?1:0;b+=a.$a?1:0;if(0==b)return"text"==a.contentType||"application"==a.contentType?!0:!1;1!=b&&(a.Ya&&(a.ra=null),a.$a=null);return!0}function Ie(a,b,c,d){b=B(b,[c]);b=Va(b,a.b.retryParameters);b.method=d;return a.a.networkingEngine.request(0,b).then(function(a){if("HEAD"==d){if(!a.headers||!a.headers.date)return 0;a=a.headers.date}else a=C(a.data);a=Date.parse(a);return isNaN(a)?0:a-Date.now()})}
function Ae(a,b,c,d){c=c.map(function(a){return{scheme:a.getAttribute("schemeIdUri"),value:a.getAttribute("value")}});var e=a.b.dash.clockSyncUri;d&&!c.length&&e&&c.push({scheme:"urn:mpeg:dash:utc:http-head:2014",value:e});return Oa(c,function(a){var c=a.value;switch(a.scheme){case "urn:mpeg:dash:utc:http-head:2014":case "urn:mpeg:dash:utc:http-head:2012":return Ie(this,b,c,"HEAD");case "urn:mpeg:dash:utc:http-xsdate:2014":case "urn:mpeg:dash:utc:http-iso:2014":case "urn:mpeg:dash:utc:http-xsdate:2012":case "urn:mpeg:dash:utc:http-iso:2012":return Ie(this,
b,c,"GET");case "urn:mpeg:dash:utc:direct:2014":case "urn:mpeg:dash:utc:direct:2012":return a=Date.parse(c),isNaN(a)?0:a-Date.now();case "urn:mpeg:dash:utc:http-ntp:2014":case "urn:mpeg:dash:utc:ntp:2014":case "urn:mpeg:dash:utc:sntp:2014":return Promise.reject();default:return Promise.reject()}}.bind(a))["catch"](function(){return 0})}
m.ee=function(a,b,c){var d=c.getAttribute("schemeIdUri")||"",e=c.getAttribute("value")||"",f=K(c,"timescale",zd)||1;J(c,"Event").forEach(function(c){var g=K(c,"presentationTime",zd)||0,k=K(c,"duration",zd)||0;g=g/f+a;k=g+k/f;null!=b&&(g=Math.min(g,a+b),k=Math.min(k,a+b));c={schemeIdUri:d,value:e,startTime:g,endTime:k,id:c.getAttribute("id")||"",eventElement:c};this.a.onTimelineRegionAdded(c)}.bind(this))};
m.re=function(a,b,c){a=Va(a,this.b.retryParameters);null!=b&&(a.headers.Range="bytes="+b+"-"+(null!=c?c:""));return this.a.networkingEngine.request(1,a).then(function(a){return a.data})};function Fe(a,b){return D[lb(a,b)]?"text":a.split("/")[0]}re.mpd=ue;qe["application/dash+xml"]=ue;function Je(a,b,c,d){this.uri=a;this.type=b;this.a=c;this.segments=d||null}function Ke(a,b,c,d){this.id=a;this.name=b;this.a=c;this.value=d||null}Ke.prototype.toString=function(){function a(a){return a.name+'="'+a.value+'"'}return this.value?"#"+this.name+":"+this.value:0<this.a.length?"#"+this.name+":"+this.a.map(a).join(","):"#"+this.name};function Le(a,b){this.name=a;this.value=b}Ke.prototype.getAttribute=function(a){var b=this.a.filter(function(b){return b.name==a});return b.length?b[0]:null};
function Me(a,b,c){c=c||null;return(a=a.getAttribute(b))?a.value:c}function Ne(a,b){this.a=b;this.uri=a};function Oe(a,b){return a.filter(function(a){return a.name==b})}function Pe(a,b){var c=Oe(a,b);return c.length?c[0]:null}function Qe(a,b,c){return a.filter(function(a){var d=a.getAttribute("TYPE");a=a.getAttribute("GROUP-ID");return d.value==b&&a.value==c})}function Re(a,b){return B([a],[b])[0]};function Se(a){this.b=a;this.a=0}function Te(a,b){b.lastIndex=a.a;var c=b.exec(a.b);c=null==c?null:{position:c.index,length:c[0].length,te:c};if(a.a==a.b.length||null==c||c.position!=a.a)return null;a.a+=c.length;return c.te}function Ue(a){return a.a==a.b.length?null:(a=Te(a,/[^ \t\n]*/gm))?a[0]:null};function Ve(){this.a=0}
function We(a,b,c){b=C(b);b=b.replace(/\r\n|\r(?=[^\n]|$)/gm,"\n").trim();var d=b.split(/\n+/m);if(!/^#EXTM3U($|[ \t\n])/m.test(d[0]))throw new p(2,4,4015);b=0;for(var e=[],f=1;f<d.length;)if(/^#(?!EXT)/m.test(d[f]))f+=1;else{var g=d[f];g=Xe(a.a++,g);if(0<=Ye.indexOf(g.name))b=1;else if(0<=$e.indexOf(g.name)){if(1!=b)throw new p(2,4,4017);d=d.splice(f,d.length-f);a=af(a,d,e);return new Je(c,b,e,a)}e.push(g);f+=1;"EXT-X-STREAM-INF"==g.name&&(g.a.push(new Le("URI",d[f])),f+=1)}return new Je(c,b,e)}
function af(a,b,c){var d=[],e=[];b.forEach(function(a){if(/^(#EXT)/.test(a))a=Xe(this.a++,a),0<=Ye.indexOf(a.name)?c.push(a):e.push(a);else{if(/^#(?!EXT)/m.test(a))return[];d.push(new Ne(a.trim(),e));e=[]}}.bind(a));return d}
function Xe(a,b){var c=b.match(/^#(EXT[^:]*)(?::(.*))?$/);if(!c)throw new p(2,4,4016);var d=c[1],e=c[2];c=[];if(e&&0<=e.indexOf("=")){e=new Se(e);for(var f,g=/([^=]+)=(?:"([^"]*)"|([^",]*))(?:,|$)/g;f=Te(e,g);)c.push(new Le(f[1],f[2]||f[3]))}else if(e)return new Ke(a,d,c,e);return new Ke(a,d,c)}var Ye="EXT-X-TARGETDURATION EXT-X-MEDIA-SEQUENCE EXT-X-DISCONTINUITY-SEQUENCE EXT-X-PLAYLIST-TYPE EXT-X-MAP EXT-X-I-FRAMES-ONLY EXT-X-ENDLIST".split(" "),$e="EXTINF EXT-X-BYTERANGE EXT-X-DISCONTINUITY EXT-X-PROGRAM-DATE-TIME EXT-X-KEY EXT-X-DATERANGE".split(" ");function bf(a){return new Promise(function(b){var c=bf.parse(a);b({uri:a,data:c.data,headers:{"content-type":c.contentType}})})}n("shaka.net.DataUriPlugin",bf);
bf.parse=function(a){var b=a.split(":");if(2>b.length||"data"!=b[0])throw new p(2,1,1004,a);b=b.slice(1).join(":").split(",");if(2>b.length)throw new p(2,1,1004,a);var c=b[0];b=window.decodeURIComponent(b.slice(1).join(","));c=c.split(";");var d=null;1<c.length&&(d=c[1]);if("base64"==d)a=vb(b).buffer;else{if(d)throw new p(2,1,1005,a);a=qb(b)}return{data:a,contentType:c[0]}};Ua("data",bf);function cf(){this.h=this.c=null;this.D=1;this.u={};this.A={};this.K={};this.a={};this.b=null;this.l="";this.o=new Ve;this.j=this.i=null;this.f=df;this.m=null;this.g=0;this.v=Infinity}n("shaka.hls.HlsParser",cf);m=cf.prototype;m.configure=function(a){this.h=a};m.start=function(a,b){this.c=b;this.l=a;return ef(this,a).then(function(b){return ff(this,b.data,a).then(function(){gf(this,this.i);return this.m}.bind(this))}.bind(this))};
m.stop=function(){this.h=this.c=null;this.u={};this.A={};this.m=null;return Promise.resolve()};m.update=function(){if(this.f!=hf.pa){var a=[],b;for(b in this.a)a.push(jf(this,this.a[b],b));return Promise.all(a)}};
function jf(a,b,c){ef(a,c).then(function(a){var d=hf,f=We(this.o,a.data,c);if(1!=f.type)throw new p(2,4,4017);a=Pe(f.a,"EXT-X-MEDIA-SEQUENCE");var g=b.stream;kf(this,f,a?Number(a.value):0,g.mimeType,g.codecs).then(function(a){b.Za.a=a;a=a[a.length-1];Pe(f.a,"EXT-X-ENDLIST")&&(lf(this,d.pa),this.b.ha(a.endTime))}.bind(this))}.bind(a))}m.onExpirationUpdated=function(){};
function ff(a,b,c){b=We(a.o,b,c);if(0!=b.type)throw new p(2,4,4022);return mf(a,b).then(function(a){this.c.filterAllPeriods([a]);var b=Infinity,c=0,d=0,h=Infinity,k;for(k in this.a){var l=this.a[k];b=Math.min(b,l.Ob);c=Math.max(c,l.Ob);d=Math.max(d,l.Ad);h=Math.min(h,l.duration)}l=null;var q=0;this.f!=hf.pa&&(l=Date.now()/1E3-d,q=3*this.g);this.b=new R(l,q);this.b.vb(this.f==hf.pa);this.b.tb(this.g);if(this.f!=hf.pa){b=3*this.g;this.b.Qc(b);this.i=this.v;this.f==hf.gc&&this.b.ac(b);for(b=0;95443.7176888889<=
c;)b+=95443.7176888889,c-=95443.7176888889;if(b)for(k in this.a)l=this.a[k],95443.7176888889>l.Ob&&(l.stream.presentationTimeOffset=-b,l.Za.offset(b))}else for(k in this.b.ha(h),this.a)l=this.a[k],l.stream.presentationTimeOffset=b,l.Za.offset(-b),Ud(l.Za,h);this.m={presentationTimeline:this.b,periods:[a],offlineSessionIds:[],minBufferTime:0}}.bind(a))}
function mf(a,b){var c=b.a,d=Oe(b.a,"EXT-X-MEDIA").filter(function(a){return"SUBTITLES"==nf(a,"TYPE")}.bind(a)).map(function(a){return of(this,a)}.bind(a));return Promise.all(d).then(function(a){var d=Oe(c,"EXT-X-STREAM-INF").map(function(a){return pf(this,a,b)}.bind(this));return Promise.all(d).then(function(b){return{startTime:0,variants:b.reduce(Pa,[]),textStreams:a}}.bind(this))}.bind(a))}
function pf(a,b,c){var d=Me(b,"CODECS","avc1.42E01E,mp4a.40.2").split(","),e=b.getAttribute("RESOLUTION"),f=null,g=null,h=Me(b,"FRAME-RATE"),k=Number(nf(b,"BANDWIDTH"));if(e){var l=e.value.split("x");f=l[0];g=l[1]}c=Oe(c.a,"EXT-X-MEDIA");var q=Me(b,"AUDIO"),v=Me(b,"VIDEO");q?c=Qe(c,"AUDIO",q):v&&(c=Qe(c,"VIDEO",v));if(l=qf("text",d)){var r=Me(b,"SUBTITLES");r&&(r=Qe(c,"SUBTITLES",r),r.length&&(a.u[r[0].id].stream.codecs=l));d.splice(d.indexOf(l),1)}c=c.map(function(a){return rf(this,a,d)}.bind(a));
var t=[],y=[];return Promise.all(c).then(function(a){q?t=a:v&&(y=a);if(t.length||y.length)t.length?nf(b,"URI")==t[0].Yb?(a="audio",c=!0):a="video":a="audio";else{var c=!1;1==d.length?(a=qf("video",d),a=e||h||a?"video":"audio"):(a="video",d=[d.join(",")])}return c?Promise.resolve():sf(this,b,d,a)}.bind(a)).then(function(a){a&&("audio"==a.stream.type?t=[a]:y=[a]);y&&tf(y);t&&tf(t);return uf(this,t,y,k,f,g,h)}.bind(a))}
function tf(a){a.forEach(function(a){var b=a.stream.codecs.split(",");b=b.filter(function(a){return"mp4a.40.34"!=a});a.stream.codecs=b.join(",")})}
function uf(a,b,c,d,e,f,g){c.forEach(function(a){if(a=a.stream)a.width=Number(e)||void 0,a.height=Number(f)||void 0,a.frameRate=Number(g)||void 0}.bind(a));b.length||(b=[null]);c.length||(c=[null]);for(var h=[],k=0;k<b.length;k++)for(var l=0;l<c.length;l++){var q=b[k]?b[k].stream:null,v=c[l]?c[l].stream:null,r=b[k]?b[k].drmInfos:null,t=c[l]?c[l].drmInfos:null;if(q&&v)if(r.length&&t.length?0<Sb(r,t).length:1)var y=Sb(r,t);else continue;else q?y=r:v&&(y=t);r=(c[k]?c[k].Yb:"")+" - "+(b[k]?b[k].Yb:"");
a.A[r]||(q=vf(a,q,v,d,y),h.push(q),a.A[r]=q)}return h}function vf(a,b,c,d,e){return{id:a.D++,language:b?b.language:"und",primary:!!b&&b.primary||!!c&&c.primary,audio:b,video:c,bandwidth:d,drmInfos:e,allowedByApplication:!0,allowedByKeySystem:!0}}function of(a,b){nf(b,"TYPE");return rf(a,b,[]).then(function(a){return a.stream})}
function rf(a,b,c){var d=nf(b,"URI");d=Re(a.l,d);if(a.a[d])return Promise.resolve(a.a[d]);var e=nf(b,"TYPE").toLowerCase();"subtitles"==e&&(e="text");var f=pc(Me(b,"LANGUAGE","und")),g=Me(b,"NAME"),h=b.getAttribute("DEFAULT"),k=b.getAttribute("AUTOSELECT"),l=Me(b,"CHANNELS");return wf(a,d,c,e,f,!!h||!!k,g,"audio"==e?xf(l):null).then(function(a){if(this.a[d])return this.a[d];this.u[b.id]=a;return this.a[d]=a}.bind(a))}function xf(a){if(!a)return null;a=a.split("/")[0];return parseInt(a,10)}
function sf(a,b,c,d){var e=nf(b,"URI");e=Re(a.l,e);return a.a[e]?Promise.resolve(a.a[e]):wf(a,e,c,d,"und",!1,null,null).then(function(a){return this.a[e]?this.a[e]:this.a[e]=a}.bind(a))}
function wf(a,b,c,d,e,f,g,h){var k=b;b=Re(a.l,b);var l,q="",v;return ef(a,b).then(function(a){l=We(this.o,a.data,b);if(1!=l.type)throw new p(2,4,4017);a=l;var e=hf,f=Pe(a.a,"EXT-X-PLAYLIST-TYPE"),g=Pe(a.a,"EXT-X-ENDLIST");g=f&&"VOD"==f.value||g;f=f&&"EVENT"==f.value&&!g;f=!g&&!f;g?lf(this,e.pa):(f?lf(this,e.gc):lf(this,e.Vc),a=zf(a.a,"EXT-X-TARGETDURATION"),a=Number(a.value),this.g=Math.max(a,this.g),this.v=Math.min(a,this.v));if(1==c.length)q=c[0];else if(a=qf(d,c),null!=a)q=a;else throw new p(2,
4,4025,c);return Af(this,d,q,l)}.bind(a)).then(function(a){v=a;a=Pe(l.a,"EXT-X-MEDIA-SEQUENCE");return kf(this,l,a?Number(a.value):0,v,q)}.bind(a)).then(function(a){var b=a[0].startTime,c=a[a.length-1].endTime,w=c-b;a=new Q(a);var r=null;"text"!=d&&(r=Bf(l));var Wc=void 0;"text"==d&&(Wc="subtitle");var Xc=[];l.segments.forEach(function(a){a=Oe(a.a,"EXT-X-KEY");Xc.push.apply(Xc,a)});var Yc=!1,Zc=[],yf=null;Xc.forEach(function(a){if("NONE"!=nf(a,"METHOD")){Yc=!0;var b=nf(a,"KEYFORMAT");if(a=(b=Cf[b])?
b(a):null)a.keyIds.length&&(yf=a.keyIds[0]),Zc.push(a)}});if(Yc&&!Zc.length)throw new p(2,4,4026);r={id:this.D++,createSegmentIndex:Promise.resolve.bind(Promise),findSegmentPosition:a.find.bind(a),getSegmentReference:a.get.bind(a),initSegmentReference:r,presentationTimeOffset:0,mimeType:v,codecs:q,kind:Wc,encrypted:Yc,keyId:yf,language:e,label:g||null,type:d,primary:f,trickModeVideo:null,containsEmsgBoxes:!1,frameRate:void 0,width:void 0,height:void 0,bandwidth:void 0,roles:[],channelsCount:h};this.K[r.id]=
a;return{stream:r,Za:a,drmInfos:Zc,Yb:k,Ob:b,Ad:c,duration:w}}.bind(a))}function Bf(a){var b=Oe(a.a,"EXT-X-MAP");if(!b.length)return null;if(1<b.length)throw new p(2,4,4020);b=b[0];var c=nf(b,"URI"),d=Re(a.uri,c);a=0;c=null;if(b=Me(b,"BYTERANGE"))a=b.split("@"),b=Number(a[0]),a=Number(a[1]),c=a+b-1;return new L(function(){return[d]},a,c)}
function Df(a,b,c,d,e){var f=c.a,g=Re(a.uri,c.uri);a=zf(f,"EXTINF").value.split(",");a=e+Number(a[0]);c=0;var h=null;if(f=Pe(f,"EXT-X-BYTERANGE"))c=f.value.split("@"),f=Number(c[0]),c=c[1]?Number(c[1]):b.F+1,h=c+f-1;return new M(d,e,a,function(){return[g]},c,h)}
function kf(a,b,c,d,e){var f=b.segments,g=[],h=Re(b.uri,f[0].uri),k=Df(b,null,f[0],c,0),l=Bf(b);return Ef(a,b.uri,l,k,d,e).then(function(a){h.split("/").pop();for(var d=0;d<f.length;++d){var e=g[g.length-1];e=Df(b,e,f[d],c+d,0==d?a:e.endTime);g.push(e)}return g}.bind(a))}
function Ff(a,b){var c=a.c.networkingEngine,d=Va(b.a(),a.h.retryParameters),e={},f=b.O;e.Range="bytes="+f+"-"+(f+2048-1);var g={};if(0!=f||null!=b.F)f="bytes="+f+"-",null!=b.F&&(f+=b.F),g.Range=f;d.headers=e;return c.request(1,d)["catch"](function(){qa("Unable to fetch a partial HLS segment! Falling back to a full segment request, which is expensive!  Your server should support Range requests and CORS preflights.",d.uris[0]);d.headers=g;return c.request(1,d)})}
function Ef(a,b,c,d,e,f){if(a.m&&(b=a.a[b].Za.get(d.position)))return Promise.resolve(b.startTime);d=[Ff(a,d)];if("video/mp4"==e||"audio/mp4"==e)c?d.push(Ff(a,c)):d.push(d[0]);return Promise.all(d).then(function(a){if("video/mp4"==e||"audio/mp4"==e)return Gf(a[0].data,a[1].data);if("audio/mpeg"==e)return 0;if("video/mp2t"==e)return Hf(a[0].data);if("application/mp4"==e||0==e.indexOf("text/")){a=a[0].data;var b=lb(e,f);if(D[b]){var c=new $b(null);c.c=new D[b];a=c.Ib(a)}else a=0;return a}throw new p(2,
4,4030);}.bind(a))}function Gf(a,b){var c=0;(new O).B("moov",P).B("trak",P).B("mdia",P).Z("mdhd",function(a){a.s.G(0==a.version?8:16);c=a.s.C();a.ma.stop()}).parse(b,!0);if(!c)throw new p(2,4,4030);var d=0,e=!1;(new O).B("moof",P).B("traf",P).Z("tfdt",function(a){d=(0==a.version?a.s.C():a.s.Ma())/c;e=!0;a.ma.stop()}).parse(a,!0);if(!e)throw new p(2,4,4030);return d}
function Hf(a){function b(){throw new p(2,4,4030);}a=new N(new DataView(a),0);for(var c=0;;){c=a.U();var d=a.ca();71!=d&&b();a.Xa()&16384||b();d=(a.ca()&48)>>4;0!=d&&2!=d||b();3==d&&(d=a.ca(),a.G(d));if(1!=a.C()>>8)a.seek(c+188),d=a.ca(),71!=d&&(a.seek(c+192),d=a.ca()),71!=d&&(a.seek(c+204),d=a.ca()),71!=d&&b(),a.Lc(1);else return a.G(3),c=a.ca()>>6,0!=c&&1!=c||b(),0==a.ca()&&b(),c=a.ca(),d=a.Xa(),a=a.Xa(),(1073741824*((c&14)>>1)+((d&65534)<<14|(a&65534)>>1))/9E4}}
function qf(a,b){for(var c=If[a],d=0;d<c.length;d++)for(var e=0;e<b.length;e++)if(c[d].test(b[e].trim()))return b[e].trim();return"text"==a?"":null}
function Af(a,b,c,d){d=Re(d.uri,d.segments[0].uri);var e=(new ta(d)).aa.split(".").pop(),f=Jf[b][e];if(f)return Promise.resolve(f);if("text"==b)return c&&"vtt"!=c?Promise.resolve("application/mp4"):Promise.resolve("text/vtt");b=Va([d],a.h.retryParameters);b.method="HEAD";return a.c.networkingEngine.request(1,b).then(function(a){a=a.headers["content-type"];if(!a)throw new p(2,4,4021,e);return a.split(";")[0]})}function nf(a,b){var c=a.getAttribute(b);if(!c)throw new p(2,4,4023,b);return c.value}
function zf(a,b){var c=Pe(a,b);if(!c)throw new p(2,4,4024,b);return c}function ef(a,b){return a.c.networkingEngine.request(0,Va([b],a.h.retryParameters),function(){return!this.c}.bind(a))}
var If={audio:[/^vorbis$/,/^opus$/,/^flac$/,/^mp4a/,/^[ae]c-3$/],video:[/^avc/,/^hev/,/^hvc/,/^vp0?[89]/,/^av1$/],text:[/^vtt$/,/^wvtt/,/^stpp/]},Jf={audio:{mp4:"audio/mp4",m4s:"audio/mp4",m4i:"audio/mp4",m4a:"audio/mp4",ts:"video/mp2t"},video:{mp4:"video/mp4",m4s:"video/mp4",m4i:"video/mp4",m4v:"video/mp4",ts:"video/mp2t"},text:{mp4:"application/mp4",m4s:"application/mp4",m4i:"application/mp4",vtt:"text/vtt",ttml:"application/ttml+xml"}};
cf.prototype.J=function(){this.c&&(this.j=null,this.update().then(function(){gf(this,this.i)}.bind(this))["catch"](function(a){this.c&&(a.severity=1,this.c.onError(a),gf(this,0))}.bind(this)))};function gf(a,b){null!=a.i&&null!=b&&(a.j=window.setTimeout(a.J.bind(a),1E3*b))}function lf(a,b){a.f=b;a.b&&a.b.vb(a.f==hf.pa);a.f==hf.pa&&null!=a.j&&(window.clearTimeout(a.j),a.j=null,a.i=null)}
var Cf={"urn:uuid:edef8ba9-79d6-4ace-a3c8-27dcd51d21ed":function(a){var b=nf(a,"METHOD");if("SAMPLE-AES-CENC"!=b&&"SAMPLE-AES-CTR"!=b)return null;b=nf(a,"URI");b=bf.parse(b);b=new Uint8Array(b.data);b=fb("com.widevine.alpha",[{initDataType:"cenc",initData:b}]);if(a=Me(a,"KEYID"))b.keyIds=[a.substr(2).toLowerCase()];return b}},df="VOD",hf={pa:df,Vc:"EVENT",gc:"LIVE"};re.m3u8=cf;qe["application/x-mpegurl"]=cf;qe["application/vnd.apple.mpegurl"]=cf;function Kf(a,b,c,d,e,f){this.a=a;this.c=b;this.l=c;this.m=null==d?null:Lf(this,d);this.X=e;this.K=f;this.b=new bb;this.j=!1;this.i=1;this.h=this.f=null;this.v=!1;this.g=new rb(this.Dd.bind(this));this.J=a.readyState;this.o=!1;this.D=this.Y=-1;this.u=this.A=!1;0<a.readyState?this.yc():(eb(this.b,a,"loadedmetadata",this.yc.bind(this)),z(this.b,a,"timeupdate",function(){sb(this.g,.1)}.bind(this)));b=this.Ac.bind(this);z(this.b,a,"ratechange",this.Qd.bind(this));z(this.b,a,"waiting",b);this.h=new rb(b);
tb(this.h,.25)}m=Kf.prototype;m.destroy=function(){var a=this.b.destroy();this.b=null;null!=this.f&&(this.f.cancel(),this.f=null);null!=this.h&&(this.h.cancel(),this.h=null);null!=this.g&&(this.g.cancel(),this.g=null);this.K=this.X=this.l=this.c=this.a=null;return a};function Mf(a,b){0<a.a.readyState?a.a.currentTime=Nf(a,b):a.m=b}function Lf(a,b){var c=a.c.presentationTimeline.T();return b>=c?c-a.l.durationBackoff:b}
function Of(a){return 0<a.a.readyState?a.a.paused?a.a.currentTime:Nf(a,a.a.currentTime):Pf(a)}function Pf(a){if(null!=a.m)return Nf(a,a.m);var b=a.c.presentationTimeline;b=Infinity>b.T()?b.ka():b.rb();a.m=Lf(a,b);return b}m.Gb=function(){return this.i};function Qf(a,b){null!=a.f&&(a.f.cancel(),a.f=null);a.i=b;a.a.playbackRate=a.j||0>b?0:b;!a.j&&0>b&&(a.f=new rb(function(){this.a.currentTime+=b/4}.bind(a)),tb(a.f,.25))}m.Sb=function(){this.u=!0;this.Ac()};
m.Qd=function(){var a=this.j||0>this.i?0:this.i;this.a.playbackRate&&this.a.playbackRate!=a&&Qf(this,this.a.playbackRate)};m.yc=function(){var a=Pf(this);this.b.ia(this.a,"timeupdate");this.g.cancel();.001>Math.abs(this.a.currentTime-a)?(z(this.b,this.a,"seeking",this.Bc.bind(this)),z(this.b,this.a,"playing",this.zc.bind(this))):(eb(this.b,this.a,"seeking",this.Sd.bind(this)),this.a.currentTime=a)};m.Sd=function(){z(this.b,this.a,"seeking",this.Bc.bind(this));z(this.b,this.a,"playing",this.zc.bind(this))};
m.Ac=function(){if(0!=this.a.readyState){if(this.a.seeking){if(!this.v)return}else this.v=!1;if(!this.a.paused){this.a.readyState!=this.J&&(this.o=!1,this.J=this.a.readyState);var a=this.l.smallGapLimit,b=this.a.currentTime,c=this.a.buffered,d=this.c.presentationTimeline.ka();if(b<d)c=Rf(this,b),Sf(this,b,c);else{a:{if(c&&c.length&&!(1==c.length&&1E-6>c.end(0)-c.start(0))){d=.1;/(Edge\/|Trident\/|Tizen)/.test(navigator.userAgent)&&(d=.5);for(var e=0;e<c.length;e++)if(c.start(e)>b&&(0==e||c.end(e-
1)-b<=d)){d=e;break a}}d=null}if(null==d){if(3>this.a.readyState&&0<this.a.playbackRate)if(this.D!=b)this.D=b,this.Y=Date.now(),this.A=!1;else if(!this.A&&this.Y<Date.now()-1E3)for(a=0;a<c.length;a++)if(b>=c.start(a)&&b<c.end(a)-.5){this.a.currentTime+=.1;this.D=this.a.currentTime;this.A=!0;break}}else if(0!=d||this.u){e=c.start(d);var f=this.c.presentationTimeline.rb();if(!(e>=f)){f=e-b;a=f<=a;var g=!1;a||this.o||(this.o=!0,f=new A("largegap",{currentTime:b,gapSize:f}),f.cancelable=!0,this.K(f),
this.l.jumpLargeGaps&&!f.defaultPrevented&&(g=!0));if(a||g)0!=d&&c.end(d-1),Sf(this,b,e)}}}}}};m.Dd=function(){this.m=Rf(this,this.a.currentTime)};m.Bc=function(){this.v=!0;this.u=!1;var a=this.a.currentTime,b=Rf(this,a);.001<Math.abs(b-a)?Sf(this,a,b):(this.o=!1,this.X())};m.zc=function(){var a=this.a.currentTime,b=Rf(this,a);.001<Math.abs(b-a)&&Sf(this,a,b)};
function Rf(a,b){var c=Ub.bind(null,a.a.buffered),d=1*Math.max(a.c.minBufferTime||0,a.l.rebufferingGoal),e=a.c.presentationTimeline,f=e.Fa(0),g=e.wa(),h=e.T(),k=e.Fa(d),l=e.Fa(5);d=e.Fa(d+5);return b>=h?Lf(a,b):b>g?g:b<f?c(l)?l:d:b>=k||c(b)?b:d}function Sf(a,b,c){a.a.currentTime=c;var d=0,e=function(){!this.a||10<=d++||this.a.currentTime!=b||(this.a.currentTime=c,setTimeout(e,100))}.bind(a);setTimeout(e,100)}
function Nf(a,b){var c=a.c.presentationTimeline.ka();if(b<c)return c;c=a.c.presentationTimeline.wa();return b>c?c:b};function Tf(a,b,c,d,e,f,g){this.a=a;this.v=b;this.g=c;this.u=d;this.l=e;this.h=f;this.A=g;this.c=[];this.j=new bb;this.b=!1;this.i=-1;this.f=null;Uf(this)}Tf.prototype.destroy=function(){var a=this.j?this.j.destroy():Promise.resolve();this.j=null;Vf(this);this.A=this.h=this.l=this.u=this.g=this.v=this.a=null;this.c=[];return a};
Tf.prototype.o=function(a){if(!this.c.some(function(b){return b.info.schemeIdUri==a.schemeIdUri&&b.info.startTime==a.startTime&&b.info.endTime==a.endTime})){var b={info:a,status:1};this.c.push(b);var c=new A("timelineregionadded",{detail:Wf(a)});this.h(c);this.m(!0,b)}};function Wf(a){var b=Na(a);b.eventElement=a.eventElement;return b}
Tf.prototype.m=function(a,b){var c=b.info.startTime>this.a.currentTime?1:b.info.endTime<this.a.currentTime?3:2,d=2==b.status,e=2==c;if(c!=b.status){if(!a||d||e)d||this.h(new A("timelineregionenter",{detail:Wf(b.info)})),e||this.h(new A("timelineregionexit",{detail:Wf(b.info)}));b.status=c}};function Uf(a){Vf(a);a.f=window.setTimeout(a.D.bind(a),250)}function Vf(a){a.f&&(window.clearTimeout(a.f),a.f=null)}
Tf.prototype.D=function(){this.f=null;Uf(this);var a=Kc(this.g,this.a.currentTime);a!=this.i&&(-1!=this.i&&this.A(),this.i=a);a=Vb(this.a.buffered,this.a.currentTime);var b=Tb(this.a.buffered),c=this.g.presentationTimeline,d=c.wa();b=c.P()&&b>=d;c="ended"==this.v.readyState;b=b||this.a.ended||c;this.b?(c=1*Math.max(this.g.minBufferTime||0,this.u.rebufferingGoal),(b||a>=c)&&0!=this.b&&(this.b=!1,this.l(!1))):!b&&.5>a&&1!=this.b&&(this.b=!0,this.l(!0));this.c.forEach(this.m.bind(this,!1))};function Xf(a,b){this.a=b;this.b=a;this.h=null;this.i=1;this.m=Promise.resolve();this.g=[];this.j={};this.c={};this.o=!1;this.A=null;this.v=this.f=this.l=!1;this.u=0}m=Xf.prototype;m.destroy=function(){for(var a in this.c)Yf(this.c[a]);this.h=this.c=this.j=this.g=this.m=this.b=this.a=null;this.f=!0;return Promise.resolve()};
m.configure=function(a){this.h=a;this.A=new Ha({maxAttempts:Math.max(a.retryParameters.maxAttempts,2),baseDelay:a.retryParameters.baseDelay,backoffFactor:a.retryParameters.backoffFactor,fuzzFactor:a.retryParameters.fuzzFactor,timeout:0},!0)};m.init=function(){var a=Of(this.a.Ja);a=this.a.tc(this.b.periods[Kc(this.b,a)]);return a.variant||a.text?Zf(this,a).then(function(){this.a&&this.a.Hd&&this.a.Hd()}.bind(this)):Promise.reject(new p(2,5,5005))};
function S(a){var b=Of(a.a.Ja);return a.b.periods[Kc(a.b,b)]}function $f(a){var b=a.c.video||a.c.audio;return b?a.b.periods[b.ya]:null}function ag(a){return bg(a,"audio")}function cg(a){return bg(a,"video")}function bg(a,b){var c=a.c[b];return c?c.qa||c.stream:null}function dg(a,b){a.u++;a.v=!1;var c=a.u;a.a.L.init({text:b});return eg(a,[b]).then(function(){if(this.u==c&&!this.c.text&&!this.v){var a=Of(this.a.Ja);this.c.text=fg(b,Kc(this.b,a));gg(this,this.c.text,0)}}.bind(a))}
function hg(a,b){var c=a.c.video;if(c){var d=c.stream;if(d)if(b){var e=d.trickModeVideo;if(e){var f=c.qa;f||(ig(a,e,!1),c.qa=d)}}else if(f=c.qa)c.qa=null,ig(a,f,!0)}}function jg(a,b,c){b.video&&ig(a,b.video,c);b.audio&&ig(a,b.audio,c)}
function ig(a,b,c){var d=a.c[b.type];if(!d&&"text"==b.type&&a.h.ignoreTextStreamFailures)dg(a,b);else if(d){var e=Lc(a.b,b);c&&e!=d.ya?kg(a):(d.qa&&(b.trickModeVideo?(d.qa=b,b=b.trickModeVideo):d.qa=null),(e=a.g[e])&&e.Na&&(e=a.j[b.id])&&e.Na&&d.stream!=b&&("text"==b.type&&dc(a.a.L,lb(b.mimeType,b.codecs)),d.stream=b,d.sb=!0,c&&(d.ua?d.xb=!0:d.za?(d.ta=!0,d.xb=!0):(Yf(d),lg(a,d,!0)))))}}
function mg(a){var b=Of(a.a.Ja);Object.keys(a.c).every(function(a){var c=this.a.L;"text"==a?(a=c.a,a=b>=a.a&&b<a.b):(a=fc(c,a),a=Ub(a,b));return a}.bind(a))||kg(a)}function kg(a){for(var b in a.c){var c=a.c[b];c.ua||c.ta||(c.za?c.ta=!0:null==ec(a.a.L,b)?null==c.sa&&gg(a,c,0):(Yf(c),lg(a,c,!1)))}}
function Zf(a,b,c){var d=Of(a.a.Ja),e=Kc(a.b,d),f={};d=[];b.variant&&b.variant.audio&&(f.audio=b.variant.audio,d.push(b.variant.audio));b.variant&&b.variant.video&&(f.video=b.variant.video,d.push(b.variant.video));b.text&&(f.text=b.text,d.push(b.text));a.a.L.init(f);ng(a);return eg(a,d).then(function(){if(!this.f)for(var a in f){var b=f[a];this.c[a]||(this.c[a]=fg(b,e,c),gg(this,this.c[a],0))}}.bind(a))}
function fg(a,b,c){return{stream:a,type:a.type,Ga:null,la:null,qa:null,sb:!0,ya:b,endOfStream:!1,za:!1,sa:null,ta:!1,xb:!1,ua:!1,Xb:!1,Ta:!1,Jc:c||0}}
function og(a,b){var c=a.g[b];if(c)return c.N;c={N:new u,Na:!1};a.g[b]=c;var d=a.b.periods[b].variants.map(function(a){var b=[];a.audio&&b.push(a.audio);a.video&&b.push(a.video);a.video&&a.video.trickModeVideo&&b.push(a.video.trickModeVideo);return b}).reduce(Pa,[]).filter(Sa);d.push.apply(d,a.b.periods[b].textStreams);a.m=a.m.then(function(){if(!this.f)return eg(this,d)}.bind(a)).then(function(){this.f||(this.g[b].N.resolve(),this.g[b].Na=!0)}.bind(a))["catch"](function(a){this.f||(this.g[b].N.reject(),
delete this.g[b],this.a.onError(a))}.bind(a));return c.N}function eg(a,b){b.map(function(a){return a.id}).filter(Sa);for(var c=[],d=0;d<b.length;++d){var e=b[d],f=a.j[e.id];f?c.push(f.N):(a.j[e.id]={N:new u,Na:!1},c.push(e.createSegmentIndex()))}return Promise.all(c).then(function(){if(!this.f)for(var a=0;a<b.length;++a){var c=this.j[b[a].id];c.Na||(c.N.resolve(),c.Na=!0)}}.bind(a))["catch"](function(a){if(!this.f)return this.j[e.id].N.reject(),delete this.j[e.id],Promise.reject(a)}.bind(a))}
function ng(a){var b=a.b.presentationTimeline.T();Infinity>b?a.a.L.ha(b):a.a.L.ha(Math.pow(2,32))}m.Ne=function(a){if(!this.f&&!a.za&&null!=a.sa&&!a.ua)if(a.sa=null,a.ta)lg(this,a,a.xb);else{try{var b=pg(this,a);null!=b&&(gg(this,a,b),a.Ta=!1)}catch(c){qg(this,c);return}b=ib(this.c);rg(this,a);b.every(function(a){return a.endOfStream})&&this.a.L.endOfStream().then(function(){this.b.presentationTimeline.ha(this.a.L.T())}.bind(this))}};
function pg(a,b){var c=Of(a.a.Ja),d=b.Ga&&b.la?a.b.periods[Lc(a.b,b.Ga)].startTime+b.la.endTime:Math.max(c,b.Jc),e=Lc(a.b,b.stream),f=Kc(a.b,d);var g=a.a.L;var h=b.type;"text"==h?(g=g.a,g=null==g.b||g.b<c?0:g.b-Math.max(c,g.a)):(g=fc(g,h),g=Vb(g,c));h=Math.max(a.i*Math.max(a.b.minBufferTime||0,a.h.rebufferingGoal),a.i*a.h.bufferingGoal);if(d>=a.b.presentationTimeline.T())return b.endOfStream=!0,null;b.endOfStream=!1;b.ya=f;if(f!=e)return null;if(g>=h)return.5;d=a.a.L;f=b.type;d="text"==f?d.a.b:Tb(fc(d,
f));b.la&&b.stream==b.Ga?(f=b.la.position+1,d=sg(a,b,e,f)):(f=b.la?b.stream.findSegmentPosition(Math.max(0,a.b.periods[Lc(a.b,b.Ga)].startTime+b.la.endTime-a.b.periods[e].startTime)):b.stream.findSegmentPosition(Math.max(0,(d||c)-a.b.periods[e].startTime)),null==f?d=null:(g=null,null==d&&(g=sg(a,b,e,Math.max(0,f-1))),d=g||sg(a,b,e,f)));if(!d)return 1;b.Jc=0;tg(a,b,c,e,d);return null}
function sg(a,b,c,d){c=a.b.periods[c];b=b.stream.getSegmentReference(d);if(!b)return null;d=a.b.presentationTimeline;a=d.ka();d=d.wa();return c.startTime+b.endTime<a||c.startTime+b.startTime>d?null:b}
function tg(a,b,c,d,e){var f=a.b.periods[d],g=b.stream,h=a.b.presentationTimeline.T(),k=a.b.periods[d+1];d=ug(a,b,d,Math.max(0,f.startTime-1E-5),k?k.startTime:h);b.za=!0;b.sb=!1;h=vg(a,e);Promise.all([d,h]).then(function(a){if(!this.f&&!this.l)return wg(this,b,c,f,g,e,a[1])}.bind(a)).then(function(){this.f||this.l||(b.za=!1,b.Xb=!1,b.ta||this.a.Sb(),gg(this,b,0),xg(this,g))}.bind(a))["catch"](function(a){this.f||this.l||(b.za=!1,"text"==b.type&&this.h.ignoreTextStreamFailures?delete this.c.text:3017==
a.code?yg(this,b,a):(b.Ta=!0,a.severity=2,qg(this,a)))}.bind(a))}function yg(a,b,c){if(!ib(a.c).some(function(a){return a!=b&&a.Xb})){var d=Math.round(100*a.i);if(20<d)a.i-=.2;else if(4<d)a.i-=.04;else{b.Ta=!0;a.l=!0;a.a.onError(c);return}b.Xb=!0}gg(a,b,4)}
function ug(a,b,c,d,e){if(!b.sb)return Promise.resolve();c=jc(a.a.L,b.type,a.b.periods[c].startTime-b.stream.presentationTimeOffset,d,e);if(!b.stream.initSegmentReference)return c;a=vg(a,b.stream.initSegmentReference).then(function(a){if(!this.f)return gc(this.a.L,b.type,a,null,null)}.bind(a))["catch"](function(a){b.sb=!0;return Promise.reject(a)});return Promise.all([c,a])}
function wg(a,b,c,d,e,f,g){e.containsEmsgBoxes&&(new O).Z("emsg",a.de.bind(a,d,f)).parse(g);return zg(a,b,c).then(function(){if(!this.f)return gc(this.a.L,b.type,g,f.startTime+d.startTime,f.endTime+d.startTime)}.bind(a)).then(function(){if(!this.f)return b.Ga=e,b.la=f,Promise.resolve()}.bind(a))}
m.de=function(a,b,c){var d=c.s.Vb(),e=c.s.Vb(),f=c.s.C(),g=c.s.C(),h=c.s.C(),k=c.s.C(),l=c.s.La(c.s.H.byteLength-c.s.U());a=a.startTime+b.startTime+g/f;if("urn:mpeg:dash:event:2012"==d)this.a.Jd();else this.a.onEvent(new A("emsg",{detail:{startTime:a,endTime:a+h/f,schemeIdUri:d,value:e,timescale:f,presentationTimeDelta:g,eventDuration:h,id:k,messageData:l}}));c.ma.stop()};
function zg(a,b,c){var d=Math.max(a.h.bufferBehind,a.b.presentationTimeline.b),e=ec(a.a.L,b.type);if(null==e)return Promise.resolve();c=c-e-d;return 0>=c?Promise.resolve():a.a.L.remove(b.type,e,e+c).then(function(){}.bind(a))}function xg(a,b){if(!a.o&&(a.o=ib(a.c).every(function(a){return"text"==a.type?!0:!a.ta&&!a.ua&&a.la}),a.o)){var c=Lc(a.b,b);a.g[c]||og(a,c).then(function(){this.a.sc()}.bind(a))["catch"](Qa);for(c=0;c<a.b.periods.length;++c)og(a,c)["catch"](Qa);a.a.Vd&&a.a.Vd()}}
function rg(a,b){if(b.ya!=Lc(a.b,b.stream)){var c=b.ya,d=ib(a.c);d.every(function(a){return a.ya==c})&&d.every(Ag)&&og(a,c).then(function(){if(!this.f&&d.every(function(a){var b=Lc(this.b,a.stream);return Ag(a)&&a.ya==c&&b!=c}.bind(this))){var a=this.b.periods[c],b=this.a.tc(a),g={};b.variant&&b.variant.video&&(g.video=b.variant.video);b.variant&&b.variant.audio&&(g.audio=b.variant.audio);b.text&&(g.text=b.text);for(var h in this.c)if(!g[h]&&"text"!=h){this.a.onError(new p(2,5,5005));return}for(h in g)if(!this.c[h])if("text"==
h)Zf(this,{text:g.text},a.startTime),delete g[h];else{this.a.onError(new p(2,5,5005));return}for(h in this.c)(a=g[h])?(ig(this,a,!1),gg(this,this.c[h],0)):delete this.c[h];this.a.sc()}}.bind(a))["catch"](Qa)}}function Ag(a){return!a.za&&null==a.sa&&!a.ta&&!a.ua}function vg(a,b){var c=Va(b.a(),a.h.retryParameters);if(0!=b.O||null!=b.F){var d="bytes="+b.O+"-";null!=b.F&&(d+=b.F);c.headers.Range=d}return a.a.Va.request(1,c).then(function(a){return a.data})}
function lg(a,b,c){b.ta=!1;b.xb=!1;b.ua=!0;ic(a.a.L,b.type).then(function(){if(!this.f&&c){var a=this.a.L,e=b.type;return"text"==e?Promise.resolve():hc(a,e,a.hd.bind(a,e))}}.bind(a)).then(function(){this.f||(b.Ga=null,b.la=null,b.ua=!1,b.endOfStream=!1,gg(this,b,0))}.bind(a))}function gg(a,b,c){b.sa=window.setTimeout(a.Ne.bind(a,b),1E3*c)}function Yf(a){null!=a.sa&&(window.clearTimeout(a.sa),a.sa=null)}
function qg(a,b){Ja(a.A).then(function(){this.a.onError(b);b.handled||this.h.failureCallback(b)}.bind(a))};function Bg(a,b){return new Promise(function(c,d){var e=new Bg.c;e.open(b.method,a,!0);e.responseType="arraybuffer";e.timeout=b.retryParameters.timeout;e.withCredentials=b.allowCrossSiteCredentials;e.onload=function(b){b=b.target;var e=b.getAllResponseHeaders().trim().split("\r\n").reduce(function(a,b){var c=b.split(": ");a[c[0].toLowerCase()]=c.slice(1).join(": ");return a},{});if(200<=b.status&&299>=b.status&&202!=b.status)b.responseURL&&(a=b.responseURL),c({uri:a,data:b.response,headers:e,fromCache:!!e["x-shaka-from-cache"]});
else{var f=null;try{f=pb(b.response)}catch(l){}d(new p(401==b.status||403==b.status?2:1,1,1001,a,b.status,f,e))}};e.onerror=function(){d(new p(1,1,1002,a))};e.ontimeout=function(){d(new p(1,1,1003,a))};for(var f in b.headers)e.setRequestHeader(f,b.headers[f]);e.send(b.body)})}n("shaka.net.HttpPlugin",Bg);Bg.c=window.XMLHttpRequest;Ua("http",Bg,1);Ua("https",Bg,1);function Cg(){this.b=null;this.a=[]}function Dg(){if(!window.indexedDB)return Promise.resolve();var a=window.indexedDB.deleteDatabase("shaka_offline_db"),b=new u;a.onsuccess=function(){b.resolve()};a.onerror=Eg.bind(null,a,b);return b}Cg.prototype.init=function(a){return Fg(a).then(function(a){this.b=a}.bind(this))};
Cg.prototype.destroy=function(){return Promise.all(this.a.map(function(a){try{a.transaction.abort()}catch(b){}return a.N["catch"](Qa)})).then(function(){this.b&&(this.b.close(),this.b=null)}.bind(this))};Cg.prototype.Ea=function(a){return Gg(this,"manifest-v3",a)};function Hg(a,b){return Ig(a,b)}function Gg(a,b,c){var d;return Jg(a,b,"readonly",function(a){d=a.get(c)}).then(function(){return d.result})}
function Ig(a,b){return Jg(a,"manifest-v3","readonly",function(a){a.openCursor().onsuccess=function(a){if(a=a.target.result)b(a.key,a.value),a["continue"]()}})}function Kg(a,b,c){return Jg(a,"manifest-v3","readwrite",function(a){a.put(c,b)})}function Lg(a,b,c){var d;return Jg(a,b,"readwrite",function(a){a.add(c).onsuccess=function(a){d=a.target.result}}).then(function(){return d})}
function Mg(a,b,c,d){return Jg(a,b,"readwrite",function(a){c.forEach(function(b){a["delete"](b).onsuccess=function(){d&&d(b)}})})}function Jg(a,b,c,d){var e={transaction:a.b.transaction([b],c),N:new u};e.transaction.oncomplete=function(){a.a.splice(a.a.indexOf(e),1);e.N.resolve()};e.transaction.onabort=function(b){a.a.splice(a.a.indexOf(e),1);Eg(e.transaction,e.N,b)};e.transaction.onerror=Ng();b=e.transaction.objectStore(b);d(b);a.a.push(e);return e.N}
function Og(a,b,c){function d(){var b=f.pop();b?e(b,d):(a.reject(new p(1,9,9010,g)),c.abort())}function e(a,b){c.objectStore(a).openCursor().onsuccess=function(a){(a=a.target.result)?(g.push(a.value.originalManifestUri),a["continue"]()):b()}}var f=["manifest","manifest-v2"].filter(function(a){return b.objectStoreNames.contains(a)}),g=[];d()}function Eg(a,b,c){b.reject(a.error?new p(2,9,9001,a.error):new p(2,9,9002));c.preventDefault()}
function Fg(a){function b(){return new Promise(function(a){setTimeout(a,1E3)})}var c=a||0,d=0<c;a=Pg(d);for(var e=0;e<c;e++)a=a.then(function(a){return a?a:b().then(function(){return Pg(d)})});return a.then(function(a){return a?a:Promise.reject(new p(2,9,9001,"Failed to issue upgrade after "+c+" retries"))})}
function Pg(a){var b=new u,c=!1,d=window.indexedDB.open("shaka_offline_db",3);d.onupgradeneeded=function(a){var d=a.target.transaction,e=d.db,h={autoIncrement:!0};0==a.oldVersion?(e.createObjectStore("manifest-v3",h),e.createObjectStore("segment-v3",h)):Og(b,e,d);c=!0};d.onsuccess=function(d){d=d.target.result;a&&!c?(d.close(),b.resolve(null)):b.resolve(d)};d.onerror=Ng(function(){b.reject(new p(2,9,9001,"Failed to open IndexedDB Connection",d.error.message))});return b}
function Ng(a){return function(b){b.preventDefault();a&&a(b)}};function Qg(a,b,c){this.b={};this.i=[];this.h=a;this.j=b;this.m=c;this.g=this.a=null;this.f=this.c=0;this.l=[]}function Rg(a,b){a.l.push(b)}Qg.prototype.destroy=function(){var a=this.h,b=this.i,c=this.g||Promise.resolve();b.length&&(c=c.then(function(){return Mg(a,"segment-v3",b,null)}));this.b={};this.i=[];this.g=this.a=this.m=this.j=this.h=null;return c};function Sg(a,b,c,d,e){a.b[b]=a.b[b]||[];a.b[b].push({uris:c.a(),O:c.O,F:c.F,ic:d,Wd:e})}
function Tg(a,b){a.c=0;a.f=0;ib(a.b).forEach(function(a){a.forEach(this.o.bind(this))}.bind(a));a.a=b;var c=ib(a.b).map(function(a){var b=0,c=function(){if(!this.a)return Promise.reject(new p(2,9,9002));if(b>=a.length)return Promise.resolve();var d=a[b++];return Ug(this,d).then(c)}.bind(this);return c()}.bind(a));a.b={};a.g=Promise.all(c).then(function(){return Lg(this.h,"manifest-v3",b)}.bind(a)).then(function(a){this.i=[];return a}.bind(a));return a.g}
function Ug(a,b){var c=Va(b.uris,a.m);if(0!=b.O||null!=b.F)c.headers.Range="bytes="+b.O+"-"+(null==b.F?"":b.F);var d;return a.j.request(1,c).then(function(a){if(!this.a)return Promise.reject(new p(2,9,9002));d=a.data.byteLength;return Lg(this.h,"segment-v3",{data:a.data})}.bind(a)).then(function(a){if(!this.a)return Promise.reject(new p(2,9,9002));this.a.size+=d;this.f+=null==b.F?b.ic:b.F-b.O+1;this.i.push(a);b.Wd(a);Vg(this)}.bind(a))}Qg.prototype.o=function(a){this.c+=null==a.F?a.ic:a.F-a.O+1};
function Vg(a){var b=0==a.c?0:a.f/a.c,c=a.a.size;a.l.forEach(function(a){a(b,c)})};function Wg(a){return(a=/^offline:manifest\/([0-9]+)$/.exec(a))?Number(a[1]):null};function Xg(a,b,c){var d=void 0==b.expiration?Infinity:b.expiration,e=b.presentationTimeline.T();b=xc(b.periods[0]);return{offlineUri:null,originalManifestUri:a,duration:e,size:0,expiration:d,tracks:b,appMetadata:c}}function Yg(a,b){var c=Zg(b.periods[0],[],new R(null,0)),d=b.appMetadata||{};c=xc(c);return{offlineUri:a,originalManifestUri:b.originalManifestUri,duration:b.duration,size:b.size,expiration:b.expiration,tracks:c,appMetadata:d}}
function Zg(a,b,c){var d=a.streams.filter($g),e=a.streams.filter(ah);b=bh(d,e,b);d=a.streams.filter(ch).map(dh);a.streams.forEach(function(b){b=b.segments.map(function(a,b){return eh(b,a)});c.Wa(a.startTime,b)});return{startTime:a.startTime,variants:b,textStreams:d}}function eh(a,b){var c="offline:segment/"+b.dataKey;return new M(a,b.startTime,b.endTime,function(){return[c]},0,null)}
function bh(a,b,c){var d={},e=[];e.push.apply(e,a);e.push.apply(e,b);e.forEach(function(a){a.variantIds.forEach(function(a){d[a]||(d[a]={id:a,language:"",primary:!1,audio:null,video:null,bandwidth:0,drmInfos:c,allowedByApplication:!0,allowedByKeySystem:!0})})});a.forEach(function(a){var b=dh(a);a.variantIds.forEach(function(a){a=d[a];a.language=b.language;a.primary=a.primary||b.primary;a.audio=b})});b.forEach(function(a){var b=dh(a);a.variantIds.forEach(function(a){a=d[a];a.primary=a.primary||b.primary;
a.video=b})});return ib(d)}
function dh(a){var b=a.segments.map(function(a,b){return eh(b,a)});b=new Q(b);b={id:a.id,createSegmentIndex:Promise.resolve.bind(Promise),findSegmentPosition:b.find.bind(b),getSegmentReference:b.get.bind(b),initSegmentReference:null,presentationTimeOffset:a.presentationTimeOffset,mimeType:a.mimeType,codecs:a.codecs,width:a.width||void 0,height:a.height||void 0,frameRate:a.frameRate||void 0,kind:a.kind,encrypted:a.encrypted,keyId:a.keyId,language:a.language,label:a.label||null,type:a.contentType,primary:a.primary,
trickModeVideo:null,containsEmsgBoxes:!1,roles:[],channelsCount:null};null!=a.initSegmentKey&&(b.initSegmentReference=fh(a.initSegmentKey));return b}function fh(a){var b="offline:segment/"+a;return new L(function(){return[b]},0,null)}function $g(a){return"audio"==a.contentType}function ah(a){return"video"==a.contentType}function ch(a){return"text"==a.contentType};function gh(){return hh().then(function(){var a=new Cg;return a.init().then(function(){return a})})}function ih(){return hh().then(function(){return Dg()})}function hh(){return null!=window.indexedDB?Promise.resolve():Promise.reject(new p(2,9,9E3))};function jh(){this.a=-1}m=jh.prototype;m.configure=function(){};m.start=function(a){var b=Wg(a);if(null==b)return Promise.reject(new p(2,1,9004,a));this.a=b;var c;return gh().then(function(a){c=a;return c.Ea(b)}.bind(this)).then(function(a){if(!a)throw new p(2,9,9003,b);return kh(a)}).then(function(a){return c.destroy().then(function(){return a})},function(a){return c.destroy().then(function(){throw a;})})};m.stop=function(){return Promise.resolve()};m.update=function(){};
m.onExpirationUpdated=function(a,b){var c=this.a,d;gh().then(function(a){d=a;return d.Ea(c)}).then(function(e){if(e&&!(0>e.sessionIds.indexOf(a))&&(void 0==e.expiration||e.expiration>b))return e.expiration=b,Kg(d,c,e)})["catch"](function(){}).then(function(){return d.destroy()})};function kh(a){var b=new R(null,0);b.ha(a.duration);var c=a.drmInfo?[a.drmInfo]:[];return{presentationTimeline:b,minBufferTime:2,offlineSessionIds:a.sessionIds,periods:a.periods.map(function(a){return Zg(a,c,b)})}}
qe["application/x-offline-manifest"]=jh;function lh(a){if(null!=Wg(a))return lh.a(a);var b=(b=/^offline:segment\/([0-9]+)$/.exec(a))?Number(b[1]):null;return null!=b?lh.b(b,a):Promise.reject(new p(2,1,9004,a))}n("shaka.offline.OfflineScheme",lh);lh.a=function(a){a={uri:a,data:new ArrayBuffer(0),headers:{"content-type":"application/x-offline-manifest"}};return Promise.resolve(a)};
lh.b=function(a,b){var c,d;return gh().then(function(b){c=b;return Gg(c,"segment-v3",a)}).then(function(a){d=a;return c.destroy()}).then(function(){if(!d)throw new p(2,9,9003,a);return{uri:b,data:d.data,headers:{}}})};Ua("offline",lh);function T(a,b,c){this.startTime=a;this.endTime=b;this.payload=c;this.region={x:0,y:0,width:100,height:100};this.position=null;this.positionAlign=mh;this.size=100;this.textAlign=nh;this.writingDirection=oh;this.lineInterpretation=ph;this.line=null;this.lineHeight="";this.lineAlign=qh;this.displayAlign=rh;this.fontSize=this.backgroundColor=this.color="";this.fontWeight=sh;this.fontStyle=th;this.fontFamily="";this.textDecoration=[];this.wrapLine=!0;this.id=""}n("shaka.text.Cue",T);var mh="auto";
T.positionAlign={LEFT:"line-left",RIGHT:"line-right",CENTER:"center",AUTO:mh};var nh="center",uh={LEFT:"left",RIGHT:"right",CENTER:nh,START:"start",END:"end"};T.textAlign=uh;var rh="before",vh={BEFORE:rh,CENTER:"center",AFTER:"after"};T.displayAlign=vh;var oh=0;T.writingDirection={HORIZONTAL_LEFT_TO_RIGHT:oh,HORIZONTAL_RIGHT_TO_LEFT:1,VERTICAL_LEFT_TO_RIGHT:2,VERTICAL_RIGHT_TO_LEFT:3};var ph=0;T.lineInterpretation={LINE_NUMBER:ph,PERCENTAGE:1};var qh="center",wh={CENTER:qh,START:"start",END:"end"};
T.lineAlign=wh;var sh=400;T.fontWeight={NORMAL:sh,BOLD:700};var th="normal",xh={NORMAL:th,ITALIC:"italic",OBLIQUE:"oblique"};T.fontStyle=xh;T.textDecoration={UNDERLINE:"underline",LINE_THROUGH:"lineThrough",OVERLINE:"overline"};function U(a){this.a=null;for(var b=0;b<a.textTracks.length;++b){var c=a.textTracks[b];c.mode="disabled";"Shaka Player TextTrack"==c.label&&(this.a=c)}this.a||(this.a=a.addTextTrack("subtitles","Shaka Player TextTrack"));this.a.mode="hidden";this.b=this.a.cues}n("shaka.text.SimpleTextDisplayer",U);U.prototype.remove=function(a,b){if(!this.a)return!1;yh(this,function(c){return c.startTime>=b||c.endTime<=a?!1:!0});return!0};U.prototype.remove=U.prototype.remove;
U.prototype.append=function(a){for(var b=[],c=0;c<a.length;c++){var d=zh(a[c]);d&&b.push(d)}b.slice().sort(function(a,c){return a.startTime!=c.startTime?a.startTime-c.startTime:a.endTime!=c.endTime?a.endTime-c.startTime:b.indexOf(c)-b.indexOf(a)}).forEach(function(a){this.a.addCue(a)}.bind(this))};U.prototype.append=U.prototype.append;U.prototype.destroy=function(){this.a&&yh(this,function(){return!0});this.a=null;return Promise.resolve()};U.prototype.destroy=U.prototype.destroy;
U.prototype.isTextVisible=function(){return"showing"==this.a.mode};U.prototype.isTextVisible=U.prototype.isTextVisible;U.prototype.setTextVisibility=function(a){this.a.mode=a?"showing":"hidden"};U.prototype.setTextVisibility=U.prototype.setTextVisibility;
function zh(a){if(a.startTime>=a.endTime)return null;var b=new VTTCue(a.startTime,a.endTime,a.payload);b.lineAlign=a.lineAlign;b.positionAlign=a.positionAlign;b.size=a.size;try{b.align=a.textAlign}catch(c){}"center"==a.textAlign&&"center"!=b.align&&(b.align="middle");2==a.writingDirection?b.vertical="lr":3==a.writingDirection&&(b.vertical="rl");1==a.lineInterpretation&&(b.snapToLines=!1);null!=a.line&&(b.line=a.line);null!=a.position&&(b.position=a.position);return b}
function yh(a,b){for(var c=a.b,d=[],e=0;e<c.length;++e)b(c[e])&&d.push(c[e]);for(e=0;e<d.length;++e)a.a.removeCue(d[e])};function Ah(){this.a=Promise.resolve();this.b=this.c=this.f=!1;this.i=new Promise(function(a){this.g=a}.bind(this));this.l=[];this.j=[]}Ah.prototype.then=function(a){this.a=this.a.then(a).then(function(a){return this.b?(this.g(),Promise.reject(this.h)):Promise.resolve(a)}.bind(this));return this};
function Bh(a){a.f||(a.a=a.a.then(function(a){this.c=!0;this.l.forEach(function(a){a()});return Promise.resolve(a)}.bind(a),function(a){this.c=!0;return this.b?(this.g(),Promise.reject(this.h)):Promise.reject(a)}.bind(a)));a.f=!0;return a.a}Ah.prototype.cancel=function(a){if(this.c)return Promise.resolve();this.b=!0;this.h=a;this.j.forEach(function(a){a()});return this.i};function V(a,b){G.call(this);this.D=!1;this.f=a;this.mb=!1;this.u=null;this.m=new bb;this.h=this.zb=this.b=this.i=this.a=this.v=this.g=this.jb=this.J=this.K=this.l=this.o=null;this.Yc=1E9;this.hb=[];this.lb=!1;this.Ca=!0;this.Ra=this.Sa=this.Y=null;this.hc=!1;this.X=null;this.kb=[];this.A={};this.c=Ch(this);this.ib={width:Infinity,height:Infinity};this.j=Dh();this.gb=0;this.Pa=this.c.preferredAudioLanguage;this.Qa=this.c.preferredTextLanguage;this.cb=this.eb="";b&&b(this);this.o=new x(this.Fe.bind(this));
this.jb=Eh(this);z(this.m,this.f,"error",this.Yd.bind(this))}la(V,G);n("shaka.Player",V);function Fh(a){if(!a.Y)return Promise.resolve();var b=Promise.resolve();a.i&&(b=a.i.stop(),a.i=null);a=a.Y.cancel(new p(2,7,7E3));return Promise.all([b,a])}V.prototype.destroy=function(){this.D=!0;return Fh(this).then(function(){var a=Promise.all([this.Sa,Gh(this),this.m?this.m.destroy():null,this.o?this.o.destroy():null]);this.f=null;this.mb=!1;this.c=this.o=this.h=this.m=null;return a}.bind(this))};
V.prototype.destroy=V.prototype.destroy;V.version="v2.3.2";var Hh={};V.registerSupportPlugin=function(a,b){Hh[a]=b};V.isBrowserSupported=function(){return!!window.Promise&&!!window.Uint8Array&&!!Array.prototype.forEach&&!!window.MediaSource&&!!MediaSource.isTypeSupported&&!!window.MediaKeys&&!!window.navigator&&!!window.navigator.requestMediaKeySystemAccess&&!!window.MediaKeySystemAccess&&!!window.MediaKeySystemAccess.prototype.getConfiguration};
V.probeSupport=function(){return Qb().then(function(a){var b=se(),c=cc();a={manifest:b,media:c,drm:a};for(var d in Hh)a[d]=Hh[d]();return a})};
V.prototype.load=function(a,b,c){var d=this.wb(),e=new Ah;this.Y=e;this.dispatchEvent(new A("loading"));var f=Date.now();return Bh(e.then(function(){return d}).then(function(){this.j=Dh();z(this.m,this.f,"playing",this.bb.bind(this));z(this.m,this.f,"pause",this.bb.bind(this));z(this.m,this.f,"ended",this.bb.bind(this));this.h=new this.c.abrFactory;this.h.configure(this.c.abr);this.u=new this.c.textDisplayFactory;this.u.setTextVisibility(this.mb);return te(a,this.o,this.c.manifest.retryParameters,
c)}.bind(this)).then(function(b){this.i=new b;this.i.configure(this.c.manifest);return this.i.start(a,{networkingEngine:this.o,filterNewPeriod:this.ob.bind(this),filterAllPeriods:this.bc.bind(this),onTimelineRegionAdded:this.Xd.bind(this),onEvent:this.ab.bind(this),onError:this.Oa.bind(this)})}.bind(this)).then(function(b){b.periods.some(function(a){return a.variants.some(function(a){return a.video&&a.audio})})&&b.periods.forEach(function(a){a.variants=a.variants.filter(function(a){return a.video&&
a.audio})});if(0==b.periods.length)throw new p(2,4,4014);this.b=b;this.zb=a;this.l=new Ab({Va:this.o,onError:this.Oa.bind(this),Rb:this.Id.bind(this),onExpirationUpdated:this.Fd.bind(this),onEvent:this.ab.bind(this)});this.l.configure(this.c.drm);return this.l.init(b,!1)}.bind(this)).then(function(){this.bc(this.b.periods);this.gb=Date.now()/1E3;this.Pa=this.c.preferredAudioLanguage;this.Qa=this.c.preferredTextLanguage;var a=this.b.presentationTimeline.T(),b=this.c.playRangeEnd,c=this.c.playRangeStart;
0<c&&(this.P()||this.b.presentationTimeline.Oc(c));b<a&&(this.P()||this.b.presentationTimeline.ha(b));return Promise.all([Db(this.l,this.f),this.jb])}.bind(this)).then(function(){this.h.init(this.Ge.bind(this));this.g=new Kf(this.f,this.b,this.c.streaming,void 0==b?null:b,this.Ee.bind(this),this.ab.bind(this));this.v=new Tf(this.f,this.K,this.b,this.c.streaming,this.Rc.bind(this),this.ab.bind(this),this.De.bind(this));this.J=new bc(this.f,this.K,this.u);this.a=new Xf(this.b,{Ja:this.g,L:this.J,Va:this.o,
tc:this.Cd.bind(this),sc:this.ad.bind(this),onError:this.Oa.bind(this),onEvent:this.ab.bind(this),Jd:this.Kd.bind(this),Sb:this.Td.bind(this),filterNewPeriod:this.ob.bind(this),filterAllPeriods:this.bc.bind(this)});this.a.configure(this.c.streaming);this.dispatchEvent(new A("streaming"));Ih(this);return this.a.init()}.bind(this)).then(function(){if(this.c.streaming.startAtSegmentBoundary){var a=Jh(this,Of(this.g));Mf(this.g,a)}this.b.periods.forEach(this.ob.bind(this));Kh(this);Lh(this);a=S(this.a);
var b=Ec(a.variants,this.Pa,this.eb);this.h.setVariants(b);a.variants.some(function(a){return a.primary});this.kb.forEach(this.v.o.bind(this.v));this.kb=[];eb(this.m,this.f,"loadeddata",function(){this.j.loadLatency=(Date.now()-f)/1E3}.bind(this));this.Y=null}.bind(this)))["catch"](function(a){this.Y==e&&(this.Y=null,this.dispatchEvent(new A("unloading")));return Promise.reject(a)}.bind(this))};V.prototype.load=V.prototype.load;
function Ih(a){function b(a){return(a.video?a.video.codecs.split(".")[0]:"")+"-"+(a.audio?a.audio.codecs.split(".")[0]:"")}var c={};a.b.periods.forEach(function(a){a.variants.forEach(function(a){var d=b(a);d in c||(c[d]=[]);c[d].push(a)})});var d=null,e=Infinity;kb(c,function(a,b){var c=0,f=0;b.forEach(function(a){c+=a.bandwidth||0;++f});var g=c/f;g<e&&(d=a,e=g)});a.b.periods.forEach(function(a){a.variants=a.variants.filter(function(a){return b(a)==d?!0:!1})})}
function Eh(a){a.K=new MediaSource;var b=new u;z(a.m,a.K,"sourceopen",b.resolve);a.f.src=window.URL.createObjectURL(a.K);return b}V.prototype.configure=function(a){Ma(this.c,a,Ch(this),Mh(),"");Nh(this)};V.prototype.configure=V.prototype.configure;
function Nh(a){a.i&&a.i.configure(a.c.manifest);a.l&&a.l.configure(a.c.drm);if(a.a){a.a.configure(a.c.streaming);try{a.b.periods.forEach(a.ob.bind(a))}catch(e){a.Oa(e)}var b=ag(a.a),c=cg(a.a),d=S(a.a);(b=Ic(b,c,d.variants))&&b.allowedByApplication&&b.allowedByKeySystem||Oh(a,d)}a.h&&(a.h.configure(a.c.abr),a.c.abr.enabled&&!a.Ca?a.h.enable():a.h.disable())}V.prototype.getConfiguration=function(){var a=Ch(this);Ma(a,this.c,Ch(this),Mh(),"");return a};V.prototype.getConfiguration=V.prototype.getConfiguration;
V.prototype.se=function(){this.c=Ch(this);Nh(this)};V.prototype.resetConfiguration=V.prototype.se;V.prototype.nd=function(){return this.f};V.prototype.getMediaElement=V.prototype.nd;V.prototype.oc=function(){return this.o};V.prototype.getNetworkingEngine=V.prototype.oc;V.prototype.Fb=function(){return this.zb};V.prototype.getManifestUri=V.prototype.Fb;V.prototype.P=function(){return this.b?this.b.presentationTimeline.P():!1};V.prototype.isLive=V.prototype.P;
V.prototype.xa=function(){return this.b?this.b.presentationTimeline.xa():!1};V.prototype.isInProgress=V.prototype.xa;V.prototype.yd=function(){if(!this.b||!this.b.periods.length)return!1;var a=this.b.periods[0].variants;return a.length?!a[0].video:!1};V.prototype.isAudioOnly=V.prototype.yd;V.prototype.ue=function(){var a=0,b=0;this.b&&(b=this.b.presentationTimeline,a=b.ka(),b=b.rb());return{start:a,end:b}};V.prototype.seekRange=V.prototype.ue;
V.prototype.keySystem=function(){return this.l?this.l.keySystem():""};V.prototype.keySystem=V.prototype.keySystem;V.prototype.drmInfo=function(){return this.l?this.l.b:null};V.prototype.drmInfo=V.prototype.drmInfo;V.prototype.qb=function(){return this.l?this.l.qb():Infinity};V.prototype.getExpiration=V.prototype.qb;V.prototype.rc=function(){return this.lb};V.prototype.isBuffering=V.prototype.rc;
V.prototype.wb=function(){if(this.D)return Promise.resolve();this.dispatchEvent(new A("unloading"));return Fh(this).then(function(){this.Sa||(this.Sa=Ph(this).then(function(){this.Sa=null}.bind(this)));return this.Sa}.bind(this))};V.prototype.unload=V.prototype.wb;V.prototype.Gb=function(){return this.g?this.g.Gb():0};V.prototype.getPlaybackRate=V.prototype.Gb;V.prototype.Pe=function(a){this.g&&Qf(this.g,a);this.a&&hg(this.a,1!=a)};V.prototype.trickPlay=V.prototype.Pe;
V.prototype.bd=function(){this.g&&Qf(this.g,1);this.a&&hg(this.a,!1)};V.prototype.cancelTrickPlay=V.prototype.bd;V.prototype.wd=function(){if(!this.b||!this.g)return[];var a=Kc(this.b,Of(this.g)),b=this.A[a]||{};return zc(this.b.periods[a],b.audio,b.video)};V.prototype.getVariantTracks=V.prototype.wd;V.prototype.vd=function(){if(!this.b||!this.g)return[];var a=Kc(this.b,Of(this.g));return Ac(this.b.periods[a],(this.A[a]||{}).text).filter(function(a){return 0>this.hb.indexOf(a.id)}.bind(this))};
V.prototype.getTextTracks=V.prototype.vd;V.prototype.xe=function(a){if(this.a){var b=S(this.a);if(a=Cc(b,a))Qh(this,a,!1),this.Ca?this.X=a:ig(this.a,a,!0)}};V.prototype.selectTextTrack=V.prototype.xe;V.prototype.ye=function(a,b){if(this.a){this.c.abr.enabled&&qa("Changing tracks while abr manager is enabled will likely result in the selected track being overriden. Consider disabling abr before calling selectVariantTrack().");var c=S(this.a);(c=Bc(c,a))&&Dc(c)&&(Rh(this,c,!1),Sh(this,c,b))}};
V.prototype.selectVariantTrack=V.prototype.ye;V.prototype.kd=function(){if(!this.a)return[];var a=S(this.a);a=yc(a.variants).map(function(a){return a.audio}).filter(Sa);return Th(a)};V.prototype.getAudioLanguagesAndRoles=V.prototype.kd;V.prototype.ud=function(){if(!this.a)return[];var a=S(this.a);return Th(a.textStreams)};V.prototype.getTextLanguagesAndRoles=V.prototype.ud;V.prototype.jd=function(){if(!this.a)return[];var a=S(this.a);return yc(a.variants).map(function(a){return a.language}).filter(Sa)};
V.prototype.getAudioLanguages=V.prototype.jd;V.prototype.td=function(){return this.a?S(this.a).textStreams.map(function(a){return a.language}).filter(Sa):[]};V.prototype.getTextLanguages=V.prototype.td;function Th(a){var b=[];a.forEach(function(a){if(a){var c=a.language;a.roles.length?a.roles.forEach(function(a){b.push({language:c,role:a})}):b.push({language:c,role:""})}else b.push({language:"und",role:""})});return Xa(b,function(a,b){return a.language==b.language&&a.role==b.role})}
V.prototype.ve=function(a,b){if(this.a){var c=S(this.a);this.Pa=a;this.eb=b||"";Oh(this,c)}};V.prototype.selectAudioLanguage=V.prototype.ve;V.prototype.we=function(a,b){if(this.a){var c=S(this.a);this.Qa=a;this.cb=b||"";Oh(this,c)}};V.prototype.selectTextLanguage=V.prototype.we;V.prototype.Kb=function(){return this.u?this.u.isTextVisible():this.mb};V.prototype.isTextTrackVisible=V.prototype.Kb;
V.prototype.Be=function(a){this.u&&this.u.setTextVisibility(a);this.mb=a;Uh(this);this.a&&(a?(a=S(this.a),a=Gc(a.textStreams,this.Qa,this.cb)[0],dg(this.a,a)):(a=this.a,a.v=!0,a.c.text&&(Yf(a.c.text),delete a.c.text)))};V.prototype.setTextTrackVisibility=V.prototype.Be;V.prototype.pd=function(){return this.b?new Date(1E3*this.b.presentationTimeline.c+1E3*this.f.currentTime):null};V.prototype.getPlayheadTimeAsDate=V.prototype.pd;
V.prototype.rd=function(){return this.b?new Date(1E3*this.b.presentationTimeline.c):null};V.prototype.getPresentationStartTimeAsDate=V.prototype.rd;V.prototype.Db=function(){return this.J?this.J.Db():{total:[],audio:[],video:[],text:[]}};V.prototype.getBufferedInfo=V.prototype.Db;
V.prototype.getStats=function(){Wh(this);this.bb();var a=null,b=null,c=this.f;c=c&&c.getVideoPlaybackQuality?c.getVideoPlaybackQuality():{};if(this.g&&this.b){var d=Kc(this.b,Of(this.g)),e=this.b.periods[d];if(d=this.A[d])b=Jc(d.audio,d.video,e.variants),a=b.video||{}}a||(a={});b||(b={});return{width:a.width||0,height:a.height||0,streamBandwidth:b.bandwidth||0,decodedFrames:Number(c.totalVideoFrames),droppedFrames:Number(c.droppedVideoFrames),estimatedBandwidth:this.h?this.h.getBandwidthEstimate():
NaN,loadLatency:this.j.loadLatency,playTime:this.j.playTime,bufferingTime:this.j.bufferingTime,switchHistory:Na(this.j.switchHistory),stateHistory:Na(this.j.stateHistory)}};V.prototype.getStats=V.prototype.getStats;
V.prototype.addTextTrack=function(a,b,c,d,e,f){if(!this.a)return Promise.reject();for(var g=S(this.a),h,k=0;k<this.b.periods.length;k++)if(this.b.periods[k]==g){if(k==this.b.periods.length-1){if(h=this.b.presentationTimeline.T()-g.startTime,Infinity==h)return Promise.reject()}else h=this.b.periods[k+1].startTime-g.startTime;break}var l={id:this.Yc++,createSegmentIndex:Promise.resolve.bind(Promise),findSegmentPosition:function(){return 1},getSegmentReference:function(b){return 1!=b?null:new M(1,0,
h,function(){return[a]},0,null)},initSegmentReference:null,presentationTimeOffset:0,mimeType:d,codecs:e||"",kind:c,encrypted:!1,keyId:null,language:b,label:f||null,type:"text",primary:!1,trickModeVideo:null,containsEmsgBoxes:!1,roles:[],channelsCount:null};this.hb.push(l.id);g.textStreams.push(l);return dg(this.a,l).then(function(){if(!this.D){var a=this.b.periods.indexOf(g),d=bg(this.a,"text");d&&(this.A[a].text=d.id);this.hb.splice(this.hb.indexOf(l.id),1);Oh(this,g);Kh(this);return{id:l.id,active:!1,
type:"text",bandwidth:0,language:b,label:f||null,kind:c,width:null,height:null}}}.bind(this))};V.prototype.addTextTrack=V.prototype.addTextTrack;V.prototype.$b=function(a,b){this.ib.width=a;this.ib.height=b};V.prototype.setMaxHardwareResolution=V.prototype.$b;V.prototype.Kc=function(){if(this.a){var a=this.a;if(a.f)a=!1;else if(a.l)a=!1;else{for(var b in a.c){var c=a.c[b];c.Ta&&(c.Ta=!1,gg(a,c,.1))}a=!0}}else a=!1;return a};V.prototype.retryStreaming=V.prototype.Kc;V.prototype.Ea=function(){return this.b};
V.prototype.getManifest=V.prototype.Ea;function Rh(a,b,c){b.video&&Xh(a,b.video);b.audio&&Xh(a,b.audio);var d=$f(a.a);b!=Ic(ag(a.a),cg(a.a),d?d.variants:[])&&a.j.switchHistory.push({timestamp:Date.now()/1E3,id:b.id,type:"variant",fromAdaptation:c,bandwidth:b.bandwidth})}function Qh(a,b,c){Xh(a,b);a.j.switchHistory.push({timestamp:Date.now()/1E3,id:b.id,type:"text",fromAdaptation:c,bandwidth:null})}function Xh(a,b){var c=Lc(a.b,b);a.A[c]||(a.A[c]={});a.A[c][b.type]=b.id}
function Gh(a){a.m&&(a.m.ia(a.K,"sourceopen"),a.m.ia(a.f,"loadeddata"),a.m.ia(a.f,"playing"),a.m.ia(a.f,"pause"),a.m.ia(a.f,"ended"));a.f&&(a.f.removeAttribute("src"),a.f.load());var b=Promise.all([a.h?a.h.stop():null,a.l?a.l.destroy():null,a.J?a.J.destroy():null,a.g?a.g.destroy():null,a.v?a.v.destroy():null,a.a?a.a.destroy():null,a.i?a.i.stop():null,a.u?a.u.destroy():null]);a.l=null;a.J=null;a.g=null;a.v=null;a.a=null;a.i=null;a.u=null;a.b=null;a.zb=null;a.jb=null;a.K=null;a.kb=[];a.A={};a.j=Dh();
return b}function Ph(a){return a.i?Gh(a).then(function(){this.D||(this.Rc(!1),this.jb=Eh(this))}.bind(a)):Promise.resolve()}function Mh(){return{".drm.servers":"",".drm.clearKeys":"",".drm.advanced":{distinctiveIdentifierRequired:!1,persistentStateRequired:!1,videoRobustness:"",audioRobustness:"",serverCertificate:new Uint8Array(0)}}}
function Ch(a){var b=5E5;navigator.connection&&navigator.connection.type&&(b=1E6*navigator.connection.downlink);return{drm:{retryParameters:Ia(),servers:{},clearKeys:{},advanced:{},delayLicenseRequestUntilPlayed:!1},manifest:{retryParameters:Ia(),dash:{customScheme:function(a){if(a)return null},clockSyncUri:"",ignoreDrmInfo:!1,xlinkFailGracefully:!1,defaultPresentationDelay:10}},streaming:{retryParameters:Ia(),failureCallback:a.ed.bind(a),rebufferingGoal:2,bufferingGoal:10,bufferBehind:30,ignoreTextStreamFailures:!1,
startAtSegmentBoundary:!1,smallGapLimit:.5,jumpLargeGaps:!1,durationBackoff:1},abrFactory:E,textDisplayFactory:function(a){return new U(a)}.bind(null,a.f),abr:{enabled:!0,defaultBandwidthEstimate:b,switchInterval:8,bandwidthUpgradeTarget:.85,bandwidthDowngradeTarget:.95,restrictions:{minWidth:0,maxWidth:Infinity,minHeight:0,maxHeight:Infinity,minPixels:0,maxPixels:Infinity,minBandwidth:0,maxBandwidth:Infinity}},preferredAudioLanguage:"",preferredTextLanguage:"",restrictions:{minWidth:0,maxWidth:Infinity,
minHeight:0,maxHeight:Infinity,minPixels:0,maxPixels:Infinity,minBandwidth:0,maxBandwidth:Infinity},playRangeStart:0,playRangeEnd:Infinity}}m=V.prototype;m.ed=function(a){var b=[1001,1002,1003];this.P()&&0<=b.indexOf(a.code)&&(a.severity=1,this.Kc())};function Dh(){return{width:NaN,height:NaN,streamBandwidth:NaN,decodedFrames:NaN,droppedFrames:NaN,estimatedBandwidth:NaN,loadLatency:NaN,playTime:0,bufferingTime:0,switchHistory:[],stateHistory:[]}}
m.bc=function(a){a.forEach(tc.bind(null,this.l,this.a?ag(this.a):null,this.a?cg(this.a):null));var b=$a(a,function(a){return a.variants.some(Dc)});if(0==b)throw new p(2,4,9009);if(b<a.length)throw new p(2,4,4011);a.forEach(function(a){sc(a,this.c.restrictions,this.ib)&&this.a&&S(this.a)==a&&Kh(this);if(!a.variants.some(Dc))throw new p(2,4,4012);}.bind(this))};
m.ob=function(a){tc(this.l,this.a?ag(this.a):null,this.a?cg(this.a):null,a);var b=a.variants,c=b.some(Dc);sc(a,this.c.restrictions,this.ib)&&this.a&&S(this.a)==a&&Kh(this);a=b.some(Dc);if(!c)throw new p(2,4,4011);if(!a)throw new p(2,4,4012);};function Sh(a,b,c){a.Ca?(a.Ra=b,a.hc=c||!1):jg(a.a,b,c||!1)}function Wh(a){if(a.b){var b=Date.now()/1E3;a.lb?a.j.bufferingTime+=b-a.gb:a.j.playTime+=b-a.gb;a.gb=b}}
function Jh(a,b){function c(a,b){if(!a)return null;var c=a.findSegmentPosition(b-f.startTime);return null==c?null:(c=a.getSegmentReference(c))?c.startTime+f.startTime:null}var d=ag(a.a),e=cg(a.a),f=S(a.a);d=c(d,b);e=c(e,b);return null!=e&&null!=d?Math.max(e,d):null!=e?e:null!=d?d:b}m.Fe=function(a,b){this.h&&this.h.segmentDownloaded(a,b)};m.Rc=function(a){Wh(this);this.lb=a;this.bb();if(this.g){var b=this.g;a!=b.j&&(b.j=a,Qf(b,b.i))}this.dispatchEvent(new A("buffering",{buffering:a}))};m.De=function(){Kh(this)};
m.bb=function(){if(!this.D){var a=this.lb?"buffering":this.f.ended?"ended":this.f.paused?"paused":"playing";var b=Date.now()/1E3;if(this.j.stateHistory.length){var c=this.j.stateHistory[this.j.stateHistory.length-1];c.duration=b-c.timestamp;if(a==c.state)return}this.j.stateHistory.push({timestamp:b,state:a,duration:0})}};m.Ee=function(){if(this.v){var a=this.v;a.c.forEach(a.m.bind(a,!0))}this.a&&mg(this.a)};
function Yh(a,b){if(!b||!b.length)return a.Oa(new p(2,4,4012)),null;a.h.setVariants(b);return a.h.chooseVariant()}function Oh(a,b){var c=Ec(b.variants,a.Pa,a.eb),d=Gc(b.textStreams,a.Qa,a.cb);if(c=Yh(a,c))Rh(a,c,!0),Sh(a,c,!0);(d=d[0])&&a.Kb()&&(Qh(a,d,!0),a.Ca?a.X=d:ig(a.a,d,!0));Lh(a)}
m.Cd=function(a){this.Ca=!0;this.h.disable();var b={audio:!1,text:!1},c=Ec(a.variants,this.Pa,this.eb,b);a=Gc(a.textStreams,this.Qa,this.cb,b);c=Yh(this,c);a=a[0]||null;this.X=this.Ra=null;c&&Rh(this,c,!0);a&&(Qh(this,a,!0),!$f(this.a)&&c&&c.audio&&b.text&&a.language!=c.audio.language&&(this.u.setTextVisibility(!0),Uh(this)));return this.Kb()?{variant:c,text:a}:{variant:c,text:null}};
m.ad=function(){this.Ca=!1;this.c.abr.enabled&&this.h.enable();this.Ra&&(jg(this.a,this.Ra,this.hc),this.Ra=null);this.X&&(ig(this.a,this.X,!0),this.X=null)};m.Kd=function(){this.i&&this.i.update&&this.i.update()};m.Td=function(){this.g&&this.g.Sb()};m.Ge=function(a,b){Rh(this,a,!0);this.a&&(jg(this.a,a,b||!1),Lh(this))};function Lh(a){Promise.resolve().then(function(){this.D||this.dispatchEvent(new A("adaptation"))}.bind(a))}
function Kh(a){Promise.resolve().then(function(){this.D||this.dispatchEvent(new A("trackschanged"))}.bind(a))}function Uh(a){a.dispatchEvent(new A("texttrackvisibility"))}m.Oa=function(a){if(!this.D){var b=new A("error",{detail:a});this.dispatchEvent(b);b.defaultPrevented&&(a.handled=!0)}};m.Xd=function(a){this.v?this.v.o(a):this.kb.push(a)};m.ab=function(a){this.dispatchEvent(a)};
m.Yd=function(){if(this.f.error){var a=this.f.error.code;if(1!=a){var b=this.f.error.msExtendedCode;b&&(0>b&&(b+=Math.pow(2,32)),b=b.toString(16));this.Oa(new p(2,3,3016,a,b,this.f.error.message))}}};
m.Id=function(a){var b=["output-restricted","internal-error"],c=S(this.a),d=!1,e=Object.keys(a),f=1==e.length&&"00"==e[0];e.length&&c.variants.forEach(function(c){var e=[];c.audio&&e.push(c.audio);c.video&&e.push(c.video);e.forEach(function(e){var g=c.allowedByKeySystem;e.keyId&&(e=a[f?"00":e.keyId],c.allowedByKeySystem=!!e&&0>b.indexOf(e));g!=c.allowedByKeySystem&&(d=!0)})});(e=Ic(ag(this.a),cg(this.a),c.variants))&&!e.allowedByKeySystem&&Oh(this,c);d&&Kh(this)};
m.Fd=function(a,b){if(this.i&&this.i.onExpirationUpdated)this.i.onExpirationUpdated(a,b);this.dispatchEvent(new A("expirationupdated"))};function W(a){if(!a||a.constructor!=V)throw new p(2,9,9008);this.g=null;this.a=a;this.b=Zh(this);this.f=null;this.l=!1;this.c=this.o=this.h=this.i=null}n("shaka.offline.Storage",W);function $h(){return null!=window.indexedDB}W.support=$h;W.prototype.destroy=function(){var a=this.g,b=this.c?this.c.destroy()["catch"](function(){}).then(function(){if(a)return a.destroy()}):Promise.resolve();this.b=this.a=this.c=this.g=null;return b};W.prototype.destroy=W.prototype.destroy;
W.prototype.configure=function(a){Ma(this.b,a,Zh(this),{},"")};W.prototype.configure=W.prototype.configure;
W.prototype.store=function(a,b,c){function d(a){f=a}if(this.l)return Promise.reject(new p(2,9,9006));this.l=!0;var e=b||{},f=null;return ai(this).then(function(){X(this);return bi(this,a,d,c)}.bind(this)).then(function(b){X(this);if(f)throw f;return ci(this,a,b.manifest,e,b.fd)}.bind(this)).then(function(a){X(this);return di(this).then(function(){return a})}.bind(this))["catch"](function(a){f=f||a;return di(this).then(function(){throw f;})}.bind(this))};W.prototype.store=W.prototype.store;
function ci(a,b,c,d,e){if(c.presentationTimeline.P()||c.presentationTimeline.xa())throw new p(2,9,9005,b);a.h=c;a.f=e;a.j(c.periods);a.o=Xg(b,c,d);var f=ei(a,b,d);return Tg(a.c,f).then(function(a){return Yg("offline:manifest/"+a,f)})}W.prototype.remove=function(a){return a.offlineUri?(qa("Removing downloaded content using shakaExtern.StoredContent is deprecated. Please remove using the offline uri."),fi(this,a.offlineUri)):fi(this,a)};W.prototype.remove=W.prototype.remove;
function fi(a,b){function c(a){6013!=a.code&&(e=a)}var d=Wg(b);if(null==d)return Promise.reject(new p(2,9,9004,b));var e=null,f,g;return ai(a).then(function(){X(this);return this.g.Ea(d)}.bind(a)).then(function(a){X(this);if(!a)throw new p(2,9,9003,b);f=a;a=kh(f);g=new Ab({Va:this.a.o,onError:c,Rb:function(){},onExpirationUpdated:function(){},onEvent:function(){}});g.configure(this.a.getConfiguration().drm);return g.init(a,this.b.usePersistentLicense||!1)}.bind(a)).then(function(){return Fb(g,f.sessionIds)}.bind(a)).then(function(){return g.destroy()}.bind(a)).then(function(){X(this);
if(e)throw e;return gi(this,b,d,f)}.bind(a))}function gi(a,b,c,d){function e(){k++;f(g,k/l)}var f=a.b.progressCallback,g=Yg(b,d),h=hi(d),k=0,l=h.length+1;return Promise.resolve().then(function(){X(this);return Mg(this.g,"segment-v3",h,e)}.bind(a)).then(function(){X(this);return Mg(this.g,"manifest-v3",[c],e)}.bind(a))}W.prototype.list=function(){var a=[];return ai(this).then(function(){X(this);return Hg(this.g,function(b,c){var d=Yg("offline:manifest/"+b,c);a.push(d)})}.bind(this)).then(function(){return a})};
W.prototype.list=W.prototype.list;
function bi(a,b,c,d){function e(){}var f=a.a.o,g=a.a.getConfiguration(),h,k,l;return te(b,f,g.manifest.retryParameters,d).then(function(a){X(this);l=new a;l.configure(g.manifest);return l.start(b,{networkingEngine:f,filterAllPeriods:this.j.bind(this),filterNewPeriod:this.m.bind(this),onTimelineRegionAdded:function(){},onEvent:function(){},onError:c})}.bind(a)).then(function(a){X(this);h=a;k=new Ab({Va:f,onError:c,Rb:e,onExpirationUpdated:function(){},onEvent:function(){}});k.configure(g.drm);return k.init(h,
this.b.usePersistentLicense||!1)}.bind(a)).then(function(){X(this);return ii(h)}.bind(a)).then(function(){X(this);return Eb(k)}.bind(a)).then(function(){X(this);return l.stop()}.bind(a)).then(function(){X(this);return{manifest:h,fd:k}}.bind(a))["catch"](function(a){if(l)return l.stop().then(function(){throw a;});throw a;})}
W.prototype.u=function(a){var b=[],c=pc(this.a.getConfiguration().preferredAudioLanguage),d=[0,nc,oc],e=a.filter(function(a){return"variant"==a.type});d=d.map(function(a){return e.filter(function(b){b=pc(b.language);return mc(a,c,b)})});for(var f,g=0;g<d.length;g++)if(d[g].length){f=d[g];break}f||(d=e.filter(function(a){return a.primary}),d.length&&(f=d));f||(f=e,e.map(function(a){return a.language}).filter(Sa));var h=f.filter(function(a){return a.height&&480>=a.height});h.length&&(h.sort(function(a,
b){return b.height-a.height}),f=h.filter(function(a){return a.height==h[0].height}));f.sort(function(a,b){return a.bandwidth-b.bandwidth});f.length&&b.push(f[Math.floor(f.length/2)]);b.push.apply(b,a.filter(function(a){return"text"==a.type}));return b};function Zh(a){return{trackSelectionCallback:a.u.bind(a),progressCallback:function(a,c){if(a||c)return null},usePersistentLicense:!0}}
function ai(a){if(null==window.indexedDB)return Promise.reject(new p(2,9,9E3));if(a.g)return Promise.resolve();var b=a.a.o,c=a.a.getConfiguration().streaming.retryParameters;return gh().then(function(a){this.g=a;this.c=new Qg(a,b,c);Rg(this.c,function(a,b){var c=this.o;c.size=b;this.b.progressCallback(c,a)}.bind(this))}.bind(a))}W.prototype.j=function(a){a.forEach(this.m.bind(this))};
W.prototype.m=function(a){var b=null;if(this.i){var c=this.i.filter(function(a){return"variant"==a.type})[0];c&&(b=Bc(a,c))}var d=c=null;b&&(b.audio&&(c=b.audio),b.video&&(d=b.video));tc(this.f,c,d,a);sc(a,this.a.getConfiguration().restrictions,{width:Infinity,height:Infinity})};function di(a){var b=a.f?a.f.destroy():Promise.resolve();a.f=null;a.h=null;a.l=!1;a.i=null;return b}
function ii(a){var b=a.periods.map(function(a){return a.variants}).reduce(Pa,[]).map(function(a){var b=[];a.audio&&b.push(a.audio);a.video&&b.push(a.video);return b}).reduce(Pa,[]).filter(Sa);a=a.periods.map(function(a){return a.textStreams}).reduce(Pa,[]);b.push.apply(b,a);return Promise.all(b.map(function(a){return a.createSegmentIndex()}))}
function ei(a,b,c){var d=a.h.periods.map(a.v.bind(a)),e=a.f.b,f=Ib(a.f);if(e&&a.b.usePersistentLicense){if(!f.length)throw new p(2,9,9007,b);e.initData=[]}return{originalManifestUri:b,duration:a.h.presentationTimeline.T(),size:0,expiration:a.f.qb(),periods:d,sessionIds:a.b.usePersistentLicense?f:[],drmInfo:e,appMetadata:c}}
W.prototype.v=function(a){var b=zc(a,null,null),c=Ac(a,null);b=this.b.trackSelectionCallback(b.concat(c));null==this.i&&(this.i=b,this.j(this.h.periods));for(c=b.length-1;0<c;--c){for(var d=!1,e=c-1;0<=e;--e)if(b[c].type==b[e].type&&b[c].kind==b[e].kind&&b[c].language==b[e].language){d=!0;break}if(d)break}d=[];for(c=0;c<b.length;c++){var f=Bc(a,b[c]);f?(f.audio&&((e=d.filter(function(a){return a.id==f.audio.id})[0])?e.variantIds.push(f.id):(e=f.video?f.bandwidth/2:f.bandwidth,d.push(ji(this,f.audio,
e,f.id)))),f.video&&((e=d.filter(function(a){return a.id==f.video.id})[0])?e.variantIds.push(f.id):(e=f.audio?f.bandwidth/2:f.bandwidth,d.push(ji(this,f.video,e,f.id))))):d.push(ji(this,Cc(a,b[c]),0))}return{startTime:a.startTime,streams:d}};
function ji(a,b,c,d){var e={id:b.id,primary:b.primary,presentationTimeOffset:b.presentationTimeOffset||0,contentType:b.type,mimeType:b.mimeType,codecs:b.codecs,frameRate:b.frameRate,kind:b.kind,language:b.language,label:b.label,width:b.width||null,height:b.height||null,initSegmentKey:null,encrypted:b.encrypted,keyId:b.keyId,segments:[],variantIds:[]};null!=d&&e.variantIds.push(d);d=a.h.presentationTimeline.ka();ki(b,d,function(a){var d=a.startTime,f=a.endTime;Sg(this.c,b.type,a,(f-d)*c/8,function(a){e.segments.push({startTime:d,
endTime:f,dataKey:a})})}.bind(a));(d=b.initSegmentReference)&&Sg(a.c,b.contentType,d,0,function(a){e.initSegmentKey=a});return e}function ki(a,b,c){b=a.findSegmentPosition(b);for(var d=null==b?null:a.getSegmentReference(b);d;)c(d),d=a.getSegmentReference(++b)}function X(a){if(!a.a)throw new p(2,9,9002);}
function hi(a){var b=[];a.periods.forEach(function(a){a.streams.forEach(function(a){null!=a.initSegmentKey&&b.push(a.initSegmentKey);a.segments.forEach(function(a){b.push(a.dataKey)})})});return b}W.deleteAll=function(){return ih()};Hh.offline=$h;n("shaka.polyfill.installAll",function(){for(var a=0;a<li.length;++a)li[a]()});var li=[];function mi(a){li.push(a)}n("shaka.polyfill.register",mi);function ni(a){var b=a.type.replace(/^(webkit|moz|MS)/,"").toLowerCase();if("function"===typeof Event)var c=new Event(b,a);else c=document.createEvent("Event"),c.initEvent(b,a.bubbles,a.cancelable);a.target.dispatchEvent(c)}
mi(function(){if(window.Document){var a=Element.prototype;a.requestFullscreen=a.requestFullscreen||a.mozRequestFullScreen||a.msRequestFullscreen||a.webkitRequestFullscreen;a=Document.prototype;a.exitFullscreen=a.exitFullscreen||a.mozCancelFullScreen||a.msExitFullscreen||a.webkitExitFullscreen;"fullscreenElement"in document||(Object.defineProperty(document,"fullscreenElement",{get:function(){return document.mozFullScreenElement||document.msFullscreenElement||document.webkitFullscreenElement}}),Object.defineProperty(document,
"fullscreenEnabled",{get:function(){return document.mozFullScreenEnabled||document.msFullscreenEnabled||document.webkitFullscreenEnabled}}));document.addEventListener("webkitfullscreenchange",ni);document.addEventListener("webkitfullscreenerror",ni);document.addEventListener("mozfullscreenchange",ni);document.addEventListener("mozfullscreenerror",ni);document.addEventListener("MSFullscreenChange",ni);document.addEventListener("MSFullscreenError",ni)}});mi(function(){var a=navigator.userAgent;a&&0<=a.indexOf("CrKey")&&delete window.indexedDB});var oi;function pi(a,b,c){if("input"==a)switch(this.type){case "range":a="change"}oi.call(this,a,b,c)}mi(function(){0>navigator.userAgent.indexOf("Trident/")||HTMLInputElement.prototype.addEventListener==pi||(oi=HTMLInputElement.prototype.addEventListener,HTMLInputElement.prototype.addEventListener=pi)});mi(function(){if(4503599627370497!=Math.round(4503599627370497)){var a=Math.round;Math.round=function(b){var c=b;4503599627370496>=b&&(c=a(b));return c}}});function qi(a){this.f=[];this.b=[];this.a=[];(new O).Z("pssh",this.c.bind(this)).parse(a.buffer)}qi.prototype.c=function(a){if(!(1<a.version)){var b=xb(a.s.La(16)),c=[];if(0<a.version)for(var d=a.s.C(),e=0;e<d;++e){var f=xb(a.s.La(16));c.push(f)}d=a.s.C();a.s.G(d);this.b.push.apply(this.b,c);this.f.push(b);this.a.push({start:a.start,end:a.start+a.size-1})}};function ri(a,b){try{var c=new si(a,b);return Promise.resolve(c)}catch(d){return Promise.reject(d)}}
function si(a,b){this.keySystem=a;for(var c=!1,d=0;d<b.length;++d){var e=b[d],f={audioCapabilities:[],videoCapabilities:[],persistentState:"optional",distinctiveIdentifier:"optional",initDataTypes:e.initDataTypes,sessionTypes:["temporary"],label:e.label},g=!1;if(e.audioCapabilities)for(var h=0;h<e.audioCapabilities.length;++h){var k=e.audioCapabilities[h];if(k.contentType){g=!0;var l=k.contentType.split(";")[0];MSMediaKeys.isTypeSupported(this.keySystem,l)&&(f.audioCapabilities.push(k),c=!0)}}if(e.videoCapabilities)for(h=
0;h<e.videoCapabilities.length;++h)k=e.videoCapabilities[h],k.contentType&&(g=!0,l=k.contentType.split(";")[0],MSMediaKeys.isTypeSupported(this.keySystem,l)&&(f.videoCapabilities.push(k),c=!0));g||(c=MSMediaKeys.isTypeSupported(this.keySystem,"video/mp4"));"required"==e.persistentState&&(c=!1);if(c){this.a=f;return}}c=Error("Unsupported keySystem");c.name="NotSupportedError";c.code=DOMException.NOT_SUPPORTED_ERR;throw c;}si.prototype.createMediaKeys=function(){var a=new ti(this.keySystem);return Promise.resolve(a)};
si.prototype.getConfiguration=function(){return this.a};function ui(a){var b=this.mediaKeys;b&&b!=a&&vi(b,null);delete this.mediaKeys;return(this.mediaKeys=a)?vi(a,this):Promise.resolve()}function ti(a){this.a=new MSMediaKeys(a);this.b=new bb}ti.prototype.createSession=function(a){var b=a||"temporary";if("temporary"!=b)throw new TypeError("Session type "+a+" is unsupported on this platform.");return new wi(this.a,b)};ti.prototype.setServerCertificate=function(){return Promise.resolve(!1)};
function vi(a,b){function c(){b.msSetMediaKeys(d.a);b.removeEventListener("loadedmetadata",c)}cb(a.b);if(!b)return Promise.resolve();z(a.b,b,"msneedkey",xi);var d=a;try{return 1<=b.readyState?b.msSetMediaKeys(a.a):b.addEventListener("loadedmetadata",c),Promise.resolve()}catch(e){return Promise.reject(e)}}function wi(a){G.call(this);this.c=null;this.g=a;this.b=this.a=null;this.f=new bb;this.sessionId="";this.expiration=NaN;this.closed=new u;this.keyStatuses=new yi}la(wi,G);m=wi.prototype;
m.generateRequest=function(a,b){this.a=new u;try{this.c=this.g.createSession("video/mp4",new Uint8Array(b),null),z(this.f,this.c,"mskeymessage",this.Od.bind(this)),z(this.f,this.c,"mskeyadded",this.Md.bind(this)),z(this.f,this.c,"mskeyerror",this.Nd.bind(this)),zi(this,"status-pending")}catch(c){this.a.reject(c)}return this.a};m.load=function(){return Promise.reject(Error("MediaKeySession.load not yet supported"))};m.update=function(a){this.b=new u;try{this.c.update(new Uint8Array(a))}catch(b){this.b.reject(b)}return this.b};
m.close=function(){try{this.c.close(),this.closed.resolve(),cb(this.f)}catch(a){this.closed.reject(a)}return this.closed};m.remove=function(){return Promise.reject(Error("MediaKeySession.remove is only applicable for persistent licenses, which are not supported on this platform"))};
function xi(a){var b=document.createEvent("CustomEvent");b.initCustomEvent("encrypted",!1,!1,null);b.initDataType="cenc";var c=a.initData;if(c){var d=new qi(c);if(1>=d.a.length)a=c;else{var e=[];for(a=0;a<d.a.length;a++)e.push(c.subarray(d.a[a].start,d.a[a].end+1));c=Xa(e,Ai);for(a=d=0;a<c.length;a++)d+=c[a].length;d=new Uint8Array(d);for(a=e=0;a<c.length;a++)d.set(c[a],e),e+=c[a].length;a=d}}else a=c;b.initData=a;this.dispatchEvent(b)}function Ai(a,b){return yb(a,b)}
m.Od=function(a){this.a&&(this.a.resolve(),this.a=null);this.dispatchEvent(new A("message",{messageType:void 0==this.keyStatuses.a?"licenserequest":"licenserenewal",message:a.message.buffer}))};m.Md=function(){this.a?(zi(this,"usable"),this.a.resolve(),this.a=null):this.b&&(zi(this,"usable"),this.b.resolve(),this.b=null)};
m.Nd=function(){var a=Error("EME PatchedMediaKeysMs key error");a.errorCode=this.c.error;if(null!=this.a)this.a.reject(a),this.a=null;else if(null!=this.b)this.b.reject(a),this.b=null;else switch(this.c.error.code){case MSMediaKeyError.MS_MEDIA_KEYERR_OUTPUT:case MSMediaKeyError.MS_MEDIA_KEYERR_HARDWARECHANGE:zi(this,"output-not-allowed");break;default:zi(this,"internal-error")}};function zi(a,b){var c=a.keyStatuses;c.size=void 0==b?0:1;c.a=b;a.dispatchEvent(new A("keystatuseschange"))}
function yi(){this.size=0;this.a=void 0}var Bi;m=yi.prototype;m.forEach=function(a){this.a&&a(this.a,Bi)};m.get=function(a){if(this.has(a))return this.a};m.has=function(a){var b=Bi;return this.a&&yb(new Uint8Array(a),new Uint8Array(b))?!0:!1};m.entries=function(){};m.keys=function(){};m.values=function(){};function Ci(){return Promise.reject(Error("The key system specified is not supported."))}function Di(a){return null==a?Promise.resolve():Promise.reject(Error("MediaKeys not supported."))}function Ei(){throw new TypeError("Illegal constructor.");}Ei.prototype.createSession=function(){};Ei.prototype.setServerCertificate=function(){};function Fi(){throw new TypeError("Illegal constructor.");}Fi.prototype.getConfiguration=function(){};Fi.prototype.createMediaKeys=function(){};var Gi="";function Hi(a){Gi=a;Ii=(new Uint8Array([0])).buffer;navigator.requestMediaKeySystemAccess=Ji;delete HTMLMediaElement.prototype.mediaKeys;HTMLMediaElement.prototype.mediaKeys=null;HTMLMediaElement.prototype.setMediaKeys=Ki;window.MediaKeys=Li;window.MediaKeySystemAccess=Mi}function Ni(a){var b=Gi;return b?b+a.charAt(0).toUpperCase()+a.slice(1):a}function Ji(a,b){try{var c=new Mi(a,b);return Promise.resolve(c)}catch(d){return Promise.reject(d)}}
function Ki(a){var b=this.mediaKeys;b&&b!=a&&Oi(b,null);delete this.mediaKeys;(this.mediaKeys=a)&&Oi(a,this);return Promise.resolve()}
function Mi(a,b){this.a=this.keySystem=a;var c=!1;"org.w3.clearkey"==a&&(this.a="webkit-org.w3.clearkey",c=!1);var d=!1;var e=document.getElementsByTagName("video");e=e.length?e[0]:document.createElement("video");for(var f=0;f<b.length;++f){var g=b[f],h={audioCapabilities:[],videoCapabilities:[],persistentState:"optional",distinctiveIdentifier:"optional",initDataTypes:g.initDataTypes,sessionTypes:["temporary"],label:g.label},k=!1;if(g.audioCapabilities)for(var l=0;l<g.audioCapabilities.length;++l){var q=
g.audioCapabilities[l];if(q.contentType){k=!0;var v=q.contentType.split(";")[0];e.canPlayType(v,this.a)&&(h.audioCapabilities.push(q),d=!0)}}if(g.videoCapabilities)for(l=0;l<g.videoCapabilities.length;++l)q=g.videoCapabilities[l],q.contentType&&(k=!0,e.canPlayType(q.contentType,this.a)&&(h.videoCapabilities.push(q),d=!0));k||(d=e.canPlayType("video/mp4",this.a)||e.canPlayType("video/webm",this.a));"required"==g.persistentState&&(c?(h.persistentState="required",h.sessionTypes=["persistent-license"]):
d=!1);if(d){this.b=h;return}}c="Unsupported keySystem";if("org.w3.clearkey"==a||"com.widevine.alpha"==a)c="None of the requested configurations were supported.";c=Error(c);c.name="NotSupportedError";c.code=DOMException.NOT_SUPPORTED_ERR;throw c;}Mi.prototype.createMediaKeys=function(){var a=new Li(this.a);return Promise.resolve(a)};Mi.prototype.getConfiguration=function(){return this.b};function Li(a){this.g=a;this.b=null;this.a=new bb;this.c=[];this.f={}}
function Oi(a,b){a.b=b;cb(a.a);var c=Gi;b&&(z(a.a,b,c+"needkey",a.be.bind(a)),z(a.a,b,c+"keymessage",a.ae.bind(a)),z(a.a,b,c+"keyadded",a.Zd.bind(a)),z(a.a,b,c+"keyerror",a.$d.bind(a)))}m=Li.prototype;m.createSession=function(a){var b=a||"temporary";if("temporary"!=b&&"persistent-license"!=b)throw new TypeError("Session type "+a+" is unsupported on this platform.");a=this.b||document.createElement("video");a.src||(a.src="about:blank");b=new Pi(a,this.g,b);this.c.push(b);return b};
m.setServerCertificate=function(){return Promise.resolve(!1)};m.be=function(a){var b=document.createEvent("CustomEvent");b.initCustomEvent("encrypted",!1,!1,null);b.initDataType="webm";b.initData=a.initData;this.b.dispatchEvent(b)};m.ae=function(a){var b=Qi(this,a.sessionId);b&&(a=new A("message",{messageType:void 0==b.keyStatuses.a?"licenserequest":"licenserenewal",message:a.message}),b.b&&(b.b.resolve(),b.b=null),b.dispatchEvent(a))};
m.Zd=function(a){if(a=Qi(this,a.sessionId))Ri(a,"usable"),a.a&&a.a.resolve(),a.a=null};
m.$d=function(a){var b=Qi(this,a.sessionId);if(b){var c=Error("EME v0.1b key error");c.errorCode=a.errorCode;c.errorCode.systemCode=a.systemCode;!a.sessionId&&b.b?(c.method="generateRequest",45==a.systemCode&&(c.message="Unsupported session type."),b.b.reject(c),b.b=null):a.sessionId&&b.a?(c.method="update",b.a.reject(c),b.a=null):(c=a.systemCode,a.errorCode.code==MediaKeyError.MEDIA_KEYERR_OUTPUT?Ri(b,"output-restricted"):1==c?Ri(b,"expired"):Ri(b,"internal-error"))}};
function Qi(a,b){var c=a.f[b];return c?c:(c=a.c.shift())?(c.sessionId=b,a.f[b]=c):null}function Pi(a,b,c){G.call(this);this.f=a;this.h=!1;this.a=this.b=null;this.c=b;this.g=c;this.sessionId="";this.expiration=NaN;this.closed=new u;this.keyStatuses=new Si}la(Pi,G);
function Ti(a,b,c){if(a.h)return Promise.reject(Error("The session is already initialized."));a.h=!0;try{if("persistent-license"==a.g)if(c)var d=new Uint8Array(qb("LOAD_SESSION|"+c));else{var e=qb("PERSISTENT|"),f=new Uint8Array(e.byteLength+b.byteLength);f.set(new Uint8Array(e),0);f.set(new Uint8Array(b),e.byteLength);d=f}else d=new Uint8Array(b)}catch(h){return Promise.reject(h)}a.b=new u;var g=Ni("generateKeyRequest");try{a.f[g](a.c,d)}catch(h){if("InvalidStateError"!=h.name)return a.b=null,Promise.reject(h);
setTimeout(function(){try{this.f[g](this.c,d)}catch(k){this.b.reject(k),this.b=null}}.bind(a),10)}return a.b}m=Pi.prototype;
m.cc=function(a,b){if(this.a)this.a.then(this.cc.bind(this,a,b))["catch"](this.cc.bind(this,a,b));else{this.a=a;if("webkit-org.w3.clearkey"==this.c){var c=C(b);var d=JSON.parse(c);"oct"!=d.keys[0].kty&&(this.a.reject(Error("Response is not a valid JSON Web Key Set.")),this.a=null);c=vb(d.keys[0].k);d=vb(d.keys[0].kid)}else c=new Uint8Array(b),d=null;var e=Ni("addKey");try{this.f[e](this.c,c,d,this.sessionId)}catch(f){this.a.reject(f),this.a=null}}};
function Ri(a,b){var c=a.keyStatuses;c.size=void 0==b?0:1;c.a=b;a.dispatchEvent(new A("keystatuseschange"))}m.generateRequest=function(a,b){return Ti(this,b,null)};m.load=function(a){return"persistent-license"==this.g?Ti(this,null,a):Promise.reject(Error("Not a persistent session."))};m.update=function(a){var b=new u;this.cc(b,a);return b};
m.close=function(){if("persistent-license"!=this.g){if(!this.sessionId)return this.closed.reject(Error("The session is not callable.")),this.closed;var a=Ni("cancelKeyRequest");try{this.f[a](this.c,this.sessionId)}catch(b){}}this.closed.resolve();return this.closed};m.remove=function(){return"persistent-license"!=this.g?Promise.reject(Error("Not a persistent session.")):this.close()};function Si(){this.size=0;this.a=void 0}var Ii;m=Si.prototype;m.forEach=function(a){this.a&&a(this.a,Ii)};m.get=function(a){if(this.has(a))return this.a};
m.has=function(a){var b=Ii;return this.a&&yb(new Uint8Array(a),new Uint8Array(b))?!0:!1};m.entries=function(){};m.keys=function(){};m.values=function(){};mi(function(){!window.HTMLVideoElement||navigator.requestMediaKeySystemAccess&&MediaKeySystemAccess.prototype.getConfiguration||(HTMLMediaElement.prototype.webkitGenerateKeyRequest?Hi("webkit"):HTMLMediaElement.prototype.generateKeyRequest?Hi(""):window.MSMediaKeys?(Bi=(new Uint8Array([0])).buffer,delete HTMLMediaElement.prototype.mediaKeys,HTMLMediaElement.prototype.mediaKeys=null,HTMLMediaElement.prototype.setMediaKeys=ui,window.MediaKeys=ti,window.MediaKeySystemAccess=si,navigator.requestMediaKeySystemAccess=
ri):(navigator.requestMediaKeySystemAccess=Ci,delete HTMLMediaElement.prototype.mediaKeys,HTMLMediaElement.prototype.mediaKeys=null,HTMLMediaElement.prototype.setMediaKeys=Di,window.MediaKeys=Ei,window.MediaKeySystemAccess=Fi))});function Ui(){var a=MediaSource.prototype.addSourceBuffer;MediaSource.prototype.addSourceBuffer=function(){var b=a.apply(this,arguments);b.abort=function(){};return b}}function Vi(){var a=SourceBuffer.prototype.remove;SourceBuffer.prototype.remove=function(b,c){return a.call(this,b,c-.001)}}
function Wi(){var a=MediaSource.prototype.endOfStream;MediaSource.prototype.endOfStream=function(){for(var b=0,c=0;c<this.sourceBuffers.length;++c){var f=this.sourceBuffers[c];f=f.buffered.end(f.buffered.length-1);b=Math.max(b,f)}if(!isNaN(this.duration)&&b<this.duration)for(this.pc=!0,c=0;c<this.sourceBuffers.length;++c)f=this.sourceBuffers[c],f.lc=!1;return a.apply(this,arguments)};var b=!1,c=MediaSource.prototype.addSourceBuffer;MediaSource.prototype.addSourceBuffer=function(){var a=c.apply(this,
arguments);a.mediaSource_=this;a.addEventListener("updateend",Xi,!1);b||(this.addEventListener("sourceclose",Yi,!1),b=!0);return a}}function Xi(a){var b=a.target,c=b.mediaSource_;if(c.pc){a.preventDefault();a.stopPropagation();a.stopImmediatePropagation();b.lc=!0;for(a=0;a<c.sourceBuffers.length;++a)if(0==c.sourceBuffers[a].lc)return;c.pc=!1}}
function Yi(a){a=a.target;for(var b=0;b<a.sourceBuffers.length;++b)a.sourceBuffers[b].removeEventListener("updateend",Xi,!1);a.removeEventListener("sourceclose",Yi,!1)}function Zi(){var a=MediaSource.isTypeSupported;MediaSource.isTypeSupported=function(b){return"mp2t"==b.split(/ *; */)[0].split("/")[1]?!1:a(b)}}
function $i(){var a=MediaSource.isTypeSupported,b=/^dv(?:he|av)\./;MediaSource.isTypeSupported=function(c){for(var d=c.split(/ *; */),e=d[0],f={},g=1;g<d.length;++g){var h=d[g].split("="),k=h[0];h=h[1].replace(/"(.*)"/,"$1");f[k]=h}d=f.codecs;if(!d)return a(c);var l=!1,q=!1;c=d.split(",").filter(function(a){if(b.test(a))return q=!0,!1;/^(hev|hvc)1\.2/.test(a)&&(l=!0);return!0});q&&(l=!1);f.codecs=c.join(",");l&&(f.eotf="smpte2084");for(k in f)h=f[k],e+="; "+k+'="'+h+'"';return cast.__platform__.canDisplayType(e)}}
mi(function(){if(window.MediaSource)if(window.cast&&cast.__platform__&&cast.__platform__.canDisplayType)$i();else if(navigator.vendor&&0<=navigator.vendor.indexOf("Apple")){var a=navigator.appVersion;Zi();0<=a.indexOf("Version/8")?window.MediaSource=null:0<=a.indexOf("Version/9")?Ui():0<=a.indexOf("Version/10")?(Ui(),Wi()):0<=a.indexOf("Version/11")&&(Ui(),Vi())}});function Y(a){this.c=[];this.b=[];this.W=aj;if(a)try{a(this.na.bind(this),this.a.bind(this))}catch(b){this.a(b)}}var aj=0;function bj(a){var b=new Y;b.na(void 0);return b.then(function(){return a})}function cj(a){var b=new Y;b.a(a);return b}function dj(a){function b(a,b,c){a.W==aj&&(e[b]=c,d++,d==e.length&&a.na(e))}var c=new Y;if(!a.length)return c.na([]),c;for(var d=0,e=Array(a.length),f=c.a.bind(c),g=0;g<a.length;++g)a[g]&&a[g].then?a[g].then(b.bind(null,c,g),f):b(c,g,a[g]);return c}
function ej(a){for(var b=new Y,c=b.na.bind(b),d=b.a.bind(b),e=0;e<a.length;++e)a[e]&&a[e].then?a[e].then(c,d):c(a[e]);return b}Y.prototype.then=function(a,b){var c=new Y;switch(this.W){case 1:fj(this,c,a);break;case 2:fj(this,c,b);break;case aj:this.c.push({N:c,Ab:a}),this.b.push({N:c,Ab:b})}return c};Y.prototype["catch"]=function(a){return this.then(void 0,a)};
Y.prototype.na=function(a){if(this.W==aj){this.f=a;this.W=1;for(a=0;a<this.c.length;++a)fj(this,this.c[a].N,this.c[a].Ab);this.c=[];this.b=[]}};Y.prototype.a=function(a){if(this.W==aj){this.f=a;this.W=2;for(a=0;a<this.b.length;++a)fj(this,this.b[a].N,this.b[a].Ab);this.c=[];this.b=[]}};
function fj(a,b,c){gj.push(function(){if(c&&"function"==typeof c){try{var a=c(this.f)}catch(f){b.a(f);return}try{var e=a&&a.then}catch(f){b.a(f);return}a instanceof Y?a==b?b.a(new TypeError("Chaining cycle detected")):a.then(b.na.bind(b),b.a.bind(b)):e?hj(a,e,b):b.na(a)}else 1==this.W?b.na(this.f):b.a(this.f)}.bind(a));null==ij&&(ij=jj(kj))}
function hj(a,b,c){try{var d=!1;b.call(a,function(a){if(!d){d=!0;try{var b=a&&a.then}catch(g){c.a(g);return}b?hj(a,b,c):c.na(a)}},c.a.bind(c))}catch(e){c.a(e)}}function kj(){for(;gj.length;){null!=ij&&(lj(ij),ij=null);var a=gj;gj=[];for(var b=0;b<a.length;++b)a[b]()}}function jj(){return 0}function lj(){}var ij=null,gj=[];
mi(function(a){window.setImmediate?(jj=function(a){return window.setImmediate(a)},lj=function(a){window.clearImmediate(a)}):(jj=function(a){return window.setTimeout(a,0)},lj=function(a){window.clearTimeout(a)});if(!window.Promise||a)window.Promise=Y,window.Promise.resolve=bj,window.Promise.reject=cj,window.Promise.all=dj,window.Promise.race=ej,window.Promise.prototype.then=Y.prototype.then,window.Promise.prototype["catch"]=Y.prototype["catch"]});mi(function(){if(window.HTMLMediaElement){var a=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=function(){var b=a.apply(this,arguments);b&&b["catch"](function(){});return b}}});function mj(){return{droppedVideoFrames:this.webkitDroppedFrameCount,totalVideoFrames:this.webkitDecodedFrameCount,corruptedVideoFrames:0,creationTime:NaN,totalFrameDelay:0}}mi(function(){if(window.HTMLVideoElement){var a=HTMLVideoElement.prototype;!a.getVideoPlaybackQuality&&"webkitDroppedFrameCount"in a&&(a.getVideoPlaybackQuality=mj)}});function nj(a,b,c){return new window.TextTrackCue(a,b,c)}function oj(a,b,c){return new window.TextTrackCue(a+"-"+b+"-"+c,a,b,c)}mi(function(){if(!window.VTTCue&&window.TextTrackCue){var a=TextTrackCue.length;if(3==a)window.VTTCue=nj;else if(6==a)window.VTTCue=oj;else{try{var b=!!nj(1,2,"")}catch(c){b=!1}b&&(window.VTTCue=nj)}}});function pj(){}pj.prototype.parseInit=function(){};
pj.prototype.parseMedia=function(a,b){var c=C(a),d=[],e=new DOMParser,f=null;try{f=e.parseFromString(c,"text/xml")}catch(Wc){throw new p(2,2,2005);}if(f){var g=f.getElementsByTagName("tt")[0];if(g){e=g.getAttribute("ttp:frameRate");f=g.getAttribute("ttp:subFrameRate");var h=g.getAttribute("ttp:frameRateMultiplier");var k=g.getAttribute("ttp:tickRate");c=g.getAttribute("xml:space")||"default"}else throw new p(2,2,2005);if("default"!=c&&"preserve"!=c)throw new p(2,2,2005);c="default"==c;e=new qj(e,
f,h,k);f=rj(g.getElementsByTagName("styling")[0]);h=rj(g.getElementsByTagName("layout")[0]);g=rj(g.getElementsByTagName("body")[0]);for(k=0;k<g.length;k++){var l=g[k];var q=b.periodStart;var v=e,r=f,t=h,y=c;if(l.hasAttribute("begin")||l.hasAttribute("end")||!/^\s*$/.test(l.textContent)){sj(l,y);y=tj(l.getAttribute("begin"),v);var w=tj(l.getAttribute("end"),v);v=tj(l.getAttribute("dur"),v);var Vh=l.textContent;null==w&&null!=v&&(w=y+v);if(null==y||null==w)throw new p(2,2,2001);q=new T(y+q,w+q,Vh);
y=uj(l,"region",t);t=q;"rtl"==Z(l,y,r,"tts:direction")&&(t.writingDirection=1);w=Z(l,y,r,"tts:writingMode");"tb"==w||"tblr"==w?t.writingDirection=2:"tbrl"==w?t.writingDirection=3:"rltb"==w||"rl"==w?t.writingDirection=1:w&&(t.writingDirection=oh);if(w=Z(l,y,r,"tts:origin"))w=vj.exec(w),null!=w&&(t.region.x=Number(w[1]),t.region.y=Number(w[2]));if(w=Z(l,y,r,"tts:extent"))w=vj.exec(w),null!=w&&(t.region.width=Number(w[1]),t.region.height=Number(w[2]));if(w=Z(l,y,r,"tts:textAlign"))t.positionAlign=wj[w],
t.lineAlign=xj[w],t.textAlign=uh[w.toUpperCase()];if(w=Z(l,y,r,"tts:displayAlign"))t.displayAlign=vh[w.toUpperCase()];if(w=Z(l,y,r,"tts:color"))t.color=w;if(w=Z(l,y,r,"tts:backgroundColor"))t.backgroundColor=w;if(w=Z(l,y,r,"tts:fontFamily"))t.fontFamily=w;(w=Z(l,y,r,"tts:fontWeight"))&&"bold"==w&&(t.fontWeight=700);(w=Z(l,y,r,"tts:wrapOption"))&&"noWrap"==w&&(t.wrapLine=!1);(w=Z(l,y,r,"tts:lineHeight"))&&w.match(yj)&&(t.lineHeight=w);(w=Z(l,y,r,"tts:fontSize"))&&w.match(yj)&&(t.fontSize=w);if(w=Z(l,
y,r,"tts:fontStyle"))t.fontStyle=xh[w.toUpperCase()];(y=zj(y,r,"tts:textDecoration"))&&Aj(t,y);(l=Bj(l,r,"tts:textDecoration"))&&Aj(t,l)}else q=null;q&&d.push(q)}}return d};
var Cj=/^(\d{2,}):(\d{2}):(\d{2}):(\d{2})\.?(\d+)?$/,Dj=/^(?:(\d{2,}):)?(\d{2}):(\d{2})$/,Ej=/^(?:(\d{2,}):)?(\d{2}):(\d{2}\.\d{2,})$/,Fj=/^(\d*\.?\d*)f$/,Gj=/^(\d*\.?\d*)t$/,Hj=/^(?:(\d*\.?\d*)h)?(?:(\d*\.?\d*)m)?(?:(\d*\.?\d*)s)?(?:(\d*\.?\d*)ms)?$/,vj=/^(\d{1,2}|100)% (\d{1,2}|100)%$/,yj=/^(\d+px|\d+em)$/,xj={left:"start",center:qh,right:"end",start:"start",end:"end"},wj={left:"line-left",center:"center",right:"line-right"};
function rj(a){var b=[];if(!a)return b;for(var c=a.childNodes,d=0;d<c.length;d++){var e="span"==c[d].nodeName&&"p"==a.nodeName;c[d].nodeType!=Node.ELEMENT_NODE||"br"==c[d].nodeName||e||(e=rj(c[d]),b=b.concat(e))}b.length||b.push(a);return b}function sj(a,b){for(var c=a.childNodes,d=0;d<c.length;d++)if("br"==c[d].nodeName&&0<d)c[d-1].textContent+="\n";else if(0<c[d].childNodes.length)sj(c[d],b);else if(b){var e=c[d].textContent.trim();e=e.replace(/\s+/g," ");c[d].textContent=e}}
function Aj(a,b){for(var c=b.split(" "),d=0;d<c.length;d++)switch(c[d]){case "underline":0>a.textDecoration.indexOf("underline")&&a.textDecoration.push("underline");break;case "noUnderline":0<=a.textDecoration.indexOf("underline")&&Za(a.textDecoration,"underline");break;case "lineThrough":0>a.textDecoration.indexOf("lineThrough")&&a.textDecoration.push("lineThrough");break;case "noLineThrough":0<=a.textDecoration.indexOf("lineThrough")&&Za(a.textDecoration,"lineThrough");break;case "overline":0>a.textDecoration.indexOf("overline")&&
a.textDecoration.push("overline");break;case "noOverline":0<=a.textDecoration.indexOf("overline")&&Za(a.textDecoration,"overline")}}function Z(a,b,c,d){return(a=Bj(a,c,d))?a:zj(b,c,d)}function zj(a,b,c){for(var d=rj(a),e=0;e<d.length;e++){var f=d[e].getAttribute(c);if(f)return f}return(a=uj(a,"style",b))?a.getAttribute(c):null}function Bj(a,b,c){return(a=uj(a,"style",b))?a.getAttribute(c):null}
function uj(a,b,c){if(!a||1>c.length)return null;var d=null,e=a;for(a=null;e&&!(a=e.getAttribute(b))&&(e=e.parentNode,e instanceof Element););if(b=a)for(a=0;a<c.length;a++)if(c[a].getAttribute("xml:id")==b){d=c[a];break}return d}
function tj(a,b){var c=null;if(Cj.test(a)){c=Cj.exec(a);var d=Number(c[1]),e=Number(c[2]),f=Number(c[3]),g=Number(c[4]);g+=(Number(c[5])||0)/b.b;f+=g/b.frameRate;c=f+60*e+3600*d}else Dj.test(a)?c=Ij(Dj,a):Ej.test(a)?c=Ij(Ej,a):Fj.test(a)?(c=Fj.exec(a),c=Number(c[1])/b.frameRate):Gj.test(a)?(c=Gj.exec(a),c=Number(c[1])/b.a):Hj.test(a)&&(c=Ij(Hj,a));return c}
function Ij(a,b){var c=a.exec(b);return null==c||""==c[0]?null:(Number(c[4])||0)/1E3+(Number(c[3])||0)+60*(Number(c[2])||0)+3600*(Number(c[1])||0)}function qj(a,b,c,d){this.frameRate=Number(a)||30;this.b=Number(b)||1;this.a=Number(d);0==this.a&&(this.a=a?this.frameRate*this.b:1);c&&(a=/^(\d+) (\d+)$/g.exec(c))&&(this.frameRate*=a[1]/a[2])}D["application/ttml+xml"]=pj;function Jj(){this.a=new pj}Jj.prototype.parseInit=function(a){var b=!1;(new O).B("moov",P).B("trak",P).B("mdia",P).B("minf",P).B("stbl",P).Z("stsd",Qd).B("stpp",function(a){b=!0;a.ma.stop()}).parse(a);if(!b)throw new p(2,2,2007);};Jj.prototype.parseMedia=function(a,b){var c=!1,d=[];(new O).B("mdat",Rd(function(a){c=!0;d=d.concat(this.a.parseMedia(a,b))}.bind(this))).parse(a);if(!c)throw new p(2,2,2007);return d};D['application/mp4; codecs="stpp"']=Jj;
D['application/mp4; codecs="stpp.TTML.im1t"']=Jj;function Kj(){}Kj.prototype.parseInit=function(){};
Kj.prototype.parseMedia=function(a,b){var c=C(a);c=c.replace(/\r\n|\r(?=[^\n]|$)/gm,"\n");c=c.split(/\n{2,}/m);if(!/^WEBVTT($|[ \t\n])/m.test(c[0]))throw new p(2,2,2E3);var d=b.segmentStart;if(null==d&&(d=0,0<=c[0].indexOf("X-TIMESTAMP-MAP"))){var e=c[0].match(/LOCAL:((?:(\d{1,}):)?(\d{2}):(\d{2})\.(\d{3}))/m),f=c[0].match(/MPEGTS:(\d+)/m);e&&f&&(d=Lj(new Se(e[1])),d=b.periodStart+(Number(f[1])/9E4-d))}f=[];for(e=1;e<c.length;e++){var g=c[e].split("\n"),h=d;if(1==g.length&&!g[0]||/^NOTE($|[ \t])/.test(g[0])||
"STYLE"==g[0])var k=null;else{k=null;0>g[0].indexOf("--\x3e")&&(k=g[0],g.splice(0,1));var l=new Se(g[0]),q=Lj(l),v=Te(l,/[ \t]+--\x3e[ \t]+/g),r=Lj(l);if(null==q||null==v||null==r)throw new p(2,2,2001);g=new T(q+h,r+h,g.slice(1).join("\n").trim());Te(l,/[ \t]+/gm);for(h=Ue(l);h;)Mj(g,h),Te(l,/[ \t]+/gm),h=Ue(l);null!=k&&(g.id=k);k=g}k&&f.push(k)}return f};
function Mj(a,b){var c;if(c=/^align:(start|middle|center|end|left|right)$/.exec(b))c=c[1],"middle"==c?a.textAlign=nh:a.textAlign=uh[c.toUpperCase()];else if(c=/^vertical:(lr|rl)$/.exec(b))a.writingDirection="lr"==c[1]?2:3;else if(c=/^size:([\d.]+)%$/.exec(b))a.size=Number(c[1]);else if(c=/^position:([\d.]+)%(?:,(line-left|line-right|center|start|end))?$/.exec(b))a.position=Number(c[1]),c[2]&&(c=c[2],a.positionAlign="line-left"==c||"start"==c?"line-left":"line-right"==c||"end"==c?"line-right":"center");
else if(c=/^line:([\d.]+)%(?:,(start|end|center))?$/.exec(b))a.lineInterpretation=1,a.line=Number(c[1]),c[2]&&(a.lineAlign=wh[c[2].toUpperCase()]);else if(c=/^line:(-?\d+)(?:,(start|end|center))?$/.exec(b))a.lineInterpretation=ph,a.line=Number(c[1]),c[2]&&(a.lineAlign=wh[c[2].toUpperCase()])}function Lj(a){a=Te(a,/(?:(\d{1,}):)?(\d{2}):(\d{2})\.(\d{3})/g);if(null==a)return null;var b=Number(a[2]),c=Number(a[3]);return 59<b||59<c?null:Number(a[4])/1E3+c+60*b+3600*(Number(a[1])||0)}D["text/vtt"]=Kj;
D['text/vtt; codecs="vtt"']=Kj;function Nj(){this.a=null}Nj.prototype.parseInit=function(a){var b=!1;(new O).B("moov",P).B("trak",P).B("mdia",P).Z("mdhd",function(a){0==a.version?(a.s.G(4),a.s.G(4),this.a=a.s.C(),a.s.G(4)):(a.s.G(8),a.s.G(8),this.a=a.s.C(),a.s.G(8));a.s.G(4)}.bind(this)).B("minf",P).B("stbl",P).Z("stsd",Qd).B("wvtt",function(){b=!0}).parse(a);if(!this.a)throw new p(2,2,2008);if(!b)throw new p(2,2,2008);};
Nj.prototype.parseMedia=function(a,b){if(!this.a)throw new p(2,2,2008);var c=0,d=[],e=[],f=[],g=!1,h=!1,k=!1,l=null;(new O).B("moof",P).B("traf",P).Z("tfdt",function(a){g=!0;c=0==a.version?a.s.C():a.s.Ma()}).Z("tfhd",function(a){var b=a.flags;a=a.s;a.G(4);b&1&&a.G(8);b&2&&a.G(4);l=b&8?a.C():null}).Z("trun",function(a){h=!0;var b=a.version,c=a.flags;a=a.s;var e=a.C();c&1&&a.G(4);c&4&&a.G(4);for(var f=[],g=0;g<e;g++){var k={duration:null,dc:null};c&256&&(k.duration=a.C());c&512&&a.G(4);c&1024&&a.G(4);
c&2048&&(k.dc=0==b?a.C():a.Hc());f.push(k)}d=f}).B("vtte",function(){e.push(null)}).B("vttc",Rd(function(a){e.push(a)})).B("mdat",function(a){k=!0;P(a)}).parse(a);if(!k&&!g&&!h)throw new p(2,2,2008);for(var q=c,v=0;v<d.length;v++){var r=d[v],t=e[v],y=r.duration||l;y&&(r=r.dc?c+r.dc:q,q=r+y,t&&f.push(Oj(t,b.periodStart+r/this.a,b.periodStart+q/this.a)))}return f.filter(Ra)};
function Oj(a,b,c){var d,e,f;(new O).B("payl",Rd(function(a){d=C(a)})).B("iden",Rd(function(a){e=C(a)})).B("sttg",Rd(function(a){f=C(a)})).parse(a);return d?Pj(d,e,f,b,c):null}function Pj(a,b,c,d,e){a=new T(d,e,a);b&&(a.id=b);if(c)for(b=new Se(c),c=Ue(b);c;)Mj(a,c),Te(b,/[ \t]+/gm),c=Ue(b);return a}D['application/mp4; codecs="wvtt"']=Nj;}.call(g,this));
if (typeof(module)!="undefined"&&module.exports)module.exports=g.shaka;
else if (typeof(define)!="undefined" && define.amd)define(function(){return g.shaka});
else this.shaka=g.shaka;
})();


}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],6:[function(_dereq_,module,exports){
// stats.js - http://github.com/mrdoob/stats.js
var Stats=function(){var l=Date.now(),m=l,g=0,n=Infinity,o=0,h=0,p=Infinity,q=0,r=0,s=0,f=document.createElement("div");f.id="stats";f.addEventListener("mousedown",function(b){b.preventDefault();t(++s%2)},!1);f.style.cssText="width:80px;opacity:0.9;cursor:pointer";var a=document.createElement("div");a.id="fps";a.style.cssText="padding:0 0 3px 3px;text-align:left;background-color:#002";f.appendChild(a);var i=document.createElement("div");i.id="fpsText";i.style.cssText="color:#0ff;font-family:Helvetica,Arial,sans-serif;font-size:9px;font-weight:bold;line-height:15px";
i.innerHTML="FPS";a.appendChild(i);var c=document.createElement("div");c.id="fpsGraph";c.style.cssText="position:relative;width:74px;height:30px;background-color:#0ff";for(a.appendChild(c);74>c.children.length;){var j=document.createElement("span");j.style.cssText="width:1px;height:30px;float:left;background-color:#113";c.appendChild(j)}var d=document.createElement("div");d.id="ms";d.style.cssText="padding:0 0 3px 3px;text-align:left;background-color:#020;display:none";f.appendChild(d);var k=document.createElement("div");
k.id="msText";k.style.cssText="color:#0f0;font-family:Helvetica,Arial,sans-serif;font-size:9px;font-weight:bold;line-height:15px";k.innerHTML="MS";d.appendChild(k);var e=document.createElement("div");e.id="msGraph";e.style.cssText="position:relative;width:74px;height:30px;background-color:#0f0";for(d.appendChild(e);74>e.children.length;)j=document.createElement("span"),j.style.cssText="width:1px;height:30px;float:left;background-color:#131",e.appendChild(j);var t=function(b){s=b;switch(s){case 0:a.style.display=
"block";d.style.display="none";break;case 1:a.style.display="none",d.style.display="block"}};return{REVISION:12,domElement:f,setMode:t,begin:function(){l=Date.now()},end:function(){var b=Date.now();g=b-l;n=Math.min(n,g);o=Math.max(o,g);k.textContent=g+" MS ("+n+"-"+o+")";var a=Math.min(30,30-30*(g/200));e.appendChild(e.firstChild).style.height=a+"px";r++;b>m+1E3&&(h=Math.round(1E3*r/(b-m)),p=Math.min(p,h),q=Math.max(q,h),i.textContent=h+" FPS ("+p+"-"+q+")",a=Math.min(30,30-30*(h/100)),c.appendChild(c.firstChild).style.height=
a+"px",m=b,r=0);return b},update:function(){l=this.end()}}};"object"===typeof module&&(module.exports=Stats);

},{}],7:[function(_dereq_,module,exports){
(function (global){
(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.WebVRManager = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof _dereq_=="function"&&_dereq_;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof _dereq_=="function"&&_dereq_;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
/*
 * Copyright 2015 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var Emitter = _dereq_('./emitter.js');
var Modes = _dereq_('./modes.js');
var Util = _dereq_('./util.js');

/**
 * Everything having to do with the WebVR button.
 * Emits a 'click' event when it's clicked.
 */
function ButtonManager(opt_root) {
  var root = opt_root || document.body;
  this.loadIcons_();

  // Make the fullscreen button.
  var fsButton = this.createButton();
  fsButton.src = this.ICONS.fullscreen;
  fsButton.title = 'Fullscreen mode';
  var s = fsButton.style;
  s.bottom = 0;
  s.right = 0;
  fsButton.addEventListener('click', this.createClickHandler_('fs'));
  root.appendChild(fsButton);
  this.fsButton = fsButton;

  // Make the VR button.
  var vrButton = this.createButton();
  vrButton.src = this.ICONS.cardboard;
  vrButton.title = 'Virtual reality mode';
  var s = vrButton.style;
  s.bottom = 0;
  s.right = '48px';
  vrButton.addEventListener('click', this.createClickHandler_('vr'));
  root.appendChild(vrButton);
  this.vrButton = vrButton;

  this.isVisible = true;

}
ButtonManager.prototype = new Emitter();

ButtonManager.prototype.createButton = function() {
  var button = document.createElement('img');
  button.className = 'webvr-button';
  var s = button.style;
  s.position = 'absolute';
  s.width = '24px'
  s.height = '24px';
  s.backgroundSize = 'cover';
  s.backgroundColor = 'transparent';
  s.border = 0;
  s.userSelect = 'none';
  s.webkitUserSelect = 'none';
  s.MozUserSelect = 'none';
  s.cursor = 'pointer';
  s.padding = '12px';
  s.zIndex = 1;
  s.display = 'none';
  s.boxSizing = 'content-box';

  // Prevent button from being selected and dragged.
  button.draggable = false;
  button.addEventListener('dragstart', function(e) {
    e.preventDefault();
  });

  // Style it on hover.
  button.addEventListener('mouseenter', function(e) {
    s.filter = s.webkitFilter = 'drop-shadow(0 0 5px rgba(255,255,255,1))';
  });
  button.addEventListener('mouseleave', function(e) {
    s.filter = s.webkitFilter = '';
  });
  return button;
};

ButtonManager.prototype.setMode = function(mode, isVRCompatible) {
  isVRCompatible = isVRCompatible || WebVRConfig.FORCE_ENABLE_VR;
  if (!this.isVisible) {
    return;
  }
  switch (mode) {
    case Modes.NORMAL:
      this.fsButton.style.display = 'block';
      this.fsButton.src = this.ICONS.fullscreen;
      this.vrButton.style.display = (isVRCompatible ? 'block' : 'none');
      break;
    case Modes.MAGIC_WINDOW:
      this.fsButton.style.display = 'block';
      this.fsButton.src = this.ICONS.exitFullscreen;
      this.vrButton.style.display = 'none';
      break;
    case Modes.VR:
      this.fsButton.style.display = 'none';
      this.vrButton.style.display = 'none';
      break;
  }

  // Hack for Safari Mac/iOS to force relayout (svg-specific issue)
  // http://goo.gl/hjgR6r
  var oldValue = this.fsButton.style.display;
  this.fsButton.style.display = 'inline-block';
  this.fsButton.offsetHeight;
  this.fsButton.style.display = oldValue;
};

ButtonManager.prototype.setVisibility = function(isVisible) {
  this.isVisible = isVisible;
  this.fsButton.style.display = isVisible ? 'block' : 'none';
  this.vrButton.style.display = isVisible ? 'block' : 'none';
};

ButtonManager.prototype.createClickHandler_ = function(eventName) {
  return function(e) {
    e.stopPropagation();
    e.preventDefault();
    this.emit(eventName);
  }.bind(this);
};

ButtonManager.prototype.loadIcons_ = function() {
  // Preload some hard-coded SVG.
  this.ICONS = {};
  this.ICONS.cardboard = Util.base64('image/svg+xml', 'PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNHB4IiBoZWlnaHQ9IjI0cHgiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI0ZGRkZGRiI+CiAgICA8cGF0aCBkPSJNMjAuNzQgNkgzLjIxQzIuNTUgNiAyIDYuNTcgMiA3LjI4djEwLjQ0YzAgLjcuNTUgMS4yOCAxLjIzIDEuMjhoNC43OWMuNTIgMCAuOTYtLjMzIDEuMTQtLjc5bDEuNC0zLjQ4Yy4yMy0uNTkuNzktMS4wMSAxLjQ0LTEuMDFzMS4yMS40MiAxLjQ1IDEuMDFsMS4zOSAzLjQ4Yy4xOS40Ni42My43OSAxLjExLjc5aDQuNzljLjcxIDAgMS4yNi0uNTcgMS4yNi0xLjI4VjcuMjhjMC0uNy0uNTUtMS4yOC0xLjI2LTEuMjh6TTcuNSAxNC42MmMtMS4xNyAwLTIuMTMtLjk1LTIuMTMtMi4xMiAwLTEuMTcuOTYtMi4xMyAyLjEzLTIuMTMgMS4xOCAwIDIuMTIuOTYgMi4xMiAyLjEzcy0uOTUgMi4xMi0yLjEyIDIuMTJ6bTkgMGMtMS4xNyAwLTIuMTMtLjk1LTIuMTMtMi4xMiAwLTEuMTcuOTYtMi4xMyAyLjEzLTIuMTNzMi4xMi45NiAyLjEyIDIuMTMtLjk1IDIuMTItMi4xMiAyLjEyeiIvPgogICAgPHBhdGggZmlsbD0ibm9uZSIgZD0iTTAgMGgyNHYyNEgwVjB6Ii8+Cjwvc3ZnPgo=');
  this.ICONS.fullscreen = Util.base64('image/svg+xml', 'PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNHB4IiBoZWlnaHQ9IjI0cHgiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI0ZGRkZGRiI+CiAgICA8cGF0aCBkPSJNMCAwaDI0djI0SDB6IiBmaWxsPSJub25lIi8+CiAgICA8cGF0aCBkPSJNNyAxNEg1djVoNXYtMkg3di0zem0tMi00aDJWN2gzVjVINXY1em0xMiA3aC0zdjJoNXYtNWgtMnYzek0xNCA1djJoM3YzaDJWNWgtNXoiLz4KPC9zdmc+Cg==');
  this.ICONS.exitFullscreen = Util.base64('image/svg+xml', 'PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNHB4IiBoZWlnaHQ9IjI0cHgiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI0ZGRkZGRiI+CiAgICA8cGF0aCBkPSJNMCAwaDI0djI0SDB6IiBmaWxsPSJub25lIi8+CiAgICA8cGF0aCBkPSJNNSAxNmgzdjNoMnYtNUg1djJ6bTMtOEg1djJoNVY1SDh2M3ptNiAxMWgydi0zaDN2LTJoLTV2NXptMi0xMVY1aC0ydjVoNVY4aC0zeiIvPgo8L3N2Zz4K');
  this.ICONS.settings = Util.base64('image/svg+xml', 'PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNHB4IiBoZWlnaHQ9IjI0cHgiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI0ZGRkZGRiI+CiAgICA8cGF0aCBkPSJNMCAwaDI0djI0SDB6IiBmaWxsPSJub25lIi8+CiAgICA8cGF0aCBkPSJNMTkuNDMgMTIuOThjLjA0LS4zMi4wNy0uNjQuMDctLjk4cy0uMDMtLjY2LS4wNy0uOThsMi4xMS0xLjY1Yy4xOS0uMTUuMjQtLjQyLjEyLS42NGwtMi0zLjQ2Yy0uMTItLjIyLS4zOS0uMy0uNjEtLjIybC0yLjQ5IDFjLS41Mi0uNC0xLjA4LS43My0xLjY5LS45OGwtLjM4LTIuNjVDMTQuNDYgMi4xOCAxNC4yNSAyIDE0IDJoLTRjLS4yNSAwLS40Ni4xOC0uNDkuNDJsLS4zOCAyLjY1Yy0uNjEuMjUtMS4xNy41OS0xLjY5Ljk4bC0yLjQ5LTFjLS4yMy0uMDktLjQ5IDAtLjYxLjIybC0yIDMuNDZjLS4xMy4yMi0uMDcuNDkuMTIuNjRsMi4xMSAxLjY1Yy0uMDQuMzItLjA3LjY1LS4wNy45OHMuMDMuNjYuMDcuOThsLTIuMTEgMS42NWMtLjE5LjE1LS4yNC40Mi0uMTIuNjRsMiAzLjQ2Yy4xMi4yMi4zOS4zLjYxLjIybDIuNDktMWMuNTIuNCAxLjA4LjczIDEuNjkuOThsLjM4IDIuNjVjLjAzLjI0LjI0LjQyLjQ5LjQyaDRjLjI1IDAgLjQ2LS4xOC40OS0uNDJsLjM4LTIuNjVjLjYxLS4yNSAxLjE3LS41OSAxLjY5LS45OGwyLjQ5IDFjLjIzLjA5LjQ5IDAgLjYxLS4yMmwyLTMuNDZjLjEyLS4yMi4wNy0uNDktLjEyLS42NGwtMi4xMS0xLjY1ek0xMiAxNS41Yy0xLjkzIDAtMy41LTEuNTctMy41LTMuNXMxLjU3LTMuNSAzLjUtMy41IDMuNSAxLjU3IDMuNSAzLjUtMS41NyAzLjUtMy41IDMuNXoiLz4KPC9zdmc+Cg==');
};

module.exports = ButtonManager;

},{"./emitter.js":2,"./modes.js":3,"./util.js":4}],2:[function(_dereq_,module,exports){
/*
 * Copyright 2015 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

function Emitter() {
  this.callbacks = {};
}

Emitter.prototype.emit = function(eventName) {
  var callbacks = this.callbacks[eventName];
  if (!callbacks) {
    //console.log('No valid callback specified.');
    return;
  }
  var args = [].slice.call(arguments);
  // Eliminate the first param (the callback).
  args.shift();
  for (var i = 0; i < callbacks.length; i++) {
    callbacks[i].apply(this, args);
  }
};

Emitter.prototype.on = function(eventName, callback) {
  if (eventName in this.callbacks) {
    this.callbacks[eventName].push(callback);
  } else {
    this.callbacks[eventName] = [callback];
  }
};

module.exports = Emitter;

},{}],3:[function(_dereq_,module,exports){
/*
 * Copyright 2015 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var Modes = {
  UNKNOWN: 0,
  // Not fullscreen, just tracking.
  NORMAL: 1,
  // Magic window immersive mode.
  MAGIC_WINDOW: 2,
  // Full screen split screen VR mode.
  VR: 3,
};

module.exports = Modes;

},{}],4:[function(_dereq_,module,exports){
/*
 * Copyright 2015 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var Util = {};

Util.base64 = function(mimeType, base64) {
  return 'data:' + mimeType + ';base64,' + base64;
};

Util.isMobile = function() {
  var check = false;
  (function(a){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4)))check = true})(navigator.userAgent||navigator.vendor||window.opera);
  return check;
};

Util.isFirefox = function() {
  return /firefox/i.test(navigator.userAgent);
};

Util.isIOS = function() {
  return /(iPad|iPhone|iPod)/g.test(navigator.userAgent);
};

Util.isIFrame = function() {
  try {
    return window.self !== window.top;
  } catch (e) {
    return true;
  }
};

Util.appendQueryParameter = function(url, key, value) {
  // Determine delimiter based on if the URL already GET parameters in it.
  var delimiter = (url.indexOf('?') < 0 ? '?' : '&');
  url += delimiter + key + '=' + value;
  return url;
};

// From http://goo.gl/4WX3tg
Util.getQueryParameter = function(name) {
  var name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
  var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
      results = regex.exec(location.search);
  return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
};

Util.isLandscapeMode = function() {
  return (window.orientation == 90 || window.orientation == -90);
};

Util.getScreenWidth = function() {
  return Math.max(window.screen.width, window.screen.height) *
      window.devicePixelRatio;
};

Util.getScreenHeight = function() {
  return Math.min(window.screen.width, window.screen.height) *
      window.devicePixelRatio;
};

module.exports = Util;

},{}],5:[function(_dereq_,module,exports){
/*
 * Copyright 2015 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var ButtonManager = _dereq_('./button-manager.js');
var Emitter = _dereq_('./emitter.js');
var Modes = _dereq_('./modes.js');
var Util = _dereq_('./util.js');

/**
 * Helper for getting in and out of VR mode.
 */
function WebVRManager(renderer, effect, params) {
  this.params = params || {};

  this.mode = Modes.UNKNOWN;

  // Set option to hide the button.
  this.hideButton = this.params.hideButton || false;
  // Whether or not the FOV should be distorted or un-distorted. By default, it
  // should be distorted, but in the case of vertex shader based distortion,
  // ensure that we use undistorted parameters.
  this.predistorted = !!this.params.predistorted;

  // Save the THREE.js renderer and effect for later.
  this.renderer = renderer;
  this.effect = effect;
  var polyfillWrapper = document.querySelector('.webvr-polyfill-fullscreen-wrapper');
  this.button = new ButtonManager(polyfillWrapper);

  this.isFullscreenDisabled = !!Util.getQueryParameter('no_fullscreen');
  this.startMode = Modes.NORMAL;
  var startModeParam = parseInt(Util.getQueryParameter('start_mode'));
  if (!isNaN(startModeParam)) {
    this.startMode = startModeParam;
  }

  if (this.hideButton) {
    this.button.setVisibility(false);
  }

  // Check if the browser is compatible with WebVR.
  this.getDeviceByType_(VRDisplay).then(function(hmd) {
    this.hmd = hmd;

    // Only enable VR mode if there's a VR device attached or we are running the
    // polyfill on mobile.
    if (!this.isVRCompatibleOverride) {
      this.isVRCompatible =  !hmd.isPolyfilled || Util.isMobile();
    }

    switch (this.startMode) {
      case Modes.MAGIC_WINDOW:
        this.setMode_(Modes.MAGIC_WINDOW);
        break;
      case Modes.VR:
        this.enterVRMode_();
        this.setMode_(Modes.VR);
        break;
      default:
        this.setMode_(Modes.NORMAL);
    }

    this.emit('initialized');
  }.bind(this));

  // Hook up button listeners.
  this.button.on('fs', this.onFSClick_.bind(this));
  this.button.on('vr', this.onVRClick_.bind(this));

  // Bind to fullscreen events.
  document.addEventListener('webkitfullscreenchange',
      this.onFullscreenChange_.bind(this));
  document.addEventListener('mozfullscreenchange',
      this.onFullscreenChange_.bind(this));
  document.addEventListener('msfullscreenchange',
      this.onFullscreenChange_.bind(this));

  // Bind to VR* specific events.
  window.addEventListener('vrdisplaypresentchange',
      this.onVRDisplayPresentChange_.bind(this));
  window.addEventListener('vrdisplaydeviceparamschange',
      this.onVRDisplayDeviceParamsChange_.bind(this));
}

WebVRManager.prototype = new Emitter();

// Expose these values externally.
WebVRManager.Modes = Modes;

WebVRManager.prototype.render = function(scene, camera, timestamp) {
  // Scene may be an array of two scenes, one for each eye.
  if (scene instanceof Array) {
    this.effect.render(scene[0], camera);
  } else {
    this.effect.render(scene, camera);
  }
};

WebVRManager.prototype.setVRCompatibleOverride = function(isVRCompatible) {
  this.isVRCompatible = isVRCompatible;
  this.isVRCompatibleOverride = true;

  // Don't actually change modes, just update the buttons.
  this.button.setMode(this.mode, this.isVRCompatible);
};

WebVRManager.prototype.setFullscreenCallback = function(callback) {
  this.fullscreenCallback = callback;
};

WebVRManager.prototype.setVRCallback = function(callback) {
  this.vrCallback = callback;
};

WebVRManager.prototype.setExitFullscreenCallback = function(callback) {
  this.exitFullscreenCallback = callback;
}

/**
 * Promise returns true if there is at least one HMD device available.
 */
WebVRManager.prototype.getDeviceByType_ = function(type) {
  return new Promise(function(resolve, reject) {
    navigator.getVRDisplays().then(function(displays) {
      // Promise succeeds, but check if there are any displays actually.
      for (var i = 0; i < displays.length; i++) {
        if (displays[i] instanceof type) {
          resolve(displays[i]);
          break;
        }
      }
      resolve(null);
    }, function() {
      // No displays are found.
      resolve(null);
    });
  });
};

/**
 * Helper for entering VR mode.
 */
WebVRManager.prototype.enterVRMode_ = function() {
  this.hmd.requestPresent([{
    source: this.renderer.domElement,
    predistorted: this.predistorted
  }]);
};

WebVRManager.prototype.setMode_ = function(mode) {
  var oldMode = this.mode;
  if (mode == this.mode) {
    console.warn('Not changing modes, already in %s', mode);
    return;
  }
  // console.log('Mode change: %s => %s', this.mode, mode);
  this.mode = mode;
  this.button.setMode(mode, this.isVRCompatible);

  // Emit an event indicating the mode changed.
  this.emit('modechange', mode, oldMode);
};

/**
 * Main button was clicked.
 */
WebVRManager.prototype.onFSClick_ = function() {
  switch (this.mode) {
    case Modes.NORMAL:
      // TODO: Remove this hack if/when iOS gets real fullscreen mode.
      // If this is an iframe on iOS, break out and open in no_fullscreen mode.
      if (Util.isIOS() && Util.isIFrame()) {
        if (this.fullscreenCallback) {
          this.fullscreenCallback();
        } else {
          var url = window.location.href;
          url = Util.appendQueryParameter(url, 'no_fullscreen', 'true');
          url = Util.appendQueryParameter(url, 'start_mode', Modes.MAGIC_WINDOW);
          top.location.href = url;
          return;
        }
      }
      this.setMode_(Modes.MAGIC_WINDOW);
      this.requestFullscreen_();
      break;
    case Modes.MAGIC_WINDOW:
      if (this.isFullscreenDisabled) {
        window.history.back();
        return;
      }
      if (this.exitFullscreenCallback) {
        this.exitFullscreenCallback();
      }
      this.setMode_(Modes.NORMAL);
      this.exitFullscreen_();
      break;
  }
};

/**
 * The VR button was clicked.
 */
WebVRManager.prototype.onVRClick_ = function() {
  // TODO: Remove this hack when iOS has fullscreen mode.
  // If this is an iframe on iOS, break out and open in no_fullscreen mode.
  if (this.mode == Modes.NORMAL && Util.isIOS() && Util.isIFrame()) {
    if (this.vrCallback) {
      this.vrCallback();
    } else {
      var url = window.location.href;
      url = Util.appendQueryParameter(url, 'no_fullscreen', 'true');
      url = Util.appendQueryParameter(url, 'start_mode', Modes.VR);
      top.location.href = url;
      return;
    }
  }
  this.enterVRMode_();
};

WebVRManager.prototype.requestFullscreen_ = function() {
  var canvas = document.body;
  //var canvas = this.renderer.domElement;
  if (canvas.requestFullscreen) {
    canvas.requestFullscreen();
  } else if (canvas.mozRequestFullScreen) {
    canvas.mozRequestFullScreen();
  } else if (canvas.webkitRequestFullscreen) {
    canvas.webkitRequestFullscreen();
  } else if (canvas.msRequestFullscreen) {
    canvas.msRequestFullscreen();
  }
};

WebVRManager.prototype.exitFullscreen_ = function() {
  if (document.exitFullscreen) {
    document.exitFullscreen();
  } else if (document.mozCancelFullScreen) {
    document.mozCancelFullScreen();
  } else if (document.webkitExitFullscreen) {
    document.webkitExitFullscreen();
  } else if (document.msExitFullscreen) {
    document.msExitFullscreen();
  }
};

WebVRManager.prototype.onVRDisplayPresentChange_ = function(e) {
  console.log('onVRDisplayPresentChange_', e);
  if (this.hmd.isPresenting) {
    this.setMode_(Modes.VR);
  } else {
    this.setMode_(Modes.NORMAL);
  }
};

WebVRManager.prototype.onVRDisplayDeviceParamsChange_ = function(e) {
  console.log('onVRDisplayDeviceParamsChange_', e);
};

WebVRManager.prototype.onFullscreenChange_ = function(e) {
  // If we leave full-screen, go back to normal mode.
  if (document.webkitFullscreenElement === null ||
      document.mozFullScreenElement === null) {
    this.setMode_(Modes.NORMAL);
  }
};

module.exports = WebVRManager;

},{"./button-manager.js":1,"./emitter.js":2,"./modes.js":3,"./util.js":4}]},{},[5])(5)
});
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],8:[function(_dereq_,module,exports){
(function (global){
/**
 * @license
 * webvr-polyfill
 * Copyright (c) 2015-2017 Google
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @license
 * cardboard-vr-display
 * Copyright (c) 2015-2017 Google
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @license
 * webvr-polyfill-dpdb 
 * Copyright (c) 2017 Google
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @license
 * wglu-preserve-state
 * Copyright (c) 2016, Brandon Jones.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

/**
 * @license
 * nosleep.js
 * Copyright (c) 2017, Rich Tibbett
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(global.WebVRPolyfill = factory());
}(this, (function () { 'use strict';

var commonjsGlobal = typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

var Util = window.Util || {};
Util.clamp = function (value, min, max) {
  return Math.min(Math.max(min, value), max);
};
Util.race = function (promises) {
  if (Promise.race) {
    return Promise.race(promises);
  }
  return new Promise(function (resolve, reject) {
    for (var i = 0; i < promises.length; i++) {
      promises[i].then(resolve, reject);
    }
  });
};
Util.isIOS = function () {
  return (/iPad|iPhone|iPod/.test(navigator.platform)
  );
};
Util.isMobile = function () {
  return (/Android/i.test(navigator.userAgent) || /iPhone|iPad|iPod/i.test(navigator.userAgent)
  );
};
Util.copyArray = function (source, dest) {
  for (var i = 0, n = source.length; i < n; i++) {
    dest[i] = source[i];
  }
};
Util.extend = function (dest, src) {
  for (var key in src) {
    if (src.hasOwnProperty(key)) {
      dest[key] = src[key];
    }
  }
  return dest;
};
Util.isFullScreenAvailable = function () {
  return document.fullscreenEnabled || document.mozFullScreenEnabled || document.webkitFullscreenEnabled || false;
};
var util = Util;

var Util$1 = window.Util || {};
Util$1.MIN_TIMESTEP = 0.001;
Util$1.MAX_TIMESTEP = 1;
Util$1.base64 = function(mimeType, base64) {
  return 'data:' + mimeType + ';base64,' + base64;
};
Util$1.clamp = function(value, min, max) {
  return Math.min(Math.max(min, value), max);
};
Util$1.lerp = function(a, b, t) {
  return a + ((b - a) * t);
};
Util$1.race = function(promises) {
  if (Promise.race) {
    return Promise.race(promises);
  }
  return new Promise(function (resolve, reject) {
    for (var i = 0; i < promises.length; i++) {
      promises[i].then(resolve, reject);
    }
  });
};
Util$1.isIOS = (function() {
  var isIOS = /iPad|iPhone|iPod/.test(navigator.platform);
  return function() {
    return isIOS;
  };
})();
Util$1.isWebViewAndroid = (function() {
  var isWebViewAndroid = navigator.userAgent.indexOf('Version') !== -1 &&
      navigator.userAgent.indexOf('Android') !== -1 &&
      navigator.userAgent.indexOf('Chrome') !== -1;
  return function() {
    return isWebViewAndroid;
  };
})();
Util$1.isSafari = (function() {
  var isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  return function() {
    return isSafari;
  };
})();
Util$1.isFirefoxAndroid = (function() {
  var isFirefoxAndroid = navigator.userAgent.indexOf('Firefox') !== -1 &&
      navigator.userAgent.indexOf('Android') !== -1;
  return function() {
    return isFirefoxAndroid;
  };
})();
Util$1.isR7 = (function() {
  var isR7 = navigator.userAgent.indexOf('R7 Build') !== -1;
  return function() {
    return isR7;
  };
})();
Util$1.isLandscapeMode = function() {
  var rtn = (window.orientation == 90 || window.orientation == -90);
  return Util$1.isR7() ? !rtn : rtn;
};
Util$1.isTimestampDeltaValid = function(timestampDeltaS) {
  if (isNaN(timestampDeltaS)) {
    return false;
  }
  if (timestampDeltaS <= Util$1.MIN_TIMESTEP) {
    return false;
  }
  if (timestampDeltaS > Util$1.MAX_TIMESTEP) {
    return false;
  }
  return true;
};
Util$1.getScreenWidth = function() {
  return Math.max(window.screen.width, window.screen.height) *
      window.devicePixelRatio;
};
Util$1.getScreenHeight = function() {
  return Math.min(window.screen.width, window.screen.height) *
      window.devicePixelRatio;
};
Util$1.requestFullscreen = function(element) {
  if (Util$1.isWebViewAndroid()) {
      return false;
  }
  if (element.requestFullscreen) {
    element.requestFullscreen();
  } else if (element.webkitRequestFullscreen) {
    element.webkitRequestFullscreen();
  } else if (element.mozRequestFullScreen) {
    element.mozRequestFullScreen();
  } else if (element.msRequestFullscreen) {
    element.msRequestFullscreen();
  } else {
    return false;
  }
  return true;
};
Util$1.exitFullscreen = function() {
  if (document.exitFullscreen) {
    document.exitFullscreen();
  } else if (document.webkitExitFullscreen) {
    document.webkitExitFullscreen();
  } else if (document.mozCancelFullScreen) {
    document.mozCancelFullScreen();
  } else if (document.msExitFullscreen) {
    document.msExitFullscreen();
  } else {
    return false;
  }
  return true;
};
Util$1.getFullscreenElement = function() {
  return document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.mozFullScreenElement ||
      document.msFullscreenElement;
};
Util$1.linkProgram = function(gl, vertexSource, fragmentSource, attribLocationMap) {
  var vertexShader = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vertexShader, vertexSource);
  gl.compileShader(vertexShader);
  var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fragmentShader, fragmentSource);
  gl.compileShader(fragmentShader);
  var program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  for (var attribName in attribLocationMap)
    gl.bindAttribLocation(program, attribLocationMap[attribName], attribName);
  gl.linkProgram(program);
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);
  return program;
};
Util$1.getProgramUniforms = function(gl, program) {
  var uniforms = {};
  var uniformCount = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
  var uniformName = '';
  for (var i = 0; i < uniformCount; i++) {
    var uniformInfo = gl.getActiveUniform(program, i);
    uniformName = uniformInfo.name.replace('[0]', '');
    uniforms[uniformName] = gl.getUniformLocation(program, uniformName);
  }
  return uniforms;
};
Util$1.orthoMatrix = function (out, left, right, bottom, top, near, far) {
  var lr = 1 / (left - right),
      bt = 1 / (bottom - top),
      nf = 1 / (near - far);
  out[0] = -2 * lr;
  out[1] = 0;
  out[2] = 0;
  out[3] = 0;
  out[4] = 0;
  out[5] = -2 * bt;
  out[6] = 0;
  out[7] = 0;
  out[8] = 0;
  out[9] = 0;
  out[10] = 2 * nf;
  out[11] = 0;
  out[12] = (left + right) * lr;
  out[13] = (top + bottom) * bt;
  out[14] = (far + near) * nf;
  out[15] = 1;
  return out;
};
Util$1.copyArray = function (source, dest) {
  for (var i = 0, n = source.length; i < n; i++) {
    dest[i] = source[i];
  }
};
Util$1.isMobile = function() {
  var check = false;
  (function(a){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4)))check = true;})(navigator.userAgent||navigator.vendor||window.opera);
  return check;
};
Util$1.extend = function(dest, src) {
  for (var key in src) {
    if (src.hasOwnProperty(key)) {
      dest[key] = src[key];
    }
  }
  return dest;
};
Util$1.safariCssSizeWorkaround = function(canvas) {
  if (Util$1.isIOS()) {
    var width = canvas.style.width;
    var height = canvas.style.height;
    canvas.style.width = (parseInt(width) + 1) + 'px';
    canvas.style.height = (parseInt(height)) + 'px';
    setTimeout(function() {
      canvas.style.width = width;
      canvas.style.height = height;
    }, 100);
  }
  window.Util = Util$1;
  window.canvas = canvas;
};
Util$1.frameDataFromPose = (function() {
  var piOver180 = Math.PI / 180.0;
  var rad45 = Math.PI * 0.25;
  function mat4_perspectiveFromFieldOfView(out, fov, near, far) {
    var upTan = Math.tan(fov ? (fov.upDegrees * piOver180) : rad45),
    downTan = Math.tan(fov ? (fov.downDegrees * piOver180) : rad45),
    leftTan = Math.tan(fov ? (fov.leftDegrees * piOver180) : rad45),
    rightTan = Math.tan(fov ? (fov.rightDegrees * piOver180) : rad45),
    xScale = 2.0 / (leftTan + rightTan),
    yScale = 2.0 / (upTan + downTan);
    out[0] = xScale;
    out[1] = 0.0;
    out[2] = 0.0;
    out[3] = 0.0;
    out[4] = 0.0;
    out[5] = yScale;
    out[6] = 0.0;
    out[7] = 0.0;
    out[8] = -((leftTan - rightTan) * xScale * 0.5);
    out[9] = ((upTan - downTan) * yScale * 0.5);
    out[10] = far / (near - far);
    out[11] = -1.0;
    out[12] = 0.0;
    out[13] = 0.0;
    out[14] = (far * near) / (near - far);
    out[15] = 0.0;
    return out;
  }
  function mat4_fromRotationTranslation(out, q, v) {
    var x = q[0], y = q[1], z = q[2], w = q[3],
        x2 = x + x,
        y2 = y + y,
        z2 = z + z,
        xx = x * x2,
        xy = x * y2,
        xz = x * z2,
        yy = y * y2,
        yz = y * z2,
        zz = z * z2,
        wx = w * x2,
        wy = w * y2,
        wz = w * z2;
    out[0] = 1 - (yy + zz);
    out[1] = xy + wz;
    out[2] = xz - wy;
    out[3] = 0;
    out[4] = xy - wz;
    out[5] = 1 - (xx + zz);
    out[6] = yz + wx;
    out[7] = 0;
    out[8] = xz + wy;
    out[9] = yz - wx;
    out[10] = 1 - (xx + yy);
    out[11] = 0;
    out[12] = v[0];
    out[13] = v[1];
    out[14] = v[2];
    out[15] = 1;
    return out;
  }
  function mat4_translate(out, a, v) {
    var x = v[0], y = v[1], z = v[2],
        a00, a01, a02, a03,
        a10, a11, a12, a13,
        a20, a21, a22, a23;
    if (a === out) {
      out[12] = a[0] * x + a[4] * y + a[8] * z + a[12];
      out[13] = a[1] * x + a[5] * y + a[9] * z + a[13];
      out[14] = a[2] * x + a[6] * y + a[10] * z + a[14];
      out[15] = a[3] * x + a[7] * y + a[11] * z + a[15];
    } else {
      a00 = a[0]; a01 = a[1]; a02 = a[2]; a03 = a[3];
      a10 = a[4]; a11 = a[5]; a12 = a[6]; a13 = a[7];
      a20 = a[8]; a21 = a[9]; a22 = a[10]; a23 = a[11];
      out[0] = a00; out[1] = a01; out[2] = a02; out[3] = a03;
      out[4] = a10; out[5] = a11; out[6] = a12; out[7] = a13;
      out[8] = a20; out[9] = a21; out[10] = a22; out[11] = a23;
      out[12] = a00 * x + a10 * y + a20 * z + a[12];
      out[13] = a01 * x + a11 * y + a21 * z + a[13];
      out[14] = a02 * x + a12 * y + a22 * z + a[14];
      out[15] = a03 * x + a13 * y + a23 * z + a[15];
    }
    return out;
  }
  function mat4_invert(out, a) {
    var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3],
        a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
        a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11],
        a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15],
        b00 = a00 * a11 - a01 * a10,
        b01 = a00 * a12 - a02 * a10,
        b02 = a00 * a13 - a03 * a10,
        b03 = a01 * a12 - a02 * a11,
        b04 = a01 * a13 - a03 * a11,
        b05 = a02 * a13 - a03 * a12,
        b06 = a20 * a31 - a21 * a30,
        b07 = a20 * a32 - a22 * a30,
        b08 = a20 * a33 - a23 * a30,
        b09 = a21 * a32 - a22 * a31,
        b10 = a21 * a33 - a23 * a31,
        b11 = a22 * a33 - a23 * a32,
        det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
    if (!det) {
      return null;
    }
    det = 1.0 / det;
    out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
    out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
    out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
    out[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
    out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
    out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
    out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
    out[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
    out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
    out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
    out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
    out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
    out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
    out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
    out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
    out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;
    return out;
  }
  var defaultOrientation = new Float32Array([0, 0, 0, 1]);
  var defaultPosition = new Float32Array([0, 0, 0]);
  function updateEyeMatrices(projection, view, pose, parameters, vrDisplay) {
    mat4_perspectiveFromFieldOfView(projection, parameters ? parameters.fieldOfView : null, vrDisplay.depthNear, vrDisplay.depthFar);
    var orientation = pose.orientation || defaultOrientation;
    var position = pose.position || defaultPosition;
    mat4_fromRotationTranslation(view, orientation, position);
    if (parameters)
      mat4_translate(view, view, parameters.offset);
    mat4_invert(view, view);
  }
  return function(frameData, pose, vrDisplay) {
    if (!frameData || !pose)
      return false;
    frameData.pose = pose;
    frameData.timestamp = pose.timestamp;
    updateEyeMatrices(
        frameData.leftProjectionMatrix, frameData.leftViewMatrix,
        pose, vrDisplay.getEyeParameters("left"), vrDisplay);
    updateEyeMatrices(
        frameData.rightProjectionMatrix, frameData.rightViewMatrix,
        pose, vrDisplay.getEyeParameters("right"), vrDisplay);
    return true;
  };
})();
Util$1.isInsideCrossDomainIFrame = function() {
  var isFramed = (window.self !== window.top);
  var refDomain = Util$1.getDomainFromUrl(document.referrer);
  var thisDomain = Util$1.getDomainFromUrl(window.location.href);
  return isFramed && (refDomain !== thisDomain);
};
Util$1.getDomainFromUrl = function(url) {
  var domain;
  if (url.indexOf("://") > -1) {
    domain = url.split('/')[2];
  }
  else {
    domain = url.split('/')[0];
  }
  domain = domain.split(':')[0];
  return domain;
};
Util$1.getQuaternionAngle = function(quat) {
  if (quat.w > 1) {
    console.warn('getQuaternionAngle: w > 1');
    return 0;
  }
  var angle = 2 * Math.acos(quat.w);
  return angle;
};
var util$2 = Util$1;

function WGLUPreserveGLState(gl, bindings, callback) {
  if (!bindings) {
    callback(gl);
    return;
  }
  var boundValues = [];
  var activeTexture = null;
  for (var i = 0; i < bindings.length; ++i) {
    var binding = bindings[i];
    switch (binding) {
      case gl.TEXTURE_BINDING_2D:
      case gl.TEXTURE_BINDING_CUBE_MAP:
        var textureUnit = bindings[++i];
        if (textureUnit < gl.TEXTURE0 || textureUnit > gl.TEXTURE31) {
          console.error("TEXTURE_BINDING_2D or TEXTURE_BINDING_CUBE_MAP must be followed by a valid texture unit");
          boundValues.push(null, null);
          break;
        }
        if (!activeTexture) {
          activeTexture = gl.getParameter(gl.ACTIVE_TEXTURE);
        }
        gl.activeTexture(textureUnit);
        boundValues.push(gl.getParameter(binding), null);
        break;
      case gl.ACTIVE_TEXTURE:
        activeTexture = gl.getParameter(gl.ACTIVE_TEXTURE);
        boundValues.push(null);
        break;
      default:
        boundValues.push(gl.getParameter(binding));
        break;
    }
  }
  callback(gl);
  for (var i = 0; i < bindings.length; ++i) {
    var binding = bindings[i];
    var boundValue = boundValues[i];
    switch (binding) {
      case gl.ACTIVE_TEXTURE:
        break;
      case gl.ARRAY_BUFFER_BINDING:
        gl.bindBuffer(gl.ARRAY_BUFFER, boundValue);
        break;
      case gl.COLOR_CLEAR_VALUE:
        gl.clearColor(boundValue[0], boundValue[1], boundValue[2], boundValue[3]);
        break;
      case gl.COLOR_WRITEMASK:
        gl.colorMask(boundValue[0], boundValue[1], boundValue[2], boundValue[3]);
        break;
      case gl.CURRENT_PROGRAM:
        gl.useProgram(boundValue);
        break;
      case gl.ELEMENT_ARRAY_BUFFER_BINDING:
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, boundValue);
        break;
      case gl.FRAMEBUFFER_BINDING:
        gl.bindFramebuffer(gl.FRAMEBUFFER, boundValue);
        break;
      case gl.RENDERBUFFER_BINDING:
        gl.bindRenderbuffer(gl.RENDERBUFFER, boundValue);
        break;
      case gl.TEXTURE_BINDING_2D:
        var textureUnit = bindings[++i];
        if (textureUnit < gl.TEXTURE0 || textureUnit > gl.TEXTURE31)
          break;
        gl.activeTexture(textureUnit);
        gl.bindTexture(gl.TEXTURE_2D, boundValue);
        break;
      case gl.TEXTURE_BINDING_CUBE_MAP:
        var textureUnit = bindings[++i];
        if (textureUnit < gl.TEXTURE0 || textureUnit > gl.TEXTURE31)
          break;
        gl.activeTexture(textureUnit);
        gl.bindTexture(gl.TEXTURE_CUBE_MAP, boundValue);
        break;
      case gl.VIEWPORT:
        gl.viewport(boundValue[0], boundValue[1], boundValue[2], boundValue[3]);
        break;
      case gl.BLEND:
      case gl.CULL_FACE:
      case gl.DEPTH_TEST:
      case gl.SCISSOR_TEST:
      case gl.STENCIL_TEST:
        if (boundValue) {
          gl.enable(binding);
        } else {
          gl.disable(binding);
        }
        break;
      default:
        console.log("No GL restore behavior for 0x" + binding.toString(16));
        break;
    }
    if (activeTexture) {
      gl.activeTexture(activeTexture);
    }
  }
}
var glPreserveState = WGLUPreserveGLState;

var distortionVS = [
  'attribute vec2 position;',
  'attribute vec3 texCoord;',
  'varying vec2 vTexCoord;',
  'uniform vec4 viewportOffsetScale[2];',
  'void main() {',
  '  vec4 viewport = viewportOffsetScale[int(texCoord.z)];',
  '  vTexCoord = (texCoord.xy * viewport.zw) + viewport.xy;',
  '  gl_Position = vec4( position, 1.0, 1.0 );',
  '}',
].join('\n');
var distortionFS = [
  'precision mediump float;',
  'uniform sampler2D diffuse;',
  'varying vec2 vTexCoord;',
  'void main() {',
  '  gl_FragColor = texture2D(diffuse, vTexCoord);',
  '}',
].join('\n');
function CardboardDistorter(gl, cardboardUI, bufferScale, dirtySubmitFrameBindings) {
  this.gl = gl;
  this.cardboardUI = cardboardUI;
  this.bufferScale = bufferScale;
  this.dirtySubmitFrameBindings = dirtySubmitFrameBindings;
  this.ctxAttribs = gl.getContextAttributes();
  this.meshWidth = 20;
  this.meshHeight = 20;
  this.bufferWidth = gl.drawingBufferWidth;
  this.bufferHeight = gl.drawingBufferHeight;
  this.realBindFramebuffer = gl.bindFramebuffer;
  this.realEnable = gl.enable;
  this.realDisable = gl.disable;
  this.realColorMask = gl.colorMask;
  this.realClearColor = gl.clearColor;
  this.realViewport = gl.viewport;
  if (!util$2.isIOS()) {
    this.realCanvasWidth = Object.getOwnPropertyDescriptor(gl.canvas.__proto__, 'width');
    this.realCanvasHeight = Object.getOwnPropertyDescriptor(gl.canvas.__proto__, 'height');
  }
  this.isPatched = false;
  this.lastBoundFramebuffer = null;
  this.cullFace = false;
  this.depthTest = false;
  this.blend = false;
  this.scissorTest = false;
  this.stencilTest = false;
  this.viewport = [0, 0, 0, 0];
  this.colorMask = [true, true, true, true];
  this.clearColor = [0, 0, 0, 0];
  this.attribs = {
    position: 0,
    texCoord: 1
  };
  this.program = util$2.linkProgram(gl, distortionVS, distortionFS, this.attribs);
  this.uniforms = util$2.getProgramUniforms(gl, this.program);
  this.viewportOffsetScale = new Float32Array(8);
  this.setTextureBounds();
  this.vertexBuffer = gl.createBuffer();
  this.indexBuffer = gl.createBuffer();
  this.indexCount = 0;
  this.renderTarget = gl.createTexture();
  this.framebuffer = gl.createFramebuffer();
  this.depthStencilBuffer = null;
  this.depthBuffer = null;
  this.stencilBuffer = null;
  if (this.ctxAttribs.depth && this.ctxAttribs.stencil) {
    this.depthStencilBuffer = gl.createRenderbuffer();
  } else if (this.ctxAttribs.depth) {
    this.depthBuffer = gl.createRenderbuffer();
  } else if (this.ctxAttribs.stencil) {
    this.stencilBuffer = gl.createRenderbuffer();
  }
  this.patch();
  this.onResize();
}
CardboardDistorter.prototype.destroy = function() {
  var gl = this.gl;
  this.unpatch();
  gl.deleteProgram(this.program);
  gl.deleteBuffer(this.vertexBuffer);
  gl.deleteBuffer(this.indexBuffer);
  gl.deleteTexture(this.renderTarget);
  gl.deleteFramebuffer(this.framebuffer);
  if (this.depthStencilBuffer) {
    gl.deleteRenderbuffer(this.depthStencilBuffer);
  }
  if (this.depthBuffer) {
    gl.deleteRenderbuffer(this.depthBuffer);
  }
  if (this.stencilBuffer) {
    gl.deleteRenderbuffer(this.stencilBuffer);
  }
  if (this.cardboardUI) {
    this.cardboardUI.destroy();
  }
};
CardboardDistorter.prototype.onResize = function() {
  var gl = this.gl;
  var self = this;
  var glState = [
    gl.RENDERBUFFER_BINDING,
    gl.TEXTURE_BINDING_2D, gl.TEXTURE0
  ];
  glPreserveState(gl, glState, function(gl) {
    self.realBindFramebuffer.call(gl, gl.FRAMEBUFFER, null);
    if (self.scissorTest) { self.realDisable.call(gl, gl.SCISSOR_TEST); }
    self.realColorMask.call(gl, true, true, true, true);
    self.realViewport.call(gl, 0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    self.realClearColor.call(gl, 0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    self.realBindFramebuffer.call(gl, gl.FRAMEBUFFER, self.framebuffer);
    gl.bindTexture(gl.TEXTURE_2D, self.renderTarget);
    gl.texImage2D(gl.TEXTURE_2D, 0, self.ctxAttribs.alpha ? gl.RGBA : gl.RGB,
        self.bufferWidth, self.bufferHeight, 0,
        self.ctxAttribs.alpha ? gl.RGBA : gl.RGB, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, self.renderTarget, 0);
    if (self.ctxAttribs.depth && self.ctxAttribs.stencil) {
      gl.bindRenderbuffer(gl.RENDERBUFFER, self.depthStencilBuffer);
      gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_STENCIL,
          self.bufferWidth, self.bufferHeight);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_STENCIL_ATTACHMENT,
          gl.RENDERBUFFER, self.depthStencilBuffer);
    } else if (self.ctxAttribs.depth) {
      gl.bindRenderbuffer(gl.RENDERBUFFER, self.depthBuffer);
      gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16,
          self.bufferWidth, self.bufferHeight);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT,
          gl.RENDERBUFFER, self.depthBuffer);
    } else if (self.ctxAttribs.stencil) {
      gl.bindRenderbuffer(gl.RENDERBUFFER, self.stencilBuffer);
      gl.renderbufferStorage(gl.RENDERBUFFER, gl.STENCIL_INDEX8,
          self.bufferWidth, self.bufferHeight);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.STENCIL_ATTACHMENT,
          gl.RENDERBUFFER, self.stencilBuffer);
    }
    if (!gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE) {
      console.error('Framebuffer incomplete!');
    }
    self.realBindFramebuffer.call(gl, gl.FRAMEBUFFER, self.lastBoundFramebuffer);
    if (self.scissorTest) { self.realEnable.call(gl, gl.SCISSOR_TEST); }
    self.realColorMask.apply(gl, self.colorMask);
    self.realViewport.apply(gl, self.viewport);
    self.realClearColor.apply(gl, self.clearColor);
  });
  if (this.cardboardUI) {
    this.cardboardUI.onResize();
  }
};
CardboardDistorter.prototype.patch = function() {
  if (this.isPatched) {
    return;
  }
  var self = this;
  var canvas = this.gl.canvas;
  var gl = this.gl;
  if (!util$2.isIOS()) {
    canvas.width = util$2.getScreenWidth() * this.bufferScale;
    canvas.height = util$2.getScreenHeight() * this.bufferScale;
    Object.defineProperty(canvas, 'width', {
      configurable: true,
      enumerable: true,
      get: function() {
        return self.bufferWidth;
      },
      set: function(value) {
        self.bufferWidth = value;
        self.realCanvasWidth.set.call(canvas, value);
        self.onResize();
      }
    });
    Object.defineProperty(canvas, 'height', {
      configurable: true,
      enumerable: true,
      get: function() {
        return self.bufferHeight;
      },
      set: function(value) {
        self.bufferHeight = value;
        self.realCanvasHeight.set.call(canvas, value);
        self.onResize();
      }
    });
  }
  this.lastBoundFramebuffer = gl.getParameter(gl.FRAMEBUFFER_BINDING);
  if (this.lastBoundFramebuffer == null) {
    this.lastBoundFramebuffer = this.framebuffer;
    this.gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
  }
  this.gl.bindFramebuffer = function(target, framebuffer) {
    self.lastBoundFramebuffer = framebuffer ? framebuffer : self.framebuffer;
    self.realBindFramebuffer.call(gl, target, self.lastBoundFramebuffer);
  };
  this.cullFace = gl.getParameter(gl.CULL_FACE);
  this.depthTest = gl.getParameter(gl.DEPTH_TEST);
  this.blend = gl.getParameter(gl.BLEND);
  this.scissorTest = gl.getParameter(gl.SCISSOR_TEST);
  this.stencilTest = gl.getParameter(gl.STENCIL_TEST);
  gl.enable = function(pname) {
    switch (pname) {
      case gl.CULL_FACE: self.cullFace = true; break;
      case gl.DEPTH_TEST: self.depthTest = true; break;
      case gl.BLEND: self.blend = true; break;
      case gl.SCISSOR_TEST: self.scissorTest = true; break;
      case gl.STENCIL_TEST: self.stencilTest = true; break;
    }
    self.realEnable.call(gl, pname);
  };
  gl.disable = function(pname) {
    switch (pname) {
      case gl.CULL_FACE: self.cullFace = false; break;
      case gl.DEPTH_TEST: self.depthTest = false; break;
      case gl.BLEND: self.blend = false; break;
      case gl.SCISSOR_TEST: self.scissorTest = false; break;
      case gl.STENCIL_TEST: self.stencilTest = false; break;
    }
    self.realDisable.call(gl, pname);
  };
  this.colorMask = gl.getParameter(gl.COLOR_WRITEMASK);
  gl.colorMask = function(r, g, b, a) {
    self.colorMask[0] = r;
    self.colorMask[1] = g;
    self.colorMask[2] = b;
    self.colorMask[3] = a;
    self.realColorMask.call(gl, r, g, b, a);
  };
  this.clearColor = gl.getParameter(gl.COLOR_CLEAR_VALUE);
  gl.clearColor = function(r, g, b, a) {
    self.clearColor[0] = r;
    self.clearColor[1] = g;
    self.clearColor[2] = b;
    self.clearColor[3] = a;
    self.realClearColor.call(gl, r, g, b, a);
  };
  this.viewport = gl.getParameter(gl.VIEWPORT);
  gl.viewport = function(x, y, w, h) {
    self.viewport[0] = x;
    self.viewport[1] = y;
    self.viewport[2] = w;
    self.viewport[3] = h;
    self.realViewport.call(gl, x, y, w, h);
  };
  this.isPatched = true;
  util$2.safariCssSizeWorkaround(canvas);
};
CardboardDistorter.prototype.unpatch = function() {
  if (!this.isPatched) {
    return;
  }
  var gl = this.gl;
  var canvas = this.gl.canvas;
  if (!util$2.isIOS()) {
    Object.defineProperty(canvas, 'width', this.realCanvasWidth);
    Object.defineProperty(canvas, 'height', this.realCanvasHeight);
  }
  canvas.width = this.bufferWidth;
  canvas.height = this.bufferHeight;
  gl.bindFramebuffer = this.realBindFramebuffer;
  gl.enable = this.realEnable;
  gl.disable = this.realDisable;
  gl.colorMask = this.realColorMask;
  gl.clearColor = this.realClearColor;
  gl.viewport = this.realViewport;
  if (this.lastBoundFramebuffer == this.framebuffer) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }
  this.isPatched = false;
  setTimeout(function() {
    util$2.safariCssSizeWorkaround(canvas);
  }, 1);
};
CardboardDistorter.prototype.setTextureBounds = function(leftBounds, rightBounds) {
  if (!leftBounds) {
    leftBounds = [0, 0, 0.5, 1];
  }
  if (!rightBounds) {
    rightBounds = [0.5, 0, 0.5, 1];
  }
  this.viewportOffsetScale[0] = leftBounds[0];
  this.viewportOffsetScale[1] = leftBounds[1];
  this.viewportOffsetScale[2] = leftBounds[2];
  this.viewportOffsetScale[3] = leftBounds[3];
  this.viewportOffsetScale[4] = rightBounds[0];
  this.viewportOffsetScale[5] = rightBounds[1];
  this.viewportOffsetScale[6] = rightBounds[2];
  this.viewportOffsetScale[7] = rightBounds[3];
};
CardboardDistorter.prototype.submitFrame = function() {
  var gl = this.gl;
  var self = this;
  var glState = [];
  if (!this.dirtySubmitFrameBindings) {
    glState.push(
      gl.CURRENT_PROGRAM,
      gl.ARRAY_BUFFER_BINDING,
      gl.ELEMENT_ARRAY_BUFFER_BINDING,
      gl.TEXTURE_BINDING_2D, gl.TEXTURE0
    );
  }
  glPreserveState(gl, glState, function(gl) {
    self.realBindFramebuffer.call(gl, gl.FRAMEBUFFER, null);
    if (self.cullFace) { self.realDisable.call(gl, gl.CULL_FACE); }
    if (self.depthTest) { self.realDisable.call(gl, gl.DEPTH_TEST); }
    if (self.blend) { self.realDisable.call(gl, gl.BLEND); }
    if (self.scissorTest) { self.realDisable.call(gl, gl.SCISSOR_TEST); }
    if (self.stencilTest) { self.realDisable.call(gl, gl.STENCIL_TEST); }
    self.realColorMask.call(gl, true, true, true, true);
    self.realViewport.call(gl, 0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    if (self.ctxAttribs.alpha || util$2.isIOS()) {
      self.realClearColor.call(gl, 0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
    }
    gl.useProgram(self.program);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, self.indexBuffer);
    gl.bindBuffer(gl.ARRAY_BUFFER, self.vertexBuffer);
    gl.enableVertexAttribArray(self.attribs.position);
    gl.enableVertexAttribArray(self.attribs.texCoord);
    gl.vertexAttribPointer(self.attribs.position, 2, gl.FLOAT, false, 20, 0);
    gl.vertexAttribPointer(self.attribs.texCoord, 3, gl.FLOAT, false, 20, 8);
    gl.activeTexture(gl.TEXTURE0);
    gl.uniform1i(self.uniforms.diffuse, 0);
    gl.bindTexture(gl.TEXTURE_2D, self.renderTarget);
    gl.uniform4fv(self.uniforms.viewportOffsetScale, self.viewportOffsetScale);
    gl.drawElements(gl.TRIANGLES, self.indexCount, gl.UNSIGNED_SHORT, 0);
    if (self.cardboardUI) {
      self.cardboardUI.renderNoState();
    }
    self.realBindFramebuffer.call(self.gl, gl.FRAMEBUFFER, self.framebuffer);
    if (!self.ctxAttribs.preserveDrawingBuffer) {
      self.realClearColor.call(gl, 0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
    }
    if (!self.dirtySubmitFrameBindings) {
      self.realBindFramebuffer.call(gl, gl.FRAMEBUFFER, self.lastBoundFramebuffer);
    }
    if (self.cullFace) { self.realEnable.call(gl, gl.CULL_FACE); }
    if (self.depthTest) { self.realEnable.call(gl, gl.DEPTH_TEST); }
    if (self.blend) { self.realEnable.call(gl, gl.BLEND); }
    if (self.scissorTest) { self.realEnable.call(gl, gl.SCISSOR_TEST); }
    if (self.stencilTest) { self.realEnable.call(gl, gl.STENCIL_TEST); }
    self.realColorMask.apply(gl, self.colorMask);
    self.realViewport.apply(gl, self.viewport);
    if (self.ctxAttribs.alpha || !self.ctxAttribs.preserveDrawingBuffer) {
      self.realClearColor.apply(gl, self.clearColor);
    }
  });
  if (util$2.isIOS()) {
    var canvas = gl.canvas;
    if (canvas.width != self.bufferWidth || canvas.height != self.bufferHeight) {
      self.bufferWidth = canvas.width;
      self.bufferHeight = canvas.height;
      self.onResize();
    }
  }
};
CardboardDistorter.prototype.updateDeviceInfo = function(deviceInfo) {
  var gl = this.gl;
  var self = this;
  var glState = [gl.ARRAY_BUFFER_BINDING, gl.ELEMENT_ARRAY_BUFFER_BINDING];
  glPreserveState(gl, glState, function(gl) {
    var vertices = self.computeMeshVertices_(self.meshWidth, self.meshHeight, deviceInfo);
    gl.bindBuffer(gl.ARRAY_BUFFER, self.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    if (!self.indexCount) {
      var indices = self.computeMeshIndices_(self.meshWidth, self.meshHeight);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, self.indexBuffer);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
      self.indexCount = indices.length;
    }
  });
};
CardboardDistorter.prototype.computeMeshVertices_ = function(width, height, deviceInfo) {
  var vertices = new Float32Array(2 * width * height * 5);
  var lensFrustum = deviceInfo.getLeftEyeVisibleTanAngles();
  var noLensFrustum = deviceInfo.getLeftEyeNoLensTanAngles();
  var viewport = deviceInfo.getLeftEyeVisibleScreenRect(noLensFrustum);
  var vidx = 0;
  for (var e = 0; e < 2; e++) {
    for (var j = 0; j < height; j++) {
      for (var i = 0; i < width; i++, vidx++) {
        var u = i / (width - 1);
        var v = j / (height - 1);
        var s = u;
        var t = v;
        var x = util$2.lerp(lensFrustum[0], lensFrustum[2], u);
        var y = util$2.lerp(lensFrustum[3], lensFrustum[1], v);
        var d = Math.sqrt(x * x + y * y);
        var r = deviceInfo.distortion.distortInverse(d);
        var p = x * r / d;
        var q = y * r / d;
        u = (p - noLensFrustum[0]) / (noLensFrustum[2] - noLensFrustum[0]);
        v = (q - noLensFrustum[3]) / (noLensFrustum[1] - noLensFrustum[3]);
        var aspect = deviceInfo.device.widthMeters / deviceInfo.device.heightMeters;
        u = (viewport.x + u * viewport.width - 0.5) * 2.0;
        v = (viewport.y + v * viewport.height - 0.5) * 2.0;
        vertices[(vidx * 5) + 0] = u;
        vertices[(vidx * 5) + 1] = v;
        vertices[(vidx * 5) + 2] = s;
        vertices[(vidx * 5) + 3] = t;
        vertices[(vidx * 5) + 4] = e;
      }
    }
    var w = lensFrustum[2] - lensFrustum[0];
    lensFrustum[0] = -(w + lensFrustum[0]);
    lensFrustum[2] = w - lensFrustum[2];
    w = noLensFrustum[2] - noLensFrustum[0];
    noLensFrustum[0] = -(w + noLensFrustum[0]);
    noLensFrustum[2] = w - noLensFrustum[2];
    viewport.x = 1 - (viewport.x + viewport.width);
  }
  return vertices;
};
CardboardDistorter.prototype.computeMeshIndices_ = function(width, height) {
  var indices = new Uint16Array(2 * (width - 1) * (height - 1) * 6);
  var halfwidth = width / 2;
  var halfheight = height / 2;
  var vidx = 0;
  var iidx = 0;
  for (var e = 0; e < 2; e++) {
    for (var j = 0; j < height; j++) {
      for (var i = 0; i < width; i++, vidx++) {
        if (i == 0 || j == 0)
          continue;
        if ((i <= halfwidth) == (j <= halfheight)) {
          indices[iidx++] = vidx;
          indices[iidx++] = vidx - width - 1;
          indices[iidx++] = vidx - width;
          indices[iidx++] = vidx - width - 1;
          indices[iidx++] = vidx;
          indices[iidx++] = vidx - 1;
        } else {
          indices[iidx++] = vidx - 1;
          indices[iidx++] = vidx - width;
          indices[iidx++] = vidx;
          indices[iidx++] = vidx - width;
          indices[iidx++] = vidx - 1;
          indices[iidx++] = vidx - width - 1;
        }
      }
    }
  }
  return indices;
};
CardboardDistorter.prototype.getOwnPropertyDescriptor_ = function(proto, attrName) {
  var descriptor = Object.getOwnPropertyDescriptor(proto, attrName);
  if (descriptor.get === undefined || descriptor.set === undefined) {
    descriptor.configurable = true;
    descriptor.enumerable = true;
    descriptor.get = function() {
      return this.getAttribute(attrName);
    };
    descriptor.set = function(val) {
      this.setAttribute(attrName, val);
    };
  }
  return descriptor;
};
var cardboardDistorter = CardboardDistorter;

var uiVS = [
  'attribute vec2 position;',
  'uniform mat4 projectionMat;',
  'void main() {',
  '  gl_Position = projectionMat * vec4( position, -1.0, 1.0 );',
  '}',
].join('\n');
var uiFS = [
  'precision mediump float;',
  'uniform vec4 color;',
  'void main() {',
  '  gl_FragColor = color;',
  '}',
].join('\n');
var DEG2RAD = Math.PI/180.0;
var kAnglePerGearSection = 60;
var kOuterRimEndAngle = 12;
var kInnerRimBeginAngle = 20;
var kOuterRadius = 1;
var kMiddleRadius = 0.75;
var kInnerRadius = 0.3125;
var kCenterLineThicknessDp = 4;
var kButtonWidthDp = 28;
var kTouchSlopFactor = 1.5;
function CardboardUI(gl) {
  this.gl = gl;
  this.attribs = {
    position: 0
  };
  this.program = util$2.linkProgram(gl, uiVS, uiFS, this.attribs);
  this.uniforms = util$2.getProgramUniforms(gl, this.program);
  this.vertexBuffer = gl.createBuffer();
  this.gearOffset = 0;
  this.gearVertexCount = 0;
  this.arrowOffset = 0;
  this.arrowVertexCount = 0;
  this.projMat = new Float32Array(16);
  this.listener = null;
  this.onResize();
}
CardboardUI.prototype.destroy = function() {
  var gl = this.gl;
  if (this.listener) {
    gl.canvas.removeEventListener('click', this.listener, false);
  }
  gl.deleteProgram(this.program);
  gl.deleteBuffer(this.vertexBuffer);
};
CardboardUI.prototype.listen = function(optionsCallback, backCallback) {
  var canvas = this.gl.canvas;
  this.listener = function(event) {
    var midline = canvas.clientWidth / 2;
    var buttonSize = kButtonWidthDp * kTouchSlopFactor;
    if (event.clientX > midline - buttonSize &&
        event.clientX < midline + buttonSize &&
        event.clientY > canvas.clientHeight - buttonSize) {
      optionsCallback(event);
    }
    else if (event.clientX < buttonSize && event.clientY < buttonSize) {
      backCallback(event);
    }
  };
  canvas.addEventListener('click', this.listener, false);
};
CardboardUI.prototype.onResize = function() {
  var gl = this.gl;
  var self = this;
  var glState = [
    gl.ARRAY_BUFFER_BINDING
  ];
  glPreserveState(gl, glState, function(gl) {
    var vertices = [];
    var midline = gl.drawingBufferWidth / 2;
    var physicalPixels = Math.max(screen.width, screen.height) * window.devicePixelRatio;
    var scalingRatio = gl.drawingBufferWidth / physicalPixels;
    var dps = scalingRatio *  window.devicePixelRatio;
    var lineWidth = kCenterLineThicknessDp * dps / 2;
    var buttonSize = kButtonWidthDp * kTouchSlopFactor * dps;
    var buttonScale = kButtonWidthDp * dps / 2;
    var buttonBorder = ((kButtonWidthDp * kTouchSlopFactor) - kButtonWidthDp) * dps;
    vertices.push(midline - lineWidth, buttonSize);
    vertices.push(midline - lineWidth, gl.drawingBufferHeight);
    vertices.push(midline + lineWidth, buttonSize);
    vertices.push(midline + lineWidth, gl.drawingBufferHeight);
    self.gearOffset = (vertices.length / 2);
    function addGearSegment(theta, r) {
      var angle = (90 - theta) * DEG2RAD;
      var x = Math.cos(angle);
      var y = Math.sin(angle);
      vertices.push(kInnerRadius * x * buttonScale + midline, kInnerRadius * y * buttonScale + buttonScale);
      vertices.push(r * x * buttonScale + midline, r * y * buttonScale + buttonScale);
    }
    for (var i = 0; i <= 6; i++) {
      var segmentTheta = i * kAnglePerGearSection;
      addGearSegment(segmentTheta, kOuterRadius);
      addGearSegment(segmentTheta + kOuterRimEndAngle, kOuterRadius);
      addGearSegment(segmentTheta + kInnerRimBeginAngle, kMiddleRadius);
      addGearSegment(segmentTheta + (kAnglePerGearSection - kInnerRimBeginAngle), kMiddleRadius);
      addGearSegment(segmentTheta + (kAnglePerGearSection - kOuterRimEndAngle), kOuterRadius);
    }
    self.gearVertexCount = (vertices.length / 2) - self.gearOffset;
    self.arrowOffset = (vertices.length / 2);
    function addArrowVertex(x, y) {
      vertices.push(buttonBorder + x, gl.drawingBufferHeight - buttonBorder - y);
    }
    var angledLineWidth = lineWidth / Math.sin(45 * DEG2RAD);
    addArrowVertex(0, buttonScale);
    addArrowVertex(buttonScale, 0);
    addArrowVertex(buttonScale + angledLineWidth, angledLineWidth);
    addArrowVertex(angledLineWidth, buttonScale + angledLineWidth);
    addArrowVertex(angledLineWidth, buttonScale - angledLineWidth);
    addArrowVertex(0, buttonScale);
    addArrowVertex(buttonScale, buttonScale * 2);
    addArrowVertex(buttonScale + angledLineWidth, (buttonScale * 2) - angledLineWidth);
    addArrowVertex(angledLineWidth, buttonScale - angledLineWidth);
    addArrowVertex(0, buttonScale);
    addArrowVertex(angledLineWidth, buttonScale - lineWidth);
    addArrowVertex(kButtonWidthDp * dps, buttonScale - lineWidth);
    addArrowVertex(angledLineWidth, buttonScale + lineWidth);
    addArrowVertex(kButtonWidthDp * dps, buttonScale + lineWidth);
    self.arrowVertexCount = (vertices.length / 2) - self.arrowOffset;
    gl.bindBuffer(gl.ARRAY_BUFFER, self.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
  });
};
CardboardUI.prototype.render = function() {
  var gl = this.gl;
  var self = this;
  var glState = [
    gl.CULL_FACE,
    gl.DEPTH_TEST,
    gl.BLEND,
    gl.SCISSOR_TEST,
    gl.STENCIL_TEST,
    gl.COLOR_WRITEMASK,
    gl.VIEWPORT,
    gl.CURRENT_PROGRAM,
    gl.ARRAY_BUFFER_BINDING
  ];
  glPreserveState(gl, glState, function(gl) {
    gl.disable(gl.CULL_FACE);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
    gl.disable(gl.SCISSOR_TEST);
    gl.disable(gl.STENCIL_TEST);
    gl.colorMask(true, true, true, true);
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    self.renderNoState();
  });
};
CardboardUI.prototype.renderNoState = function() {
  var gl = this.gl;
  gl.useProgram(this.program);
  gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
  gl.enableVertexAttribArray(this.attribs.position);
  gl.vertexAttribPointer(this.attribs.position, 2, gl.FLOAT, false, 8, 0);
  gl.uniform4f(this.uniforms.color, 1.0, 1.0, 1.0, 1.0);
  util$2.orthoMatrix(this.projMat, 0, gl.drawingBufferWidth, 0, gl.drawingBufferHeight, 0.1, 1024.0);
  gl.uniformMatrix4fv(this.uniforms.projectionMat, false, this.projMat);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  gl.drawArrays(gl.TRIANGLE_STRIP, this.gearOffset, this.gearVertexCount);
  gl.drawArrays(gl.TRIANGLE_STRIP, this.arrowOffset, this.arrowVertexCount);
};
var cardboardUi = CardboardUI;

function Distortion(coefficients) {
  this.coefficients = coefficients;
}
Distortion.prototype.distortInverse = function(radius) {
  var r0 = 0;
  var r1 = 1;
  var dr0 = radius - this.distort(r0);
  while (Math.abs(r1 - r0) > 0.0001             ) {
    var dr1 = radius - this.distort(r1);
    var r2 = r1 - dr1 * ((r1 - r0) / (dr1 - dr0));
    r0 = r1;
    r1 = r2;
    dr0 = dr1;
  }
  return r1;
};
Distortion.prototype.distort = function(radius) {
  var r2 = radius * radius;
  var ret = 0;
  for (var i = 0; i < this.coefficients.length; i++) {
    ret = r2 * (ret + this.coefficients[i]);
  }
  return (ret + 1) * radius;
};
var distortion = Distortion;

var MathUtil = window.MathUtil || {};
MathUtil.degToRad = Math.PI / 180;
MathUtil.radToDeg = 180 / Math.PI;
MathUtil.Vector2 = function ( x, y ) {
  this.x = x || 0;
  this.y = y || 0;
};
MathUtil.Vector2.prototype = {
  constructor: MathUtil.Vector2,
  set: function ( x, y ) {
    this.x = x;
    this.y = y;
    return this;
  },
  copy: function ( v ) {
    this.x = v.x;
    this.y = v.y;
    return this;
  },
  subVectors: function ( a, b ) {
    this.x = a.x - b.x;
    this.y = a.y - b.y;
    return this;
  },
};
MathUtil.Vector3 = function ( x, y, z ) {
  this.x = x || 0;
  this.y = y || 0;
  this.z = z || 0;
};
MathUtil.Vector3.prototype = {
  constructor: MathUtil.Vector3,
  set: function ( x, y, z ) {
    this.x = x;
    this.y = y;
    this.z = z;
    return this;
  },
  copy: function ( v ) {
    this.x = v.x;
    this.y = v.y;
    this.z = v.z;
    return this;
  },
  length: function () {
    return Math.sqrt( this.x * this.x + this.y * this.y + this.z * this.z );
  },
  normalize: function () {
    var scalar = this.length();
    if ( scalar !== 0 ) {
      var invScalar = 1 / scalar;
      this.multiplyScalar(invScalar);
    } else {
      this.x = 0;
      this.y = 0;
      this.z = 0;
    }
    return this;
  },
  multiplyScalar: function ( scalar ) {
    this.x *= scalar;
    this.y *= scalar;
    this.z *= scalar;
  },
  applyQuaternion: function ( q ) {
    var x = this.x;
    var y = this.y;
    var z = this.z;
    var qx = q.x;
    var qy = q.y;
    var qz = q.z;
    var qw = q.w;
    var ix =  qw * x + qy * z - qz * y;
    var iy =  qw * y + qz * x - qx * z;
    var iz =  qw * z + qx * y - qy * x;
    var iw = - qx * x - qy * y - qz * z;
    this.x = ix * qw + iw * - qx + iy * - qz - iz * - qy;
    this.y = iy * qw + iw * - qy + iz * - qx - ix * - qz;
    this.z = iz * qw + iw * - qz + ix * - qy - iy * - qx;
    return this;
  },
  dot: function ( v ) {
    return this.x * v.x + this.y * v.y + this.z * v.z;
  },
  crossVectors: function ( a, b ) {
    var ax = a.x, ay = a.y, az = a.z;
    var bx = b.x, by = b.y, bz = b.z;
    this.x = ay * bz - az * by;
    this.y = az * bx - ax * bz;
    this.z = ax * by - ay * bx;
    return this;
  },
};
MathUtil.Quaternion = function ( x, y, z, w ) {
  this.x = x || 0;
  this.y = y || 0;
  this.z = z || 0;
  this.w = ( w !== undefined ) ? w : 1;
};
MathUtil.Quaternion.prototype = {
  constructor: MathUtil.Quaternion,
  set: function ( x, y, z, w ) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.w = w;
    return this;
  },
  copy: function ( quaternion ) {
    this.x = quaternion.x;
    this.y = quaternion.y;
    this.z = quaternion.z;
    this.w = quaternion.w;
    return this;
  },
  setFromEulerXYZ: function( x, y, z ) {
    var c1 = Math.cos( x / 2 );
    var c2 = Math.cos( y / 2 );
    var c3 = Math.cos( z / 2 );
    var s1 = Math.sin( x / 2 );
    var s2 = Math.sin( y / 2 );
    var s3 = Math.sin( z / 2 );
    this.x = s1 * c2 * c3 + c1 * s2 * s3;
    this.y = c1 * s2 * c3 - s1 * c2 * s3;
    this.z = c1 * c2 * s3 + s1 * s2 * c3;
    this.w = c1 * c2 * c3 - s1 * s2 * s3;
    return this;
  },
  setFromEulerYXZ: function( x, y, z ) {
    var c1 = Math.cos( x / 2 );
    var c2 = Math.cos( y / 2 );
    var c3 = Math.cos( z / 2 );
    var s1 = Math.sin( x / 2 );
    var s2 = Math.sin( y / 2 );
    var s3 = Math.sin( z / 2 );
    this.x = s1 * c2 * c3 + c1 * s2 * s3;
    this.y = c1 * s2 * c3 - s1 * c2 * s3;
    this.z = c1 * c2 * s3 - s1 * s2 * c3;
    this.w = c1 * c2 * c3 + s1 * s2 * s3;
    return this;
  },
  setFromAxisAngle: function ( axis, angle ) {
    var halfAngle = angle / 2, s = Math.sin( halfAngle );
    this.x = axis.x * s;
    this.y = axis.y * s;
    this.z = axis.z * s;
    this.w = Math.cos( halfAngle );
    return this;
  },
  multiply: function ( q ) {
    return this.multiplyQuaternions( this, q );
  },
  multiplyQuaternions: function ( a, b ) {
    var qax = a.x, qay = a.y, qaz = a.z, qaw = a.w;
    var qbx = b.x, qby = b.y, qbz = b.z, qbw = b.w;
    this.x = qax * qbw + qaw * qbx + qay * qbz - qaz * qby;
    this.y = qay * qbw + qaw * qby + qaz * qbx - qax * qbz;
    this.z = qaz * qbw + qaw * qbz + qax * qby - qay * qbx;
    this.w = qaw * qbw - qax * qbx - qay * qby - qaz * qbz;
    return this;
  },
  inverse: function () {
    this.x *= -1;
    this.y *= -1;
    this.z *= -1;
    this.normalize();
    return this;
  },
  normalize: function () {
    var l = Math.sqrt( this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w );
    if ( l === 0 ) {
      this.x = 0;
      this.y = 0;
      this.z = 0;
      this.w = 1;
    } else {
      l = 1 / l;
      this.x = this.x * l;
      this.y = this.y * l;
      this.z = this.z * l;
      this.w = this.w * l;
    }
    return this;
  },
  slerp: function ( qb, t ) {
    if ( t === 0 ) return this;
    if ( t === 1 ) return this.copy( qb );
    var x = this.x, y = this.y, z = this.z, w = this.w;
    var cosHalfTheta = w * qb.w + x * qb.x + y * qb.y + z * qb.z;
    if ( cosHalfTheta < 0 ) {
      this.w = - qb.w;
      this.x = - qb.x;
      this.y = - qb.y;
      this.z = - qb.z;
      cosHalfTheta = - cosHalfTheta;
    } else {
      this.copy( qb );
    }
    if ( cosHalfTheta >= 1.0 ) {
      this.w = w;
      this.x = x;
      this.y = y;
      this.z = z;
      return this;
    }
    var halfTheta = Math.acos( cosHalfTheta );
    var sinHalfTheta = Math.sqrt( 1.0 - cosHalfTheta * cosHalfTheta );
    if ( Math.abs( sinHalfTheta ) < 0.001 ) {
      this.w = 0.5 * ( w + this.w );
      this.x = 0.5 * ( x + this.x );
      this.y = 0.5 * ( y + this.y );
      this.z = 0.5 * ( z + this.z );
      return this;
    }
    var ratioA = Math.sin( ( 1 - t ) * halfTheta ) / sinHalfTheta,
    ratioB = Math.sin( t * halfTheta ) / sinHalfTheta;
    this.w = ( w * ratioA + this.w * ratioB );
    this.x = ( x * ratioA + this.x * ratioB );
    this.y = ( y * ratioA + this.y * ratioB );
    this.z = ( z * ratioA + this.z * ratioB );
    return this;
  },
  setFromUnitVectors: function () {
    var v1, r;
    var EPS = 0.000001;
    return function ( vFrom, vTo ) {
      if ( v1 === undefined ) v1 = new MathUtil.Vector3();
      r = vFrom.dot( vTo ) + 1;
      if ( r < EPS ) {
        r = 0;
        if ( Math.abs( vFrom.x ) > Math.abs( vFrom.z ) ) {
          v1.set( - vFrom.y, vFrom.x, 0 );
        } else {
          v1.set( 0, - vFrom.z, vFrom.y );
        }
      } else {
        v1.crossVectors( vFrom, vTo );
      }
      this.x = v1.x;
      this.y = v1.y;
      this.z = v1.z;
      this.w = r;
      this.normalize();
      return this;
    }
  }(),
};
var mathUtil = MathUtil;

function Device(params) {
  this.width = params.width || util$2.getScreenWidth();
  this.height = params.height || util$2.getScreenHeight();
  this.widthMeters = params.widthMeters;
  this.heightMeters = params.heightMeters;
  this.bevelMeters = params.bevelMeters;
}
var DEFAULT_ANDROID = new Device({
  widthMeters: 0.110,
  heightMeters: 0.062,
  bevelMeters: 0.004
});
var DEFAULT_IOS = new Device({
  widthMeters: 0.1038,
  heightMeters: 0.0584,
  bevelMeters: 0.004
});
var Viewers = {
  CardboardV1: new CardboardViewer({
    id: 'CardboardV1',
    label: 'Cardboard I/O 2014',
    fov: 40,
    interLensDistance: 0.060,
    baselineLensDistance: 0.035,
    screenLensDistance: 0.042,
    distortionCoefficients: [0.441, 0.156],
    inverseCoefficients: [-0.4410035, 0.42756155, -0.4804439, 0.5460139,
      -0.58821183, 0.5733938, -0.48303202, 0.33299083, -0.17573841,
      0.0651772, -0.01488963, 0.001559834]
  }),
  CardboardV2: new CardboardViewer({
    id: 'CardboardV2',
    label: 'Cardboard I/O 2015',
    fov: 60,
    interLensDistance: 0.064,
    baselineLensDistance: 0.035,
    screenLensDistance: 0.039,
    distortionCoefficients: [0.34, 0.55],
    inverseCoefficients: [-0.33836704, -0.18162185, 0.862655, -1.2462051,
      1.0560602, -0.58208317, 0.21609078, -0.05444823, 0.009177956,
      -9.904169E-4, 6.183535E-5, -1.6981803E-6]
  })
};
function DeviceInfo(deviceParams) {
  this.viewer = Viewers.CardboardV2;
  this.updateDeviceParams(deviceParams);
  this.distortion = new distortion(this.viewer.distortionCoefficients);
}
DeviceInfo.prototype.updateDeviceParams = function(deviceParams) {
  this.device = this.determineDevice_(deviceParams) || this.device;
};
DeviceInfo.prototype.getDevice = function() {
  return this.device;
};
DeviceInfo.prototype.setViewer = function(viewer) {
  this.viewer = viewer;
  this.distortion = new distortion(this.viewer.distortionCoefficients);
};
DeviceInfo.prototype.determineDevice_ = function(deviceParams) {
  if (!deviceParams) {
    if (util$2.isIOS()) {
      console.warn('Using fallback iOS device measurements.');
      return DEFAULT_IOS;
    } else {
      console.warn('Using fallback Android device measurements.');
      return DEFAULT_ANDROID;
    }
  }
  var METERS_PER_INCH = 0.0254;
  var metersPerPixelX = METERS_PER_INCH / deviceParams.xdpi;
  var metersPerPixelY = METERS_PER_INCH / deviceParams.ydpi;
  var width = util$2.getScreenWidth();
  var height = util$2.getScreenHeight();
  return new Device({
    widthMeters: metersPerPixelX * width,
    heightMeters: metersPerPixelY * height,
    bevelMeters: deviceParams.bevelMm * 0.001,
  });
};
DeviceInfo.prototype.getDistortedFieldOfViewLeftEye = function() {
  var viewer = this.viewer;
  var device = this.device;
  var distortion$$1 = this.distortion;
  var eyeToScreenDistance = viewer.screenLensDistance;
  var outerDist = (device.widthMeters - viewer.interLensDistance) / 2;
  var innerDist = viewer.interLensDistance / 2;
  var bottomDist = viewer.baselineLensDistance - device.bevelMeters;
  var topDist = device.heightMeters - bottomDist;
  var outerAngle = mathUtil.radToDeg * Math.atan(
      distortion$$1.distort(outerDist / eyeToScreenDistance));
  var innerAngle = mathUtil.radToDeg * Math.atan(
      distortion$$1.distort(innerDist / eyeToScreenDistance));
  var bottomAngle = mathUtil.radToDeg * Math.atan(
      distortion$$1.distort(bottomDist / eyeToScreenDistance));
  var topAngle = mathUtil.radToDeg * Math.atan(
      distortion$$1.distort(topDist / eyeToScreenDistance));
  return {
    leftDegrees: Math.min(outerAngle, viewer.fov),
    rightDegrees: Math.min(innerAngle, viewer.fov),
    downDegrees: Math.min(bottomAngle, viewer.fov),
    upDegrees: Math.min(topAngle, viewer.fov)
  };
};
DeviceInfo.prototype.getLeftEyeVisibleTanAngles = function() {
  var viewer = this.viewer;
  var device = this.device;
  var distortion$$1 = this.distortion;
  var fovLeft = Math.tan(-mathUtil.degToRad * viewer.fov);
  var fovTop = Math.tan(mathUtil.degToRad * viewer.fov);
  var fovRight = Math.tan(mathUtil.degToRad * viewer.fov);
  var fovBottom = Math.tan(-mathUtil.degToRad * viewer.fov);
  var halfWidth = device.widthMeters / 4;
  var halfHeight = device.heightMeters / 2;
  var verticalLensOffset = (viewer.baselineLensDistance - device.bevelMeters - halfHeight);
  var centerX = viewer.interLensDistance / 2 - halfWidth;
  var centerY = -verticalLensOffset;
  var centerZ = viewer.screenLensDistance;
  var screenLeft = distortion$$1.distort((centerX - halfWidth) / centerZ);
  var screenTop = distortion$$1.distort((centerY + halfHeight) / centerZ);
  var screenRight = distortion$$1.distort((centerX + halfWidth) / centerZ);
  var screenBottom = distortion$$1.distort((centerY - halfHeight) / centerZ);
  var result = new Float32Array(4);
  result[0] = Math.max(fovLeft, screenLeft);
  result[1] = Math.min(fovTop, screenTop);
  result[2] = Math.min(fovRight, screenRight);
  result[3] = Math.max(fovBottom, screenBottom);
  return result;
};
DeviceInfo.prototype.getLeftEyeNoLensTanAngles = function() {
  var viewer = this.viewer;
  var device = this.device;
  var distortion$$1 = this.distortion;
  var result = new Float32Array(4);
  var fovLeft = distortion$$1.distortInverse(Math.tan(-mathUtil.degToRad * viewer.fov));
  var fovTop = distortion$$1.distortInverse(Math.tan(mathUtil.degToRad * viewer.fov));
  var fovRight = distortion$$1.distortInverse(Math.tan(mathUtil.degToRad * viewer.fov));
  var fovBottom = distortion$$1.distortInverse(Math.tan(-mathUtil.degToRad * viewer.fov));
  var halfWidth = device.widthMeters / 4;
  var halfHeight = device.heightMeters / 2;
  var verticalLensOffset = (viewer.baselineLensDistance - device.bevelMeters - halfHeight);
  var centerX = viewer.interLensDistance / 2 - halfWidth;
  var centerY = -verticalLensOffset;
  var centerZ = viewer.screenLensDistance;
  var screenLeft = (centerX - halfWidth) / centerZ;
  var screenTop = (centerY + halfHeight) / centerZ;
  var screenRight = (centerX + halfWidth) / centerZ;
  var screenBottom = (centerY - halfHeight) / centerZ;
  result[0] = Math.max(fovLeft, screenLeft);
  result[1] = Math.min(fovTop, screenTop);
  result[2] = Math.min(fovRight, screenRight);
  result[3] = Math.max(fovBottom, screenBottom);
  return result;
};
DeviceInfo.prototype.getLeftEyeVisibleScreenRect = function(undistortedFrustum) {
  var viewer = this.viewer;
  var device = this.device;
  var dist = viewer.screenLensDistance;
  var eyeX = (device.widthMeters - viewer.interLensDistance) / 2;
  var eyeY = viewer.baselineLensDistance - device.bevelMeters;
  var left = (undistortedFrustum[0] * dist + eyeX) / device.widthMeters;
  var top = (undistortedFrustum[1] * dist + eyeY) / device.heightMeters;
  var right = (undistortedFrustum[2] * dist + eyeX) / device.widthMeters;
  var bottom = (undistortedFrustum[3] * dist + eyeY) / device.heightMeters;
  return {
    x: left,
    y: bottom,
    width: right - left,
    height: top - bottom
  };
};
DeviceInfo.prototype.getFieldOfViewLeftEye = function(opt_isUndistorted) {
  return opt_isUndistorted ? this.getUndistortedFieldOfViewLeftEye() :
      this.getDistortedFieldOfViewLeftEye();
};
DeviceInfo.prototype.getFieldOfViewRightEye = function(opt_isUndistorted) {
  var fov = this.getFieldOfViewLeftEye(opt_isUndistorted);
  return {
    leftDegrees: fov.rightDegrees,
    rightDegrees: fov.leftDegrees,
    upDegrees: fov.upDegrees,
    downDegrees: fov.downDegrees
  };
};
DeviceInfo.prototype.getUndistortedFieldOfViewLeftEye = function() {
  var p = this.getUndistortedParams_();
  return {
    leftDegrees: mathUtil.radToDeg * Math.atan(p.outerDist),
    rightDegrees: mathUtil.radToDeg * Math.atan(p.innerDist),
    downDegrees: mathUtil.radToDeg * Math.atan(p.bottomDist),
    upDegrees: mathUtil.radToDeg * Math.atan(p.topDist)
  };
};
DeviceInfo.prototype.getUndistortedViewportLeftEye = function() {
  var p = this.getUndistortedParams_();
  var viewer = this.viewer;
  var device = this.device;
  var eyeToScreenDistance = viewer.screenLensDistance;
  var screenWidth = device.widthMeters / eyeToScreenDistance;
  var screenHeight = device.heightMeters / eyeToScreenDistance;
  var xPxPerTanAngle = device.width / screenWidth;
  var yPxPerTanAngle = device.height / screenHeight;
  var x = Math.round((p.eyePosX - p.outerDist) * xPxPerTanAngle);
  var y = Math.round((p.eyePosY - p.bottomDist) * yPxPerTanAngle);
  return {
    x: x,
    y: y,
    width: Math.round((p.eyePosX + p.innerDist) * xPxPerTanAngle) - x,
    height: Math.round((p.eyePosY + p.topDist) * yPxPerTanAngle) - y
  };
};
DeviceInfo.prototype.getUndistortedParams_ = function() {
  var viewer = this.viewer;
  var device = this.device;
  var distortion$$1 = this.distortion;
  var eyeToScreenDistance = viewer.screenLensDistance;
  var halfLensDistance = viewer.interLensDistance / 2 / eyeToScreenDistance;
  var screenWidth = device.widthMeters / eyeToScreenDistance;
  var screenHeight = device.heightMeters / eyeToScreenDistance;
  var eyePosX = screenWidth / 2 - halfLensDistance;
  var eyePosY = (viewer.baselineLensDistance - device.bevelMeters) / eyeToScreenDistance;
  var maxFov = viewer.fov;
  var viewerMax = distortion$$1.distortInverse(Math.tan(mathUtil.degToRad * maxFov));
  var outerDist = Math.min(eyePosX, viewerMax);
  var innerDist = Math.min(halfLensDistance, viewerMax);
  var bottomDist = Math.min(eyePosY, viewerMax);
  var topDist = Math.min(screenHeight - eyePosY, viewerMax);
  return {
    outerDist: outerDist,
    innerDist: innerDist,
    topDist: topDist,
    bottomDist: bottomDist,
    eyePosX: eyePosX,
    eyePosY: eyePosY
  };
};
function CardboardViewer(params) {
  this.id = params.id;
  this.label = params.label;
  this.fov = params.fov;
  this.interLensDistance = params.interLensDistance;
  this.baselineLensDistance = params.baselineLensDistance;
  this.screenLensDistance = params.screenLensDistance;
  this.distortionCoefficients = params.distortionCoefficients;
  this.inverseCoefficients = params.inverseCoefficients;
}
DeviceInfo.Viewers = Viewers;
var deviceInfo = DeviceInfo;

var format = 1;
var last_updated = "2017-10-12T17:44:41Z";
var devices = [{"type":"android","rules":[{"mdmh":"asus/*/Nexus 7/*"},{"ua":"Nexus 7"}],"dpi":[320.8,323],"bw":3,"ac":500},{"type":"android","rules":[{"mdmh":"asus/*/ASUS_Z00AD/*"},{"ua":"ASUS_Z00AD"}],"dpi":[403,404.6],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"Google/*/Pixel XL/*"},{"ua":"Pixel XL"}],"dpi":[537.9,533],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"Google/*/Pixel/*"},{"ua":"Pixel"}],"dpi":[432.6,436.7],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"HTC/*/HTC6435LVW/*"},{"ua":"HTC6435LVW"}],"dpi":[449.7,443.3],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"HTC/*/HTC One XL/*"},{"ua":"HTC One XL"}],"dpi":[315.3,314.6],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"htc/*/Nexus 9/*"},{"ua":"Nexus 9"}],"dpi":289,"bw":3,"ac":500},{"type":"android","rules":[{"mdmh":"HTC/*/HTC One M9/*"},{"ua":"HTC One M9"}],"dpi":[442.5,443.3],"bw":3,"ac":500},{"type":"android","rules":[{"mdmh":"HTC/*/HTC One_M8/*"},{"ua":"HTC One_M8"}],"dpi":[449.7,447.4],"bw":3,"ac":500},{"type":"android","rules":[{"mdmh":"HTC/*/HTC One/*"},{"ua":"HTC One"}],"dpi":472.8,"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"Huawei/*/Nexus 6P/*"},{"ua":"Nexus 6P"}],"dpi":[515.1,518],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"LENOVO/*/Lenovo PB2-690Y/*"},{"ua":"Lenovo PB2-690Y"}],"dpi":[457.2,454.713],"bw":3,"ac":500},{"type":"android","rules":[{"mdmh":"LGE/*/Nexus 5X/*"},{"ua":"Nexus 5X"}],"dpi":[422,419.9],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"LGE/*/LGMS345/*"},{"ua":"LGMS345"}],"dpi":[221.7,219.1],"bw":3,"ac":500},{"type":"android","rules":[{"mdmh":"LGE/*/LG-D800/*"},{"ua":"LG-D800"}],"dpi":[422,424.1],"bw":3,"ac":500},{"type":"android","rules":[{"mdmh":"LGE/*/LG-D850/*"},{"ua":"LG-D850"}],"dpi":[537.9,541.9],"bw":3,"ac":500},{"type":"android","rules":[{"mdmh":"LGE/*/VS985 4G/*"},{"ua":"VS985 4G"}],"dpi":[537.9,535.6],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"LGE/*/Nexus 5/*"},{"ua":"Nexus 5 B"}],"dpi":[442.4,444.8],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"LGE/*/Nexus 4/*"},{"ua":"Nexus 4"}],"dpi":[319.8,318.4],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"LGE/*/LG-P769/*"},{"ua":"LG-P769"}],"dpi":[240.6,247.5],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"LGE/*/LGMS323/*"},{"ua":"LGMS323"}],"dpi":[206.6,204.6],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"LGE/*/LGLS996/*"},{"ua":"LGLS996"}],"dpi":[403.4,401.5],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"Micromax/*/4560MMX/*"},{"ua":"4560MMX"}],"dpi":[240,219.4],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"Micromax/*/A250/*"},{"ua":"Micromax A250"}],"dpi":[480,446.4],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"Micromax/*/Micromax AQ4501/*"},{"ua":"Micromax AQ4501"}],"dpi":240,"bw":3,"ac":500},{"type":"android","rules":[{"mdmh":"motorola/*/G5/*"},{"ua":"Moto G (5) Plus"}],"dpi":[403.4,403],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"motorola/*/DROID RAZR/*"},{"ua":"DROID RAZR"}],"dpi":[368.1,256.7],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"motorola/*/XT830C/*"},{"ua":"XT830C"}],"dpi":[254,255.9],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"motorola/*/XT1021/*"},{"ua":"XT1021"}],"dpi":[254,256.7],"bw":3,"ac":500},{"type":"android","rules":[{"mdmh":"motorola/*/XT1023/*"},{"ua":"XT1023"}],"dpi":[254,256.7],"bw":3,"ac":500},{"type":"android","rules":[{"mdmh":"motorola/*/XT1028/*"},{"ua":"XT1028"}],"dpi":[326.6,327.6],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"motorola/*/XT1034/*"},{"ua":"XT1034"}],"dpi":[326.6,328.4],"bw":3,"ac":500},{"type":"android","rules":[{"mdmh":"motorola/*/XT1053/*"},{"ua":"XT1053"}],"dpi":[315.3,316.1],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"motorola/*/XT1562/*"},{"ua":"XT1562"}],"dpi":[403.4,402.7],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"motorola/*/Nexus 6/*"},{"ua":"Nexus 6 B"}],"dpi":[494.3,489.7],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"motorola/*/XT1063/*"},{"ua":"XT1063"}],"dpi":[295,296.6],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"motorola/*/XT1064/*"},{"ua":"XT1064"}],"dpi":[295,295.6],"bw":3,"ac":500},{"type":"android","rules":[{"mdmh":"motorola/*/XT1092/*"},{"ua":"XT1092"}],"dpi":[422,424.1],"bw":3,"ac":500},{"type":"android","rules":[{"mdmh":"motorola/*/XT1095/*"},{"ua":"XT1095"}],"dpi":[422,423.4],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"motorola/*/G4/*"},{"ua":"Moto G (4)"}],"dpi":401,"bw":4,"ac":1000},{"type":"android","rules":[{"mdmh":"OnePlus/*/A0001/*"},{"ua":"A0001"}],"dpi":[403.4,401],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"OnePlus/*/ONE E1005/*"},{"ua":"ONE E1005"}],"dpi":[442.4,441.4],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"OnePlus/*/ONE A2005/*"},{"ua":"ONE A2005"}],"dpi":[391.9,405.4],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"OPPO/*/X909/*"},{"ua":"X909"}],"dpi":[442.4,444.1],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"samsung/*/GT-I9082/*"},{"ua":"GT-I9082"}],"dpi":[184.7,185.4],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"samsung/*/SM-G360P/*"},{"ua":"SM-G360P"}],"dpi":[196.7,205.4],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"samsung/*/Nexus S/*"},{"ua":"Nexus S"}],"dpi":[234.5,229.8],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"samsung/*/GT-I9300/*"},{"ua":"GT-I9300"}],"dpi":[304.8,303.9],"bw":5,"ac":500},{"type":"android","rules":[{"mdmh":"samsung/*/SM-T230NU/*"},{"ua":"SM-T230NU"}],"dpi":216,"bw":3,"ac":500},{"type":"android","rules":[{"mdmh":"samsung/*/SGH-T399/*"},{"ua":"SGH-T399"}],"dpi":[217.7,231.4],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"samsung/*/SGH-M919/*"},{"ua":"SGH-M919"}],"dpi":[440.8,437.7],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"samsung/*/SM-N9005/*"},{"ua":"SM-N9005"}],"dpi":[386.4,387],"bw":3,"ac":500},{"type":"android","rules":[{"mdmh":"samsung/*/SAMSUNG-SM-N900A/*"},{"ua":"SAMSUNG-SM-N900A"}],"dpi":[386.4,387.7],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"samsung/*/GT-I9500/*"},{"ua":"GT-I9500"}],"dpi":[442.5,443.3],"bw":3,"ac":500},{"type":"android","rules":[{"mdmh":"samsung/*/GT-I9505/*"},{"ua":"GT-I9505"}],"dpi":439.4,"bw":4,"ac":1000},{"type":"android","rules":[{"mdmh":"samsung/*/SM-G900F/*"},{"ua":"SM-G900F"}],"dpi":[415.6,431.6],"bw":5,"ac":1000},{"type":"android","rules":[{"mdmh":"samsung/*/SM-G900M/*"},{"ua":"SM-G900M"}],"dpi":[415.6,431.6],"bw":5,"ac":1000},{"type":"android","rules":[{"mdmh":"samsung/*/SM-G800F/*"},{"ua":"SM-G800F"}],"dpi":326.8,"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"samsung/*/SM-G906S/*"},{"ua":"SM-G906S"}],"dpi":[562.7,572.4],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"samsung/*/GT-I9300/*"},{"ua":"GT-I9300"}],"dpi":[306.7,304.8],"bw":5,"ac":1000},{"type":"android","rules":[{"mdmh":"samsung/*/SM-T535/*"},{"ua":"SM-T535"}],"dpi":[142.6,136.4],"bw":3,"ac":500},{"type":"android","rules":[{"mdmh":"samsung/*/SM-N920C/*"},{"ua":"SM-N920C"}],"dpi":[515.1,518.4],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"samsung/*/SM-N920P/*"},{"ua":"SM-N920P"}],"dpi":[386.3655,390.144],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"samsung/*/SM-N920W8/*"},{"ua":"SM-N920W8"}],"dpi":[515.1,518.4],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"samsung/*/GT-I9300I/*"},{"ua":"GT-I9300I"}],"dpi":[304.8,305.8],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"samsung/*/GT-I9195/*"},{"ua":"GT-I9195"}],"dpi":[249.4,256.7],"bw":3,"ac":500},{"type":"android","rules":[{"mdmh":"samsung/*/SPH-L520/*"},{"ua":"SPH-L520"}],"dpi":[249.4,255.9],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"samsung/*/SAMSUNG-SGH-I717/*"},{"ua":"SAMSUNG-SGH-I717"}],"dpi":285.8,"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"samsung/*/SPH-D710/*"},{"ua":"SPH-D710"}],"dpi":[217.7,204.2],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"samsung/*/GT-N7100/*"},{"ua":"GT-N7100"}],"dpi":265.1,"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"samsung/*/SCH-I605/*"},{"ua":"SCH-I605"}],"dpi":265.1,"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"samsung/*/Galaxy Nexus/*"},{"ua":"Galaxy Nexus"}],"dpi":[315.3,314.2],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"samsung/*/SM-N910H/*"},{"ua":"SM-N910H"}],"dpi":[515.1,518],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"samsung/*/SM-N910C/*"},{"ua":"SM-N910C"}],"dpi":[515.2,520.2],"bw":3,"ac":500},{"type":"android","rules":[{"mdmh":"samsung/*/SM-G130M/*"},{"ua":"SM-G130M"}],"dpi":[165.9,164.8],"bw":3,"ac":500},{"type":"android","rules":[{"mdmh":"samsung/*/SM-G928I/*"},{"ua":"SM-G928I"}],"dpi":[515.1,518.4],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"samsung/*/SM-G920F/*"},{"ua":"SM-G920F"}],"dpi":580.6,"bw":3,"ac":500},{"type":"android","rules":[{"mdmh":"samsung/*/SM-G920P/*"},{"ua":"SM-G920P"}],"dpi":[522.5,577],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"samsung/*/SM-G925F/*"},{"ua":"SM-G925F"}],"dpi":580.6,"bw":3,"ac":500},{"type":"android","rules":[{"mdmh":"samsung/*/SM-G925V/*"},{"ua":"SM-G925V"}],"dpi":[522.5,576.6],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"samsung/*/SM-G930F/*"},{"ua":"SM-G930F"}],"dpi":576.6,"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"samsung/*/SM-G935F/*"},{"ua":"SM-G935F"}],"dpi":533,"bw":3,"ac":500},{"type":"android","rules":[{"mdmh":"samsung/*/SM-G950F/*"},{"ua":"SM-G950F"}],"dpi":[562.707,565.293],"bw":3,"ac":500},{"type":"android","rules":[{"mdmh":"samsung/*/SM-G955U/*"},{"ua":"SM-G955U"}],"dpi":[522.514,525.762],"bw":3,"ac":500},{"type":"android","rules":[{"mdmh":"Sony/*/C6903/*"},{"ua":"C6903"}],"dpi":[442.5,443.3],"bw":3,"ac":500},{"type":"android","rules":[{"mdmh":"Sony/*/D6653/*"},{"ua":"D6653"}],"dpi":[428.6,427.6],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"Sony/*/E6653/*"},{"ua":"E6653"}],"dpi":[428.6,425.7],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"Sony/*/E6853/*"},{"ua":"E6853"}],"dpi":[403.4,401.9],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"Sony/*/SGP321/*"},{"ua":"SGP321"}],"dpi":[224.7,224.1],"bw":3,"ac":500},{"type":"android","rules":[{"mdmh":"TCT/*/ALCATEL ONE TOUCH Fierce/*"},{"ua":"ALCATEL ONE TOUCH Fierce"}],"dpi":[240,247.5],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"THL/*/thl 5000/*"},{"ua":"thl 5000"}],"dpi":[480,443.3],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"Fly/*/IQ4412/*"},{"ua":"IQ4412"}],"dpi":307.9,"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"ZTE/*/ZTE Blade L2/*"},{"ua":"ZTE Blade L2"}],"dpi":240,"bw":3,"ac":500},{"type":"ios","rules":[{"res":[640,960]}],"dpi":[325.1,328.4],"bw":4,"ac":1000},{"type":"ios","rules":[{"res":[640,1136]}],"dpi":[317.1,320.2],"bw":3,"ac":1000},{"type":"ios","rules":[{"res":[750,1334]}],"dpi":326.4,"bw":4,"ac":1000},{"type":"ios","rules":[{"res":[1242,2208]}],"dpi":[453.6,458.4],"bw":4,"ac":1000},{"type":"ios","rules":[{"res":[1125,2001]}],"dpi":[410.9,415.4],"bw":4,"ac":1000}];
var dpdb$2 = {
	format: format,
	last_updated: last_updated,
	devices: devices
};

var dpdb$3 = Object.freeze({
	format: format,
	last_updated: last_updated,
	devices: devices,
	default: dpdb$2
});

var DPDB_CACHE = ( dpdb$3 && dpdb$2 ) || dpdb$3;

function Dpdb(url, onDeviceParamsUpdated) {
  this.dpdb = DPDB_CACHE;
  this.recalculateDeviceParams_();
  if (url) {
    this.onDeviceParamsUpdated = onDeviceParamsUpdated;
    var xhr = new XMLHttpRequest();
    var obj = this;
    xhr.open('GET', url, true);
    xhr.addEventListener('load', function() {
      obj.loading = false;
      if (xhr.status >= 200 && xhr.status <= 299) {
        obj.dpdb = JSON.parse(xhr.response);
        obj.recalculateDeviceParams_();
      } else {
        console.error('Error loading online DPDB!');
      }
    });
    xhr.send();
  }
}
Dpdb.prototype.getDeviceParams = function() {
  return this.deviceParams;
};
Dpdb.prototype.recalculateDeviceParams_ = function() {
  var newDeviceParams = this.calcDeviceParams_();
  if (newDeviceParams) {
    this.deviceParams = newDeviceParams;
    if (this.onDeviceParamsUpdated) {
      this.onDeviceParamsUpdated(this.deviceParams);
    }
  } else {
    console.error('Failed to recalculate device parameters.');
  }
};
Dpdb.prototype.calcDeviceParams_ = function() {
  var db = this.dpdb;
  if (!db) {
    console.error('DPDB not available.');
    return null;
  }
  if (db.format != 1) {
    console.error('DPDB has unexpected format version.');
    return null;
  }
  if (!db.devices || !db.devices.length) {
    console.error('DPDB does not have a devices section.');
    return null;
  }
  var userAgent = navigator.userAgent || navigator.vendor || window.opera;
  var width = util$2.getScreenWidth();
  var height = util$2.getScreenHeight();
  if (!db.devices) {
    console.error('DPDB has no devices section.');
    return null;
  }
  for (var i = 0; i < db.devices.length; i++) {
    var device = db.devices[i];
    if (!device.rules) {
      console.warn('Device[' + i + '] has no rules section.');
      continue;
    }
    if (device.type != 'ios' && device.type != 'android') {
      console.warn('Device[' + i + '] has invalid type.');
      continue;
    }
    if (util$2.isIOS() != (device.type == 'ios')) continue;
    var matched = false;
    for (var j = 0; j < device.rules.length; j++) {
      var rule = device.rules[j];
      if (this.matchRule_(rule, userAgent, width, height)) {
        matched = true;
        break;
      }
    }
    if (!matched) continue;
    var xdpi = device.dpi[0] || device.dpi;
    var ydpi = device.dpi[1] || device.dpi;
    return new DeviceParams({ xdpi: xdpi, ydpi: ydpi, bevelMm: device.bw });
  }
  console.warn('No DPDB device match.');
  return null;
};
Dpdb.prototype.matchRule_ = function(rule, ua, screenWidth, screenHeight) {
  if (!rule.ua && !rule.res) return false;
  if (rule.ua && ua.indexOf(rule.ua) < 0) return false;
  if (rule.res) {
    if (!rule.res[0] || !rule.res[1]) return false;
    var resX = rule.res[0];
    var resY = rule.res[1];
    if (Math.min(screenWidth, screenHeight) != Math.min(resX, resY) ||
        (Math.max(screenWidth, screenHeight) != Math.max(resX, resY))) {
      return false;
    }
  }
  return true;
};
function DeviceParams(params) {
  this.xdpi = params.xdpi;
  this.ydpi = params.ydpi;
  this.bevelMm = params.bevelMm;
}
var dpdb = Dpdb;

function SensorSample(sample, timestampS) {
  this.set(sample, timestampS);
}
SensorSample.prototype.set = function(sample, timestampS) {
  this.sample = sample;
  this.timestampS = timestampS;
};
SensorSample.prototype.copy = function(sensorSample) {
  this.set(sensorSample.sample, sensorSample.timestampS);
};
var sensorSample = SensorSample;

function ComplementaryFilter(kFilter, isDebug) {
  this.kFilter = kFilter;
  this.isDebug = isDebug;
  this.currentAccelMeasurement = new sensorSample();
  this.currentGyroMeasurement = new sensorSample();
  this.previousGyroMeasurement = new sensorSample();
  if (util$2.isIOS()) {
    this.filterQ = new mathUtil.Quaternion(-1, 0, 0, 1);
  } else {
    this.filterQ = new mathUtil.Quaternion(1, 0, 0, 1);
  }
  this.previousFilterQ = new mathUtil.Quaternion();
  this.previousFilterQ.copy(this.filterQ);
  this.accelQ = new mathUtil.Quaternion();
  this.isOrientationInitialized = false;
  this.estimatedGravity = new mathUtil.Vector3();
  this.measuredGravity = new mathUtil.Vector3();
  this.gyroIntegralQ = new mathUtil.Quaternion();
}
ComplementaryFilter.prototype.addAccelMeasurement = function(vector, timestampS) {
  this.currentAccelMeasurement.set(vector, timestampS);
};
ComplementaryFilter.prototype.addGyroMeasurement = function(vector, timestampS) {
  this.currentGyroMeasurement.set(vector, timestampS);
  var deltaT = timestampS - this.previousGyroMeasurement.timestampS;
  if (util$2.isTimestampDeltaValid(deltaT)) {
    this.run_();
  }
  this.previousGyroMeasurement.copy(this.currentGyroMeasurement);
};
ComplementaryFilter.prototype.run_ = function() {
  if (!this.isOrientationInitialized) {
    this.accelQ = this.accelToQuaternion_(this.currentAccelMeasurement.sample);
    this.previousFilterQ.copy(this.accelQ);
    this.isOrientationInitialized = true;
    return;
  }
  var deltaT = this.currentGyroMeasurement.timestampS -
      this.previousGyroMeasurement.timestampS;
  var gyroDeltaQ = this.gyroToQuaternionDelta_(this.currentGyroMeasurement.sample, deltaT);
  this.gyroIntegralQ.multiply(gyroDeltaQ);
  this.filterQ.copy(this.previousFilterQ);
  this.filterQ.multiply(gyroDeltaQ);
  var invFilterQ = new mathUtil.Quaternion();
  invFilterQ.copy(this.filterQ);
  invFilterQ.inverse();
  this.estimatedGravity.set(0, 0, -1);
  this.estimatedGravity.applyQuaternion(invFilterQ);
  this.estimatedGravity.normalize();
  this.measuredGravity.copy(this.currentAccelMeasurement.sample);
  this.measuredGravity.normalize();
  var deltaQ = new mathUtil.Quaternion();
  deltaQ.setFromUnitVectors(this.estimatedGravity, this.measuredGravity);
  deltaQ.inverse();
  if (this.isDebug) {
    console.log('Delta: %d deg, G_est: (%s, %s, %s), G_meas: (%s, %s, %s)',
                mathUtil.radToDeg * util$2.getQuaternionAngle(deltaQ),
                (this.estimatedGravity.x).toFixed(1),
                (this.estimatedGravity.y).toFixed(1),
                (this.estimatedGravity.z).toFixed(1),
                (this.measuredGravity.x).toFixed(1),
                (this.measuredGravity.y).toFixed(1),
                (this.measuredGravity.z).toFixed(1));
  }
  var targetQ = new mathUtil.Quaternion();
  targetQ.copy(this.filterQ);
  targetQ.multiply(deltaQ);
  this.filterQ.slerp(targetQ, 1 - this.kFilter);
  this.previousFilterQ.copy(this.filterQ);
};
ComplementaryFilter.prototype.getOrientation = function() {
  return this.filterQ;
};
ComplementaryFilter.prototype.accelToQuaternion_ = function(accel) {
  var normAccel = new mathUtil.Vector3();
  normAccel.copy(accel);
  normAccel.normalize();
  var quat = new mathUtil.Quaternion();
  quat.setFromUnitVectors(new mathUtil.Vector3(0, 0, -1), normAccel);
  quat.inverse();
  return quat;
};
ComplementaryFilter.prototype.gyroToQuaternionDelta_ = function(gyro, dt) {
  var quat = new mathUtil.Quaternion();
  var axis = new mathUtil.Vector3();
  axis.copy(gyro);
  axis.normalize();
  quat.setFromAxisAngle(axis, gyro.length() * dt);
  return quat;
};
var complementaryFilter = ComplementaryFilter;

function PosePredictor(predictionTimeS, isDebug) {
  this.predictionTimeS = predictionTimeS;
  this.isDebug = isDebug;
  this.previousQ = new mathUtil.Quaternion();
  this.previousTimestampS = null;
  this.deltaQ = new mathUtil.Quaternion();
  this.outQ = new mathUtil.Quaternion();
}
PosePredictor.prototype.getPrediction = function(currentQ, gyro, timestampS) {
  if (!this.previousTimestampS) {
    this.previousQ.copy(currentQ);
    this.previousTimestampS = timestampS;
    return currentQ;
  }
  var axis = new mathUtil.Vector3();
  axis.copy(gyro);
  axis.normalize();
  var angularSpeed = gyro.length();
  if (angularSpeed < mathUtil.degToRad * 20) {
    if (this.isDebug) {
      console.log('Moving slowly, at %s deg/s: no prediction',
                  (mathUtil.radToDeg * angularSpeed).toFixed(1));
    }
    this.outQ.copy(currentQ);
    this.previousQ.copy(currentQ);
    return this.outQ;
  }
  var deltaT = timestampS - this.previousTimestampS;
  var predictAngle = angularSpeed * this.predictionTimeS;
  this.deltaQ.setFromAxisAngle(axis, predictAngle);
  this.outQ.copy(this.previousQ);
  this.outQ.multiply(this.deltaQ);
  this.previousQ.copy(currentQ);
  this.previousTimestampS = timestampS;
  return this.outQ;
};
var posePredictor = PosePredictor;

var ROTATE_SPEED = 0.5;
function TouchPanner() {
  window.addEventListener('touchstart', this.onTouchStart_.bind(this));
  window.addEventListener('touchmove', this.onTouchMove_.bind(this));
  window.addEventListener('touchend', this.onTouchEnd_.bind(this));
  this.isTouching = false;
  this.rotateStart = new mathUtil.Vector2();
  this.rotateEnd = new mathUtil.Vector2();
  this.rotateDelta = new mathUtil.Vector2();
  this.theta = 0;
  this.orientation = new mathUtil.Quaternion();
}
TouchPanner.prototype.getOrientation = function() {
  this.orientation.setFromEulerXYZ(0, 0, this.theta);
  return this.orientation;
};
TouchPanner.prototype.resetSensor = function() {
  this.theta = 0;
};
TouchPanner.prototype.onTouchStart_ = function(e) {
  if (!e.touches || e.touches.length != 1) {
    return;
  }
  this.rotateStart.set(e.touches[0].pageX, e.touches[0].pageY);
  this.isTouching = true;
};
TouchPanner.prototype.onTouchMove_ = function(e) {
  if (!this.isTouching) {
    return;
  }
  this.rotateEnd.set(e.touches[0].pageX, e.touches[0].pageY);
  this.rotateDelta.subVectors(this.rotateEnd, this.rotateStart);
  this.rotateStart.copy(this.rotateEnd);
  if (util$2.isIOS()) {
    this.rotateDelta.x *= -1;
  }
  var element = document.body;
  this.theta += 2 * Math.PI * this.rotateDelta.x / element.clientWidth * ROTATE_SPEED;
};
TouchPanner.prototype.onTouchEnd_ = function(e) {
  this.isTouching = false;
};
var touchPanner = TouchPanner;

function FusionPoseSensor(kFilter, predictionTime, touchPannerDisabled, yawOnly, isDebug) {
  this.deviceId = 'webvr-polyfill:fused';
  this.deviceName = 'VR Position Device (webvr-polyfill:fused)';
  this.touchPannerDisabled = touchPannerDisabled;
  this.yawOnly = yawOnly;
  this.accelerometer = new mathUtil.Vector3();
  this.gyroscope = new mathUtil.Vector3();
  this.start();
  this.filter = new complementaryFilter(kFilter, isDebug);
  this.posePredictor = new posePredictor(predictionTime, isDebug);
  this.touchPanner = new touchPanner();
  this.filterToWorldQ = new mathUtil.Quaternion();
  if (util$2.isIOS()) {
    this.filterToWorldQ.setFromAxisAngle(new mathUtil.Vector3(1, 0, 0), Math.PI / 2);
  } else {
    this.filterToWorldQ.setFromAxisAngle(new mathUtil.Vector3(1, 0, 0), -Math.PI / 2);
  }
  this.inverseWorldToScreenQ = new mathUtil.Quaternion();
  this.worldToScreenQ = new mathUtil.Quaternion();
  this.originalPoseAdjustQ = new mathUtil.Quaternion();
  this.originalPoseAdjustQ.setFromAxisAngle(new mathUtil.Vector3(0, 0, 1),
                                           -window.orientation * Math.PI / 180);
  this.setScreenTransform_();
  if (util$2.isLandscapeMode()) {
    this.filterToWorldQ.multiply(this.inverseWorldToScreenQ);
  }
  this.resetQ = new mathUtil.Quaternion();
  this.isFirefoxAndroid = util$2.isFirefoxAndroid();
  this.isIOS = util$2.isIOS();
  this.orientationOut_ = new Float32Array(4);
}
FusionPoseSensor.prototype.getPosition = function() {
  return null;
};
FusionPoseSensor.prototype.getOrientation = function() {
  var orientation = this.filter.getOrientation();
  this.predictedQ = this.posePredictor.getPrediction(orientation, this.gyroscope, this.previousTimestampS);
  var out = new mathUtil.Quaternion();
  out.copy(this.filterToWorldQ);
  out.multiply(this.resetQ);
  if (!this.touchPannerDisabled) {
    out.multiply(this.touchPanner.getOrientation());
  }
  out.multiply(this.predictedQ);
  out.multiply(this.worldToScreenQ);
  if (this.yawOnly) {
    out.x = 0;
    out.z = 0;
    out.normalize();
  }
  this.orientationOut_[0] = out.x;
  this.orientationOut_[1] = out.y;
  this.orientationOut_[2] = out.z;
  this.orientationOut_[3] = out.w;
  return this.orientationOut_;
};
FusionPoseSensor.prototype.resetPose = function() {
  this.resetQ.copy(this.filter.getOrientation());
  this.resetQ.x = 0;
  this.resetQ.y = 0;
  this.resetQ.z *= -1;
  this.resetQ.normalize();
  if (util$2.isLandscapeMode()) {
    this.resetQ.multiply(this.inverseWorldToScreenQ);
  }
  this.resetQ.multiply(this.originalPoseAdjustQ);
  if (!this.touchPannerDisabled) {
    this.touchPanner.resetSensor();
  }
};
FusionPoseSensor.prototype.onDeviceMotion_ = function(deviceMotion) {
  this.updateDeviceMotion_(deviceMotion);
};
FusionPoseSensor.prototype.updateDeviceMotion_ = function(deviceMotion) {
  var accGravity = deviceMotion.accelerationIncludingGravity;
  var rotRate = deviceMotion.rotationRate;
  var timestampS = deviceMotion.timeStamp / 1000;
  var deltaS = timestampS - this.previousTimestampS;
  if (deltaS <= util$2.MIN_TIMESTEP || deltaS > util$2.MAX_TIMESTEP) {
    console.warn('Invalid timestamps detected. Time step between successive ' +
                 'gyroscope sensor samples is very small or not monotonic');
    this.previousTimestampS = timestampS;
    return;
  }
  this.accelerometer.set(-accGravity.x, -accGravity.y, -accGravity.z);
  if (util$2.isR7()) {
    this.gyroscope.set(-rotRate.beta, rotRate.alpha, rotRate.gamma);
  } else {
    this.gyroscope.set(rotRate.alpha, rotRate.beta, rotRate.gamma);
  }
  if (this.isIOS || this.isFirefoxAndroid) {
    this.gyroscope.multiplyScalar(Math.PI / 180);
  }
  this.filter.addAccelMeasurement(this.accelerometer, timestampS);
  this.filter.addGyroMeasurement(this.gyroscope, timestampS);
  this.previousTimestampS = timestampS;
};
FusionPoseSensor.prototype.onOrientationChange_ = function(screenOrientation) {
  this.setScreenTransform_();
};
FusionPoseSensor.prototype.onMessage_ = function(event) {
  var message = event.data;
  if (!message || !message.type) {
    return;
  }
  var type = message.type.toLowerCase();
  if (type !== 'devicemotion') {
    return;
  }
  this.updateDeviceMotion_(message.deviceMotionEvent);
};
FusionPoseSensor.prototype.setScreenTransform_ = function() {
  this.worldToScreenQ.set(0, 0, 0, 1);
  switch (window.orientation) {
    case 0:
      break;
    case 90:
      this.worldToScreenQ.setFromAxisAngle(new mathUtil.Vector3(0, 0, 1), -Math.PI / 2);
      break;
    case -90:
      this.worldToScreenQ.setFromAxisAngle(new mathUtil.Vector3(0, 0, 1), Math.PI / 2);
      break;
    case 180:
      break;
  }
  this.inverseWorldToScreenQ.copy(this.worldToScreenQ);
  this.inverseWorldToScreenQ.inverse();
};
FusionPoseSensor.prototype.start = function() {
  this.onDeviceMotionCallback_ = this.onDeviceMotion_.bind(this);
  this.onOrientationChangeCallback_ = this.onOrientationChange_.bind(this);
  this.onMessageCallback_ = this.onMessage_.bind(this);
  if (util$2.isIOS() && util$2.isInsideCrossDomainIFrame()) {
    window.addEventListener('message', this.onMessageCallback_);
  }
  window.addEventListener('orientationchange', this.onOrientationChangeCallback_);
  window.addEventListener('devicemotion', this.onDeviceMotionCallback_);
};
FusionPoseSensor.prototype.stop = function() {
  window.removeEventListener('devicemotion', this.onDeviceMotionCallback_);
  window.removeEventListener('orientationchange', this.onOrientationChangeCallback_);
  window.removeEventListener('message', this.onMessageCallback_);
};
var fusionPoseSensor = FusionPoseSensor;

function RotateInstructions() {
  this.loadIcon_();
  var overlay = document.createElement('div');
  var s = overlay.style;
  s.position = 'fixed';
  s.top = 0;
  s.right = 0;
  s.bottom = 0;
  s.left = 0;
  s.backgroundColor = 'gray';
  s.fontFamily = 'sans-serif';
  s.zIndex = 1000000;
  var img = document.createElement('img');
  img.src = this.icon;
  var s = img.style;
  s.marginLeft = '25%';
  s.marginTop = '25%';
  s.width = '50%';
  overlay.appendChild(img);
  var text = document.createElement('div');
  var s = text.style;
  s.textAlign = 'center';
  s.fontSize = '16px';
  s.lineHeight = '24px';
  s.margin = '24px 25%';
  s.width = '50%';
  text.innerHTML = 'Place your phone into your Cardboard viewer.';
  overlay.appendChild(text);
  var snackbar = document.createElement('div');
  var s = snackbar.style;
  s.backgroundColor = '#CFD8DC';
  s.position = 'fixed';
  s.bottom = 0;
  s.width = '100%';
  s.height = '48px';
  s.padding = '14px 24px';
  s.boxSizing = 'border-box';
  s.color = '#656A6B';
  overlay.appendChild(snackbar);
  var snackbarText = document.createElement('div');
  snackbarText.style.float = 'left';
  snackbarText.innerHTML = 'No Cardboard viewer?';
  var snackbarButton = document.createElement('a');
  snackbarButton.href = 'https://www.google.com/get/cardboard/get-cardboard/';
  snackbarButton.innerHTML = 'get one';
  snackbarButton.target = '_blank';
  var s = snackbarButton.style;
  s.float = 'right';
  s.fontWeight = 600;
  s.textTransform = 'uppercase';
  s.borderLeft = '1px solid gray';
  s.paddingLeft = '24px';
  s.textDecoration = 'none';
  s.color = '#656A6B';
  snackbar.appendChild(snackbarText);
  snackbar.appendChild(snackbarButton);
  this.overlay = overlay;
  this.text = text;
  this.hide();
}
RotateInstructions.prototype.show = function(parent) {
  if (!parent && !this.overlay.parentElement) {
    document.body.appendChild(this.overlay);
  } else if (parent) {
    if (this.overlay.parentElement && this.overlay.parentElement != parent)
      this.overlay.parentElement.removeChild(this.overlay);
    parent.appendChild(this.overlay);
  }
  this.overlay.style.display = 'block';
  var img = this.overlay.querySelector('img');
  var s = img.style;
  if (util$2.isLandscapeMode()) {
    s.width = '20%';
    s.marginLeft = '40%';
    s.marginTop = '3%';
  } else {
    s.width = '50%';
    s.marginLeft = '25%';
    s.marginTop = '25%';
  }
};
RotateInstructions.prototype.hide = function() {
  this.overlay.style.display = 'none';
};
RotateInstructions.prototype.showTemporarily = function(ms, parent) {
  this.show(parent);
  this.timer = setTimeout(this.hide.bind(this), ms);
};
RotateInstructions.prototype.disableShowTemporarily = function() {
  clearTimeout(this.timer);
};
RotateInstructions.prototype.update = function() {
  this.disableShowTemporarily();
  if (!util$2.isLandscapeMode() && util$2.isMobile()) {
    this.show();
  } else {
    this.hide();
  }
};
RotateInstructions.prototype.loadIcon_ = function() {
  this.icon = util$2.base64('image/svg+xml', 'PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9Im5vIj8+Cjxzdmcgd2lkdGg9IjE5OHB4IiBoZWlnaHQ9IjI0MHB4IiB2aWV3Qm94PSIwIDAgMTk4IDI0MCIgdmVyc2lvbj0iMS4xIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB4bWxuczpza2V0Y2g9Imh0dHA6Ly93d3cuYm9oZW1pYW5jb2RpbmcuY29tL3NrZXRjaC9ucyI+CiAgICA8IS0tIEdlbmVyYXRvcjogU2tldGNoIDMuMy4zICgxMjA4MSkgLSBodHRwOi8vd3d3LmJvaGVtaWFuY29kaW5nLmNvbS9za2V0Y2ggLS0+CiAgICA8dGl0bGU+dHJhbnNpdGlvbjwvdGl0bGU+CiAgICA8ZGVzYz5DcmVhdGVkIHdpdGggU2tldGNoLjwvZGVzYz4KICAgIDxkZWZzPjwvZGVmcz4KICAgIDxnIGlkPSJQYWdlLTEiIHN0cm9rZT0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIxIiBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiIHNrZXRjaDp0eXBlPSJNU1BhZ2UiPgogICAgICAgIDxnIGlkPSJ0cmFuc2l0aW9uIiBza2V0Y2g6dHlwZT0iTVNBcnRib2FyZEdyb3VwIj4KICAgICAgICAgICAgPGcgaWQ9IkltcG9ydGVkLUxheWVycy1Db3B5LTQtKy1JbXBvcnRlZC1MYXllcnMtQ29weS0rLUltcG9ydGVkLUxheWVycy1Db3B5LTItQ29weSIgc2tldGNoOnR5cGU9Ik1TTGF5ZXJHcm91cCI+CiAgICAgICAgICAgICAgICA8ZyBpZD0iSW1wb3J0ZWQtTGF5ZXJzLUNvcHktNCIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMC4wMDAwMDAsIDEwNy4wMDAwMDApIiBza2V0Y2g6dHlwZT0iTVNTaGFwZUdyb3VwIj4KICAgICAgICAgICAgICAgICAgICA8cGF0aCBkPSJNMTQ5LjYyNSwyLjUyNyBDMTQ5LjYyNSwyLjUyNyAxNTUuODA1LDYuMDk2IDE1Ni4zNjIsNi40MTggTDE1Ni4zNjIsNy4zMDQgQzE1Ni4zNjIsNy40ODEgMTU2LjM3NSw3LjY2NCAxNTYuNCw3Ljg1MyBDMTU2LjQxLDcuOTM0IDE1Ni40Miw4LjAxNSAxNTYuNDI3LDguMDk1IEMxNTYuNTY3LDkuNTEgMTU3LjQwMSwxMS4wOTMgMTU4LjUzMiwxMi4wOTQgTDE2NC4yNTIsMTcuMTU2IEwxNjQuMzMzLDE3LjA2NiBDMTY0LjMzMywxNy4wNjYgMTY4LjcxNSwxNC41MzYgMTY5LjU2OCwxNC4wNDIgQzE3MS4wMjUsMTQuODgzIDE5NS41MzgsMjkuMDM1IDE5NS41MzgsMjkuMDM1IEwxOTUuNTM4LDgzLjAzNiBDMTk1LjUzOCw4My44MDcgMTk1LjE1Miw4NC4yNTMgMTk0LjU5LDg0LjI1MyBDMTk0LjM1Nyw4NC4yNTMgMTk0LjA5NSw4NC4xNzcgMTkzLjgxOCw4NC4wMTcgTDE2OS44NTEsNzAuMTc5IEwxNjkuODM3LDcwLjIwMyBMMTQyLjUxNSw4NS45NzggTDE0MS42NjUsODQuNjU1IEMxMzYuOTM0LDgzLjEyNiAxMzEuOTE3LDgxLjkxNSAxMjYuNzE0LDgxLjA0NSBDMTI2LjcwOSw4MS4wNiAxMjYuNzA3LDgxLjA2OSAxMjYuNzA3LDgxLjA2OSBMMTIxLjY0LDk4LjAzIEwxMTMuNzQ5LDEwMi41ODYgTDExMy43MTIsMTAyLjUyMyBMMTEzLjcxMiwxMzAuMTEzIEMxMTMuNzEyLDEzMC44ODUgMTEzLjMyNiwxMzEuMzMgMTEyLjc2NCwxMzEuMzMgQzExMi41MzIsMTMxLjMzIDExMi4yNjksMTMxLjI1NCAxMTEuOTkyLDEzMS4wOTQgTDY5LjUxOSwxMDYuNTcyIEM2OC41NjksMTA2LjAyMyA2Ny43OTksMTA0LjY5NSA2Ny43OTksMTAzLjYwNSBMNjcuNzk5LDEwMi41NyBMNjcuNzc4LDEwMi42MTcgQzY3LjI3LDEwMi4zOTMgNjYuNjQ4LDEwMi4yNDkgNjUuOTYyLDEwMi4yMTggQzY1Ljg3NSwxMDIuMjE0IDY1Ljc4OCwxMDIuMjEyIDY1LjcwMSwxMDIuMjEyIEM2NS42MDYsMTAyLjIxMiA2NS41MTEsMTAyLjIxNSA2NS40MTYsMTAyLjIxOSBDNjUuMTk1LDEwMi4yMjkgNjQuOTc0LDEwMi4yMzUgNjQuNzU0LDEwMi4yMzUgQzY0LjMzMSwxMDIuMjM1IDYzLjkxMSwxMDIuMjE2IDYzLjQ5OCwxMDIuMTc4IEM2MS44NDMsMTAyLjAyNSA2MC4yOTgsMTAxLjU3OCA1OS4wOTQsMTAwLjg4MiBMMTIuNTE4LDczLjk5MiBMMTIuNTIzLDc0LjAwNCBMMi4yNDUsNTUuMjU0IEMxLjI0NCw1My40MjcgMi4wMDQsNTEuMDM4IDMuOTQzLDQ5LjkxOCBMNTkuOTU0LDE3LjU3MyBDNjAuNjI2LDE3LjE4NSA2MS4zNSwxNy4wMDEgNjIuMDUzLDE3LjAwMSBDNjMuMzc5LDE3LjAwMSA2NC42MjUsMTcuNjYgNjUuMjgsMTguODU0IEw2NS4yODUsMTguODUxIEw2NS41MTIsMTkuMjY0IEw2NS41MDYsMTkuMjY4IEM2NS45MDksMjAuMDAzIDY2LjQwNSwyMC42OCA2Ni45ODMsMjEuMjg2IEw2Ny4yNiwyMS41NTYgQzY5LjE3NCwyMy40MDYgNzEuNzI4LDI0LjM1NyA3NC4zNzMsMjQuMzU3IEM3Ni4zMjIsMjQuMzU3IDc4LjMyMSwyMy44NCA4MC4xNDgsMjIuNzg1IEM4MC4xNjEsMjIuNzg1IDg3LjQ2NywxOC41NjYgODcuNDY3LDE4LjU2NiBDODguMTM5LDE4LjE3OCA4OC44NjMsMTcuOTk0IDg5LjU2NiwxNy45OTQgQzkwLjg5MiwxNy45OTQgOTIuMTM4LDE4LjY1MiA5Mi43OTIsMTkuODQ3IEw5Ni4wNDIsMjUuNzc1IEw5Ni4wNjQsMjUuNzU3IEwxMDIuODQ5LDI5LjY3NCBMMTAyLjc0NCwyOS40OTIgTDE0OS42MjUsMi41MjcgTTE0OS42MjUsMC44OTIgQzE0OS4zNDMsMC44OTIgMTQ5LjA2MiwwLjk2NSAxNDguODEsMS4xMSBMMTAyLjY0MSwyNy42NjYgTDk3LjIzMSwyNC41NDIgTDk0LjIyNiwxOS4wNjEgQzkzLjMxMywxNy4zOTQgOTEuNTI3LDE2LjM1OSA4OS41NjYsMTYuMzU4IEM4OC41NTUsMTYuMzU4IDg3LjU0NiwxNi42MzIgODYuNjQ5LDE3LjE1IEM4My44NzgsMTguNzUgNzkuNjg3LDIxLjE2OSA3OS4zNzQsMjEuMzQ1IEM3OS4zNTksMjEuMzUzIDc5LjM0NSwyMS4zNjEgNzkuMzMsMjEuMzY5IEM3Ny43OTgsMjIuMjU0IDc2LjA4NCwyMi43MjIgNzQuMzczLDIyLjcyMiBDNzIuMDgxLDIyLjcyMiA2OS45NTksMjEuODkgNjguMzk3LDIwLjM4IEw2OC4xNDUsMjAuMTM1IEM2Ny43MDYsMTkuNjcyIDY3LjMyMywxOS4xNTYgNjcuMDA2LDE4LjYwMSBDNjYuOTg4LDE4LjU1OSA2Ni45NjgsMTguNTE5IDY2Ljk0NiwxOC40NzkgTDY2LjcxOSwxOC4wNjUgQzY2LjY5LDE4LjAxMiA2Ni42NTgsMTcuOTYgNjYuNjI0LDE3LjkxMSBDNjUuNjg2LDE2LjMzNyA2My45NTEsMTUuMzY2IDYyLjA1MywxNS4zNjYgQzYxLjA0MiwxNS4zNjYgNjAuMDMzLDE1LjY0IDU5LjEzNiwxNi4xNTggTDMuMTI1LDQ4LjUwMiBDMC40MjYsNTAuMDYxIC0wLjYxMyw1My40NDIgMC44MTEsNTYuMDQgTDExLjA4OSw3NC43OSBDMTEuMjY2LDc1LjExMyAxMS41MzcsNzUuMzUzIDExLjg1LDc1LjQ5NCBMNTguMjc2LDEwMi4yOTggQzU5LjY3OSwxMDMuMTA4IDYxLjQzMywxMDMuNjMgNjMuMzQ4LDEwMy44MDYgQzYzLjgxMiwxMDMuODQ4IDY0LjI4NSwxMDMuODcgNjQuNzU0LDEwMy44NyBDNjUsMTAzLjg3IDY1LjI0OSwxMDMuODY0IDY1LjQ5NCwxMDMuODUyIEM2NS41NjMsMTAzLjg0OSA2NS42MzIsMTAzLjg0NyA2NS43MDEsMTAzLjg0NyBDNjUuNzY0LDEwMy44NDcgNjUuODI4LDEwMy44NDkgNjUuODksMTAzLjg1MiBDNjUuOTg2LDEwMy44NTYgNjYuMDgsMTAzLjg2MyA2Ni4xNzMsMTAzLjg3NCBDNjYuMjgyLDEwNS40NjcgNjcuMzMyLDEwNy4xOTcgNjguNzAyLDEwNy45ODggTDExMS4xNzQsMTMyLjUxIEMxMTEuNjk4LDEzMi44MTIgMTEyLjIzMiwxMzIuOTY1IDExMi43NjQsMTMyLjk2NSBDMTE0LjI2MSwxMzIuOTY1IDExNS4zNDcsMTMxLjc2NSAxMTUuMzQ3LDEzMC4xMTMgTDExNS4zNDcsMTAzLjU1MSBMMTIyLjQ1OCw5OS40NDYgQzEyMi44MTksOTkuMjM3IDEyMy4wODcsOTguODk4IDEyMy4yMDcsOTguNDk4IEwxMjcuODY1LDgyLjkwNSBDMTMyLjI3OSw4My43MDIgMTM2LjU1Nyw4NC43NTMgMTQwLjYwNyw4Ni4wMzMgTDE0MS4xNCw4Ni44NjIgQzE0MS40NTEsODcuMzQ2IDE0MS45NzcsODcuNjEzIDE0Mi41MTYsODcuNjEzIEMxNDIuNzk0LDg3LjYxMyAxNDMuMDc2LDg3LjU0MiAxNDMuMzMzLDg3LjM5MyBMMTY5Ljg2NSw3Mi4wNzYgTDE5Myw4NS40MzMgQzE5My41MjMsODUuNzM1IDE5NC4wNTgsODUuODg4IDE5NC41OSw4NS44ODggQzE5Ni4wODcsODUuODg4IDE5Ny4xNzMsODQuNjg5IDE5Ny4xNzMsODMuMDM2IEwxOTcuMTczLDI5LjAzNSBDMTk3LjE3MywyOC40NTEgMTk2Ljg2MSwyNy45MTEgMTk2LjM1NSwyNy42MTkgQzE5Ni4zNTUsMjcuNjE5IDE3MS44NDMsMTMuNDY3IDE3MC4zODUsMTIuNjI2IEMxNzAuMTMyLDEyLjQ4IDE2OS44NSwxMi40MDcgMTY5LjU2OCwxMi40MDcgQzE2OS4yODUsMTIuNDA3IDE2OS4wMDIsMTIuNDgxIDE2OC43NDksMTIuNjI3IEMxNjguMTQzLDEyLjk3OCAxNjUuNzU2LDE0LjM1NyAxNjQuNDI0LDE1LjEyNSBMMTU5LjYxNSwxMC44NyBDMTU4Ljc5NiwxMC4xNDUgMTU4LjE1NCw4LjkzNyAxNTguMDU0LDcuOTM0IEMxNTguMDQ1LDcuODM3IDE1OC4wMzQsNy43MzkgMTU4LjAyMSw3LjY0IEMxNTguMDA1LDcuNTIzIDE1Ny45OTgsNy40MSAxNTcuOTk4LDcuMzA0IEwxNTcuOTk4LDYuNDE4IEMxNTcuOTk4LDUuODM0IDE1Ny42ODYsNS4yOTUgMTU3LjE4MSw1LjAwMiBDMTU2LjYyNCw0LjY4IDE1MC40NDIsMS4xMTEgMTUwLjQ0MiwxLjExMSBDMTUwLjE4OSwwLjk2NSAxNDkuOTA3LDAuODkyIDE0OS42MjUsMC44OTIiIGlkPSJGaWxsLTEiIGZpbGw9IiM0NTVBNjQiPjwvcGF0aD4KICAgICAgICAgICAgICAgICAgICA8cGF0aCBkPSJNOTYuMDI3LDI1LjYzNiBMMTQyLjYwMyw1Mi41MjcgQzE0My44MDcsNTMuMjIyIDE0NC41ODIsNTQuMTE0IDE0NC44NDUsNTUuMDY4IEwxNDQuODM1LDU1LjA3NSBMNjMuNDYxLDEwMi4wNTcgTDYzLjQ2LDEwMi4wNTcgQzYxLjgwNiwxMDEuOTA1IDYwLjI2MSwxMDEuNDU3IDU5LjA1NywxMDAuNzYyIEwxMi40ODEsNzMuODcxIEw5Ni4wMjcsMjUuNjM2IiBpZD0iRmlsbC0yIiBmaWxsPSIjRkFGQUZBIj48L3BhdGg+CiAgICAgICAgICAgICAgICAgICAgPHBhdGggZD0iTTYzLjQ2MSwxMDIuMTc0IEM2My40NTMsMTAyLjE3NCA2My40NDYsMTAyLjE3NCA2My40MzksMTAyLjE3MiBDNjEuNzQ2LDEwMi4wMTYgNjAuMjExLDEwMS41NjMgNTguOTk4LDEwMC44NjMgTDEyLjQyMiw3My45NzMgQzEyLjM4Niw3My45NTIgMTIuMzY0LDczLjkxNCAxMi4zNjQsNzMuODcxIEMxMi4zNjQsNzMuODMgMTIuMzg2LDczLjc5MSAxMi40MjIsNzMuNzcgTDk1Ljk2OCwyNS41MzUgQzk2LjAwNCwyNS41MTQgOTYuMDQ5LDI1LjUxNCA5Ni4wODUsMjUuNTM1IEwxNDIuNjYxLDUyLjQyNiBDMTQzLjg4OCw1My4xMzQgMTQ0LjY4Miw1NC4wMzggMTQ0Ljk1Nyw1NS4wMzcgQzE0NC45Nyw1NS4wODMgMTQ0Ljk1Myw1NS4xMzMgMTQ0LjkxNSw1NS4xNjEgQzE0NC45MTEsNTUuMTY1IDE0NC44OTgsNTUuMTc0IDE0NC44OTQsNTUuMTc3IEw2My41MTksMTAyLjE1OCBDNjMuNTAxLDEwMi4xNjkgNjMuNDgxLDEwMi4xNzQgNjMuNDYxLDEwMi4xNzQgTDYzLjQ2MSwxMDIuMTc0IFogTTEyLjcxNCw3My44NzEgTDU5LjExNSwxMDAuNjYxIEM2MC4yOTMsMTAxLjM0MSA2MS43ODYsMTAxLjc4MiA2My40MzUsMTAxLjkzNyBMMTQ0LjcwNyw1NS4wMTUgQzE0NC40MjgsNTQuMTA4IDE0My42ODIsNTMuMjg1IDE0Mi41NDQsNTIuNjI4IEw5Ni4wMjcsMjUuNzcxIEwxMi43MTQsNzMuODcxIEwxMi43MTQsNzMuODcxIFoiIGlkPSJGaWxsLTMiIGZpbGw9IiM2MDdEOEIiPjwvcGF0aD4KICAgICAgICAgICAgICAgICAgICA8cGF0aCBkPSJNMTQ4LjMyNyw1OC40NzEgQzE0OC4xNDUsNTguNDggMTQ3Ljk2Miw1OC40OCAxNDcuNzgxLDU4LjQ3MiBDMTQ1Ljg4Nyw1OC4zODkgMTQ0LjQ3OSw1Ny40MzQgMTQ0LjYzNiw1Ni4zNCBDMTQ0LjY4OSw1NS45NjcgMTQ0LjY2NCw1NS41OTcgMTQ0LjU2NCw1NS4yMzUgTDYzLjQ2MSwxMDIuMDU3IEM2NC4wODksMTAyLjExNSA2NC43MzMsMTAyLjEzIDY1LjM3OSwxMDIuMDk5IEM2NS41NjEsMTAyLjA5IDY1Ljc0MywxMDIuMDkgNjUuOTI1LDEwMi4wOTggQzY3LjgxOSwxMDIuMTgxIDY5LjIyNywxMDMuMTM2IDY5LjA3LDEwNC4yMyBMMTQ4LjMyNyw1OC40NzEiIGlkPSJGaWxsLTQiIGZpbGw9IiNGRkZGRkYiPjwvcGF0aD4KICAgICAgICAgICAgICAgICAgICA8cGF0aCBkPSJNNjkuMDcsMTA0LjM0NyBDNjkuMDQ4LDEwNC4zNDcgNjkuMDI1LDEwNC4zNCA2OS4wMDUsMTA0LjMyNyBDNjguOTY4LDEwNC4zMDEgNjguOTQ4LDEwNC4yNTcgNjguOTU1LDEwNC4yMTMgQzY5LDEwMy44OTYgNjguODk4LDEwMy41NzYgNjguNjU4LDEwMy4yODggQzY4LjE1MywxMDIuNjc4IDY3LjEwMywxMDIuMjY2IDY1LjkyLDEwMi4yMTQgQzY1Ljc0MiwxMDIuMjA2IDY1LjU2MywxMDIuMjA3IDY1LjM4NSwxMDIuMjE1IEM2NC43NDIsMTAyLjI0NiA2NC4wODcsMTAyLjIzMiA2My40NSwxMDIuMTc0IEM2My4zOTksMTAyLjE2OSA2My4zNTgsMTAyLjEzMiA2My4zNDcsMTAyLjA4MiBDNjMuMzM2LDEwMi4wMzMgNjMuMzU4LDEwMS45ODEgNjMuNDAyLDEwMS45NTYgTDE0NC41MDYsNTUuMTM0IEMxNDQuNTM3LDU1LjExNiAxNDQuNTc1LDU1LjExMyAxNDQuNjA5LDU1LjEyNyBDMTQ0LjY0Miw1NS4xNDEgMTQ0LjY2OCw1NS4xNyAxNDQuNjc3LDU1LjIwNCBDMTQ0Ljc4MSw1NS41ODUgMTQ0LjgwNiw1NS45NzIgMTQ0Ljc1MSw1Ni4zNTcgQzE0NC43MDYsNTYuNjczIDE0NC44MDgsNTYuOTk0IDE0NS4wNDcsNTcuMjgyIEMxNDUuNTUzLDU3Ljg5MiAxNDYuNjAyLDU4LjMwMyAxNDcuNzg2LDU4LjM1NSBDMTQ3Ljk2NCw1OC4zNjMgMTQ4LjE0Myw1OC4zNjMgMTQ4LjMyMSw1OC4zNTQgQzE0OC4zNzcsNTguMzUyIDE0OC40MjQsNTguMzg3IDE0OC40MzksNTguNDM4IEMxNDguNDU0LDU4LjQ5IDE0OC40MzIsNTguNTQ1IDE0OC4zODUsNTguNTcyIEw2OS4xMjksMTA0LjMzMSBDNjkuMTExLDEwNC4zNDIgNjkuMDksMTA0LjM0NyA2OS4wNywxMDQuMzQ3IEw2OS4wNywxMDQuMzQ3IFogTTY1LjY2NSwxMDEuOTc1IEM2NS43NTQsMTAxLjk3NSA2NS44NDIsMTAxLjk3NyA2NS45MywxMDEuOTgxIEM2Ny4xOTYsMTAyLjAzNyA2OC4yODMsMTAyLjQ2OSA2OC44MzgsMTAzLjEzOSBDNjkuMDY1LDEwMy40MTMgNjkuMTg4LDEwMy43MTQgNjkuMTk4LDEwNC4wMjEgTDE0Ny44ODMsNTguNTkyIEMxNDcuODQ3LDU4LjU5MiAxNDcuODExLDU4LjU5MSAxNDcuNzc2LDU4LjU4OSBDMTQ2LjUwOSw1OC41MzMgMTQ1LjQyMiw1OC4xIDE0NC44NjcsNTcuNDMxIEMxNDQuNTg1LDU3LjA5MSAxNDQuNDY1LDU2LjcwNyAxNDQuNTIsNTYuMzI0IEMxNDQuNTYzLDU2LjAyMSAxNDQuNTUyLDU1LjcxNiAxNDQuNDg4LDU1LjQxNCBMNjMuODQ2LDEwMS45NyBDNjQuMzUzLDEwMi4wMDIgNjQuODY3LDEwMi4wMDYgNjUuMzc0LDEwMS45ODIgQzY1LjQ3MSwxMDEuOTc3IDY1LjU2OCwxMDEuOTc1IDY1LjY2NSwxMDEuOTc1IEw2NS42NjUsMTAxLjk3NSBaIiBpZD0iRmlsbC01IiBmaWxsPSIjNjA3RDhCIj48L3BhdGg+CiAgICAgICAgICAgICAgICAgICAgPHBhdGggZD0iTTIuMjA4LDU1LjEzNCBDMS4yMDcsNTMuMzA3IDEuOTY3LDUwLjkxNyAzLjkwNiw0OS43OTcgTDU5LjkxNywxNy40NTMgQzYxLjg1NiwxNi4zMzMgNjQuMjQxLDE2LjkwNyA2NS4yNDMsMTguNzM0IEw2NS40NzUsMTkuMTQ0IEM2NS44NzIsMTkuODgyIDY2LjM2OCwyMC41NiA2Ni45NDUsMjEuMTY1IEw2Ny4yMjMsMjEuNDM1IEM3MC41NDgsMjQuNjQ5IDc1LjgwNiwyNS4xNTEgODAuMTExLDIyLjY2NSBMODcuNDMsMTguNDQ1IEM4OS4zNywxNy4zMjYgOTEuNzU0LDE3Ljg5OSA5Mi43NTUsMTkuNzI3IEw5Ni4wMDUsMjUuNjU1IEwxMi40ODYsNzMuODg0IEwyLjIwOCw1NS4xMzQgWiIgaWQ9IkZpbGwtNiIgZmlsbD0iI0ZBRkFGQSI+PC9wYXRoPgogICAgICAgICAgICAgICAgICAgIDxwYXRoIGQ9Ik0xMi40ODYsNzQuMDAxIEMxMi40NzYsNzQuMDAxIDEyLjQ2NSw3My45OTkgMTIuNDU1LDczLjk5NiBDMTIuNDI0LDczLjk4OCAxMi4zOTksNzMuOTY3IDEyLjM4NCw3My45NCBMMi4xMDYsNTUuMTkgQzEuMDc1LDUzLjMxIDEuODU3LDUwLjg0NSAzLjg0OCw0OS42OTYgTDU5Ljg1OCwxNy4zNTIgQzYwLjUyNSwxNi45NjcgNjEuMjcxLDE2Ljc2NCA2Mi4wMTYsMTYuNzY0IEM2My40MzEsMTYuNzY0IDY0LjY2NiwxNy40NjYgNjUuMzI3LDE4LjY0NiBDNjUuMzM3LDE4LjY1NCA2NS4zNDUsMTguNjYzIDY1LjM1MSwxOC42NzQgTDY1LjU3OCwxOS4wODggQzY1LjU4NCwxOS4xIDY1LjU4OSwxOS4xMTIgNjUuNTkxLDE5LjEyNiBDNjUuOTg1LDE5LjgzOCA2Ni40NjksMjAuNDk3IDY3LjAzLDIxLjA4NSBMNjcuMzA1LDIxLjM1MSBDNjkuMTUxLDIzLjEzNyA3MS42NDksMjQuMTIgNzQuMzM2LDI0LjEyIEM3Ni4zMTMsMjQuMTIgNzguMjksMjMuNTgyIDgwLjA1MywyMi41NjMgQzgwLjA2NCwyMi41NTcgODAuMDc2LDIyLjU1MyA4MC4wODgsMjIuNTUgTDg3LjM3MiwxOC4zNDQgQzg4LjAzOCwxNy45NTkgODguNzg0LDE3Ljc1NiA4OS41MjksMTcuNzU2IEM5MC45NTYsMTcuNzU2IDkyLjIwMSwxOC40NzIgOTIuODU4LDE5LjY3IEw5Ni4xMDcsMjUuNTk5IEM5Ni4xMzgsMjUuNjU0IDk2LjExOCwyNS43MjQgOTYuMDYzLDI1Ljc1NiBMMTIuNTQ1LDczLjk4NSBDMTIuNTI2LDczLjk5NiAxMi41MDYsNzQuMDAxIDEyLjQ4Niw3NC4wMDEgTDEyLjQ4Niw3NC4wMDEgWiBNNjIuMDE2LDE2Ljk5NyBDNjEuMzEyLDE2Ljk5NyA2MC42MDYsMTcuMTkgNTkuOTc1LDE3LjU1NCBMMy45NjUsNDkuODk5IEMyLjA4Myw1MC45ODUgMS4zNDEsNTMuMzA4IDIuMzEsNTUuMDc4IEwxMi41MzEsNzMuNzIzIEw5NS44NDgsMjUuNjExIEw5Mi42NTMsMTkuNzgyIEM5Mi4wMzgsMTguNjYgOTAuODcsMTcuOTkgODkuNTI5LDE3Ljk5IEM4OC44MjUsMTcuOTkgODguMTE5LDE4LjE4MiA4Ny40ODksMTguNTQ3IEw4MC4xNzIsMjIuNzcyIEM4MC4xNjEsMjIuNzc4IDgwLjE0OSwyMi43ODIgODAuMTM3LDIyLjc4NSBDNzguMzQ2LDIzLjgxMSA3Ni4zNDEsMjQuMzU0IDc0LjMzNiwyNC4zNTQgQzcxLjU4OCwyNC4zNTQgNjkuMDMzLDIzLjM0NyA2Ny4xNDIsMjEuNTE5IEw2Ni44NjQsMjEuMjQ5IEM2Ni4yNzcsMjAuNjM0IDY1Ljc3NCwxOS45NDcgNjUuMzY3LDE5LjIwMyBDNjUuMzYsMTkuMTkyIDY1LjM1NiwxOS4xNzkgNjUuMzU0LDE5LjE2NiBMNjUuMTYzLDE4LjgxOSBDNjUuMTU0LDE4LjgxMSA2NS4xNDYsMTguODAxIDY1LjE0LDE4Ljc5IEM2NC41MjUsMTcuNjY3IDYzLjM1NywxNi45OTcgNjIuMDE2LDE2Ljk5NyBMNjIuMDE2LDE2Ljk5NyBaIiBpZD0iRmlsbC03IiBmaWxsPSIjNjA3RDhCIj48L3BhdGg+CiAgICAgICAgICAgICAgICAgICAgPHBhdGggZD0iTTQyLjQzNCw0OC44MDggTDQyLjQzNCw0OC44MDggQzM5LjkyNCw0OC44MDcgMzcuNzM3LDQ3LjU1IDM2LjU4Miw0NS40NDMgQzM0Ljc3MSw0Mi4xMzkgMzYuMTQ0LDM3LjgwOSAzOS42NDEsMzUuNzg5IEw1MS45MzIsMjguNjkxIEM1My4xMDMsMjguMDE1IDU0LjQxMywyNy42NTggNTUuNzIxLDI3LjY1OCBDNTguMjMxLDI3LjY1OCA2MC40MTgsMjguOTE2IDYxLjU3MywzMS4wMjMgQzYzLjM4NCwzNC4zMjcgNjIuMDEyLDM4LjY1NyA1OC41MTQsNDAuNjc3IEw0Ni4yMjMsNDcuNzc1IEM0NS4wNTMsNDguNDUgNDMuNzQyLDQ4LjgwOCA0Mi40MzQsNDguODA4IEw0Mi40MzQsNDguODA4IFogTTU1LjcyMSwyOC4xMjUgQzU0LjQ5NSwyOC4xMjUgNTMuMjY1LDI4LjQ2MSA1Mi4xNjYsMjkuMDk2IEwzOS44NzUsMzYuMTk0IEMzNi41OTYsMzguMDg3IDM1LjMwMiw0Mi4xMzYgMzYuOTkyLDQ1LjIxOCBDMzguMDYzLDQ3LjE3MyA0MC4wOTgsNDguMzQgNDIuNDM0LDQ4LjM0IEM0My42NjEsNDguMzQgNDQuODksNDguMDA1IDQ1Ljk5LDQ3LjM3IEw1OC4yODEsNDAuMjcyIEM2MS41NiwzOC4zNzkgNjIuODUzLDM0LjMzIDYxLjE2NCwzMS4yNDggQzYwLjA5MiwyOS4yOTMgNTguMDU4LDI4LjEyNSA1NS43MjEsMjguMTI1IEw1NS43MjEsMjguMTI1IFoiIGlkPSJGaWxsLTgiIGZpbGw9IiM2MDdEOEIiPjwvcGF0aD4KICAgICAgICAgICAgICAgICAgICA8cGF0aCBkPSJNMTQ5LjU4OCwyLjQwNyBDMTQ5LjU4OCwyLjQwNyAxNTUuNzY4LDUuOTc1IDE1Ni4zMjUsNi4yOTcgTDE1Ni4zMjUsNy4xODQgQzE1Ni4zMjUsNy4zNiAxNTYuMzM4LDcuNTQ0IDE1Ni4zNjIsNy43MzMgQzE1Ni4zNzMsNy44MTQgMTU2LjM4Miw3Ljg5NCAxNTYuMzksNy45NzUgQzE1Ni41Myw5LjM5IDE1Ny4zNjMsMTAuOTczIDE1OC40OTUsMTEuOTc0IEwxNjUuODkxLDE4LjUxOSBDMTY2LjA2OCwxOC42NzUgMTY2LjI0OSwxOC44MTQgMTY2LjQzMiwxOC45MzQgQzE2OC4wMTEsMTkuOTc0IDE2OS4zODIsMTkuNCAxNjkuNDk0LDE3LjY1MiBDMTY5LjU0MywxNi44NjggMTY5LjU1MSwxNi4wNTcgMTY5LjUxNywxNS4yMjMgTDE2OS41MTQsMTUuMDYzIEwxNjkuNTE0LDEzLjkxMiBDMTcwLjc4LDE0LjY0MiAxOTUuNTAxLDI4LjkxNSAxOTUuNTAxLDI4LjkxNSBMMTk1LjUwMSw4Mi45MTUgQzE5NS41MDEsODQuMDA1IDE5NC43MzEsODQuNDQ1IDE5My43ODEsODMuODk3IEwxNTEuMzA4LDU5LjM3NCBDMTUwLjM1OCw1OC44MjYgMTQ5LjU4OCw1Ny40OTcgMTQ5LjU4OCw1Ni40MDggTDE0OS41ODgsMjIuMzc1IiBpZD0iRmlsbC05IiBmaWxsPSIjRkFGQUZBIj48L3BhdGg+CiAgICAgICAgICAgICAgICAgICAgPHBhdGggZD0iTTE5NC41NTMsODQuMjUgQzE5NC4yOTYsODQuMjUgMTk0LjAxMyw4NC4xNjUgMTkzLjcyMiw4My45OTcgTDE1MS4yNSw1OS40NzYgQzE1MC4yNjksNTguOTA5IDE0OS40NzEsNTcuNTMzIDE0OS40NzEsNTYuNDA4IEwxNDkuNDcxLDIyLjM3NSBMMTQ5LjcwNSwyMi4zNzUgTDE0OS43MDUsNTYuNDA4IEMxNDkuNzA1LDU3LjQ1OSAxNTAuNDUsNTguNzQ0IDE1MS4zNjYsNTkuMjc0IEwxOTMuODM5LDgzLjc5NSBDMTk0LjI2Myw4NC4wNCAxOTQuNjU1LDg0LjA4MyAxOTQuOTQyLDgzLjkxNyBDMTk1LjIyNyw4My43NTMgMTk1LjM4NCw4My4zOTcgMTk1LjM4NCw4Mi45MTUgTDE5NS4zODQsMjguOTgyIEMxOTQuMTAyLDI4LjI0MiAxNzIuMTA0LDE1LjU0MiAxNjkuNjMxLDE0LjExNCBMMTY5LjYzNCwxNS4yMiBDMTY5LjY2OCwxNi4wNTIgMTY5LjY2LDE2Ljg3NCAxNjkuNjEsMTcuNjU5IEMxNjkuNTU2LDE4LjUwMyAxNjkuMjE0LDE5LjEyMyAxNjguNjQ3LDE5LjQwNSBDMTY4LjAyOCwxOS43MTQgMTY3LjE5NywxOS41NzggMTY2LjM2NywxOS4wMzIgQzE2Ni4xODEsMTguOTA5IDE2NS45OTUsMTguNzY2IDE2NS44MTQsMTguNjA2IEwxNTguNDE3LDEyLjA2MiBDMTU3LjI1OSwxMS4wMzYgMTU2LjQxOCw5LjQzNyAxNTYuMjc0LDcuOTg2IEMxNTYuMjY2LDcuOTA3IDE1Ni4yNTcsNy44MjcgMTU2LjI0Nyw3Ljc0OCBDMTU2LjIyMSw3LjU1NSAxNTYuMjA5LDcuMzY1IDE1Ni4yMDksNy4xODQgTDE1Ni4yMDksNi4zNjQgQzE1NS4zNzUsNS44ODMgMTQ5LjUyOSwyLjUwOCAxNDkuNTI5LDIuNTA4IEwxNDkuNjQ2LDIuMzA2IEMxNDkuNjQ2LDIuMzA2IDE1NS44MjcsNS44NzQgMTU2LjM4NCw2LjE5NiBMMTU2LjQ0Miw2LjIzIEwxNTYuNDQyLDcuMTg0IEMxNTYuNDQyLDcuMzU1IDE1Ni40NTQsNy41MzUgMTU2LjQ3OCw3LjcxNyBDMTU2LjQ4OSw3LjggMTU2LjQ5OSw3Ljg4MiAxNTYuNTA3LDcuOTYzIEMxNTYuNjQ1LDkuMzU4IDE1Ny40NTUsMTAuODk4IDE1OC41NzIsMTEuODg2IEwxNjUuOTY5LDE4LjQzMSBDMTY2LjE0MiwxOC41ODQgMTY2LjMxOSwxOC43MiAxNjYuNDk2LDE4LjgzNyBDMTY3LjI1NCwxOS4zMzYgMTY4LDE5LjQ2NyAxNjguNTQzLDE5LjE5NiBDMTY5LjAzMywxOC45NTMgMTY5LjMyOSwxOC40MDEgMTY5LjM3NywxNy42NDUgQzE2OS40MjcsMTYuODY3IDE2OS40MzQsMTYuMDU0IDE2OS40MDEsMTUuMjI4IEwxNjkuMzk3LDE1LjA2NSBMMTY5LjM5NywxMy43MSBMMTY5LjU3MiwxMy44MSBDMTcwLjgzOSwxNC41NDEgMTk1LjU1OSwyOC44MTQgMTk1LjU1OSwyOC44MTQgTDE5NS42MTgsMjguODQ3IEwxOTUuNjE4LDgyLjkxNSBDMTk1LjYxOCw4My40ODQgMTk1LjQyLDgzLjkxMSAxOTUuMDU5LDg0LjExOSBDMTk0LjkwOCw4NC4yMDYgMTk0LjczNyw4NC4yNSAxOTQuNTUzLDg0LjI1IiBpZD0iRmlsbC0xMCIgZmlsbD0iIzYwN0Q4QiI+PC9wYXRoPgogICAgICAgICAgICAgICAgICAgIDxwYXRoIGQ9Ik0xNDUuNjg1LDU2LjE2MSBMMTY5LjgsNzAuMDgzIEwxNDMuODIyLDg1LjA4MSBMMTQyLjM2LDg0Ljc3NCBDMTM1LjgyNiw4Mi42MDQgMTI4LjczMiw4MS4wNDYgMTIxLjM0MSw4MC4xNTggQzExNi45NzYsNzkuNjM0IDExMi42NzgsODEuMjU0IDExMS43NDMsODMuNzc4IEMxMTEuNTA2LDg0LjQxNCAxMTEuNTAzLDg1LjA3MSAxMTEuNzMyLDg1LjcwNiBDMTEzLjI3LDg5Ljk3MyAxMTUuOTY4LDk0LjA2OSAxMTkuNzI3LDk3Ljg0MSBMMTIwLjI1OSw5OC42ODYgQzEyMC4yNiw5OC42ODUgOTQuMjgyLDExMy42ODMgOTQuMjgyLDExMy42ODMgTDcwLjE2Nyw5OS43NjEgTDE0NS42ODUsNTYuMTYxIiBpZD0iRmlsbC0xMSIgZmlsbD0iI0ZGRkZGRiI+PC9wYXRoPgogICAgICAgICAgICAgICAgICAgIDxwYXRoIGQ9Ik05NC4yODIsMTEzLjgxOCBMOTQuMjIzLDExMy43ODUgTDY5LjkzMyw5OS43NjEgTDcwLjEwOCw5OS42NiBMMTQ1LjY4NSw1Ni4wMjYgTDE0NS43NDMsNTYuMDU5IEwxNzAuMDMzLDcwLjA4MyBMMTQzLjg0Miw4NS4yMDUgTDE0My43OTcsODUuMTk1IEMxNDMuNzcyLDg1LjE5IDE0Mi4zMzYsODQuODg4IDE0Mi4zMzYsODQuODg4IEMxMzUuNzg3LDgyLjcxNCAxMjguNzIzLDgxLjE2MyAxMjEuMzI3LDgwLjI3NCBDMTIwLjc4OCw4MC4yMDkgMTIwLjIzNiw4MC4xNzcgMTE5LjY4OSw4MC4xNzcgQzExNS45MzEsODAuMTc3IDExMi42MzUsODEuNzA4IDExMS44NTIsODMuODE5IEMxMTEuNjI0LDg0LjQzMiAxMTEuNjIxLDg1LjA1MyAxMTEuODQyLDg1LjY2NyBDMTEzLjM3Nyw4OS45MjUgMTE2LjA1OCw5My45OTMgMTE5LjgxLDk3Ljc1OCBMMTE5LjgyNiw5Ny43NzkgTDEyMC4zNTIsOTguNjE0IEMxMjAuMzU0LDk4LjYxNyAxMjAuMzU2LDk4LjYyIDEyMC4zNTgsOTguNjI0IEwxMjAuNDIyLDk4LjcyNiBMMTIwLjMxNyw5OC43ODcgQzEyMC4yNjQsOTguODE4IDk0LjU5OSwxMTMuNjM1IDk0LjM0LDExMy43ODUgTDk0LjI4MiwxMTMuODE4IEw5NC4yODIsMTEzLjgxOCBaIE03MC40MDEsOTkuNzYxIEw5NC4yODIsMTEzLjU0OSBMMTE5LjA4NCw5OS4yMjkgQzExOS42Myw5OC45MTQgMTE5LjkzLDk4Ljc0IDEyMC4xMDEsOTguNjU0IEwxMTkuNjM1LDk3LjkxNCBDMTE1Ljg2NCw5NC4xMjcgMTEzLjE2OCw5MC4wMzMgMTExLjYyMiw4NS43NDYgQzExMS4zODIsODUuMDc5IDExMS4zODYsODQuNDA0IDExMS42MzMsODMuNzM4IEMxMTIuNDQ4LDgxLjUzOSAxMTUuODM2LDc5Ljk0MyAxMTkuNjg5LDc5Ljk0MyBDMTIwLjI0Niw3OS45NDMgMTIwLjgwNiw3OS45NzYgMTIxLjM1NSw4MC4wNDIgQzEyOC43NjcsODAuOTMzIDEzNS44NDYsODIuNDg3IDE0Mi4zOTYsODQuNjYzIEMxNDMuMjMyLDg0LjgzOCAxNDMuNjExLDg0LjkxNyAxNDMuNzg2LDg0Ljk2NyBMMTY5LjU2Niw3MC4wODMgTDE0NS42ODUsNTYuMjk1IEw3MC40MDEsOTkuNzYxIEw3MC40MDEsOTkuNzYxIFoiIGlkPSJGaWxsLTEyIiBmaWxsPSIjNjA3RDhCIj48L3BhdGg+CiAgICAgICAgICAgICAgICAgICAgPHBhdGggZD0iTTE2Ny4yMywxOC45NzkgTDE2Ny4yMyw2OS44NSBMMTM5LjkwOSw4NS42MjMgTDEzMy40NDgsNzEuNDU2IEMxMzIuNTM4LDY5LjQ2IDEzMC4wMiw2OS43MTggMTI3LjgyNCw3Mi4wMyBDMTI2Ljc2OSw3My4xNCAxMjUuOTMxLDc0LjU4NSAxMjUuNDk0LDc2LjA0OCBMMTE5LjAzNCw5Ny42NzYgTDkxLjcxMiwxMTMuNDUgTDkxLjcxMiw2Mi41NzkgTDE2Ny4yMywxOC45NzkiIGlkPSJGaWxsLTEzIiBmaWxsPSIjRkZGRkZGIj48L3BhdGg+CiAgICAgICAgICAgICAgICAgICAgPHBhdGggZD0iTTkxLjcxMiwxMTMuNTY3IEM5MS42OTIsMTEzLjU2NyA5MS42NzIsMTEzLjU2MSA5MS42NTMsMTEzLjU1MSBDOTEuNjE4LDExMy41MyA5MS41OTUsMTEzLjQ5MiA5MS41OTUsMTEzLjQ1IEw5MS41OTUsNjIuNTc5IEM5MS41OTUsNjIuNTM3IDkxLjYxOCw2Mi40OTkgOTEuNjUzLDYyLjQ3OCBMMTY3LjE3MiwxOC44NzggQzE2Ny4yMDgsMTguODU3IDE2Ny4yNTIsMTguODU3IDE2Ny4yODgsMTguODc4IEMxNjcuMzI0LDE4Ljg5OSAxNjcuMzQ3LDE4LjkzNyAxNjcuMzQ3LDE4Ljk3OSBMMTY3LjM0Nyw2OS44NSBDMTY3LjM0Nyw2OS44OTEgMTY3LjMyNCw2OS45MyAxNjcuMjg4LDY5Ljk1IEwxMzkuOTY3LDg1LjcyNSBDMTM5LjkzOSw4NS43NDEgMTM5LjkwNSw4NS43NDUgMTM5Ljg3Myw4NS43MzUgQzEzOS44NDIsODUuNzI1IDEzOS44MTYsODUuNzAyIDEzOS44MDIsODUuNjcyIEwxMzMuMzQyLDcxLjUwNCBDMTMyLjk2Nyw3MC42ODIgMTMyLjI4LDcwLjIyOSAxMzEuNDA4LDcwLjIyOSBDMTMwLjMxOSw3MC4yMjkgMTI5LjA0NCw3MC45MTUgMTI3LjkwOCw3Mi4xMSBDMTI2Ljg3NCw3My4yIDEyNi4wMzQsNzQuNjQ3IDEyNS42MDYsNzYuMDgyIEwxMTkuMTQ2LDk3LjcwOSBDMTE5LjEzNyw5Ny43MzggMTE5LjExOCw5Ny43NjIgMTE5LjA5Miw5Ny43NzcgTDkxLjc3LDExMy41NTEgQzkxLjc1MiwxMTMuNTYxIDkxLjczMiwxMTMuNTY3IDkxLjcxMiwxMTMuNTY3IEw5MS43MTIsMTEzLjU2NyBaIE05MS44MjksNjIuNjQ3IEw5MS44MjksMTEzLjI0OCBMMTE4LjkzNSw5Ny41OTggTDEyNS4zODIsNzYuMDE1IEMxMjUuODI3LDc0LjUyNSAxMjYuNjY0LDczLjA4MSAxMjcuNzM5LDcxLjk1IEMxMjguOTE5LDcwLjcwOCAxMzAuMjU2LDY5Ljk5NiAxMzEuNDA4LDY5Ljk5NiBDMTMyLjM3Nyw2OS45OTYgMTMzLjEzOSw3MC40OTcgMTMzLjU1NCw3MS40MDcgTDEzOS45NjEsODUuNDU4IEwxNjcuMTEzLDY5Ljc4MiBMMTY3LjExMywxOS4xODEgTDkxLjgyOSw2Mi42NDcgTDkxLjgyOSw2Mi42NDcgWiIgaWQ9IkZpbGwtMTQiIGZpbGw9IiM2MDdEOEIiPjwvcGF0aD4KICAgICAgICAgICAgICAgICAgICA8cGF0aCBkPSJNMTY4LjU0MywxOS4yMTMgTDE2OC41NDMsNzAuMDgzIEwxNDEuMjIxLDg1Ljg1NyBMMTM0Ljc2MSw3MS42ODkgQzEzMy44NTEsNjkuNjk0IDEzMS4zMzMsNjkuOTUxIDEyOS4xMzcsNzIuMjYzIEMxMjguMDgyLDczLjM3NCAxMjcuMjQ0LDc0LjgxOSAxMjYuODA3LDc2LjI4MiBMMTIwLjM0Niw5Ny45MDkgTDkzLjAyNSwxMTMuNjgzIEw5My4wMjUsNjIuODEzIEwxNjguNTQzLDE5LjIxMyIgaWQ9IkZpbGwtMTUiIGZpbGw9IiNGRkZGRkYiPjwvcGF0aD4KICAgICAgICAgICAgICAgICAgICA8cGF0aCBkPSJNOTMuMDI1LDExMy44IEM5My4wMDUsMTEzLjggOTIuOTg0LDExMy43OTUgOTIuOTY2LDExMy43ODUgQzkyLjkzMSwxMTMuNzY0IDkyLjkwOCwxMTMuNzI1IDkyLjkwOCwxMTMuNjg0IEw5Mi45MDgsNjIuODEzIEM5Mi45MDgsNjIuNzcxIDkyLjkzMSw2Mi43MzMgOTIuOTY2LDYyLjcxMiBMMTY4LjQ4NCwxOS4xMTIgQzE2OC41MiwxOS4wOSAxNjguNTY1LDE5LjA5IDE2OC42MDEsMTkuMTEyIEMxNjguNjM3LDE5LjEzMiAxNjguNjYsMTkuMTcxIDE2OC42NiwxOS4yMTIgTDE2OC42Niw3MC4wODMgQzE2OC42Niw3MC4xMjUgMTY4LjYzNyw3MC4xNjQgMTY4LjYwMSw3MC4xODQgTDE0MS4yOCw4NS45NTggQzE0MS4yNTEsODUuOTc1IDE0MS4yMTcsODUuOTc5IDE0MS4xODYsODUuOTY4IEMxNDEuMTU0LDg1Ljk1OCAxNDEuMTI5LDg1LjkzNiAxNDEuMTE1LDg1LjkwNiBMMTM0LjY1NSw3MS43MzggQzEzNC4yOCw3MC45MTUgMTMzLjU5Myw3MC40NjMgMTMyLjcyLDcwLjQ2MyBDMTMxLjYzMiw3MC40NjMgMTMwLjM1Nyw3MS4xNDggMTI5LjIyMSw3Mi4zNDQgQzEyOC4xODYsNzMuNDMzIDEyNy4zNDcsNzQuODgxIDEyNi45MTksNzYuMzE1IEwxMjAuNDU4LDk3Ljk0MyBDMTIwLjQ1LDk3Ljk3MiAxMjAuNDMxLDk3Ljk5NiAxMjAuNDA1LDk4LjAxIEw5My4wODMsMTEzLjc4NSBDOTMuMDY1LDExMy43OTUgOTMuMDQ1LDExMy44IDkzLjAyNSwxMTMuOCBMOTMuMDI1LDExMy44IFogTTkzLjE0Miw2Mi44ODEgTDkzLjE0MiwxMTMuNDgxIEwxMjAuMjQ4LDk3LjgzMiBMMTI2LjY5NSw3Ni4yNDggQzEyNy4xNCw3NC43NTggMTI3Ljk3Nyw3My4zMTUgMTI5LjA1Miw3Mi4xODMgQzEzMC4yMzEsNzAuOTQyIDEzMS41NjgsNzAuMjI5IDEzMi43Miw3MC4yMjkgQzEzMy42ODksNzAuMjI5IDEzNC40NTIsNzAuNzMxIDEzNC44NjcsNzEuNjQxIEwxNDEuMjc0LDg1LjY5MiBMMTY4LjQyNiw3MC4wMTYgTDE2OC40MjYsMTkuNDE1IEw5My4xNDIsNjIuODgxIEw5My4xNDIsNjIuODgxIFoiIGlkPSJGaWxsLTE2IiBmaWxsPSIjNjA3RDhCIj48L3BhdGg+CiAgICAgICAgICAgICAgICAgICAgPHBhdGggZD0iTTE2OS44LDcwLjA4MyBMMTQyLjQ3OCw4NS44NTcgTDEzNi4wMTgsNzEuNjg5IEMxMzUuMTA4LDY5LjY5NCAxMzIuNTksNjkuOTUxIDEzMC4zOTMsNzIuMjYzIEMxMjkuMzM5LDczLjM3NCAxMjguNSw3NC44MTkgMTI4LjA2NCw3Ni4yODIgTDEyMS42MDMsOTcuOTA5IEw5NC4yODIsMTEzLjY4MyBMOTQuMjgyLDYyLjgxMyBMMTY5LjgsMTkuMjEzIEwxNjkuOCw3MC4wODMgWiIgaWQ9IkZpbGwtMTciIGZpbGw9IiNGQUZBRkEiPjwvcGF0aD4KICAgICAgICAgICAgICAgICAgICA8cGF0aCBkPSJNOTQuMjgyLDExMy45MTcgQzk0LjI0MSwxMTMuOTE3IDk0LjIwMSwxMTMuOTA3IDk0LjE2NSwxMTMuODg2IEM5NC4wOTMsMTEzLjg0NSA5NC4wNDgsMTEzLjc2NyA5NC4wNDgsMTEzLjY4NCBMOTQuMDQ4LDYyLjgxMyBDOTQuMDQ4LDYyLjczIDk0LjA5Myw2Mi42NTIgOTQuMTY1LDYyLjYxMSBMMTY5LjY4MywxOS4wMSBDMTY5Ljc1NSwxOC45NjkgMTY5Ljg0NCwxOC45NjkgMTY5LjkxNywxOS4wMSBDMTY5Ljk4OSwxOS4wNTIgMTcwLjAzMywxOS4xMjkgMTcwLjAzMywxOS4yMTIgTDE3MC4wMzMsNzAuMDgzIEMxNzAuMDMzLDcwLjE2NiAxNjkuOTg5LDcwLjI0NCAxNjkuOTE3LDcwLjI4NSBMMTQyLjU5NSw4Ni4wNiBDMTQyLjUzOCw4Ni4wOTIgMTQyLjQ2OSw4Ni4xIDE0Mi40MDcsODYuMDggQzE0Mi4zNDQsODYuMDYgMTQyLjI5Myw4Ni4wMTQgMTQyLjI2Niw4NS45NTQgTDEzNS44MDUsNzEuNzg2IEMxMzUuNDQ1LDcwLjk5NyAxMzQuODEzLDcwLjU4IDEzMy45NzcsNzAuNTggQzEzMi45MjEsNzAuNTggMTMxLjY3Niw3MS4yNTIgMTMwLjU2Miw3Mi40MjQgQzEyOS41NCw3My41MDEgMTI4LjcxMSw3NC45MzEgMTI4LjI4Nyw3Ni4zNDggTDEyMS44MjcsOTcuOTc2IEMxMjEuODEsOTguMDM0IDEyMS43NzEsOTguMDgyIDEyMS43Miw5OC4xMTIgTDk0LjM5OCwxMTMuODg2IEM5NC4zNjIsMTEzLjkwNyA5NC4zMjIsMTEzLjkxNyA5NC4yODIsMTEzLjkxNyBMOTQuMjgyLDExMy45MTcgWiBNOTQuNTE1LDYyLjk0OCBMOTQuNTE1LDExMy4yNzkgTDEyMS40MDYsOTcuNzU0IEwxMjcuODQsNzYuMjE1IEMxMjguMjksNzQuNzA4IDEyOS4xMzcsNzMuMjQ3IDEzMC4yMjQsNzIuMTAzIEMxMzEuNDI1LDcwLjgzOCAxMzIuNzkzLDcwLjExMiAxMzMuOTc3LDcwLjExMiBDMTM0Ljk5NSw3MC4xMTIgMTM1Ljc5NSw3MC42MzggMTM2LjIzLDcxLjU5MiBMMTQyLjU4NCw4NS41MjYgTDE2OS41NjYsNjkuOTQ4IEwxNjkuNTY2LDE5LjYxNyBMOTQuNTE1LDYyLjk0OCBMOTQuNTE1LDYyLjk0OCBaIiBpZD0iRmlsbC0xOCIgZmlsbD0iIzYwN0Q4QiI+PC9wYXRoPgogICAgICAgICAgICAgICAgICAgIDxwYXRoIGQ9Ik0xMDkuODk0LDkyLjk0MyBMMTA5Ljg5NCw5Mi45NDMgQzEwOC4xMiw5Mi45NDMgMTA2LjY1Myw5Mi4yMTggMTA1LjY1LDkwLjgyMyBDMTA1LjU4Myw5MC43MzEgMTA1LjU5Myw5MC42MSAxMDUuNjczLDkwLjUyOSBDMTA1Ljc1Myw5MC40NDggMTA1Ljg4LDkwLjQ0IDEwNS45NzQsOTAuNTA2IEMxMDYuNzU0LDkxLjA1MyAxMDcuNjc5LDkxLjMzMyAxMDguNzI0LDkxLjMzMyBDMTEwLjA0Nyw5MS4zMzMgMTExLjQ3OCw5MC44OTQgMTEyLjk4LDkwLjAyNyBDMTE4LjI5MSw4Ni45NiAxMjIuNjExLDc5LjUwOSAxMjIuNjExLDczLjQxNiBDMTIyLjYxMSw3MS40ODkgMTIyLjE2OSw2OS44NTYgMTIxLjMzMyw2OC42OTIgQzEyMS4yNjYsNjguNiAxMjEuMjc2LDY4LjQ3MyAxMjEuMzU2LDY4LjM5MiBDMTIxLjQzNiw2OC4zMTEgMTIxLjU2Myw2OC4yOTkgMTIxLjY1Niw2OC4zNjUgQzEyMy4zMjcsNjkuNTM3IDEyNC4yNDcsNzEuNzQ2IDEyNC4yNDcsNzQuNTg0IEMxMjQuMjQ3LDgwLjgyNiAxMTkuODIxLDg4LjQ0NyAxMTQuMzgyLDkxLjU4NyBDMTEyLjgwOCw5Mi40OTUgMTExLjI5OCw5Mi45NDMgMTA5Ljg5NCw5Mi45NDMgTDEwOS44OTQsOTIuOTQzIFogTTEwNi45MjUsOTEuNDAxIEMxMDcuNzM4LDkyLjA1MiAxMDguNzQ1LDkyLjI3OCAxMDkuODkzLDkyLjI3OCBMMTA5Ljg5NCw5Mi4yNzggQzExMS4yMTUsOTIuMjc4IDExMi42NDcsOTEuOTUxIDExNC4xNDgsOTEuMDg0IEMxMTkuNDU5LDg4LjAxNyAxMjMuNzgsODAuNjIxIDEyMy43OCw3NC41MjggQzEyMy43OCw3Mi41NDkgMTIzLjMxNyw3MC45MjkgMTIyLjQ1NCw2OS43NjcgQzEyMi44NjUsNzAuODAyIDEyMy4wNzksNzIuMDQyIDEyMy4wNzksNzMuNDAyIEMxMjMuMDc5LDc5LjY0NSAxMTguNjUzLDg3LjI4NSAxMTMuMjE0LDkwLjQyNSBDMTExLjY0LDkxLjMzNCAxMTAuMTMsOTEuNzQyIDEwOC43MjQsOTEuNzQyIEMxMDguMDgzLDkxLjc0MiAxMDcuNDgxLDkxLjU5MyAxMDYuOTI1LDkxLjQwMSBMMTA2LjkyNSw5MS40MDEgWiIgaWQ9IkZpbGwtMTkiIGZpbGw9IiM2MDdEOEIiPjwvcGF0aD4KICAgICAgICAgICAgICAgICAgICA8cGF0aCBkPSJNMTEzLjA5Nyw5MC4yMyBDMTE4LjQ4MSw4Ny4xMjIgMTIyLjg0NSw3OS41OTQgMTIyLjg0NSw3My40MTYgQzEyMi44NDUsNzEuMzY1IDEyMi4zNjIsNjkuNzI0IDEyMS41MjIsNjguNTU2IEMxMTkuNzM4LDY3LjMwNCAxMTcuMTQ4LDY3LjM2MiAxMTQuMjY1LDY5LjAyNiBDMTA4Ljg4MSw3Mi4xMzQgMTA0LjUxNyw3OS42NjIgMTA0LjUxNyw4NS44NCBDMTA0LjUxNyw4Ny44OTEgMTA1LDg5LjUzMiAxMDUuODQsOTAuNyBDMTA3LjYyNCw5MS45NTIgMTEwLjIxNCw5MS44OTQgMTEzLjA5Nyw5MC4yMyIgaWQ9IkZpbGwtMjAiIGZpbGw9IiNGQUZBRkEiPjwvcGF0aD4KICAgICAgICAgICAgICAgICAgICA8cGF0aCBkPSJNMTA4LjcyNCw5MS42MTQgTDEwOC43MjQsOTEuNjE0IEMxMDcuNTgyLDkxLjYxNCAxMDYuNTY2LDkxLjQwMSAxMDUuNzA1LDkwLjc5NyBDMTA1LjY4NCw5MC43ODMgMTA1LjY2NSw5MC44MTEgMTA1LjY1LDkwLjc5IEMxMDQuNzU2LDg5LjU0NiAxMDQuMjgzLDg3Ljg0MiAxMDQuMjgzLDg1LjgxNyBDMTA0LjI4Myw3OS41NzUgMTA4LjcwOSw3MS45NTMgMTE0LjE0OCw2OC44MTIgQzExNS43MjIsNjcuOTA0IDExNy4yMzIsNjcuNDQ5IDExOC42MzgsNjcuNDQ5IEMxMTkuNzgsNjcuNDQ5IDEyMC43OTYsNjcuNzU4IDEyMS42NTYsNjguMzYyIEMxMjEuNjc4LDY4LjM3NyAxMjEuNjk3LDY4LjM5NyAxMjEuNzEyLDY4LjQxOCBDMTIyLjYwNiw2OS42NjIgMTIzLjA3OSw3MS4zOSAxMjMuMDc5LDczLjQxNSBDMTIzLjA3OSw3OS42NTggMTE4LjY1Myw4Ny4xOTggMTEzLjIxNCw5MC4zMzggQzExMS42NCw5MS4yNDcgMTEwLjEzLDkxLjYxNCAxMDguNzI0LDkxLjYxNCBMMTA4LjcyNCw5MS42MTQgWiBNMTA2LjAwNiw5MC41MDUgQzEwNi43OCw5MS4wMzcgMTA3LjY5NCw5MS4yODEgMTA4LjcyNCw5MS4yODEgQzExMC4wNDcsOTEuMjgxIDExMS40NzgsOTAuODY4IDExMi45OCw5MC4wMDEgQzExOC4yOTEsODYuOTM1IDEyMi42MTEsNzkuNDk2IDEyMi42MTEsNzMuNDAzIEMxMjIuNjExLDcxLjQ5NCAxMjIuMTc3LDY5Ljg4IDEyMS4zNTYsNjguNzE4IEMxMjAuNTgyLDY4LjE4NSAxMTkuNjY4LDY3LjkxOSAxMTguNjM4LDY3LjkxOSBDMTE3LjMxNSw2Ny45MTkgMTE1Ljg4Myw2OC4zNiAxMTQuMzgyLDY5LjIyNyBDMTA5LjA3MSw3Mi4yOTMgMTA0Ljc1MSw3OS43MzMgMTA0Ljc1MSw4NS44MjYgQzEwNC43NTEsODcuNzM1IDEwNS4xODUsODkuMzQzIDEwNi4wMDYsOTAuNTA1IEwxMDYuMDA2LDkwLjUwNSBaIiBpZD0iRmlsbC0yMSIgZmlsbD0iIzYwN0Q4QiI+PC9wYXRoPgogICAgICAgICAgICAgICAgICAgIDxwYXRoIGQ9Ik0xNDkuMzE4LDcuMjYyIEwxMzkuMzM0LDE2LjE0IEwxNTUuMjI3LDI3LjE3MSBMMTYwLjgxNiwyMS4wNTkgTDE0OS4zMTgsNy4yNjIiIGlkPSJGaWxsLTIyIiBmaWxsPSIjRkFGQUZBIj48L3BhdGg+CiAgICAgICAgICAgICAgICAgICAgPHBhdGggZD0iTTE2OS42NzYsMTMuODQgTDE1OS45MjgsMTkuNDY3IEMxNTYuMjg2LDIxLjU3IDE1MC40LDIxLjU4IDE0Ni43ODEsMTkuNDkxIEMxNDMuMTYxLDE3LjQwMiAxNDMuMTgsMTQuMDAzIDE0Ni44MjIsMTEuOSBMMTU2LjMxNyw2LjI5MiBMMTQ5LjU4OCwyLjQwNyBMNjcuNzUyLDQ5LjQ3OCBMMTEzLjY3NSw3NS45OTIgTDExNi43NTYsNzQuMjEzIEMxMTcuMzg3LDczLjg0OCAxMTcuNjI1LDczLjMxNSAxMTcuMzc0LDcyLjgyMyBDMTE1LjAxNyw2OC4xOTEgMTE0Ljc4MSw2My4yNzcgMTE2LjY5MSw1OC41NjEgQzEyMi4zMjksNDQuNjQxIDE0MS4yLDMzLjc0NiAxNjUuMzA5LDMwLjQ5MSBDMTczLjQ3OCwyOS4zODggMTgxLjk4OSwyOS41MjQgMTkwLjAxMywzMC44ODUgQzE5MC44NjUsMzEuMDMgMTkxLjc4OSwzMC44OTMgMTkyLjQyLDMwLjUyOCBMMTk1LjUwMSwyOC43NSBMMTY5LjY3NiwxMy44NCIgaWQ9IkZpbGwtMjMiIGZpbGw9IiNGQUZBRkEiPjwvcGF0aD4KICAgICAgICAgICAgICAgICAgICA8cGF0aCBkPSJNMTEzLjY3NSw3Ni40NTkgQzExMy41OTQsNzYuNDU5IDExMy41MTQsNzYuNDM4IDExMy40NDIsNzYuMzk3IEw2Ny41MTgsNDkuODgyIEM2Ny4zNzQsNDkuNzk5IDY3LjI4NCw0OS42NDUgNjcuMjg1LDQ5LjQ3OCBDNjcuMjg1LDQ5LjMxMSA2Ny4zNzQsNDkuMTU3IDY3LjUxOSw0OS4wNzMgTDE0OS4zNTUsMi4wMDIgQzE0OS40OTksMS45MTkgMTQ5LjY3NywxLjkxOSAxNDkuODIxLDIuMDAyIEwxNTYuNTUsNS44ODcgQzE1Ni43NzQsNi4wMTcgMTU2Ljg1LDYuMzAyIDE1Ni43MjIsNi41MjYgQzE1Ni41OTIsNi43NDkgMTU2LjMwNyw2LjgyNiAxNTYuMDgzLDYuNjk2IEwxNDkuNTg3LDIuOTQ2IEw2OC42ODcsNDkuNDc5IEwxMTMuNjc1LDc1LjQ1MiBMMTE2LjUyMyw3My44MDggQzExNi43MTUsNzMuNjk3IDExNy4xNDMsNzMuMzk5IDExNi45NTgsNzMuMDM1IEMxMTQuNTQyLDY4LjI4NyAxMTQuMyw2My4yMjEgMTE2LjI1OCw1OC4zODUgQzExOS4wNjQsNTEuNDU4IDEyNS4xNDMsNDUuMTQzIDEzMy44NCw0MC4xMjIgQzE0Mi40OTcsMzUuMTI0IDE1My4zNTgsMzEuNjMzIDE2NS4yNDcsMzAuMDI4IEMxNzMuNDQ1LDI4LjkyMSAxODIuMDM3LDI5LjA1OCAxOTAuMDkxLDMwLjQyNSBDMTkwLjgzLDMwLjU1IDE5MS42NTIsMzAuNDMyIDE5Mi4xODYsMzAuMTI0IEwxOTQuNTY3LDI4Ljc1IEwxNjkuNDQyLDE0LjI0NCBDMTY5LjIxOSwxNC4xMTUgMTY5LjE0MiwxMy44MjkgMTY5LjI3MSwxMy42MDYgQzE2OS40LDEzLjM4MiAxNjkuNjg1LDEzLjMwNiAxNjkuOTA5LDEzLjQzNSBMMTk1LjczNCwyOC4zNDUgQzE5NS44NzksMjguNDI4IDE5NS45NjgsMjguNTgzIDE5NS45NjgsMjguNzUgQzE5NS45NjgsMjguOTE2IDE5NS44NzksMjkuMDcxIDE5NS43MzQsMjkuMTU0IEwxOTIuNjUzLDMwLjkzMyBDMTkxLjkzMiwzMS4zNSAxOTAuODksMzEuNTA4IDE4OS45MzUsMzEuMzQ2IEMxODEuOTcyLDI5Ljk5NSAxNzMuNDc4LDI5Ljg2IDE2NS4zNzIsMzAuOTU0IEMxNTMuNjAyLDMyLjU0MyAxNDIuODYsMzUuOTkzIDEzNC4zMDcsNDAuOTMxIEMxMjUuNzkzLDQ1Ljg0NyAxMTkuODUxLDUyLjAwNCAxMTcuMTI0LDU4LjczNiBDMTE1LjI3LDYzLjMxNCAxMTUuNTAxLDY4LjExMiAxMTcuNzksNzIuNjExIEMxMTguMTYsNzMuMzM2IDExNy44NDUsNzQuMTI0IDExNi45OSw3NC42MTcgTDExMy45MDksNzYuMzk3IEMxMTMuODM2LDc2LjQzOCAxMTMuNzU2LDc2LjQ1OSAxMTMuNjc1LDc2LjQ1OSIgaWQ9IkZpbGwtMjQiIGZpbGw9IiM0NTVBNjQiPjwvcGF0aD4KICAgICAgICAgICAgICAgICAgICA8cGF0aCBkPSJNMTUzLjMxNiwyMS4yNzkgQzE1MC45MDMsMjEuMjc5IDE0OC40OTUsMjAuNzUxIDE0Ni42NjQsMTkuNjkzIEMxNDQuODQ2LDE4LjY0NCAxNDMuODQ0LDE3LjIzMiAxNDMuODQ0LDE1LjcxOCBDMTQzLjg0NCwxNC4xOTEgMTQ0Ljg2LDEyLjc2MyAxNDYuNzA1LDExLjY5OCBMMTU2LjE5OCw2LjA5MSBDMTU2LjMwOSw2LjAyNSAxNTYuNDUyLDYuMDYyIDE1Ni41MTgsNi4xNzMgQzE1Ni41ODMsNi4yODQgMTU2LjU0Nyw2LjQyNyAxNTYuNDM2LDYuNDkzIEwxNDYuOTQsMTIuMTAyIEMxNDUuMjQ0LDEzLjA4MSAxNDQuMzEyLDE0LjM2NSAxNDQuMzEyLDE1LjcxOCBDMTQ0LjMxMiwxNy4wNTggMTQ1LjIzLDE4LjMyNiAxNDYuODk3LDE5LjI4OSBDMTUwLjQ0NiwyMS4zMzggMTU2LjI0LDIxLjMyNyAxNTkuODExLDE5LjI2NSBMMTY5LjU1OSwxMy42MzcgQzE2OS42NywxMy41NzMgMTY5LjgxMywxMy42MTEgMTY5Ljg3OCwxMy43MjMgQzE2OS45NDMsMTMuODM0IDE2OS45MDQsMTMuOTc3IDE2OS43OTMsMTQuMDQyIEwxNjAuMDQ1LDE5LjY3IEMxNTguMTg3LDIwLjc0MiAxNTUuNzQ5LDIxLjI3OSAxNTMuMzE2LDIxLjI3OSIgaWQ9IkZpbGwtMjUiIGZpbGw9IiM2MDdEOEIiPjwvcGF0aD4KICAgICAgICAgICAgICAgICAgICA8cGF0aCBkPSJNMTEzLjY3NSw3NS45OTIgTDY3Ljc2Miw0OS40ODQiIGlkPSJGaWxsLTI2IiBmaWxsPSIjNDU1QTY0Ij48L3BhdGg+CiAgICAgICAgICAgICAgICAgICAgPHBhdGggZD0iTTExMy42NzUsNzYuMzQyIEMxMTMuNjE1LDc2LjM0MiAxMTMuNTU1LDc2LjMyNyAxMTMuNSw3Ni4yOTUgTDY3LjU4Nyw0OS43ODcgQzY3LjQxOSw0OS42OSA2Ny4zNjIsNDkuNDc2IDY3LjQ1OSw0OS4zMDkgQzY3LjU1Niw0OS4xNDEgNjcuNzcsNDkuMDgzIDY3LjkzNyw0OS4xOCBMMTEzLjg1LDc1LjY4OCBDMTE0LjAxOCw3NS43ODUgMTE0LjA3NSw3NiAxMTMuOTc4LDc2LjE2NyBDMTEzLjkxNCw3Ni4yNzkgMTEzLjc5Niw3Ni4zNDIgMTEzLjY3NSw3Ni4zNDIiIGlkPSJGaWxsLTI3IiBmaWxsPSIjNDU1QTY0Ij48L3BhdGg+CiAgICAgICAgICAgICAgICAgICAgPHBhdGggZD0iTTY3Ljc2Miw0OS40ODQgTDY3Ljc2MiwxMDMuNDg1IEM2Ny43NjIsMTA0LjU3NSA2OC41MzIsMTA1LjkwMyA2OS40ODIsMTA2LjQ1MiBMMTExLjk1NSwxMzAuOTczIEMxMTIuOTA1LDEzMS41MjIgMTEzLjY3NSwxMzEuMDgzIDExMy42NzUsMTI5Ljk5MyBMMTEzLjY3NSw3NS45OTIiIGlkPSJGaWxsLTI4IiBmaWxsPSIjRkFGQUZBIj48L3BhdGg+CiAgICAgICAgICAgICAgICAgICAgPHBhdGggZD0iTTExMi43MjcsMTMxLjU2MSBDMTEyLjQzLDEzMS41NjEgMTEyLjEwNywxMzEuNDY2IDExMS43OCwxMzEuMjc2IEw2OS4zMDcsMTA2Ljc1NSBDNjguMjQ0LDEwNi4xNDIgNjcuNDEyLDEwNC43MDUgNjcuNDEyLDEwMy40ODUgTDY3LjQxMiw0OS40ODQgQzY3LjQxMiw0OS4yOSA2Ny41NjksNDkuMTM0IDY3Ljc2Miw0OS4xMzQgQzY3Ljk1Niw0OS4xMzQgNjguMTEzLDQ5LjI5IDY4LjExMyw0OS40ODQgTDY4LjExMywxMDMuNDg1IEM2OC4xMTMsMTA0LjQ0NSA2OC44MiwxMDUuNjY1IDY5LjY1NywxMDYuMTQ4IEwxMTIuMTMsMTMwLjY3IEMxMTIuNDc0LDEzMC44NjggMTEyLjc5MSwxMzAuOTEzIDExMywxMzAuNzkyIEMxMTMuMjA2LDEzMC42NzMgMTEzLjMyNSwxMzAuMzgxIDExMy4zMjUsMTI5Ljk5MyBMMTEzLjMyNSw3NS45OTIgQzExMy4zMjUsNzUuNzk4IDExMy40ODIsNzUuNjQxIDExMy42NzUsNzUuNjQxIEMxMTMuODY5LDc1LjY0MSAxMTQuMDI1LDc1Ljc5OCAxMTQuMDI1LDc1Ljk5MiBMMTE0LjAyNSwxMjkuOTkzIEMxMTQuMDI1LDEzMC42NDggMTEzLjc4NiwxMzEuMTQ3IDExMy4zNSwxMzEuMzk5IEMxMTMuMTYyLDEzMS41MDcgMTEyLjk1MiwxMzEuNTYxIDExMi43MjcsMTMxLjU2MSIgaWQ9IkZpbGwtMjkiIGZpbGw9IiM0NTVBNjQiPjwvcGF0aD4KICAgICAgICAgICAgICAgICAgICA8cGF0aCBkPSJNMTEyLjg2LDQwLjUxMiBDMTEyLjg2LDQwLjUxMiAxMTIuODYsNDAuNTEyIDExMi44NTksNDAuNTEyIEMxMTAuNTQxLDQwLjUxMiAxMDguMzYsMzkuOTkgMTA2LjcxNywzOS4wNDEgQzEwNS4wMTIsMzguMDU3IDEwNC4wNzQsMzYuNzI2IDEwNC4wNzQsMzUuMjkyIEMxMDQuMDc0LDMzLjg0NyAxMDUuMDI2LDMyLjUwMSAxMDYuNzU0LDMxLjUwNCBMMTE4Ljc5NSwyNC41NTEgQzEyMC40NjMsMjMuNTg5IDEyMi42NjksMjMuMDU4IDEyNS4wMDcsMjMuMDU4IEMxMjcuMzI1LDIzLjA1OCAxMjkuNTA2LDIzLjU4MSAxMzEuMTUsMjQuNTMgQzEzMi44NTQsMjUuNTE0IDEzMy43OTMsMjYuODQ1IDEzMy43OTMsMjguMjc4IEMxMzMuNzkzLDI5LjcyNCAxMzIuODQxLDMxLjA2OSAxMzEuMTEzLDMyLjA2NyBMMTE5LjA3MSwzOS4wMTkgQzExNy40MDMsMzkuOTgyIDExNS4xOTcsNDAuNTEyIDExMi44Niw0MC41MTIgTDExMi44Niw0MC41MTIgWiBNMTI1LjAwNywyMy43NTkgQzEyMi43OSwyMy43NTkgMTIwLjcwOSwyNC4yNTYgMTE5LjE0NiwyNS4xNTggTDEwNy4xMDQsMzIuMTEgQzEwNS42MDIsMzIuOTc4IDEwNC43NzQsMzQuMTA4IDEwNC43NzQsMzUuMjkyIEMxMDQuNzc0LDM2LjQ2NSAxMDUuNTg5LDM3LjU4MSAxMDcuMDY3LDM4LjQzNCBDMTA4LjYwNSwzOS4zMjMgMTEwLjY2MywzOS44MTIgMTEyLjg1OSwzOS44MTIgTDExMi44NiwzOS44MTIgQzExNS4wNzYsMzkuODEyIDExNy4xNTgsMzkuMzE1IDExOC43MjEsMzguNDEzIEwxMzAuNzYyLDMxLjQ2IEMxMzIuMjY0LDMwLjU5MyAxMzMuMDkyLDI5LjQ2MyAxMzMuMDkyLDI4LjI3OCBDMTMzLjA5MiwyNy4xMDYgMTMyLjI3OCwyNS45OSAxMzAuOCwyNS4xMzYgQzEyOS4yNjEsMjQuMjQ4IDEyNy4yMDQsMjMuNzU5IDEyNS4wMDcsMjMuNzU5IEwxMjUuMDA3LDIzLjc1OSBaIiBpZD0iRmlsbC0zMCIgZmlsbD0iIzYwN0Q4QiI+PC9wYXRoPgogICAgICAgICAgICAgICAgICAgIDxwYXRoIGQ9Ik0xNjUuNjMsMTYuMjE5IEwxNTkuODk2LDE5LjUzIEMxNTYuNzI5LDIxLjM1OCAxNTEuNjEsMjEuMzY3IDE0OC40NjMsMTkuNTUgQzE0NS4zMTYsMTcuNzMzIDE0NS4zMzIsMTQuNzc4IDE0OC40OTksMTIuOTQ5IEwxNTQuMjMzLDkuNjM5IEwxNjUuNjMsMTYuMjE5IiBpZD0iRmlsbC0zMSIgZmlsbD0iI0ZBRkFGQSI+PC9wYXRoPgogICAgICAgICAgICAgICAgICAgIDxwYXRoIGQ9Ik0xNTQuMjMzLDEwLjQ0OCBMMTY0LjIyOCwxNi4yMTkgTDE1OS41NDYsMTguOTIzIEMxNTguMTEyLDE5Ljc1IDE1Ni4xOTQsMjAuMjA2IDE1NC4xNDcsMjAuMjA2IEMxNTIuMTE4LDIwLjIwNiAxNTAuMjI0LDE5Ljc1NyAxNDguODE0LDE4Ljk0MyBDMTQ3LjUyNCwxOC4xOTkgMTQ2LjgxNCwxNy4yNDkgMTQ2LjgxNCwxNi4yNjkgQzE0Ni44MTQsMTUuMjc4IDE0Ny41MzcsMTQuMzE0IDE0OC44NSwxMy41NTYgTDE1NC4yMzMsMTAuNDQ4IE0xNTQuMjMzLDkuNjM5IEwxNDguNDk5LDEyLjk0OSBDMTQ1LjMzMiwxNC43NzggMTQ1LjMxNiwxNy43MzMgMTQ4LjQ2MywxOS41NSBDMTUwLjAzMSwyMC40NTUgMTUyLjA4NiwyMC45MDcgMTU0LjE0NywyMC45MDcgQzE1Ni4yMjQsMjAuOTA3IDE1OC4zMDYsMjAuNDQ3IDE1OS44OTYsMTkuNTMgTDE2NS42MywxNi4yMTkgTDE1NC4yMzMsOS42MzkiIGlkPSJGaWxsLTMyIiBmaWxsPSIjNjA3RDhCIj48L3BhdGg+CiAgICAgICAgICAgICAgICAgICAgPHBhdGggZD0iTTE0NS40NDUsNzIuNjY3IEwxNDUuNDQ1LDcyLjY2NyBDMTQzLjY3Miw3Mi42NjcgMTQyLjIwNCw3MS44MTcgMTQxLjIwMiw3MC40MjIgQzE0MS4xMzUsNzAuMzMgMTQxLjE0NSw3MC4xNDcgMTQxLjIyNSw3MC4wNjYgQzE0MS4zMDUsNjkuOTg1IDE0MS40MzIsNjkuOTQ2IDE0MS41MjUsNzAuMDExIEMxNDIuMzA2LDcwLjU1OSAxNDMuMjMxLDcwLjgyMyAxNDQuMjc2LDcwLjgyMiBDMTQ1LjU5OCw3MC44MjIgMTQ3LjAzLDcwLjM3NiAxNDguNTMyLDY5LjUwOSBDMTUzLjg0Miw2Ni40NDMgMTU4LjE2Myw1OC45ODcgMTU4LjE2Myw1Mi44OTQgQzE1OC4xNjMsNTAuOTY3IDE1Ny43MjEsNDkuMzMyIDE1Ni44ODQsNDguMTY4IEMxNTYuODE4LDQ4LjA3NiAxNTYuODI4LDQ3Ljk0OCAxNTYuOTA4LDQ3Ljg2NyBDMTU2Ljk4OCw0Ny43ODYgMTU3LjExNCw0Ny43NzQgMTU3LjIwOCw0Ny44NCBDMTU4Ljg3OCw0OS4wMTIgMTU5Ljc5OCw1MS4yMiAxNTkuNzk4LDU0LjA1OSBDMTU5Ljc5OCw2MC4zMDEgMTU1LjM3Myw2OC4wNDYgMTQ5LjkzMyw3MS4xODYgQzE0OC4zNiw3Mi4wOTQgMTQ2Ljg1LDcyLjY2NyAxNDUuNDQ1LDcyLjY2NyBMMTQ1LjQ0NSw3Mi42NjcgWiBNMTQyLjQ3Niw3MSBDMTQzLjI5LDcxLjY1MSAxNDQuMjk2LDcyLjAwMiAxNDUuNDQ1LDcyLjAwMiBDMTQ2Ljc2Nyw3Mi4wMDIgMTQ4LjE5OCw3MS41NSAxNDkuNyw3MC42ODIgQzE1NS4wMSw2Ny42MTcgMTU5LjMzMSw2MC4xNTkgMTU5LjMzMSw1NC4wNjUgQzE1OS4zMzEsNTIuMDg1IDE1OC44NjgsNTAuNDM1IDE1OC4wMDYsNDkuMjcyIEMxNTguNDE3LDUwLjMwNyAxNTguNjMsNTEuNTMyIDE1OC42Myw1Mi44OTIgQzE1OC42Myw1OS4xMzQgMTU0LjIwNSw2Ni43NjcgMTQ4Ljc2NSw2OS45MDcgQzE0Ny4xOTIsNzAuODE2IDE0NS42ODEsNzEuMjgzIDE0NC4yNzYsNzEuMjgzIEMxNDMuNjM0LDcxLjI4MyAxNDMuMDMzLDcxLjE5MiAxNDIuNDc2LDcxIEwxNDIuNDc2LDcxIFoiIGlkPSJGaWxsLTMzIiBmaWxsPSIjNjA3RDhCIj48L3BhdGg+CiAgICAgICAgICAgICAgICAgICAgPHBhdGggZD0iTTE0OC42NDgsNjkuNzA0IEMxNTQuMDMyLDY2LjU5NiAxNTguMzk2LDU5LjA2OCAxNTguMzk2LDUyLjg5MSBDMTU4LjM5Niw1MC44MzkgMTU3LjkxMyw0OS4xOTggMTU3LjA3NCw0OC4wMyBDMTU1LjI4OSw0Ni43NzggMTUyLjY5OSw0Ni44MzYgMTQ5LjgxNiw0OC41MDEgQzE0NC40MzMsNTEuNjA5IDE0MC4wNjgsNTkuMTM3IDE0MC4wNjgsNjUuMzE0IEMxNDAuMDY4LDY3LjM2NSAxNDAuNTUyLDY5LjAwNiAxNDEuMzkxLDcwLjE3NCBDMTQzLjE3Niw3MS40MjcgMTQ1Ljc2NSw3MS4zNjkgMTQ4LjY0OCw2OS43MDQiIGlkPSJGaWxsLTM0IiBmaWxsPSIjRkFGQUZBIj48L3BhdGg+CiAgICAgICAgICAgICAgICAgICAgPHBhdGggZD0iTTE0NC4yNzYsNzEuMjc2IEwxNDQuMjc2LDcxLjI3NiBDMTQzLjEzMyw3MS4yNzYgMTQyLjExOCw3MC45NjkgMTQxLjI1Nyw3MC4zNjUgQzE0MS4yMzYsNzAuMzUxIDE0MS4yMTcsNzAuMzMyIDE0MS4yMDIsNzAuMzExIEMxNDAuMzA3LDY5LjA2NyAxMzkuODM1LDY3LjMzOSAxMzkuODM1LDY1LjMxNCBDMTM5LjgzNSw1OS4wNzMgMTQ0LjI2LDUxLjQzOSAxNDkuNyw0OC4yOTggQzE1MS4yNzMsNDcuMzkgMTUyLjc4NCw0Ni45MjkgMTU0LjE4OSw0Ni45MjkgQzE1NS4zMzIsNDYuOTI5IDE1Ni4zNDcsNDcuMjM2IDE1Ny4yMDgsNDcuODM5IEMxNTcuMjI5LDQ3Ljg1NCAxNTcuMjQ4LDQ3Ljg3MyAxNTcuMjYzLDQ3Ljg5NCBDMTU4LjE1Nyw0OS4xMzggMTU4LjYzLDUwLjg2NSAxNTguNjMsNTIuODkxIEMxNTguNjMsNTkuMTMyIDE1NC4yMDUsNjYuNzY2IDE0OC43NjUsNjkuOTA3IEMxNDcuMTkyLDcwLjgxNSAxNDUuNjgxLDcxLjI3NiAxNDQuMjc2LDcxLjI3NiBMMTQ0LjI3Niw3MS4yNzYgWiBNMTQxLjU1OCw3MC4xMDQgQzE0Mi4zMzEsNzAuNjM3IDE0My4yNDUsNzEuMDA1IDE0NC4yNzYsNzEuMDA1IEMxNDUuNTk4LDcxLjAwNSAxNDcuMDMsNzAuNDY3IDE0OC41MzIsNjkuNiBDMTUzLjg0Miw2Ni41MzQgMTU4LjE2Myw1OS4wMzMgMTU4LjE2Myw1Mi45MzkgQzE1OC4xNjMsNTEuMDMxIDE1Ny43MjksNDkuMzg1IDE1Ni45MDcsNDguMjIzIEMxNTYuMTMzLDQ3LjY5MSAxNTUuMjE5LDQ3LjQwOSAxNTQuMTg5LDQ3LjQwOSBDMTUyLjg2Nyw0Ny40MDkgMTUxLjQzNSw0Ny44NDIgMTQ5LjkzMyw0OC43MDkgQzE0NC42MjMsNTEuNzc1IDE0MC4zMDIsNTkuMjczIDE0MC4zMDIsNjUuMzY2IEMxNDAuMzAyLDY3LjI3NiAxNDAuNzM2LDY4Ljk0MiAxNDEuNTU4LDcwLjEwNCBMMTQxLjU1OCw3MC4xMDQgWiIgaWQ9IkZpbGwtMzUiIGZpbGw9IiM2MDdEOEIiPjwvcGF0aD4KICAgICAgICAgICAgICAgICAgICA8cGF0aCBkPSJNMTUwLjcyLDY1LjM2MSBMMTUwLjM1Nyw2NS4wNjYgQzE1MS4xNDcsNjQuMDkyIDE1MS44NjksNjMuMDQgMTUyLjUwNSw2MS45MzggQzE1My4zMTMsNjAuNTM5IDE1My45NzgsNTkuMDY3IDE1NC40ODIsNTcuNTYzIEwxNTQuOTI1LDU3LjcxMiBDMTU0LjQxMiw1OS4yNDUgMTUzLjczMyw2MC43NDUgMTUyLjkxLDYyLjE3MiBDMTUyLjI2Miw2My4yOTUgMTUxLjUyNSw2NC4zNjggMTUwLjcyLDY1LjM2MSIgaWQ9IkZpbGwtMzYiIGZpbGw9IiM2MDdEOEIiPjwvcGF0aD4KICAgICAgICAgICAgICAgICAgICA8cGF0aCBkPSJNMTE1LjkxNyw4NC41MTQgTDExNS41NTQsODQuMjIgQzExNi4zNDQsODMuMjQ1IDExNy4wNjYsODIuMTk0IDExNy43MDIsODEuMDkyIEMxMTguNTEsNzkuNjkyIDExOS4xNzUsNzguMjIgMTE5LjY3OCw3Ni43MTcgTDEyMC4xMjEsNzYuODY1IEMxMTkuNjA4LDc4LjM5OCAxMTguOTMsNzkuODk5IDExOC4xMDYsODEuMzI2IEMxMTcuNDU4LDgyLjQ0OCAxMTYuNzIyLDgzLjUyMSAxMTUuOTE3LDg0LjUxNCIgaWQ9IkZpbGwtMzciIGZpbGw9IiM2MDdEOEIiPjwvcGF0aD4KICAgICAgICAgICAgICAgICAgICA8cGF0aCBkPSJNMTE0LDEzMC40NzYgTDExNCwxMzAuMDA4IEwxMTQsNzYuMDUyIEwxMTQsNzUuNTg0IEwxMTQsNzYuMDUyIEwxMTQsMTMwLjAwOCBMMTE0LDEzMC40NzYiIGlkPSJGaWxsLTM4IiBmaWxsPSIjNjA3RDhCIj48L3BhdGg+CiAgICAgICAgICAgICAgICA8L2c+CiAgICAgICAgICAgICAgICA8ZyBpZD0iSW1wb3J0ZWQtTGF5ZXJzLUNvcHkiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDYyLjAwMDAwMCwgMC4wMDAwMDApIiBza2V0Y2g6dHlwZT0iTVNTaGFwZUdyb3VwIj4KICAgICAgICAgICAgICAgICAgICA8cGF0aCBkPSJNMTkuODIyLDM3LjQ3NCBDMTkuODM5LDM3LjMzOSAxOS43NDcsMzcuMTk0IDE5LjU1NSwzNy4wODIgQzE5LjIyOCwzNi44OTQgMTguNzI5LDM2Ljg3MiAxOC40NDYsMzcuMDM3IEwxMi40MzQsNDAuNTA4IEMxMi4zMDMsNDAuNTg0IDEyLjI0LDQwLjY4NiAxMi4yNDMsNDAuNzkzIEMxMi4yNDUsNDAuOTI1IDEyLjI0NSw0MS4yNTQgMTIuMjQ1LDQxLjM3MSBMMTIuMjQ1LDQxLjQxNCBMMTIuMjM4LDQxLjU0MiBDOC4xNDgsNDMuODg3IDUuNjQ3LDQ1LjMyMSA1LjY0Nyw0NS4zMjEgQzUuNjQ2LDQ1LjMyMSAzLjU3LDQ2LjM2NyAyLjg2LDUwLjUxMyBDMi44Niw1MC41MTMgMS45NDgsNTcuNDc0IDEuOTYyLDcwLjI1OCBDMS45NzcsODIuODI4IDIuNTY4LDg3LjMyOCAzLjEyOSw5MS42MDkgQzMuMzQ5LDkzLjI5MyA2LjEzLDkzLjczNCA2LjEzLDkzLjczNCBDNi40NjEsOTMuNzc0IDYuODI4LDkzLjcwNyA3LjIxLDkzLjQ4NiBMODIuNDgzLDQ5LjkzNSBDODQuMjkxLDQ4Ljg2NiA4NS4xNSw0Ni4yMTYgODUuNTM5LDQzLjY1MSBDODYuNzUyLDM1LjY2MSA4Ny4yMTQsMTAuNjczIDg1LjI2NCwzLjc3MyBDODUuMDY4LDMuMDggODQuNzU0LDIuNjkgODQuMzk2LDIuNDkxIEw4Mi4zMSwxLjcwMSBDODEuNTgzLDEuNzI5IDgwLjg5NCwyLjE2OCA4MC43NzYsMi4yMzYgQzgwLjYzNiwyLjMxNyA0MS44MDcsMjQuNTg1IDIwLjAzMiwzNy4wNzIgTDE5LjgyMiwzNy40NzQiIGlkPSJGaWxsLTEiIGZpbGw9IiNGRkZGRkYiPjwvcGF0aD4KICAgICAgICAgICAgICAgICAgICA8cGF0aCBkPSJNODIuMzExLDEuNzAxIEw4NC4zOTYsMi40OTEgQzg0Ljc1NCwyLjY5IDg1LjA2OCwzLjA4IDg1LjI2NCwzLjc3MyBDODcuMjEzLDEwLjY3MyA4Ni43NTEsMzUuNjYgODUuNTM5LDQzLjY1MSBDODUuMTQ5LDQ2LjIxNiA4NC4yOSw0OC44NjYgODIuNDgzLDQ5LjkzNSBMNy4yMSw5My40ODYgQzYuODk3LDkzLjY2NyA2LjU5NSw5My43NDQgNi4zMTQsOTMuNzQ0IEw2LjEzMSw5My43MzMgQzYuMTMxLDkzLjczNCAzLjM0OSw5My4yOTMgMy4xMjgsOTEuNjA5IEMyLjU2OCw4Ny4zMjcgMS45NzcsODIuODI4IDEuOTYzLDcwLjI1OCBDMS45NDgsNTcuNDc0IDIuODYsNTAuNTEzIDIuODYsNTAuNTEzIEMzLjU3LDQ2LjM2NyA1LjY0Nyw0NS4zMjEgNS42NDcsNDUuMzIxIEM1LjY0Nyw0NS4zMjEgOC4xNDgsNDMuODg3IDEyLjIzOCw0MS41NDIgTDEyLjI0NSw0MS40MTQgTDEyLjI0NSw0MS4zNzEgQzEyLjI0NSw0MS4yNTQgMTIuMjQ1LDQwLjkyNSAxMi4yNDMsNDAuNzkzIEMxMi4yNCw0MC42ODYgMTIuMzAyLDQwLjU4MyAxMi40MzQsNDAuNTA4IEwxOC40NDYsMzcuMDM2IEMxOC41NzQsMzYuOTYyIDE4Ljc0NiwzNi45MjYgMTguOTI3LDM2LjkyNiBDMTkuMTQ1LDM2LjkyNiAxOS4zNzYsMzYuOTc5IDE5LjU1NCwzNy4wODIgQzE5Ljc0NywzNy4xOTQgMTkuODM5LDM3LjM0IDE5LjgyMiwzNy40NzQgTDIwLjAzMywzNy4wNzIgQzQxLjgwNiwyNC41ODUgODAuNjM2LDIuMzE4IDgwLjc3NywyLjIzNiBDODAuODk0LDIuMTY4IDgxLjU4MywxLjcyOSA4Mi4zMTEsMS43MDEgTTgyLjMxMSwwLjcwNCBMODIuMjcyLDAuNzA1IEM4MS42NTQsMC43MjggODAuOTg5LDAuOTQ5IDgwLjI5OCwxLjM2MSBMODAuMjc3LDEuMzczIEM4MC4xMjksMS40NTggNTkuNzY4LDEzLjEzNSAxOS43NTgsMzYuMDc5IEMxOS41LDM1Ljk4MSAxOS4yMTQsMzUuOTI5IDE4LjkyNywzNS45MjkgQzE4LjU2MiwzNS45MjkgMTguMjIzLDM2LjAxMyAxNy45NDcsMzYuMTczIEwxMS45MzUsMzkuNjQ0IEMxMS40OTMsMzkuODk5IDExLjIzNiw0MC4zMzQgMTEuMjQ2LDQwLjgxIEwxMS4yNDcsNDAuOTYgTDUuMTY3LDQ0LjQ0NyBDNC43OTQsNDQuNjQ2IDIuNjI1LDQ1Ljk3OCAxLjg3Nyw1MC4zNDUgTDEuODcxLDUwLjM4NCBDMS44NjIsNTAuNDU0IDAuOTUxLDU3LjU1NyAwLjk2NSw3MC4yNTkgQzAuOTc5LDgyLjg3OSAxLjU2OCw4Ny4zNzUgMi4xMzcsOTEuNzI0IEwyLjEzOSw5MS43MzkgQzIuNDQ3LDk0LjA5NCA1LjYxNCw5NC42NjIgNS45NzUsOTQuNzE5IEw2LjAwOSw5NC43MjMgQzYuMTEsOTQuNzM2IDYuMjEzLDk0Ljc0MiA2LjMxNCw5NC43NDIgQzYuNzksOTQuNzQyIDcuMjYsOTQuNjEgNy43MSw5NC4zNSBMODIuOTgzLDUwLjc5OCBDODQuNzk0LDQ5LjcyNyA4NS45ODIsNDcuMzc1IDg2LjUyNSw0My44MDEgQzg3LjcxMSwzNS45ODcgODguMjU5LDEwLjcwNSA4Ni4yMjQsMy41MDIgQzg1Ljk3MSwyLjYwOSA4NS41MiwxLjk3NSA4NC44ODEsMS42MiBMODQuNzQ5LDEuNTU4IEw4Mi42NjQsMC43NjkgQzgyLjU1MSwwLjcyNSA4Mi40MzEsMC43MDQgODIuMzExLDAuNzA0IiBpZD0iRmlsbC0yIiBmaWxsPSIjNDU1QTY0Ij48L3BhdGg+CiAgICAgICAgICAgICAgICAgICAgPHBhdGggZD0iTTY2LjI2NywxMS41NjUgTDY3Ljc2MiwxMS45OTkgTDExLjQyMyw0NC4zMjUiIGlkPSJGaWxsLTMiIGZpbGw9IiNGRkZGRkYiPjwvcGF0aD4KICAgICAgICAgICAgICAgICAgICA8cGF0aCBkPSJNMTIuMjAyLDkwLjU0NSBDMTIuMDI5LDkwLjU0NSAxMS44NjIsOTAuNDU1IDExLjc2OSw5MC4yOTUgQzExLjYzMiw5MC4wNTcgMTEuNzEzLDg5Ljc1MiAxMS45NTIsODkuNjE0IEwzMC4zODksNzguOTY5IEMzMC42MjgsNzguODMxIDMwLjkzMyw3OC45MTMgMzEuMDcxLDc5LjE1MiBDMzEuMjA4LDc5LjM5IDMxLjEyNyw3OS42OTYgMzAuODg4LDc5LjgzMyBMMTIuNDUxLDkwLjQ3OCBMMTIuMjAyLDkwLjU0NSIgaWQ9IkZpbGwtNCIgZmlsbD0iIzYwN0Q4QiI+PC9wYXRoPgogICAgICAgICAgICAgICAgICAgIDxwYXRoIGQ9Ik0xMy43NjQsNDIuNjU0IEwxMy42NTYsNDIuNTkyIEwxMy43MDIsNDIuNDIxIEwxOC44MzcsMzkuNDU3IEwxOS4wMDcsMzkuNTAyIEwxOC45NjIsMzkuNjczIEwxMy44MjcsNDIuNjM3IEwxMy43NjQsNDIuNjU0IiBpZD0iRmlsbC01IiBmaWxsPSIjNjA3RDhCIj48L3BhdGg+CiAgICAgICAgICAgICAgICAgICAgPHBhdGggZD0iTTguNTIsOTAuMzc1IEw4LjUyLDQ2LjQyMSBMOC41ODMsNDYuMzg1IEw3NS44NCw3LjU1NCBMNzUuODQsNTEuNTA4IEw3NS43NzgsNTEuNTQ0IEw4LjUyLDkwLjM3NSBMOC41Miw5MC4zNzUgWiBNOC43Nyw0Ni41NjQgTDguNzcsODkuOTQ0IEw3NS41OTEsNTEuMzY1IEw3NS41OTEsNy45ODUgTDguNzcsNDYuNTY0IEw4Ljc3LDQ2LjU2NCBaIiBpZD0iRmlsbC02IiBmaWxsPSIjNjA3RDhCIj48L3BhdGg+CiAgICAgICAgICAgICAgICAgICAgPHBhdGggZD0iTTI0Ljk4Niw4My4xODIgQzI0Ljc1Niw4My4zMzEgMjQuMzc0LDgzLjU2NiAyNC4xMzcsODMuNzA1IEwxMi42MzIsOTAuNDA2IEMxMi4zOTUsOTAuNTQ1IDEyLjQyNiw5MC42NTggMTIuNyw5MC42NTggTDEzLjI2NSw5MC42NTggQzEzLjU0LDkwLjY1OCAxMy45NTgsOTAuNTQ1IDE0LjE5NSw5MC40MDYgTDI1LjcsODMuNzA1IEMyNS45MzcsODMuNTY2IDI2LjEyOCw4My40NTIgMjYuMTI1LDgzLjQ0OSBDMjYuMTIyLDgzLjQ0NyAyNi4xMTksODMuMjIgMjYuMTE5LDgyLjk0NiBDMjYuMTE5LDgyLjY3MiAyNS45MzEsODIuNTY5IDI1LjcwMSw4Mi43MTkgTDI0Ljk4Niw4My4xODIiIGlkPSJGaWxsLTciIGZpbGw9IiM2MDdEOEIiPjwvcGF0aD4KICAgICAgICAgICAgICAgICAgICA8cGF0aCBkPSJNMTMuMjY2LDkwLjc4MiBMMTIuNyw5MC43ODIgQzEyLjUsOTAuNzgyIDEyLjM4NCw5MC43MjYgMTIuMzU0LDkwLjYxNiBDMTIuMzI0LDkwLjUwNiAxMi4zOTcsOTAuMzk5IDEyLjU2OSw5MC4yOTkgTDI0LjA3NCw4My41OTcgQzI0LjMxLDgzLjQ1OSAyNC42ODksODMuMjI2IDI0LjkxOCw4My4wNzggTDI1LjYzMyw4Mi42MTQgQzI1LjcyMyw4Mi41NTUgMjUuODEzLDgyLjUyNSAyNS44OTksODIuNTI1IEMyNi4wNzEsODIuNTI1IDI2LjI0NCw4Mi42NTUgMjYuMjQ0LDgyLjk0NiBDMjYuMjQ0LDgzLjE2IDI2LjI0NSw4My4zMDkgMjYuMjQ3LDgzLjM4MyBMMjYuMjUzLDgzLjM4NyBMMjYuMjQ5LDgzLjQ1NiBDMjYuMjQ2LDgzLjUzMSAyNi4yNDYsODMuNTMxIDI1Ljc2Myw4My44MTIgTDE0LjI1OCw5MC41MTQgQzE0LDkwLjY2NSAxMy41NjQsOTAuNzgyIDEzLjI2Niw5MC43ODIgTDEzLjI2Niw5MC43ODIgWiBNMTIuNjY2LDkwLjUzMiBMMTIuNyw5MC41MzMgTDEzLjI2Niw5MC41MzMgQzEzLjUxOCw5MC41MzMgMTMuOTE1LDkwLjQyNSAxNC4xMzIsOTAuMjk5IEwyNS42MzcsODMuNTk3IEMyNS44MDUsODMuNDk5IDI1LjkzMSw4My40MjQgMjUuOTk4LDgzLjM4MyBDMjUuOTk0LDgzLjI5OSAyNS45OTQsODMuMTY1IDI1Ljk5NCw4Mi45NDYgTDI1Ljg5OSw4Mi43NzUgTDI1Ljc2OCw4Mi44MjQgTDI1LjA1NCw4My4yODcgQzI0LjgyMiw4My40MzcgMjQuNDM4LDgzLjY3MyAyNC4yLDgzLjgxMiBMMTIuNjk1LDkwLjUxNCBMMTIuNjY2LDkwLjUzMiBMMTIuNjY2LDkwLjUzMiBaIiBpZD0iRmlsbC04IiBmaWxsPSIjNjA3RDhCIj48L3BhdGg+CiAgICAgICAgICAgICAgICAgICAgPHBhdGggZD0iTTEzLjI2Niw4OS44NzEgTDEyLjcsODkuODcxIEMxMi41LDg5Ljg3MSAxMi4zODQsODkuODE1IDEyLjM1NCw4OS43MDUgQzEyLjMyNCw4OS41OTUgMTIuMzk3LDg5LjQ4OCAxMi41NjksODkuMzg4IEwyNC4wNzQsODIuNjg2IEMyNC4zMzIsODIuNTM1IDI0Ljc2OCw4Mi40MTggMjUuMDY3LDgyLjQxOCBMMjUuNjMyLDgyLjQxOCBDMjUuODMyLDgyLjQxOCAyNS45NDgsODIuNDc0IDI1Ljk3OCw4Mi41ODQgQzI2LjAwOCw4Mi42OTQgMjUuOTM1LDgyLjgwMSAyNS43NjMsODIuOTAxIEwxNC4yNTgsODkuNjAzIEMxNCw4OS43NTQgMTMuNTY0LDg5Ljg3MSAxMy4yNjYsODkuODcxIEwxMy4yNjYsODkuODcxIFogTTEyLjY2Niw4OS42MjEgTDEyLjcsODkuNjIyIEwxMy4yNjYsODkuNjIyIEMxMy41MTgsODkuNjIyIDEzLjkxNSw4OS41MTUgMTQuMTMyLDg5LjM4OCBMMjUuNjM3LDgyLjY4NiBMMjUuNjY3LDgyLjY2OCBMMjUuNjMyLDgyLjY2NyBMMjUuMDY3LDgyLjY2NyBDMjQuODE1LDgyLjY2NyAyNC40MTgsODIuNzc1IDI0LjIsODIuOTAxIEwxMi42OTUsODkuNjAzIEwxMi42NjYsODkuNjIxIEwxMi42NjYsODkuNjIxIFoiIGlkPSJGaWxsLTkiIGZpbGw9IiM2MDdEOEIiPjwvcGF0aD4KICAgICAgICAgICAgICAgICAgICA8cGF0aCBkPSJNMTIuMzcsOTAuODAxIEwxMi4zNyw4OS41NTQgTDEyLjM3LDkwLjgwMSIgaWQ9IkZpbGwtMTAiIGZpbGw9IiM2MDdEOEIiPjwvcGF0aD4KICAgICAgICAgICAgICAgICAgICA8cGF0aCBkPSJNNi4xMyw5My45MDEgQzUuMzc5LDkzLjgwOCA0LjgxNiw5My4xNjQgNC42OTEsOTIuNTI1IEMzLjg2LDg4LjI4NyAzLjU0LDgzLjc0MyAzLjUyNiw3MS4xNzMgQzMuNTExLDU4LjM4OSA0LjQyMyw1MS40MjggNC40MjMsNTEuNDI4IEM1LjEzNCw0Ny4yODIgNy4yMSw0Ni4yMzYgNy4yMSw0Ni4yMzYgQzcuMjEsNDYuMjM2IDgxLjY2NywzLjI1IDgyLjA2OSwzLjAxNyBDODIuMjkyLDIuODg4IDg0LjU1NiwxLjQzMyA4NS4yNjQsMy45NCBDODcuMjE0LDEwLjg0IDg2Ljc1MiwzNS44MjcgODUuNTM5LDQzLjgxOCBDODUuMTUsNDYuMzgzIDg0LjI5MSw0OS4wMzMgODIuNDgzLDUwLjEwMSBMNy4yMSw5My42NTMgQzYuODI4LDkzLjg3NCA2LjQ2MSw5My45NDEgNi4xMyw5My45MDEgQzYuMTMsOTMuOTAxIDMuMzQ5LDkzLjQ2IDMuMTI5LDkxLjc3NiBDMi41NjgsODcuNDk1IDEuOTc3LDgyLjk5NSAxLjk2Miw3MC40MjUgQzEuOTQ4LDU3LjY0MSAyLjg2LDUwLjY4IDIuODYsNTAuNjggQzMuNTcsNDYuNTM0IDUuNjQ3LDQ1LjQ4OSA1LjY0Nyw0NS40ODkgQzUuNjQ2LDQ1LjQ4OSA4LjA2NSw0NC4wOTIgMTIuMjQ1LDQxLjY3OSBMMTMuMTE2LDQxLjU2IEwxOS43MTUsMzcuNzMgTDE5Ljc2MSwzNy4yNjkgTDYuMTMsOTMuOTAxIiBpZD0iRmlsbC0xMSIgZmlsbD0iI0ZBRkFGQSI+PC9wYXRoPgogICAgICAgICAgICAgICAgICAgIDxwYXRoIGQ9Ik02LjMxNyw5NC4xNjEgTDYuMTAyLDk0LjE0OCBMNi4xMDEsOTQuMTQ4IEw1Ljg1Nyw5NC4xMDEgQzUuMTM4LDkzLjk0NSAzLjA4NSw5My4zNjUgMi44ODEsOTEuODA5IEMyLjMxMyw4Ny40NjkgMS43MjcsODIuOTk2IDEuNzEzLDcwLjQyNSBDMS42OTksNTcuNzcxIDIuNjA0LDUwLjcxOCAyLjYxMyw1MC42NDggQzMuMzM4LDQ2LjQxNyA1LjQ0NSw0NS4zMSA1LjUzNSw0NS4yNjYgTDEyLjE2Myw0MS40MzkgTDEzLjAzMyw0MS4zMiBMMTkuNDc5LDM3LjU3OCBMMTkuNTEzLDM3LjI0NCBDMTkuNTI2LDM3LjEwNyAxOS42NDcsMzcuMDA4IDE5Ljc4NiwzNy4wMjEgQzE5LjkyMiwzNy4wMzQgMjAuMDIzLDM3LjE1NiAyMC4wMDksMzcuMjkzIEwxOS45NSwzNy44ODIgTDEzLjE5OCw0MS44MDEgTDEyLjMyOCw0MS45MTkgTDUuNzcyLDQ1LjcwNCBDNS43NDEsNDUuNzIgMy43ODIsNDYuNzcyIDMuMTA2LDUwLjcyMiBDMy4wOTksNTAuNzgyIDIuMTk4LDU3LjgwOCAyLjIxMiw3MC40MjQgQzIuMjI2LDgyLjk2MyAyLjgwOSw4Ny40MiAzLjM3Myw5MS43MjkgQzMuNDY0LDkyLjQyIDQuMDYyLDkyLjg4MyA0LjY4Miw5My4xODEgQzQuNTY2LDkyLjk4NCA0LjQ4Niw5Mi43NzYgNC40NDYsOTIuNTcyIEMzLjY2NSw4OC41ODggMy4yOTEsODQuMzcgMy4yNzYsNzEuMTczIEMzLjI2Miw1OC41MiA0LjE2Nyw1MS40NjYgNC4xNzYsNTEuMzk2IEM0LjkwMSw0Ny4xNjUgNy4wMDgsNDYuMDU5IDcuMDk4LDQ2LjAxNCBDNy4wOTQsNDYuMDE1IDgxLjU0MiwzLjAzNCA4MS45NDQsMi44MDIgTDgxLjk3MiwyLjc4NSBDODIuODc2LDIuMjQ3IDgzLjY5MiwyLjA5NyA4NC4zMzIsMi4zNTIgQzg0Ljg4NywyLjU3MyA4NS4yODEsMy4wODUgODUuNTA0LDMuODcyIEM4Ny41MTgsMTEgODYuOTY0LDM2LjA5MSA4NS43ODUsNDMuODU1IEM4NS4yNzgsNDcuMTk2IDg0LjIxLDQ5LjM3IDgyLjYxLDUwLjMxNyBMNy4zMzUsOTMuODY5IEM2Ljk5OSw5NC4wNjMgNi42NTgsOTQuMTYxIDYuMzE3LDk0LjE2MSBMNi4zMTcsOTQuMTYxIFogTTYuMTcsOTMuNjU0IEM2LjQ2Myw5My42OSA2Ljc3NCw5My42MTcgNy4wODUsOTMuNDM3IEw4Mi4zNTgsNDkuODg2IEM4NC4xODEsNDguODA4IDg0Ljk2LDQ1Ljk3MSA4NS4yOTIsNDMuNzggQzg2LjQ2NiwzNi4wNDkgODcuMDIzLDExLjA4NSA4NS4wMjQsNC4wMDggQzg0Ljg0NiwzLjM3NyA4NC41NTEsMi45NzYgODQuMTQ4LDIuODE2IEM4My42NjQsMi42MjMgODIuOTgyLDIuNzY0IDgyLjIyNywzLjIxMyBMODIuMTkzLDMuMjM0IEM4MS43OTEsMy40NjYgNy4zMzUsNDYuNDUyIDcuMzM1LDQ2LjQ1MiBDNy4zMDQsNDYuNDY5IDUuMzQ2LDQ3LjUyMSA0LjY2OSw1MS40NzEgQzQuNjYyLDUxLjUzIDMuNzYxLDU4LjU1NiAzLjc3NSw3MS4xNzMgQzMuNzksODQuMzI4IDQuMTYxLDg4LjUyNCA0LjkzNiw5Mi40NzYgQzUuMDI2LDkyLjkzNyA1LjQxMiw5My40NTkgNS45NzMsOTMuNjE1IEM2LjA4Nyw5My42NCA2LjE1OCw5My42NTIgNi4xNjksOTMuNjU0IEw2LjE3LDkzLjY1NCBMNi4xNyw5My42NTQgWiIgaWQ9IkZpbGwtMTIiIGZpbGw9IiM0NTVBNjQiPjwvcGF0aD4KICAgICAgICAgICAgICAgICAgICA8cGF0aCBkPSJNNy4zMTcsNjguOTgyIEM3LjgwNiw2OC43MDEgOC4yMDIsNjguOTI2IDguMjAyLDY5LjQ4NyBDOC4yMDIsNzAuMDQ3IDcuODA2LDcwLjczIDcuMzE3LDcxLjAxMiBDNi44MjksNzEuMjk0IDYuNDMzLDcxLjA2OSA2LjQzMyw3MC41MDggQzYuNDMzLDY5Ljk0OCA2LjgyOSw2OS4yNjUgNy4zMTcsNjguOTgyIiBpZD0iRmlsbC0xMyIgZmlsbD0iI0ZGRkZGRiI+PC9wYXRoPgogICAgICAgICAgICAgICAgICAgIDxwYXRoIGQ9Ik02LjkyLDcxLjEzMyBDNi42MzEsNzEuMTMzIDYuNDMzLDcwLjkwNSA2LjQzMyw3MC41MDggQzYuNDMzLDY5Ljk0OCA2LjgyOSw2OS4yNjUgNy4zMTcsNjguOTgyIEM3LjQ2LDY4LjkgNy41OTUsNjguODYxIDcuNzE0LDY4Ljg2MSBDOC4wMDMsNjguODYxIDguMjAyLDY5LjA5IDguMjAyLDY5LjQ4NyBDOC4yMDIsNzAuMDQ3IDcuODA2LDcwLjczIDcuMzE3LDcxLjAxMiBDNy4xNzQsNzEuMDk0IDcuMDM5LDcxLjEzMyA2LjkyLDcxLjEzMyBNNy43MTQsNjguNjc0IEM3LjU1Nyw2OC42NzQgNy4zOTIsNjguNzIzIDcuMjI0LDY4LjgyMSBDNi42NzYsNjkuMTM4IDYuMjQ2LDY5Ljg3OSA2LjI0Niw3MC41MDggQzYuMjQ2LDcwLjk5NCA2LjUxNyw3MS4zMiA2LjkyLDcxLjMyIEM3LjA3OCw3MS4zMiA3LjI0Myw3MS4yNzEgNy40MTEsNzEuMTc0IEM3Ljk1OSw3MC44NTcgOC4zODksNzAuMTE3IDguMzg5LDY5LjQ4NyBDOC4zODksNjkuMDAxIDguMTE3LDY4LjY3NCA3LjcxNCw2OC42NzQiIGlkPSJGaWxsLTE0IiBmaWxsPSIjODA5N0EyIj48L3BhdGg+CiAgICAgICAgICAgICAgICAgICAgPHBhdGggZD0iTTYuOTIsNzAuOTQ3IEM2LjY0OSw3MC45NDcgNi42MjEsNzAuNjQgNi42MjEsNzAuNTA4IEM2LjYyMSw3MC4wMTcgNi45ODIsNjkuMzkyIDcuNDExLDY5LjE0NSBDNy41MjEsNjkuMDgyIDcuNjI1LDY5LjA0OSA3LjcxNCw2OS4wNDkgQzcuOTg2LDY5LjA0OSA4LjAxNSw2OS4zNTUgOC4wMTUsNjkuNDg3IEM4LjAxNSw2OS45NzggNy42NTIsNzAuNjAzIDcuMjI0LDcwLjg1MSBDNy4xMTUsNzAuOTE0IDcuMDEsNzAuOTQ3IDYuOTIsNzAuOTQ3IE03LjcxNCw2OC44NjEgQzcuNTk1LDY4Ljg2MSA3LjQ2LDY4LjkgNy4zMTcsNjguOTgyIEM2LjgyOSw2OS4yNjUgNi40MzMsNjkuOTQ4IDYuNDMzLDcwLjUwOCBDNi40MzMsNzAuOTA1IDYuNjMxLDcxLjEzMyA2LjkyLDcxLjEzMyBDNy4wMzksNzEuMTMzIDcuMTc0LDcxLjA5NCA3LjMxNyw3MS4wMTIgQzcuODA2LDcwLjczIDguMjAyLDcwLjA0NyA4LjIwMiw2OS40ODcgQzguMjAyLDY5LjA5IDguMDAzLDY4Ljg2MSA3LjcxNCw2OC44NjEiIGlkPSJGaWxsLTE1IiBmaWxsPSIjODA5N0EyIj48L3BhdGg+CiAgICAgICAgICAgICAgICAgICAgPHBhdGggZD0iTTcuNDQ0LDg1LjM1IEM3LjcwOCw4NS4xOTggNy45MjEsODUuMzE5IDcuOTIxLDg1LjYyMiBDNy45MjEsODUuOTI1IDcuNzA4LDg2LjI5MiA3LjQ0NCw4Ni40NDQgQzcuMTgxLDg2LjU5NyA2Ljk2Nyw4Ni40NzUgNi45NjcsODYuMTczIEM2Ljk2Nyw4NS44NzEgNy4xODEsODUuNTAyIDcuNDQ0LDg1LjM1IiBpZD0iRmlsbC0xNiIgZmlsbD0iI0ZGRkZGRiI+PC9wYXRoPgogICAgICAgICAgICAgICAgICAgIDxwYXRoIGQ9Ik03LjIzLDg2LjUxIEM3LjA3NCw4Ni41MSA2Ljk2Nyw4Ni4zODcgNi45NjcsODYuMTczIEM2Ljk2Nyw4NS44NzEgNy4xODEsODUuNTAyIDcuNDQ0LDg1LjM1IEM3LjUyMSw4NS4zMDUgNy41OTQsODUuMjg0IDcuNjU4LDg1LjI4NCBDNy44MTQsODUuMjg0IDcuOTIxLDg1LjQwOCA3LjkyMSw4NS42MjIgQzcuOTIxLDg1LjkyNSA3LjcwOCw4Ni4yOTIgNy40NDQsODYuNDQ0IEM3LjM2Nyw4Ni40ODkgNy4yOTQsODYuNTEgNy4yMyw4Ni41MSBNNy42NTgsODUuMDk4IEM3LjU1OCw4NS4wOTggNy40NTUsODUuMTI3IDcuMzUxLDg1LjE4OCBDNy4wMzEsODUuMzczIDYuNzgxLDg1LjgwNiA2Ljc4MSw4Ni4xNzMgQzYuNzgxLDg2LjQ4MiA2Ljk2Niw4Ni42OTcgNy4yMyw4Ni42OTcgQzcuMzMsODYuNjk3IDcuNDMzLDg2LjY2NiA3LjUzOCw4Ni42MDcgQzcuODU4LDg2LjQyMiA4LjEwOCw4NS45ODkgOC4xMDgsODUuNjIyIEM4LjEwOCw4NS4zMTMgNy45MjMsODUuMDk4IDcuNjU4LDg1LjA5OCIgaWQ9IkZpbGwtMTciIGZpbGw9IiM4MDk3QTIiPjwvcGF0aD4KICAgICAgICAgICAgICAgICAgICA8cGF0aCBkPSJNNy4yMyw4Ni4zMjIgTDcuMTU0LDg2LjE3MyBDNy4xNTQsODUuOTM4IDcuMzMzLDg1LjYyOSA3LjUzOCw4NS41MTIgTDcuNjU4LDg1LjQ3MSBMNy43MzQsODUuNjIyIEM3LjczNCw4NS44NTYgNy41NTUsODYuMTY0IDcuMzUxLDg2LjI4MiBMNy4yMyw4Ni4zMjIgTTcuNjU4LDg1LjI4NCBDNy41OTQsODUuMjg0IDcuNTIxLDg1LjMwNSA3LjQ0NCw4NS4zNSBDNy4xODEsODUuNTAyIDYuOTY3LDg1Ljg3MSA2Ljk2Nyw4Ni4xNzMgQzYuOTY3LDg2LjM4NyA3LjA3NCw4Ni41MSA3LjIzLDg2LjUxIEM3LjI5NCw4Ni41MSA3LjM2Nyw4Ni40ODkgNy40NDQsODYuNDQ0IEM3LjcwOCw4Ni4yOTIgNy45MjEsODUuOTI1IDcuOTIxLDg1LjYyMiBDNy45MjEsODUuNDA4IDcuODE0LDg1LjI4NCA3LjY1OCw4NS4yODQiIGlkPSJGaWxsLTE4IiBmaWxsPSIjODA5N0EyIj48L3BhdGg+CiAgICAgICAgICAgICAgICAgICAgPHBhdGggZD0iTTc3LjI3OCw3Ljc2OSBMNzcuMjc4LDUxLjQzNiBMMTAuMjA4LDkwLjE2IEwxMC4yMDgsNDYuNDkzIEw3Ny4yNzgsNy43NjkiIGlkPSJGaWxsLTE5IiBmaWxsPSIjNDU1QTY0Ij48L3BhdGg+CiAgICAgICAgICAgICAgICAgICAgPHBhdGggZD0iTTEwLjA4Myw5MC4zNzUgTDEwLjA4Myw0Ni40MjEgTDEwLjE0Niw0Ni4zODUgTDc3LjQwMyw3LjU1NCBMNzcuNDAzLDUxLjUwOCBMNzcuMzQxLDUxLjU0NCBMMTAuMDgzLDkwLjM3NSBMMTAuMDgzLDkwLjM3NSBaIE0xMC4zMzMsNDYuNTY0IEwxMC4zMzMsODkuOTQ0IEw3Ny4xNTQsNTEuMzY1IEw3Ny4xNTQsNy45ODUgTDEwLjMzMyw0Ni41NjQgTDEwLjMzMyw0Ni41NjQgWiIgaWQ9IkZpbGwtMjAiIGZpbGw9IiM2MDdEOEIiPjwvcGF0aD4KICAgICAgICAgICAgICAgIDwvZz4KICAgICAgICAgICAgICAgIDxwYXRoIGQ9Ik0xMjUuNzM3LDg4LjY0NyBMMTE4LjA5OCw5MS45ODEgTDExOC4wOTgsODQgTDEwNi42MzksODguNzEzIEwxMDYuNjM5LDk2Ljk4MiBMOTksMTAwLjMxNSBMMTEyLjM2OSwxMDMuOTYxIEwxMjUuNzM3LDg4LjY0NyIgaWQ9IkltcG9ydGVkLUxheWVycy1Db3B5LTIiIGZpbGw9IiM0NTVBNjQiIHNrZXRjaDp0eXBlPSJNU1NoYXBlR3JvdXAiPjwvcGF0aD4KICAgICAgICAgICAgPC9nPgogICAgICAgIDwvZz4KICAgIDwvZz4KPC9zdmc+');
};
var rotateInstructions = RotateInstructions;

var DEFAULT_VIEWER = 'CardboardV1';
var VIEWER_KEY = 'WEBVR_CARDBOARD_VIEWER';
var CLASS_NAME = 'webvr-polyfill-viewer-selector';
function ViewerSelector() {
  try {
    this.selectedKey = localStorage.getItem(VIEWER_KEY);
  } catch (error) {
    console.error('Failed to load viewer profile: %s', error);
  }
  if (!this.selectedKey) {
    this.selectedKey = DEFAULT_VIEWER;
  }
  this.dialog = this.createDialog_(deviceInfo.Viewers);
  this.root = null;
  this.onChangeCallbacks_ = [];
}
ViewerSelector.prototype.show = function(root) {
  this.root = root;
  root.appendChild(this.dialog);
  var selected = this.dialog.querySelector('#' + this.selectedKey);
  selected.checked = true;
  this.dialog.style.display = 'block';
};
ViewerSelector.prototype.hide = function() {
  if (this.root && this.root.contains(this.dialog)) {
    this.root.removeChild(this.dialog);
  }
  this.dialog.style.display = 'none';
};
ViewerSelector.prototype.getCurrentViewer = function() {
  return deviceInfo.Viewers[this.selectedKey];
};
ViewerSelector.prototype.getSelectedKey_ = function() {
  var input = this.dialog.querySelector('input[name=field]:checked');
  if (input) {
    return input.id;
  }
  return null;
};
ViewerSelector.prototype.onChange = function(cb) {
  this.onChangeCallbacks_.push(cb);
};
ViewerSelector.prototype.fireOnChange_ = function(viewer) {
  for (var i = 0; i < this.onChangeCallbacks_.length; i++) {
    this.onChangeCallbacks_[i](viewer);
  }
};
ViewerSelector.prototype.onSave_ = function() {
  this.selectedKey = this.getSelectedKey_();
  if (!this.selectedKey || !deviceInfo.Viewers[this.selectedKey]) {
    console.error('ViewerSelector.onSave_: this should never happen!');
    return;
  }
  this.fireOnChange_(deviceInfo.Viewers[this.selectedKey]);
  try {
    localStorage.setItem(VIEWER_KEY, this.selectedKey);
  } catch(error) {
    console.error('Failed to save viewer profile: %s', error);
  }
  this.hide();
};
ViewerSelector.prototype.createDialog_ = function(options) {
  var container = document.createElement('div');
  container.classList.add(CLASS_NAME);
  container.style.display = 'none';
  var overlay = document.createElement('div');
  var s = overlay.style;
  s.position = 'fixed';
  s.left = 0;
  s.top = 0;
  s.width = '100%';
  s.height = '100%';
  s.background = 'rgba(0, 0, 0, 0.3)';
  overlay.addEventListener('click', this.hide.bind(this));
  var width = 280;
  var dialog = document.createElement('div');
  var s = dialog.style;
  s.boxSizing = 'border-box';
  s.position = 'fixed';
  s.top = '24px';
  s.left = '50%';
  s.marginLeft = (-width/2) + 'px';
  s.width = width + 'px';
  s.padding = '24px';
  s.overflow = 'hidden';
  s.background = '#fafafa';
  s.fontFamily = "'Roboto', sans-serif";
  s.boxShadow = '0px 5px 20px #666';
  dialog.appendChild(this.createH1_('Select your viewer'));
  for (var id in options) {
    dialog.appendChild(this.createChoice_(id, options[id].label));
  }
  dialog.appendChild(this.createButton_('Save', this.onSave_.bind(this)));
  container.appendChild(overlay);
  container.appendChild(dialog);
  return container;
};
ViewerSelector.prototype.createH1_ = function(name) {
  var h1 = document.createElement('h1');
  var s = h1.style;
  s.color = 'black';
  s.fontSize = '20px';
  s.fontWeight = 'bold';
  s.marginTop = 0;
  s.marginBottom = '24px';
  h1.innerHTML = name;
  return h1;
};
ViewerSelector.prototype.createChoice_ = function(id, name) {
  var div = document.createElement('div');
  div.style.marginTop = '8px';
  div.style.color = 'black';
  var input = document.createElement('input');
  input.style.fontSize = '30px';
  input.setAttribute('id', id);
  input.setAttribute('type', 'radio');
  input.setAttribute('value', id);
  input.setAttribute('name', 'field');
  var label = document.createElement('label');
  label.style.marginLeft = '4px';
  label.setAttribute('for', id);
  label.innerHTML = name;
  div.appendChild(input);
  div.appendChild(label);
  return div;
};
ViewerSelector.prototype.createButton_ = function(label, onclick) {
  var button = document.createElement('button');
  button.innerHTML = label;
  var s = button.style;
  s.float = 'right';
  s.textTransform = 'uppercase';
  s.color = '#1094f7';
  s.fontSize = '14px';
  s.letterSpacing = 0;
  s.border = 0;
  s.background = 'none';
  s.marginTop = '16px';
  button.addEventListener('click', onclick);
  return button;
};
var viewerSelector = ViewerSelector;

function AndroidWakeLock() {
  var video = document.createElement('video');
  video.setAttribute('loop', '');
  function addSourceToVideo(element, type, dataURI) {
    var source = document.createElement('source');
    source.src = dataURI;
    source.type = 'video/' + type;
    element.appendChild(source);
  }
  addSourceToVideo(video,'webm', util$2.base64('video/webm', 'GkXfo0AgQoaBAUL3gQFC8oEEQvOBCEKCQAR3ZWJtQoeBAkKFgQIYU4BnQI0VSalmQCgq17FAAw9CQE2AQAZ3aGFtbXlXQUAGd2hhbW15RIlACECPQAAAAAAAFlSua0AxrkAu14EBY8WBAZyBACK1nEADdW5khkAFVl9WUDglhohAA1ZQOIOBAeBABrCBCLqBCB9DtnVAIueBAKNAHIEAAIAwAQCdASoIAAgAAUAmJaQAA3AA/vz0AAA='));
  addSourceToVideo(video, 'mp4', util$2.base64('video/mp4', 'AAAAHGZ0eXBpc29tAAACAGlzb21pc28ybXA0MQAAAAhmcmVlAAAAG21kYXQAAAGzABAHAAABthADAowdbb9/AAAC6W1vb3YAAABsbXZoZAAAAAB8JbCAfCWwgAAAA+gAAAAAAAEAAAEAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAAAIVdHJhawAAAFx0a2hkAAAAD3wlsIB8JbCAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAQAAAAAAIAAAACAAAAAABsW1kaWEAAAAgbWRoZAAAAAB8JbCAfCWwgAAAA+gAAAAAVcQAAAAAAC1oZGxyAAAAAAAAAAB2aWRlAAAAAAAAAAAAAAAAVmlkZW9IYW5kbGVyAAAAAVxtaW5mAAAAFHZtaGQAAAABAAAAAAAAAAAAAAAkZGluZgAAABxkcmVmAAAAAAAAAAEAAAAMdXJsIAAAAAEAAAEcc3RibAAAALhzdHNkAAAAAAAAAAEAAACobXA0dgAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAIAAgASAAAAEgAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABj//wAAAFJlc2RzAAAAAANEAAEABDwgEQAAAAADDUAAAAAABS0AAAGwAQAAAbWJEwAAAQAAAAEgAMSNiB9FAEQBFGMAAAGyTGF2YzUyLjg3LjQGAQIAAAAYc3R0cwAAAAAAAAABAAAAAQAAAAAAAAAcc3RzYwAAAAAAAAABAAAAAQAAAAEAAAABAAAAFHN0c3oAAAAAAAAAEwAAAAEAAAAUc3RjbwAAAAAAAAABAAAALAAAAGB1ZHRhAAAAWG1ldGEAAAAAAAAAIWhkbHIAAAAAAAAAAG1kaXJhcHBsAAAAAAAAAAAAAAAAK2lsc3QAAAAjqXRvbwAAABtkYXRhAAAAAQAAAABMYXZmNTIuNzguMw=='));
  this.request = function() {
    if (video.paused) {
      video.play();
    }
  };
  this.release = function() {
    video.pause();
  };
}
function iOSWakeLock() {
  var timer = null;
  this.request = function() {
    if (!timer) {
      timer = setInterval(function() {
        window.location = window.location;
        setTimeout(window.stop, 0);
      }, 30000);
    }
  };
  this.release = function() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}
function getWakeLock() {
  var userAgent = navigator.userAgent || navigator.vendor || window.opera;
  if (userAgent.match(/iPhone/i) || userAgent.match(/iPod/i)) {
    return iOSWakeLock;
  } else {
    return AndroidWakeLock;
  }
}
var wakelock = getWakeLock();

var nextDisplayId = 1000;
var hasShowDeprecationWarning = false;
var defaultLeftBounds = [0, 0, 0.5, 1];
var defaultRightBounds = [0.5, 0, 0.5, 1];
function VRFrameData$1() {
  this.leftProjectionMatrix = new Float32Array(16);
  this.leftViewMatrix = new Float32Array(16);
  this.rightProjectionMatrix = new Float32Array(16);
  this.rightViewMatrix = new Float32Array(16);
  this.pose = null;
}
function VRDisplay$2() {
  this.isPolyfilled = true;
  this.displayId = nextDisplayId++;
  this.displayName = '';
  this.depthNear = 0.01;
  this.depthFar = 10000.0;
  this.isConnected = true;
  this.isPresenting = false;
  this.capabilities = {
    hasPosition: false,
    hasOrientation: false,
    hasExternalDisplay: false,
    canPresent: false,
    maxLayers: 1
  };
  this.stageParameters = null;
  this.waitingForPresent_ = false;
  this.layer_ = null;
  this.orphanedLayer = null;
  this.fullscreenElement_ = null;
  this.fullscreenWrapper_ = null;
  this.fullscreenElementCachedStyle_ = null;
  this.fullscreenEventTarget_ = null;
  this.fullscreenChangeHandler_ = null;
  this.fullscreenErrorHandler_ = null;
  this.wakelock_ = new wakelock();
}
VRDisplay$2.prototype.getFrameData = function(frameData) {
  return util$2.frameDataFromPose(frameData, this.getPose(), this);
};
VRDisplay$2.prototype.getPose = function() {
  return this.getImmediatePose();
};
VRDisplay$2.prototype.requestAnimationFrame = function(callback) {
  return window.requestAnimationFrame(callback);
};
VRDisplay$2.prototype.cancelAnimationFrame = function(id) {
  return window.cancelAnimationFrame(id);
};
VRDisplay$2.prototype.wrapForFullscreen = function(element) {
  if (util$2.isIOS()) {
    return element;
  }
  if (!this.fullscreenWrapper_) {
    this.fullscreenWrapper_ = document.createElement('div');
    var cssProperties = [
      'height: ' + Math.min(screen.height, screen.width) + 'px !important',
      'top: 0 !important',
      'left: 0 !important',
      'right: 0 !important',
      'border: 0',
      'margin: 0',
      'padding: 0',
      'z-index: 999999 !important',
      'position: fixed',
    ];
    this.fullscreenWrapper_.setAttribute('style', cssProperties.join('; ') + ';');
    this.fullscreenWrapper_.classList.add('webvr-polyfill-fullscreen-wrapper');
  }
  if (this.fullscreenElement_ == element) {
    return this.fullscreenWrapper_;
  }
  this.removeFullscreenWrapper();
  this.fullscreenElement_ = element;
  var parent = this.fullscreenElement_.parentElement;
  parent.insertBefore(this.fullscreenWrapper_, this.fullscreenElement_);
  parent.removeChild(this.fullscreenElement_);
  this.fullscreenWrapper_.insertBefore(this.fullscreenElement_, this.fullscreenWrapper_.firstChild);
  this.fullscreenElementCachedStyle_ = this.fullscreenElement_.getAttribute('style');
  var self = this;
  function applyFullscreenElementStyle() {
    if (!self.fullscreenElement_) {
      return;
    }
    var cssProperties = [
      'position: absolute',
      'top: 0',
      'left: 0',
      'width: ' + Math.max(screen.width, screen.height) + 'px',
      'height: ' + Math.min(screen.height, screen.width) + 'px',
      'border: 0',
      'margin: 0',
      'padding: 0',
    ];
    self.fullscreenElement_.setAttribute('style', cssProperties.join('; ') + ';');
  }
  applyFullscreenElementStyle();
  return this.fullscreenWrapper_;
};
VRDisplay$2.prototype.removeFullscreenWrapper = function() {
  if (!this.fullscreenElement_) {
    return;
  }
  var element = this.fullscreenElement_;
  if (this.fullscreenElementCachedStyle_) {
    element.setAttribute('style', this.fullscreenElementCachedStyle_);
  } else {
    element.removeAttribute('style');
  }
  this.fullscreenElement_ = null;
  this.fullscreenElementCachedStyle_ = null;
  var parent = this.fullscreenWrapper_.parentElement;
  this.fullscreenWrapper_.removeChild(element);
  parent.insertBefore(element, this.fullscreenWrapper_);
  parent.removeChild(this.fullscreenWrapper_);
  if (this.orphanedLayer) {
    element.parentElement.removeChild(element);
  }
  return element;
};
VRDisplay$2.prototype.requestPresent = function(layers) {
  var wasPresenting = this.isPresenting;
  var self = this;
  if (!(layers instanceof Array)) {
    if (!hasShowDeprecationWarning) {
      console.warn("Using a deprecated form of requestPresent. Should pass in an array of VRLayers.");
      hasShowDeprecationWarning = true;
    }
    layers = [layers];
  }
  return new Promise(function(resolve, reject) {
    if (!self.capabilities.canPresent) {
      reject(new Error('VRDisplay is not capable of presenting.'));
      return;
    }
    if (layers.length == 0 || layers.length > self.capabilities.maxLayers) {
      reject(new Error('Invalid number of layers.'));
      return;
    }
    var incomingLayer = layers[0];
    if (!incomingLayer.source) {
      resolve();
      return;
    }
    var leftBounds = incomingLayer.leftBounds || defaultLeftBounds;
    var rightBounds = incomingLayer.rightBounds || defaultRightBounds;
    if (wasPresenting) {
      var layer = self.layer_;
      if (layer.source !== incomingLayer.source) {
        layer.source = incomingLayer.source;
      }
      for (var i = 0; i < 4; i++) {
        layer.leftBounds[i] = leftBounds[i];
        layer.rightBounds[i] = rightBounds[i];
      }
      resolve();
      return;
    }
    self.layer_ = {
      predistorted: incomingLayer.predistorted,
      source: incomingLayer.source,
      leftBounds: leftBounds.slice(0),
      rightBounds: rightBounds.slice(0)
    };
    self.waitingForPresent_ = false;
    if (self.layer_ && self.layer_.source) {
      if (!self.layer_.source.parentElement) {
        self.orphanedLayer = true;
        document.body.appendChild(self.layer_.source);
      }
      var fullscreenElement = self.wrapForFullscreen(self.layer_.source);
      var onFullscreenChange = function() {
        var actualFullscreenElement = util$2.getFullscreenElement();
        self.isPresenting = (fullscreenElement === actualFullscreenElement);
        if (self.isPresenting) {
          if (screen.orientation && screen.orientation.lock) {
            screen.orientation.lock('landscape-primary').catch(function(error){
                    console.error('screen.orientation.lock() failed due to', error.message);
            });
          }
          self.waitingForPresent_ = false;
          self.beginPresent_();
          resolve();
        } else {
          if (screen.orientation && screen.orientation.unlock) {
            screen.orientation.unlock();
          }
          self.removeFullscreenWrapper();
          self.wakelock_.release();
          self.endPresent_();
          self.removeFullscreenListeners_();
        }
        self.fireVRDisplayPresentChange_();
      };
      var onFullscreenError = function() {
        if (!self.waitingForPresent_) {
          return;
        }
        self.removeFullscreenWrapper();
        self.removeFullscreenListeners_();
        self.wakelock_.release();
        self.waitingForPresent_ = false;
        self.isPresenting = false;
        reject(new Error('Unable to present.'));
      };
      self.addFullscreenListeners_(fullscreenElement,
          onFullscreenChange, onFullscreenError);
      if (util$2.requestFullscreen(fullscreenElement)) {
        self.wakelock_.request();
        self.waitingForPresent_ = true;
      } else if (util$2.isIOS() || util$2.isWebViewAndroid()) {
        self.wakelock_.request();
        self.isPresenting = true;
        self.beginPresent_();
        self.fireVRDisplayPresentChange_();
        resolve();
      }
    }
    if (!self.waitingForPresent_ && !util$2.isIOS()) {
      util$2.exitFullscreen();
      reject(new Error('Unable to present.'));
    }
  });
};
VRDisplay$2.prototype.exitPresent = function() {
  var wasPresenting = this.isPresenting;
  var self = this;
  this.isPresenting = false;
  this.layer_ = null;
  this.wakelock_.release();
  return new Promise(function(resolve, reject) {
    if (wasPresenting) {
      if (!util$2.exitFullscreen() && util$2.isIOS()) {
        self.endPresent_();
        self.fireVRDisplayPresentChange_();
      }
      if (util$2.isWebViewAndroid()) {
        self.removeFullscreenWrapper();
        self.removeFullscreenListeners_();
        self.endPresent_();
        self.fireVRDisplayPresentChange_();
      }
      resolve();
    } else {
      reject(new Error('Was not presenting to VRDisplay.'));
    }
  });
};
VRDisplay$2.prototype.getLayers = function() {
  if (this.layer_) {
    return [this.layer_];
  }
  return [];
};
VRDisplay$2.prototype.fireVRDisplayPresentChange_ = function() {
  var event = new CustomEvent('vrdisplaypresentchange', {detail: {display: this}});
  window.dispatchEvent(event);
};
VRDisplay$2.prototype.fireVRDisplayConnect_ = function() {
  var event = new CustomEvent('vrdisplayconnect', {detail: {display: this}});
  window.dispatchEvent(event);
};
VRDisplay$2.prototype.addFullscreenListeners_ = function(element, changeHandler, errorHandler) {
  this.removeFullscreenListeners_();
  this.fullscreenEventTarget_ = element;
  this.fullscreenChangeHandler_ = changeHandler;
  this.fullscreenErrorHandler_ = errorHandler;
  if (changeHandler) {
    if (document.fullscreenEnabled) {
      element.addEventListener('fullscreenchange', changeHandler, false);
    } else if (document.webkitFullscreenEnabled) {
      element.addEventListener('webkitfullscreenchange', changeHandler, false);
    } else if (document.mozFullScreenEnabled) {
      document.addEventListener('mozfullscreenchange', changeHandler, false);
    } else if (document.msFullscreenEnabled) {
      element.addEventListener('msfullscreenchange', changeHandler, false);
    }
  }
  if (errorHandler) {
    if (document.fullscreenEnabled) {
      element.addEventListener('fullscreenerror', errorHandler, false);
    } else if (document.webkitFullscreenEnabled) {
      element.addEventListener('webkitfullscreenerror', errorHandler, false);
    } else if (document.mozFullScreenEnabled) {
      document.addEventListener('mozfullscreenerror', errorHandler, false);
    } else if (document.msFullscreenEnabled) {
      element.addEventListener('msfullscreenerror', errorHandler, false);
    }
  }
};
VRDisplay$2.prototype.removeFullscreenListeners_ = function() {
  if (!this.fullscreenEventTarget_)
    return;
  var element = this.fullscreenEventTarget_;
  if (this.fullscreenChangeHandler_) {
    var changeHandler = this.fullscreenChangeHandler_;
    element.removeEventListener('fullscreenchange', changeHandler, false);
    element.removeEventListener('webkitfullscreenchange', changeHandler, false);
    document.removeEventListener('mozfullscreenchange', changeHandler, false);
    element.removeEventListener('msfullscreenchange', changeHandler, false);
  }
  if (this.fullscreenErrorHandler_) {
    var errorHandler = this.fullscreenErrorHandler_;
    element.removeEventListener('fullscreenerror', errorHandler, false);
    element.removeEventListener('webkitfullscreenerror', errorHandler, false);
    document.removeEventListener('mozfullscreenerror', errorHandler, false);
    element.removeEventListener('msfullscreenerror', errorHandler, false);
  }
  this.fullscreenEventTarget_ = null;
  this.fullscreenChangeHandler_ = null;
  this.fullscreenErrorHandler_ = null;
};
VRDisplay$2.prototype.beginPresent_ = function() {
};
VRDisplay$2.prototype.endPresent_ = function() {
};
VRDisplay$2.prototype.submitFrame = function(pose) {
};
VRDisplay$2.prototype.getEyeParameters = function(whichEye) {
  return null;
};
var VRFrameData_1 = VRFrameData$1;
var VRDisplay_1 = VRDisplay$2;
var base = {
	VRFrameData: VRFrameData_1,
	VRDisplay: VRDisplay_1
};

var options = {
  DEBUG: false,
  DPDB_URL: 'https://dpdb.webvr.rocks/dpdb.json',
  K_FILTER: 0.98,
  PREDICTION_TIME_S: 0.040,
  TOUCH_PANNER_DISABLED: true,
  CARDBOARD_UI_DISABLED: false,
  ROTATE_INSTRUCTIONS_DISABLED: false,
  YAW_ONLY: false,
  BUFFER_SCALE: 0.5,
  DIRTY_SUBMIT_FRAME_BINDINGS: false,
};

var VRDisplay$1 = base.VRDisplay;
var Eye = {
  LEFT: 'left',
  RIGHT: 'right'
};
function CardboardVRDisplay(config) {
  var defaults = util$2.extend({}, options);
  this.config = util$2.extend(defaults, config || {});
  this.displayName = 'Cardboard VRDisplay';
  this.capabilities.hasOrientation = true;
  this.capabilities.canPresent = true;
  this.bufferScale_ = this.config.BUFFER_SCALE;
  this.poseSensor_ = new fusionPoseSensor(this.config.K_FILTER,
                                          this.config.PREDICTION_TIME_S,
                                          this.config.TOUCH_PANNER_DISABLED,
                                          this.config.YAW_ONLY,
                                          this.config.DEBUG);
  this.distorter_ = null;
  this.cardboardUI_ = null;
  this.dpdb_ = new dpdb(this.config.DPDB_URL, this.onDeviceParamsUpdated_.bind(this));
  this.deviceInfo_ = new deviceInfo(this.dpdb_.getDeviceParams());
  this.viewerSelector_ = new viewerSelector();
  this.viewerSelector_.onChange(this.onViewerChanged_.bind(this));
  this.deviceInfo_.setViewer(this.viewerSelector_.getCurrentViewer());
  if (!this.config.ROTATE_INSTRUCTIONS_DISABLED) {
    this.rotateInstructions_ = new rotateInstructions();
  }
  if (util$2.isIOS()) {
    window.addEventListener('resize', this.onResize_.bind(this));
  }
}
CardboardVRDisplay.prototype = new VRDisplay$1();
CardboardVRDisplay.prototype.getImmediatePose = function() {
  return {
    position: this.poseSensor_.getPosition(),
    orientation: this.poseSensor_.getOrientation(),
    linearVelocity: null,
    linearAcceleration: null,
    angularVelocity: null,
    angularAcceleration: null
  };
};
CardboardVRDisplay.prototype.resetPose = function() {
  this.poseSensor_.resetPose();
};
CardboardVRDisplay.prototype.getEyeParameters = function(whichEye) {
  var offset = [this.deviceInfo_.viewer.interLensDistance * 0.5, 0.0, 0.0];
  var fieldOfView;
  if (whichEye == Eye.LEFT) {
    offset[0] *= -1.0;
    fieldOfView = this.deviceInfo_.getFieldOfViewLeftEye();
  } else if (whichEye == Eye.RIGHT) {
    fieldOfView = this.deviceInfo_.getFieldOfViewRightEye();
  } else {
    console.error('Invalid eye provided: %s', whichEye);
    return null;
  }
  return {
    fieldOfView: fieldOfView,
    offset: offset,
    renderWidth: this.deviceInfo_.device.width * 0.5 * this.bufferScale_,
    renderHeight: this.deviceInfo_.device.height * this.bufferScale_,
  };
};
CardboardVRDisplay.prototype.onDeviceParamsUpdated_ = function(newParams) {
  if (this.config.DEBUG) {
    console.log('DPDB reported that device params were updated.');
  }
  this.deviceInfo_.updateDeviceParams(newParams);
  if (this.distorter_) {
    this.distorter_.updateDeviceInfo(this.deviceInfo_);
  }
};
CardboardVRDisplay.prototype.updateBounds_ = function () {
  if (this.layer_ && this.distorter_ && (this.layer_.leftBounds || this.layer_.rightBounds)) {
    this.distorter_.setTextureBounds(this.layer_.leftBounds, this.layer_.rightBounds);
  }
};
CardboardVRDisplay.prototype.beginPresent_ = function() {
  var gl = this.layer_.source.getContext('webgl');
  if (!gl)
    gl = this.layer_.source.getContext('experimental-webgl');
  if (!gl)
    gl = this.layer_.source.getContext('webgl2');
  if (!gl)
    return;
  if (this.layer_.predistorted) {
    if (!this.config.CARDBOARD_UI_DISABLED) {
      gl.canvas.width = util$2.getScreenWidth() * this.bufferScale_;
      gl.canvas.height = util$2.getScreenHeight() * this.bufferScale_;
      this.cardboardUI_ = new cardboardUi(gl);
    }
  } else {
    if (!this.config.CARDBOARD_UI_DISABLED) {
      this.cardboardUI_ = new cardboardUi(gl);
    }
    this.distorter_ = new cardboardDistorter(gl, this.cardboardUI_,
                                                 this.config.BUFFER_SCALE,
                                                 this.config.DIRTY_SUBMIT_FRAME_BINDINGS);
    this.distorter_.updateDeviceInfo(this.deviceInfo_);
  }
  if (this.cardboardUI_) {
    this.cardboardUI_.listen(function(e) {
      this.viewerSelector_.show(this.layer_.source.parentElement);
      e.stopPropagation();
      e.preventDefault();
    }.bind(this), function(e) {
      this.exitPresent();
      e.stopPropagation();
      e.preventDefault();
    }.bind(this));
  }
  if (this.rotateInstructions_) {
    if (util$2.isLandscapeMode() && util$2.isMobile()) {
      this.rotateInstructions_.showTemporarily(3000, this.layer_.source.parentElement);
    } else {
      this.rotateInstructions_.update();
    }
  }
  this.orientationHandler = this.onOrientationChange_.bind(this);
  window.addEventListener('orientationchange', this.orientationHandler);
  this.vrdisplaypresentchangeHandler = this.updateBounds_.bind(this);
  window.addEventListener('vrdisplaypresentchange', this.vrdisplaypresentchangeHandler);
  this.fireVRDisplayDeviceParamsChange_();
};
CardboardVRDisplay.prototype.endPresent_ = function() {
  if (this.distorter_) {
    this.distorter_.destroy();
    this.distorter_ = null;
  }
  if (this.cardboardUI_) {
    this.cardboardUI_.destroy();
    this.cardboardUI_ = null;
  }
  if (this.rotateInstructions_) {
    this.rotateInstructions_.hide();
  }
  this.viewerSelector_.hide();
  window.removeEventListener('orientationchange', this.orientationHandler);
  window.removeEventListener('vrdisplaypresentchange', this.vrdisplaypresentchangeHandler);
};
CardboardVRDisplay.prototype.submitFrame = function(pose) {
  if (this.distorter_) {
    this.updateBounds_();
    this.distorter_.submitFrame();
  } else if (this.cardboardUI_ && this.layer_) {
    var canvas = this.layer_.source.getContext('webgl').canvas;
    if (canvas.width != this.lastWidth || canvas.height != this.lastHeight) {
      this.cardboardUI_.onResize();
    }
    this.lastWidth = canvas.width;
    this.lastHeight = canvas.height;
    this.cardboardUI_.render();
  }
};
CardboardVRDisplay.prototype.onOrientationChange_ = function(e) {
  this.viewerSelector_.hide();
  if (this.rotateInstructions_) {
    this.rotateInstructions_.update();
  }
  this.onResize_();
};
CardboardVRDisplay.prototype.onResize_ = function(e) {
  if (this.layer_) {
    var gl = this.layer_.source.getContext('webgl');
    var cssProperties = [
      'position: absolute',
      'top: 0',
      'left: 0',
      'width: 100vw',
      'height: 100vh',
      'border: 0',
      'margin: 0',
      'padding: 0px',
      'box-sizing: content-box',
    ];
    gl.canvas.setAttribute('style', cssProperties.join('; ') + ';');
    util$2.safariCssSizeWorkaround(gl.canvas);
  }
};
CardboardVRDisplay.prototype.onViewerChanged_ = function(viewer) {
  this.deviceInfo_.setViewer(viewer);
  if (this.distorter_) {
    this.distorter_.updateDeviceInfo(this.deviceInfo_);
  }
  this.fireVRDisplayDeviceParamsChange_();
};
CardboardVRDisplay.prototype.fireVRDisplayDeviceParamsChange_ = function() {
  var event = new CustomEvent('vrdisplaydeviceparamschange', {
    detail: {
      vrdisplay: this,
      deviceInfo: this.deviceInfo_,
    }
  });
  window.dispatchEvent(event);
};
var cardboardVrDisplay = CardboardVRDisplay;

var name = "webvr-polyfill";
var version$1 = "0.10.2";
var homepage = "https://github.com/googlevr/webvr-polyfill";
var authors = ["Boris Smus <boris@smus.com>", "Brandon Jones <tojiro@gmail.com>", "Jordan Santell <jordan@jsantell.com>"];
var description = "Use WebVR today, on mobile or desktop, without requiring a special browser build.";
var devDependencies = { "babel-core": "^6.24.1", "babel-plugin-external-helpers": "^6.22.0", "babel-preset-env": "^1.6.1", "chai": "^3.5.0", "jsdom": "^9.12.0", "localStorage": "^1.0.3", "mocha": "^3.2.0", "rollup": "^0.52.1", "rollup-plugin-babel": "^3.0.2", "rollup-plugin-cleanup": "^2.0.0", "rollup-plugin-commonjs": "^8.2.6", "rollup-plugin-json": "^2.3.0", "rollup-plugin-node-resolve": "^3.0.0", "rollup-plugin-uglify": "^2.0.1", "semver": "^5.3.0" };
var main = "build/webvr-polyfill.js";
var keywords = ["vr", "webvr"];
var license = "Apache-2.0";
var scripts = { "build": "rollup -c", "build-min": "rollup -c rollup.config.min.js", "build-all": "npm run build && npm run build-min", "watch": "rollup -c -w", "test": "mocha -r test/init.js --compilers js:babel-core/register test/*.test.js", "preversion": "npm test", "version": "npm run build-all && git add build/*", "postversion": "git push && git push --tags && npm publish" };
var repository = "googlevr/webvr-polyfill";
var bugs = { "url": "https://github.com/googlevr/webvr-polyfill/issues" };
var dependencies = { "cardboard-vr-display": "1.0.3" };
var _package = {
	name: name,
	version: version$1,
	homepage: homepage,
	authors: authors,
	description: description,
	devDependencies: devDependencies,
	main: main,
	keywords: keywords,
	license: license,
	scripts: scripts,
	repository: repository,
	bugs: bugs,
	dependencies: dependencies
};

var _package$1 = Object.freeze({
	name: name,
	version: version$1,
	homepage: homepage,
	authors: authors,
	description: description,
	devDependencies: devDependencies,
	main: main,
	keywords: keywords,
	license: license,
	scripts: scripts,
	repository: repository,
	bugs: bugs,
	dependencies: dependencies,
	default: _package
});

var config = {
  PROVIDE_MOBILE_VRDISPLAY: true,
  GET_VR_DISPLAYS_TIMEOUT: 1000,
  MOBILE_WAKE_LOCK: true,
  DEBUG: false,
  DPDB_URL: 'https://dpdb.webvr.rocks/dpdb.json',
  K_FILTER: 0.98,
  PREDICTION_TIME_S: 0.040,
  TOUCH_PANNER_DISABLED: true,
  CARDBOARD_UI_DISABLED: false,
  ROTATE_INSTRUCTIONS_DISABLED: false,
  YAW_ONLY: false,
  BUFFER_SCALE: 0.5,
  DIRTY_SUBMIT_FRAME_BINDINGS: false
};

var require$$1 = ( _package$1 && _package ) || _package$1;

var VRDisplay = base.VRDisplay;
var VRFrameData = base.VRFrameData;
var version = require$$1.version;
function WebVRPolyfill(config$$1) {
  this.config = util.extend(util.extend({}, config), config$$1);
  this.polyfillDisplays = [];
  this.enabled = false;
  this.hasNative = 'getVRDisplays' in navigator;
  this.native = {};
  this.native.getVRDisplays = navigator.getVRDisplays;
  this.native.VRFrameData = window.VRFrameData;
  this.native.VRDisplay = window.VRDisplay;
  if (!this.hasNative || this.config.PROVIDE_MOBILE_VRDISPLAY && util.isMobile()) {
    this.enable();
  }
}
WebVRPolyfill.prototype.getPolyfillDisplays = function () {
  if (this._polyfillDisplaysPopulated) {
    return this.polyfillDisplays;
  }
  if (util.isMobile()) {
    var vrDisplay = new cardboardVrDisplay({
      MOBILE_WAKE_LOCK: this.config.MOBILE_WAKE_LOCK,
      DEBUG: this.config.DEBUG,
      DPDB_URL: this.config.DPDB_URL,
      CARDBOARD_UI_DISABLED: this.config.CARDBOARD_UI_DISABLED,
      K_FILTER: this.config.K_FILTER,
      PREDICTION_TIME_S: this.config.PREDICTION_TIME_S,
      TOUCH_PANNER_DISABLED: this.config.TOUCH_PANNER_DISABLED,
      ROTATE_INSTRUCTIONS_DISABLED: this.config.ROTATE_INSTRUCTIONS_DISABLED,
      YAW_ONLY: this.config.YAW_ONLY,
      BUFFER_SCALE: this.config.BUFFER_SCALE,
      DIRTY_SUBMIT_FRAME_BINDINGS: this.config.DIRTY_SUBMIT_FRAME_BINDINGS
    });
    vrDisplay.fireVRDisplayConnect_();
    this.polyfillDisplays.push(vrDisplay);
  }
  this._polyfillDisplaysPopulated = true;
  return this.polyfillDisplays;
};
WebVRPolyfill.prototype.enable = function () {
  this.enabled = true;
  if (this.hasNative && this.native.VRFrameData) {
    var NativeVRFrameData = this.native.VRFrameData;
    var nativeFrameData = new this.native.VRFrameData();
    var nativeGetFrameData = this.native.VRDisplay.prototype.getFrameData;
    window.VRDisplay.prototype.getFrameData = function (frameData) {
      if (frameData instanceof NativeVRFrameData) {
        nativeGetFrameData.call(this, frameData);
        return;
      }
      nativeGetFrameData.call(this, nativeFrameData);
      frameData.pose = nativeFrameData.pose;
      util.copyArray(nativeFrameData.leftProjectionMatrix, frameData.leftProjectionMatrix);
      util.copyArray(nativeFrameData.rightProjectionMatrix, frameData.rightProjectionMatrix);
      util.copyArray(nativeFrameData.leftViewMatrix, frameData.leftViewMatrix);
      util.copyArray(nativeFrameData.rightViewMatrix, frameData.rightViewMatrix);
    };
  }
  navigator.getVRDisplays = this.getVRDisplays.bind(this);
  window.VRDisplay = VRDisplay;
  window.VRFrameData = VRFrameData;
};
WebVRPolyfill.prototype.getVRDisplays = function () {
  this.getPolyfillDisplays();
  var polyfillDisplays = this.polyfillDisplays;
  var config$$1 = this.config;
  if (!this.hasNative) {
    return Promise.resolve(polyfillDisplays);
  }
  var timeoutId;
  var vrDisplaysNative = this.native.getVRDisplays.call(navigator);
  var timeoutPromise = new Promise(function (resolve) {
    timeoutId = setTimeout(function () {
      console.warn('Native WebVR implementation detected, but `getVRDisplays()` failed to resolve. Falling back to polyfill.');
      resolve([]);
    }, config$$1.GET_VR_DISPLAYS_TIMEOUT);
  });
  return util.race([vrDisplaysNative, timeoutPromise]).then(function (nativeDisplays) {
    clearTimeout(timeoutId);
    return nativeDisplays.length > 0 ? nativeDisplays : polyfillDisplays;
  });
};
WebVRPolyfill.version = version;
var webvrPolyfill = WebVRPolyfill;

if (typeof commonjsGlobal !== 'undefined' && commonjsGlobal.window) {
  if (!commonjsGlobal.document) {
    commonjsGlobal.document = commonjsGlobal.window.document;
  }
  if (!commonjsGlobal.navigator) {
    commonjsGlobal.navigator = commonjsGlobal.window.navigator;
  }
}
var src = webvrPolyfill;

return src;

})));

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],9:[function(_dereq_,module,exports){
/*
 * Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var EventEmitter = _dereq_('eventemitter3');
var shaka = _dereq_('shaka-player');

var Types = _dereq_('../video-type');
var Util = _dereq_('../util');

var DEFAULT_BITS_PER_SECOND = 1000000;

/**
 * Supports regular video URLs (eg. mp4), as well as adaptive manifests like
 * DASH (.mpd) and soon HLS (.m3u8).
 *
 * Events:
 *   load(video): When the video is loaded.
 *   error(message): If an error occurs.
 *
 * To play/pause/seek/etc, please use the underlying video element.
 */
function AdaptivePlayer(params) {
  this.video = document.createElement('video');
  // Loop by default.
  if (params.loop === true) {
    this.video.setAttribute('loop', true);
  }

  if (params.volume !== undefined) {
    // XXX: .setAttribute('volume', params.volume) doesn't work for some reason.
    this.video.volume = params.volume;
  }

  // Not muted by default.
  if (params.muted === true) {
    this.video.muted = params.muted;
  }

  // For FF, make sure we enable preload.
  this.video.setAttribute('preload', 'auto');
  // Enable inline video playback in iOS 10+.
  this.video.setAttribute('playsinline', true);
  this.video.setAttribute('crossorigin', 'anonymous');
}
AdaptivePlayer.prototype = new EventEmitter();

AdaptivePlayer.prototype.load = function(url) {
  var self = this;
  // TODO(smus): Investigate whether or not differentiation is best done by
  // mimeType after all. Cursory research suggests that adaptive streaming
  // manifest mime types aren't properly supported.
  //
  // For now, make determination based on extension.
  var extension = Util.getExtension(url);
  switch (extension) {
    case 'm3u8': // HLS
      this.type = Types.HLS;
      if (Util.isSafari()) {
        this.loadVideo_(url).then(function() {
          self.emit('load', self.video, self.type);
        }).catch(this.onError_.bind(this));
      } else {
        self.onError_('HLS is only supported on Safari.');
      }
      break;
    case 'mpd': // MPEG-DASH
      this.type = Types.DASH;
      this.loadShakaVideo_(url).then(function() {
        console.log('The video has now been loaded!');
        self.emit('load', self.video, self.type);
      }).catch(this.onError_.bind(this));
      break;
    default: // A regular video, not an adaptive manifest.
      this.type = Types.VIDEO;
      this.loadVideo_(url).then(function() {
        self.emit('load', self.video, self.type);
      }).catch(this.onError_.bind(this));
      break;
  }
};

AdaptivePlayer.prototype.destroy = function() {
  this.video.pause();
  this.video.src = '';
  this.video = null;
};

/*** PRIVATE API ***/

AdaptivePlayer.prototype.onError_ = function(e) {
  console.error(e);
  this.emit('error', e);
};

AdaptivePlayer.prototype.loadVideo_ = function(url) {
  var self = this, video = self.video;
  return new Promise(function(resolve, reject) {
    video.src = url;
    video.addEventListener('canplaythrough', resolve);
    video.addEventListener('loadedmetadata', function() {
      self.emit('timeupdate', {
        currentTime: video.currentTime,
        duration: video.duration
      });
    });
    video.addEventListener('error', reject);
    video.load();
  });
};

AdaptivePlayer.prototype.initShaka_ = function() {
  this.player = new shaka.Player(this.video);

  this.player.configure({
    abr: { defaultBandwidthEstimate: DEFAULT_BITS_PER_SECOND }
  });

  // Listen for error events.
  this.player.addEventListener('error', this.onError_);
};

AdaptivePlayer.prototype.loadShakaVideo_ = function(url) {
  // Install built-in polyfills to patch browser incompatibilities.
  shaka.polyfill.installAll();

  if (!shaka.Player.isBrowserSupported()) {
    console.error('Shaka is not supported on this browser.');
    return;
  }

  this.initShaka_();
  return this.player.load(url);
};

module.exports = AdaptivePlayer;

},{"../util":21,"../video-type":22,"eventemitter3":3,"shaka-player":5}],10:[function(_dereq_,module,exports){
/*
 * Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var Eyes = {
  LEFT: 1,
  RIGHT: 2
};

module.exports = Eyes;

},{}],11:[function(_dereq_,module,exports){
/*
 * Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var EventEmitter = _dereq_('eventemitter3');
var TWEEN = _dereq_('@tweenjs/tween.js');

var Util = _dereq_('../util');

// Constants for the focus/blur animation.
var NORMAL_SCALE = new THREE.Vector3(1, 1, 1);
var FOCUS_SCALE = new THREE.Vector3(1.2, 1.2, 1.2);
var FOCUS_DURATION = 200;

// Constants for the active/inactive animation.
var INACTIVE_COLOR = new THREE.Color(1, 1, 1);
var ACTIVE_COLOR = new THREE.Color(0.8, 0, 0);
var ACTIVE_DURATION = 100;

// Constants for opacity.
var MAX_INNER_OPACITY = 0.8;
var MAX_OUTER_OPACITY = 0.5;
var FADE_START_ANGLE_DEG = 35;
var FADE_END_ANGLE_DEG = 60;
/**
 * Responsible for rectangular hot spots that the user can interact with.
 *
 * Specific duties:
 *   Adding and removing hotspots.
 *   Rendering the hotspots (debug mode only).
 *   Notifying when hotspots are interacted with.
 *
 * Emits the following events:
 *   click (id): a hotspot is clicked.
 *   focus (id): a hotspot is focused.
 *   blur (id): a hotspot is no longer hovered over.
 */
function HotspotRenderer(worldRenderer) {
  this.worldRenderer = worldRenderer;
  this.scene = worldRenderer.scene;

  // Note: this event must be added to document.body and not to window for it to
  // work inside iOS iframes.
  var body = document.body;
  // Bind events for hotspot interaction.
  if (!Util.isMobile()) {
    // Only enable mouse events on desktop.
    body.addEventListener('mousedown', this.onMouseDown_.bind(this), false);
    body.addEventListener('mousemove', this.onMouseMove_.bind(this), false);
    body.addEventListener('mouseup', this.onMouseUp_.bind(this), false);
  }
  body.addEventListener('touchstart', this.onTouchStart_.bind(this), false);
  body.addEventListener('touchend', this.onTouchEnd_.bind(this), false);

  // Add a placeholder for hotspots.
  this.hotspotRoot = new THREE.Object3D();
  // Align the center with the center of the camera too.
  this.hotspotRoot.rotation.y = Math.PI / 2;
  this.scene.add(this.hotspotRoot);

  // All hotspot IDs.
  this.hotspots = {};

  // Currently selected hotspots.
  this.selectedHotspots = {};

  // Hotspots that the last touchstart / mousedown event happened for.
  this.downHotspots = {};

  // For raycasting. Initialize mouse to be off screen initially.
  this.pointer = new THREE.Vector2(1, 1);
  this.raycaster = new THREE.Raycaster();
}
HotspotRenderer.prototype = new EventEmitter();

/**
 * @param pitch {Number} The latitude of center, specified in degrees, between
 * -90 and 90, with 0 at the horizon.
 * @param yaw {Number} The longitude of center, specified in degrees, between
 * -180 and 180, with 0 at the image center.
 * @param radius {Number} The radius of the hotspot, specified in meters.
 * @param distance {Number} The distance of the hotspot from camera, specified
 * in meters.
 * @param hotspotId {String} The ID of the hotspot.
 */
HotspotRenderer.prototype.add = function(pitch, yaw, radius, distance, id) {
  // If a hotspot already exists with this ID, stop.
  if (this.hotspots[id]) {
    // TODO: Proper error reporting.
    console.error('Attempt to add hotspot with existing id %s.', id);
    return;
  }
  var hotspot = this.createHotspot_(radius, distance);
  hotspot.name = id;

  // Position the hotspot based on the pitch and yaw specified.
  var quat = new THREE.Quaternion();
  quat.setFromEuler(new THREE.Euler(THREE.Math.degToRad(pitch), THREE.Math.degToRad(yaw), 0, 'YXZ'));
  hotspot.position.applyQuaternion(quat);
  hotspot.lookAt(new THREE.Vector3());

  this.hotspotRoot.add(hotspot);
  this.hotspots[id] = hotspot;
}

/**
 * Removes a hotspot based on the ID.
 *
 * @param ID {String} Identifier of the hotspot to be removed.
 */
HotspotRenderer.prototype.remove = function(id) {
  // If there's no hotspot with this ID, fail.
  if (!this.hotspots[id]) {
    // TODO: Proper error reporting.
    console.error('Attempt to remove non-existing hotspot with id %s.', id);
    return;
  }
  // Remove the mesh from the scene.
  this.hotspotRoot.remove(this.hotspots[id]);

  // If this hotspot was selected, make sure it gets unselected.
  delete this.selectedHotspots[id];
  delete this.downHotspots[id];
  delete this.hotspots[id];
  this.emit('blur', id);
};

/**
 * Clears all hotspots from the pano. Often called when changing panos.
 */
HotspotRenderer.prototype.clearAll = function() {
  for (var id in this.hotspots) {
    this.remove(id);
  }
};

HotspotRenderer.prototype.getCount = function() {
  var count = 0;
  for (var id in this.hotspots) {
    count += 1;
  }
  return count;
};

HotspotRenderer.prototype.update = function(camera) {
  if (this.worldRenderer.isVRMode()) {
    this.pointer.set(0, 0);
  }
  // Update the picking ray with the camera and mouse position.
  this.raycaster.setFromCamera(this.pointer, camera);

  // Fade hotspots out if they are really far from center to avoid overly
  // distorted visuals.
  this.fadeOffCenterHotspots_(camera);

  var hotspots = this.hotspotRoot.children;

  // Go through all hotspots to see if they are currently selected.
  for (var i = 0; i < hotspots.length; i++) {
    var hotspot = hotspots[i];
    //hotspot.lookAt(camera.position);
    var id = hotspot.name;
    // Check if hotspot is intersected with the picking ray.
    var intersects = this.raycaster.intersectObjects(hotspot.children);
    var isIntersected = (intersects.length > 0);

    // If newly selected, emit a focus event.
    if (isIntersected && !this.selectedHotspots[id]) {
      this.emit('focus', id);
      this.focus_(id);
    }
    // If no longer selected, emit a blur event.
    if (!isIntersected && this.selectedHotspots[id]) {
      this.emit('blur', id);
      this.blur_(id);
    }
    // Update the set of selected hotspots.
    if (isIntersected) {
      this.selectedHotspots[id] = true;
    } else {
      delete this.selectedHotspots[id];
    }
  }
};

/**
 * Toggle whether or not hotspots are visible.
 */
HotspotRenderer.prototype.setVisibility = function(isVisible) {
  this.hotspotRoot.visible = isVisible;
};

HotspotRenderer.prototype.onTouchStart_ = function(e) {
  // In VR mode, don't touch the pointer position.
  if (!this.worldRenderer.isVRMode()) {
    this.updateTouch_(e);
  }

  // Force a camera update to see if any hotspots were selected.
  this.update(this.worldRenderer.camera);

  this.downHotspots = {};
  for (var id in this.selectedHotspots) {
    this.downHotspots[id] = true;
    this.down_(id);
  }
  return false;
};

HotspotRenderer.prototype.onTouchEnd_ = function(e) {
  // If no hotspots are pressed, emit an empty click event.
  if (Util.isEmptyObject(this.downHotspots)) {
    this.emit('click');
    return;
  }

  // Only emit a click if the finger was down on the same hotspot before.
  for (var id in this.downHotspots) {
    this.emit('click', id);
    this.up_(id);
    e.preventDefault();
  }
};

HotspotRenderer.prototype.updateTouch_ = function(e) {
  var size = this.getSize_();
  var touch = e.touches[0];
	this.pointer.x = (touch.clientX / size.width) * 2 - 1;
	this.pointer.y = - (touch.clientY / size.height) * 2 + 1;
};

HotspotRenderer.prototype.onMouseDown_ = function(e) {
  this.updateMouse_(e);

  this.downHotspots = {};
  for (var id in this.selectedHotspots) {
    this.downHotspots[id] = true;
    this.down_(id);
  }
};

HotspotRenderer.prototype.onMouseMove_ = function(e) {
  this.updateMouse_(e);
};

HotspotRenderer.prototype.onMouseUp_ = function(e) {
  this.updateMouse_(e);

  // If no hotspots are pressed, emit an empty click event.
  if (Util.isEmptyObject(this.downHotspots)) {
    this.emit('click');
    return;
  }

  // Only emit a click if the mouse was down on the same hotspot before.
  for (var id in this.selectedHotspots) {
    if (id in this.downHotspots) {
      this.emit('click', id);
      this.up_(id);
    }
  }
};

HotspotRenderer.prototype.updateMouse_ = function(e) {
  var size = this.getSize_();
	this.pointer.x = (e.clientX / size.width) * 2 - 1;
	this.pointer.y = - (e.clientY / size.height) * 2 + 1;
};

HotspotRenderer.prototype.getSize_ = function() {
  var canvas = this.worldRenderer.renderer.domElement;
  return this.worldRenderer.renderer.getSize();
};

HotspotRenderer.prototype.createHotspot_ = function(radius, distance) {
  var innerGeometry = new THREE.CircleGeometry(radius, 32);

  var innerMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff, side: THREE.DoubleSide, transparent: true,
    opacity: MAX_INNER_OPACITY, depthTest: false
  });

  var inner = new THREE.Mesh(innerGeometry, innerMaterial);
  inner.name = 'inner';

  var outerMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff, side: THREE.DoubleSide, transparent: true,
    opacity: MAX_OUTER_OPACITY, depthTest: false
  });
  var outerGeometry = new THREE.RingGeometry(radius * 0.85, radius, 32);
  var outer = new THREE.Mesh(outerGeometry, outerMaterial);
  outer.name = 'outer';

  // Position at the extreme end of the sphere.
  var hotspot = new THREE.Object3D();
  hotspot.position.z = -distance;
  hotspot.scale.copy(NORMAL_SCALE);

  hotspot.add(inner);
  hotspot.add(outer);

  return hotspot;
};

/**
 * Large aspect ratios tend to cause visually jarring distortions on the sides.
 * Here we fade hotspots out to avoid them.
 */
HotspotRenderer.prototype.fadeOffCenterHotspots_ = function(camera) {
  var lookAt = new THREE.Vector3(1, 0, 0);
  lookAt.applyQuaternion(camera.quaternion);
  // Take into account the camera parent too.
  lookAt.applyQuaternion(camera.parent.quaternion);

  // Go through each hotspot. Calculate how far off center it is.
  for (var id in this.hotspots) {
    var hotspot = this.hotspots[id];
    var angle = hotspot.position.angleTo(lookAt);
    var angleDeg = THREE.Math.radToDeg(angle);
    var isVisible = angleDeg < 45;
    var opacity;
    if (angleDeg < FADE_START_ANGLE_DEG) {
      opacity = 1;
    } else if (angleDeg > FADE_END_ANGLE_DEG) {
      opacity = 0;
    } else {
      // We are in the case START < angle < END. Linearly interpolate.
      var range = FADE_END_ANGLE_DEG - FADE_START_ANGLE_DEG;
      var value = FADE_END_ANGLE_DEG - angleDeg;
      opacity = value / range;
    }

    // Opacity a function of angle. If angle is large, opacity is zero. At some
    // point, ramp opacity down.
    this.setOpacity_(id, opacity);
  }
};

HotspotRenderer.prototype.focus_ = function(id) {
  var hotspot = this.hotspots[id];

  // Tween scale of hotspot.
  this.tween = new TWEEN.Tween(hotspot.scale).to(FOCUS_SCALE, FOCUS_DURATION)
      .easing(TWEEN.Easing.Quadratic.InOut)
      .start();
  
  if (this.worldRenderer.isVRMode()) {
    this.timeForHospotClick = setTimeout(() => {
      this.emit('click', id);
    }, 1200 )
  }
};

HotspotRenderer.prototype.blur_ = function(id) {
  var hotspot = this.hotspots[id];

  this.tween = new TWEEN.Tween(hotspot.scale).to(NORMAL_SCALE, FOCUS_DURATION)
      .easing(TWEEN.Easing.Quadratic.InOut)
      .start();
  
  if (this.timeForHospotClick) {
    clearTimeout( this.timeForHospotClick );
  }
};

HotspotRenderer.prototype.down_ = function(id) {
  // Become active.
  var hotspot = this.hotspots[id];
  var outer = hotspot.getObjectByName('inner');

  this.tween = new TWEEN.Tween(outer.material.color).to(ACTIVE_COLOR, ACTIVE_DURATION)
      .start();
};

HotspotRenderer.prototype.up_ = function(id) {
  // Become inactive.
  var hotspot = this.hotspots[id];
  var outer = hotspot.getObjectByName('inner');

  this.tween = new TWEEN.Tween(outer.material.color).to(INACTIVE_COLOR, ACTIVE_DURATION)
      .start();
};

HotspotRenderer.prototype.setOpacity_ = function(id, opacity) {
  var hotspot = this.hotspots[id];
  var outer = hotspot.getObjectByName('outer');
  var inner = hotspot.getObjectByName('inner');

  outer.material.opacity = opacity * MAX_OUTER_OPACITY;
  inner.material.opacity = opacity * MAX_INNER_OPACITY;
};

module.exports = HotspotRenderer;

},{"../util":21,"@tweenjs/tween.js":1,"eventemitter3":3}],12:[function(_dereq_,module,exports){
/*
 * Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var EventEmitter = _dereq_('eventemitter3');
var Message = _dereq_('../message');
var Util = _dereq_('../util');


/**
 * Sits in an embedded iframe, receiving messages from a containing
 * iFrame. This facilitates an API which provides the following features:
 *
 *    Playing and pausing content.
 *    Adding hotspots.
 *    Sending messages back to the containing iframe when hotspot is clicked
 *    Sending analytics events to containing iframe.
 *
 * Note: this script used to also respond to synthetic devicemotion events, but
 * no longer does so. This is because as of iOS 9.2, Safari disallows listening
 * for devicemotion events within cross-device iframes. To work around this, the
 * webvr-polyfill responds to the postMessage event containing devicemotion
 * information (sent by the iframe-message-sender in the VR View API).
 */
function IFrameMessageReceiver() {
  window.addEventListener('message', this.onMessage_.bind(this), false);
}
IFrameMessageReceiver.prototype = new EventEmitter();

IFrameMessageReceiver.prototype.onMessage_ = function(event) {
  if (Util.isDebug()) {
    console.log('onMessage_', event);
  }

  var message = event.data;
  var type = message.type.toLowerCase();
  var data = message.data;

  switch (type) {
    case Message.SET_CONTENT:
    case Message.SET_VOLUME:
    case Message.MUTED:
    case Message.ADD_HOTSPOT:
    case Message.PLAY:
    case Message.PAUSE:
    case Message.SET_CURRENT_TIME:
    case Message.GET_POSITION:
    case Message.SET_FULLSCREEN:
      this.emit(type, data);
      break;
    default:
      if (Util.isDebug()) {
        console.warn('Got unknown message of type %s from %s', message.type, message.origin);
      }
  }
};

module.exports = IFrameMessageReceiver;

},{"../message":20,"../util":21,"eventemitter3":3}],13:[function(_dereq_,module,exports){
/*
 * Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Shows a 2D loading indicator while various pieces of EmbedVR load.
 */
function LoadingIndicator() {
  this.el = this.build_();
  document.body.appendChild(this.el);
  this.show();
}

LoadingIndicator.prototype.build_ = function() {
  var overlay = document.createElement('div');
  var s = overlay.style;
  s.position = 'fixed';
  s.top = 0;
  s.left = 0;
  s.width = '100%';
  s.height = '100%';
  s.background = '#eee';
  var img = document.createElement('img');
  img.src = 'images/loading.gif';
  var s = img.style;
  s.position = 'absolute';
  s.top = '50%';
  s.left = '50%';
  s.transform = 'translate(-50%, -50%)';

  overlay.appendChild(img);
  return overlay;
};

LoadingIndicator.prototype.hide = function() {
  this.el.style.display = 'none';
};

LoadingIndicator.prototype.show = function() {
  this.el.style.display = 'block';
};

module.exports = LoadingIndicator;

},{}],14:[function(_dereq_,module,exports){
/*
 * Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// Initialize the loading indicator as quickly as possible to give the user
// immediate feedback.
var LoadingIndicator = _dereq_('./loading-indicator');
var loadIndicator = new LoadingIndicator();

var ES6Promise = _dereq_('es6-promise');
// Polyfill ES6 promises for IE.
ES6Promise.polyfill();

var IFrameMessageReceiver = _dereq_('./iframe-message-receiver');
var Message = _dereq_('../message');
var SceneInfo = _dereq_('./scene-info');
var Stats = _dereq_('../../node_modules/stats-js/build/stats.min');
var Util = _dereq_('../util');
var WebVRPolyfill = _dereq_('webvr-polyfill');
var WorldRenderer = _dereq_('./world-renderer');

var receiver = new IFrameMessageReceiver();
receiver.on(Message.PLAY, onPlayRequest);
receiver.on(Message.PAUSE, onPauseRequest);
receiver.on(Message.ADD_HOTSPOT, onAddHotspot);
receiver.on(Message.SET_CONTENT, onSetContent);
receiver.on(Message.SET_VOLUME, onSetVolume);
receiver.on(Message.MUTED, onMuted);
receiver.on(Message.SET_CURRENT_TIME, onUpdateCurrentTime);
receiver.on(Message.GET_POSITION, onGetPosition);
receiver.on(Message.SET_FULLSCREEN, onSetFullscreen);

window.addEventListener('load', onLoad);

var stats = new Stats();
var scene = SceneInfo.loadFromGetParams();

var worldRenderer = new WorldRenderer(scene);
worldRenderer.on('error', onRenderError);
worldRenderer.on('load', onRenderLoad);
worldRenderer.on('modechange', onModeChange);
worldRenderer.on('ended', onEnded);
worldRenderer.on('play', onPlay);
worldRenderer.hotspotRenderer.on('click', onHotspotClick);

window.worldRenderer = worldRenderer;

var isReadySent = false;
var volume = 0;

function onLoad() {
  if (!Util.isWebGLEnabled()) {
    showError('WebGL not supported.');
    return;
  }

  // Load the scene.
  worldRenderer.setScene(scene);

  if (scene.isDebug) {
    // Show stats.
    showStats();
  }

  if (scene.isYawOnly) {
    WebVRConfig = window.WebVRConfig || {};
    WebVRConfig.YAW_ONLY = true;
  }

  requestAnimationFrame(loop);
}


function onVideoTap() {
  worldRenderer.videoProxy.play();
  hidePlayButton();

  // Prevent multiple play() calls on the video element.
  document.body.removeEventListener('touchend', onVideoTap);
}

function onRenderLoad(event) {
  if (event.videoElement) {

    var scene = SceneInfo.loadFromGetParams();

    // On mobile, tell the user they need to tap to start. Otherwise, autoplay.
    if (Util.isMobile()) {
      // Tell user to tap to start.
      showPlayButton();
      document.body.addEventListener('touchend', onVideoTap);
    } else {
      event.videoElement.play();
    }

    // Attach to pause and play events, to notify the API.
    event.videoElement.addEventListener('pause', onPause);
    event.videoElement.addEventListener('play', onPlay);
    event.videoElement.addEventListener('timeupdate', onGetCurrentTime);
    event.videoElement.addEventListener('ended', onEnded);
  }
  // Hide loading indicator.
  loadIndicator.hide();

  // Autopan only on desktop, for photos only, and only if autopan is enabled.
  if (!Util.isMobile() && !worldRenderer.sceneInfo.video && !worldRenderer.sceneInfo.isAutopanOff) {
    worldRenderer.autopan();
  }

  // Notify the API that we are ready, but only do this once.
  if (!isReadySent) {
    if (event.videoElement) {
      Util.sendParentMessage({
        type: 'ready',
        data: {
          duration: event.videoElement.duration
        }
      });
    } else {
      Util.sendParentMessage({
        type: 'ready'
      });
    }

    isReadySent = true;
  }
}

function onPlayRequest() {
  if (!worldRenderer.videoProxy) {
    onApiError('Attempt to pause, but no video found.');
    return;
  }
  worldRenderer.videoProxy.play();
}

function onPauseRequest() {
  if (!worldRenderer.videoProxy) {
    onApiError('Attempt to pause, but no video found.');
    return;
  }
  worldRenderer.videoProxy.pause();
}

function onAddHotspot(e) {
  if (Util.isDebug()) {
    console.log('onAddHotspot', e);
  }
  // TODO: Implement some validation?

  var pitch = parseFloat(e.pitch);
  var yaw = parseFloat(e.yaw);
  var radius = parseFloat(e.radius);
  var distance = parseFloat(e.distance);
  var id = e.id;
  worldRenderer.hotspotRenderer.add(pitch, yaw, radius, distance, id);
}

function onSetContent(e) {
  if (Util.isDebug()) {
    console.log('onSetContent', e);
  }
  // Remove all of the hotspots.
  worldRenderer.hotspotRenderer.clearAll();
  // Fade to black.
  worldRenderer.sphereRenderer.setOpacity(0, 500).then(function() {
    // Then load the new scene.
    var scene = SceneInfo.loadFromAPIParams(e.contentInfo);
    worldRenderer.destroy();

    // Update the URL to reflect the new scene. This is important particularily
    // on iOS where we use a fake fullscreen mode.
    var url = scene.getCurrentUrl();
    //console.log('Updating url to be %s', url);
    window.history.pushState(null, 'VR View', url);

    // And set the new scene.
    return worldRenderer.setScene(scene);
  }).then(function() {
    // Then fade the scene back in.
    worldRenderer.sphereRenderer.setOpacity(1, 500);
  });
}

function onSetVolume(e) {
  // Only work for video. If there's no video, send back an error.
  if (!worldRenderer.videoProxy) {
    onApiError('Attempt to set volume, but no video found.');
    return;
  }

  worldRenderer.videoProxy.setVolume(e.volumeLevel);
  volume = e.volumeLevel;
  Util.sendParentMessage({
    type: 'volumechange',
    data: e.volumeLevel
  });
}

function onMuted(e) {
  // Only work for video. If there's no video, send back an error.
  if (!worldRenderer.videoProxy) {
    onApiError('Attempt to mute, but no video found.');
    return;
  }

  worldRenderer.videoProxy.mute(e.muteState);

  Util.sendParentMessage({
    type: 'muted',
    data: e.muteState
  });
}

function onUpdateCurrentTime(time) {
  if (!worldRenderer.videoProxy) {
    onApiError('Attempt to pause, but no video found.');
    return;
  }

  worldRenderer.videoProxy.setCurrentTime(time);
  onGetCurrentTime();
}

function onGetCurrentTime() {
  var time = worldRenderer.videoProxy.getCurrentTime();
  Util.sendParentMessage({
    type: 'timeupdate',
    data: time
  });
}

function onSetFullscreen() {
  if (!worldRenderer.videoProxy) {
    onApiError('Attempt to set fullscreen, but no video found.');
    return;
  }
  worldRenderer.manager.onFSClick_();
}

function onApiError(message) {
  console.error(message);
  Util.sendParentMessage({
    type: 'error',
    data: {message: message}
  });
}

function onModeChange(mode) {
  Util.sendParentMessage({
    type: 'modechange',
    data: {mode: mode}
  });
}

function onHotspotClick(id) {
  Util.sendParentMessage({
    type: 'click',
    data: {id: id}
  });
}

function onPlay() {
  Util.sendParentMessage({
    type: 'paused',
    data: false
  });
}

function onPause() {
  Util.sendParentMessage({
    type: 'paused',
    data: true
  });
}

function onEnded() {
    Util.sendParentMessage({
      type: 'ended',
      data: true
    });
}

function onSceneError(message) {
  showError('Loader: ' + message);
}

function onRenderError(message) {
  showError('Render: ' + message);
}

function showError(message, opt_title) {
  // Hide loading indicator.
  loadIndicator.hide();

  var error = document.querySelector('#error');
  error.classList.add('visible');
  error.querySelector('.message').innerHTML = message;

  var title = (opt_title !== undefined ? opt_title : 'Error');
  error.querySelector('.title').innerHTML = title;
}

function hideError() {
  var error = document.querySelector('#error');
  error.classList.remove('visible');
}

function showPlayButton() {
  var playButton = document.querySelector('#play-overlay');
  playButton.classList.add('visible');
}

function hidePlayButton() {
  var playButton = document.querySelector('#play-overlay');
  playButton.classList.remove('visible');
}

function showStats() {
  stats.setMode(0); // 0: fps, 1: ms

  // Align bottom-left.
  stats.domElement.style.position = 'absolute';
  stats.domElement.style.left = '0px';
  stats.domElement.style.bottom = '0px';
  document.body.appendChild(stats.domElement);
}

function loop(time) {
  // Use the VRDisplay RAF if it is present.
  if (worldRenderer.vrDisplay) {
    worldRenderer.vrDisplay.requestAnimationFrame(loop);
  } else {
    requestAnimationFrame(loop);
  }

  stats.begin();
  // Update the video if needed.
  if (worldRenderer.videoProxy) {
    worldRenderer.videoProxy.update(time);
  }
  worldRenderer.render(time);
  worldRenderer.submitFrame();
  stats.end();
}
function onGetPosition() {
    Util.sendParentMessage({
        type: 'getposition',
        data: {
            Yaw: worldRenderer.camera.rotation.y * 180 / Math.PI,
            Pitch: worldRenderer.camera.rotation.x * 180 / Math.PI
        }
    });
}

},{"../../node_modules/stats-js/build/stats.min":6,"../message":20,"../util":21,"./iframe-message-receiver":12,"./loading-indicator":13,"./scene-info":16,"./world-renderer":19,"es6-promise":2,"webvr-polyfill":8}],15:[function(_dereq_,module,exports){
/*
 * Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

function ReticleRenderer(camera) {
  this.camera = camera;

  this.reticle = this.createReticle_();
  // In front of the hotspot itself, which is at r=0.99.
  this.reticle.position.z = -0.97;
  camera.add(this.reticle);

  this.setVisibility(false);
}

ReticleRenderer.prototype.setVisibility = function(isVisible) {
  // TODO: Tween the transition.
  this.reticle.visible = isVisible;
};

ReticleRenderer.prototype.createReticle_ = function() {
  // Make a torus.
  var geometry = new THREE.TorusGeometry(0.02, 0.005, 10, 20);
  var material = new THREE.MeshBasicMaterial({color: 0x000000});
  var torus = new THREE.Mesh(geometry, material);

  return torus;
};

module.exports = ReticleRenderer;

},{}],16:[function(_dereq_,module,exports){
/*
 * Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var Util = _dereq_('../util');

var CAMEL_TO_UNDERSCORE = {
  video: 'video',
  image: 'image',
  preview: 'preview',
  loop: 'loop',
  volume: 'volume',
  muted: 'muted',
  isStereo: 'is_stereo',
  defaultYaw: 'default_yaw',
  isYawOnly: 'is_yaw_only',
  isDebug: 'is_debug',
  isVROff: 'is_vr_off',
  isAutopanOff: 'is_autopan_off',
  hideFullscreenButton: 'hide_fullscreen_button'
};

/**
 * Contains all information about a given scene.
 */
function SceneInfo(opt_params) {
  var params = opt_params || {};
  params.player = {
    loop: opt_params.loop,
    volume: opt_params.volume,
    muted: opt_params.muted
  };

  this.image = params.image;
  this.preview = params.preview;
  this.video = params.video;
  this.defaultYaw = THREE.Math.degToRad(params.defaultYaw || 0);

  this.isStereo = Util.parseBoolean(params.isStereo);
  this.isYawOnly = Util.parseBoolean(params.isYawOnly);
  this.isDebug = Util.parseBoolean(params.isDebug);
  this.isVROff = Util.parseBoolean(params.isVROff);
  this.isAutopanOff = Util.parseBoolean(params.isAutopanOff);
  this.loop = Util.parseBoolean(params.player.loop);
  this.volume = parseFloat(
      params.player.volume ? params.player.volume : '1');
  this.muted = Util.parseBoolean(params.player.muted);
  this.hideFullscreenButton = Util.parseBoolean(params.hideFullscreenButton);
}

SceneInfo.loadFromGetParams = function() {
  var params = {};
  for (var camelCase in CAMEL_TO_UNDERSCORE) {
    var underscore = CAMEL_TO_UNDERSCORE[camelCase];
    params[camelCase] = Util.getQueryParameter(underscore)
                        || ((window.WebVRConfig && window.WebVRConfig.PLAYER) ? window.WebVRConfig.PLAYER[underscore] : "");
  }
  var scene = new SceneInfo(params);
  if (!scene.isValid()) {
    console.warn('Invalid scene: %s', scene.errorMessage);
  }
  return scene;
};

SceneInfo.loadFromAPIParams = function(underscoreParams) {
  var params = {};
  for (var camelCase in CAMEL_TO_UNDERSCORE) {
    var underscore = CAMEL_TO_UNDERSCORE[camelCase];
    if (underscoreParams[underscore]) {
      params[camelCase] = underscoreParams[underscore];
    }
  }
  var scene = new SceneInfo(params);
  if (!scene.isValid()) {
    console.warn('Invalid scene: %s', scene.errorMessage);
  }
  return scene;
};

SceneInfo.prototype.isValid = function() {
  // Either it's an image or a video.
  if (!this.image && !this.video) {
    this.errorMessage = 'Either image or video URL must be specified.';
    return false;
  }
  if (this.image && !this.isValidImage_(this.image)) {
    this.errorMessage = 'Invalid image URL: ' + this.image;
    return false;
  }
  this.errorMessage = null;
  return true;
};

/**
 * Generates a URL to reflect this scene.
 */
SceneInfo.prototype.getCurrentUrl = function() {
  var url = location.protocol + '//' + location.host + location.pathname + '?';
  for (var camelCase in CAMEL_TO_UNDERSCORE) {
    var underscore = CAMEL_TO_UNDERSCORE[camelCase];
    var value = this[camelCase];
    if (value !== undefined) {
      url += underscore + '=' + value + '&';
    }
  }
  // Chop off the trailing ampersand.
  return url.substring(0, url.length - 1);
};

SceneInfo.prototype.isValidImage_ = function(imageUrl) {
  return true;
};

module.exports = SceneInfo;

},{"../util":21}],17:[function(_dereq_,module,exports){
/*
 * Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var Eyes = _dereq_('./eyes');
var TWEEN = _dereq_('@tweenjs/tween.js');
var Util = _dereq_('../util');
var VideoType = _dereq_('../video-type');

function SphereRenderer(scene) {
  this.scene = scene;

  // Create a transparent mask.
  this.createOpacityMask_();
}

/**
 * Sets the photosphere based on the image in the source. Supports stereo and
 * mono photospheres.
 *
 * @return {Promise}
 */
SphereRenderer.prototype.setPhotosphere = function(src, opt_params) {
  return new Promise(function(resolve, reject) {
    this.resolve = resolve;
    this.reject = reject;

    var params = opt_params || {};

    this.isStereo = !!params.isStereo;
    this.src = src;

    // Load texture.
    var loader = new THREE.TextureLoader();
    loader.crossOrigin = 'anonymous';
    loader.load(src, this.onTextureLoaded_.bind(this), undefined,
                this.onTextureError_.bind(this));
  }.bind(this));
};

/**
 * @return {Promise} Yeah.
 */
SphereRenderer.prototype.set360Video = function (videoElement, videoType, opt_params) {
  return new Promise(function(resolve, reject) {
    this.resolve = resolve;
    this.reject = reject;

    var params = opt_params || {};

    this.isStereo = !!params.isStereo;

    // Load the video texture.
    var videoTexture = new THREE.VideoTexture(videoElement);
    videoTexture.minFilter = THREE.LinearFilter;
    videoTexture.magFilter = THREE.LinearFilter;
    videoTexture.generateMipmaps = false;

    if (Util.isSafari() && videoType === VideoType.HLS) {
      // fix black screen issue on safari
      videoTexture.format = THREE.RGBAFormat;
      videoTexture.flipY = false;
    } else {
      videoTexture.format = THREE.RGBFormat;
    }

    videoTexture.needsUpdate = true;

    this.onTextureLoaded_(videoTexture);
  }.bind(this));
};

/**
 * Set the opacity of the panorama.
 *
 * @param {Number} opacity How opaque we want the panorama to be. 0 means black,
 * 1 means full color.
 * @param {Number} duration Number of milliseconds the transition should take.
 *
 * @return {Promise} When the opacity change is complete.
 */
SphereRenderer.prototype.setOpacity = function(opacity, duration) {
  var scene = this.scene;
  // If we want the opacity
  var overlayOpacity = 1 - opacity;
  return new Promise(function(resolve, reject) {
    var mask = scene.getObjectByName('opacityMask');
    var tween = new TWEEN.Tween({opacity: mask.material.opacity})
        .to({opacity: overlayOpacity}, duration)
        .easing(TWEEN.Easing.Quadratic.InOut);
    tween.onUpdate(function(e) {
      mask.material.opacity = this.opacity;
    });
    tween.onComplete(resolve).start();
  });
};

SphereRenderer.prototype.onTextureLoaded_ = function(texture) {
  var sphereLeft;
  var sphereRight;
  if (this.isStereo) {
    sphereLeft = this.createPhotosphere_(texture, {offsetY: 0.5, scaleY: 0.5});
    sphereRight = this.createPhotosphere_(texture, {offsetY: 0, scaleY: 0.5});
  } else {
    sphereLeft = this.createPhotosphere_(texture);
    sphereRight = this.createPhotosphere_(texture);
  }

  // Display in left and right eye respectively.
  sphereLeft.layers.set(Eyes.LEFT);
  sphereLeft.eye = Eyes.LEFT;
  sphereLeft.name = 'eyeLeft';
  sphereRight.layers.set(Eyes.RIGHT);
  sphereRight.eye = Eyes.RIGHT;
  sphereRight.name = 'eyeRight';


    this.scene.getObjectByName('photo').children = [sphereLeft, sphereRight];

  this.resolve();
};

SphereRenderer.prototype.onTextureError_ = function(error) {
  this.reject('Unable to load texture from "' + this.src + '"');
};


SphereRenderer.prototype.createPhotosphere_ = function(texture, opt_params) {
  var p = opt_params || {};
  p.scaleX = p.scaleX || 1;
  p.scaleY = p.scaleY || 1;
  p.offsetX = p.offsetX || 0;
  p.offsetY = p.offsetY || 0;
  p.phiStart = p.phiStart || 0;
  p.phiLength = p.phiLength || Math.PI * 2;
  p.thetaStart = p.thetaStart || 0;
  p.thetaLength = p.thetaLength || Math.PI;

  var geometry = new THREE.SphereGeometry(1, 48, 48,
      p.phiStart, p.phiLength, p.thetaStart, p.thetaLength);
  geometry.applyMatrix(new THREE.Matrix4().makeScale(-1, 1, 1));
  var uvs = geometry.faceVertexUvs[0];
  for (var i = 0; i < uvs.length; i ++) {
    for (var j = 0; j < 3; j ++) {
      uvs[i][j].x *= p.scaleX;
      uvs[i][j].x += p.offsetX;
      uvs[i][j].y *= p.scaleY;
      uvs[i][j].y += p.offsetY;
    }
  }

  var material;
  if (texture.format === THREE.RGBAFormat && texture.flipY === false) {
    material = new THREE.ShaderMaterial({
      uniforms: {
        texture: { value: texture }
      },
      vertexShader: [
        "varying vec2 vUV;",
        "void main() {",
        "	vUV = vec2( uv.x, 1.0 - uv.y );",
        "	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",
        "}"
      ].join("\n"),
      fragmentShader: [
        "uniform sampler2D texture;",
        "varying vec2 vUV;",
        "void main() {",
        " gl_FragColor = texture2D( texture, vUV  )" + (Util.isIOS() ? ".bgra" : "") + ";",
        "}"
      ].join("\n")
    });
  } else {
    material = new THREE.MeshBasicMaterial({ map: texture });
  }
  var out = new THREE.Mesh(geometry, material);
  //out.visible = false;
  out.renderOrder = -1;
  return out;
};

SphereRenderer.prototype.createOpacityMask_ = function() {
  var geometry = new THREE.SphereGeometry(0.49, 48, 48);
  var material = new THREE.MeshBasicMaterial({
    color: 0x000000, side: THREE.DoubleSide, opacity: 0, transparent: true});
  var opacityMask = new THREE.Mesh(geometry, material);
  opacityMask.name = 'opacityMask';
  opacityMask.renderOrder = 1;

  this.scene.add(opacityMask);
  return opacityMask;
};

module.exports = SphereRenderer;

},{"../util":21,"../video-type":22,"./eyes":10,"@tweenjs/tween.js":1}],18:[function(_dereq_,module,exports){
/*
 * Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var Util = _dereq_('../util');

/**
 * A proxy class for working around the fact that as soon as a video is play()ed
 * on iOS, Safari auto-fullscreens the video.
 *
 * TODO(smus): The entire raison d'etre for this class is to work around this
 * issue. Once Safari implements some way to suppress this fullscreen player, we
 * can remove this code.
 */
function VideoProxy(videoElement) {
  this.videoElement = videoElement;
  // True if we're currently manually advancing the playhead (only on iOS).
  this.isFakePlayback = false;

  // When the video started playing.
  this.startTime = null;
}

VideoProxy.prototype.play = function() {
  if (Util.isIOS9OrLess()) {
    this.startTime = performance.now();
    this.isFakePlayback = true;

    // Make an audio element to playback just the audio part.
    this.audioElement = new Audio();
    this.audioElement.src = this.videoElement.src;
    this.audioElement.play();
  } else {
    this.videoElement.play().then(function(e) {
      console.log('Playing video.', e);
    });
  }
};

VideoProxy.prototype.pause = function() {
  if (Util.isIOS9OrLess() && this.isFakePlayback) {
    this.isFakePlayback = true;

    this.audioElement.pause();
  } else {
    this.videoElement.pause();
  }
};

VideoProxy.prototype.setVolume = function(volumeLevel) {
  if (this.videoElement) {
    // On iOS 10, the VideoElement.volume property is read-only. So we special
    // case muting and unmuting.
    if (Util.isIOS()) {
      this.videoElement.muted = (volumeLevel === 0);
    } else {
      this.videoElement.volume = volumeLevel;
    }
  }
  if (this.audioElement) {
    this.audioElement.volume = volumeLevel;
  }
};

/**
 * Set the attribute mute of the elements according with the muteState param.
 *
 * @param bool muteState
 */
VideoProxy.prototype.mute = function(muteState) {
  if (this.videoElement) {
    this.videoElement.muted = muteState;
  }
  if (this.audioElement) {
    this.audioElement.muted = muteState;
  }
};

VideoProxy.prototype.getCurrentTime = function() {
  return Util.isIOS9OrLess() ? this.audioElement.currentTime : this.videoElement.currentTime;
};

/**
 *
 * @param {Object} time
 */
VideoProxy.prototype.setCurrentTime = function(time) {
  if (this.videoElement) {
    this.videoElement.currentTime = time.currentTime;
  }
  if (this.audioElement) {
    this.audioElement.currentTime = time.currentTime;
  }
};

/**
 * Called on RAF to progress playback.
 */
VideoProxy.prototype.update = function() {
  // Fakes playback for iOS only.
  if (!this.isFakePlayback) {
    return;
  }
  var duration = this.videoElement.duration;
  var now = performance.now();
  var delta = now - this.startTime;
  var deltaS = delta / 1000;
  this.videoElement.currentTime = deltaS;

  // Loop through the video
  if (deltaS > duration) {
    this.startTime = now;
    this.videoElement.currentTime = 0;
    // Also restart the audio.
    this.audioElement.currentTime = 0;
  }
};

module.exports = VideoProxy;

},{"../util":21}],19:[function(_dereq_,module,exports){
/*
 * Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var AdaptivePlayer = _dereq_('./adaptive-player');
var EventEmitter = _dereq_('eventemitter3');
var Eyes = _dereq_('./eyes');
var HotspotRenderer = _dereq_('./hotspot-renderer');
var ReticleRenderer = _dereq_('./reticle-renderer');
var SphereRenderer = _dereq_('./sphere-renderer');
var TWEEN = _dereq_('@tweenjs/tween.js');
var Util = _dereq_('../util');
var VideoProxy = _dereq_('./video-proxy');
var WebVRManager = _dereq_('webvr-boilerplate');

var AUTOPAN_DURATION = 3000;
var AUTOPAN_ANGLE = 0.4;

/**
 * The main WebGL rendering entry point. Manages the scene, camera, VR-related
 * rendering updates. Interacts with the WebVRManager.
 *
 * Coordinates the other renderers: SphereRenderer, HotspotRenderer,
 * ReticleRenderer.
 *
 * Also manages the AdaptivePlayer and VideoProxy.
 *
 * Emits the following events:
 *   load: when the scene is loaded.
 *   error: if there is an error loading the scene.
 *   modechange(Boolean isVR): if the mode (eg. VR, fullscreen, etc) changes.
 */
function WorldRenderer(params) {
  this.init_(params.hideFullscreenButton);

  this.sphereRenderer = new SphereRenderer(this.scene);
  this.hotspotRenderer = new HotspotRenderer(this);
  this.hotspotRenderer.on('focus', this.onHotspotFocus_.bind(this));
  this.hotspotRenderer.on('blur', this.onHotspotBlur_.bind(this));
  this.reticleRenderer = new ReticleRenderer(this.camera);

  // Get the VR Display as soon as we initialize.
  navigator.getVRDisplays().then(function(displays) {
    if (displays.length > 0) {
      this.vrDisplay = displays[0];
    }
  }.bind(this));

}
WorldRenderer.prototype = new EventEmitter();

WorldRenderer.prototype.render = function(time) {
  this.controls.update();
  TWEEN.update(time);
  this.effect.render(this.scene, this.camera);
  this.hotspotRenderer.update(this.camera);
};

/**
 * @return {Promise} When the scene is fully loaded.
 */
WorldRenderer.prototype.setScene = function(scene) {
  var self = this;
  var promise = new Promise(function(resolve, reject) {
    self.sceneResolve = resolve;
    self.sceneReject = reject;
  });

  if (!scene || !scene.isValid()) {
    this.didLoadFail_(scene.errorMessage);
    return;
  }

  var params = {
    isStereo: scene.isStereo,
    loop: scene.loop,
    volume: scene.volume,
    muted: scene.muted
  };

  this.setDefaultYaw_(scene.defaultYaw || 0);

  // Disable VR mode if explicitly disabled, or if we're loading a video on iOS
  // 9 or earlier.
  if (scene.isVROff || (scene.video && Util.isIOS9OrLess())) {
    this.manager.setVRCompatibleOverride(false);
  }

  // Set various callback overrides in iOS.
  if (Util.isIOS()) {
    this.manager.setFullscreenCallback(function() {
      Util.sendParentMessage({type: 'enter-fullscreen'});
    });
    this.manager.setExitFullscreenCallback(function() {
      Util.sendParentMessage({type: 'exit-fullscreen'});
    });
    this.manager.setVRCallback(function() {
      Util.sendParentMessage({type: 'enter-vr'});
    });
  }

  // If we're dealing with an image, and not a video.
  if (scene.image && !scene.video) {
    if (scene.preview) {
      // First load the preview.
      this.sphereRenderer.setPhotosphere(scene.preview, params).then(function() {
        // As soon as something is loaded, emit the load event to hide the
        // loading progress bar.
        self.didLoad_();
        // Then load the full resolution image.
        self.sphereRenderer.setPhotosphere(scene.image, params);
      }).catch(self.didLoadFail_.bind(self));
    } else {
      // No preview -- go straight to rendering the full image.
      this.sphereRenderer.setPhotosphere(scene.image, params).then(function() {
        self.didLoad_();
      }).catch(self.didLoadFail_.bind(self));
    }
  } else if (scene.video) {
    if (Util.isIE11()) {
      // On IE 11, if an 'image' param is provided, load it instead of showing
      // an error.
      //
      // TODO(smus): Once video textures are supported, remove this fallback.
      if (scene.image) {
        this.sphereRenderer.setPhotosphere(scene.image, params).then(function() {
          self.didLoad_();
        }).catch(self.didLoadFail_.bind(self));
      } else {
        this.didLoadFail_('Video is not supported on IE11.');
      }
    } else {
      this.player = new AdaptivePlayer(params);
      this.player.on('load', function(videoElement, videoType) {
        self.sphereRenderer.set360Video(videoElement, videoType, params).then(function() {
          self.didLoad_({videoElement: videoElement});
        }).catch(self.didLoadFail_.bind(self));
      });
      this.player.on('error', function(error) {
        self.didLoadFail_('Video load error: ' + error);
      });
      this.player.load(scene.video);

      this.videoProxy = new VideoProxy(this.player.video);
    }
  }

  this.sceneInfo = scene;
  if (Util.isDebug()) {
    console.log('Loaded scene', scene);
  }

  return promise;
};

WorldRenderer.prototype.isVRMode = function() {
  return !!this.vrDisplay && this.vrDisplay.isPresenting;
};

WorldRenderer.prototype.submitFrame = function() {
  if (this.isVRMode()) {
    this.vrDisplay.submitFrame();
  }
};

WorldRenderer.prototype.disposeEye_ = function(eye) {
  if (eye) {
    if (eye.material.map) {
      eye.material.map.dispose();
    }
    eye.material.dispose();
    eye.geometry.dispose();
  }
};

WorldRenderer.prototype.dispose = function() {
  var eyeLeft = this.scene.getObjectByName('eyeLeft');
  this.disposeEye_(eyeLeft);
  var eyeRight = this.scene.getObjectByName('eyeRight');
  this.disposeEye_(eyeRight);
};

WorldRenderer.prototype.destroy = function() {
  if (this.player) {
    this.player.removeAllListeners();
    this.player.destroy();
    this.player = null;
  }
  var photo = this.scene.getObjectByName('photo');
  var eyeLeft = this.scene.getObjectByName('eyeLeft');
  var eyeRight = this.scene.getObjectByName('eyeRight');

  if (eyeLeft) {
    this.disposeEye_(eyeLeft);
    photo.remove(eyeLeft);
    this.scene.remove(eyeLeft);
  }

  if (eyeRight) {
    this.disposeEye_(eyeRight);
    photo.remove(eyeRight);
    this.scene.remove(eyeRight);
  }
};

WorldRenderer.prototype.didLoad_ = function(opt_event) {
  var event = opt_event || {};
  this.emit('load', event);
  if (this.sceneResolve) {
    this.sceneResolve();
  }
};

WorldRenderer.prototype.didLoadFail_ = function(message) {
  this.emit('error', message);
  if (this.sceneReject) {
    this.sceneReject(message);
  }
};

/**
 * Sets the default yaw.
 * @param {Number} angleRad The yaw in radians.
 */
WorldRenderer.prototype.setDefaultYaw_ = function(angleRad) {
  // Rotate the camera parent to take into account the scene's rotation.
  // By default, it should be at the center of the image.
  var display = this.controls.getVRDisplay();
  // For desktop, we subtract the current display Y axis
  var theta = display.theta_ || 0;
  // For devices with orientation we make the current view center
  if (display.poseSensor_) {
    display.poseSensor_.resetPose();
  }
  this.camera.parent.rotation.y = (Math.PI / 2.0) + angleRad - theta;
};

/**
 * Do the initial camera tween to rotate the camera, giving an indication that
 * there is live content there (on desktop only).
 */
WorldRenderer.prototype.autopan = function(duration) {
  var targetY = this.camera.parent.rotation.y - AUTOPAN_ANGLE;
  var tween = new TWEEN.Tween(this.camera.parent.rotation)
      .to({y: targetY}, AUTOPAN_DURATION)
      .easing(TWEEN.Easing.Quadratic.Out)
      .start();
};

WorldRenderer.prototype.init_ = function(hideFullscreenButton) {
  var container = document.querySelector('body');
  var aspect = window.innerWidth / window.innerHeight;
  var camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 100);
  camera.layers.enable(1);

  var cameraDummy = new THREE.Object3D();
  cameraDummy.add(camera);

  // Antialiasing disabled to improve performance.
  var renderer = new THREE.WebGLRenderer({antialias: false});
  renderer.setClearColor(0x000000, 0);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);

  container.appendChild(renderer.domElement);

  var controls = new THREE.VRControls(camera);
  var effect = new THREE.VREffect(renderer);

  // Disable eye separation.
  effect.scale = 0;
  effect.setSize(window.innerWidth, window.innerHeight);

  // Present submission of frames automatically. This is done manually in
  // submitFrame().
  effect.autoSubmitFrame = false;

  this.camera = camera;
  this.renderer = renderer;
  this.effect = effect;
  this.controls = controls;
  this.manager = new WebVRManager(renderer, effect, {predistorted: false, hideButton: hideFullscreenButton});

  this.scene = this.createScene_();
  this.scene.add(this.camera.parent);


  // Watch the resize event.
  window.addEventListener('resize', this.onResize_.bind(this));

  // Prevent context menu.
  window.addEventListener('contextmenu', this.onContextMenu_.bind(this));

  window.addEventListener('vrdisplaypresentchange',
                          this.onVRDisplayPresentChange_.bind(this));
};

WorldRenderer.prototype.onResize_ = function() {
  this.effect.setSize(window.innerWidth, window.innerHeight);
  this.camera.aspect = window.innerWidth / window.innerHeight;
  this.camera.updateProjectionMatrix();
};

WorldRenderer.prototype.onVRDisplayPresentChange_ = function(e) {
  if (Util.isDebug()) {
    console.log('onVRDisplayPresentChange_');
  }
  var isVR = this.isVRMode();

  // If the mode changed to VR and there is at least one hotspot, show reticle.
  var isReticleVisible = isVR && this.hotspotRenderer.getCount() > 0;
  this.reticleRenderer.setVisibility(isReticleVisible);

  // Resize the renderer for good measure.
  this.onResize_();

  // Analytics.
  if (window.analytics) {
    analytics.logModeChanged(isVR);
  }

  // When exiting VR mode from iOS, make sure we emit back an exit-fullscreen event.
  if (!isVR && Util.isIOS()) {
    Util.sendParentMessage({type: 'exit-fullscreen'});
  }

  // Emit a mode change event back to any listeners.
  this.emit('modechange', isVR);
};

WorldRenderer.prototype.createScene_ = function(opt_params) {
  var scene = new THREE.Scene();

  // Add a group for the photosphere.
  var photoGroup = new THREE.Object3D();
  photoGroup.name = 'photo';
  scene.add(photoGroup);

  return scene;
};

WorldRenderer.prototype.onHotspotFocus_ = function(id) {
  // Set the default cursor to be a pointer.
  this.setCursor_('pointer');
};

WorldRenderer.prototype.onHotspotBlur_ = function(id) {
  // Reset the default cursor to be the default one.
  this.setCursor_('');
};

WorldRenderer.prototype.setCursor_ = function(cursor) {
  this.renderer.domElement.style.cursor = cursor;
};

WorldRenderer.prototype.onContextMenu_ = function(e) {
  e.preventDefault();
  e.stopPropagation();
  return false;
};

module.exports = WorldRenderer;

},{"../util":21,"./adaptive-player":9,"./eyes":10,"./hotspot-renderer":11,"./reticle-renderer":15,"./sphere-renderer":17,"./video-proxy":18,"@tweenjs/tween.js":1,"eventemitter3":3,"webvr-boilerplate":7}],20:[function(_dereq_,module,exports){
/*
 * Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Messages from the API to the embed.
 */
var Message = {
  PLAY: 'play',
  PAUSE: 'pause',
  TIMEUPDATE: 'timeupdate',
  ADD_HOTSPOT: 'addhotspot',
  SET_CONTENT: 'setimage',
  SET_VOLUME: 'setvolume',
  MUTED: 'muted',
  SET_CURRENT_TIME: 'setcurrenttime',
  DEVICE_MOTION: 'devicemotion',
  GET_POSITION: 'getposition',
  SET_FULLSCREEN: 'setfullscreen',
};

module.exports = Message;

},{}],21:[function(_dereq_,module,exports){
/*
 * Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var Util = window.Util || {};

Util.isDataURI = function(src) {
  return src && src.indexOf('data:') == 0;
};

Util.generateUUID = function() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
    .toString(16)
    .substring(1);
  }
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
    s4() + '-' + s4() + s4() + s4();
};

Util.isMobile = function() {
  var check = false;
  (function(a){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4)))check = true})(navigator.userAgent||navigator.vendor||window.opera);
  return check;
};

Util.isIOS = function() {
  return /(iPad|iPhone|iPod)/g.test(navigator.userAgent);
};

Util.isSafari = function() {
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
};

Util.cloneObject = function(obj) {
  var out = {};
  for (key in obj) {
    out[key] = obj[key];
  }
  return out;
};

Util.hashCode = function(s) {
  return s.split("").reduce(function(a,b){a=((a<<5)-a)+b.charCodeAt(0);return a&a},0);
};

Util.loadTrackSrc = function(context, src, callback, opt_progressCallback) {
  var request = new XMLHttpRequest();
  request.open('GET', src, true);
  request.responseType = 'arraybuffer';

  // Decode asynchronously.
  request.onload = function() {
    context.decodeAudioData(request.response, function(buffer) {
      callback(buffer);
    }, function(e) {
      console.error(e);
    });
  };
  if (opt_progressCallback) {
    request.onprogress = function(e) {
      var percent = e.loaded / e.total;
      opt_progressCallback(percent);
    };
  }
  request.send();
};

Util.isPow2 = function(n) {
  return (n & (n - 1)) == 0;
};

Util.capitalize = function(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
};

Util.isIFrame = function() {
  try {
    return window.self !== window.top;
  } catch (e) {
    return true;
  }
};

// From http://goo.gl/4WX3tg
Util.getQueryParameter = function(name) {
  name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
  var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
      results = regex.exec(location.search);
  return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
};


// From http://stackoverflow.com/questions/11871077/proper-way-to-detect-webgl-support.
Util.isWebGLEnabled = function() {
  var canvas = document.createElement('canvas');
  try { gl = canvas.getContext("webgl"); }
  catch (x) { gl = null; }

  if (gl == null) {
    try { gl = canvas.getContext("experimental-webgl"); experimental = true; }
    catch (x) { gl = null; }
  }
  return !!gl;
};

Util.clone = function(obj) {
  return JSON.parse(JSON.stringify(obj));
};

// From http://stackoverflow.com/questions/10140604/fastest-hypotenuse-in-javascript
Util.hypot = Math.hypot || function(x, y) {
  return Math.sqrt(x*x + y*y);
};

// From http://stackoverflow.com/a/17447718/693934
Util.isIE11 = function() {
  return navigator.userAgent.match(/Trident/);
};

Util.getRectCenter = function(rect) {
  return new THREE.Vector2(rect.x + rect.width/2, rect.y + rect.height/2);
};

Util.getScreenWidth = function() {
  return Math.max(window.screen.width, window.screen.height) *
      window.devicePixelRatio;
};

Util.getScreenHeight = function() {
  return Math.min(window.screen.width, window.screen.height) *
      window.devicePixelRatio;
};

Util.isIOS9OrLess = function() {
  if (!Util.isIOS()) {
    return false;
  }
  var re = /(iPhone|iPad|iPod) OS ([\d_]+)/;
  var iOSVersion = navigator.userAgent.match(re);
  if (!iOSVersion) {
    return false;
  }
  // Get the last group.
  var versionString = iOSVersion[iOSVersion.length - 1];
  var majorVersion = parseFloat(versionString);
  return majorVersion <= 9;
};

Util.getExtension = function(url) {
  return url.split('.').pop().split('?')[0];
};

Util.createGetParams = function(params) {
  var out = '?';
  for (var k in params) {
    var paramString = k + '=' + params[k] + '&';
    out += paramString;
  }
  // Remove the trailing ampersand.
  out.substring(0, params.length - 2);
  return out;
};

Util.sendParentMessage = function(message) {
  if (window.parent) {
    parent.postMessage(message, '*');
  }
};

Util.parseBoolean = function(value) {
  if (value == 'false' || value == 0) {
    return false;
  } else if (value == 'true' || value == 1) {
    return true;
  } else {
    return !!value;
  }
};

/**
 * @param base {String} An absolute directory root.
 * @param relative {String} A relative path.
 *
 * @returns {String} An absolute path corresponding to the rootPath.
 *
 * From http://stackoverflow.com/a/14780463/693934.
 */
Util.relativeToAbsolutePath = function(base, relative) {
  var stack = base.split('/');
  var parts = relative.split('/');
  for (var i = 0; i < parts.length; i++) {
    if (parts[i] == '.') {
      continue;
    }
    if (parts[i] == '..') {
      stack.pop();
    } else {
      stack.push(parts[i]);
    }
  }
  return stack.join('/');
};

/**
 * @return {Boolean} True iff the specified path is an absolute path.
 */
Util.isPathAbsolute = function(path) {
  return ! /^(?:\/|[a-z]+:\/\/)/.test(path);
}

Util.isEmptyObject = function(obj) {
  return Object.getOwnPropertyNames(obj).length == 0;
};

Util.isDebug = function() {
  return Util.parseBoolean(Util.getQueryParameter('debug'));
};

Util.getCurrentScript = function() {
  // Note: in IE11, document.currentScript doesn't work, so we fall back to this
  // hack, taken from https://goo.gl/TpExuH.
  if (!document.currentScript) {
    console.warn('This browser does not support document.currentScript. Trying fallback.');
  }
  return document.currentScript || document.scripts[document.scripts.length - 1];
}


module.exports = Util;

},{}],22:[function(_dereq_,module,exports){
/*
 * Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Video Types
 */
var VideoTypes = {
  HLS: 1,
  DASH: 2,
  VIDEO: 3
};

module.exports = VideoTypes;
},{}]},{},[14]);
