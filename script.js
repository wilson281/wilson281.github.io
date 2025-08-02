// Отримання глобальних змінних для Firestore, якщо вони існують.
// Ці змінні використовуються для ініціалізації Firebase та автентифікації.
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : null;
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// Імпорти Firebase (якщо потрібне зберігання даних, але для цього додатка не використовується)
// import { initializeApp } from 'firebase/app';
// import { getAuth, signInAnonymously, signInWithCustomToken } from 'firebase/auth';
// import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';

// Ваш API-ключ OpenWeatherMap.
// !!! ВАЖЛИВО: Замініть 'ВАШ_API_КЛЮЧ_ТУТ' на ваш реальний ключ API OpenWeatherMap.
const openWeatherApiKey = '0b797f6c2aa8d32277d4d386ce49691e';

// URL RSS-стрічки новин RBC.UA
const rssFeedUrl = 'https://www.rbc.ua/static/rss/newsline.img.rus.rss.xml';

// Використовуємо публічний CORS-проксі для обходу обмежень міждоменних запитів
const corsProxyBaseUrl = 'https://corsproxy.io/?';


// Отримання посилань на елементи DOM
const cityInput = document.getElementById('city-input');
const searchButton = document.getElementById('search-button');
const tomorrowWeatherDisplay = document.getElementById('current-weather-display'); // Змінена назва
const forecastDisplay = document.getElementById('forecast-display');
const tomorrowHourlyForecastDisplay = document.getElementById('today-hourly-forecast-display'); // Змінена назва
const hourlyCardsContainer = document.getElementById('hourly-cards-container');
const newsFeedContainer = document.getElementById('news-feed'); // Елемент для новин
const loadingSpinner = document.getElementById('loading-spinner');
const errorMessageBox = document.getElementById('error-message-box');
const errorText = document.getElementById('error-text');
const closeErrorButton = document.getElementById('close-error-button');

// Оновлюємо заголовок блоку погоди на завтра
document.getElementById('current-weather-header').textContent = 'Погода на завтра';

// Оновлюємо заголовок погодинного прогнозу
document.getElementById('today-hourly-forecast-header').textContent = 'Погодинний прогноз на завтра';

// Місто за замовчуванням, яке завантажується при запуску
const defaultCity = 'Kyiv';

// Додаємо слухач подій для завантаження DOM
document.addEventListener('DOMContentLoaded', () => {
    // Завантажуємо погоду для міста за замовчуванням при першому завантаженні сторінки
    getWeatherData(defaultCity);
    // Завантажуємо новини з RSS
    fetchRssNews();
});

// Додаємо слухач подій для кнопки пошуку
searchButton.addEventListener('click', () => {
    const city = cityInput.value.trim();
    if (city) {
        getWeatherData(city);
    } else {
        showError('Будь ласка, введіть назву міста.');
        clearWeatherDisplays();
    }
});

// Додаємо слухач подій для закриття повідомлення про помилку
closeErrorButton.addEventListener('click', () => {
    errorMessageBox.classList.add('hidden');
});

/**
 * Очищає поточні відображення погоди та прогнозу.
 */
function clearWeatherDisplays() {
    tomorrowWeatherDisplay.innerHTML = '<p class="text-gray-600 text-lg">Введіть місто, щоб побачити погоду.</p>';
    forecastDisplay.innerHTML = '<p class="text-gray-600 text-lg text-center col-span-full">Прогноз з\'явиться тут.</p>';
    tomorrowHourlyForecastDisplay.classList.add('hidden'); // Приховуємо погодинний прогноз
    hourlyCardsContainer.innerHTML = '';
}

/**
 * Показує повідомлення про помилку користувачеві.
 * @param {string} message - Повідомлення про помилку для відображення.
 */
function showError(message) {
    errorText.textContent = message;
    errorMessageBox.classList.remove('hidden');
}

/**
 * Показує або приховує спінер завантаження.
 * @param {boolean} show - True, щоб показати спінер, False, щоб приховати.
 */
function toggleLoadingSpinner(show) {
    if (show) {
        loadingSpinner.classList.remove('hidden');
    } else {
        loadingSpinner.classList.add('hidden');
    }
}

/**
 * Отримує дані про поточну погоду та прогноз на 5 днів з API OpenWeatherMap.
 * @param {string} city - Назва міста.
 */
