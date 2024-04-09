'use strict';

const index = {
	pageInner: document.querySelector('.pageInner'),
	countrySelect: document.querySelector('.countrySelect'),
	countriesDisplay: document.querySelector('.countries'),
	stationsDisplay: document.querySelector('.stations'),
	audio: document.querySelector('audio'),
	playPauseButton: document.querySelector('.playPause'),
	previousButton: document.querySelector('.previous'),
	nextButton: document.querySelector('.next'),
	loading: document.querySelector('.loading'),
	favoriteButton: document.querySelector('.favoriteButton'),
	homeButton: document.querySelector('.homeButton'),
	favoritesDisplay: document.querySelector('.favorites'),
	stations: null,
	countries: null,
	countryStations: null,
	currentStationIndex: null,
	playingAudio: false,
	scrollBusy: false,
	loadedStationAmount: 0,
	maxLoadedStations: 10,
	favoriteStationIds: [],
	playingStation: null,
	currentCountry: null,
	favoriteStations: null,
	serverUrl: 'https://server.kristianbenko.com',
	
	async init() {
		if (!/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) && (window.innerWidth >= window.innerHeight)) {
			index.pageInner.classList.add('bigScreen');
		}
		
		index.favoriteStationIds = JSON.parse(localStorage.getItem('favoriteStations')) || [];
		let fetchData = await fetch(`${index.serverUrl}/radioStations`);
		index.stations = await fetchData.json();
		await index.displayCountries();
		index.displayFavorites();
		listener.add(index.countrySelect, 'click', index.toggleCountrySelect);
		listener.add(index.playPauseButton, 'click', index.playPause);
		listener.add(index.audio, 'error', () => {
			index.playPause(false);
			
			if (index.currentStationIndex > -1) {
				index.countryStations[index.currentStationIndex].el.classList.remove('selected');
				index.countryStations[index.currentStationIndex].el.classList.add('error');
			}
		});
		listener.add(index.previousButton, 'click', index.previousStation);
		listener.add(index.nextButton, 'click', index.nextStation);
		listener.add(index.favoriteButton, 'click', index.favoriteClicked);
		listener.add(index.homeButton, 'click', index.homeClicked);
		index.toggleLoading(false);
	},
	
	homeClicked() {
		index.countryStations = null;
		index.loadedStationAmount = 0;
		index.currentStationIndex = null;
		index.currentCountry = null;
		index.toggleCountrySelect(false);
		index.countrySelect.querySelector('.display span').innerHTML = 'Select country...';
		index.stationsDisplay.scrollTop = 0;
		index.stationsDisplay.innerHTML = '';
		index.favoriteButton.innerHTML = `<i class="fa-light fa-heart"></i>`;
		index.favoritesDisplay.style.display = 'block';
		index.stationsDisplay.style.display = 'none';
		index.currentStationIndex = -1;
		index.playPause(false);
		index.audio.setAttribute('src', '');
	},
	
	favoriteClicked() {
		if (index.playingStation === null) {
			return;
		}
		
		if (index.favoriteStationIds.includes(index.playingStation.stationuuid)) {
			if (confirm('Remove from favorites?')) {
				index.favoriteStationIds.splice(index.favoriteStationIds.indexOf(index.playingStation.stationuuid), 1);
				let stationEl = index.favoritesDisplay.querySelector(`.station[stationuuid="${index.playingStation.stationuuid}"]`);
				index.favoritesDisplay.removeChild(stationEl);
				
				if (index.favoritesDisplay.querySelectorAll('.station').length < 1) {
					index.favoritesDisplay.appendChild(strToEl(`
						<div class="favoritesPlaceholder">
							<i class="fa-light fa-signal-stream-slash"></i>
							<span>No favorite stations</span>
						</div>
					`));
				}
			} else {
				return;
			}
		} else {
			index.favoriteStationIds.push(index.playingStation.stationuuid);
		}
		
		if (index.favoriteStationIds.includes(index.playingStation.stationuuid)) {
			index.favoriteButton.innerHTML = `<i class="fa-solid fa-heart"></i>`;
		} else {
			index.favoriteButton.innerHTML = `<i class="fa-light fa-heart"></i>`;
		}
		
		index.favoriteStations = index.stations.filter(station => index.favoriteStationIds.includes(station.stationuuid));
		index.favoriteStations.sort((a, b) => a.name.localeCompare(b.name));
		index.displayFavorites();
		localStorage.setItem('favoriteStations', JSON.stringify(index.favoriteStationIds));
	},
	
	displayFavorites() {
		index.favoriteStations = index.stations.filter(station => index.favoriteStationIds.includes(station.stationuuid));
		index.favoriteStations.sort((a, b) => a.name.localeCompare(b.name));
		index.favoritesDisplay.innerHTML = '';
		
		if (index.favoriteStationIds.length > 0) {
			let el, icon;
			let counter = 0;
			index.favoritesDisplay.appendChild(strToEl(`
				<div class="favoritesTitle">
					<i class="fa-solid fa-heart"></i>
					<span>Favorite stations</span>
				</div>
			`));
			
			for (let station of index.favoriteStations) {
				station.index = counter;
				counter++;
				icon = '';
				
				if (station.favicon === '') {
					icon = '<i class="fa-regular fa-radio"></i>';
				} else {
					icon = `<img src="${station.favicon}"/>`;
				}
				
				el = strToEl(`
					<div class="station" stationuuid="${station.stationuuid}" title="Play this station">
						<div class="icon">
							${icon}
						</div>
						<div class="name">
							<img src="https://www.worldatlas.com/r/w300/img/flag/${station.countrycode.toLowerCase()}-flag.jpg"/>
							<span>${station.name}</span>
						</div>
					</div>
				`);
				
				station.el = el;
				
				if (station.favicon !== '') {
					listener.add(el.querySelector('.icon img'), 'error', (e) => {
						e.currentTarget.replaceWith(strToEl(`
							<i class="fa-regular fa-radio"></i>
						`));
					});
				}
				
				listener.add(el, 'click', (e) => {
					index.playPause(false);
					
					for (let station of document.querySelectorAll('.station')) {
						station.classList.remove('selected');
						station.classList.remove('error');
					}
					
					e.currentTarget.classList.add('selected');
					let stationId = e.currentTarget.getAttribute('stationuuid');
					index.playingStation = index.stations.filter(station => station.stationuuid === stationId)[0];
					
					if (index.favoriteStationIds.includes(index.playingStation.stationuuid)) {
						index.favoriteButton.innerHTML = `<i class="fa-solid fa-heart"></i>`;
					} else {
						index.favoriteButton.innerHTML = `<i class="fa-light fa-heart"></i>`;
					}
					
					index.currentStationIndex = index.playingStation.index;
					index.audio.setAttribute('src', index.playingStation.url);
					index.playPause(true);
				});
				
				index.favoritesDisplay.appendChild(el);
			}
		} else {
			index.favoritesDisplay.appendChild(strToEl(`
				<div class="favoritesPlaceholder">
					<i class="fa-light fa-signal-stream-slash"></i>
					<span>No favorite stations</span>
				</div>
			`));
		}
	},
	
	toggleLoading(newState) {
		if (newState) {
			index.loading.style.display = 'flex';
			
			setTimeout(() => {
				index.loading.style.opacity = '1';
			}, 10);
		} else {
			index.loading.style.opacity = '0';
			
			setTimeout(() => {
				index.loading.style.display = 'none';
			}, 150);
		}
	},
	
	previousStation() {
		let stations = index.countryStations.slice(0, index.loadedStationAmount);
		
		if ((index.currentCountry === null) && (index.favoriteStationIds.length > 0)) {
			if (index.currentStationIndex === null) {
				index.currentStationIndex = -1;
			}
			
			stations = index.favoriteStations;
		}
		
		if (index.currentStationIndex === null) {
			alert('Please select a country first');
			return;
		}
		
		if (index.scrollBusy === true) {
			return;
		}
		
		index.scrollBusy = true;
		
		if ((index.currentStationIndex - 1) < 0) {
			index.currentStationIndex = stations.length - 1;
		} else {
			index.currentStationIndex--;
		}
		
		index.playPause(false);
		let stationData = stations[index.currentStationIndex];
		
		for (let station of document.querySelectorAll('.station')) {
			station.classList.remove('selected');
			station.classList.remove('error');
		}
		
		stationData.el.classList.add('selected');
		index.audio.setAttribute('src', stationData.url);
		index.playPause(true);
		index.scrollBusy = false;
	},
	
	nextStation() {
		let stations = index.countryStations.slice(0, index.loadedStationAmount);
		
		if ((index.currentCountry === null) && (index.favoriteStationIds.length > 0)) {
			if (index.currentStationIndex === null) {
				index.currentStationIndex = -1;
			}
			
			stations = index.favoriteStations;
		}
		
		if (index.currentStationIndex === null) {
			alert('Please select a country first');
			return;
		}
		
		if (index.scrollBusy === true) {
			return;
		}
		
		index.scrollBusy = true;
		
		if ((index.currentStationIndex + 1) > (stations.length - 1)) {
			index.currentStationIndex = 0;
		} else {
			index.currentStationIndex++;
		}
		
		index.playPause(false);
		let stationData = stations[index.currentStationIndex];
		
		for (let station of document.querySelectorAll('.station')) {
			station.classList.remove('selected');
			station.classList.remove('error');
		}
		
		stationData.el.classList.add('selected');
		index.audio.setAttribute('src', stationData.url);
		index.playPause(true);
		index.scrollBusy = false;
	},
	
	playPause(newState) {
		if ((newState !== undefined) && !(newState instanceof PointerEvent)) {
			index.playingAudio = !newState;
		}
		
		if ((index.playingAudio === false) && (index.audio.getAttribute('src') === '')) {
			alert('Please select a radio station first');
			return;
		}
		
		if (index.playingAudio) {
			index.audio.pause();
			index.playPauseButton.style.padding = '0 0 0 8px';
			index.playPauseButton.innerHTML = '<i class="fa-light fa-play"></i>';
		} else {
			index.audio.play();
			index.playPauseButton.style.padding = '0';
			index.playPauseButton.innerHTML = '<i class="fa-light fa-pause"></i>';
		}
		
		index.playingAudio = !index.playingAudio;
	},
	
	toggleCountrySelect(newState) {
		let state = index.countrySelect.getAttribute('state') === 'true';
		
		if (newState !== undefined && !(newState instanceof PointerEvent)) {
			state = !newState;
		}
		
		if (state) {
			index.countriesDisplay.style.height = '';
			index.countrySelect.querySelector('.arrow svg').style.rotate = '';
			
			setTimeout(() => {
				index.countriesDisplay.style.display = '';
			}, 150);
		} else {
			index.countriesDisplay.style.display = 'block';
			
			setTimeout(() => {
				index.countrySelect.querySelector('.arrow svg').style.rotate = '180deg';
				index.countriesDisplay.style.height = 'calc(calc(100vh - 60px) - 120px)';
			}, 10);
		}
		
		index.countrySelect.setAttribute('state', !state);
	},
	
	async displayCountries() {
		let fetchData = await fetch(`${index.serverUrl}/radioCountries`);
		index.countries = await fetchData.json();
		let el;
		
		index.countries.sort((a, b) => {
			let nameA = a.name.toLowerCase();
			let nameB = b.name.toLowerCase();
			
			if (nameA < nameB) {
				return -1;
			}
			
			if (nameA > nameB) {
				return 1;
			}
			
			return 0;
		});
		
		for (let country of index.countries) {
			el = strToEl(`
				<div class="country" countrycode="${country.iso_3166_1}" title="View radio stations">
					<div class="flag">
						<img src="https://www.worldatlas.com/r/w300/img/flag/${country.iso_3166_1.toLowerCase()}-flag.jpg"/>
					</div>
					<div class="name">
						<span>${country.name}</span>
					</div>
					<div class="stationCount">
						<i class="fa-regular fa-tower-broadcast"></i>
						<span>${country.stationcount}</span>
					</div>
				</div>
			`);
			
			listener.add(el.querySelector('.flag img'), 'error', (e) => {
				let countryCode = elParent(e.currentTarget, '.country').getAttribute('countrycode');
				e.currentTarget.setAttribute('src', `https://www.worldatlas.com/r/w300/img/flag/${countryCode.toLowerCase()}-flag.png`);
			});
			
			listener.add(el, 'click', (e) => {
				let newCountry = e.currentTarget.querySelector('.name span').innerHTML.trim();
				index.toggleCountrySelect(false);
				
				if (newCountry === index.currentCountry) {
					return;
				}
				
				index.currentCountry = newCountry;
				index.playPause(false);
				index.audio.setAttribute('src', '');
				index.countrySelect.querySelector('.display span').innerHTML = index.currentCountry;
				index.displayStations(index.currentCountry);
			});
			
			index.countriesDisplay.appendChild(el);
		}
	},
	
	displayStations(country) {
		index.favoritesDisplay.style.display = 'none';
		index.stationsDisplay.style.display = 'block';
		index.favoriteButton.innerHTML = `<i class="fa-light fa-heart"></i>`;
		index.stationsDisplay.scrollTop = 0;
		index.stationsDisplay.innerHTML = '';
		index.currentStationIndex = -1;
		index.countryStations = index.stations.filter(station => station.country === index.currentCountry);
		index.countryStations.sort((a, b) => {
			let nameA = a.name.toLowerCase();
			let nameB = b.name.toLowerCase();
			
			if (nameA < nameB) {
				return -1;
			}
			
			if (nameA > nameB) {
				return 1;
			}
			
			return 0;
		});
		
		let loadMoreButton = strToEl(`
			<div class="loadMore">
				<button class="loadMoreButton">
					Load more
				</button>
			</div>
		`);
		
		if (index.countryStations.length > index.maxLoadedStations) {
			listener.add(loadMoreButton, 'click', index.loadMore);
			index.stationsDisplay.appendChild(loadMoreButton);
		}
		
		index.loadedStationAmount = 0;
		index.displayCountryStations(index.maxLoadedStations);
	},
	
	displayCountryStations(maxAmount) {
		let el, icon;
		
		for (let station of index.countryStations) {
			if (station.index !== undefined) {
				continue;
			}
			
			station.index = index.loadedStationAmount;
			index.loadedStationAmount++;
			icon = '';
			
			if (station.favicon === '') {
				icon = '<i class="fa-regular fa-radio"></i>';
			} else {
				icon = `<img src="${station.favicon}"/>`;
			}
			
			el = strToEl(`
				<div class="station" stationuuid="${station.stationuuid}" title="Play this station">
					<div class="icon">
						${icon}
					</div>
					<div class="name">
						<span>${station.name}</span>
					</div>
				</div>
			`);
			
			station.el = el;
			
			if (station.favicon !== '') {
				listener.add(el.querySelector('.icon img'), 'error', (e) => {
					e.currentTarget.replaceWith(strToEl(`
						<i class="fa-regular fa-radio"></i>
					`));
				});
			}
			
			listener.add(el, 'click', (e) => {
				index.playPause(false);
				
				for (let station of document.querySelectorAll('.station')) {
					station.classList.remove('selected');
					station.classList.remove('error');
				}
				
				e.currentTarget.classList.add('selected');
				let stationId = e.currentTarget.getAttribute('stationuuid');
				index.playingStation = index.stations.filter(station => station.stationuuid === stationId)[0];
				
				if (index.favoriteStationIds.includes(index.playingStation.stationuuid)) {
					index.favoriteButton.innerHTML = `<i class="fa-solid fa-heart"></i>`;
				} else {
					index.favoriteButton.innerHTML = `<i class="fa-light fa-heart"></i>`;
				}
				
				index.currentStationIndex = index.playingStation.index;
				index.audio.setAttribute('src', index.playingStation.url);
				index.playPause(true);
			});
			
			index.stationsDisplay.insertBefore(el, index.stationsDisplay.lastElementChild);
			
			if (index.loadedStationAmount === maxAmount) {
				break;
			}
		}
	},
	
	loadMore(e) {
		index.displayCountryStations(index.loadedStationAmount + 10);
		
		if (index.loadedStationAmount === index.countryStations.length) {
			e.currentTarget.parentElement.removeChild(e.currentTarget);
			return;
		}
	}
};

index.init();