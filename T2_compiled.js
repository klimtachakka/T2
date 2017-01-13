


(function() {
	var instance = function() {
		function T2( /*options*/ ) {



			this.internalData = {
				tickFunctionsHash: {},
				readCalls: 0,
				writeCalls: 0,
				renderShell: false,
				renderRolling: false,
				renderFixed: true,
				ticks: 0,
				renders: 0,
				active: 0,
				tickStep5: 0

			};
			var savedConsoleFnLog = null;
			var savedConsoleFnWarn = null;
			var savedConsoleFnError = null;
			if (window && window.console && window.console.log) {
				savedConsoleFnLog = window.console.log;
				savedConsoleFnWarn = window.console.warn;
				savedConsoleFnError = window.console.error;
			}

			this.___settings = {
				bootTimeStamp: new Date().getTime(),
				genIdIndex: 1000,
				templateCache: {},
				params: {
					savedConsoleFnLog: savedConsoleFnLog,
					savedConsoleFnWarn: savedConsoleFnWarn,
					savedConsoleFnError: savedConsoleFnError,
					savedOutFn: null,

					timer_internal_render: 0,
					rolling_scroll_to_bottom: false,
					inputList: [],
					inputIndex: 0,
					devMode: false,
					devPause: true,
					oldShellData: null,
					eventHandlerHash: {},
					rolling: [],
					rolling_changed: false,
					rollingDev: [],
					rollingDevHash: [],
					rollingHistory: [],
					fixed: {},
					fixed_changed: false,
					flagForRender: false,
					colorMap: {},
					CONSOLE_MODES: ['DEFAULT', 'CONSOLE_TO_TRACKER', 'TRACKER_TO_CONSOLE']
				},
				persistantParams: {
					positionx: 0,
					positiony: 0,
					minimized: false,
					zoom: false,
					verbose: true,
					showFilters: true,
					paused: false,
					CONSOLE_MODE_STR: 'DEFAULT',
					CURRENT_CONSOLE_MODE: 0,
					filter: {}

				},
				plugins: {},
				GNS: this.getDataAttribute('namespace') || 'tracker',
				el: this.___createTarget(this.getDataAttribute('target'))
			};

			window[this.___settings.GNS] = {};

			this.___ink = 	function ink(tpl, codeOnly) {

		var loopParam = /(\{\{\#[a-z0-9,\.]{1,}\}\})/igm;
		var loopEndParam = /(\{\{\/[a-z0-9,\.]{1,}\}\})/igm;
		var ifParam = /(\{\{\#if.[a-z0-9,\.]{1,}\}\})/igm;
		var unlessParam = /(\{\{\#unless.[a-z0-9,\.]{1,}\}\})/igm;
		var rParam = /(\{\{[^/#][^\s}]{0,}\}\})/igm;
		var rStringInWs = /(\s+[a-z0-9,\.]{1,})/igm;
		var rStringIn = /([a-z0-9]{1,})/igm;
		var rStringOrDotStringIn = /([a-z0-9\/.]{1,})/igm;
		var loop = /(\{\{\#([a-z0-9,\.]{1,})\}\}([\s\S]{1,})\{\{\/\2\}\})/igm;
		var blockFinder = /(?:}})([^{]+)(?:{{)/igm;
		var outerBlockFinderStart = /^([^{]+)/igm;
		var outerBlockFinderEnd = /([^}]+)$/ig;
		var helperRgx = /{{(([^\s#}]{1,})\s((?:"?[^}]{1,}"?)+))}}/igm;

		var currentLoopKey = 0;
		var currentLoopKeySfx = 0;
		var currentLoopArr = "qwetyuiopasfgjklzxcvbnm".split(""); //A-Z without reserved keys R ,D & H		
		var SB = "r+='";
		var EB = "';";
		var ROOT_CTX = "d.";
		var THIS_BLOCK = "{{.}}";

		function helperHandler(template, context /*, contextList*/ ) {
			if (template) {
				helperRgx = new RegExp(helperRgx);
				var res = helperRgx.exec(template);
				if (res) {
					var fnAndParams = res[1].split(" ");
					var fnName = fnAndParams.shift();
					var len = fnAndParams.length;
					for (var i = 0; i < len; i++) {
						if (fnAndParams[i][0] !== '"') {
							if (fnAndParams[i] === "this") {
								fnAndParams[i] = "d";
							} else {
								fnAndParams[i] = context + fnAndParams[i];
							}
						}
					}
					return template.replace(res[0], "r+= h." + fnName + "(" + fnAndParams.join(", ") + ");");
				}
			}
		}

		function ifHandler(template, context, contextList) {
			if (template.indexOf("{{#if") === -1) {
				return;
			}
			ifParam = new RegExp(ifParam);
			var res = ifParam.exec(template);
			return orOperator(res, context, contextList, template, "if(", "{{/if}}");
		}

		function orOperator(res, context, contextList, template, begin, end) {
			if (res) {
				rStringInWs = new RegExp(rStringInWs);
				var parts = [];
				parts = template.split(res[0]);
				var strInWS = rStringInWs.exec(res[0]);
				var middle = begin + contextWriter(context, contextList, strInWS[0].replace(" ", "")) + "){";
				template = parts.join(middle);
				parts = template.split(end);
				template = parts.join("}");
				parts = template.split("{{else}}");
				template = parts.join("}else{");
				return template;
			}
		}

		function unlessHandler(template, context, contextList) {
			if (template.indexOf("{{#unless") === -1) {
				return;
			}
			unlessParam = new RegExp(unlessParam);
			var res = unlessParam.exec(template);
			return orOperator(res, context, contextList, template, "if(!", "{{/unless}}");
		}

		function paramHandler(template, context, contextList) {
			if (template.indexOf("{{") === -1) {
				return;
			}
			rParam = new RegExp(rParam);
			rStringOrDotStringIn = new RegExp(rStringOrDotStringIn);
			var x = rParam.exec(template);

			if (x && x[0]) {
				var strIn = rStringOrDotStringIn.exec(x[0]);
				if (x[0].indexOf(THIS_BLOCK) > -1) {
					return template.replace(THIS_BLOCK, "r+=" + context.substring(0, context.length - 1) + ";");

				} else {
					return template.split(x[0]).join("r+=" + contextWriter(context, contextList, strIn[0]) + ";");
				}
			}
		}

		function contextWriter(context, contextList, param /*, ignoreFalse*/ ) {
			var backSteps = 0;
			var backStep = "../";
			var lookback = param;
			//var origParam = param;

			while (param.indexOf(backStep) > -1) {
				param = param.replace(backStep, '');
				backSteps++;
			}
			if (context !== ROOT_CTX) {
				lookback = param + "||" + ROOT_CTX + param;
			} else if (param.indexOf('.') > -1) {
				lookback = param + "||" + ROOT_CTX + param.split(".").pop();
			}
			/*
			//NOT WORKING
			if (ignoreFalse) {
				lookback = param + "===undefined?" + ROOT_CTX + param + ":" + origParam;
			}*/

			if (backSteps) {
				return contextList[contextList.length - (backSteps + 1)] + lookback;
			}
			return context + lookback;
		}

		function getCurrentLoopKey() {
			currentLoopKey++;
			if (currentLoopKey > currentLoopArr.length - 1) {
				currentLoopKey = 0;
				currentLoopKeySfx++;
			}
			return currentLoopArr[currentLoopKey] + (currentLoopKeySfx ? currentLoopKeySfx : "");
		}

		function loopHandler(template, context, contextList) {
			if (template.indexOf("{{#") === -1) {
				return;
			}
			var currentKey = getCurrentLoopKey();
			loopParam = new RegExp(loopParam);
			loopEndParam = new RegExp(loopEndParam);
			rStringIn = new RegExp(rStringIn);
			loop = new RegExp(loop);
			var loopRes = loop.exec(template);

			if (loopRes) {
				var outerLoop = loopRes[0];
				var templateParts = template.split(outerLoop);
				var contentLoop = loopRes[3];

				if (contentLoop) {
					var newContext = context + loopRes[2] + "[" + currentKey + "].";
					contextList.push(newContext);
					var middle = contentLoop;
					var fns = [loopHandler, paramHandler, ifHandler, unlessHandler, helperHandler];

					while (fns.length) {
						for (var i = 0; i < fns.length; i++) {
							var res = fns[i](middle, newContext, contextList);
							if (res) {
								middle = res;
							} else {
								fns.splice(i, 1);
							}
						}
					}
					var dot = ".";
					if (context.charAt(context.length - 1) === ".") {
						dot = "";
					}
					var loopStart = "for(var " + currentKey + " in " + context + dot + loopRes[2] + "){";
					var loopEnd = "}";
					return templateParts.join(loopStart + middle + loopEnd);
				}
			}
		}

		function joinPartsHelper(indexModifier, res, resIndex, template, recurseFn) {
			if (res && res[resIndex] && res[resIndex].indexOf(SB) !== 0) {
				var matchPos = res.index + indexModifier;
				var start = template.substring(0, matchPos);
				var end = template.substring(matchPos + res[resIndex].length, template.length);
				var theEnd = recurseFn ? (recurseFn(end) || end) : end;
				var result = start + SB + res[resIndex] + EB + theEnd;
				return result;
			}
		}

		function outerStartBlockHandler(template) {
			var regx = new RegExp(outerBlockFinderStart);
			var res = regx.exec(template);
			return joinPartsHelper(0, res, 0, template, null);
		}

		function outerEndBlockHandler(template) {
			var regx = new RegExp(outerBlockFinderEnd);
			var res = regx.exec(template);
			return joinPartsHelper(0, res, 0, template, null);
		}

		function blockHandler(template) {
			var regx = new RegExp(blockFinder);
			var res = regx.exec(template);
			return joinPartsHelper(2, res, 1, template, blockHandler);
		}

		function create(fn, tpl) {
			while (true) {
				var t = fn(tpl, ROOT_CTX, [ROOT_CTX]);
				if (t) {
					tpl = t;
				} else {
					break;
				}
			}
			return tpl;
		}

		function compiler(tpl, codeOnly) {
			var fns = [outerStartBlockHandler, outerEndBlockHandler, blockHandler, loopHandler, ifHandler, unlessHandler, paramHandler, helperHandler];
			var len = fns.length;
			for (var i = 0; i < len; i++) {
				tpl = create(fns[i], tpl);
			}
			tpl = tpl.split("\n").join("\\n"); //escape newline
			tpl = "var r='';" + tpl + "return r;"; //add surrounding body
			if (codeOnly) {
				return "function(d,h){" + tpl + "}";
			}
			return new Function('d', 'h', tpl);
		}
		return compiler(tpl, codeOnly);
	}
;


			this.___settings.persistantParams = this.___store(false, this.___settings.GNS, this.___settings.persistantParams);



			var waitForSetup = this.getDataAttribute('wait') || false;
			if (!waitForSetup) {
				var obj = this.___setup(this.___settings.persistantParams);
				this.writeSetting('colorMap', obj.colorMap);
				this.writeSetting('filter', obj.filter, true);
				this.___addLogs(obj.filter);
			}

			if (this.getDataAttribute('dev')) {
				this.___settings.params.devMode = true;
				this.___settings.params.devPause = false;
				window[this.___settings.GNS].settings = this.___settings;
			}

			this.___manipulateConsole();

			this.___createCSS();
			this.___renderShell();

			this.___tick(25);



			this.___introArr = ("Tracker 2.0 GUI. n:s " + this.___settings.GNS).split("");

			this.registerTickFunction('___intro');



			var that = this;
			window.onerror = function(errorMsg, url, lineNumber, column, errorObj) {
				that.out('error', [errorMsg + ', ' + url + ', ' + lineNumber + ', ' + column + ', ' + errorObj], true);
				that.writeSetting('rolling_scroll_to_bottom', true);
			};
			window.onbeforeunload = this.___bind(function( /*e*/ ) {
				this.___store(true, this.___settings.GNS, this.___settings.persistantParams);
			}, this);

			this.addToPuclibApi('start', this.start);
			this.addToPuclibApi('end', this.end);
			this.addToPuclibApi('setup', this.setup);
			this.addToPuclibApi('replace', this.outReplace);

			var target = document.getElementById('tracker-gen-id');
			target.style.left = this.___settings.persistantParams.positionx + 'px';
			target.style.top = this.___settings.persistantParams.positiony + 'px';


			if (window.utag && window.utag.track) {
				window.utag.track = window[this.___settings.GNS].log;
			}
		}

		T2.prototype.___loadVisIdxStart = 0;
		T2.prototype.___loadVisIdxEnd = 0;
		T2.prototype.___loadVisLength = 10;
		T2.prototype.___loadVisChars = ['-', '\\', '|', '/'];
		T2.prototype.___loadVisCharIndex = 0;

		T2.prototype.___loadVisA = function() {
			var empty = "&nbsp;";
			var full = "#";
			var ret = "[";
			for (var i = 0; i < this.___loadVisLength; i++) {
				if (i >= this.___loadVisIdxStart && i <= this.___loadVisIdxEnd) {
					ret += full;
				} else {
					ret += empty;
				}
			}
			return ret + ']';
		};

		T2.prototype.___loadVisB = function() {
			var empty = "&nbsp;";
			var full = "=";
			var ret = "[";
			for (var i = 0; i < this.___loadVisLength; i++) {
				if (i >= this.___loadVisIdxStart && i <= this.___loadVisIdxEnd) {
					ret += empty;
				} else {
					ret += full;
				}
			}
			return ret + ']';
		};
		T2.prototype.___loadVisC = function() {
			return "'" + this.___loadVisChars[this.___loadVisCharIndex] + "'";
		};


		T2.prototype.___introIndex = 0;

		T2.prototype.___intro = function() {
			if (this.internalData.ticks <= this.___introArr.length) {
				document.getElementById('tracker-input').value = this.___introArr.slice(0, this.internalData.ticks).join("") + '_';
			} else {
				document.getElementById('tracker-input').value = this.___introArr.slice(0, this.internalData.ticks).join("");
				this.unregisterTickFunction('___intro');
			}
		};

		T2.prototype.___removeIntro = function() {
			var el = document.getElementById('tracker-input');
			var str = el.value;
			if (str && str.length > 0) {
				str = str.substring(3, str.length);
				el.value = str;
			} else {
				el.value = 'window.';
				this.unregisterTickFunction('___removeIntro');
				document.getElementById('tracker-input-hint').innerHTML = '[CTRL to use hint]';
			}
		};



		T2.prototype.unregisterTickFunction = function(name) {
			this.internalOut('unregister tick fn', name);
			delete this.internalData.tickFunctionsHash[name];
		};
		T2.prototype.registerTickFunction = function(name, anonFn) {
			this.internalOut('register tick fn', name);
			this.internalData.tickFunctionsHash[name] = this.___bind(anonFn || this[name], this);

		};
		T2.prototype.___tick = function(tickTime) {

			for (var key in this.internalData.tickFunctionsHash) {
				this.internalData.tickFunctionsHash[key]();
			}

			//console.log(this.___settings.params.flagForRender);

			this.internalData.ticks++;

			this.internalData.tickStep5++;
			if (this.internalData.tickStep5 > 3) {
				this.internalData.tickStep5 = 0;
				/*this.outFixed('load b', this.___loadVisA());
				this.outFixed('load a', this.___loadVisB());
				this.outFixed('load c', this.___loadVisC());*/

				this.___loadVisCharIndex++;
				if (this.___loadVisCharIndex >= 4) {
					this.___loadVisCharIndex = 0;
				}
				this.___loadVisIdxEnd++;
				if (this.___loadVisIdxEnd >= this.___loadVisLength) {
					this.___loadVisIdxEnd = this.___loadVisLength;

					this.___loadVisIdxStart++;
					if (this.___loadVisIdxStart >= this.___loadVisLength) {
						this.___loadVisIdxStart = 0;
						this.___loadVisIdxEnd = 0;
					}

				}
			}

			//this.outFixed('idx', this.___loadVisIdxStart + ' = ' + this.___loadVisIdxEnd);



			if (this.___settings.params.flagForRender === true) {
				this.writeSetting('flagForRender', false);


				this.internalData.renders++;



				this.___render();

				/*this.___settings.params.rollingDev[0] = {
					key: 'update',
					color: 'lime',
					value: this.___tickStamp
				};*/
			}

			if (this.___settings.params.flagForRenderDev === true) {
				this.renderDev();
				this.___settings.params.flagForRenderDev = false;
			}

			/*if (!this.readSetting('devPause')) {
				this.smoothScroll();
			}*/

			var that = this;
			setTimeout(function() {
				setTimeout(function() {
					that.___tick(tickTime);
				}, tickTime);
			}, 1);

		};


		T2.prototype.___start = function(key) {
			this.writeSetting('timer_' + key, new Date().getTime());
		};
		T2.prototype.___end = function(key) {
			var t = new Date().getTime();
			var ot = this.readSetting('timer_' + key);
			newTime = t - ot;

			return this.___stringFormatFloat(newTime * 0.001, 3);
		};

		T2.prototype.___stringFormatFloat = function(num, decimals) {

			var strResult = num + '';
			var prefix = "";
			var _dec = "";
			if (strResult.indexOf('.') > -1) {
				var parts = strResult.split('.');
				decimals = decimals || 3;
				_dec = parts[1].substring(0, decimals);
				var zeros = decimals - _dec.length;


				for (var i = 0; i < zeros; i++) {
					prefix += "0";
				}
				strResult = parts[0] + '.' + prefix + _dec;
			}

			return strResult;

		};

		T2.prototype.___renderShell = function() {
			this.___settings.el.innerHTML = this.___renderHTML(this.___templateShell, {
				maxWidth: parseInt(window.innerWidth * 0.9),
				maxHeight: parseInt(window.innerHeight * 0.9),
				maxHeightRolling: parseInt(window.innerHeight * 0.6),
				maxHeightFixed: parseInt(window.innerHeight * 0.2),
				maxHeightDev: parseInt(window.innerHeight * 0.1),
				displayState: this.___settings.persistantParams.minimized ? 'none' : 'block',
				zoom: this.readSetting('zoom', true) ? 2 : 1
			});

			this.internalOut('render', 'SHELL', 'cyan');

			this.___manipulateEvents(this, [{
					id: 'input',
					event: 'keydown',
					handler: '___inputHandlerExec'
				}, {
					id: 'input',
					event: 'keyup',
					handler: '___inputHandlerHint'
				}, {
					id: 'input',
					event: 'click',
					handler: '___inputClearHandler'
				}, {
					id: 'content-rolling',
					event: 'click',
					handler: '___logClickedHandler'
				}, {
					id: 'content-fixed',
					event: 'click',
					handler: '___logClickedHandler'
				}
				/*, {
					id: 'content-rolling-dev',
					event: 'click',
					handler: '___logClickedHandler'
				}*/
			], true);
			this.___render(true);
		};

		T2.prototype.___getShellParams = function() {
			return {
				colorMap: this.readSetting('colorMap'),
				filter: this.readSetting('filter', true),
				minimized: this.readSetting('minimized', true),
				verbose: this.readSetting('verbose', true),
				paused: this.readSetting('paused', true),
				rollingHistoryLength: this.readSetting('rollingHistory').length,
				rollingLength: this.readSetting('rolling').length,
				zoom: this.readSetting('zoom', true),
				showFilters: this.readSetting('showFilters', true),
				devMode: this.readSetting('devMode'),
				devPause: this.readSetting('devPause'),
				consoleMode: this.readSetting('CONSOLE_MODE_STR', true)
			};
		};

		T2.prototype.___render = function(force) {
			this.___start('internal_render');
			this.internalOut('render', 'begin', 'cyan');

			this.internalData.renderShell = false;
			this.internalData.renderFixed = false;
			this.internalData.renderRolling = false;



			var data = this.___createShellData(this.___getShellParams());


			var oldShellData = this.readSetting('oldShellData');
			if (force || JSON.stringify(oldShellData) !== JSON.stringify(data)) {
				if (oldShellData) {
					this.___manipulateEvents(this, oldShellData.items, false);

				}

				window.document.getElementById('tracker-toolbar').innerHTML = this.___renderHTML(this.___templateToolbar, data);


				this.internalOut('render', '-toolbar', 'cyan');

				this.___manipulateEvents(this, data.items, true);



				this.writeSetting('oldShellData', data);
			}



			if (!this.readSetting('minimized', true) || !this.readSetting('paused', true)) {
				if (force || this.readSetting('fixed_changed')) {
					var dataFixed = {
						fixed: this.readSetting('fixed')
					};
					window.document.getElementById('tracker-content-fixed').innerHTML = this.___renderHTML(this.___templateFixed, dataFixed);


					this.internalOut('render', '-fixed', 'cyan');

					this.writeSetting('fixed_changed', false);
					//this.scrollToBottom('tracker-content-fixed');
					//this.smoothScroll('tracker-content-fixed');
				}
				if (force || this.readSetting('rolling_changed')) {
					var allRolling = this.readSetting('rolling');
					var filter = this.readSetting('filter', true);
					var toBeRendered = [];
					var len = allRolling.length;
					for (var i = 0; i < len; i++) {
						var item = allRolling[i];
						if (filter[item.key] || item.force) {
							toBeRendered.push(item);
						}
					}
					var dataRolling = {
						rolling: toBeRendered // this.readSetting('rolling')
					};
					window.document.getElementById('tracker-content-rolling').innerHTML = this.___renderHTML(this.___templateRolling, dataRolling);
					this.internalOut('render', '-rolling', 'cyan');

					if (this.readSetting('rolling_scroll_to_bottom')) {
						//this.scrollToBottom('tracker-content-rolling');
						this.smoothScroll('tracker-content-rolling');
						this.writeSetting('rolling_scroll_to_bottom', false);
					}
					this.writeSetting('rolling_changed', false);
				}
			}



			//this.scrollToBottom('tracker-content-rolling-dev');



		};


		T2.prototype.renderDev = function() {
			if (this.readSetting('devMode')) {

				//this.createInternalSummary(this.___end('internal_render'));

				var dataRollingDev = {
					rollingdev: this.___settings.params.rollingDev
				};
				window.document.getElementById('tracker-content-rolling-dev').innerHTML = this.___renderHTML(this.___templateRollingDev, dataRollingDev);

				//this.scrollToBottom('tracker-content-rolling-dev');

				this.smoothScroll('tracker-content-rolling-dev');
			}
		}



		T2.prototype.scrollToBottom = function(id) {
			var objDiv = document.getElementById(id);
			objDiv.scrollTop = objDiv.scrollHeight;
		};


		T2.prototype.smoothScroll = function(target) {

			var objDiv = document.getElementById(target);

			if (Math.abs(objDiv.scrollTop - objDiv.scrollHeight) > objDiv.clientHeight) {
				objDiv.scrollTop = objDiv.scrollTop + ((objDiv.scrollHeight - objDiv.scrollTop) * 0.05);

				var that = this;
				setTimeout(function() {
					that.smoothScroll(target);
				}, 20);
			}
		}

		T2.prototype.___createShellData = function Shell(options) {
	var data = {};
	var items = [];

	var minimized = options.minimized;
	var paused = options.paused;
	var rollingHistoryLength = options.rollingHistoryLength;
	var rollingLength = options.rollingLength;
	var zoom = options.zoom;
	var showFilters = options.showFilters;

	var devMode = options.devMode;
	var devPause = options.devPause;

	var filter = options.filter;
	var colorMap = options.colorMap;
	var verbose = options.verbose;
	var consoleMode = options.consoleMode;

	var consoleModeColor = 'gray';
	switch (consoleMode) {
		case 'CONSOLE_TO_TRACKER':
			consoleModeColor = 'yellow';
			break;
		case 'TRACKER_TO_CONSOLE':
			consoleModeColor = 'white';
			break;
		default:

	}

	items.push({
		title: minimized ? '>' : '<',
		id: 'minimize',
		color: minimized ? 'white' : 'gray',
		handler: '___minimizeHandler',
		event: 'click',
		tooltip: minimized ? 'expand Tracker' : 'minimize Tracker'
	});



	if (!minimized) {

		items.push({
			title: 'M',
			id: 'move',
			color: 'white',
			handler: '___moveMainHandler',
			event: 'mousedown',
			tooltip: 'press down to move Tracker'
		}, {
			title: 'Z',
			id: 'zoom',
			color: zoom ? 'white' : 'gray',
			handler: '___zoomHandler',
			event: 'click',
			tooltip: zoom ? 'smaller GUI' : 'bigger GUI'
		}, {
			title: 'F',
			id: 'filters',
			color: showFilters ? 'white' : 'gray',
			handler: '___showFiltersHandler',
			event: 'click',
			tooltip: showFilters ? 'hide Filters' : 'show Filters'
		}, {
			title: '?',
			id: 'help',
			color: 'white',
			handler: '___helpHandler',
			event: 'click',
			tooltip: 'show help section'
		}, {
			title: 'P',
			id: 'pause',
			color: paused ? 'white' : 'gray',
			handler: '___pauseHandler',
			event: 'click',
			tooltip: paused ? 'resume tracking' : 'pause tracking'
		}, {
			title: 'X',
			id: 'clear',
			color: rollingLength === 0 ? (rollingHistoryLength === 0 ? 'gray' : 'red') : 'white',
			handler: '___clearHandler',
			event: 'click',
			tooltip: rollingLength === 0 ? (rollingHistoryLength === 0 ? 'history is gone N/A' : 'clear history from memory') : 'clear history from GUI'
		}, {
			title: 'V',
			id: 'verbose',
			color: verbose ? 'red' : 'gray',
			handler: '___verboseHandler',
			event: 'click',
			tooltip: verbose ? 'disable verbose mode' : 'enable verbose mode'
		}, {
			title: '#',
			id: 'hash',
			color: 'yellow',
			handler: '___clearHashHandler',
			event: 'click',
			tooltip: 'reload page without #Hash state'
		}, {
			title: 'Cns',
			id: 'cns',
			handler: '___consoleModeHandler',
			color: consoleModeColor,
			event: 'click',
			tooltip: 'Change console [' + consoleMode + ']'
		});

		if (devMode) {
			items.push({
				title: 'dP',
				id: 'devp',
				color: devPause ? 'lime' : 'gray',
				handler: '___devPauseHandler',
				event: 'click',
				tooltip: 'yolo'
			});
		}

		if (showFilters) {
			for (var key in filter) {
				items.push({
					title: key,
					color: filter[key] ? colorMap[key] : 'gray',
					id: key,
					handler: '___toggleFilterHandler',
					event: 'click',
					tooltip: filter[key] ? 'disable filter (' + key + ')' : 'enable filter (' + key + ')'
				});
			}
		}
	}

	data.items = items;

	return data;
}
;
		T2.prototype.___makeLogItem = function makeLogItem(color, key, value, expandId, timestamp) {
	if (timestamp) {
		var t = new Date().getMilliseconds();
		if (t < 10) {
			t = '00' + t;
		} else if (t < 100) {
			t = '0' + t;
		}
		value = '[' + t + '] ' + value;
	}

	var gcs = "";
	if (this.___settings.persistantParams.verbose) {
		gcs = this.gcs(true);
	}
	value = value + '';
	var item = {
		color: color || 'white',
		key: key,
		value: value + gcs,
		originalValue: value + gcs,
		repeater: 0
	};



	if (value.length > 150) {

		var truncatedValue = item.originalValue.substring(0, 150);
		truncatedValue = truncatedValue.split('&nbsp;').join('');
		truncatedValue = truncatedValue.split('\n').join('') + '...' + gcs;

		var expandcolor = 'cyan';
		if (color === expandcolor) {
			expandcolor = 'white';
		}

		item.value = '<a id="tracker-' + expandId + '_expand' + '" style="color:' + expandcolor + ';cursor:pointer">[expand]</a>&nbsp;' + truncatedValue;
		item.originalValue = '<a id="tracker-' + expandId + '_contract' + '" style="color:' + expandcolor + ';cursor:pointer">[contract]</a>&nbsp;<a id="tracker-' + expandId + '_copy' + '" style="color:' + expandcolor + ';cursor:pointer">[copy]</a><br>' + item.originalValue;
		item.value2 = item.value;
	}



	if (expandId) {
		item.expandId = expandId;
	}
	return item;
}
;
		T2.prototype.___setup = function setup(options) {

	var filter = {
		log: true,
		warn: true,
		error: true,
		fixed: true,
		event: true
			//replace: true
	};

	//filter['fixed'] = true;

	var colorMap = {
		fixed: 'cyan',
		log: 'white',
		warn: 'yellow',
		error: 'red',
		event: 'lime'
	};


	//var target = options.target || this.___createTarget(options.targetId);
	var publicApi = {
		out: this.___bind(this.out, this),
		outFixed: this.___bind(this.outFixed, this),
		outReplace: this.___bind(this.outReplace, this),
		start: this.___bind(this.___start, this),
		end: this.___bind(this.___end, this)
	};

	return {
		colorMap: colorMap,
		filter: filter,
		publicApi: publicApi
	};
}
;
		T2.prototype.___addLogs = function addLogs(logs) {
	var that = this;
	for (var log in logs) {
		var _fn = function(log) {
			return that.___bind(function() {

				function parse(pObj) {

					if (window.JSON && window.JSON.stringify) {
						try {
							pObj = window.JSON.stringify(pObj, null, '&nbsp;');
						} catch (e) {
							pObj = 'cant convert circular structure to json ! ';
						}
					}
					return pObj;
				}

				var logkey = log;
				var arr = [];


				for (var key in arguments) {
					var item = arguments[key];



					if (logkey !== 'fixed' && item.length && Object.prototype.toString.call(item) !== '[object String]') {
						var subItems = [];
						var len = item.length;
						for (var i = 0; i < len; i++) {
							var subItem = item[i];
							if (Object.prototype.toString.call(item) === '[object String]') {
								subItems.push(subItem);
							} else {
								subItems.push(parse(subItem));
							}
						}
						item = subItems.join(', ');
					} else {
						if (Object.prototype.toString.call(item) === '[object Object]') {
							item = parse(item);
						}
					}
					arr.push(item);
				}


				if (logkey === 'fixed' || logkey === 'replace') {
					var first = arr.shift() + '';
					if (!first) {
						this.outFixed(first);
						return;
					}
					first = first.split('"').join('');
					if (logkey === 'fixed') {
						this.outFixed(first, arr.join(','));
					} else {
						this.outReplace(first, arr.join(','));
					}
				} else {
					this.out(logkey, arr.join(','));
				}

			}, that);
		}(log);


		this.addToPuclibApi(log, _fn);
	}
};
;
		T2.prototype.___store = function store(write, ns, data) {
	if (!(window.sessionStorage && window.JSON)) {
		return;
	}
	var suffix = '_storage';
	if (write) {
		window.sessionStorage.setItem(ns + suffix, window.JSON.stringify(data));
	} else {
		var loadedData = window.JSON.parse(window.sessionStorage.getItem(ns + suffix));

		if (loadedData) {
			for (var key in data) {
				if (loadedData[key] === undefined) {
					loadedData = data;
					break;
				}
			}
		} else {
			loadedData = data;
		}

		return loadedData;
	}
}
; // (write, ns, data)

		T2.prototype.___templateShell = '<div class="trackerShell" style="zoom:{{zoom}}; background:rgba(0,0,0,{{alpha}}) !important;">	<div id="tracker-toolbar"></div>	<div id="tracker-outer-content-container" style="display:{{displayState}};">		{{#plugins}}			<div style="clear:both;" id="tracker-plugin-{{id}}"></div>		{{/plugins}}				<div id="tracker-expand" ></div>		<div style=" clear:both; max-height:{{maxHeight}}px; max-width:{{maxWidth}}px; " id="tracker-content">			<div id="tracker-content-input"> <input id="tracker-input" value=""><p id="tracker-input-hint"></p></div>			<div id="tracker-content-fixed" style="max-height:{{maxHeightFixed}}px;"></div>			<!--<canvas style="position:absolute;right:0px;" id="tracker-minimap" width="' + 100 + '" height="{{miniMapHeight}}"></canvas>-->			<!--<div id="tracker-content-pinned"></div>-->			<!--<p style="color:white; position: absolute; right:0px; ">[&#8679;][&hArr;][&#8681;]</p>-->			<div id="tracker-content-rolling" style="max-height:{{maxHeightRolling}}px;"></div>			<div id="tracker-content-fixed-dev"></div>			<div id="tracker-content-rolling-dev" style="max-height:{{maxHeightDev}}px;"></div>		</div>	</div></div>';
		T2.prototype.___templateFixed = '<div>	{{#fixed}}		<p class="trackerFixed" style="color:{{color}};">{{key}} : {{value}}</p>	{{/fixed}}</div>';
		T2.prototype.___templateRolling = '{{#rolling}}	<p class="trackerRolling" style="color:{{color}};">{{key}} : {{value}}</p>{{/rolling}}';
		T2.prototype.___templateRollingDev = '{{#rollingdev}}	<p class="trackerRolling" style="color:{{color}};">{{key}} : {{value}}</p>{{/rollingdev}}';
		T2.prototype.___templateToolbar = '{{#items}}	<p id="tracker-{{id}}" class="trackerP" style="color:{{color}}; cursor:pointer; margin-top:0px;margin-bottom:0px; background: black;"  title="{{tooltip}}"> [{{title}}]</p>{{/items}}';

		T2.prototype.___expandTemplate = '<div class="trackerExpand" id="tracker-expand-menu-{{hashID}}">	<div style="cursor:pointer; width:{{width}}px;">		<p class="trackerP" id="tracker-expand-hide-{{hashID}}">[toggle]</p>		<p class="trackerP" id="tracker-expand-close-{{hashID}}">[close]</p>		<p class="trackerP" id="tracker-expand-move-{{hashID}}">[move] </p> 		<p class="trackerP" > total chars: {{chars}}</p>	</div>	<div class="trackerExpandContent" id="tracker-expand-content-{{hashID}}" style="width:{{width}}px; max-height:{{height}}px;">		{{content}}	</div></div>';

		T2.prototype.___inputClearHandler = function(e) {
			//document.getElementById('tracker-input').value = "";

			this.registerTickFunction('___removeIntro');
			this.___manipulateEvents(this, [{
				id: 'input',
				event: 'click',
				handler: '___inputClearHandler'
			}], false);
		};
		T2.prototype.___inputHandlerHint = function(e) {
			var val = e.srcElement.value;

			var parts = val.split('.');
			var last = "";
			var path = val;
			if (parts.length > 1) {
				last = parts.pop();
				path = parts.join('.');
			}
			try {
				var obj = eval(path);
				var hint = "";
				for (var key in obj) {
					if (key.indexOf(last) === 0) {
						hint = key;
						break;
					}
				}


				document.getElementById('tracker-input-hint').innerHTML = hint;

			} catch (e) {
				//this.out('error', e); // silence
			}
		};
		T2.prototype.___inputHandlerExec = function(e) {

			var idx = this.readSetting('inputIndex');
			var val = e.srcElement.value;



			if (e.key === 'Enter') {


				this.out('log', 'exec: ' + val, true);
				//e.srcElement.value = "window.";
				this.readSetting('inputList').push(val);
				this.writeSetting('inputIndex', this.readSetting('inputList').length - 1);
				try {
					this.out('log', JSON.stringify(eval(val), null, '&nbsp;'), true);
				} catch (e) {
					try {
						this.out('log', eval(val), true);
					} catch (e) {
						this.out('error', e, true);
					}

				}


			} else if (e.key === 'ArrowUp') {
				if (idx > 0) {
					idx = idx - 1;
					this.writeSetting('inputIndex', idx);
				}

				e.srcElement.value = this.readSetting('inputList')[idx];

			} else if (e.key === 'ArrowDown') {
				var val2 = "";
				if (idx < this.readSetting('inputList').length - 1) {

					idx = idx + 1;
					this.writeSetting('inputIndex', idx);
					val2 = this.readSetting('inputList')[idx]
				}

				e.srcElement.value = val2;
			} else if (e.key === 'Control') {

				var parts = val.split('.');
				parts.pop();
				parts.push(document.getElementById('tracker-input-hint').innerHTML);
				e.srcElement.value = parts.join('.');
			}
		};

		T2.prototype.___logClickedHandler = function(e) {


			var key = (e.target || e.srcElement).id.split('-')[1];
			if (key) {
				var parts = key.split('_');

				var id = parseInt(parts[0], 10);
				var str = parts[1];

				var rolling = this.readSetting('rolling');
				var len = rolling.length;
				var found = false;
				for (var i = 0; i < len; i++) {
					var item = rolling[i];



					if (parseInt(item.expandId, 10) === id) {
						if (str === "expand") {
							item.value = item.originalValue;
						} else {
							item.value = item.value2;
						}
						found = true;

						break;
					}
				}
				if (found) {
					this.writeSetting('rolling_changed', true);
				} else {

					var fixed = this.readSetting('fixed');
					for (var key in fixed) {

						if (checkItem(fixed[key], id, str)) {
							found = true;
							break;
						}
					}

					if (found) {
						this.writeSetting('fixed_changed', true);
					}

				}


				function checkItem(item, id, str) {
					if (parseInt(item.expandId, 10) === id) {
						if (str === "expand") {
							item.value = item.originalValue;
						} else {
							item.value = item.value2;
						}
						return true;
					}
				}



				this.writeSetting('flagForRender', true);
			} else {
				this.internalLogger('ERROR', 'id not found for log item', 'red');

			}
		};

		T2.prototype.___toggleFilterHandler = function(e) {
			var key = (e.target || e.srcElement).id.split('-')[1];
			this.readSetting('filter', true)[key] = !this.readSetting('filter', true)[key];
			this.writeSetting('rolling_changed', true);
			this.writeSetting('flagForRender', true);
		};

		T2.prototype.___showFiltersHandler = function() {
			this.toggleSetting('showFilters', true, true);
		};
		T2.prototype.___zoomHandler = function() {
			this.toggleSetting('zoom', true);
			this.___renderShell();
		};

		T2.prototype.___consoleModeHandler = function() {

			//CONSOLE_MODE_STR : 'DEFAULT',
			//CURRENT_CONSOLE_MODE : 0
			var currMode = this.readSetting('CURRENT_CONSOLE_MODE', true);
			var consoleModes = this.readSetting('CONSOLE_MODES');

			if (currMode < consoleModes.length - 1) {
				currMode++;
			} else {
				currMode = 0;
			}
			var consoleModeStr = consoleModes[currMode];
			this.writeSetting('CURRENT_CONSOLE_MODE', currMode, true);
			this.writeSetting('CONSOLE_MODE_STR', consoleModeStr, true);

			this.___manipulateConsole();
			//this.out('log', 'console mode changed to : ' + consoleModeStr, true);
			this.___logReplacer('log', 'console mode changed to : ' + consoleModeStr, true, 'rolling', true);

			this.writeSetting('flagForRender', true);
		};

		T2.prototype.___manipulateConsole = function() {
			var consoleModeStr = this.readSetting('CONSOLE_MODE_STR', true);
			var that = this;

			function restoreNativeConsole() {
				window.console.log = that.readSetting('savedConsoleFnLog');
				window.console.warn = that.readSetting('savedConsoleFnWarn');
				window.console.error = that.readSetting('savedConsoleFnError');
			}

			switch (consoleModeStr) {
				case 'CONSOLE_TO_TRACKER':
					window.console.log = window[this.___settings.GNS].log;
					window.console.error = window[this.___settings.GNS].error;
					window.console.warn = window[this.___settings.GNS].warn;
					break;
				case 'TRACKER_TO_CONSOLE':
					restoreNativeConsole();


					break;
				case 'DEFAULT':


					break;
			}


		};



		T2.prototype.___verboseHandler = function() {
			this.toggleSetting('verbose', true, true);
		};

		T2.prototype.___minimizeHandler = function() {
			this.toggleSetting('minimized', true, true);

			var dstate = 'block';
			if (this.readSetting('minimized', true)) {
				dstate = 'none';
			}
			document.getElementById('tracker-outer-content-container').style.display = dstate;

			//window.document.getElementById('tracker-outer-content-container').
			/*this.___renderShell();
			this.writeSetting('fixed_changed', true);
			this.writeSetting('rolling_changed', true);
			this.___render();*/
		};

		T2.prototype.___metricsHandler = function() {
			var that = this;
			window.utag.track = tracker.log;
		};

		T2.prototype.___clearHandler = function() {
			this.writeSetting('fixed', {});
			//this.writeSetting('rolling', []);
			this.writeSetting('rollingDev', []);
			this.writeSetting('rollingDevHash', {});

			this.writeSetting('fixed_changed', true);
			this.writeSetting('rolling_changed', true);
			this.writeSetting('flagForRender', true);
			this.writeSetting('flagForRenderDev', true);


			this.registerTickFunction('____clearTickFn');
		};

		T2.prototype.____clearTickFn = function() {
			var rolling = this.readSetting('rolling');

			if (rolling.length > 15) {
				this.writeSetting('rolling', rolling.slice(0, parseInt(rolling.length * 0.75, 10)));
			} else {
				rolling.pop();
			}


			this.writeSetting('rolling_changed', true);
			this.writeSetting('flagForRender', true);
			//this.writeSetting('rolling_scroll_to_bottom', true);

			if (rolling.length < 1) {
				this.unregisterTickFunction('____clearTickFn');
			}
		}

		T2.prototype.___devPauseHandler = function() {
			this.toggleSetting('devPause', false, true);
		};

		T2.prototype.___pauseHandler = function() {
			this.toggleSetting('paused', true, true);
		};

		T2.prototype.___moveMainHandler = function(ev) {
			var target = document.getElementById('tracker-gen-id');

			var startX = parseInt(target.style.left, 10);
			var startY = parseInt(target.style.top, 10);
			var startXT = ev.clientX;
			var startYT = ev.clientY;


			var newLeft = 0;
			var newRight = 0;

			var that = this;
			this.___manipulateEvents(null, [{
				event: 'mousemove',
				id: '!window',
				handler: function moveHandler(ev) {
					newLeft = Math.max(0, parseInt(startX, 10) + (ev.clientX - startXT));
					newTop = Math.max(0, parseInt(startY, 10) + (ev.clientY - startYT));
					target.style.left = newLeft + 'px';
					target.style.top = newTop + 'px';
				}
			}, {
				event: 'mouseup',
				id: '!window',
				handler: function() {

					that.writeSetting('positionx', newLeft, true);
					that.writeSetting('positiony', newTop, true);

					that.___manipulateEvents(null, [{
						event: 'mouseup',
						id: '!window'
					}, {
						event: 'mousemove',
						id: '!window'
					}], false)
				}
			}], true);
		};


		T2.prototype.___createCSS = function() {
			this.internalOut('adding', 'CSS', 'white');
			var css = '.trackerP { 	font-size:12px !important;	max-width:inherit !important;	font-family:monospace !important; 	float:left !important; }.trackerShell { 	margin:1px !important; 	font-family:monospace !important; 	background: black !important;		font-size:12px !important; 	color:white !important; }.trackerFixed { 	min-width:100% !important; 	line-height:0.95 !important; 	font-size:12px !important; 	font-family:monospace !important; 	margin:1px !important; }.trackerRolling { 	line-height:0.95 !important; 	font-size:12px !important; 	max-width:inherit !important; 	margin:1px !important; 	font-family:monospace !important; }#tracker-content-rolling-dev {	border-top : 1px solid gray !important;	background: black !important;	max-height: 200px !important;	overflow-y: scroll !important;	overflow-x: hidden !important;}#tracker-content-fixed {	background: black !important;	overflow-y: scroll !important;	overflow-x: hidden !important;	max-height: 500px !important;	border-bottom: 1px solid gray !important;}#tracker-content-fixed::-webkit-scrollbar {    width: 4px !important;}#tracker-content-fixed::-webkit-scrollbar-thumb {    background: gray !important;    }#tracker-content-rolling {	max-height: inherit !important;	overflow-y: scroll !important;	overflow-x: hidden !important;	background: black !important;}#tracker-content-rolling-dev::-webkit-scrollbar {    width: 4px !important;}#tracker-content-rolling-dev::-webkit-scrollbar-thumb {    background: gray !important;    }#tracker-content-rolling::-webkit-scrollbar-track {   }#tracker-content-rolling::-webkit-scrollbar {    width: 4px !important;}#tracker-content-rolling::-webkit-scrollbar-thumb {    background: gray !important;    }#tracker-content-input {	background: black !important;	height: 17px !important;	border-bottom: 1px solid gray !important;	border-top: 1px solid gray !important;}#tracker-input {	float: left !important;	width: 70% !important;	margin-left: 20px !important;	border: none !important;	background: black !important;	color:lime !important;	margin: 0 !important;	height: 15px !important;	padding: 0 !important;	border-right: 1px solid gray !important;	font-family:monospace !important; 	font-size:12px !important; }#tracker-input:focus {	 outline: none !important;}#tracker-input-hint {	float:left !important;	max-height: 15px !important;	overflow: hidden !important;	font-family:monospace !important; 	width: 25% !important;	margin: 0 !important;	padding: 0 !important;	margin-left: 2px !important;	background: black !important;	color:yellow !important;	font-size:12px !important; 	line-height: 15px !important;}.trackerExpand { 	top:0px !important; 	background-color:darkslategrey !important; 	position:absolute !important; 	height:18px !important; }.trackerExpandContent { 	overflow-y:scroll !important; 	position:absolute !important; 	height:auto !important; 	background:rgba(0,0,0,0.8) !important; 	border:1px solid white !important; 	line-height:0.95 !important; 	font-size:12px !important; 	margin-top:17px !important; }';
			var style = document.createElement('style');
			style.type = 'text/css';
			style.innerHTML = css;
			document.getElementsByTagName('head')[0].appendChild(style);
		};

		T2.prototype.___createTarget = function(target) {
			//this.internalOut('target', 'created', 'white'); // to early
			var container = null;
			if (target) {
				container = window.document.getElementById(target);
				if (!container) {
					return this.___createTarget();

				}
			} else {
				container = window.document.createElement('div');
				window.document.body.appendChild(container);
				container.id = 'tracker-gen-id';
			}

			container.style.position = 'fixed';
			container.style.top = 0;
			container.style.left = 0;
			container.style['text-align'] = 'left';
			container.style['z-index'] = 90000000;
			container.style['word-wrap'] = 'break-word';

			return container;
		};


		T2.prototype.___renderHTML = function(template, data) {

			var templateCache = this.___settings.templateCache;

			var fn = {};
			if (!templateCache[template]) {
				fn = this.___ink(template);
				templateCache[template] = fn;
			} else {
				fn = templateCache[template];
			}
			var html = fn(data);


			//TODO: needed? 
			html = html.split('\n').join('<br>');
			html = html.split('_space').join('&nbsp;');

			return html;
		};


		T2.prototype.addToPuclibApi = function(name, fn) {
			window[this.___settings.GNS][name] = this.___bind(fn, this);
		};


		T2.prototype.setup = function(options) {

			this.___addItemsInObj(options.colorMap, this.readSetting('colorMap'));
			this.___addItemsInObj(options.filter, this.readSetting('filter', true));

			this.___addLogs(options.filter);
			this.___renderShell();

		};

		T2.prototype.___addItemsInObj = function(from, to) {
			if (from) {
				for (var key in from) {
					to[key] = from[key];
				}
			}
		};


		T2.prototype.___helpHandler = function() {

			var shellData = this.___createShellData(this.___getShellParams()).items;
			var len = shellData.length;
			var rolling = this.readSetting('rolling');
			var head = this.___makeLogItem('red', ' ', '________________________ HELP ___________________');
			head.force = true;
			rolling.push(head);
			for (var i = 0; i < len; i++) {
				var item = shellData[i];
				var logItem = this.___makeLogItem(item.color, ' ', '[' + item.title + '] - ' + item.tooltip);

				logItem.force = true;
				rolling.push(logItem);
			}

			this.writeSetting('rolling_changed', true);
			this.writeSetting('rolling_scroll_to_bottom', true);
			this.writeSetting('flagForRender', true);
		};
		T2.prototype.___getGenId = function() {
			var id = this.___settings.genIdIndex++;
			return id;

		};
		T2.prototype.___logReplacer = function(log, args, increment, list, force) {
			if (!force && (this.readSetting('paused', true) || (increment && !this.readSetting('filter', true)[log]))) {
				return;
			}

			var rolling = this.readSetting(list);
			var color = this.readSetting('colorMap')[log] || 'white';



			var logItem = this.___makeLogItem(color, log, args, this.___getGenId());
			logItem.force = force;


			var lastLogItem = rolling[rolling.length - 1];

			var found = false;

			if (increment) {
				if (lastLogItem && lastLogItem.key === logItem.key && lastLogItem.originalValue === logItem.originalValue) {
					lastLogItem.repeater++;
					lastLogItem.value = lastLogItem.originalValue + " (" + lastLogItem.repeater + ")";
					found = true;


				}
			} else {
				var rollingLength = rolling.length;
				for (var i = 0; i < rollingLength; i++) {
					var oldLogItem = rolling[i];
					if (oldLogItem.key === logItem.key /*&& oldLogItem.originalValue === logItem.originalValue*/ ) {
						oldLogItem.value = logItem.value;
						found = true;
						break;
					}
				}
			}

			if (!found) {
				rolling.push(logItem);
				if (rolling.length > 100) {
					rolling.shift();
				}
			}


			this.writeSetting('rolling_scroll_to_bottom', true);
			this.writeSetting(list + '_changed', true);
			this.writeSetting('flagForRender', true);
		}
		T2.prototype.out = function(log, args, force) {
			if (this.readSetting('CONSOLE_MODE_STR', true) === 'TRACKER_TO_CONSOLE') {
				this.outConsole(log, args, force);
			} else {
				this.___logReplacer(log, args, true, 'rolling', force);
			}
		};

		T2.prototype.outConsole = function(log, args, force) {
			if ((!this.readSetting('paused', true) && this.readSetting('filter', true)[log]) || force) {
				if (window.console[log]) {
					window.console[log](args);
				} else {
					window.console.log(args);
				}
			}

		}

		T2.prototype.outFixed = function(log, args, force) {
			if (this.readSetting('CONSOLE_MODE_STR', true) === 'TRACKER_TO_CONSOLE') {
				this.outConsole(log, args, force);
			} else if ((!this.readSetting('paused', true) && this.readSetting('filter', true).fixed) || force) {
				this.readSetting('fixed')[log] = this.___makeLogItem('cyan', log, args, this.___getGenId());
				this.writeSetting('fixed_changed', true);
				this.writeSetting('flagForRender', true);
			}
		};
		T2.prototype.outReplace = function(log, args) {
			//window.console.log("outReplace", arguments);
			this.___logReplacer(log, args, false, 'rolling');
		};



		T2.prototype.start = function(key, val) {
			this.outFixed(key, val);

			this.___start(key);

			this.registerTickFunction(key, function() {
				this.outFixed(key, val + " " + this.___loadVisB() + " " + this.___end(key) + " s");
			});

			window.console.log("start", arguments);
		};
		T2.prototype.end = function(key, val) {
			window.console.log("end", this);

			this.unregisterTickFunction(key);

			var time = this.___end(key);

			this.outFixed(key, val + " " + time + " s");
		};



		T2.prototype.internalErrorMap = {
			read: {},
			write: {}
		};
		/*
			global setter for settings obj
		*/
		T2.prototype.writeSetting = function(key, value, persistant) {
			if (this.___settings.params.devMode) {
				this.internalData.writeCalls++;
				this.internalOut('write', key + ':' + value, 'red');
				if (persistant) {
					if (this.___settings.persistantParams[key] === undefined) {
						if (!this.internalErrorMap[key + 'pw']) {
							this.internalErrorMap[key + 'pw'] = true;
							this.out('error', 'key not present: ' + key + ' (persistant)', true);

						}
					}
				} else {
					if (this.___settings.params[key] === undefined) {
						if (!this.internalErrorMap[key + 'w']) {
							this.internalErrorMap[key + 'w'] = true;
							this.out('error', 'key not present: ' + key, true);

						}
					}
				}
			}

			if (persistant) {
				this.___settings.persistantParams[key] = value;
			} else {
				this.___settings.params[key] = value;
			}
			//this.internalStorageLogger(key, value, persistant, true);

		};

		/*
			global getter for settings obj
		*/

		T2.prototype.readSetting = function(key, persistant) {

			if (this.___settings.params.devMode) {
				this.internalData.readCalls++;
				this.internalOut('read', key, 'lime');


				//this.internalStorageLogger(key, null, persistant, false);

				if (persistant) {
					if (this.___settings.persistantParams[key] === undefined) {

						if (!this.internalErrorMap[key + 'pr']) {
							this.internalErrorMap[key + 'pr'] = true;
							this.out('error', 'key not present: ' + key + ' (persistant)', true);

						}
					}
				} else if (this.___settings.params[key] === undefined) {

					if (!this.internalErrorMap[key + 'r']) {

						this.internalErrorMap[key + 'r'] = true;
						this.out('error', 'key not present: ' + key, true);

					}
				}
			}


			if (persistant) {
				return this.___settings.persistantParams[key];
			}
			return this.___settings.params[key];
		};


		T2.prototype.createInternalSummary = function(time) {
			this.internalOut('______________________summary_______________________', ' ', null, true)
			this.internalOut('- status', 'ticks: ' + this.internalData.ticks + ' renders: ' + this.internalData.renders, null, true);
			this.internalOut('- render time', time + ' ms', 'orange', true);
			this.internalOut('- reads', this.internalData.readCalls, null, true);
			this.internalOut('- write', this.internalData.writeCalls, null, true);
		}

		T2.prototype.gcs = function(raw) {
			var err = new Error('');



			var z = err.stack.toString() + "";
			/*var reg = /Object[\w\,\<\>\_\.]+/igm;
			reg = new RegExp(reg);
			var errStack = z.match(reg);*/

			var errStack = z.split('at ');
			errStack = errStack.slice(1, errStack.length);

			var errMsg = "";
			var len = errStack.length;
			var space_key = "&nbsp;"
			var spaces = "";
			for (var i = 0; i < len; i++) {
				spaces += '___';
				errMsg += "\n" + '&nbsp;|' + spaces + "&nbsp;" + errStack[i].split(' ')[0].split('Object.').join('').split('<anonymous>').join('anon');
			}

			if (raw) {
				errMsg += "\n" + z.split('Error')[1];

			}
			return errMsg + "\n" + space_key;

		};

		T2.prototype.internalOut = function(key, value, color, noStack) {

			if (this.___settings.params.devPause) {
				return;
			}

			key = this.___stringFormatFloat((new Date().getTime() - this.___settings.bootTimeStamp) * 0.001, 3) + ': ' + key;


			if (!noStack && this.___settings.persistantParams.verbose) {
				value = value + this.gcs();
			}


			//var item = this.___makeLogItem(color || 'lime', key, value, this.___getGenId());
			var item = {
				key: key,
				value: value,
				color: color || 'lime'
			};

			var devList = this.___settings.params.rollingDev;
			devList.push(item);


			if (devList.length > 400) {
				this.___settings.params.rollingDev = devList.slice(200, 400);
			}

			this.___settings.params.flagForRenderDev = true;

			//	this.___settings.params.flagForRender = true;
		}
		T2.prototype.internalLogger = function(key, item) {

			var rollingDev = this.___settings.params.rollingDev;
			var rollingDevHash = this.___settings.params.rollingDevHash;
			if (!rollingDevHash[key]) {

				//console.log(keyStr);
				rollingDev.push(item);

				if (rollingDev.length > 20) {
					rollingDev.shift();
				}
				var hash = {};
				var len = rollingDev.length;
				for (var i = 0; i < len; i++) {
					hash[rollingDev[i].key] = rollingDev[i];

				}

				//console.log(hash);
				this.___settings.params.rollingDevHash = hash;


			} else {
				rollingDevHash[key] = item;
			}

			this.___settings.params.flagForRender = true;
		};

		T2.prototype.internalStorageLogger = function(key, value, persistant, write) {



			if (this.___settings.dev) {
				var color = write ? 'orange' : 'lime';
				var keyStr = (write ? 'WRITE: ' : 'READ: ') + key;

				if (!write) {
					if (!persistant) {
						value = this.___settings.params[key];
					} else {
						value = this.___settings.persistantParams[key];
					}
				}


				var originalValue = JSON.stringify(value, null, '&nbsp;') + "";
				value = originalValue.substring(0, 100);
				if (originalValue.length > value.length) {
					value += '...';
				}
				//value = (write ? 'WRITE: ' : 'READ: ') + value;

				var item = {
					color: color,
					key: keyStr,
					value: value,
					originalValue: originalValue
				};

				this.internalLogger(keyStr, item);



			}
		}

		T2.prototype.toggleSetting = function(key, persistant, flagForRender) {
			//console.log('toggle', key, this.readSetting(key, persistant));
			this.writeSetting(key, !this.readSetting(key, persistant), persistant);
			if (flagForRender) {
				this.writeSetting('flagForRender', true);
			}
		}


		/*
			get data attribute from script tag
		*/
		T2.prototype.getDataAttribute = function(attrName) {
			var tag = window.document.querySelector('script[data-tracker-' + attrName + ']');
			if (tag) {
				return tag.getAttribute('data-tracker-' + attrName);
			}
		};


		/*
			bind scope on function
		*/
		T2.prototype.___bind = function(func, scope) {
			if (!scope) {
				return func;
			}
			return function _bind() {
				return func.apply(scope, arguments);
			};
		};


		T2.prototype.___manipulateEvents = function(scope, data, add) {

			var eventHandlerHash = this.readSetting('eventHandlerHash');
			var that = this;
			for (var key in data) {
				var item = data[key];

				//console.log('adding event', item);

				if (add) {
					addEvent(scope, item.event, item.id, item.handler);
				} else {
					removeEvent(item.event, item.id);
				}



			}

			function addEvent(scope, event, id, _handler) {

				var handler = scope ? that.___bind(scope[_handler], scope) : _handler;
				eventHandlerHash[id + event] = handler;
				var target = getEventTarget(id);

				that.internalOut('event add', event + ' ' + id, 'white');

				if (target) {
					//event = this.___conformEvent(event);

					if (target.addEventListener) {
						target.addEventListener(event, handler);
					} else if (target.attachEvent) {
						target.attachEvent(event, handler);
					}
				}
			}


			function removeEvent(event, id) {

				that.internalOut('event remove', event + ' ' + id, 'white');
				var target = getEventTarget(id);
				if (target) {
					//event = this.___conformEvent(event);
					if (target.removeEventListener) {
						target.removeEventListener(event, eventHandlerHash[id + event]);
					} else if (target.detachEvent) {
						if (typeof eventHandlerHash[id + event] === 'function') {
							target.detachEvent(event, eventHandlerHash[id + event]);
						}
					}
				}
			}

			function getEventTarget(id) {
				if (id && id.indexOf('!') === 0) {
					return window[id.split('!').join('')];
				} else {
					return window.document.getElementById('tracker-' + id);
				}
			}
		};

		T2.prototype.ajaxDetector = function() {
			var proxied = window.XMLHttpRequest.prototype.send;
			window.XMLHttpRequest.prototype.send = function() {
				console.log(arguments);
				//Here is where you can add any code to process the request. 
				//If you want to pass the Ajax request object, pass the 'pointer' below
				var pointer = this
				var intervalId = window.setInterval(function() {
					if (pointer.readyState != 4) {
						return;
					}
					console.log(pointer.responseText);
					//Here is where you can add any code to process the response.
					//If you want to pass the Ajax request object, pass the 'pointer' below
					clearInterval(intervalId);

				}, 1); //I found a delay of 1 to be sufficient, modify it as you need.
				return proxied.apply(this, [].slice.call(arguments));
			};
		};



		return T2;
	};



	if (window.define) {
		window.define([], instance);
	} else {
		var tf = instance();
		tf.apply(tf.prototype);

	}

})();