async function getWeatherData(city) {
    toggleLoadingSpinner(true); // Показати спінер завантаження
    errorMessageBox.classList.add('hidden'); // Приховати будь-які попередні повідомлення про помилки

    // URL для поточної погоди (метричні одиниці, українська мова)
    const currentWeatherApiUrl = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${openWeatherApiKey}&units=metric&lang=uk`;
    // URL для прогнозу на 5 днів / 3 години (метричні одиниці, українська мова)
    const forecastApiUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${openWeatherApiKey}&units=metric&lang=uk`;

    try {
        // Виконуємо обидва запити паралельно
        const [currentWeatherResponse, forecastResponse] = await Promise.all([
            fetch(currentWeatherApiUrl),
            fetch(forecastApiUrl)
        ]);

        // Перевіряємо відповідь для поточної погоди
        if (!currentWeatherResponse.ok) {
            if (currentWeatherResponse.status === 404) {
                throw new Error('Місто не знайдено. Будь ласка, перевірте назву.');
            } else {
                throw new Error(`Помилка отримання поточної погоди: ${currentWeatherResponse.statusText}`);
            }
        }

        // Перевіряємо відповідь для прогнозу
        if (!forecastResponse.ok) {
            if (forecastResponse.status === 404) {
                throw new Error('Місто не знайдено для прогнозу. Будь ласка, перевірте назву.');
            } else {
                throw new Error(`Помилка отримання прогнозу: ${forecastResponse.statusText}`);
            }
        }

        // Парсимо JSON-відповіді
        const currentWeatherData = await currentWeatherResponse.json();
        const forecastData = await forecastResponse.json();

        // Відображаємо дані відповідно до нової логіки
        displayTomorrowWeather(currentWeatherData, forecastData);
        displayForecast(forecastData); // Прогноз на 6 днів (з мін/макс температурою)
        displayTomorrowHourlyForecast(forecastData); // Погодинний прогноз на завтра

    } catch (error) {
        showError(`Не вдалося отримати дані про погоду: ${error.message}`);
        console.error('Fetch error:', error);
        clearWeatherDisplays(); // Очистити дисплеї при помилці
    } finally {
        toggleLoadingSpinner(false); // Приховати спінер завантаження
    }
}

/**
 * Відображає дані про погоду на завтра.
 * @param {object} currentData - Об'єкт даних поточної погоди з API.
 * @param {object} forecastData - Об'єкт даних прогнозу з API.
 */
function displayTomorrowWeather(currentData, forecastData) {
    const { name } = currentData;
    const now = new Date();
    
    // Знаходимо завтрашній день
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    const tomorrowDateString = tomorrow.toLocaleDateString('uk-UA', { year: 'numeric', month: 'numeric', day: 'numeric' });
    
    let tomorrowWeatherItem = null;
    
    // Знаходимо перший запис для завтрашнього дня у прогнозі (зазвичай, 00:00)
    for(const item of forecastData.list) {
        const itemDate = new Date(item.dt * 1000);
        const itemDateString = itemDate.toLocaleDateString('uk-UA', { year: 'numeric', month: 'numeric', day: 'numeric' });
        if (itemDateString === tomorrowDateString) {
            tomorrowWeatherItem = item;
            break;
        }
    }
    
    if (!tomorrowWeatherItem) {
        tomorrowWeatherDisplay.innerHTML = `<p class="text-gray-600 text-lg text-center">Немає даних для прогнозу на завтра.</p>`;
        return;
    }

    const temperature = Math.round(tomorrowWeatherItem.main.temp);
    const feelsLike = Math.round(tomorrowWeatherItem.main.feels_like);
    const description = tomorrowWeatherItem.weather[0].description;
    const humidity = tomorrowWeatherItem.main.humidity;
    const windSpeed = tomorrowWeatherItem.wind.speed; // м/с
    const iconCode = tomorrowWeatherItem.weather[0].icon;
    const iconUrl = `https://openweathermap.org/img/wn/${iconCode}@4x.png`; // Збільшена іконка
    
    const formattedDate = tomorrow.toLocaleDateString('uk-UA', { weekday: 'long', day: 'numeric', month: 'long' });

    tomorrowWeatherDisplay.innerHTML = `
        <h2 class="text-3xl md:text-4xl font-bold mb-2 text-gray-800">${name}</h2>
        <p class="text-lg text-gray-700 mb-4">${formattedDate}</p>
        <div class="flex items-center justify-center mb-4">
            <img src="${iconUrl}" alt="${description}" class="w-24 h-24 md:w-32 md:h-32">
            <p class="text-5xl md:text-6xl font-bold text-blue-700">${temperature}°C</p>
        </div>
        <p class="text-xl text-gray-700 mb-2">Відчувається як: ${feelsLike}°C</p>
        <p class="text-xl text-gray-700 mb-2 capitalize">${description}</p>
        <p class="text-lg text-gray-600">Вологість: ${humidity}%</p>
        <p class="text-lg text-gray-600">Швидкість вітру: ${windSpeed} м/с</p>
    `;
}

/**
 * Відображає прогноз погоди на 6 днів, включаючи сьогодні.
 * Для іконки та опису використовується запис о 12:00 PM.
 * @param {object} data - Об'єкт даних прогнозу з API.
 */
