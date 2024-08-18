document.addEventListener('DOMContentLoaded', function () {
    const apiKey = '20da423906ccf27bec8c2d81c8f4a2eb'; // Replace with your actual API key
    const form = document.querySelector('form');
    const cityInput = document.getElementById('city-name');
    const forecastBtn = document.getElementById('forecast-btn');
    const currentLocationBtn = document.getElementById('current-location');
    const weatherDataContainer = document.querySelector('.weather-data');
    const forecastContainer = document.getElementById('forecast-container');
    const historyList = document.getElementById('history-list');
    const unitToggle = document.getElementById('unit-toggle');
    const mapContainer = document.getElementById('map');
    const scrollToTopButton = document.getElementById('scroll-to-top');

    if (!form || !cityInput || !forecastBtn || !weatherDataContainer || !forecastContainer || !historyList || !unitToggle || !mapContainer || !scrollToTopButton) {
        console.error('One or more required HTML elements are missing.');
        return;
    }

    // Initialize the map
    const map = L.map('map').setView([20.5937, 78.9629], 5); // Default to India

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    let marker;
    let historyCities = new Set(); // Track history entries

    function fetchWeatherData(city, unit = 'metric') {
        const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=${unit}`;
        fetch(url)
            .then(response => response.json())
            .then(data => {
                displayCurrentWeather(data);
                updateMap(data.coord.lat, data.coord.lon, city);
                if (!historyCities.has(city)) {
                    addToHistory(city);
                    historyCities.add(city); // Add city to the set
                }
            })
            .catch(error => console.error('Error fetching weather data:', error));
    }

    function fetchForecastData(city, unit = 'metric') {
        const url = `https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${apiKey}&units=${unit}`;
        fetch(url)
            .then(response => response.json())
            .then(data => {
                displayForecastData(data);
            })
            .catch(error => console.error('Error fetching forecast data:', error));
    }

    function displayCurrentWeather(data) {
        const { weather, main, wind } = data;
        const iconUrl = `https://openweathermap.org/img/wn/${weather[0].icon}.png`;

        const unit = unitToggle.value;
        const tempUnit = unit === 'metric' ? '°C' : '°F';
        const feelsLikeUnit = unit === 'metric' ? '°C' : '°F';

        weatherDataContainer.querySelector('.icon').innerHTML = `<img src="${iconUrl}" alt="${weather[0].description}">`;
        weatherDataContainer.querySelector('.temp').textContent = `${Math.round(main.temp)}${tempUnit}`;
        weatherDataContainer.querySelector('.desc').textContent = weather[0].description;
        weatherDataContainer.querySelector('.details').innerHTML = `
            <div>Feels Like: ${Math.round(main.feels_like)}${feelsLikeUnit}</div>
            <div>Humidity: ${main.humidity}%</div>
            <div>Wind Speed: ${Math.round(wind.speed)} m/s</div>
        `;
    }

    function displayForecastData(data) {
        forecastContainer.innerHTML = '';
        const forecasts = data.list.reduce((acc, item) => {
            const date = item.dt_txt.split(' ')[0];
            if (!acc[date]) {
                acc[date] = [];
            }
            acc[date].push(item);
            return acc;
        }, {});

        const forecastDates = Object.keys(forecasts).slice(0, 4);

        forecastDates.forEach(date => {
            const items = forecasts[date];
            const { weather, main } = items[0];
            const iconUrl = `https://openweathermap.org/img/wn/${weather[0].icon}.png`;
            const temp = Math.round(main.temp);
            const tempUnit = unitToggle.value === 'metric' ? '°C' : '°F';

            const forecastElement = document.createElement('div');
            forecastElement.className = 'forecast-day';
            forecastElement.innerHTML = `
                <h3>${new Date(date).toLocaleDateString()}</h3>
                <img src="${iconUrl}" alt="${weather[0].description}">
                <div class="temp">${temp}${tempUnit}</div>
                <div class="desc">${weather[0].description}</div>
            `;

            forecastContainer.appendChild(forecastElement);
        });
    }

    function updateMap(lat, lon, city) {
        if (marker) {
            marker.setLatLng([lat, lon]);
        } else {
            marker = L.marker([lat, lon]).addTo(map);
        }
        map.setView([lat, lon], 10);
        marker.bindPopup(`<b>${city}</b>`).openPopup();
    }

    function reverseGeocode(lat, lon) {
        const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}`;
        return fetch(url)
            .then(response => response.json())
            .then(data => {
                return data.name; // Return the city name
            })
            .catch(error => console.error('Error reverse geocoding:', error));
    }

    function addToHistory(cityName) {
        const historyItem = document.createElement("li");
        historyItem.textContent = cityName;

        const removeButton = document.createElement("button");
        removeButton.textContent = "✖";
        removeButton.addEventListener("click", (event) => {
            event.stopPropagation();
            historyCities.delete(cityName); // Remove city from the set
            historyItem.remove();
        });

        historyItem.addEventListener("click", () => {
            cityInput.value = cityName;
            fetchWeatherData(cityName, unitToggle.value);
            fetchForecastData(cityName, unitToggle.value);
        });

        historyItem.appendChild(removeButton);
        historyList.appendChild(historyItem);
    }

    form.addEventListener('submit', function (event) {
        event.preventDefault();
        const city = cityInput.value.trim();
        if (city) {
            fetchWeatherData(city, unitToggle.value);
            fetchForecastData(city, unitToggle.value);
        }
    });

    forecastBtn.addEventListener('click', function () {
        const city = cityInput.value.trim();
        if (city) {
            fetchForecastData(city, unitToggle.value);
        }
    });

    currentLocationBtn.addEventListener('click', function () {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(function (position) {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=${unitToggle.value}`;
                fetch(url)
                    .then(response => response.json())
                    .then(data => {
                        cityInput.value = data.name;
                        displayCurrentWeather(data);
                        fetchForecastData(data.name, unitToggle.value);
                        if (!historyCities.has(data.name)) {
                            addToHistory(data.name);
                            historyCities.add(data.name); // Add city to the set
                        }
                        updateMap(lat, lon, data.name);
                    })
                    .catch(error => console.error('Error fetching weather data:', error));
            });
        } else {
            alert('Geolocation is not supported by this browser.');
        }
    });

    unitToggle.addEventListener('change', function () {
        const city = cityInput.value.trim();
        if (city) {
            fetchWeatherData(city, unitToggle.value);
            fetchForecastData(city, unitToggle.value);
        }
    });

    // Map click event
    map.on('click', function (event) {
        const lat = event.latlng.lat;
        const lon = event.latlng.lng;
        reverseGeocode(lat, lon).then(cityName => {
            if (cityName) {
                cityInput.value = cityName;
                fetchWeatherData(cityName, unitToggle.value);
                fetchForecastData(cityName, unitToggle.value);
            }
        });
    });

    // Scroll to Top Button functionality
    if (scrollToTopButton) {
        scrollToTopButton.addEventListener('click', function () {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });

        window.addEventListener('scroll', function () {
            if (window.scrollY > 50) {
                scrollToTopButton.style.display = 'block';
            } else {
                scrollToTopButton.style.display = 'none';
            }
        });

        // Initialize the button state on page load
        window.dispatchEvent(new Event('scroll'));
    }
});
