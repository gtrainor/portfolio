import { fetchJSON, renderProjects } from '../global.js';
const projects = await fetchJSON('../lib/projects.json');
const projectsContainer = document.querySelector('.projects');
renderProjects(projects, projectsContainer, 'h2');



const title = document.querySelector('.projects-title');
console.log(title)
title.textContent = `${projects.length} Projects`;
console.log(title.textContent)

  