'use strict';

const express = require('express');
const fetch = require('node-fetch');
const findFreePorts = require('find-free-ports');
const dns = require('dns');
const util = require('util');
const resolveSrv = util.promisify(dns.resolveSrv);
const app = express();
let port;
let dev = true;

const radio = {
	stations: null,
	countries: null,
	
	async init() {
		let baseUrls = await resolveSrv("_api._tcp.radio-browser.info");
		let APIurl = `https://${baseUrls[Math.floor(Math.random() * baseUrls.length)].name}`;
		let fetchData = await fetch(`${APIurl}/json/stations`);
		radio.stations = await fetchData.json();
		
		fetchData = await fetch(`${APIurl}/json/countries`);
		radio.countries = await fetchData.json();
	}
};

(async () => {
	await radio.init();
	port = await findFreePorts(1);
	port = port[0];
	
	if (dev === true) {
		port = 3000;
	}
	
	app.get('/news', async (req, res) => {
		res.setHeader('Access-Control-Allow-Origin', '*');
		let fetchData = await fetch(`https://www.stuff.co.nz/rss`);
		let rssText = await fetchData.text();
		res.type('text').send(rssText);
	});
	
	app.get('/radioStations', async (req, res) => {
		res.setHeader('Access-Control-Allow-Origin', '*');
		res.json(radio.stations);
	});
	
	app.get('/radioCountries', async (req, res) => {
		res.setHeader('Access-Control-Allow-Origin', '*');
		res.json(radio.countries);
	});
	
	app.get('/', (req, res) => {
		res.setHeader('Access-Control-Allow-Origin', '*');
		res.status(404).json('Not found');
	});
	
	app.listen(port, () => {
		console.log(`Server started on port ${port}`);
	});
})();