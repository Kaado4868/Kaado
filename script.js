// --- Global Constants ---
const CACHE_DURATION = 1000 * 60 * 10; // 10 minutes in milliseconds
const NAV_OFFSET = 60; // Offset in pixels to account for the fixed navbar height

// --- Load Manager ---
window.addEventListener('load', () => {
    loadAllData();
});

// --- NEW/MODIFIED: Hamburger Toggle & Smooth Scrolling Logic ---
document.addEventListener('DOMContentLoaded', () => {
    const menuToggle = document.querySelector('.menu-toggle');
    const navLinks = document.getElementById('nav-links');

    // Hamburger Menu Toggle Logic
    if (menuToggle && navLinks) {
        menuToggle.addEventListener('click', () => {
            navLinks.classList.toggle('open'); 
            const isExpanded = menuToggle.getAttribute('aria-expanded') === 'true' || false;
            menuToggle.setAttribute('aria-expanded', !isExpanded);
        });
        
        // Close menu when a link is clicked (mobile fix)
        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                 if (link.getAttribute('href').startsWith('#') && window.innerWidth <= 768) {
                    navLinks.classList.remove('open');
                    menuToggle.setAttribute('aria-expanded', 'false');
                 }
            });
        });
    }

    // --- Smooth Scrolling Navigation Logic (UPDATED FOR ACCURACY) ---
    document.querySelectorAll('.navbar a').forEach(anchor => {
        // Only apply logic to internal links starting with '#'
        if (anchor.getAttribute('href').startsWith('#')) {
            anchor.addEventListener('click', function (e) {
                e.preventDefault(); 

                const hash = this.hash;
                
                // Use document.documentElement for scrolling to the very top (#top or index.html)
                const targetElement = (hash === '#top') ? document.documentElement : document.querySelector(hash); 
                
                if (targetElement) {
                    // Use scrollTo and offset for precise scrolling
                    const targetPosition = targetElement.offsetTop - NAV_OFFSET;
                    
                    window.scrollTo({
                        top: targetPosition,
                        behavior: 'smooth'
                    });
                    
                    // Update the URL hash
                    history.pushState(null, null, hash);
                }
            });
        }
    });
});


// --- The Sequential Data Loader (API Management) ---

async function loadAllData() {
    
    // Run News (fastest) and Calendar Setup sequentially first
    await fetchNews(); 
    await setupCalendar(); 
    
    // Define all Jikan requests that need to run sequentially
    const jikanRequests = [
        fetchDailyRec,
        fetchTrending,
        fetchSeasonal,
        fetchTopRated,
        fetchUpcoming
    ];

    // Loop through requests, running one at a time with a delay
    for (const requestFunction of jikanRequests) {
        await requestFunction(); 
        await new Promise(resolve => setTimeout(resolve, 1000)); 
    }
}


// --- API Fetch Functions with 10-Minute Caching ---

function fetchNews() {
    const cacheKey = 'newsFeed';
    const cachedData = JSON.parse(localStorage.getItem(cacheKey));

    if (cachedData && (Date.now() - cachedData.timestamp < CACHE_DURATION)) {
        displayNews(cachedData.data);
        return Promise.resolve(); 
    }

    return fetch('https://aninews.vercel.app/api/news?source=ann')
        .then(response => response.json())
        .then(data => {
            localStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data: data.data }));
            displayNews(data.data);
        })
        .catch(error => {
            const newsContainer = document.getElementById('news-container');
            newsContainer.innerHTML = '<p class="error-message">Could not load news. <a href="javascript:location.reload()" class="refresh-link">Refresh to try again.</a></p>';
        });
}

function fetchTrending() {
    const cacheKey = 'trendingAnime';
    const cachedData = JSON.parse(localStorage.getItem(cacheKey));

    if (cachedData && (Date.now() - cachedData.timestamp < CACHE_DURATION)) {
        displayTrending(cachedData.data);
        return Promise.resolve();
    }
    
    return fetch('https://api.jikan.moe/v4/top/anime?filter=airing')
        .then(response => response.json())
        .then(apiData => {
            localStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data: apiData.data }));
            displayTrending(apiData.data);
        })
        .catch(error => {
            const trendingContainer = document.getElementById('trending-container');
            trendingContainer.innerHTML = '<p class="error-message">Could not load trending. <a href="javascript:location.reload()" class="refresh-link">Refresh to try again.</a></p>';
        });
}