function displayForecast(data) {
    forecastDisplay.innerHTML = ''; // Очищаємо попередній прогноз

    const dailyData = {}; // Об'єкт для зберігання даних по днях

    data.list.forEach(item => {
        const date = new Date(item.dt * 1000); // Перетворюємо timestamp в об'єкт Date
        const dateString = date.toLocaleDateString('uk-UA', { year: 'numeric', month: 'numeric', day: 'numeric' });
        const itemHour = date.getHours();

        if (!dailyData[dateString]) {
            dailyData[dateString] = {
                temps: [],
                icon: '',
                description: '',
                noonItem: null // Зберігаємо запис о 12:00 для іконки/опису
            };
        }

        dailyData[dateString].temps.push(item.main.temp);

        // Зберігаємо запис о 12:00 для іконки та опису
        if (itemHour === 12) {
            dailyData[dateString].noonItem = item;
        }
    });

    // Сортуємо дати, щоб відображати їх у правильному порядку
    const sortedDates = Object.keys(dailyData).sort((a, b) => {
        return new Date(a).getTime() - new Date(b).getTime();
    });

    // Відображаємо до 6 днів прогнозу, включаючи сьогодні
    let daysDisplayed = 0;
    for (const dateString of sortedDates) {
        if (daysDisplayed >= 6) break; // Обмежуємо до 6 днів

        const dayData = dailyData[dateString];
        const minTemp = Math.round(Math.min(...dayData.temps));
        const maxTemp = Math.round(Math.max(...dayData.temps));

        // Використовуємо дані з запису о 12:00 для іконки та опису
        const displayItem = dayData.noonItem || dayData.temps[0]; // Якщо 12:00 немає, беремо перший доступний
        if (!displayItem) continue; // Пропускаємо, якщо немає даних для відображення

        const date = new Date(displayItem.dt * 1000);
        const now = new Date();
        const displayDate = date.toLocaleDateString('uk-UA', { weekday: 'short', day: 'numeric', month: 'short' });

        const description = displayItem.weather[0].description;
        const iconCode = displayItem.weather[0].icon;
        const iconUrl = `https://openweathermap.org/img/wn/${iconCode}@2x.png`; // Іконка для прогнозу

        const forecastCard = document.createElement('div');
        forecastCard.classList.add('forecast-card', 'p-4', 'rounded-xl', 'shadow-md', 'bg-white', 'flex', 'flex-col', 'items-center');
        forecastCard.innerHTML = `
            <p class="date text-lg font-semibold text-gray-800">${displayDate}</p>
            <img src="${iconUrl}" alt="${description}" class="w-16 h-16">
            <p class="temp text-2xl font-bold text-blue-600">${maxTemp}°C / ${minTemp}°C</p>
            <p class="description text-md text-gray-700 capitalize">${description}</p>
        `;
        forecastDisplay.appendChild(forecastCard);
        daysDisplayed++;
    }

    if (daysDisplayed === 0) {
        forecastDisplay.innerHTML = '<p class="text-gray-600 text-lg text-center col-span-full">Немає даних для прогнозу.</p>';
    }
}

/**
 * Відображає погодинний прогноз на завтра (кожні 3 години).
 * @param {object} data - Об'єкт даних прогнозу з API.
 */
function displayTomorrowHourlyForecast(data) {
    hourlyCardsContainer.innerHTML = ''; // Очищаємо попередній погодинний прогноз

    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    const tomorrowDateString = tomorrow.toLocaleDateString('uk-UA', { year: 'numeric', month: 'numeric', day: 'numeric' });

    let hasHourlyData = false;

    data.list.forEach(item => {
        const itemDate = new Date(item.dt * 1000);
        const itemDateString = itemDate.toLocaleDateString('uk-UA', { year: 'numeric', month: 'numeric', day: 'numeric' });

        // Перевіряємо, чи запис належить до завтрашнього дня
        if (itemDateString === tomorrowDateString) {
            hasHourlyData = true;
            const time = itemDate.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
            const temperature = Math.round(item.main.temp);
            const description = item.weather[0].description;
            const iconCode = item.weather[0].icon;
            const iconUrl = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;

            const hourlyCard = document.createElement('div');
            hourlyCard.classList.add('hourly-card', 'p-3', 'rounded-lg', 'shadow-sm', 'bg-white', 'flex', 'flex-col', 'items-center', 'text-center');
            hourlyCard.innerHTML = `
                <p class="font-semibold text-gray-800">${time}</p>
                <img src="${iconUrl}" alt="${description}" class="w-12 h-12">
                <p class="text-xl font-bold text-blue-600">${temperature}°C</p>
                <p class="text-sm text-gray-700 capitalize">${description}</p>
            `;
            hourlyCardsContainer.appendChild(hourlyCard);
        }
    });

    if (hasHourlyData) {
        tomorrowHourlyForecastDisplay.classList.remove('hidden');
    } else {
        tomorrowHourlyForecastDisplay.classList.add('hidden');
        hourlyCardsContainer.innerHTML = '<p class="text-gray-600 text-lg text-center col-span-full">Немає погодинного прогнозу на завтра.</p>';
    }
}

