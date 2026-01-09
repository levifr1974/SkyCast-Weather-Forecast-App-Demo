const API_KEY = "8b631bdee99790b229a0d8977f3389c4";
const CONFIG = {
    city: 'New York',
    units: 'metric',
    tzOffset: 0
};
// --- Core Systems ---
function init() {
    lucide.createIcons();
    fetchData(CONFIG.city);
    setInterval(updateClocks, 1000);
}
async function fetchData(city, lat = null, lon = null) {
    showLoader(true);
    try {
        let weatherUrl = `https://api.openweathermap.org/data/2.5/weather?appid=${API_KEY}&units=${CONFIG.units}`;
        if (lat && lon) {
            weatherUrl += `&lat=${lat}&lon=${lon}`;
        } else {
            weatherUrl += `&q=${encodeURIComponent(city)}`;
        }
        const weatherRes = await axios.get(weatherUrl);
        const data = weatherRes.data;
        const { lat: cLat, lon: cLon } = data.coord;
        // Secondary calls (Parallel)
        const [forecastRes, airRes] = await Promise.all([
            axios.get(`https://api.openweathermap.org/data/2.5/forecast?lat=${cLat}&lon=${cLon}&appid=${API_KEY}&units=${CONFIG.units}`),
            axios.get(`https://api.openweathermap.org/data/2.5/air_pollution?lat=${cLat}&lon=${cLon}&appid=${API_KEY}`)
        ]);
        CONFIG.tzOffset = data.timezone;
        updateUI(data, forecastRes.data, airRes.data);
        setTheme(data);
    } catch (err) {
        showAlert("City not found in our global database.");
        console.error(err);
    } finally {
        setTimeout(() => showLoader(false), 500);
    }
}
function updateUI(weather, forecast, air) {
    // Header & Location
    document.getElementById('cityName').innerText = weather.name;
    document.getElementById('countryFlag').src = `https://flagcdn.com/w80/${weather.sys.country.toLowerCase()}.png`;
    document.getElementById('fullDate').innerText = moment().format('dddd, MMMM Do');
    document.getElementById('coords').innerText = `${weather.coord.lat.toFixed(2)}°N, ${weather.coord.lon.toFixed(2)}°E`;
    // Hero
    const symbol = CONFIG.units === 'metric' ? '°C' : '°F';
    document.getElementById('mainTemp').innerText = `${Math.round(weather.main.temp)}${symbol}`;
    document.getElementById('weatherDesc').innerText = weather.weather[0].description;
    document.getElementById('weatherIconContainer').innerHTML = `<img src="https://openweathermap.org/img/wn/${weather.weather[0].icon}@4x.png" width="120" />`;
    // Stats
    document.getElementById('feelsLike').innerText = `${Math.round(weather.main.feels_like)}${symbol}`;
    document.getElementById('tempRange').innerText = `Lo: ${Math.round(weather.main.temp_min)}° / Hi: ${Math.round(weather.main.temp_max)}°`;
    const speedUnit = CONFIG.units === 'metric' ? 'km/h' : 'mph';
    const speedVal = CONFIG.units === 'metric' ? (weather.wind.speed * 3.6).toFixed(1) : weather.wind.speed;
    document.getElementById('windSpeed').innerText = `${speedVal} ${speedUnit}`;
    document.getElementById('windDir').innerText = `Heading: ${weather.wind.deg}°`;
    document.getElementById('humidity').innerText = `${weather.main.humidity}%`;
    document.getElementById('clouds').innerText = `${weather.clouds.all}%`;
    document.getElementById('pressure').innerText = `${weather.main.pressure} hPa`;
    document.getElementById('visibility').innerText = `${(weather.visibility / 1000).toFixed(1)} km`;
    document.getElementById('rain').innerText = weather.rain ? `${weather.rain['1h'] || 0} mm` : '0 mm';
    document.getElementById('gusts').innerText = weather.wind.gust ? `${(weather.wind.gust * 3.6).toFixed(1)} ${speedUnit}` : '--';
    // Sun Times
    const formatSun = (ts) => moment.utc(ts * 1000).add(CONFIG.tzOffset, 'seconds').format('HH:mm');
    document.getElementById('sunrise').innerText = formatSun(weather.sys.sunrise);
    document.getElementById('sunset').innerText = formatSun(weather.sys.sunset);
    // Air Quality
    const aqiVal = air.list[0].main.aqi;
    const aqiMap = { 1: 'Good', 2: 'Fair', 3: 'Moderate', 4: 'Poor', 5: 'Very Poor' };
    document.getElementById('aqi').innerText = `Index: ${aqiVal}/5`;
    document.getElementById('aqiDesc').innerText = `Status: ${aqiMap[aqiVal]}`;
    // Dew Point (approx)
    const dp = weather.main.temp - ((100 - weather.main.humidity) / 5);
    document.getElementById('dewPoint').innerText = `Dew Pt: ${dp.toFixed(1)}°`;
    // UV Index (Simulated based on condition since it requires separate call often)
    const uv = weather.clouds.all < 20 ? 'High' : (weather.clouds.all < 60 ? 'Moderate' : 'Low');
    document.getElementById('uvIndex').innerText = uv;
    document.getElementById('uvStatus').innerText = `${uv} Exposure Risk`;
    // Forecast
    const grid = document.getElementById('forecastGrid');
    grid.innerHTML = '';
    const daily = forecast.list.filter(f => f.dt_txt.includes("12:00:00"));
    daily.forEach(day => {
        const item = document.createElement('div');
        item.className = 'forecast-item';
        item.innerHTML = `
<div class="forecast-day">${moment(day.dt * 1000).format('ddd')}</div>
<img src="https://openweathermap.org/img/wn/${day.weather[0].icon}@2x.png" width="50" />
<div class="forecast-temp">${Math.round(day.main.temp)}°</div>
<div style="font-size: 0.6rem; color: var(--accent); text-transform: uppercase;">${day.weather[0].main}</div>
`;
        grid.appendChild(item);
    });
    lucide.createIcons();
}
// --- Helpers ---
function updateClocks() {
    const now = moment();
    const cityTime = moment.utc().add(CONFIG.tzOffset, 'seconds');
    document.getElementById('localClock').innerText = cityTime.format('HH:mm:ss');
}
function setUnits(u) {
    CONFIG.units = u;
    document.getElementById('btnMetric').classList.toggle('active', u === 'metric');
    document.getElementById('btnImperial').classList.toggle('active', u === 'imperial');
    fetchData(document.getElementById('cityName').innerText);
}
function handleSearch() {
    const val = document.getElementById('cityInput').value.trim();
    if (val) fetchData(val);
}
document.getElementById('cityInput').onkeypress = (e) => {
    if (e.key === 'Enter') handleSearch();
};
function getGeolocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(pos => {
            fetchData(null, pos.coords.latitude, pos.coords.longitude);
        }, () => showAlert("Location access denied."));
    }
}
function setTheme(weather) {
    const condition = weather.weather[0].main;
    const overlays = {
        Clear: 'radial-gradient(circle at top right, #1e40af, #020617)',
        Clouds: 'radial-gradient(circle at top right, #334155, #020617)',
        Rain: 'radial-gradient(circle at top right, #1e1b4b, #020617)',
        Thunderstorm: 'radial-gradient(circle at top right, #4c1d95, #020617)',
        Drizzle: 'radial-gradient(circle at top right, #1e293b, #0f172a)'
    };
    document.getElementById('mainBg').style.background = overlays[condition] || overlays.Clear;
}
function showLoader(show) {
    document.getElementById('loader').style.display = show ? 'flex' : 'none';
}
function showAlert(msg) {
    const el = document.getElementById('alert');
    el.innerText = msg;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 3000);
}
window.onload = init;