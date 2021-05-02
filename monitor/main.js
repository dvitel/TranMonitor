const os = require("os");
const puppeteer = require('puppeteer');
const u = require('./utils');
const steps = require("./steps");
const { monitorSettings } = require("./package.json"); //global monitor settings

function getArgs() {
	var args = {
		args: ['--incognito', '--disable-gpu', '--disable-dev-shm-usage']
	};
	let platform = os.platform();
	let isWin = (platform === 'win32' || platform === 'win64');
	var user = "";
	try {
		user = os.userInfo().username;
	} catch (e) {
		user = "";
	} //ignoring: {"errno":-4058,"code":"ENOENT","syscall":"uv_os_get_passwd"}

	if (user === 'root' && !isWin) {
		args.args.push('--no-sandbox');
	}
	if (!!process.env.CHROMIUM_P)  {
		args.executablePath = process.env.CHROMIUM_P;
	}
	args.ignoreHTTPSErrors = true;
	if (process.argv.includes("--with-head") || monitorSettings.withHead) {
		args.headless = false;
	}
	return args;
}

function getEmptyContext() {
	return {
		browser: null,
		page: null, //current active page
		pages: [], //stack of previous pages
		//TODO: add stack of pages 		
		jquery: '', //as engine to query DOM
		http: { //http requests
			req: [] //we put here http requests with added timestamps, reesponses could be get from request.response(), response is also annotated with timestamp
		},
		vars: {}, //bound vars - initially empty  //validate, query, bind 
		console: {},
		// cookies: {}, - inside page
		events: {}, //
		stats: {
			doneSteps: [],
			retries: {}
		},				
		allocTime: u.trackTime(monitorSettings.globalTransactionTimeoutMs), //time tracker for step timeouts
		//this is stack of transactions, main transaction sequence has index 0 
		trans: [], //we execute current set of steps - it is changed on fallback or merge
		// mainTran: [], //original steps
		// step: null, //current step of tran
	}; //we add info to context 
}

//here we setup all handlers for events to collect web context and switch windows.
async function setPageHandlers(page, context, options) {
	//TODO: check that setPageHandlers was not called for page before  
	if (page.monitorHandlersSet) return;
	let viewport = {};
	viewport.width = options.swidth || 1024;
	viewport.height = options.sheight || 768;
	viewport.isMobile = false;
	await page.setViewport(viewport);

	await page.setUserAgent(monitorSettings.userAgent);
	// await page.evaluateOnNewDocument(context.jquery);
	// await page.evaluateOnNewDocument(async () => {
	// 	window._$_ = jQuery.noConflict();
	// 	console.log(window._$_);
	// });

	//Vue and React ... they have some time to process templates after load event - so cooldown is important
	page.on("load", async () => { //ES6 - ideas of module <script type="module"></script>
		await page.evaluate(context.jquery); //NOTE: here could be race conditions just in between of two evaluates we can have new jquery imported 
		await page.evaluate(async () => {
			window._$_ = jQuery.noConflict();
			console.log(window._$_);
		});
	});

	// await context.page.addScriptTag({ content: context.jquery  }) //we need to use module to avoid, type: "module" //https://stackoverflow.com/questions/43817297/inlining-ecmascript-modules-in-html
	// // //NOTE: race conditions between browser and monitor here: other Jquery could be loaded just after our one. 
	// await context.page.evaluate(async () => {
	// 	window._$_ = jQuery.noConflict(); //we hope that this is our jQuery - better way to do with modules but it is not easy: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules
	// 	// const { $ } = await import("https://code.jquery.com/jquery-3.6.0.min.js"); //this can take time
	// 	// window._$_ = $; //our known jquery  
	// });


	page.on("popup", async newPage => { //other page became in front - we just change context 
		console.logd("New window appears");
		await setPageHandlers(newPage, context, options);
		context.pages.push(context.page);
		context.page = newPage;
		//TODO: stack of pages 
	})		

	page.on("close", () => {
		console.logd("Closing page");
		context.page = context.pages.pop(); //NOTE: we need to check logic that correct window becomes active
	})

	page.on("console", (msg) => {
		let msgType = msg.type(); 
		context.console[msgType] = context.console[msgType] || [];
		context.console[msgType].push(msg);
	});



	await page.setRequestInterception(true); //we skip some requests 		

	const skipExtentions = ['jpg', 'jpeg', 'webp', 'gif', 'mp3', 'wav', 'png', 'tiff', 'bmp', 'jp2', 'wav', 'aac', 'flac', 'aud', 'mid', 'midi'].map( e=> e.toUpperCase());
	function needSkip(request) {
		let url = request.url().toUpperCase();
		let finded = skipExtentions.find( e => {
			return url.endsWith("." + e);
		});
		return finded;
	}

	page.on('request', req => { //options.notSkipMediaFiles
		if (!options.notSkipMediaFiles && needSkip(req) ) {
			req.abort();
		}
		else {
			req.continue();
		}

		req.startedAt = Date.now();
		context.http.req.push(req);
	});

	page.on("requestfinished", req => {
		var foundReq = context.http.req.find(r => r == req);
		if (!foundReq) {
			console.logd("different object in requestfinished and request");
		} else {
			foundReq.doneAt = Date.now();
		}
	})

	page.on("requestfailed", req => {
		var foundReq = context.http.req.find(r => r == req);
		if (!foundReq) {
			console.logd("different object in requestfinished and request");
		} else {
			foundReq.failedAt = Date.now();
		}
	})

	page.monitorHandlersSet = true;
}

//NOTE: first transaction step should be goto 
//   options.url is not used - has not meaning for this plugin 

//See for simple API: https://pptr.dev
//See for internals: https://chromedevtools.github.io/devtools-protocol/tot/Network/
async function run (options) { //creating async scope
	// console.log(puppeteer.devices);
	// console.log(puppeteer.executablePath());
	// const browser = await puppeteer.launch({
	// 	headless: false
	// });
	// const page = await browser.newPage();
	// await page.goto("https://www.host-tracker.com", { timeout: 10000 });
	// await browser.close();
	var args = getArgs();
	if (options.headless != null)
		args.headless = options.headless;
	var context = getEmptyContext();
	context.jquery = await u.rethrow(u.readFile("/jquery-3.6.0.min.js"), `No jquery found to inject. Context failed to init`);

	//global transaction timeout
	await u.timed(monitorSettings.globalTransactionTimeoutMs, async () => {
		try {
			await u.rethrow(async () => {
				context.browser = await puppeteer.launch(args);
				context.page = await context.browser.newPage();
				await setPageHandlers(context.page, context, options);
			}, "Cannot launch browser. Context failed to init");
			
			await steps.tran(context, { tran: options.tran });

			console.log({ error: null }); //TODO: statistics of tran execution
		} finally {
			try {
				if (context.browser) await context.browser.close();
			} catch (e) {} //ignore close errors
		}
	});

}

console.logd("Starting transaction monitor in debug mode");

(async function () {
	let readJsonLine = u.createStreamJsonReadliner(process.stdin);
	while (true) {
		try {
			let options = await readJsonLine();
			await run(options);
		} catch (e) {
			if (e instanceof u.PolicyError) {
				console.error({error: "TransactionPolicyViolation", msg: e.message, step: e.step, policy: e.policy})
			}
			else if (e instanceof u.TimeoutError) {
				console.error({error: "TransactionTimeout"})
			} else {
				console.error({error: "Error", msg: e.message, original: e.original ? e.original.message : null })
			}
		}
	}
}) ();