/**
 * Отримує останні новини з RSS-стрічки.
 */
async function fetchRssNews() {
    newsFeedContainer.innerHTML = '<p class="text-gray-600 text-lg text-center col-span-full">Завантаження новин...</p>'; // Показати індикатор завантаження
    // Використовуємо CORS-проксі для обходу обмежень міждоменних запитів
    const fullRssUrl = `${corsProxyBaseUrl}${encodeURIComponent(rssFeedUrl)}`;

    try {
        const response = await fetch(fullRssUrl);
        if (!response.ok) {
            // Спробуємо отримати текст помилки, якщо відповідь не OK
            const errorText = await response.text().catch(() => 'Не вдалося прочитати текст помилки.');
            console.error('RSS fetch HTTP Error:', response.status, response.statusText, errorText);
            throw new Error(`Помилка отримання RSS-стрічки: ${response.status} ${response.statusText || 'Невідома помилка'}. Деталі: ${errorText.substring(0, 100)}...`);
        }
        const text = await response.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(text, 'text/xml');

        // Перевіряємо на помилки парсингу XML
        if (xmlDoc.getElementsByTagName('parsererror').length > 0) {
            const parserError = xmlDoc.getElementsByTagName('parsererror')[0];
            console.error('Error parsing XML:', parserError);
            throw new Error('Помилка парсингу RSS-стрічки. Можливо, недійсний XML або проксі повернув не XML.');
        }

        const items = xmlDoc.querySelectorAll('item');
        const articles = [];

        items.forEach(item => {
            const titleElement = item.querySelector('title');
            const linkElement = item.querySelector('link');
            const descriptionElement = item.querySelector('description');
            const enclosureElement = item.querySelector('enclosure'); // Для зображень

            const title = titleElement ? titleElement.textContent : 'Без заголовка';
            const link = linkElement ? linkElement.textContent : '#';
            // Очищаємо опис від HTML-тегів, якщо вони є
            const description = descriptionElement ? descriptionElement.textContent.replace(/<[^>]*>?/gm, '') : 'Без опису.';
            const imageUrl = enclosureElement ? enclosureElement.getAttribute('url') : 'https://placehold.co/400x200/cccccc/333333?text=No+Image';

            articles.push({ title, link, description, urlToImage: imageUrl });
        });

        displayRssNews(articles);
    } catch (error) {
        newsFeedContainer.innerHTML = `<p class="text-red-600 text-lg text-center col-span-full">Не вдалося завантажити новини: ${error.message}. Перевірте URL RSS-стрічки або CORS-проксі.</p>`;
        console.error('RSS fetch error:', error);
    }
}

/**
 * Відображає новини, отримані з RSS-стрічки, на сторінці.
 * @param {Array<object>} articles - Масив об'єктів новинних статей.
 */
function displayRssNews(articles) {
    newsFeedContainer.innerHTML = ''; // Очищаємо попередні новини

    if (articles.length === 0) {
        newsFeedContainer.innerHTML = '<p class="text-gray-600 text-lg text-center col-span-full">Немає доступних новин.</p>';
        return;
    }

    // Обмежуємо до 6 статей, щоб відповідати попередньому дизайну
    articles.slice(0, 6).forEach(article => {
        const newsCard = document.createElement('div');
        newsCard.classList.add('news-article-card', 'p-4', 'rounded-xl', 'shadow-md', 'bg-white', 'flex', 'flex-col');

        const imageUrl = article.urlToImage || 'https://placehold.co/400x200/cccccc/333333?text=No+Image'; // Зображення-заповнювач
        const title = article.title || 'Без заголовка';
        const description = article.description || 'Без опису.';
        const url = article.link || '#'; // Використовуємо 'link' з RSS

        newsCard.innerHTML = `
            <img src="${imageUrl}" alt="${title}" onerror="this.onerror=null;this.src='https://placehold.co/400x200/cccccc/333333?text=No+Image';" class="w-full h-36 object-cover rounded-lg mb-3">
            <h4 class="text-lg font-semibold text-gray-800 mb-2 line-clamp-2">${title}</h4>
            <p class="text-sm text-gray-600 mb-3 flex-grow line-clamp-3">${description}</p>
            <a href="${url}" target="_blank" rel="noopener noreferrer" class="bg-blue-600 hover:bg-blue-700 text-white text-center py-2 px-4 rounded-lg text-sm font-medium transition duration-300 ease-in-out self-start">
                Читати далі
            </a>
        `;
        newsFeedContainer.appendChild(newsCard);
    });
}
