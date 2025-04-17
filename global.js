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
    { url: 'projects/index.html', title: 'Projects' },
    { url: 'contact/index.html', title: 'Contact' },
    { url: 'resume/index.html', title: 'Resume' },
    { url: "https://github.com/gtrainor", title: 'GitHub'},
    // add the rest of your pages here
  ];

const BASE_PATH = (location.hostname === "localhost" || location.hostname === "127.0.0.1")
? "/"                  // Local server
: "/website/";         // GitHub Pages repo name

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
        a.host === location.host && a.pathname === location.pathname);
        
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

  });
  

  

  