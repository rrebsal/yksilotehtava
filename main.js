(function () {
  'use strict';

  // Rowrowrow your boat gently down the restaurant
  const restaurantRow = (restaurant, isPreferred) => {
      const { name, address, city, company, distance } = restaurant;
      const tr = document.createElement('tr');
      if (isPreferred)
          tr.classList.add('is-fav');
      const starCell = document.createElement('td');
      const star = document.createElement('button');
      star.className = 'fav-star';
      star.type = 'button';
      star.textContent = isPreferred ? '★' : '☆';
      star.title = isPreferred ? 'Oma ravintolasi' : 'Valitse omaksi ravintolaksi';
      starCell.appendChild(star);
      const cells = [
          name,
          address,
          city,
          company,
          distance === undefined ? '' : `${distance.toFixed(1)} km`,
      ].map((text) => {
          const td = document.createElement('td');
          td.textContent = text;
          return td;
      });
      tr.append(starCell, ...cells);
      return tr;
  };
  // I like dish and food and especially table
  const coursesTable = (courses) => {
      if (!courses || courses.length === 0) {
          return '<p class="quiet">Ruokalistaa ei saatavilla.</p>';
      }
      const rows = courses
          .map(({ name, diets, price }) => `
      <tr>
        <td>${name}</td>
        <td>${diets ?? ' - '}</td>
        <td>${price ?? ' - '}</td>
      </tr>`)
          .join('');
      return `<table class="dish-list">
      <tr><th>Annos</th><th>Ruokavalio</th><th>Hinta</th></tr>
      ${rows}
    </table>`;
  };
  // Restaurante iNformation yum
  const restaurantInfo = (restaurant) => {
      const { name, address, city, postalCode, phone, company } = restaurant;
      return `<h3>${name}</h3>
    <p class="quiet">${company}</p>
    <p>${address}, ${postalCode} ${city}</p>
    <p>${phone ?? ''}</p>`;
  };
  // Menu popup
  const restaurantModal = (restaurant, menu, isPreferred, loggedIn) => {
      const prefBtn = loggedIn
          ? `<button id="fav-toggle" type="button">${isPreferred ? '★ Poista oma ravintola' : '☆ Valitse omaksi ravintolaksi'}</button>`
          : '<p class="quiet">Kirjaudu sisään valitaksesi oman ravintolan.</p>';
      return `${restaurantInfo(restaurant)}
    <div class="tab-strip">
      <button type="button" id="tab-today" class="on">Tänään</button>
      <button type="button" id="tab-week">Tämä viikko</button>
    </div>
    <div id="menu-slot">${coursesTable(menu.courses)}</div>
    <div class="button-row">
      ${prefBtn}
      <button type="button" id="lunch-close">Sulje</button>
    </div>`;
  };
  // wEEkly menu
  const weeklyMenuHtml = (menu) => {
      if (!menu.days || menu.days.length === 0) {
          return '<p class="quiet">Viikon ruokalistaa ei saatavilla.</p>';
      }
      return menu.days
          .map((day) => `<h4>${day.date}</h4>${coursesTable(day.courses)}`)
          .join('');
  };
  // Preferred restaurant front page thingy
  const preferredCard = (restaurant, menu) => `
  ${restaurantInfo(restaurant)}
  <h4>Päivän ruokalista</h4>
  ${menu
    ? coursesTable(menu.courses)
    : '<p class="quiet">Päivän ruokalistaa ei voitu ladata.</p>'}
  <div class="button-row">
    <button type="button" id="fav-open">Tiedot</button>
    <button type="button" id="fav-clear">Poista</button>
  </div>`;

  const fetchData = async (url, options = {}) => {
      const response = await fetch(url, options);
      if (!response.ok) {
          throw new Error(`Virhe ${response.status}`);
      }
      const json = await response.json();
      return json;
  };
  // Distance math :) (I hate MAATHHHHHHHHHHHHH)
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
      const toRad = (deg) => (deg * Math.PI) / 180;
      const R = 6371;
      const dLat = toRad(lat2 - lat1);
      const dLon = toRad(lon2 - lon1);
      const a = Math.sin(dLat / 2) ** 2 +
          Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
      return 2 * R * Math.asin(Math.sqrt(a));
  };
  const $ = (selector) => {
      const el = document.querySelector(selector);
      if (!el) {
          throw new Error(`Element not found: ${selector}`);
      }
      return el;
  };

  const apiUrl = 'https://sodexo-webscrape-r73sdlmfxa-lz.a.run.app/api/v1';
  const positionOptions = {
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 0,
  };
  const USERS_KEY = 'ts3_users';
  const SESSION_KEY = 'ts3_session';

  const readUsers = () => JSON.parse(localStorage.getItem(USERS_KEY) ?? '[]');
  const writeUsers = (users) => {
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
  };
  const register = (username, password) => {
      const name = username.trim();
      if (name.length < 3) {
          throw new Error('Käyttäjätunnuksessa on oltava vähintään 3 merkkiä.');
      }
      if (password.length < 4) {
          throw new Error('Salasanassa on oltava vähintään 4 merkkiä.');
      }
      const users = readUsers();
      if (users.some((u) => u.username.toLowerCase() === name.toLowerCase())) {
          throw new Error('Käyttäjätunnus on jo käytössä.');
      }
      const user = {
          username: name,
          password,
          preferredRestaurantId: null,
      };
      users.push(user);
      writeUsers(users);
      localStorage.setItem(SESSION_KEY, user.username);
      return user;
  };
  const login = (username, password) => {
      const name = username.trim().toLowerCase();
      const user = readUsers().find((u) => u.username.toLowerCase() === name);
      if (!user || user.password !== password) {
          throw new Error('Väärä käyttäjätunnus tai salasana.');
      }
      localStorage.setItem(SESSION_KEY, user.username);
      return user;
  };
  const logout = () => {
      localStorage.removeItem(SESSION_KEY);
  };
  const getCurrentUser = () => {
      const name = localStorage.getItem(SESSION_KEY);
      if (!name)
          return null;
      return readUsers().find((u) => u.username === name) ?? null;
  };
  const setPreferredRestaurant = (restaurantId) => {
      const current = localStorage.getItem(SESSION_KEY);
      const users = readUsers();
      const user = users.find((u) => u.username === current);
      if (!user) {
          throw new Error('Sinun on oltava kirjautuneena.');
      }
      user.preferredRestaurantId = restaurantId;
      writeUsers(users);
  };

  // Global Variables
  let restaurants = [];
  let companyFilter = null;
  let searchText = '';
  // References
  const modal = $('#lunch-dialog');
  const authDialog = $('#door');
  const tableBody = $('#lunch-table tbody');
  const preferredSection = $('#my-spot');
  const userArea = $('#whoami');
  const statusEl = $('#sort-note');
  const renderPreferred = async () => {
      const user = getCurrentUser();
      // No one logged in
      if (!user) {
          preferredSection.innerHTML = `
      <h2>Oma ravintola</h2>
      <p class="quiet">Kirjaudu sisään valitaksesi oman ravintolan ja nähdäksesi sen ruokalistan täällä.</p>`;
          return;
      }
      // Logged in
      const restaurant = restaurants.find((r) => r._id === user.preferredRestaurantId);
      // Haven't picked a restaurant
      if (!restaurant) {
          preferredSection.innerHTML = `
      <h2>Oma ravintola</h2>
      <p class="quiet">Et ole vielä valinnut omaa ravintolaa.
      Valitse sellainen klikkaamalla ☆-merkkiä ravintolan vieressä listassa.</p>`;
          return;
      }
      // Restaurant daily menu
      preferredSection.innerHTML = `<h2>Oma ravintola</h2><p class="quiet">Ladataan…</p>`;
      let menu = null;
      try {
          menu = await fetchData(`${apiUrl}/restaurants/daily/${restaurant._id}/fi`);
      }
      catch (err) {
          console.warn(err);
      }
      preferredSection.innerHTML =
          '<h2>Oma ravintola</h2>' + preferredCard(restaurant, menu);
      $('#fav-open').addEventListener('click', () => openRestaurant(restaurant));
      $('#fav-clear').addEventListener('click', () => {
          setPreferredRestaurant(null);
          refreshUserDependentUi();
      });
  };
  // Login code magic
  const renderUserArea = () => {
      const user = getCurrentUser();
      userArea.innerHTML = '';
      if (user) {
          const hello = document.createElement('span');
          hello.textContent = `Hei, ${user.username}`;
          const out = document.createElement('button');
          out.type = 'button';
          out.textContent = 'Kirjaudu ulos';
          out.addEventListener('click', () => {
              logout();
              refreshUserDependentUi();
          });
          userArea.append(hello, out);
      }
      else {
          const inBtn = document.createElement('button');
          inBtn.type = 'button';
          inBtn.textContent = 'Kirjaudu sisään';
          inBtn.addEventListener('click', () => openAuth('login'));
          const regBtn = document.createElement('button');
          regBtn.type = 'button';
          regBtn.textContent = 'Rekisteröidy';
          regBtn.addEventListener('click', () => openAuth('register'));
          userArea.append(inBtn, regBtn);
      }
  };
  const refreshUserDependentUi = () => {
      renderUserArea();
      renderTable();
      void renderPreferred();
  };
  let authMode = 'login';
  const openAuth = (mode) => {
      authMode = mode;
      $('#door-title').textContent = mode === 'login' ? 'Kirjaudu sisään' : 'Rekisteröidy';
      $('#door-go').textContent =
          mode === 'login' ? 'Kirjaudu sisään' : 'Luo tunnus';
      $('#door-swap').textContent =
          mode === 'login'
              ? 'Ei vielä tunnusta? Rekisteröidy'
              : 'Onko sinulla jo tunnus? Kirjaudu sisään';
      $('#door-oops').textContent = '';
      $('#door-form').reset();
      authDialog.showModal();
  };
  $('#door-swap').addEventListener('click', () => openAuth(authMode === 'login' ? 'register' : 'login'));
  $('#door-back').addEventListener('click', () => authDialog.close());
  // Login processing magic
  $('#door-form').addEventListener('submit', async (event) => {
      event.preventDefault();
      const username = $('#door-name').value;
      const password = $('#door-pass').value;
      try {
          if (authMode === 'login') {
              await login(username, password);
          }
          else {
              await register(username, password);
          }
          authDialog.close();
          refreshUserDependentUi();
      }
      catch (err) {
          $('#door-oops').textContent = err.message;
      }
  });
  // Filter stuff
  const visibleRestaurants = () => restaurants.filter((r) => (!companyFilter || r.company === companyFilter) &&
      `${r.name} ${r.address} ${r.city}`
          .toLowerCase()
          .includes(searchText.toLowerCase()));
  // Select a preferred Restaurant
  const togglePreferred = (restaurant) => {
      const user = getCurrentUser();
      if (!user) {
          openAuth('login');
          return;
      }
      const isPreferred = user.preferredRestaurantId === restaurant._id;
      setPreferredRestaurant(isPreferred ? null : restaurant._id);
      refreshUserDependentUi();
  };
  // List of restaurants
  const renderTable = () => {
      const preferredId = getCurrentUser()?.preferredRestaurantId;
      const list = visibleRestaurants();
      tableBody.innerHTML = '';
      list.forEach((restaurant) => {
          const tr = restaurantRow(restaurant, restaurant._id === preferredId);
          tr.querySelector('.fav-star')?.addEventListener('click', (event) => {
              event.stopPropagation();
              togglePreferred(restaurant);
          });
          tr.addEventListener('click', () => {
              document
                  .querySelectorAll('.picked')
                  .forEach((el) => el.classList.remove('picked'));
              tr.classList.add('picked');
              void openRestaurant(restaurant);
          });
          tableBody.appendChild(tr);
      });
      $('#how-many').textContent = `Ravintoloita: ${list.length}`;
  };
  // Restaurant menu popup
  const openRestaurant = async (restaurant) => {
      const menu = await fetchData(`${apiUrl}/restaurants/daily/${restaurant._id}/fi`);
      const user = getCurrentUser();
      modal.innerHTML = restaurantModal(restaurant, menu, user?.preferredRestaurantId === restaurant._id, user !== null);
      $('#lunch-close').addEventListener('click', () => modal.close());
      modal.querySelector('#fav-toggle')?.addEventListener('click', () => {
          togglePreferred(restaurant);
          modal.close();
      });
      const content = $('#menu-slot');
      const dailyTab = $('#tab-today');
      const weeklyTab = $('#tab-week');
      const dailyHtml = content.innerHTML;
      dailyTab.addEventListener('click', () => {
          dailyTab.classList.add('on');
          weeklyTab.classList.remove('on');
          content.innerHTML = dailyHtml;
      });
      weeklyTab.addEventListener('click', async () => {
          weeklyTab.classList.add('on');
          dailyTab.classList.remove('on');
          content.innerHTML = '<p class="quiet">Ladataan…</p>';
          try {
              const weekly = await fetchData(`${apiUrl}/restaurants/weekly/${restaurant._id}/fi`);
              content.innerHTML = weeklyMenuHtml(weekly);
          }
          catch (err) {
              content.innerHTML = `<p class="quiet">${err.message}</p>`;
          }
      });
      modal.showModal();
  };
  modal.addEventListener('click', (event) => {
      if (event.target === modal)
          modal.close();
  });
  // Filter restaurant comp
  const setFilter = (company, activeId) => {
      companyFilter = company;
      document
          .querySelectorAll('#chip-row button')
          .forEach((b) => b.classList.toggle('on', b.id === activeId));
      renderTable();
  };
  $('#only-sodexo').addEventListener('click', () => setFilter('Sodexo', 'sodexo'));
  $('#only-compass').addEventListener('click', () => setFilter('Compass Group', 'compass'));
  $('#all-places').addEventListener('click', () => setFilter(null, 'reset'));
  // search
  $('#finder').addEventListener('input', (event) => {
      searchText = event.target.value;
      renderTable();
  });
  const sortByDistance = (lat, lon) => {
      restaurants.forEach((r) => {
          const [rLon, rLat] = r.location.coordinates;
          r.distance = calculateDistance(lat, lon, rLat, rLon);
      });
      restaurants.sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));
      statusEl.textContent = 'Lajiteltu etäisyyden mukaan.';
      renderTable();
  };
  const init = async () => {
      renderUserArea();
      restaurants = await fetchData(`${apiUrl}/restaurants`);
      renderTable();
      void renderPreferred();
      navigator.geolocation.getCurrentPosition((pos) => sortByDistance(pos.coords.latitude, pos.coords.longitude), (err) => {
          console.warn(`ERROR(${err.code}): ${err.message}`);
          statusEl.textContent = 'Sijainti ei ole käytössä, joten ei lajiteltu etäisyyden mukaan.';
      }, positionOptions);
  };
  void init();

})();
