console.log('IT’S ALIVE!');

// function $$(selector, context = document) {
//   return Array.from(context.querySelectorAll(selector));
// }

// let navLinks = $$("nav a");

// let currentLink = navLinks.find(
//     (a) => a.host === location.host && a.pathname === location.pathname,
//   );


// currentLink?.classList.add('current');

let pages = [
    { url: 'index.html', title: 'Home' },
    { url: 'projects/', title: 'Projects' },
    { url: 'contact/', title: 'Contact' },
    { url: 'resume/', title: 'Resume' },
    { url: "https://github.com/gtrainor", title: 'GitHub'},
    // add the rest of your pages here
  ];

const BASE_PATH = (location.hostname === "localhost" || location.hostname === "127.0.0.1")
? "/"                  // Local server
: "/portfolio/";         // GitHub Pages repo name

let nav = document.createElement('nav');
document.body.prepend(nav);

for (let p of pages) {
    let url = p.url;
    let title = p.title;
    // next step: create link and add it to nav
    
    if (!url.startsWith('http')) {
        url = BASE_PATH + url;
    }
  
    let a = document.createElement('a');
    a.href = url;
    a.textContent = title;


    a.classList.toggle(
        'current',
        a.host === location.host && a.pathname === location.pathname,
        a.target = "_blank");
        
    a.toggleAttribute("target", a.host !== location.host);
    nav.append(a);
    
}
document.body.insertAdjacentHTML(
    'afterbegin',
    `
      <label for="color-scheme" class="color-scheme">
        Theme: 
        <select id="color-scheme">
          <option value="light-dark">Automatic</option>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </label>
    `
  );
  let select = document.querySelector('#color-scheme');

  select.addEventListener('input', function (event) {
    console.log('color scheme changed to', event.target.value);
    document.documentElement.style.setProperty('color-scheme', event.target.value);
    localStorage.colorScheme = event.target.value;

  });

  if ("colorScheme" in localStorage){
    document.documentElement.style.setProperty('color-scheme', localStorage.colorScheme);
    select.value = localStorage.colorScheme;
  }

  const usernameInput = document.querySelector('#temp');


  usernameInput?.addEventListener('submit', function (event) {
    event.preventDefault(); 
    let data = new FormData(usernameInput);

    let params = [];
    
    for (let [name, value] of data) {
      const f_name = encodeURIComponent(name);
      const email = encodeURIComponent(value);
      // const url = `mailto:test@example.com?subject=Contact%20Form&body=Name:${f_name}%0AEmail:${email}`;
      params.push(`${f_name}=${email}`);
      console.log(name, email);
      
    };

    let url = usernameInput.action + '?' + params.join('&');
    window.location.href = url;
  });

  export async function fetchJSON(url) {
    try {
      // Fetch the JSON file from the given URL
      const response = await fetch(url);
      console.log(response);
      if (!response.ok) {
        throw new Error(`Failed to fetch projects: ${response.statusText}`);
      };
      const data = await response.json();
      return data;
      
    } catch (error) {
      console.error('Error fetching or parsing JSON data:', error);
    }
  }

  export function renderProjects(project, containerElement, headingLevel = 'h2') {
    containerElement.innerHTML = '';

  for (let p of project){
    const article = document.createElement('article');

    article.innerHTML = `
      <${headingLevel}>${p.title || 'Untitled Project'}</${headingLevel}>
      <img src="${p.image || 'placeholder.jpg'}" alt="${p.title || 'No title'}">
      <div class="text">
        <p>${p.description || 'No description available.'}</p>
        <h5>${p.year}</h5>
      </div>
    `;

    containerElement.appendChild(article);
    
  };
  }

  export async function fetchGitHubData(username) {
    return fetchJSON(`https://api.github.com/users/${username}`);// return statement here
  }