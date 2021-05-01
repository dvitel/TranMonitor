const os = require('os');
const fs = require('fs');
const utils = require('./utils');

//----------------------------------------------------------------


async function detectCloudFlare(page) {
	try {
		let content = await page.content();
		let detect1 = content.search('class="cf-browser-verification cf-im-under-attack"') > 0;
		//await page.$('div .cf-im-under-attack') != null;
		let detect2 = content.search('protection by Cloudflare') > 0;
		let detect3 = content.search('<a href="https:\/\/www\.cloudflare\.com') > 0;
		let rating = 0;
		rating += detect1 ? 1 : 0;
		rating += detect2 ? 1 : 0;
		rating += detect3 ? 1 : 0;
		return rating >= 2;  
	}
	catch(e) {
		return false;
	}
}
//----------------------------------------------------------------

async function wait4CloudFlare(page, timeout) {
	let beginTickCount = +new Date;
	let cfDetected = true;
	while(cfDetected) {
		console.logd('-------- cloudflare detected --------------------');
		if (timeFrom(beginTickCount) > timeout) {
			throw new utils.timeoutError('Timeout');
		}
		await utils.sleep(500);
		cfDetected = await detectCloudFlare(page);
	}
}
//----------------------------------------------------------------

async function removeTempFiles() {
    let platform = os.platform();
	let isWin = (platform === 'win32' || platform === 'win64');
	if (isWin)
		return;
	let path = '/tmp';
	try {
		let regexp = new RegExp("(puppeteer.*)", "i");
		fs.readdir(path, (err, files) => {
			if (err)
				return;
			files = files.filter( f => regexp.test(f));
			for (let i=0; i<files.length; i++) {
				let file = files[i];
				fs.rmdir(path + '/' + file, {recursive : true}, (err) => {
					//nothing
				});
			}
			//console.log(files);
		});
	}
	catch(e) {
		//?
	}
}

function startRemoveTempFiles() {
	let timer = setInterval(
		removeTempFiles, 
		30 * 60 * 1000
	);
	timer.unref();
}

module.exports.detectCloudFlare = detectCloudFlare;
module.exports.wait4CloudFlare = wait4CloudFlare;
module.exports.startRemoveTempFiles = startRemoveTempFiles;