function fetchDailyRec() {
    const cacheKey = 'dailyRec';
    const cachedData = JSON.parse(localStorage.getItem(cacheKey));
    
    if (cachedData && (Date.now() - cachedData.timestamp < CACHE_DURATION)) {
        displayDailyRec(cachedData.data);
        return Promise.resolve();
    }

    return fetch('https://api.jikan.moe/v4/seasons/now?limit=1')
        .then(response => {
            if (!response.ok) throw new Error('Jikan API (daily rec) response was not ok');
            return response.json();
        })
        .then(apiData => {
            localStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data: apiData.data[0] }));
            displayDailyRec(apiData.data[0]);
        })
        .catch(error => {
            const recContainer = document.getElementById('daily-rec-container');
            recContainer.innerHTML = '<p class="error-message">Could not load recommendation. <a href="javascript:location.reload()" class="refresh-link">Refresh to try again.</a></p>';
        });
}

function fetchSeasonal() {
    const cacheKey = 'seasonalAnime';
    const cachedData = JSON.parse(localStorage.getItem(cacheKey));
    
    if (cachedData && (Date.now() - cachedData.timestamp < CACHE_DURATION)) {
        displaySeasonal(cachedData.data);
        return Promise.resolve();
    }

    return fetch('https://api.jikan.moe/v4/seasons/now')
        .then(response => {
            if (!response.ok) throw new Error('Jikan API (seasonal) response was not ok');
            return response.json();
        })
        .then(apiData => {
            localStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data: apiData.data }));
            displaySeasonal(apiData.data);
        })
        .catch(error => {
            const seasonalContainer = document.getElementById('seasonal-container');
            seasonalContainer.innerHTML = '<p class="error-message">Could not load seasonal anime. <a href="javascript:location.reload()" class="refresh-link">Refresh to try again.</a></p>';
        });
}

function fetchTopRated() {
    const cacheKey = 'topRatedAnime';
    const cachedData = JSON.parse(localStorage.getItem(cacheKey));

    if (cachedData && (Date.now() - cachedData.timestamp < CACHE_DURATION)) {
        displayTopRated(cachedData.data);
        return Promise.resolve(); 
    }

    return fetch(`https://api.jikan.moe/v4/top/anime`)
        .then(response => {
            if (!response.ok) throw new Error('Jikan API (top rated) response was not ok');
            return response.json();
        })
        .then(apiData => {
            localStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data: apiData.data }));
            displayTopRated(apiData.data);
        })
        .catch(error => {
            const gridContainer = document.getElementById('top-rated-grid');
            gridContainer.innerHTML = '<p class="error-message">Could not load top rated. <a href="javascript:location.reload()" class="refresh-link">Refresh to try again.</a></p>';
        });
}

function fetchUpcoming() {
    const cacheKey = 'upcomingAnime';
    const cachedData = JSON.parse(localStorage.getItem(cacheKey));
    
    if (cachedData && (Date.now() - cachedData.timestamp < CACHE_DURATION)) {
        displayUpcoming(cachedData.data);
        return Promise.resolve();
    }
    
    return fetch(`https://api.jikan.moe/v4/seasons/upcoming`)
        .then(response => {
            if (!response.ok) throw new Error('Jikan API (upcoming) response was not ok');
            return response.json();
        })
        .then(apiData => {
            localStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data: apiData.data }));
            displayUpcoming(apiData.data);
        })
        .catch(error => {
            const gridContainer = document.getElementById('upcoming-grid');
            gridContainer.innerHTML = '<p class="error-message">Could not load upcoming. <a href="javascript:location.reload()" class="refresh-link">Refresh to try again.</a></p>';
        });
}

function setupCalendar() {
    document.querySelectorAll('.calendar-tabs button').forEach(button => {
        button.addEventListener('click', (e) => {
            const day = e.target.dataset.day;
            fetchSchedule(day);
        });
    });

    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const currentDay = days[new Date().getDay()];
    
    return fetchSchedule(currentDay); 
}

