// --- Global Constants ---
const CACHE_DURATION = 1000 * 60 * 10; // 10 minutes in milliseconds
const NAV_OFFSET = 60; // Offset in pixels for smooth scrolling (to clear the navbar height)

// --- Load Manager ---
window.addEventListener('load', () => {
    // If the search-results-html exists, we run the dedicated search function
    if (document.getElementById('results-grid')) {
        runSearchFromURL();
    }
    // Load the homepage data
    loadAllData();
});

// --- NEW/MODIFIED: Hamburger Toggle & Smooth Scrolling Setup ---
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
                 // Close menu only for internal links on small screens
                 if (link.getAttribute('href').startsWith('#') && window.innerWidth <= 768) {
                    navLinks.classList.remove('open');
                    menuToggle.setAttribute('aria-expanded', 'false');
                 }
            });
        });
    }

    // --- Smooth Scrolling Navigation Logic (FIXED) ---
    document.querySelectorAll('.navbar a').forEach(anchor => {
        // Only apply logic to internal links starting with '#'
        if (anchor.getAttribute('href').startsWith('#')) {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();

                const hash = this.hash;
                const targetElement = document.querySelector(hash); 

                if (targetElement) {
                    const targetPosition = targetElement.offsetTop - NAV_OFFSET;
                    
                    window.scrollTo({
                        top: targetPosition,
                        behavior: 'smooth'
                    });
                    
                    history.pushState(null, null, hash);
                }
            });
        }
    });
});


// --- The Sequential Data Loader (API Management) ---

async function loadAllData() {
    
    const fullSeasonalGrid = document.getElementById('full-seasonal-grid');

    if (fullSeasonalGrid) {
        // --- ONLY RUN ON SEASONAL.HTML ---
        await fetchFullSeasonal();
        return; // Stop execution here for the dedicated seasonal page
    }
    
    // --- RUN ONLY ON INDEX.HTML ---
    await fetchNews(); 
    await setupCalendar(); 
    
    const jikanRequests = [
        fetchDailyRec,
        fetchTrending,
        fetchSeasonal,
        fetchTopRated,
        fetchUpcoming
    ];

    for (const requestFunction of jikanRequests) {
        await requestFunction(); 
        await new Promise(resolve => setTimeout(resolve, 1000)); 
    }
}


// --- UNIVERSAL SEARCH (API SEARCH) ---

function handleSearch(event) {
    // Only run if 'Enter' is pressed
    if (event && event.key !== 'Enter') {
        return;
    }
    
    const input = document.getElementById('searchInput');
    const searchTerm = input.value.trim();

    if (searchTerm === "") {
        // Don't alert on Enter, just do nothing
        return;
    }
    
    // Redirect to the search results page
    const encodedTerm = encodeURIComponent(searchTerm);
    window.location.href = `search-results.html?q=${encodedTerm}`;
}

async function runSearchFromURL() {
    const resultsGrid = document.getElementById('results-grid');
    if (!resultsGrid) return; 

    const urlParams = new URLSearchParams(window.location.search);
    const searchTerm = urlParams.get('q');

    if (!searchTerm) {
        resultsGrid.innerHTML = '<p>No search term provided. Please search the full anime database.</p>';
        return;
    }
    
    document.querySelector('.static-page-content h2').textContent = `Anime Database Results for "${searchTerm}"`;

    // CRITICAL: Call the external news link generator
    displayExternalNewsLink(searchTerm);

    // Fetch the anime results
    await fetchSearchData(searchTerm);
}

// --- NEW: External News Link Generator ---
function displayExternalNewsLink(query) {
    const newsDiv = document.getElementById('external-news-link');
    if (!newsDiv) return;

    // Use Google News search to simulate a news database lookup
    const encodedQuery = encodeURIComponent(`anime news ${query}`);
    const googleUrl = `https://www.google.com/search?tbm=nws&q=${encodedQuery}`;
    
    newsDiv.innerHTML = `
        <p>Your comprehensive news search is redirected to the web:</p>
        <a href="${googleUrl}" target="_blank" class="watch-button-search" style="text-align: center;">Search the Web for News on "${query}"</a>
    `;
}


function fetchSearchData(query) {
    const resultsGrid = document.getElementById('results-grid');
    resultsGrid.innerHTML = '<p>Searching MyAnimeList...</p>';

    const apiUrl = `https://api.jikan.moe/v4/anime?q=${query}&limit=20`;

    return fetch(apiUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error('Search API failed or rate limited.');
            }
            return response.json();
        })
        .then(apiData => {
            displaySearchResults(apiData.data);
        })
        .catch(error => {
            resultsGrid.innerHTML = '<p class="error-message">Search failed: Cannot connect to anime database. <a href="javascript:location.reload()" class="refresh-link">Refresh to try again.</a></a.p>';
        });
}

