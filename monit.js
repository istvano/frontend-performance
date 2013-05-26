// asynchronous global array for tracker
if (typeof _maq !== 'object') {
    _maq = [];
}

if (typeof Monit !== 'object') {
	
	//registering global namespace
    Monit = (function (window, document, _maq) {
    
	'use strict';	
		
	/**********************************************
     * Private variables
     *********************************************/
	var 
	 /* performance timing */
	performanceInfo = window.performance || window.mozPerformance || window.msPerformance || window.webkitPerformance || {
		timing:{fetchStart:0, loadEventEnd:0},
		navigation:{redirectCount:0, type:0},
		memory:{}
	 },
	mapping = {
		 //mapping memory elements
		 jsHeapSizeLimit: 'jhsl',
		 totalJSHeapSize: 'tjhs',
		 usedJSHeapSize:  'ujhs',
		 //navigation
		 redirectCount: 'rc',
		 type: 't'
	 },
	perfInstances = [],
	asyncTracker,
	Monit; //local itself	 
	 
	/***********************************************
     * Private methods
    ************************************************/

    /*
     * is it an object
     */
	function isObject(obj) {
        return typeof obj === 'object';
    }

    /*
     * Is this a string ?
     */
    function isString(str) {
        return typeof str === 'string' || str instanceof String;
    }

    function isUndefined(val) {
        return typeof val === 'undefined';
    }

    /*
     * utility to go trhough an array or object and callback on each element of it
     * @param obj -> array or object
     * @param callback -> method which will be executed
     */
    function each(obj, callback) {
        var i, j;

        if (isObject(obj)) {
            for (i in obj) {
                if (obj.hasOwnProperty(i)) {
                    callback.call(null, i, obj[i]);
                }
            }
        } else if ( !isUndefined(obj.length) ) {
            j = obj.length;
            if (j) {
                for (i = 0; i < j; i++) {
                    callback.call(null, i, obj[i]);
                }
            }
        }
    }

	/*
	 * fallback image request to server using get ( limits var. length )
	 */
	function sendImageRequest(url, request) {
		var image = new Image(1, 1);

		image.onload = function () { };
		image.src = url + (url .indexOf('?') < 0 ? '?' : '&') + request;
	}

    /*
     * send using ajax
     */
    function sendAjaxRequest(url, request, timeout) {
        try {

            var postTimeout = timeout || 4000,
                xhr = window.XMLHttpRequest
                ? new window.XMLHttpRequest()
                : window.ActiveXObject
                ? new ActiveXObject('Microsoft.XMLHTTP')
                : null;

            if ( xhr ) {
                xhr.open('POST', url, true);

                // fallback on error
                xhr.onreadystatechange = function () {
                    if (this.readyState === 4 && this.status !== 200) {
                        sendImageRequest(url, request);
                    }
                };

                xhr.timeout = postTimeout;
                xhr.ontimeout = function () { }; //on timeout do nothing

                xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8');

                xhr.send(request);
            } else {
                sendImageRequest(url, request);
            }
        } catch (e) {
            // fallback
            sendImageRequest(url, request);
        }
    }

    /*
     * Send request
     */
    function sendRequest(url, method, request,timeout) {
        if (method === 'POST') {
            sendAjaxRequest(url,request,timeout);
        } else {
            sendImageRequest(url,request);
        }

    }

    /*
     * processing call back function while setting right context
     *      [ 'methodName', optional_parameters ]
     */
    function applyAsyncCalls() {
        var i, f, parameterArray;
        for (i = 0; i < arguments.length; i += 1) {
            parameterArray = arguments[i];
            f = parameterArray.shift();
            if (isString(f)) {
                asyncTracker[f].apply(asyncTracker, parameterArray);
            } else {
                f.apply(asyncTracker, parameterArray);
            }
        }
    }

    /*
     * maps a given array using the mapping global variable
     */
    function mapParamArray(items) {
        var result = [];

        each(items, function(i, val) {
            if ( val ) {
                each(val, function(j, prop) {
                    var m = mapping[j];
                    result[m?m:j] = prop;
                });
            }
        });

        return result;
    }

    /*
     * calculate metrix using http://www.html5rocks.com/en/tutorials/webperformance/basics/
     */
    function calculateMetrix() {
        var  t = performanceInfo.timing,
             secure = t.secureConnectionStart?t.connectEnd - t.secureConnectionStart:t.secureConnectionStart;

        performanceInfo.monit = {
            n                : t.responseEnd - t.fetchStart, //( network latency) - network
            d                : t.domainLookupEnd - t.domainLookupStart, // ( DNS ) - dns
            ac               : t.domainLookupStart - t.fetchStart, // ( App cache ) - appCache

            rd               : t.redirectEnd - t.redirectStart, //( redirect ) - redirect
            c                : t.connectEnd - t.connectStart, // ( TCP ) - connect
            sc             	 : secure, //secureConnect

            w                : t.responseStart - t.requestStart, //( Request ) - wait

            r                : t.responseEnd - t.responseStart, //( Response ) - receive

            l                : t.loadEventStart - t.fetchStart, // rendering without onload - loadEvent
            lf               : t.loadEventEnd - t.fetchStart, // rendering with onload - loadEventFinish


            dc      : t.domContentLoadedEventStart - t.fetchStart, // blue line in chrome dev tools - domContent
            dce     : t.domComplete - t.domLoading,  //( Processing ) - domComplete
            dole    : t.loadEventEnd - t.domLoading  //( Processing + onload ) - domOnLoadComplete
        };
    }

    function reportErrors(errorUrl,track,msg,file,line) {

        var error = {
                m: msg,
                f:file,
                l:line
            },
            req,
            pars;

        if ( console && console.error ) {
            console.error(msg + ' ('+file+') '+' line: '+line);
        }

        if (!track) return;

        req = "s="+encodeURIComponent(track.getSiteId())+"&u="+encodeURIComponent(track.getPageUrl());

        pars = mapParamArray([error]);

        each(pars, function(name,value) {
            req = req + '&' + name + '=' + encodeURIComponent(value);
        });

        if ( errorUrl ) {
            sendRequest(errorUrl,track.getRequestMethod(),req);
        }

    }

    function ErrorCatcher(url,track,callback) {
        var
          errorCallback = callback || function() {},
          errorUrl = url,
          tracker  = track,
          execute = false,
          oldOnError;

        var errorHandler = function (message, file, line) {
            var that = this;
            if ( execute ) return;

            //this is to stop infinite error chaining
            execute = true;
            setTimeout(function () {

                try {
                    errorCallback.apply(that, [errorUrl,tracker,message,file,line]);

                    if (oldOnError && oldOnError != errorHandler) {
                        return oldOnError.apply(that, arguments);
                    }

                } catch (e) {
                    if ( console && console.error ) {
                        console.error("Uncaught Error: "+e.message);
                    }
                } finally {
                    execute = false;
                }

            }, 0);

            return true;
        };

        if ( !oldOnError ) {
            oldOnError = window.onerror;
        }

        //install onerror handler
        window.onerror = errorHandler;

        return {
            getOldHandler: function() {
                return oldOnError;
            },
            setOldHandler:function(func) {
                if ( func != errorHandler ) {
                    oldOnError = func;
                }
            },
            getOnError:function() {
                return errorHandler;
            }
        };
    }

	/**********************************************************
     * private Inner Classes ( Java like )
    **********************************************************/
	function Tracker(url,id) {

		// reporting URL
		var
		reportUrl = url || '',
        exceptionUrl,
        siteId = id || 'anonym',
        pageUrl = document.URL || window.location.href || '',
        requestMethod = 'GET',
        customVars = [],
        errorHandler,
		timeout = 500;

		/*********************************************************
		 * Public variables and methods
		 *********************************************************/
		return {
		
                /**
                 * Specify the URL to send reports to
                 *
                 * @param string url
                 */
                setReportUrl: function (url) {
                    reportUrl = url;
                },

                setPageUrl: function(url) {
                    pageUrl = url;
                },

                getPageUrl: function() {
                    return pageUrl;
                },

                setSiteId: function(id) {
                    siteId = id;
                },

                getSiteId: function() {
                    return siteId;
                },

                getPerformanceInfo: function() {
                    return performanceInfo;
                },

                track: function() {
                    var pars, i,
                        req = "s="+encodeURIComponent(siteId)+"&u="+encodeURIComponent(pageUrl);

                    calculateMetrix(); //incase onload is not called
                    //console.log("track: " +pageUrl);
                    var items = [performanceInfo.monit,performanceInfo.navigation,performanceInfo.memory];

                    if ( customVars ) {
                        items.push(customVars);
                    }

                    pars = mapParamArray(items);

                    each(pars, function(name,value) {
                       req = req + '&' + name + '=' +encodeURIComponent(value);
                    });

                    if ( reportUrl ) {
                        sendRequest(reportUrl,requestMethod,req, timeout);
                    }
                },
                /**
                 * callBack client calls it to nofity with pageLoad
                 * either with Jquery or Prototype
                 */
                onLoad: function() {
                    var that = this;
                    setTimeout(function(){
                        if ( performanceInfo.timing.loadEventEnd == 0 ) {
                            performanceInfo.timing.loadEventEnd = Date.now();
                        }

                        /* // experimental: can cause circular calls to itself. needs semafore
                        if ( exceptionUrl && errorHandler.getOnError != window.onerror ) {
                            errorHandler = new ErrorCatcher(url,this,reportErrors);
                        }
                        */
                        that.track();
                    }, 0);
                },

                markStart: function() {
                    if ( performanceInfo.timing.fetchStart == 0 ) {
                        performanceInfo.timing.fetchStart = Date.now();
                    }
                },

                trackErrors: function(url) {
                    exceptionUrl = url;
                    errorHandler = new ErrorCatcher(url,this,reportErrors);
                },

                usePost: function() {
                    requestMethod = 'POST';
                },

                useGet: function() {
                    requestMethod = 'GET';
                },

                addCustomVar:function(name,value) {
                    customVars['c_'+name]=value;
                },

                getRequestMethod:function() {
                    return requestMethod;
                },

                getErrorHandler:function() {
                    return errorHandler;
                }
		};
	
	}


    /**********************************************
     * Constructor
     **********************************************/

	Monit = {
	
            /**
             * factory method to get the same tracker back for a given url
             * @param string url to send perf info
             * @return Tracker
             */
            getTracker: function (url) {
                var result, name = url || 'async';
                result = perfInstances[name] || new Tracker(url);
                perfInstances[name] = result;
				return result;
            }

	};

    //process all the async calls so far
    asyncTracker = Monit.getTracker();

    // set the report url 1st
    for (var i = 0; i < _maq.length; i++) {
        if (_maq[i][0] === 'setReportUrl' ) {
            applyAsyncCalls(_maq[i]);
            delete _maq[i];
        }
    }

    // find the all calls to async object before init
    for (i = 0; i < _maq.length; i++) {
        if (_maq[i]) {
            applyAsyncCalls(_maq[i]);
        }
    }

    //replace original array's push with proxy to allow future calls to be passed to asyncTracker
    _maq.push = applyAsyncCalls;
	
	// being AMD compatible
	if (typeof define === 'function' && define.amd) {
		define(['monit'], [], function () { return Monit; });
	}	
	
	return Monit;
	
	}(window,document,_maq));
	
}