function fetchSchedule(day) {
    const cacheKey = `schedule_${day}`; 
    const cachedData = JSON.parse(localStorage.getItem(cacheKey));
    const calendarContainer = document.getElementById('calendar-container');

    document.querySelectorAll('.calendar-tabs button').forEach(button => {
        if (button.dataset.day === day) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    });

    if (cachedData && (Date.now() - cachedData.timestamp < CACHE_DURATION)) {
        displaySchedule(cachedData.data);
        return Promise.resolve();
    }
    
    calendarContainer.innerHTML = '<p>Loading schedule for ' + day + '...</p>';
    
    return fetch(`https://api.jikan.moe/v4/schedules?filter=${day}`)
        .then(response => {
            if (!response.ok) throw new Error('Jikan API (schedule) response was not ok');
            return response.json();
        })
        .then(apiData => {
            localStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data: apiData.data }));
            displaySchedule(apiData.data);
        })
        .catch(error => {
            const calendarContainer = document.getElementById('calendar-container');
            calendarContainer.innerHTML = '<p class="error-message">Could not load schedule. <a href="javascript:location.reload()" class="refresh-link">Refresh to try again.</a></p>';
        });
}


// --- All DISPLAY functions below this are UNCHANGED ---

function displayNews(articles) {
    const newsContainer = document.getElementById('news-container');
    newsContainer.innerHTML = '';
    if (!Array.isArray(articles)) return;
    articles.slice(0, 10).forEach(article => {
        const newsItem = document.createElement('div');
        newsItem.className = 'news-item';
        const titleLink = document.createElement('a');
        titleLink.href = article.link;
        titleLink.textContent = article.title;
        titleLink.target = '_blank';
        const previewText = document.createElement('p');
        previewText.textContent = article.excerpt;
        newsItem.appendChild(titleLink);
        newsItem.appendChild(previewText);
        newsContainer.appendChild(newsItem);
    });
}

function displayTrending(animeList) {
    const trendingContainer = document.getElementById('trending-container');
    trendingContainer.innerHTML = '';
    if (!Array.isArray(animeList)) return;
    animeList.slice(0, 5).forEach(anime => {
        const item = document.createElement('div');
        item.className = 'trending-item';
        const image = document.createElement('img');
        image.src = anime.images.jpg.image_url;
        image.alt = anime.title;
        const textContent = document.createElement('div');
        const titleLink = document.createElement('a');
        titleLink.href = anime.url;
        titleLink.textContent = anime.title;
        titleLink.target = '_blank';
        const score = document.createElement('span');
        score.className = 'trending-score';
        score.textContent = `Score: ${anime.score || 'N/A'}`;
        item.appendChild(image);
        textContent.appendChild(titleLink);
        textContent.appendChild(score);
        item.appendChild(textContent);
        trendingContainer.appendChild(item);
    });
}

function displayDailyRec(anime) {
    const recContainer = document.getElementById('daily-rec-container');
    recContainer.innerHTML = '';
    if (!anime) { 
        recContainer.innerHTML = '<p class="error-message">Could not load recommendation. <a href="javascript:location.reload()" class="refresh-link">Refresh to try again.</a></p>';
        return;
    }
    const recCard = document.createElement('div');
    recCard.className = 'daily-rec-card';
    const image = document.createElement('img');
    image.src = anime.images.jpg.large_image_url;
    image.alt = anime.title;
    const titleLink = document.createElement('a');
    titleLink.href = anime.url;
    titleLink.textContent = anime.title;
    titleLink.target = '_blank';
    const synopsis = document.createElement('p');
    if (anime.synopsis) {
         synopsis.textContent = anime.synopsis.substring(0, 150) + '...';
    } else {
        synopsis.textContent = "No synopsis available for this title.";
    }
    recCard.appendChild(image);
    recCard.appendChild(titleLink);
    recCard.appendChild(synopsis);
    recContainer.appendChild(recCard);
}