function displaySearchResults(animeList) {
    const gridContainer = document.getElementById('results-grid');
    gridContainer.innerHTML = '';
    
    if (!Array.isArray(animeList) || animeList.length === 0) {
        gridContainer.innerHTML = '<p>No anime matching your search criteria were found.</p>';
        return;
    }
    
    animeList.forEach(anime => {
        const card = document.createElement('div'); 
        card.className = 'anime-card'; 

        const imageLink = document.createElement('a');
        imageLink.href = anime.url;
        imageLink.target = '_blank';
        const image = document.createElement('img');
        image.src = anime.images.jpg.image_url;
        image.alt = anime.title;
        imageLink.appendChild(image);
        
        const titleLink = document.createElement('a');
        titleLink.href = anime.url;
        titleLink.target = '_blank';
        const title = document.createElement('h4');
        title.textContent = anime.title;
        titleLink.appendChild(title);
        
        const score = document.createElement('span');
        score.className = 'anime-card-score';
        score.textContent = `Score: ${anime.score || 'N/A'}`;

        const watchButton = document.createElement('a');
        watchButton.href = `https://www.google.com/search?q=watch+${encodeURIComponent(anime.title)}`;
        watchButton.target = '_blank';
        watchButton.className = 'watch-button-search'; 
        watchButton.textContent = 'Find Legal Streams';

        card.appendChild(imageLink);
        card.appendChild(titleLink);
        card.appendChild(score);
        card.appendChild(watchButton); 
        
        gridContainer.appendChild(card);
    });
}


// --- LIVE SEARCH FUNCTIONALITY (Client-Side Filtering) ---
function liveSearch() {
    // Only run this function on the homepage
    if (document.getElementById('full-seasonal-grid') || document.getElementById('results-grid')) {
        return;
    }
    
    const input = document.getElementById('searchInput');
    const filter = input.value.toUpperCase();

    // 1. Search Manual Recommendation Posts
    const postArticles = document.querySelectorAll('.recommendations .post');
    postArticles.forEach(article => {
        const text = article.textContent || article.innerText; 
        if (text.toUpperCase().indexOf(filter) > -1) {
            article.style.display = "";
        } else {
            article.style.display = "none";
        }
    });

    // 2. Search Top All-Time/Upcoming Grids
    const cardContainers = document.querySelectorAll('#top-rated-grid .anime-card, #upcoming-grid .anime-card');
    cardContainers.forEach(card => {
        const text = card.textContent || card.innerText;
        if (text.toUpperCase().indexOf(filter) > -1) {
            card.style.display = "";
        } else {
            card.style.display = "none";
        }
    });
    
    // 3. Search Latest News Feed
    const newsItems = document.querySelectorAll('.news-item');
    newsItems.forEach(item => {
        const text = item.textContent || item.innerText;
        if (text.toUpperCase().indexOf(filter) > -1) {
            item.style.display = "";
        } else {
            item.style.display = "none";
        }
    });
}
// --- END LIVE SEARCH FUNCTIONALITY ---


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

function fetchFullSeasonal() {
    const gridContainer = document.getElementById('full-seasonal-grid');
    if (!gridContainer) return Promise.resolve(); 

    const cacheKey = 'fullSeasonalAnime';
    const cachedData = JSON.parse(localStorage.getItem(cacheKey));
    const CACHE_DURATION_SEASONAL = 1000 * 60 * 60 * 12; // 12 hours

    if (cachedData && (Date.now() - cachedData.timestamp < CACHE_DURATION_SEASONAL)) {
        displayFullSeasonal(cachedData.data);
        return Promise.resolve(); 
    }

    return fetch(`https://api.jikan.moe/v4/seasons/now?limit=25`) 
        .then(response => {
            if (!response.ok) throw new Error('Jikan API (full seasonal) response was not ok');
            return response.json();
        })
        .then(apiData => {
            localStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data: apiData.data }));
            displayFullSeasonal(apiData.data);
            return Promise.resolve();
        })
        .catch(error => {
            const gridContainer = document.getElementById('full-seasonal-grid');
            gridContainer.innerHTML = '<p class="error-message">Could not load seasonal data.</p>';
            return Promise.reject(error);
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

function displayFullSeasonal(animeList) {
    const gridContainer = document.getElementById('full-seasonal-grid');
    if (!gridContainer) return;
    gridContainer.innerHTML = ''; 

    if (!Array.isArray(animeList) || animeList.length === 0) {
        gridContainer.innerHTML = '<p>No seasonal anime found.</p>';
        return;
    }

    animeList.sort((a, b) => (b.score || b.members || 0) - (a.score || a.members || 0));

    animeList.forEach(anime => {
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