function displaySeasonal(animeList) {
    const seasonalContainer = document.getElementById('seasonal-container');
    seasonalContainer.innerHTML = ''; 
    if (!Array.isArray(animeList)) {
        return;
    }
    animeList.sort((a, b) => (b.score || 0) - (a.score || 0));
    animeList.slice(0, 15).forEach(anime => {
        const item = document.createElement('div');
        item.className = 'seasonal-item';
        const image = document.createElement('img');
        image.src = anime.images.jpg.image_url;
        image.alt = anime.title;
        const textContent = document.createElement('div');
        const titleLink = document.createElement('a');
        titleLink.href = anime.url;
        titleLink.textContent = anime.title;
        titleLink.target = '_blank';
        const score = document.createElement('span');
        score.className = 'seasonal-score';
        score.textContent = `Score: ${anime.score || 'N/A'}`;
        item.appendChild(image);
        textContent.appendChild(titleLink);
        textContent.appendChild(score);
        item.appendChild(textContent);
        seasonalContainer.appendChild(item);
    });
}

function displaySchedule(animeList) {
    const calendarContainer = document.getElementById('calendar-container');
    calendarContainer.innerHTML = ''; 
    if (!Array.isArray(animeList) || animeList.length === 0) {
        calendarContainer.innerHTML = '<p>No shows scheduled to air on this day.</p>';
        return;
    }
    animeList.sort((a, b) => {
        const timeA = a.broadcast?.time || '99:99';
        const timeB = b.broadcast?.time || '99:99';
        return timeA.localeCompare(timeB);
    });
    animeList.forEach(anime => {
        const item = document.createElement('div');
        item.className = 'calendar-item';
        const image = document.createElement('img');
        image.src = anime.images.jpg.image_url;
        image.alt = anime.title;
        const textContent = document.createElement('div');
        const titleLink = document.createElement('a');
        titleLink.href = anime.url;
        titleLink.textContent = anime.title;
        titleLink.target = '_blank';
        const airTime = document.createElement('span');
        airTime.className = 'calendar-time';
        if (anime.broadcast && anime.broadcast.time) {
            airTime.textContent = `Airs at: ${anime.broadcast.time} (${anime.broadcast.timezone})`;
        } else {
            airTime.textContent = "Airing time not specified";
        }
        item.appendChild(image);
        textContent.appendChild(titleLink);
        textContent.appendChild(airTime);
        item.appendChild(textContent);
        calendarContainer.appendChild(item);
    });
}

function displayTopRated(animeList) {
    const gridContainer = document.getElementById('top-rated-grid');
    gridContainer.innerHTML = ''; 
    if (!Array.isArray(animeList) || animeList.length === 0) {
        gridContainer.innerHTML = '<p>No anime found.</p>';
        return;
    }
    animeList.slice(0, 10).forEach(anime => {
        const card = document.createElement('a');
        card.href = anime.url;
        card.target = '_blank';
        card.className = 'anime-card';
        const image = document.createElement('img');
        image.src = anime.images.jpg.image_url;
        image.alt = anime.title;
        const title = document.createElement('h4');
        title.textContent = anime.title;
        const score = document.createElement('span');
        score.className = 'anime-card-score';
        score.textContent = `Score: ${anime.score || 'N/A'}`;
        card.appendChild(image);
        card.appendChild(title);
        card.appendChild(score);
        gridContainer.appendChild(card);
    });
}

function displayUpcoming(animeList) {
    const gridContainer = document.getElementById('upcoming-grid');
    gridContainer.innerHTML = '';
    if (!Array.isArray(animeList) || animeList.length === 0) {
        gridContainer.innerHTML = '<p>No upcoming anime found.</p>';
        return;
    }
    animeList.sort((a, b) => (b.members || 0) - (a.members || 0));
    animeList.slice(0, 10).forEach(anime => {
        const card = document.createElement('a');
        card.href = anime.url;
        card.target = '_blank';
        card.className = 'anime-card';
        const image = document.createElement('img');
        image.src = anime.images.jpg.image_url;
        image.alt = anime.title;
        const title = document.createElement('h4');
        title.textContent = anime.title;
        const score = document.createElement('span');
        score.className = 'anime-card-score';
        score.textContent = `Score: ${anime.score || 'N/A'}`;
        card.appendChild(image);
        card.appendChild(title);
        card.appendChild(score);
        gridContainer.appendChild(card);
    });
}